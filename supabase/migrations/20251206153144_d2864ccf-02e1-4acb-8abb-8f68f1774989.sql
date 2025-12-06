-- Update the main trigger function to respect stock_type from invoice_lines
CREATE OR REPLACE FUNCTION public.adjust_stock_on_invoice_line_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_stock_type text;
  v_size text;
  v_qty numeric;
  v_old_qty numeric;
BEGIN
  -- Skip if no item_id
  IF NEW.item_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if item tracks inventory
  IF NOT EXISTS (SELECT 1 FROM items WHERE id = NEW.item_id AND track_inventory = true) THEN
    RETURN NEW;
  END IF;
  
  -- Get company_id from the item
  SELECT company_id INTO v_company_id FROM items WHERE id = NEW.item_id;
  
  -- Get stock_type from the invoice line (defaults to 'lorry' if not set)
  v_stock_type := COALESCE(NEW.stock_type, 'lorry');
  
  -- Process each size
  FOR v_size, v_qty, v_old_qty IN 
    SELECT size_num, new_qty, old_qty FROM (
      VALUES 
        ('39', COALESCE(NEW.size_39, 0), CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.size_39, 0) ELSE 0 END),
        ('40', COALESCE(NEW.size_40, 0), CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.size_40, 0) ELSE 0 END),
        ('41', COALESCE(NEW.size_41, 0), CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.size_41, 0) ELSE 0 END),
        ('42', COALESCE(NEW.size_42, 0), CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.size_42, 0) ELSE 0 END),
        ('43', COALESCE(NEW.size_43, 0), CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.size_43, 0) ELSE 0 END),
        ('44', COALESCE(NEW.size_44, 0), CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.size_44, 0) ELSE 0 END),
        ('45', COALESCE(NEW.size_45, 0), CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.size_45, 0) ELSE 0 END)
    ) AS sizes(size_num, new_qty, old_qty)
  LOOP
    -- Calculate the change (for insert: deduct new_qty, for update: deduct difference)
    IF TG_OP = 'INSERT' THEN
      IF v_qty > 0 THEN
        -- Try to update existing record for the SPECIFIC stock_type only
        UPDATE stock_by_size
        SET quantity = quantity - v_qty,
            updated_at = now()
        WHERE item_id = NEW.item_id 
          AND size = v_size 
          AND stock_type = v_stock_type;
        
        -- If no record exists, create one with negative quantity
        IF NOT FOUND THEN
          INSERT INTO stock_by_size (company_id, item_id, size, quantity, stock_type)
          VALUES (v_company_id, NEW.item_id, v_size, -v_qty, v_stock_type);
        END IF;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF v_qty != v_old_qty THEN
        -- Calculate difference and adjust for the SPECIFIC stock_type only
        UPDATE stock_by_size
        SET quantity = quantity + v_old_qty - v_qty,
            updated_at = now()
        WHERE item_id = NEW.item_id 
          AND size = v_size 
          AND stock_type = v_stock_type;
        
        -- If no record exists and there's a quantity, create one
        IF NOT FOUND AND v_qty > 0 THEN
          INSERT INTO stock_by_size (company_id, item_id, size, quantity, stock_type)
          VALUES (v_company_id, NEW.item_id, v_size, -v_qty, v_stock_type);
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Update the restore function to also respect stock_type
CREATE OR REPLACE FUNCTION public.restore_stock_on_invoice_line_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stock_type text;
  v_size text;
  v_qty numeric;
BEGIN
  -- Skip if no item_id
  IF OLD.item_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Check if item tracks inventory
  IF NOT EXISTS (SELECT 1 FROM items WHERE id = OLD.item_id AND track_inventory = true) THEN
    RETURN OLD;
  END IF;
  
  -- Get stock_type from the deleted invoice line
  v_stock_type := COALESCE(OLD.stock_type, 'lorry');
  
  -- Process each size
  FOR v_size, v_qty IN 
    SELECT size_num, qty FROM (
      VALUES 
        ('39', COALESCE(OLD.size_39, 0)),
        ('40', COALESCE(OLD.size_40, 0)),
        ('41', COALESCE(OLD.size_41, 0)),
        ('42', COALESCE(OLD.size_42, 0)),
        ('43', COALESCE(OLD.size_43, 0)),
        ('44', COALESCE(OLD.size_44, 0)),
        ('45', COALESCE(OLD.size_45, 0))
    ) AS sizes(size_num, qty)
  LOOP
    IF v_qty > 0 THEN
      -- Restore stock ONLY to the specific stock_type
      UPDATE stock_by_size
      SET quantity = quantity + v_qty,
          updated_at = now()
      WHERE item_id = OLD.item_id 
        AND size = v_size 
        AND stock_type = v_stock_type;
      
      -- If no record found, create one
      IF NOT FOUND THEN
        INSERT INTO stock_by_size (item_id, size, quantity, stock_type, company_id)
        SELECT OLD.item_id, v_size, v_qty, v_stock_type, i.company_id
        FROM items i WHERE i.id = OLD.item_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN OLD;
END;
$function$;