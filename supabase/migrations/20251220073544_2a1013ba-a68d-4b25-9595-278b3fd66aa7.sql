-- Add unique constraint on user_permissions for upsert to work
ALTER TABLE public.user_permissions 
ADD CONSTRAINT user_permissions_user_module_unique UNIQUE (user_id, company_id, module);

-- Enable RLS on user_permissions if not already
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own permissions
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
CREATE POLICY "Users can view own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Admins can manage all permissions in their company
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage permissions" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
    AND user_roles.company_id = user_permissions.company_id
  )
);

-- Also check sales_rep_stats table exists
CREATE TABLE IF NOT EXISTS public.sales_rep_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoices_created INTEGER DEFAULT 0,
  orders_created INTEGER DEFAULT 0,
  receipts_created INTEGER DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  total_collections NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_date)
);

ALTER TABLE public.sales_rep_stats ENABLE ROW LEVEL SECURITY;

-- Policy for sales_rep_stats
DROP POLICY IF EXISTS "Admins can view sales rep stats" ON public.sales_rep_stats;
CREATE POLICY "Admins can view sales rep stats" 
ON public.sales_rep_stats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can manage own stats" ON public.sales_rep_stats;
CREATE POLICY "Users can manage own stats" 
ON public.sales_rep_stats 
FOR ALL 
USING (auth.uid() = user_id);