-- Fix security warnings by setting search_path on functions
CREATE OR REPLACE FUNCTION reduce_stock_on_invoice_post()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION restore_stock_on_invoice_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
