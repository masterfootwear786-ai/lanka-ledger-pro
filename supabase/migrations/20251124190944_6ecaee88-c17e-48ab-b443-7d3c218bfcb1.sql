-- Create colors table for predefined color options
CREATE TABLE public.colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  hex_code text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Enable RLS
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company scoped select" ON public.colors
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped insert" ON public.colors
  FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped update" ON public.colors
  FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.colors
  FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- Insert some default colors
INSERT INTO public.colors (company_id, name, hex_code)
SELECT c.id, 'Black', '#000000' FROM companies c
UNION ALL
SELECT c.id, 'White', '#FFFFFF' FROM companies c
UNION ALL
SELECT c.id, 'Brown', '#8B4513' FROM companies c
UNION ALL
SELECT c.id, 'Tan', '#D2B48C' FROM companies c
UNION ALL
SELECT c.id, 'Navy', '#000080' FROM companies c
UNION ALL
SELECT c.id, 'Red', '#FF0000' FROM companies c
UNION ALL
SELECT c.id, 'Blue', '#0000FF' FROM companies c;