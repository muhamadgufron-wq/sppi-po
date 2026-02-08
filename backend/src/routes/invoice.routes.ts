import { Router, Response } from 'express';
import { query, queryOne, transaction } from '../config/database.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { UserRole, Invoice, InvoiceItem } from '../types/index.js';

const router = Router();

// GET /api/invoices - List all invoices
router.get('/', authenticateToken, authorizeRoles(UserRole.PURCHASING), async (req: AuthRequest, res: Response) => {
  try {
    const { dapur_id, status, limit = 50 } = req.query;

    let sql = `
      SELECT 
        i.*,
        d.kode_dapur,
        d.nama_dapur,
        u.nama_lengkap as created_by_name
      FROM invoices i
      LEFT JOIN dapurs d ON i.dapur_id = d.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (dapur_id) {
      sql += ' AND i.dapur_id = ?';
      params.push(dapur_id);
    }

    if (status) {
      sql += ' AND i.status = ?';
      params.push(status);
    }

    // Use template literal for LIMIT (safer than parameter binding for LIMIT clause)
    const limitValue = parseInt(String(limit), 10) || 50;
    sql += ` ORDER BY i.created_at DESC LIMIT ${limitValue}`;

    console.log('[INVOICE LIST] SQL:', sql);
    console.log('[INVOICE LIST] Params:', params);

    const invoices = await query<Invoice[]>(sql, params);

    res.json({
      success: true,
      data: invoices
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('SQL State:', error.sqlState);
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data invoice',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/invoices/preview - Preview POs that can be invoiced
router.get('/preview', authenticateToken, authorizeRoles(UserRole.PURCHASING), async (req: AuthRequest, res: Response) => {
  try {
    const { dapur_id, periode_start, periode_end } = req.query;

    if (!dapur_id || !periode_start || !periode_end) {
      return res.status(400).json({
        success: false,
        message: 'dapur_id, periode_start, dan periode_end wajib diisi'
      });
    }

    const pos = await query(
      `SELECT 
        po.id,
        po.po_number,
        po.tanggal_po,
        COALESCE(SUM(items.total_harga_jual), 0) as total_jual
      FROM purchase_orders po
      LEFT JOIN po_items items ON po.id = items.po_id
      WHERE po.dapur_id = ?
        AND po.status = 'BELANJA_SELESAI'
        AND po.tanggal_po BETWEEN ? AND ?
        AND NOT EXISTS (
          SELECT 1 FROM invoice_items ii WHERE ii.po_id = po.id
        )
      GROUP BY po.id, po.po_number, po.tanggal_po
      ORDER BY po.tanggal_po ASC`,
      [dapur_id, periode_start, periode_end]
    );

    console.log('[INVOICE PREVIEW] Query params:', { dapur_id, periode_start, periode_end });
    console.log('[INVOICE PREVIEW] Result count:', Array.isArray(pos) ? pos.length : 0);
    console.log('[INVOICE PREVIEW] Results:', pos);

    res.json({
      success: true,
      data: pos
    });
  } catch (error) {
    console.error('Preview POs error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat preview PO'
    });
  }
});

// GET /api/invoices/:id - Get invoice detail with items
router.get('/:id', authenticateToken, authorizeRoles(UserRole.PURCHASING), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await queryOne<Invoice>(
      `SELECT 
        i.*,
        d.kode_dapur,
        d.nama_dapur,
        d.lokasi as dapur_lokasi,
        u.nama_lengkap as created_by_name
      FROM invoices i
      LEFT JOIN dapurs d ON i.dapur_id = d.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = ?`,
      [id]
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice tidak ditemukan'
      });
    }

    // Get invoice items
    const items = await query<InvoiceItem[]>(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC',
      [id]
    );

    invoice.items = items;

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail invoice'
    });
  }
});

// POST /api/invoices/generate - Generate invoice from POs
router.post('/generate', authenticateToken, authorizeRoles(UserRole.PURCHASING), async (req: AuthRequest, res: Response) => {
  try {
    const { dapur_id, periode_start, periode_end, up_nama } = req.body;

    if (!dapur_id || !periode_start || !periode_end) {
      return res.status(400).json({
        success: false,
        message: 'dapur_id, periode_start, dan periode_end wajib diisi'
      });
    }

    await transaction(async (conn) => {
      // 1. Get POs that are BELANJA_SELESAI and not yet invoiced
      const pos = await conn.query(
        `SELECT 
          po.id,
          po.po_number,
          po.tanggal_po,
          COALESCE(SUM(items.total_harga_jual), 0) as total_jual
        FROM purchase_orders po
        LEFT JOIN po_items items ON po.id = items.po_id
        WHERE po.dapur_id = ?
          AND po.status = 'BELANJA_SELESAI'
          AND po.tanggal_po BETWEEN ? AND ?
          AND NOT EXISTS (
            SELECT 1 FROM invoice_items ii WHERE ii.po_id = po.id
          )
        GROUP BY po.id, po.po_number, po.tanggal_po
        ORDER BY po.tanggal_po ASC`,
        [dapur_id, periode_start, periode_end]
      );

      const posResult = pos as any;
      if (!posResult[0] || posResult[0].length === 0) {
        throw new Error('Tidak ada PO yang bisa di-invoice untuk periode ini');
      }

      const poList = posResult[0] as any[];

      // 2. Get dapur info for invoice number
      const dapurResult = await conn.query(
        'SELECT kode_dapur FROM dapurs WHERE id = ?',
        [dapur_id]
      );
      const dapurRows = dapurResult as any;
      const dapur = dapurRows[0][0] as any;
      const kodeDapur = dapur?.kode_dapur || 'UNKNOWN';

      // 3. Generate invoice number with Roman numeral month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-12
      
      // Convert month to Roman numeral
      const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const romanMonth = romanMonths[month - 1];
      
      // Count invoices for current year (reset yearly, not monthly)
      const countResult = await conn.query(
        'SELECT COUNT(*) as count FROM invoices WHERE YEAR(tanggal_invoice) = ?',
        [year]
      );
      const countRows = countResult as any;
      const count = (countRows[0][0] as any).count;
      const sequence = String(count + 1).padStart(3, '0');
      
      // Format: {sequence}/SPPI/HO-TGR/{roman_month}/{year}
      const invoiceNumber = `${sequence}/SPPI/HO-TGR/${romanMonth}/${year}`;

      // 4. Calculate total
      const totalAmount = poList.reduce((sum, po) => sum + Number(po.total_jual), 0);

      // 5. Insert invoice
      const invoiceResult = await conn.execute(
        `INSERT INTO invoices 
        (invoice_number, dapur_id, tanggal_invoice, periode_start, periode_end, up_nama, total_amount, created_by)
        VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
        [invoiceNumber, dapur_id, periode_start, periode_end, up_nama || null, totalAmount, req.user!.id]
      );

      const invoiceId = (invoiceResult[0] as any).insertId;

      // 6. Insert invoice items
      for (const po of poList) {
        await conn.execute(
          `INSERT INTO invoice_items (invoice_id, po_id, po_number, tanggal_po, nominal)
          VALUES (?, ?, ?, ?, ?)`,
          [invoiceId, po.id, po.po_number, po.tanggal_po, po.total_jual]
        );
      }

      res.json({
        success: true,
        message: 'Invoice berhasil dibuat',
        data: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          total_pos: poList.length,
          total_amount: totalAmount
        }
      });
    });
  } catch (error: any) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal generate invoice'
    });
  }
});

