-- Create sales_orders table
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  customer_id UUID NOT NULL REFERENCES public.contacts(id),
  order_no TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status TEXT DEFAULT 'draft',
  currency_code TEXT DEFAULT 'LKR',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  notes TEXT,
  terms TEXT,
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, order_no)
);

-- Create sales_order_lines table
CREATE TABLE public.sales_order_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  item_id UUID REFERENCES public.items(id),
  account_id UUID REFERENCES public.chart_of_accounts(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  tax_code TEXT,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  tax_inclusive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_orders
CREATE POLICY "Company scoped select" 
ON public.sales_orders 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped insert" 
ON public.sales_orders 
FOR INSERT 
WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped update" 
ON public.sales_orders 
FOR UPDATE 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" 
ON public.sales_orders 
FOR DELETE 
USING (company_id = get_user_company(auth.uid()));

-- RLS policies for sales_order_lines
CREATE POLICY "Order lines select" 
ON public.sales_order_lines 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM sales_orders 
  WHERE sales_orders.id = sales_order_lines.order_id 
  AND sales_orders.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Order lines insert" 
ON public.sales_order_lines 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM sales_orders 
  WHERE sales_orders.id = sales_order_lines.order_id 
  AND sales_orders.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Order lines update" 
ON public.sales_order_lines 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM sales_orders 
  WHERE sales_orders.id = sales_order_lines.order_id 
  AND sales_orders.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Order lines delete" 
ON public.sales_order_lines 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM sales_orders 
  WHERE sales_orders.id = sales_order_lines.order_id 
  AND sales_orders.company_id = get_user_company(auth.uid())
));

-- Create indexes for better performance
CREATE INDEX idx_sales_orders_company ON public.sales_orders(company_id);
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_date ON public.sales_orders(order_date);
CREATE INDEX idx_sales_order_lines_order ON public.sales_order_lines(order_id);