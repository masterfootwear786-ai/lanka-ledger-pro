-- Add stock_type column to stock_by_size table
ALTER TABLE public.stock_by_size ADD COLUMN IF NOT EXISTS stock_type text NOT NULL DEFAULT 'main';

-- Create index for faster queries by stock type
CREATE INDEX IF NOT EXISTS idx_stock_by_size_stock_type ON public.stock_by_size(stock_type);

-- Add stock_type to invoices table to track which stock was used
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stock_type text DEFAULT 'main';

-- Add stock_type to invoice_lines table for line-level tracking
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS stock_type text DEFAULT 'main';

-- Update the stock adjustment trigger to consider stock_type
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
      SET quantity = quantity - diff
      WHERE item_id = v_item_id 
        AND size = s 
        AND stock_type = v_stock_type;
      
      -- If no row was updated, insert a new one with negative quantity
      IF NOT FOUND THEN
        INSERT INTO public.stock_by_size (item_id, size, quantity, stock_type, company_id)
        SELECT v_item_id, s, -diff, v_stock_type, i.company_id
        FROM public.items i WHERE i.id = v_item_id;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update restore stock trigger to consider stock_type
CREATE OR REPLACE FUNCTION restore_stock_on_line_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_item_id uuid;
  v_stock_type text;
  sizes integer[] := ARRAY[39, 40, 41, 42, 43, 44, 45];
  s integer;
  qty numeric;
BEGIN
  v_item_id := OLD.item_id;
  v_stock_type := COALESCE(OLD.stock_type, 'main');
  
  IF v_item_id IS NULL THEN
    RETURN OLD;
  END IF;

  FOREACH s IN ARRAY sizes LOOP
    EXECUTE format('SELECT COALESCE($1.size_%s, 0)', s) INTO qty USING OLD;
    
    IF qty > 0 THEN
      -- Restore stock to the specific stock_type
      UPDATE public.stock_by_size
      SET quantity = quantity + qty
      WHERE item_id = v_item_id 
        AND size = s 
        AND stock_type = v_stock_type;
      
      IF NOT FOUND THEN
        INSERT INTO public.stock_by_size (item_id, size, quantity, stock_type, company_id)
        SELECT v_item_id, s, qty, v_stock_type, i.company_id
        FROM public.items i WHERE i.id = v_item_id;
      END IF;
    END IF;
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;