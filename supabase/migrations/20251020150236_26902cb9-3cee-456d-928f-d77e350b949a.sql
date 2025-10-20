-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'accountant', 'clerk');
CREATE TYPE public.account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
CREATE TYPE public.document_status AS ENUM ('draft', 'approved', 'paid', 'void', 'cancelled');
CREATE TYPE public.contact_type AS ENUM ('customer', 'supplier', 'both');
CREATE TYPE public.movement_type AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE public.ref_type AS ENUM ('grn', 'delivery', 'adjustment', 'invoice', 'bill', 'return');
CREATE TYPE public.custom_field_type AS ENUM ('text', 'number', 'date', 'boolean');
CREATE TYPE public.recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_number TEXT,
  logo_url TEXT,
  base_currency TEXT DEFAULT 'LKR',
  fiscal_year_end TEXT DEFAULT '12-31',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id, role)
);

-- Chart of Accounts
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type account_type NOT NULL,
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, code)
);

-- Contacts (Customers & Suppliers)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_type contact_type NOT NULL DEFAULT 'customer',
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  credit_limit DECIMAL(15,2),
  payment_terms INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, code)
);

-- Tax Rates
CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_inclusive BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, code)
);

-- Currencies
CREATE TABLE public.currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FX Rates (daily exchange rates)
CREATE TABLE public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  currency_code TEXT NOT NULL,
  rate DECIMAL(15,6) NOT NULL,
  rate_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, currency_code, rate_date)
);

-- Items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  uom TEXT DEFAULT 'EA',
  sale_price DECIMAL(15,2) DEFAULT 0,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  avg_cost DECIMAL(15,2) DEFAULT 0,
  tax_code TEXT,
  track_inventory BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, code)
);

-- Stock Locations
CREATE TABLE public.stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, code)
);

-- Stock Movements
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE CASCADE NOT NULL,
  movement_type movement_type NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  ref_type ref_type,
  ref_id UUID,
  unit_cost DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Invoices (Sales)
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  invoice_no TEXT NOT NULL,
  customer_id UUID REFERENCES public.contacts(id) ON DELETE RESTRICT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency_code TEXT DEFAULT 'LKR',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  status document_status DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_total DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, invoice_no)
);

-- Invoice Lines
CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  line_no INTEGER NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_code TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_inclusive BOOLEAN DEFAULT false,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit Notes
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  credit_note_no TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.contacts(id) ON DELETE RESTRICT NOT NULL,
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency_code TEXT DEFAULT 'LKR',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  status document_status DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_total DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) DEFAULT 0,
  reason TEXT,
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, credit_note_no)
);

-- Credit Note Lines
CREATE TABLE public.credit_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID REFERENCES public.credit_notes(id) ON DELETE CASCADE NOT NULL,
  line_no INTEGER NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_code TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Receipts (Customer Payments)
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  receipt_no TEXT NOT NULL,
  customer_id UUID REFERENCES public.contacts(id) ON DELETE RESTRICT NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency_code TEXT DEFAULT 'LKR',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  amount DECIMAL(15,2) NOT NULL,
  bank_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  reference TEXT,
  notes TEXT,
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, receipt_no)
);

-- Receipt Allocations
CREATE TABLE public.receipt_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bills (Supplier Invoices)
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bill_no TEXT NOT NULL,
  supplier_id UUID REFERENCES public.contacts(id) ON DELETE RESTRICT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency_code TEXT DEFAULT 'LKR',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  status document_status DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_total DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) DEFAULT 0,
  supplier_ref TEXT,
  notes TEXT,
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, bill_no)
);

-- Bill Lines
CREATE TABLE public.bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  line_no INTEGER NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_code TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_inclusive BOOLEAN DEFAULT false,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Debit Notes
CREATE TABLE public.debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  debit_note_no TEXT NOT NULL,
  bill_id UUID REFERENCES public.bills(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES public.contacts(id) ON DELETE RESTRICT NOT NULL,
  debit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency_code TEXT DEFAULT 'LKR',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  status document_status DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_total DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) DEFAULT 0,
  reason TEXT,
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, debit_note_no)
);

-- Bill Payments
CREATE TABLE public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  payment_no TEXT NOT NULL,
  supplier_id UUID REFERENCES public.contacts(id) ON DELETE RESTRICT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency_code TEXT DEFAULT 'LKR',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  amount DECIMAL(15,2) NOT NULL,
  bank_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  reference TEXT,
  notes TEXT,
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, payment_no)
);

-- Payment Allocations
CREATE TABLE public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.bill_payments(id) ON DELETE CASCADE NOT NULL,
  bill_id UUID REFERENCES public.bills(id) ON DELETE RESTRICT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Journals
