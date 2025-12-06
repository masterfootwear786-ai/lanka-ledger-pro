-- Update the stock adjustment trigger to also deduct from 'main' stock
-- when deducting from 'lorry' or 'store' stock types

CREATE OR REPLACE FUNCTION adjust_stock_on_line_insert_or_update()
RETURNS TRIGGER AS $$
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
      -- Update stock_by_size for the specific stock_type
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the restore stock function to also restore to 'main' stock
CREATE OR REPLACE FUNCTION restore_stock_on_invoice_line_delete()
RETURNS TRIGGER AS $$
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
        -- Restore to specific stock type
        UPDATE stock_by_size
        SET quantity = quantity + qty, updated_at = now()
        WHERE item_id = OLD.item_id AND size = s::text AND stock_type = v_stock_type;
        
        -- ALSO restore to 'main' stock if was lorry or store
        IF v_stock_type IN ('lorry', 'store') THEN
          UPDATE stock_by_size
          SET quantity = quantity + qty, updated_at = now()
          WHERE item_id = OLD.item_id AND size = s::text AND stock_type = 'main';
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;