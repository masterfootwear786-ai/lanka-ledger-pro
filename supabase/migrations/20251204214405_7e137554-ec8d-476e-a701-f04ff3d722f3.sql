-- Drop the existing check constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Add updated check constraint with all allowed categories
ALTER TABLE public.transactions ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type IN (
  'expense', 'cash_in', 'cash_out', 'withdrawal', 'credit', 'debit',
  'COGS', 'Salary', 'Rent', 'Fuel', 'Food', 'Accommodation', 
  'Utilities', 'Transport', 'Office Supplies', 'Marketing', 
  'Maintenance', 'Insurance', 'Professional Fees', 'Other'
));