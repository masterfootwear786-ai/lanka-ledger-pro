
-- Drop the existing unique constraint that only includes item_id and size
ALTER TABLE public.stock_by_size DROP CONSTRAINT IF EXISTS stock_by_size_item_id_size_key;

-- Create a new unique constraint that includes stock_type
ALTER TABLE public.stock_by_size ADD CONSTRAINT stock_by_size_item_id_size_stock_type_key UNIQUE (item_id, size, stock_type);