CREATE TABLE public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  journal_no TEXT NOT NULL,
  journal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  ref_type TEXT,
  ref_id UUID,
  status document_status DEFAULT 'draft',
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, journal_no)
);

-- Journal Lines
CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES public.journals(id) ON DELETE CASCADE NOT NULL,
  line_no INTEGER NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT NOT NULL,
  description TEXT,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  tax_code TEXT,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bank Statements
CREATE TABLE public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bank_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE NOT NULL,
  statement_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  external_ref TEXT,
  reconciled BOOLEAN DEFAULT false,
  reconciled_journal_id UUID REFERENCES public.journals(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Period Locks
CREATE TABLE public.period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  UNIQUE(company_id, period_year, period_month)
);

-- Recurring Templates
CREATE TABLE public.recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  template_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  frequency recurrence_frequency NOT NULL,
  next_run_date DATE NOT NULL,
  occurrences_left INTEGER,
  template_data JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Custom Field Definitions
CREATE TABLE public.custom_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  entity TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type custom_field_type NOT NULL,
  required BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entity, field_key)
);

-- Custom Field Values
CREATE TABLE public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_key TEXT NOT NULL,
  value_text TEXT,
  value_number DECIMAL(15,2),
  value_date DATE,
  value_boolean BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entity, entity_id, field_key)
);

-- Create indexes
CREATE INDEX idx_profiles_company ON public.profiles(company_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_company ON public.user_roles(company_id);
CREATE INDEX idx_coa_company ON public.chart_of_accounts(company_id);
CREATE INDEX idx_coa_code ON public.chart_of_accounts(code);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_contacts_code ON public.contacts(code);
CREATE INDEX idx_items_company ON public.items(company_id);
CREATE INDEX idx_items_code ON public.items(code);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_bills_company ON public.bills(company_id);
CREATE INDEX idx_bills_supplier ON public.bills(supplier_id);
CREATE INDEX idx_bills_date ON public.bills(bill_date);
CREATE INDEX idx_journals_company ON public.journals(company_id);
CREATE INDEX idx_journals_date ON public.journals(journal_date);
CREATE INDEX idx_stock_movements_item ON public.stock_movements(item_id);
CREATE INDEX idx_stock_movements_location ON public.stock_movements(location_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Company-scoped)
-- Companies: Users can only see their own company
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can update own company" ON public.companies
  FOR UPDATE USING (
    id = public.get_user_company(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- User roles: Users can view roles in their company
CREATE POLICY "Users can view roles in company" ON public.user_roles
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    company_id = public.get_user_company(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- Company-scoped policies for all other tables
CREATE POLICY "Company scoped select" ON public.chart_of_accounts
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped insert" ON public.chart_of_accounts
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped update" ON public.chart_of_accounts
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped delete" ON public.chart_of_accounts
  FOR DELETE USING (
    company_id = public.get_user_company(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- Repeat similar policies for other tables
CREATE POLICY "Company scoped select" ON public.contacts
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.contacts
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.contacts
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped delete" ON public.contacts
  FOR DELETE USING (company_id = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Company scoped select" ON public.tax_rates
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.tax_rates
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.tax_rates
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Public currencies" ON public.currencies FOR SELECT USING (true);

CREATE POLICY "Company scoped select" ON public.fx_rates
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.fx_rates
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped select" ON public.items
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.items
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.items
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped select" ON public.stock_locations
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.stock_locations
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped select" ON public.stock_movements
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.stock_movements
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped select" ON public.invoices
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.invoices
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.invoices
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Invoice lines select" ON public.invoice_lines
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_lines.invoice_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Invoice lines insert" ON public.invoice_lines
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_lines.invoice_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Invoice lines update" ON public.invoice_lines
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_lines.invoice_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Invoice lines delete" ON public.invoice_lines
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_lines.invoice_id AND company_id = public.get_user_company(auth.uid())));

CREATE POLICY "Company scoped select" ON public.credit_notes
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.credit_notes
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Credit note lines select" ON public.credit_note_lines
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.credit_notes WHERE id = credit_note_lines.credit_note_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Credit note lines insert" ON public.credit_note_lines
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.credit_notes WHERE id = credit_note_lines.credit_note_id AND company_id = public.get_user_company(auth.uid())));

CREATE POLICY "Company scoped select" ON public.receipts
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.receipts
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Receipt allocations select" ON public.receipt_allocations
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.receipts WHERE id = receipt_allocations.receipt_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Receipt allocations insert" ON public.receipt_allocations
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.receipts WHERE id = receipt_allocations.receipt_id AND company_id = public.get_user_company(auth.uid())));

CREATE POLICY "Company scoped select" ON public.bills
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.bills
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.bills
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Bill lines select" ON public.bill_lines
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.bills WHERE id = bill_lines.bill_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Bill lines insert" ON public.bill_lines
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.bills WHERE id = bill_lines.bill_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Bill lines update" ON public.bill_lines
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.bills WHERE id = bill_lines.bill_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Bill lines delete" ON public.bill_lines
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.bills WHERE id = bill_lines.bill_id AND company_id = public.get_user_company(auth.uid())));

