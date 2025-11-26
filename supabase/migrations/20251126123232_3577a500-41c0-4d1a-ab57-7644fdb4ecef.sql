-- Add soft delete columns to tables that don't have them
ALTER TABLE public.sales_orders 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.bill_payments 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Update RLS policies to exclude soft-deleted records from normal queries
DROP POLICY IF EXISTS "Company scoped select" ON public.sales_orders;
CREATE POLICY "Company scoped select" ON public.sales_orders
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Company scoped select" ON public.contacts;
CREATE POLICY "Company scoped select" ON public.contacts
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Company scoped select" ON public.bills;
CREATE POLICY "Company scoped select" ON public.bills
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Company scoped select" ON public.items;
CREATE POLICY "Company scoped select" ON public.items
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Company scoped select" ON public.receipts;
CREATE POLICY "Company scoped select" ON public.receipts
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Company scoped select" ON public.bill_payments;
CREATE POLICY "Company scoped select" ON public.bill_payments
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Company scoped select" ON public.invoices;
CREATE POLICY "Company scoped select" ON public.invoices
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND deleted_at IS NULL);

-- Add policy to allow admins to view deleted items for trash
CREATE POLICY "Admins can view deleted items" ON public.invoices
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view deleted items" ON public.sales_orders
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view deleted items" ON public.contacts
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view deleted items" ON public.bills
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view deleted items" ON public.items
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view deleted items" ON public.receipts
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view deleted items" ON public.bill_payments
  FOR SELECT USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);