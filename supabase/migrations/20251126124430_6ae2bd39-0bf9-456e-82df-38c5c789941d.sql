-- Add password protection for tax rates and soft delete columns
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS protect_tax_rate_delete boolean DEFAULT false;

ALTER TABLE public.tax_rates 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "Company scoped select" ON public.tax_rates;
CREATE POLICY "Company scoped select" ON public.tax_rates
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND deleted_at IS NULL);

-- Add policy to allow admins to view deleted items for trash
CREATE POLICY "Admins can view deleted items" ON public.tax_rates
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);