-- Add credit_balance column to contacts table
ALTER TABLE public.contacts
ADD COLUMN credit_balance numeric DEFAULT 0;