import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { query, queryOne, transaction } from '../config/database.js';
import { UserRole, PurchaseOrder } from '../types/index.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

// Get approved POs pending transfer (including partial transfers)
router.get('/pending', authenticateToken, authorizeRoles(UserRole.KEUANGAN), async (req: AuthRequest, res: Response) => {
  try {
    const pos = await query<PurchaseOrder[]>(
      `SELECT po.*, 
              u.nama_lengkap as created_by_name,
              m.nama_lengkap as approved_by_name,
              k.nama_lengkap as processed_by_name,
              d.nama_dapur,
              (SELECT COUNT(*) FROM po_items WHERE po_id = po.id AND transfer_id IS NULL) as pending_items_count
       FROM purchase_orders po
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN users m ON po.approved_by = m.id
       LEFT JOIN users k ON po.processed_by_keuangan = k.id
       LEFT JOIN dapurs d ON po.dapur_id = d.id
       WHERE po.status IN ('APPROVED', 'PARTIAL_TRANSFER')
       ORDER BY po.status ASC, po.approved_at ASC`
    );

    for (let po of pos) {
      // Fetch items with their transfer status
      const items = await query(
        `SELECT i.*, t.transfer_date as transfer_date_linked
         FROM po_items i
         LEFT JOIN po_transfers t ON i.transfer_id = t.id
         WHERE i.po_id = ? 
         ORDER BY i.id ASC`,
        [po.id]
      );
      po.items = items;

      // Fetch transfer history for this PO
      const transfers = await query(
        `SELECT * FROM po_transfers WHERE po_id = ? ORDER BY created_at DESC`,
        [po.id]
      );
      po.transfers = transfers;
    }

    res.json({ success: true, data: pos });
  } catch (error) {
    console.error('Get pending transfers error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil data' });
  }
});

// Get finance history (Fully Transferred)
router.get('/history', authenticateToken, authorizeRoles(UserRole.KEUANGAN), async (req: AuthRequest, res: Response) => {
  try {
    const pos = await query<PurchaseOrder[]>(
      `SELECT po.*, 
              u.nama_lengkap as created_by_name,
              m.nama_lengkap as approved_by_name,
              k.nama_lengkap as processed_by_name,
              d.nama_dapur
       FROM purchase_orders po
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN users m ON po.approved_by = m.id
       LEFT JOIN users k ON po.processed_by_keuangan = k.id
       LEFT JOIN dapurs d ON po.dapur_id = d.id
       WHERE po.status IN ('APPROVED_KEUANGAN', 'BELANJA_SELESAI')
       ORDER BY po.updated_at DESC
       LIMIT 50`
    );

    for (let po of pos) {
      const items = await query(
        `SELECT i.*, t.transfer_date as transfer_date_linked
         FROM po_items i
         LEFT JOIN po_transfers t ON i.transfer_id = t.id
         WHERE i.po_id = ? 
         ORDER BY i.id ASC`,
        [po.id]
      );
      po.items = items;
      
      const transfers = await query(
        `SELECT * FROM po_transfers WHERE po_id = ? ORDER BY created_at DESC`,
        [po.id]
      );
      po.transfers = transfers;
    }

    res.json({ success: true, data: pos });
  } catch (error) {
    console.error('Get finance history error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil history' });
  }
});

// Process transfer (Batch/Partial) with Upload
router.post('/:poId/transfer', authenticateToken, authorizeRoles(UserRole.KEUANGAN), upload.single('proof_image'), async (req: AuthRequest, res: Response) => {
  try {
    const { poId } = req.params;
    let { nominal_transfer, tanggal_transfer, catatan_keuangan, item_ids } = req.body;

    console.log('Transfer request:', { poId, nominal_transfer, tanggal_transfer, item_ids });

    // Parse item_ids if it comes as a string (FormData)
    if (typeof item_ids === 'string') {
        try {
            item_ids = JSON.parse(item_ids);
        } catch (e) {
            console.error('Failed to parse item_ids', e);
            item_ids = []; 
        }
    }

    if (!nominal_transfer || !tanggal_transfer || !item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Data transfer tidak lengkap (nominal, tanggal, dan item harus dipilih)'
      });
    }

    // Get PO
    const po = await queryOne<PurchaseOrder>(
      'SELECT * FROM purchase_orders WHERE id = ?',
      [poId]
    );

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO tidak ditemukan' });
    }

    let proofImage = null;
    if (req.file) {
        // Upload to Cloudinary
        const { uploadToCloudinary } = await import('../middleware/upload.js');
        proofImage = await uploadToCloudinary(req.file.buffer, 'sppi_transfers', req.file.originalname);
    }

    // Start Transaction
    await transaction(async (connection) => {
      // 1. Create Transfer Record
      const [result] = await connection.query(
        `INSERT INTO po_transfers (po_id, amount, transfer_date, notes, created_by, proof_image) VALUES (?, ?, ?, ?, ?, ?)`,
        [poId, nominal_transfer, tanggal_transfer, catatan_keuangan || null, req.user!.id, proofImage]
      );
      const transferId = (result as any).insertId;

      // 2. Link selected items to this transfer
      const placeholders = item_ids.map(() => '?').join(',');
      await connection.query(
        `UPDATE po_items SET transfer_id = ? WHERE id IN (${placeholders}) AND po_id = ?`,
        [transferId, ...item_ids, poId]
      );

      // 3. Check if all items in this PO are now transferred
      const [pendingCount] = await connection.query(
        `SELECT COUNT(*) as count FROM po_items WHERE po_id = ? AND transfer_id IS NULL`,
        [poId]
      );
      
      const isFullyTransferred = (pendingCount as any)[0].count === 0;
      const newStatus = isFullyTransferred ? 'APPROVED_KEUANGAN' : 'PARTIAL_TRANSFER';

      // 4. Update PO Status
      await connection.query(
        `UPDATE purchase_orders 
         SET status = ?, 
             processed_by_keuangan = ?,
             nominal_transfer = (SELECT SUM(amount) FROM po_transfers WHERE po_id = ?), -- Update total transferred 
             tanggal_transfer = ? -- Update latest transfer date
         WHERE id = ?`,
        [newStatus, req.user!.id, poId, tanggal_transfer, poId]
      );
    });

    res.json({
      success: true,
      message: 'Transfer berhasil diproses',
      data: { po_id: poId }
    });

  } catch (error: any) {
    console.error('Process transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses transfer',
      error: error.message
    });
  }
});

export default router;