// PUT /api/invoices/:id/issue - Issue invoice (DRAFT -> ISSUED)
router.put('/:id/issue', authenticateToken, authorizeRoles(UserRole.PURCHASING), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await queryOne<Invoice>(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice tidak ditemukan'
      });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Invoice tidak bisa di-issue. Status saat ini: ${invoice.status}`
      });
    }

    await query(
      `UPDATE invoices SET status = 'ISSUED', issued_at = NOW() WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Invoice berhasil di-issue'
    });
  } catch (error) {
    console.error('Issue invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal issue invoice'
    });
  }
});

// PUT /api/invoices/:id/payment - Mark as paid
router.put('/:id/payment', authenticateToken, authorizeRoles(UserRole.PURCHASING), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { metode_pembayaran, sisa_tagihan = 0 } = req.body;

    const invoice = await queryOne<Invoice>(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice tidak ditemukan'
      });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Invoice sudah dibayar'
      });
    }

    await query(
      `UPDATE invoices 
      SET status = 'PAID', paid_at = NOW(), metode_pembayaran = ?, sisa_tagihan = ?
      WHERE id = ?`,
      [metode_pembayaran || null, sisa_tagihan, id]
    );

    res.json({
      success: true,
      message: 'Invoice berhasil ditandai sebagai PAID'
    });
  } catch (error) {
    console.error('Payment invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal update payment invoice'
    });
  }
});

// DELETE /api/invoices/:id - Delete draft invoice
router.delete('/:id', authenticateToken, authorizeRoles(UserRole.PURCHASING), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await queryOne<Invoice>(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice tidak ditemukan'
      });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Hanya invoice DRAFT yang bisa dihapus'
      });
    }

    // Delete invoice (items will be cascade deleted)
    await query('DELETE FROM invoices WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Invoice berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus invoice'
    });
  }
});

export default router;
