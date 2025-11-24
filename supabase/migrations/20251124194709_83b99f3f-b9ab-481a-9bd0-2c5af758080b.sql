-- Create function to reduce stock when invoice is posted
CREATE OR REPLACE FUNCTION reduce_stock_on_invoice_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if invoice is being posted (posted changes from false/null to true)
  IF (NEW.posted = true AND (OLD.posted IS NULL OR OLD.posted = false)) THEN
    -- Reduce stock for all invoice lines with items that track inventory
    UPDATE items
    SET stock_quantity = stock_quantity - il.quantity
    FROM invoice_lines il
    WHERE items.id = il.item_id
      AND il.invoice_id = NEW.id
      AND items.track_inventory = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoices table
DROP TRIGGER IF EXISTS trigger_reduce_stock_on_invoice_post ON invoices;
CREATE TRIGGER trigger_reduce_stock_on_invoice_post
AFTER UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION reduce_stock_on_invoice_post();

-- Create function to restore stock when invoice is deleted
CREATE OR REPLACE FUNCTION restore_stock_on_invoice_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only restore if invoice was posted
  IF OLD.posted = true THEN
    -- Restore stock for all invoice lines with items that track inventory
    UPDATE items
    SET stock_quantity = stock_quantity + il.quantity
    FROM invoice_lines il
    WHERE items.id = il.item_id
      AND il.invoice_id = OLD.id
      AND items.track_inventory = true;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice deletion
DROP TRIGGER IF EXISTS trigger_restore_stock_on_invoice_delete ON invoices;
CREATE TRIGGER trigger_restore_stock_on_invoice_delete
BEFORE DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION restore_stock_on_invoice_delete();
