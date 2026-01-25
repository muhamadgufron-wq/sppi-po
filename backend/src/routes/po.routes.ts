import { Router, Response } from 'express';
import { query, queryOne, transaction } from '../config/database.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { validateRequest, createPOSchema } from '../middleware/validation.js';
import { PurchaseOrder, POItem, UserRole, POStatus } from '../types/index.js';

const router = Router();

// Generate PO Number
function generatePONumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${year}${month}${day}-${random}`;
}

// TEST ENDPOINT - Debug
router.get('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🧪 TEST endpoint called by user:', req.user?.id);
    res.json({
      success: true,
      message: 'Test endpoint works!',
      user: req.user,
      data: [
        { id: 1, po_number: 'TEST-001', status: 'DRAFT' },
        { id: 2, po_number: 'TEST-002', status: 'DRAFT' }
      ]
    });
  } catch (error: any) {
    console.error('❌ Test endpoint error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create PO (Admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  validateRequest(createPOSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const poData = req.body;

      // Create PO in transaction
      const result = await transaction(async (conn) => {
        const poNumber = generatePONumber();
        
        // Calculate total
        const totalEstimasi = poData.items.reduce(
          (sum: number, item: any) => sum + (item.qty_estimasi * item.harga_estimasi),
          0
        );

        // Insert PO
        const [poResult] = await conn.execute(
          `INSERT INTO purchase_orders 
          (po_number, tanggal_po, created_by, status, total_estimasi, catatan_admin)
          VALUES (?, ?, ?, 'DRAFT', ?, ?)`,
          [poNumber, poData.tanggal_po, userId, totalEstimasi, poData.catatan_admin || null]
        );

        const poId = (poResult as any).insertId;

        // Insert items
        for (const item of poData.items) {
          await conn.execute(
            `INSERT INTO po_items 
            (po_id, nama_barang, kategori_sayuran, qty_estimasi, satuan, harga_estimasi)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
              poId,
              item.nama_barang,
              item.kategori_sayuran || null,
              item.qty_estimasi,
              item.satuan,
              item.harga_estimasi
            ]
          );
        }

        return { poId, poNumber };
      });

      res.status(201).json({
        success: true,
        message: 'PO berhasil dibuat',
        data: {
          po_id: result.poId,
          po_number: result.poNumber,
          status: 'DRAFT'
        }
      });
    } catch (error) {
      console.error('Create PO error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat membuat PO'
      });
    }
  }
);

// Get PO Statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    console.log('📊 Getting stats for user:', userId, userRole);

    const stats = await transaction(async (conn) => {
      // 1. PO Hari Ini
      const [todayResult] = await conn.execute(
        `SELECT COUNT(*) as count FROM purchase_orders 
         WHERE DATE(tanggal_po) = CURDATE()`
      );
      
      // 2. Menunggu Approval
      const [pendingResult] = await conn.execute(
        `SELECT COUNT(*) as count FROM purchase_orders 
         WHERE status = 'MENUNGGU_APPROVAL'`
      );

      // 3. PO Approved (Included all approved states)
      const [approvedResult] = await conn.execute(
        `SELECT COUNT(*) as count FROM purchase_orders 
         WHERE status IN ('APPROVED', 'APPROVED_KEUANGAN', 'DANA_DITRANSFER', 'BELANJA_SELESAI', 'CLOSED')`
      );

      return {
        today: (todayResult as any)[0].count,
        pending: (pendingResult as any)[0].count,
        approved: (approvedResult as any)[0].count
      };
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data statistik'
    });
  }
});

