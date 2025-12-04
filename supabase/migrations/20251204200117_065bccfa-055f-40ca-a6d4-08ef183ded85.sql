-- Create return_notes table
CREATE TABLE public.return_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  customer_id UUID NOT NULL REFERENCES public.contacts(id),
  return_note_no TEXT NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_id UUID REFERENCES public.invoices(id),
  reason TEXT,
  currency_code TEXT DEFAULT 'LKR',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status document_status DEFAULT 'draft',
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Create return_note_lines table
CREATE TABLE public.return_note_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_note_id UUID NOT NULL REFERENCES public.return_notes(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  item_id UUID REFERENCES public.items(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  size_39 NUMERIC DEFAULT 0,
  size_40 NUMERIC DEFAULT 0,
  size_41 NUMERIC DEFAULT 0,
  size_42 NUMERIC DEFAULT 0,
  size_43 NUMERIC DEFAULT 0,
  size_44 NUMERIC DEFAULT 0,
  size_45 NUMERIC DEFAULT 0,
  tax_code TEXT,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.return_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_note_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for return_notes
CREATE POLICY "Company scoped select" ON public.return_notes
  FOR SELECT USING ((company_id = get_user_company(auth.uid())) AND (deleted_at IS NULL));

CREATE POLICY "Admins can view deleted items" ON public.return_notes
  FOR SELECT USING ((company_id = get_user_company(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role) AND (deleted_at IS NOT NULL));

CREATE POLICY "Company scoped insert" ON public.return_notes
  FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped update" ON public.return_notes
  FOR UPDATE USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.return_notes
  FOR DELETE USING (company_id = get_user_company(auth.uid()));

-- RLS policies for return_note_lines
CREATE POLICY "Return note lines select" ON public.return_note_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM return_notes WHERE return_notes.id = return_note_lines.return_note_id 
    AND return_notes.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Return note lines insert" ON public.return_note_lines
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM return_notes WHERE return_notes.id = return_note_lines.return_note_id 
    AND return_notes.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Return note lines update" ON public.return_note_lines
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM return_notes WHERE return_notes.id = return_note_lines.return_note_id 
    AND return_notes.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Return note lines delete" ON public.return_note_lines
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM return_notes WHERE return_notes.id = return_note_lines.return_note_id 
    AND return_notes.company_id = get_user_company(auth.uid())
  ));