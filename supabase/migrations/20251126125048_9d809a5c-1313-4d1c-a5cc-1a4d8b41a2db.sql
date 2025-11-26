-- Add deleted_by column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS deleted_by uuid;