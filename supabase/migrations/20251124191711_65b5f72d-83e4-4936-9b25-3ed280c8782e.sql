-- Add stock quantity field to items table
ALTER TABLE public.items
ADD COLUMN stock_quantity numeric DEFAULT 0;