// Get Daily PO Stats for Chart
router.get('/stats/daily', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await query<any[]>(
      `SELECT 
         DATE_FORMAT(tanggal_po, '%Y-%m-%d') as date, 
         COUNT(*) as count 
       FROM purchase_orders 
       WHERE tanggal_po >= DATE(NOW()) - INTERVAL 7 DAY 
       GROUP BY date 
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data statistik harian'
    });
  }
});

router.get('/stats/top-items', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await query<any[]>(
      `SELECT 
         poi.nama_barang, 
         poi.satuan,
         SUM(poi.qty_estimasi) as total_qty 
       FROM po_items poi
       JOIN purchase_orders po ON poi.po_id = po.id
       WHERE po.tanggal_po >= DATE(NOW()) - INTERVAL 30 DAY 
       AND po.status != 'REJECTED'
       AND po.status != 'DRAFT'
       GROUP BY poi.nama_barang, poi.satuan 
       ORDER BY total_qty DESC 
       LIMIT 10`
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get top items stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data statistik item'
    });
  }
});

// Get all POs with filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📥 GET /api/po - User:', req.user?.id, req.user?.username, req.user?.role);
    
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Build query with JOIN
    let sql = `
      SELECT 
        po.*,
        u.nama_lengkap as created_by_name,
        m.nama_lengkap as approved_by_name
      FROM purchase_orders po
      LEFT JOIN users u ON po.created_by = u.id
      LEFT JOIN users m ON po.approved_by = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Add status filter if provided
    if (status) {
      sql += ' AND po.status = ?';
      params.push(status);
    }

    // Role-based filtering - Admin only sees their own POs
    if (userRole === UserRole.ADMIN) {
      sql += ' AND po.created_by = ?';
      params.push(userId);
    }

    sql += ' ORDER BY po.created_at DESC';
    
    console.log('🔍 Executing query...');
    const allPOs = await query<any[]>(sql, params);
    console.log('✅ Query returned', allPOs.length, 'POs');
    
    // Manual pagination
    const totalCount = allPOs.length;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    const paginatedPOs = allPOs.slice(offset, offset + limitNum);
    
    const response = {
      success: true,
      data: paginatedPOs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };
    
    console.log('📤 Sending', paginatedPOs.length, 'of', totalCount, 'POs');
    res.json(response);
    
  } catch (error: any) {
    console.error('❌ Get POs error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data PO'
    });
  }
});

// Get PO by ID with complete lifecycle data
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const po = await queryOne<PurchaseOrder>(
      `SELECT po.*, 
        u.nama_lengkap as created_by_name,
        m.nama_lengkap as approved_by_name,
        k.nama_lengkap as processed_by_keuangan_name,
        s.nama_lengkap as shopping_completed_by_name
      FROM purchase_orders po
      LEFT JOIN users u ON po.created_by = u.id
      LEFT JOIN users m ON po.approved_by = m.id
      LEFT JOIN users k ON po.processed_by_keuangan = k.id
      LEFT JOIN users s ON po.shopping_completed_by = s.id
      WHERE po.id = ?`,
      [id]
    );

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'PO tidak ditemukan'
      });
    }

    // Get items
    const items = await query<POItem[]>(
      'SELECT * FROM po_items WHERE po_id = ? ORDER BY id ASC',
      [id]
    );

    // Get transfer details if exists
    let transfer = null;
    if (po.status === 'DANA_DITRANSFER' || po.status === 'BELANJA_SELESAI' || po.status === 'CLOSED') {
      transfer = await queryOne(
        `SELECT t.*, u.nama_lengkap as transferred_by_name
         FROM transfers t
         LEFT JOIN users u ON t.transferred_by = u.id
         WHERE t.po_id = ?`,
        [id]
      );
    }

    // Parse bukti_belanja if exists
    let buktiBelanja = null;
    if (po.bukti_belanja) {
      try {
        buktiBelanja = JSON.parse(po.bukti_belanja as any);
      } catch (e) {
        console.error('Failed to parse bukti_belanja:', e);
      }
    }

    res.json({
      success: true,
      data: {
        ...po,
        items,
        transfer,
        bukti_belanja_parsed: buktiBelanja
      }
    });
  } catch (error) {
    console.error('Get PO error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data PO'
    });
  }
});

// Submit PO for approval
router.post(
  '/:id/submit',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const po = await queryOne<PurchaseOrder>(
        'SELECT * FROM purchase_orders WHERE id = ? AND created_by = ?',
        [id, req.user!.id]
      );

      if (!po) {
        return res.status(404).json({
          success: false,
          message: 'PO tidak ditemukan'
        });
      }

      if (po.status !== 'DRAFT') {
        return res.status(400).json({
          success: false,
          message: `PO tidak dapat disubmit. Status saat ini: ${po.status}`
        });
      }

      // Update status
      await query(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        ['MENUNGGU_APPROVAL', id]
      );

      res.json({
        success: true,
        message: 'PO berhasil disubmit untuk approval',
        data: {
          po_id: id,
          status: 'MENUNGGU_APPROVAL'
        }
      });
    } catch (error) {
      console.error('Submit PO error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat submit PO'
      });
    }
  }
);

// Delete PO (only DRAFT)
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const po = await queryOne<PurchaseOrder>(
        'SELECT * FROM purchase_orders WHERE id = ? AND created_by = ?',
        [id, req.user!.id]
      );

      if (!po) {
        return res.status(404).json({
          success: false,
          message: 'PO tidak ditemukan'
        });
      }

      if (po.status !== 'DRAFT') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status DRAFT yang dapat dihapus'
        });
      }

      await query('DELETE FROM purchase_orders WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'PO berhasil dihapus'
      });
    } catch (error) {
      console.error('Delete PO error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat menghapus PO'
      });
    }
  }
);

export default router;
