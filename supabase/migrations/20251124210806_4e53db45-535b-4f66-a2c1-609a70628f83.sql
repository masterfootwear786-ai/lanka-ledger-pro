-- Add size columns to invoice_lines
ALTER TABLE invoice_lines
ADD COLUMN IF NOT EXISTS size_39 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_40 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_41 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_42 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_43 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_44 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_45 numeric DEFAULT 0;

-- Add size columns to sales_order_lines
ALTER TABLE sales_order_lines
ADD COLUMN IF NOT EXISTS size_39 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_40 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_41 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_42 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_43 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_44 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS size_45 numeric DEFAULT 0;

-- Create stock_by_size table for tracking stock at size level
CREATE TABLE IF NOT EXISTS stock_by_size (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  size text NOT NULL CHECK (size IN ('39', '40', '41', '42', '43', '44', '45')),
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(item_id, size)
);

-- Enable RLS on stock_by_size
ALTER TABLE stock_by_size ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_by_size
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_by_size' AND policyname = 'Company scoped select'
  ) THEN
    CREATE POLICY "Company scoped select" ON stock_by_size
      FOR SELECT USING (company_id = get_user_company(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_by_size' AND policyname = 'Company scoped insert'
  ) THEN
    CREATE POLICY "Company scoped insert" ON stock_by_size
      FOR INSERT WITH CHECK (company_id = get_user_company(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_by_size' AND policyname = 'Company scoped update'
  ) THEN
    CREATE POLICY "Company scoped update" ON stock_by_size
      FOR UPDATE USING (company_id = get_user_company(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_by_size' AND policyname = 'Company scoped delete'
  ) THEN
    CREATE POLICY "Company scoped delete" ON stock_by_size
      FOR DELETE USING (company_id = get_user_company(auth.uid()));
  END IF;
END $$;

-- Drop old invoice stock triggers and functions with CASCADE
DROP TRIGGER IF EXISTS trigger_reduce_stock_on_invoice_post ON invoices CASCADE;
DROP TRIGGER IF EXISTS reduce_stock_on_invoice_post ON invoices CASCADE;
DROP TRIGGER IF EXISTS restore_stock_on_invoice_delete ON invoices CASCADE;
DROP FUNCTION IF EXISTS reduce_stock_on_invoice_post() CASCADE;
DROP FUNCTION IF EXISTS restore_stock_on_invoice_delete() CASCADE;

-- Create function to reduce stock by size when invoice is posted
CREATE OR REPLACE FUNCTION reduce_stock_by_size_on_invoice_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process if invoice is being posted (posted changes from false/null to true)
  IF (NEW.posted = true AND (OLD.posted IS NULL OR OLD.posted = false)) THEN
    -- Reduce stock for each size in invoice lines
    UPDATE stock_by_size sbs
    SET quantity = quantity - size_qty.qty,
        updated_at = now()
    FROM (
      SELECT 
        il.item_id,
        size_num,
        SUM(size_qty) as qty
      FROM invoice_lines il
      CROSS JOIN LATERAL (
        VALUES 
          ('39', il.size_39),
          ('40', il.size_40),
          ('41', il.size_41),
          ('42', il.size_42),
          ('43', il.size_43),
          ('44', il.size_44),
          ('45', il.size_45)
      ) AS sizes(size_num, size_qty)
      INNER JOIN items i ON i.id = il.item_id
      WHERE il.invoice_id = NEW.id
        AND i.track_inventory = true
        AND size_qty > 0
      GROUP BY il.item_id, size_num
    ) size_qty
    WHERE sbs.item_id = size_qty.item_id
      AND sbs.size = size_qty.size_num;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to restore stock by size when posted invoice is deleted
CREATE OR REPLACE FUNCTION restore_stock_by_size_on_invoice_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only restore if invoice was posted
  IF OLD.posted = true THEN
    -- Restore stock for each size in invoice lines
    UPDATE stock_by_size sbs
    SET quantity = quantity + size_qty.qty,
        updated_at = now()
    FROM (
      SELECT 
        il.item_id,
        size_num,
        SUM(size_qty) as qty
      FROM invoice_lines il
      CROSS JOIN LATERAL (
        VALUES 
          ('39', il.size_39),
          ('40', il.size_40),
          ('41', il.size_41),
          ('42', il.size_42),
          ('43', il.size_43),
          ('44', il.size_44),
          ('45', il.size_45)
      ) AS sizes(size_num, size_qty)
      INNER JOIN items i ON i.id = il.item_id
      WHERE il.invoice_id = OLD.id
        AND i.track_inventory = true
        AND size_qty > 0
      GROUP BY il.item_id, size_num
    ) size_qty
    WHERE sbs.item_id = size_qty.item_id
      AND sbs.size = size_qty.size_num;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create triggers
CREATE TRIGGER reduce_stock_by_size_on_invoice_post
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION reduce_stock_by_size_on_invoice_post();

CREATE TRIGGER restore_stock_by_size_on_invoice_delete
  BEFORE DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_by_size_on_invoice_delete();