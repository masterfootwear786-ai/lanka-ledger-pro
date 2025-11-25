-- Drop existing triggers that work on invoice posting
DROP TRIGGER IF EXISTS reduce_stock_on_invoice_post ON invoices;
DROP TRIGGER IF EXISTS restore_stock_on_invoice_delete ON invoices;

-- Create function to reduce stock when invoice is created
CREATE OR REPLACE FUNCTION reduce_stock_on_invoice_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Reduce stock for each size in invoice lines
  UPDATE stock_by_size sbs
  SET quantity = quantity - size_qty.qty,
      updated_at = now()
  FROM (
    SELECT 
      il.item_id,
      size_num,
      SUM(size_qty) as qty
    FROM invoice_lines il
    CROSS JOIN LATERAL (
      VALUES 
        ('39', il.size_39),
        ('40', il.size_40),
        ('41', il.size_41),
        ('42', il.size_42),
        ('43', il.size_43),
        ('44', il.size_44),
        ('45', il.size_45)
    ) AS sizes(size_num, size_qty)
    INNER JOIN items i ON i.id = il.item_id
    WHERE il.invoice_id = NEW.id
      AND i.track_inventory = true
      AND size_qty > 0
    GROUP BY il.item_id, size_num
  ) size_qty
  WHERE sbs.item_id = size_qty.item_id
    AND sbs.size = size_qty.size_num;
  
  RETURN NEW;
END;
$$;

-- Create function to restore stock when invoice is deleted
CREATE OR REPLACE FUNCTION restore_stock_on_invoice_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Restore stock for each size in invoice lines
  UPDATE stock_by_size sbs
  SET quantity = quantity + size_qty.qty,
      updated_at = now()
  FROM (
    SELECT 
      il.item_id,
      size_num,
      SUM(size_qty) as qty
    FROM invoice_lines il
    CROSS JOIN LATERAL (
      VALUES 
        ('39', il.size_39),
        ('40', il.size_40),
        ('41', il.size_41),
        ('42', il.size_42),
        ('43', il.size_43),
        ('44', il.size_44),
        ('45', il.size_45)
    ) AS sizes(size_num, size_qty)
    INNER JOIN items i ON i.id = il.item_id
    WHERE il.invoice_id = OLD.id
      AND i.track_inventory = true
      AND size_qty > 0
    GROUP BY il.item_id, size_num
  ) size_qty
  WHERE sbs.item_id = size_qty.item_id
    AND sbs.size = size_qty.size_num;
  
  RETURN OLD;
END;
$$;

