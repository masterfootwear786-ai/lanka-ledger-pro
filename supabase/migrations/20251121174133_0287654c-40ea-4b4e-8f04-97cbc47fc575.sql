-- Add soft delete column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX idx_invoices_deleted_at ON public.invoices(deleted_at);

-- Add soft delete columns to invoice_lines as well
ALTER TABLE public.invoice_lines 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;