-- Create trigger for stock deduction when invoice lines are inserted or updated
CREATE TRIGGER adjust_stock_on_invoice_line_insert_or_update
AFTER INSERT OR UPDATE ON invoice_lines
FOR EACH ROW
EXECUTE FUNCTION adjust_stock_on_invoice_line_change();

-- Create trigger for stock restoration when invoice lines are deleted
CREATE TRIGGER restore_stock_on_invoice_line_delete
AFTER DELETE ON invoice_lines
FOR EACH ROW
EXECUTE FUNCTION restore_stock_on_invoice_line_delete();