-- Drop and recreate the function to handle missing stock records
CREATE OR REPLACE FUNCTION public.adjust_stock_on_invoice_line_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
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
        -- Try to update existing record
        UPDATE stock_by_size
        SET quantity = quantity - v_qty,
            updated_at = now()
        WHERE item_id = NEW.item_id AND size = v_size;
        
        -- If no record exists, create one with negative quantity
        IF NOT FOUND THEN
          INSERT INTO stock_by_size (company_id, item_id, size, quantity)
          VALUES (v_company_id, NEW.item_id, v_size, -v_qty);
        END IF;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF v_qty != v_old_qty THEN
        -- Calculate difference and adjust
        UPDATE stock_by_size
        SET quantity = quantity + v_old_qty - v_qty,
            updated_at = now()
        WHERE item_id = NEW.item_id AND size = v_size;
        
        -- If no record exists and there's a quantity, create one
        IF NOT FOUND AND v_qty > 0 THEN
          INSERT INTO stock_by_size (company_id, item_id, size, quantity)
          VALUES (v_company_id, NEW.item_id, v_size, -v_qty);
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;