-- Remove the unique constraint on code (if it exists) and add a unique constraint on code + color combination
-- First, drop the existing unique constraint on code
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_code_key;
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_code_company_id_key;

-- Add a unique constraint on the combination of code, color, and company_id
-- This allows the same Art No with different colors
ALTER TABLE public.items 
ADD CONSTRAINT items_code_color_company_id_key 
UNIQUE (code, color, company_id);
