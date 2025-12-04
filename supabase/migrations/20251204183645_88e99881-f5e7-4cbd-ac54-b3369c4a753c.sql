
-- Drop ALL duplicate triggers on invoice_lines
DROP TRIGGER IF EXISTS adjust_stock_on_line_insert_or_update ON public.invoice_lines;
DROP TRIGGER IF EXISTS trigger_adjust_stock_on_invoice_line_change ON public.invoice_lines;
DROP TRIGGER IF EXISTS adjust_stock_on_invoice_line_insert_or_update ON public.invoice_lines;
DROP TRIGGER IF EXISTS trg_invoice_line_insert_stock ON public.invoice_lines;
DROP TRIGGER IF EXISTS trg_invoice_line_update_stock ON public.invoice_lines;

DROP TRIGGER IF EXISTS restore_stock_on_line_delete ON public.invoice_lines;
DROP TRIGGER IF EXISTS trigger_restore_stock_on_invoice_line_delete ON public.invoice_lines;
DROP TRIGGER IF EXISTS restore_stock_on_invoice_line_delete ON public.invoice_lines;
DROP TRIGGER IF EXISTS trg_invoice_line_delete_stock ON public.invoice_lines;

-- Drop conflicting triggers on invoices table (we manage stock at line level)
DROP TRIGGER IF EXISTS reduce_stock_by_size_on_invoice_post ON public.invoices;
DROP TRIGGER IF EXISTS restore_stock_by_size_on_invoice_delete ON public.invoices;

-- Create SINGLE trigger for INSERT/UPDATE on invoice_lines
CREATE TRIGGER stock_adjust_on_invoice_line_change
AFTER INSERT OR UPDATE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.adjust_stock_on_invoice_line_change();

-- Create SINGLE trigger for DELETE on invoice_lines
CREATE TRIGGER stock_restore_on_invoice_line_delete
AFTER DELETE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_invoice_line_delete();