-- Create function to handle stock adjustment when invoice lines are updated
CREATE OR REPLACE FUNCTION adjust_stock_on_invoice_line_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if item tracks inventory
  IF EXISTS (SELECT 1 FROM items WHERE id = NEW.item_id AND track_inventory = true) THEN
    
    IF TG_OP = 'UPDATE' THEN
      -- Restore old quantities
      UPDATE stock_by_size
      SET quantity = quantity + COALESCE(OLD.size_39, 0),
          updated_at = now()
      WHERE item_id = OLD.item_id AND size = '39';
      
      UPDATE stock_by_size
      SET quantity = quantity + COALESCE(OLD.size_40, 0),
          updated_at = now()
      WHERE item_id = OLD.item_id AND size = '40';
      
      UPDATE stock_by_size
      SET quantity = quantity + COALESCE(OLD.size_41, 0),
          updated_at = now()
      WHERE item_id = OLD.item_id AND size = '41';
      
      UPDATE stock_by_size
      SET quantity = quantity + COALESCE(OLD.size_42, 0),
          updated_at = now()
      WHERE item_id = OLD.item_id AND size = '42';
      
      UPDATE stock_by_size
      SET quantity = quantity + COALESCE(OLD.size_43, 0),
          updated_at = now()
      WHERE item_id = OLD.item_id AND size = '43';
      
      UPDATE stock_by_size
      SET quantity = quantity + COALESCE(OLD.size_44, 0),
          updated_at = now()
      WHERE item_id = OLD.item_id AND size = '44';
      
      UPDATE stock_by_size
      SET quantity = quantity + COALESCE(OLD.size_45, 0),
          updated_at = now()
      WHERE item_id = OLD.item_id AND size = '45';
    END IF;
    
    -- Deduct new quantities
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      UPDATE stock_by_size
      SET quantity = quantity - COALESCE(NEW.size_39, 0),
          updated_at = now()
      WHERE item_id = NEW.item_id AND size = '39';
      
      UPDATE stock_by_size
      SET quantity = quantity - COALESCE(NEW.size_40, 0),
          updated_at = now()
      WHERE item_id = NEW.item_id AND size = '40';
      
      UPDATE stock_by_size
      SET quantity = quantity - COALESCE(NEW.size_41, 0),
          updated_at = now()
      WHERE item_id = NEW.item_id AND size = '41';
      
      UPDATE stock_by_size
      SET quantity = quantity - COALESCE(NEW.size_42, 0),
          updated_at = now()
      WHERE item_id = NEW.item_id AND size = '42';
      
      UPDATE stock_by_size
      SET quantity = quantity - COALESCE(NEW.size_43, 0),
          updated_at = now()
      WHERE item_id = NEW.item_id AND size = '43';
      
      UPDATE stock_by_size
      SET quantity = quantity - COALESCE(NEW.size_44, 0),
          updated_at = now()
      WHERE item_id = NEW.item_id AND size = '44';
      
      UPDATE stock_by_size
      SET quantity = quantity - COALESCE(NEW.size_45, 0),
          updated_at = now()
      WHERE item_id = NEW.item_id AND size = '45';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to restore stock when invoice line is deleted
CREATE OR REPLACE FUNCTION restore_stock_on_invoice_line_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if item tracks inventory
  IF EXISTS (SELECT 1 FROM items WHERE id = OLD.item_id AND track_inventory = true) THEN
    -- Restore quantities for each size
    UPDATE stock_by_size
    SET quantity = quantity + COALESCE(OLD.size_39, 0),
        updated_at = now()
    WHERE item_id = OLD.item_id AND size = '39';
    
    UPDATE stock_by_size
    SET quantity = quantity + COALESCE(OLD.size_40, 0),
        updated_at = now()
    WHERE item_id = OLD.item_id AND size = '40';
    
    UPDATE stock_by_size
    SET quantity = quantity + COALESCE(OLD.size_41, 0),
        updated_at = now()
    WHERE item_id = OLD.item_id AND size = '41';
    
    UPDATE stock_by_size
    SET quantity = quantity + COALESCE(OLD.size_42, 0),
        updated_at = now()
    WHERE item_id = OLD.item_id AND size = '42';
    
    UPDATE stock_by_size
    SET quantity = quantity + COALESCE(OLD.size_43, 0),
        updated_at = now()
    WHERE item_id = OLD.item_id AND size = '43';
    
    UPDATE stock_by_size
    SET quantity = quantity + COALESCE(OLD.size_44, 0),
        updated_at = now()
    WHERE item_id = OLD.item_id AND size = '44';
    
    UPDATE stock_by_size
    SET quantity = quantity + COALESCE(OLD.size_45, 0),
        updated_at = now()
    WHERE item_id = OLD.item_id AND size = '45';
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create triggers on invoice_lines table for automatic stock management
CREATE TRIGGER adjust_stock_on_line_insert_or_update
AFTER INSERT OR UPDATE ON invoice_lines
FOR EACH ROW
EXECUTE FUNCTION adjust_stock_on_invoice_line_change();

CREATE TRIGGER restore_stock_on_line_delete
AFTER DELETE ON invoice_lines
FOR EACH ROW
EXECUTE FUNCTION restore_stock_on_invoice_line_delete();