import { Router, Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../types/index.js';

const router = Router();

// GET /dapur - Get all dapur
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const showAll = req.query.all === 'true'; // Admin bisa lihat semua
    const whereClause = showAll ? '' : 'WHERE is_active = 1';
    
    const sql = `
      SELECT 
        id, kode_dapur, nama_dapur, lokasi, 
        pic_name, pic_phone, is_active, keterangan,
        (SELECT COUNT(*) FROM purchase_orders WHERE dapur_id = dapurs.id) as total_po,
        created_at, updated_at
      FROM dapurs 
      ${whereClause}
      ORDER BY nama_dapur ASC
    `;
    
    const results = await query(sql);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /dapur/:id - Get single dapur with stats
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const sql = `
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM purchase_orders WHERE dapur_id = d.id) as total_po,
        (SELECT SUM(total_approved) FROM purchase_orders WHERE dapur_id = d.id AND status IN ('APPROVED', 'APPROVED_KEUANGAN')) as total_approved_amount,
        (SELECT COUNT(*) FROM purchase_orders WHERE dapur_id = d.id AND status = 'MENUNGGU_APPROVAL') as pending_po
      FROM dapurs d
      WHERE d.id = ?
    `;
    
    const results = await query(sql, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Dapur tidak ditemukan' });
    }
    
    res.json({ success: true, data: results[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /dapur - Create new dapur (Admin only)
router.post('/', authenticateToken, authorizeRoles(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { kode_dapur, nama_dapur, lokasi, pic_name, pic_phone, keterangan } = req.body;
    
    // Validation
    if (!kode_dapur || !nama_dapur) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode dapur dan nama dapur wajib diisi' 
      });
    }
    
    // Check duplicate kode
    const checkSql = 'SELECT id FROM dapurs WHERE kode_dapur = ?';
    const existing = await query(checkSql, [kode_dapur]);
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode dapur sudah digunakan' 
      });
    }
    
    const sql = `
      INSERT INTO dapurs (kode_dapur, nama_dapur, lokasi, pic_name, pic_phone, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result: any = await query(sql, [kode_dapur, nama_dapur, lokasi, pic_name, pic_phone, keterangan]);
    
    res.json({ 
      success: true, 
      message: 'Dapur berhasil ditambahkan', 
      data: { id: result.insertId } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /dapur/:id - Update dapur (Admin only)
router.put('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { kode_dapur, nama_dapur, lokasi, pic_name, pic_phone, is_active, keterangan } = req.body;
    
    // Validation
    if (!kode_dapur || !nama_dapur) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode dapur dan nama dapur wajib diisi' 
      });
    }
    
    // Check duplicate kode (exclude current)
    const checkSql = 'SELECT id FROM dapurs WHERE kode_dapur = ? AND id != ?';
    const existing = await query(checkSql, [kode_dapur, id]);
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode dapur sudah digunakan' 
      });
    }
    
    const sql = `
      UPDATE dapurs 
      SET kode_dapur = ?, nama_dapur = ?, lokasi = ?, 
          pic_name = ?, pic_phone = ?, is_active = ?, keterangan = ?
      WHERE id = ?
    `;
    
    await query(sql, [kode_dapur, nama_dapur, lokasi, pic_name, pic_phone, is_active, keterangan, id]);
    
    res.json({ success: true, message: 'Dapur berhasil diupdate' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /dapur/:id - Delete dapur (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if dapur has PO
    const checkSql = 'SELECT COUNT(*) as count FROM purchase_orders WHERE dapur_id = ?';
    const result = await query(checkSql, [id]);
    
    if (result[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Tidak dapat menghapus dapur yang sudah memiliki ${result[0].count} PO` 
      });
    }
    
    const deleteSql = 'DELETE FROM dapurs WHERE id = ?';
    await query(deleteSql, [id]);
    
    res.json({ success: true, message: 'Dapur berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /dapur/:id/toggle - Toggle active status (Admin only)
router.patch('/:id/toggle', authenticateToken, authorizeRoles(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const sql = 'UPDATE dapurs SET is_active = NOT is_active WHERE id = ?';
    await query(sql, [id]);
    
    res.json({ success: true, message: 'Status dapur berhasil diubah' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
