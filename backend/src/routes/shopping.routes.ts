import { Router, Response } from 'express';
import { query, queryOne, transaction } from '../config/database.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { validateRequest, shoppingUpdateSchema } from '../middleware/validation.js';
import { PurchaseOrder, POItem, UserRole } from '../types/index.js';
import { upload, uploadToCloudinary } from '../middleware/upload.js';

const router = Router();

// Get active shopping (sudah ditransfer keuangan)
router.get('/active', authenticateToken, authorizeRoles(UserRole.LAPANGAN), async (req: AuthRequest, res: Response) => {
  try {
    const pos = await query<PurchaseOrder[]>(
      `SELECT po.*, 
              u.nama_lengkap as created_by_name,
              k.nama_lengkap as processed_by_name
       FROM purchase_orders po
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN users k ON po.processed_by_keuangan = k.id
       WHERE po.status IN ('APPROVED_KEUANGAN')
       ORDER BY po.tanggal_transfer ASC`
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
    console.error('Get active shopping error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data'
    });
  }
});

// Get shopping history
router.get('/history', authenticateToken, authorizeRoles(UserRole.LAPANGAN), async (req: AuthRequest, res: Response) => {
  try {
    const pos = await query<PurchaseOrder[]>(
      `SELECT po.*, 
              u.nama_lengkap as created_by_name,
              k.nama_lengkap as processed_by_name,
              s.nama_lengkap as shopper_name
       FROM purchase_orders po
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN users k ON po.processed_by_keuangan = k.id
       LEFT JOIN users s ON po.shopping_completed_by = s.id
       WHERE po.status = 'BELANJA_SELESAI'
       ORDER BY po.shopping_completed_at DESC
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
    console.error('Get shopping history error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil history belanja'
    });
  }
});

// Update shopping items (qty real & harga real)
router.post('/:poId/items', authenticateToken, authorizeRoles(UserRole.LAPANGAN), validateRequest(shoppingUpdateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { poId } = req.params;
    const updateData = req.body;

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

    if (po.status !== 'DANA_DITRANSFER') {
      return res.status(400).json({
        success: false,
        message: `PO tidak dapat diproses. Status saat ini: ${po.status}`
      });
    }

    // Update items
    await transaction(async (conn) => {
      for (const item of updateData.items) {
        // Get original item
        const [originalItem] = await conn.execute<any>(
          'SELECT * FROM po_items WHERE id = ? AND po_id = ?',
          [item.item_id, poId]
        );

        if (originalItem.length === 0) continue;

        const original = originalItem[0];
        const subtotalEstimasi = original.qty_estimasi * original.harga_estimasi;
        const subtotalReal = item.qty_real * item.harga_real;
        const selisihPersen = ((subtotalReal - subtotalEstimasi) / subtotalEstimasi) * 100;

        // Update item
        await conn.execute(
          `UPDATE po_items 
           SET qty_real = ?, harga_real = ?, selisih_persen = ?
           WHERE id = ?`,
          [item.qty_real, item.harga_real, selisihPersen, item.item_id]
        );
      }

      // Update PO catatan
      if (updateData.catatan_lapangan) {
        await conn.execute(
          'UPDATE purchase_orders SET catatan_lapangan = ? WHERE id = ?',
          [updateData.catatan_lapangan, poId]
        );
      }
    });

    res.json({
      success: true,
      message: 'Data belanja berhasil diupdate'
    });
  } catch (error) {
    console.error('Update shopping items error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat update data belanja'
    });
  }
});

// Upload shopping proof
router.post('/:poId/proof', authenticateToken, authorizeRoles(UserRole.LAPANGAN), upload.array('bukti_belanja', 5), async (req: AuthRequest, res: Response) => {
  try {
    const { poId } = req.params;
    const { tanggal_belanja, keterangan } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimal 1 bukti belanja harus di-upload'
      });
    }

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

    // Insert shopping proofs
    await transaction(async (conn) => {
      for (const file of files) {
        // Upload to Cloudinary
        const secureUrl = await uploadToCloudinary(file.buffer, 'po_shopping_proofs');
        
        await conn.execute(
          `INSERT INTO shopping_proofs 
          (po_id, bukti_path, tanggal_belanja, keterangan, uploaded_by)
          VALUES (?, ?, ?, ?, ?)`,
          [poId, secureUrl, tanggal_belanja, keterangan || null, req.user!.id]
        );
      }
    });

    res.json({
      success: true,
      message: `${files.length} bukti belanja berhasil di-upload ke Cloudinary`
    });
  } catch (error) {
    console.error('Upload shopping proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat upload bukti belanja'
    });
  }
});

// Complete shopping
router.post('/:poId/complete', authenticateToken, authorizeRoles(UserRole.LAPANGAN), upload.any(), async (req: AuthRequest, res: Response) => {
  try {
    const { poId } = req.params;
    const { real_prices } = req.body; // JSON string of array
    const files = req.files as Express.Multer.File[];

    console.log('Complete shopping request:', { poId, real_prices, filesCount: files?.length });

    // Parse real_prices if it's a string
    let pricesArray;
    try {
      pricesArray = typeof real_prices === 'string' ? JSON.parse(real_prices) : real_prices;
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Format real_prices tidak valid'
      });
    }

    if (!pricesArray || !Array.isArray(pricesArray)) {
      return res.status(400).json({
        success: false,
        message: 'real_prices harus berupa array'
      });
    }

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

    if (po.status !== 'APPROVED_KEUANGAN') {
      return res.status(400).json({
        success: false,
        message: `PO tidak dapat diproses. Status saat ini: ${po.status}`
      });
    }

    console.log('Updating items and PO...');

    // Update items and calculate total
    let totalReal = 0;
    
    await transaction(async (conn) => {
      for (const priceData of pricesArray) {
        const { item_id, harga_real } = priceData;
        
        // Find uploaded file for this item
        // Frontend should append file with key 'proof_item_{itemId}'
        const proofFile = files.find(f => f.fieldname === `proof_item_${item_id}`);
        let bukti_foto = null;

        if (proofFile) {
            // Upload to Cloudinary
            bukti_foto = await uploadToCloudinary(proofFile.buffer, 'po_item_proofs');
        }

        // Get item to calculate subtotal
        const [item]: any = await conn.execute(
          'SELECT qty_estimasi FROM po_items WHERE id = ? AND po_id = ?',
          [item_id, poId]
        );

        if (item && item.length > 0) {
          const qty = parseFloat(item[0].qty_estimasi);
          const harga = parseFloat(harga_real);
          const subtotal_real = qty * harga;
          totalReal += subtotal_real;

          // Update item with real prices and proof
          // Set qty_real = qty_estimasi by default as we don't have separate input for it here
          let query = `UPDATE po_items SET harga_real = ?, qty_real = ?`;
          const params: any[] = [harga, qty];

          if (bukti_foto) {
            query += `, bukti_foto = ?`;
            params.push(bukti_foto);
          }

          query += ` WHERE id = ? AND po_id = ?`;
          params.push(item_id, poId);

          await conn.execute(query, params);
        }
      }

      // Update PO
      await conn.execute(
        `UPDATE purchase_orders 
         SET status = 'BELANJA_SELESAI',
             total_real = ?,
             shopping_completed_at = NOW(),
             shopping_completed_by = ?
         WHERE id = ?`,
        [totalReal, req.user!.id, poId]
      );
    });

    console.log('Shopping completed successfully');

    res.json({
      success: true,
      message: 'Belanja berhasil diselesaikan',
      data: {
        po_id: poId,
        status: 'BELANJA_SELESAI',
        total_real: totalReal
      }
    });
  } catch (error: any) {
    console.error('Complete shopping error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menyelesaikan belanja',
      error: error.message
    });
  }
});

export default router;
