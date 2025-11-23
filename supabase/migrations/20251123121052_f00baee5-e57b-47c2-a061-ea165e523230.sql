-- Create order_templates table
CREATE TABLE public.order_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  template_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.contacts(id),
  notes TEXT,
  terms TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, template_name)
);

-- Create order_template_lines table
CREATE TABLE public.order_template_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.order_templates(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  art_no TEXT,
  description TEXT,
  color TEXT,
  size_39 NUMERIC DEFAULT 0,
  size_40 NUMERIC DEFAULT 0,
  size_41 NUMERIC DEFAULT 0,
  size_42 NUMERIC DEFAULT 0,
  size_43 NUMERIC DEFAULT 0,
  size_44 NUMERIC DEFAULT 0,
  size_45 NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_template_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_templates
CREATE POLICY "Company scoped select" 
ON public.order_templates 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped insert" 
ON public.order_templates 
FOR INSERT 
WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped update" 
ON public.order_templates 
FOR UPDATE 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" 
ON public.order_templates 
FOR DELETE 
USING (company_id = get_user_company(auth.uid()));

-- RLS policies for order_template_lines
CREATE POLICY "Template lines select" 
ON public.order_template_lines 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM order_templates 
  WHERE order_templates.id = order_template_lines.template_id 
  AND order_templates.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Template lines insert" 
ON public.order_template_lines 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM order_templates 
  WHERE order_templates.id = order_template_lines.template_id 
  AND order_templates.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Template lines update" 
ON public.order_template_lines 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM order_templates 
  WHERE order_templates.id = order_template_lines.template_id 
  AND order_templates.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Template lines delete" 
ON public.order_template_lines 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM order_templates 
  WHERE order_templates.id = order_template_lines.template_id 
  AND order_templates.company_id = get_user_company(auth.uid())
));

-- Create indexes
CREATE INDEX idx_order_templates_company ON public.order_templates(company_id);
CREATE INDEX idx_order_templates_customer ON public.order_templates(customer_id);
CREATE INDEX idx_order_template_lines_template ON public.order_template_lines(template_id);