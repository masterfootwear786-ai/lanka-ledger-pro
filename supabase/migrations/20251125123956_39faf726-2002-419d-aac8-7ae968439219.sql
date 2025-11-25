-- Add low stock threshold field to items table
ALTER TABLE items 
ADD COLUMN low_stock_threshold numeric DEFAULT 10;

COMMENT ON COLUMN items.low_stock_threshold IS 'Minimum stock quantity before warning is shown';