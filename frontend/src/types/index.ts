// TypeScript interfaces matching backend
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAJER = 'MANAJER',
  KEUANGAN = 'KEUANGAN',
  LAPANGAN = 'LAPANGAN'
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  nama_lengkap: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export enum POStatus {
  DRAFT = 'DRAFT',
  MENUNGGU_APPROVAL = 'MENUNGGU_APPROVAL',
  APPROVED = 'APPROVED',
  APPROVED_KEUANGAN = 'APPROVED_KEUANGAN',
  REJECTED = 'REJECTED',
  DANA_DITRANSFER = 'DANA_DITRANSFER',
  BELANJA_SELESAI = 'BELANJA_SELESAI',
  CLOSED = 'CLOSED'
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  tanggal_po: string;
  created_by: number;
  status: POStatus;
  total_estimasi: number;
  total_approved?: number;
  total_real?: number;
  catatan_admin?: string;
  catatan_manajer?: string;
  catatan_keuangan?: string;
  catatan_lapangan?: string;
  approved_by?: number;
  approved_at?: string;
  processed_by_keuangan?: number;
  nominal_transfer?: number;
  tanggal_transfer?: string;
  transferred_by?: number;
  transferred_at?: string;
  bukti_belanja?: string;
  shopping_completed_by?: number;
  shopping_completed_at?: string;
  completed_by?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  // Joined fields
  created_by_name?: string;
  approved_by_name?: string;
  processed_by_keuangan_name?: string;
  shopping_completed_by_name?: string;
  dapur_id?: number;
  kode_dapur?: string;
  nama_dapur?: string;
  dapur_lokasi?: string;
}

export interface POItem {
  id: number;
  po_id: number;
  nama_barang: string;
  kategori_sayuran?: string;
  qty_estimasi: number;
  satuan: string;
  harga_estimasi: number;
  subtotal_estimasi: number;
  harga_approved?: number;
  subtotal_approved?: number;
  qty_real?: number;
  harga_real?: number;
  subtotal_real?: number;
  selisih_persen?: number;
  bukti_foto?: string;
  transfer_id?: number;
  
  // Profit Analysis Fields
  estimasi_susut?: number;
  harga_modal?: number;
  total_modal?: number;
  harga_jual?: number;
  total_harga_jual?: number;
  profit?: number;
  margin?: number;
}

export interface Transfer {
  id: number;
  po_id: number;
  amount: number; // DB column
  transfer_date: string; // DB column
  notes?: string;
  proof_image?: string; // DB column
  created_by: number;
  created_by_name?: string;
  
  // Legacy/Frontend alias (optional)
  nominal_transfer?: number;
  tanggal_transfer?: string;
  bukti_transfer_path?: string;
}

export interface ShoppingProof {
  filename: string;
  path: string;
  originalname: string;
}

export interface POWithItems extends PurchaseOrder {
  items: POItem[];
  transfers?: Transfer[]; // Added
  transfer?: Transfer | null;
  bukti_belanja_parsed?: ShoppingProof[] | null;
}

export interface CreatePORequest {
  tanggal_po: string;
  dapur_id: number;
  items: {
    nama_barang: string;
    kategori_sayuran?: string;
    qty_estimasi: number;
    satuan: string;
    harga_estimasi: number;
    // New fields
    estimasi_susut?: number;
    harga_modal?: number; 
    harga_jual?: number;
  }[];
  catatan_admin?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}
