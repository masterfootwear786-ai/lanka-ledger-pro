
-- Update trigger to only deduct from selected stock type (lorry or store), not from main
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
  v_stock_type := COALESCE(NEW.stock_type, 'lorry');
  
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
      -- Update stock_by_size ONLY for the specific stock_type (lorry or store)
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
      
      -- REMOVED: No longer deduct from 'main' stock
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Update restore trigger to only restore to selected stock type, not main
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
  v_stock_type := COALESCE(OLD.stock_type, 'lorry');
  
  -- Check if item tracks inventory
  IF EXISTS (SELECT 1 FROM items WHERE id = OLD.item_id AND track_inventory = true) THEN
    FOREACH s IN ARRAY sizes LOOP
      EXECUTE format('SELECT COALESCE($1.size_%s, 0)', s) INTO qty USING OLD;
      
      IF qty > 0 THEN
        -- Restore ONLY to specific stock type (lorry or store)
        UPDATE stock_by_size
        SET quantity = quantity + qty, updated_at = now()
        WHERE item_id = OLD.item_id AND size = s::text AND stock_type = v_stock_type;
        
        -- If no row found, create one
        IF NOT FOUND THEN
          INSERT INTO stock_by_size (item_id, size, quantity, stock_type, company_id)
          SELECT OLD.item_id, s::text, qty, v_stock_type, i.company_id
          FROM items i WHERE i.id = OLD.item_id;
        END IF;
        
        -- REMOVED: No longer restore to 'main' stock
      END IF;
    END LOOP;
  END IF;
  
  RETURN OLD;
END;
$function$;
