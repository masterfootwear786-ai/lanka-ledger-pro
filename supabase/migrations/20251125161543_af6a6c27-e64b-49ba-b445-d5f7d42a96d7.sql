-- Create transactions table for recording various financial transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_no TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'cash_in', 'cash_out', 'withdrawal', 'credit', 'debit')),
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Company scoped select" ON public.transactions
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped insert" ON public.transactions
  FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped update" ON public.transactions
  FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.transactions
  FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Create index for better query performance
CREATE INDEX idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);