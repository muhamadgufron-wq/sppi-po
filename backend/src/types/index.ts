import { Request } from 'express';

// User & Authentication Types
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
  password_hash: string;
  role: UserRole;
  nama_lengkap: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserPayload {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  nama_lengkap: string;
}

// Express Request with authenticated user
export interface AuthRequest extends Request {
  user?: UserPayload;
}

// Purchase Order Types
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
  tanggal_po: Date;
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
  approved_at?: Date;
  processed_by_keuangan?: number;
  nominal_transfer?: number;
  tanggal_transfer?: Date;
  transferred_by?: number;
  transferred_at?: Date;
  bukti_belanja?: string;
  shopping_completed_by?: number;
  shopping_completed_at?: Date;
  completed_by?: number;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  items?: POItem[];
  transfers?: Transfer[];
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
  qty_real?: number;
  harga_real?: number;
  subtotal_real?: number;
  selisih_persen?: number;
  
  // Profit Analysis Fields
  estimasi_susut?: number;
  harga_modal?: number;
  total_modal?: number;
  harga_jual?: number;
  total_harga_jual?: number;
  profit?: number;
  margin?: number;
  
  created_at: Date;
  updated_at: Date;
}

export interface Transfer {
  id: number;
  po_id: number;
  nominal_transfer: number;
  tanggal_transfer: Date;
  metode_transfer?: string;
  nomor_rekening_tujuan?: string;
  bukti_transfer_path?: string;
  transferred_by: number;
  created_at: Date;
}

export interface ShoppingProof {
  id: number;
  po_id: number;
  bukti_path: string;
  tanggal_belanja: Date;
  keterangan?: string;
  uploaded_by: number;
  created_at: Date;
}

export interface PriceHistory {
  id: number;
  nama_barang: string;
  kategori_sayuran?: string;
  harga: number;
  satuan: string;
  tanggal_transaksi: Date;
  sumber: 'PO' | 'MANUAL';
  po_id?: number;
  created_at: Date;
}

// AI Recommendation Types
export interface AIRecommendation {
  id: number;
  po_id: number;
  role_target: UserRole;
  tipe_rekomendasi: string;
  status_analisis: string;
  analisis: string;
  rekomendasi: string;
  catatan?: string;
  confidence_score?: number;
  is_read: boolean;
  created_at: Date;
}

export interface AIAnalysisResult {
  status: string;
  analisis: string[];
  rekomendasi: string[];
  catatan?: string[];
  confidence_score?: number;
}

// Request/Response Types
export interface CreatePORequest {
  tanggal_po: string;
  items: {
    nama_barang: string;
    kategori_sayuran?: string;
    qty_estimasi: number;
    satuan: string;
    harga_estimasi: number;
    
    // Profit Analysis Fields
    estimasi_susut?: number;
    harga_modal?: number;
    total_modal?: number;
    harga_jual?: number;
    total_harga_jual?: number;
    profit?: number;
    margin?: number;
  }[];
  catatan_admin?: string;
}

export interface ApprovalRequest {
  action: 'approve' | 'reject';
  catatan_manajer: string;
}

export interface TransferRequest {
  nominal_transfer: number;
  tanggal_transfer: string;
  metode_transfer?: string;
  nomor_rekening_tujuan?: string;
}

export interface ShoppingUpdateRequest {
  items: {
    item_id: number;
    qty_real: number;
    harga_real: number;
  }[];
  tanggal_belanja: string;
  catatan_lapangan?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Price Analysis Types
export interface PriceInsight {
  nama_barang: string;
  harga_rata_rata_7_hari?: number;
  harga_rata_rata_30_hari?: number;
  harga_min?: number;
  harga_max?: number;
  trend: 'naik' | 'turun' | 'stabil';
  is_outlier: boolean;
  outlier_percentage?: number;
}
