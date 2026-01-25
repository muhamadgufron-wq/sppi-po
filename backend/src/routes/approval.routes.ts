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
      `SELECT po.*, u.nama_lengkap as created_by_name
       FROM purchase_orders po
       LEFT JOIN users u ON po.created_by = u.id
       WHERE po.status = 'MENUNGGU_APPROVAL'
       ORDER BY po.created_at ASC`
    );

    // Fetch items for each PO
    for (let po of pos) {
      const items = await query(
        'SELECT * FROM po_items WHERE po_id = ? ORDER BY id ASC',
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
              u.nama_lengkap as created_by_name,
              m.nama_lengkap as approved_by_name
       FROM purchase_orders po
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN users m ON po.approved_by = m.id
       WHERE po.status IN ('APPROVED', 'REJECTED', 'DANA_DITRANSFER', 'APPROVED_KEUANGAN', 'BELANJA_SELESAI')
       ORDER BY po.approved_at DESC
       LIMIT 50`
    );

    // Fetch items for each PO
    for (let po of pos) {
      const items = await query(
        'SELECT * FROM po_items WHERE po_id = ? ORDER BY id ASC',
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

    await transaction(async (conn) => {
      // If approving, update approved prices for items
      if (action === 'approve' && approved_prices && Array.isArray(approved_prices)) {
        let totalApproved = 0;

        for (const priceData of approved_prices) {
          const { item_id, harga_approved } = priceData;
          
          // Get item to calculate subtotal
          const [item]: any = await conn.execute(
            'SELECT qty_estimasi FROM po_items WHERE id = ? AND po_id = ?',
            [item_id, poId]
          );

          if (item && item.length > 0) {
            const qty = parseFloat(item[0].qty_estimasi);
            const harga = parseFloat(harga_approved);
            const subtotal_approved = qty * harga;
            totalApproved += subtotal_approved;

            // Update item with approved prices
            await conn.execute(
              `UPDATE po_items 
               SET harga_approved = ?, subtotal_approved = ?
               WHERE id = ? AND po_id = ?`,
              [harga, subtotal_approved, item_id, poId]
            );
          }
        }

        // Update PO with total_approved
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
