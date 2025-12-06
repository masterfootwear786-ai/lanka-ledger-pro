-- Add username field to profiles for sales rep login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create activity_logs table for tracking all actions
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout'
  entity_type text, -- 'invoice', 'order', 'receipt', 'customer', etc.
  entity_id uuid,
  entity_name text, -- Human readable name/number
  details jsonb, -- Additional details
  created_at timestamptz DEFAULT now()
);

-- Create login_history table for tracking logins
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  login_at timestamptz DEFAULT now(),
  logout_at timestamptz,
  ip_address text,
  user_agent text
);

-- Create sales_rep_stats table for tracking sales totals
CREATE TABLE IF NOT EXISTS public.sales_rep_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  period_date date NOT NULL, -- Date for daily tracking
  invoices_created integer DEFAULT 0,
  orders_created integer DEFAULT 0,
  receipts_created integer DEFAULT 0,
  total_sales numeric DEFAULT 0,
  total_collections numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id, period_date)
);

-- Enable RLS on new tables
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_rep_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "Users can view own activity" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own activity" ON public.activity_logs
  FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));

-- RLS policies for login_history
CREATE POLICY "Users can view own login history" ON public.login_history
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own login history" ON public.login_history
  FOR INSERT WITH CHECK (user_id = auth.uid() OR company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can update own login history" ON public.login_history
  FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for sales_rep_stats
CREATE POLICY "Company scoped select for sales_rep_stats" ON public.sales_rep_stats
  FOR SELECT USING (user_id = auth.uid() OR (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Company scoped insert for sales_rep_stats" ON public.sales_rep_stats
  FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped update for sales_rep_stats" ON public.sales_rep_stats
  FOR UPDATE USING (company_id = get_user_company(auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON public.activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_stats_user_period ON public.sales_rep_stats(user_id, period_date);

-- Add is_sales_rep flag to profiles for easy identification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_sales_rep boolean DEFAULT false;

-- Function to authenticate by username
CREATE OR REPLACE FUNCTION public.get_user_by_username(p_username text)
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE p.username = p_username
  AND p.active = true
  LIMIT 1;
$$;