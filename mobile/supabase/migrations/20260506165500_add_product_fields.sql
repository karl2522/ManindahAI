-- Migration: Add image_url and barcode to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
