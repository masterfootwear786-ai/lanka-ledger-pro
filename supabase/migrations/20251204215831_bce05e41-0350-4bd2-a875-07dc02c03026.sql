-- Create turns table for vehicle trip tracking
CREATE TABLE public.turns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  turn_no TEXT NOT NULL,
  turn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_number TEXT NOT NULL,
  route TEXT NOT NULL,
  expenses NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Company scoped select" ON public.turns
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped insert" ON public.turns
  FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped update" ON public.turns
  FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.turns
  FOR DELETE USING (company_id = get_user_company(auth.uid()));