CREATE POLICY "Company scoped select" ON public.debit_notes
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.debit_notes
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped select" ON public.bill_payments
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.bill_payments
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Payment allocations select" ON public.payment_allocations
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.bill_payments WHERE id = payment_allocations.payment_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Payment allocations insert" ON public.payment_allocations
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.bill_payments WHERE id = payment_allocations.payment_id AND company_id = public.get_user_company(auth.uid())));

CREATE POLICY "Company scoped select" ON public.journals
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.journals
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.journals
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Journal lines select" ON public.journal_lines
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.journals WHERE id = journal_lines.journal_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Journal lines insert" ON public.journal_lines
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.journals WHERE id = journal_lines.journal_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Journal lines update" ON public.journal_lines
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.journals WHERE id = journal_lines.journal_id AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "Journal lines delete" ON public.journal_lines
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.journals WHERE id = journal_lines.journal_id AND company_id = public.get_user_company(auth.uid())));

CREATE POLICY "Company scoped select" ON public.bank_statements
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.bank_statements
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped select" ON public.period_locks
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Admins manage locks" ON public.period_locks
  FOR ALL USING (company_id = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Company scoped select" ON public.recurring_templates
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.recurring_templates
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.recurring_templates
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped select" ON public.custom_field_defs
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.custom_field_defs
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company scoped select" ON public.custom_field_values
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped insert" ON public.custom_field_values
  FOR INSERT WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Company scoped update" ON public.custom_field_values
  FOR UPDATE USING (company_id = public.get_user_company(auth.uid()));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed data
INSERT INTO public.currencies (code, name, symbol) VALUES
  ('LKR', 'Sri Lankan Rupee', 'Rs'),
  ('USD', 'US Dollar', '$'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'British Pound', '£'),
  ('INR', 'Indian Rupee', '₹');

-- Demo company
INSERT INTO public.companies (id, name, code, base_currency, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company Ltd', 'DEMO', 'LKR', true);

-- Basic Chart of Accounts for demo company
INSERT INTO public.chart_of_accounts (company_id, code, name, account_type, active) VALUES
  ('00000000-0000-0000-0000-000000000001', '1000', 'Cash', 'asset', true),
  ('00000000-0000-0000-0000-000000000001', '1100', 'Bank - Current Account', 'asset', true),
  ('00000000-0000-0000-0000-000000000001', '1200', 'Accounts Receivable', 'asset', true),
  ('00000000-0000-0000-0000-000000000001', '1300', 'Inventory', 'asset', true),
  ('00000000-0000-0000-0000-000000000001', '2000', 'Accounts Payable', 'liability', true),
  ('00000000-0000-0000-0000-000000000001', '2100', 'VAT Payable', 'liability', true),
  ('00000000-0000-0000-0000-000000000001', '3000', 'Owner Equity', 'equity', true),
  ('00000000-0000-0000-0000-000000000001', '4000', 'Sales Revenue', 'income', true),
  ('00000000-0000-0000-0000-000000000001', '5000', 'Cost of Goods Sold', 'expense', true),
  ('00000000-0000-0000-0000-000000000001', '5100', 'Operating Expenses', 'expense', true);

-- Demo tax rates
INSERT INTO public.tax_rates (company_id, code, name, rate_percent, is_inclusive, active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'VAT15', 'VAT 15%', 15.00, false, true),
  ('00000000-0000-0000-0000-000000000001', 'NBT2', 'NBT 2%', 2.00, false, true),
  ('00000000-0000-0000-0000-000000000001', 'ZERO', 'Zero Rated', 0.00, false, true);

-- Demo customer
INSERT INTO public.contacts (company_id, code, name, contact_type, email, phone, active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'CUST001', 'Sample Customer Inc', 'customer', 'customer@example.com', '+94771234567', true);

-- Demo supplier
INSERT INTO public.contacts (company_id, code, name, contact_type, email, phone, active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'SUP001', 'Sample Supplier Ltd', 'supplier', 'supplier@example.com', '+94771234568', true);

-- Demo item
INSERT INTO public.items (company_id, code, name, description, uom, sale_price, purchase_price, tax_code, active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ITEM001', 'Sample Product', 'A sample product for testing', 'EA', 1000.00, 750.00, 'VAT15', true);

-- Demo stock location
INSERT INTO public.stock_locations (company_id, code, name, active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'MAIN', 'Main Warehouse', true);