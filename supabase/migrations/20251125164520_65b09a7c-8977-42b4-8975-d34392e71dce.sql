-- Add contact_id to transactions table to track creditors and debtors
ALTER TABLE transactions
ADD COLUMN contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_transactions_contact_id ON transactions(contact_id);