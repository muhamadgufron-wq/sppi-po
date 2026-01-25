import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors
        });
      }
      
      next(error);
    }
  };
}

// Common validation schemas
export const createPOSchema = z.object({
  tanggal_po: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  items: z.array(z.object({
    nama_barang: z.string().min(1, 'Nama barang wajib diisi'),
    kategori_sayuran: z.string().optional(),
    qty_estimasi: z.number().positive('Qty harus lebih dari 0'),
    satuan: z.string().min(1, 'Satuan wajib diisi'),
    harga_estimasi: z.number().positive('Harga harus lebih dari 0')
  })).min(1, 'Minimal 1 item diperlukan'),
  catatan_admin: z.string().optional()
});

export const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  catatan_manajer: z.string().nullable().optional()
});

export const transferSchema = z.object({
  nominal_transfer: z.number().positive('Nominal harus lebih dari 0'),
  tanggal_transfer: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  metode_transfer: z.string().optional(),
  nomor_rekening_tujuan: z.string().optional()
});

export const shoppingUpdateSchema = z.object({
  items: z.array(z.object({
    item_id: z.number().int(),
    qty_real: z.number().positive('Qty real harus lebih dari 0'),
    harga_real: z.number().positive('Harga real harus lebih dari 0')
  })).min(1, 'Minimal 1 item diperlukan'),
  tanggal_belanja: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  catatan_lapangan: z.string().optional()
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi')
});
