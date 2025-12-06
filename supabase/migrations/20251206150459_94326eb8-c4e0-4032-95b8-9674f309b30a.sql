-- Drop existing triggers first
DROP TRIGGER IF EXISTS invoice_line_stock_adjust ON invoice_lines;
DROP TRIGGER IF EXISTS invoice_line_stock_restore ON invoice_lines;

-- Update the adjust_stock_on_line_insert_or_update function to properly handle stock_type
CREATE OR REPLACE FUNCTION public.adjust_stock_on_line_insert_or_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item_id uuid;
  v_stock_type text;
  sizes integer[] := ARRAY[39, 40, 41, 42, 43, 44, 45];
  s integer;
  old_qty numeric;
  new_qty numeric;
  diff numeric;
BEGIN
  v_item_id := NEW.item_id;
  v_stock_type := COALESCE(NEW.stock_type, 'main');
  
  IF v_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH s IN ARRAY sizes LOOP
    -- Get old quantity (0 if INSERT)
    IF TG_OP = 'INSERT' THEN
      old_qty := 0;
    ELSE
      EXECUTE format('SELECT COALESCE($1.size_%s, 0)', s) INTO old_qty USING OLD;
    END IF;
    
    -- Get new quantity
    EXECUTE format('SELECT COALESCE($1.size_%s, 0)', s) INTO new_qty USING NEW;
    
    -- Calculate difference to deduct
    diff := new_qty - old_qty;
    
    IF diff != 0 THEN
      -- Update stock_by_size for the specific stock_type (lorry or store)
      UPDATE public.stock_by_size
      SET quantity = quantity - diff, updated_at = now()
      WHERE item_id = v_item_id 
        AND size = s::text 
        AND stock_type = v_stock_type;
      
      -- If no row was updated, insert a new one with negative quantity
      IF NOT FOUND THEN
        INSERT INTO public.stock_by_size (item_id, size, quantity, stock_type, company_id)
        SELECT v_item_id, s::text, -diff, v_stock_type, i.company_id
        FROM public.items i WHERE i.id = v_item_id;
      END IF;
      
      -- ALSO deduct from 'main' stock when deducting from lorry or store
      IF v_stock_type IN ('lorry', 'store') THEN
        UPDATE public.stock_by_size
        SET quantity = quantity - diff, updated_at = now()
        WHERE item_id = v_item_id 
          AND size = s::text 
          AND stock_type = 'main';
        
        -- If no main stock row exists, insert one with negative quantity
        IF NOT FOUND THEN
          INSERT INTO public.stock_by_size (item_id, size, quantity, stock_type, company_id)
          SELECT v_item_id, s::text, -diff, 'main', i.company_id
          FROM public.items i WHERE i.id = v_item_id;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Update the restore_stock_on_invoice_line_delete function to properly handle stock_type
CREATE OR REPLACE FUNCTION public.restore_stock_on_invoice_line_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stock_type text;
  sizes integer[] := ARRAY[39, 40, 41, 42, 43, 44, 45];
  s integer;
  qty numeric;
BEGIN
  v_stock_type := COALESCE(OLD.stock_type, 'main');
  
  -- Check if item tracks inventory
  IF EXISTS (SELECT 1 FROM items WHERE id = OLD.item_id AND track_inventory = true) THEN
    FOREACH s IN ARRAY sizes LOOP
      EXECUTE format('SELECT COALESCE($1.size_%s, 0)', s) INTO qty USING OLD;
      
      IF qty > 0 THEN
        -- Restore to specific stock type (lorry or store)
        UPDATE stock_by_size
        SET quantity = quantity + qty, updated_at = now()
        WHERE item_id = OLD.item_id AND size = s::text AND stock_type = v_stock_type;
        
        -- If no row found, create one
        IF NOT FOUND THEN
          INSERT INTO stock_by_size (item_id, size, quantity, stock_type, company_id)
          SELECT OLD.item_id, s::text, qty, v_stock_type, i.company_id
          FROM items i WHERE i.id = OLD.item_id;
        END IF;
        
        -- ALSO restore to 'main' stock if was lorry or store
        IF v_stock_type IN ('lorry', 'store') THEN
          UPDATE stock_by_size
          SET quantity = quantity + qty, updated_at = now()
          WHERE item_id = OLD.item_id AND size = s::text AND stock_type = 'main';
          
          -- If no main stock row exists, create one
          IF NOT FOUND THEN
            INSERT INTO stock_by_size (item_id, size, quantity, stock_type, company_id)
            SELECT OLD.item_id, s::text, qty, 'main', i.company_id
            FROM items i WHERE i.id = OLD.item_id;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Recreate triggers
CREATE TRIGGER invoice_line_stock_adjust
  AFTER INSERT OR UPDATE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION adjust_stock_on_line_insert_or_update();

CREATE TRIGGER invoice_line_stock_restore
  AFTER DELETE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_invoice_line_delete();