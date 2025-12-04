-- Create triggers for automatic stock management on invoice line changes

-- Trigger for INSERT and UPDATE on invoice_lines
CREATE TRIGGER trigger_adjust_stock_on_invoice_line_change
AFTER INSERT OR UPDATE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.adjust_stock_on_invoice_line_change();

-- Trigger for DELETE on invoice_lines
CREATE TRIGGER trigger_restore_stock_on_invoice_line_delete
AFTER DELETE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_invoice_line_delete();