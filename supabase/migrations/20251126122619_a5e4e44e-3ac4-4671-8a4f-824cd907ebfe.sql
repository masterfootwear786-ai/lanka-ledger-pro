-- Add password protection settings to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS password_protection_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS protect_invoice_delete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS protect_order_delete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS protect_customer_delete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS protect_bill_delete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS protect_supplier_delete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS protect_item_delete boolean DEFAULT false;