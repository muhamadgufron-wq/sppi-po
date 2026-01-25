-- Migration: Add approved price columns
-- Date: 2025-12-26
-- Description: Add columns for Manager to input approved prices during approval process

-- Add approved price columns to po_items table
ALTER TABLE po_items
ADD COLUMN harga_approved DECIMAL(15,2) DEFAULT NULL COMMENT 'Harga satuan yang disetujui Manager',
ADD COLUMN subtotal_approved DECIMAL(15,2) DEFAULT NULL COMMENT 'Subtotal approved (qty × harga_approved)';

-- Add total_approved to purchase_orders table
ALTER TABLE purchase_orders
ADD COLUMN total_approved DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Total harga approved dari semua items';

-- Verify changes
SELECT 'Migration completed successfully' as status;
