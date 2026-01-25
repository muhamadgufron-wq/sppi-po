import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { query, queryOne, transaction } from '../config/database.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { validateRequest, transferSchema } from '../middleware/validation.js';
import { PurchaseOrder, UserRole } from '../types/index.js';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'transfer-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file JPG, PNG, atau PDF yang diizinkan'));
    }
  }
});

// Get pending transfers
router.get('/pending', authenticateToken, authorizeRoles(UserRole.KEUANGAN), async (req: AuthRequest, res: Response) => {
  try {
    const pos = await query<PurchaseOrder[]>(
      `SELECT po.*, u.nama_lengkap as created_by_name, m.nama_lengkap as approved_by_name
       FROM purchase_orders po
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN users m ON po.approved_by = m.id
       WHERE po.status = 'APPROVED'
       ORDER BY po.approved_at ASC`
    );

    res.json({
      success: true,
      data: pos
    });
  } catch (error) {
    console.error('Get pending transfers error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    });
  }
});

// Process transfer
router.post('/:poId', authenticateToken, authorizeRoles(UserRole.KEUANGAN), upload.single('bukti_transfer'), validateRequest(transferSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { poId } = req.params;
    const { nominal_transfer, tanggal_transfer, metode_transfer, nomor_rekening_tujuan } = req.body;
    const buktiTransferPath = req.file ? req.file.path : null;

    const po = await queryOne<PurchaseOrder>(
      'SELECT * FROM purchase_orders WHERE id = ?',
      [poId]
    );

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'PO tidak ditemukan'
      });
    }

    if (po.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `PO tidak dapat diproses. Status saat ini: ${po.status}`
      });
    }

    // Validate bukti transfer
    if (!buktiTransferPath) {
      return res.status(400).json({
        success: false,
        message: 'Bukti transfer wajib di-upload'
      });
    }

    // Process transfer
    await transaction(async (conn) => {
      // Insert transfer record
      await conn.execute(
        `INSERT INTO transfers 
        (po_id, nominal_transfer, tanggal_transfer, metode_transfer, nomor_rekening_tujuan, bukti_transfer_path, transferred_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [poId, nominal_transfer, tanggal_transfer, metode_transfer || null, nomor_rekening_tujuan || null, buktiTransferPath, req.user!.id]
      );

      // Update PO
      await conn.execute(
        `UPDATE purchase_orders 
         SET status = 'DANA_DITRANSFER', transferred_by = ?, transferred_at = NOW()
         WHERE id = ?`,
        [req.user!.id, poId]
      );
    });

    res.json({
      success: true,
      message: 'Transfer berhasil diproses',
      data: {
        po_id: poId,
        status: 'DANA_DITRANSFER'
      }
    });
  } catch (error) {
    console.error('Process transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses transfer'
    });
  }
});

export default router;
