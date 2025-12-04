-- Create table for daily expenses within a turn
CREATE TABLE public.turn_daily_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turn_id uuid NOT NULL REFERENCES public.turns(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  expense_date date NOT NULL,
  expense_fuel numeric DEFAULT 0,
  km numeric DEFAULT 0,
  expense_food numeric DEFAULT 0,
  expense_accommodation numeric DEFAULT 0,
  accommodation_city text,
  expense_other numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.turn_daily_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company scoped select" ON public.turn_daily_expenses FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.turn_daily_expenses FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.turn_daily_expenses FOR UPDATE USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Company scoped delete" ON public.turn_daily_expenses FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_turn_daily_expenses_turn_id ON public.turn_daily_expenses(turn_id);
CREATE INDEX idx_turn_daily_expenses_date ON public.turn_daily_expenses(expense_date);