-- Remove duplicate triggers on invoice_lines table
-- Keep only one trigger for INSERT/UPDATE and one for DELETE

-- Drop the duplicate stock adjustment trigger
DROP TRIGGER IF EXISTS stock_adjust_on_invoice_line_change ON public.invoice_lines;

-- Drop the duplicate stock restore trigger  
DROP TRIGGER IF EXISTS stock_restore_on_invoice_line_delete ON public.invoice_lines;

-- Now only these triggers remain:
-- invoice_line_stock_adjust (for INSERT/UPDATE) -> adjust_stock_on_line_insert_or_update
-- invoice_line_stock_restore (for DELETE) -> restore_stock_on_invoice_line_delete