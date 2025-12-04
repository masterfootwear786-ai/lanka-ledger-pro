-- Drop the invoices table triggers (they cause issues)
DROP TRIGGER IF EXISTS reduce_stock_by_size_on_invoice_post ON public.invoices;
DROP TRIGGER IF EXISTS restore_stock_by_size_on_invoice_delete ON public.invoices;

-- Create the stock adjustment trigger for INSERT/UPDATE on invoice_lines
CREATE TRIGGER stock_adjust_on_invoice_line_change
AFTER INSERT OR UPDATE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.adjust_stock_on_invoice_line_change();

-- Create the stock restore trigger for DELETE on invoice_lines
CREATE TRIGGER stock_restore_on_invoice_line_delete
AFTER DELETE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_invoice_line_delete();