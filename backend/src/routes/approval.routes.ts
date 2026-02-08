import { Router, Response } from 'express';
import { query, queryOne, transaction } from '../config/database.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { validateRequest, approvalSchema } from '../middleware/validation.js';
import { PurchaseOrder, POItem, UserRole } from '../types/index.js';

const router = Router();

// Get pending approvals
router.get('/pending', authenticateToken, authorizeRoles(UserRole.MANAJER), async (req: AuthRequest, res: Response) => {
  try {
    const pos = await query<PurchaseOrder[]>(
      `SELECT po.*, 
              d.kode_dapur, d.nama_dapur, d.lokasi as dapur_lokasi,
              u.nama_lengkap as created_by_name
       FROM purchase_orders po
       LEFT JOIN dapurs d ON po.dapur_id = d.id
       LEFT JOIN users u ON po.created_by = u.id
       WHERE po.status = 'MENUNGGU_APPROVAL'
       ORDER BY po.created_at ASC`
    );

    // Fetch items for each PO (including profit analysis fields)
    for (let po of pos) {
      const items = await query(
        `SELECT id, po_id, nama_barang, qty_estimasi, satuan, 
                harga_estimasi, estimasi_susut, subtotal_estimasi, kategori_sayuran,
                COALESCE(harga_modal, 0) as harga_modal, 
                COALESCE(total_modal, 0) as total_modal, 
                COALESCE(harga_jual, 0) as harga_jual, 
                COALESCE(total_harga_jual, 0) as total_harga_jual, 
                COALESCE(profit, 0) as profit, 
                COALESCE(margin, 0) as margin,
                harga_real, transfer_id, bukti_foto
         FROM po_items 
         WHERE po_id = ? 
         ORDER BY id ASC`,
        [po.id]
      );
      po.items = items;
    }

    res.json({
      success: true,
      data: pos
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    });
  }
});

// Get approval history
router.get('/history', authenticateToken, authorizeRoles(UserRole.MANAJER), async (req: AuthRequest, res: Response) => {
  try {
    const pos = await query<PurchaseOrder[]>(
      `SELECT po.*, 
              d.kode_dapur, d.nama_dapur, d.lokasi as dapur_lokasi,
              u.nama_lengkap as created_by_name,
              m.nama_lengkap as approved_by_name
       FROM purchase_orders po
       LEFT JOIN dapurs d ON po.dapur_id = d.id
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN users m ON po.approved_by = m.id
       WHERE po.status IN ('APPROVED', 'REJECTED', 'DANA_DITRANSFER', 'APPROVED_KEUANGAN', 'BELANJA_SELESAI')
       ORDER BY po.approved_at DESC
       LIMIT 50`
    );

    // Fetch items for each PO (including profit analysis fields)
    for (let po of pos) {
      const items = await query(
        `SELECT id, po_id, nama_barang, qty_estimasi, satuan, 
                harga_estimasi, estimasi_susut, subtotal_estimasi, kategori_sayuran,
                COALESCE(harga_modal, 0) as harga_modal, 
                COALESCE(total_modal, 0) as total_modal, 
                COALESCE(harga_jual, 0) as harga_jual, 
                COALESCE(total_harga_jual, 0) as total_harga_jual, 
                COALESCE(profit, 0) as profit, 
                COALESCE(margin, 0) as margin,
                harga_real, transfer_id, bukti_foto
         FROM po_items 
         WHERE po_id = ? 
         ORDER BY id ASC`,
        [po.id]
      );
      po.items = items;
    }

    res.json({
      success: true,
      data: pos
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data history'
    });
  }
});

// Approve or Reject PO
router.post('/:poId/process', authenticateToken, authorizeRoles(UserRole.MANAJER), validateRequest(approvalSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { poId } = req.params;
    const { action, catatan_manajer, approved_prices } = req.body;

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

    if (po.status !== 'MENUNGGU_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: `PO tidak dapat diproses. Status saat ini: ${po.status}`
      });
    }

    // Process based on action
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const { adjusted_prices } = req.body;

    await transaction(async (conn) => {
      // If approving, save adjusted prices and calculate total
      if (action === 'approve' && adjusted_prices && Array.isArray(adjusted_prices)) {
        let totalApproved = 0;
        
        // Update each item with adjusted prices from manager
        for (const priceData of adjusted_prices) {
          const { item_id, harga_jual, total_harga_jual, profit, margin } = priceData;
          
          // Update po_items with manager's adjusted selling price
          await conn.execute(
            `UPDATE po_items 
             SET harga_jual = ?, total_harga_jual = ?, profit = ?, margin = ?
             WHERE id = ? AND po_id = ?`,
            [harga_jual, total_harga_jual, profit, margin, item_id, poId]
          );
          
          totalApproved += parseFloat(total_harga_jual) || 0;
        }

        // Update PO with total_approved and status
        await conn.execute(
          `UPDATE purchase_orders 
           SET status = ?, approved_by = ?, approved_at = NOW(), 
               catatan_manajer = ?, total_approved = ?
           WHERE id = ?`,
          [newStatus, req.user!.id, catatan_manajer, totalApproved, poId]
        );
      } else {
        // For reject, just update status
        await conn.execute(
          `UPDATE purchase_orders 
           SET status = ?, approved_by = ?, approved_at = NOW(), catatan_manajer = ?
           WHERE id = ?`,
          [newStatus, req.user!.id, catatan_manajer, poId]
        );
      }
    });

    res.json({
      success: true,
      message: `PO berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}`,
      data: {
        po_id: poId,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Process approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses approval'
    });
  }
});

export default router;
