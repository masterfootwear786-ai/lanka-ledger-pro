-- Update all foreign key constraints to companies table to use CASCADE delete
-- This allows deleting a company and automatically deletes or nullifies related records

-- Drop and recreate foreign keys with CASCADE for tables that currently have NO ACTION
ALTER TABLE colors DROP CONSTRAINT IF EXISTS colors_company_id_fkey;
ALTER TABLE colors ADD CONSTRAINT colors_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE order_templates DROP CONSTRAINT IF EXISTS order_templates_company_id_fkey;
ALTER TABLE order_templates ADD CONSTRAINT order_templates_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_company_id_fkey;
ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE stock_by_size DROP CONSTRAINT IF EXISTS stock_by_size_company_id_fkey;
ALTER TABLE stock_by_size ADD CONSTRAINT stock_by_size_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- For profiles, we should set to NULL instead of CASCADE to preserve user accounts
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;