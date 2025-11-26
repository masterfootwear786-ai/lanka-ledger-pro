-- Drop existing foreign keys and recreate pointing to profiles table
ALTER TABLE public.tax_rates 
DROP CONSTRAINT IF EXISTS tax_rates_deleted_by_fkey,
DROP CONSTRAINT IF EXISTS tax_rates_created_by_fkey;

-- Add foreign keys pointing to profiles table
ALTER TABLE public.tax_rates 
ADD CONSTRAINT tax_rates_deleted_by_fkey 
FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);

ALTER TABLE public.tax_rates 
ADD CONSTRAINT tax_rates_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);