-- Reverse the previous migration - restore original triggers

-- Drop the newly created triggers
DROP TRIGGER IF EXISTS stock_adjust_on_invoice_line_change ON public.invoice_lines;
DROP TRIGGER IF EXISTS stock_restore_on_invoice_line_delete ON public.invoice_lines;

-- Restore triggers on invoices table
CREATE TRIGGER reduce_stock_by_size_on_invoice_post
AFTER UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.reduce_stock_by_size_on_invoice_post();

CREATE TRIGGER restore_stock_by_size_on_invoice_delete
BEFORE DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_by_size_on_invoice_delete();