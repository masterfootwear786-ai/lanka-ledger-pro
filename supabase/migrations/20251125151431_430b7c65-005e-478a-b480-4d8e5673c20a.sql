-- Enable cascade deletion for chart_of_accounts references
-- This allows accounts to be deleted even when they're used in transactions

-- Update foreign keys to cascade on delete for bill_payments
ALTER TABLE bill_payments 
DROP CONSTRAINT IF EXISTS bill_payments_bank_account_id_fkey,
ADD CONSTRAINT bill_payments_bank_account_id_fkey 
  FOREIGN KEY (bank_account_id) 
  REFERENCES chart_of_accounts(id) 
  ON DELETE SET NULL;

-- Update foreign keys to cascade on delete for receipts
ALTER TABLE receipts 
DROP CONSTRAINT IF EXISTS receipts_bank_account_id_fkey,
ADD CONSTRAINT receipts_bank_account_id_fkey 
  FOREIGN KEY (bank_account_id) 
  REFERENCES chart_of_accounts(id) 
  ON DELETE SET NULL;

-- Update foreign keys to cascade on delete for bank_statements
ALTER TABLE bank_statements 
DROP CONSTRAINT IF EXISTS bank_statements_bank_account_id_fkey,
ADD CONSTRAINT bank_statements_bank_account_id_fkey 
  FOREIGN KEY (bank_account_id) 
  REFERENCES chart_of_accounts(id) 
  ON DELETE CASCADE;

-- Update foreign keys to cascade on delete for journal_lines
ALTER TABLE journal_lines 
DROP CONSTRAINT IF EXISTS journal_lines_account_id_fkey,
ADD CONSTRAINT journal_lines_account_id_fkey 
  FOREIGN KEY (account_id) 
  REFERENCES chart_of_accounts(id) 
  ON DELETE CASCADE;

-- Update foreign keys to cascade on delete for bill_lines
ALTER TABLE bill_lines 
DROP CONSTRAINT IF EXISTS bill_lines_account_id_fkey,
ADD CONSTRAINT bill_lines_account_id_fkey 
  FOREIGN KEY (account_id) 
  REFERENCES chart_of_accounts(id) 
  ON DELETE SET NULL;

-- Update foreign keys to cascade on delete for invoice_lines
ALTER TABLE invoice_lines 
DROP CONSTRAINT IF EXISTS invoice_lines_account_id_fkey,
ADD CONSTRAINT invoice_lines_account_id_fkey 
  FOREIGN KEY (account_id) 
  REFERENCES chart_of_accounts(id) 
  ON DELETE SET NULL;

-- Update foreign keys to cascade on delete for sales_order_lines
ALTER TABLE sales_order_lines 
DROP CONSTRAINT IF EXISTS sales_order_lines_account_id_fkey,
ADD CONSTRAINT sales_order_lines_account_id_fkey 
  FOREIGN KEY (account_id) 
  REFERENCES chart_of_accounts(id) 
  ON DELETE SET NULL;