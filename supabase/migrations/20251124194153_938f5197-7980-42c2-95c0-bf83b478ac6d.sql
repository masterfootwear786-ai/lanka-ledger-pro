-- Drop all old unique constraints on items table that don't include color
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_company_id_code_key;
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_code_company_id_key;

-- Ensure the correct constraint exists (code + color + company_id combination must be unique)
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_code_color_company_id_key;
ALTER TABLE public.items 
ADD CONSTRAINT items_code_color_company_id_key 
UNIQUE (code, color, company_id);
