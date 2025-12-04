
-- Create trigger for INSERT on invoice_lines to deduct stock
CREATE TRIGGER trg_invoice_line_insert_stock
AFTER INSERT ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.adjust_stock_on_invoice_line_change();

-- Create trigger for UPDATE on invoice_lines to adjust stock
CREATE TRIGGER trg_invoice_line_update_stock
AFTER UPDATE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.adjust_stock_on_invoice_line_change();

-- Create trigger for DELETE on invoice_lines to restore stock
CREATE TRIGGER trg_invoice_line_delete_stock
AFTER DELETE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_invoice_line_delete();
