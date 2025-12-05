-- Create routes table for managing trip routes
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Company scoped select" ON public.routes
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped insert" ON public.routes
  FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped update" ON public.routes
  FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.routes
  FOR DELETE USING (company_id = get_user_company(auth.uid()));