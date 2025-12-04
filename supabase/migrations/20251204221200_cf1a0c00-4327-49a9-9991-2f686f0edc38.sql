-- Add expense category columns to turns table
ALTER TABLE turns ADD COLUMN IF NOT EXISTS expense_fuel numeric DEFAULT 0;
ALTER TABLE turns ADD COLUMN IF NOT EXISTS expense_food numeric DEFAULT 0;
ALTER TABLE turns ADD COLUMN IF NOT EXISTS expense_accommodation numeric DEFAULT 0;
ALTER TABLE turns ADD COLUMN IF NOT EXISTS expense_other numeric DEFAULT 0;

-- Update existing records: move current expenses to expense_other
UPDATE turns SET expense_other = expenses WHERE expenses > 0;

-- Update the trigger function to use sum of all expense categories
CREATE OR REPLACE FUNCTION create_expense_from_turn()
RETURNS TRIGGER AS $$
DECLARE
  new_txn_no TEXT;
  txn_count INTEGER;
  total_expenses numeric;
BEGIN
  -- Calculate total expenses from all categories
  total_expenses := COALESCE(NEW.expense_fuel, 0) + COALESCE(NEW.expense_food, 0) + 
                    COALESCE(NEW.expense_accommodation, 0) + COALESCE(NEW.expense_other, 0);
  
  -- Only create expense if total > 0
  IF total_expenses > 0 THEN
    -- Generate transaction number
    SELECT COUNT(*) + 1 INTO txn_count
    FROM transactions
    WHERE company_id = NEW.company_id;
    
    new_txn_no := 'TXN-' || LPAD(txn_count::TEXT, 4, '0');
    
    -- Insert expense transaction
    INSERT INTO transactions (
      company_id,
      transaction_no,
      transaction_date,
      transaction_type,
      amount,
      description,
      reference,
      created_by
    ) VALUES (
      NEW.company_id,
      new_txn_no,
      NEW.turn_date,
      'expense',
      total_expenses,
      'Turn ' || NEW.turn_no || ' - ' || NEW.vehicle_number || ' (' || COALESCE(NEW.route, 'No route') || ')',
      NEW.id::TEXT,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the update trigger function
CREATE OR REPLACE FUNCTION update_expense_from_turn()
RETURNS TRIGGER AS $$
DECLARE
  total_expenses numeric;
BEGIN
  -- Calculate total expenses from all categories
  total_expenses := COALESCE(NEW.expense_fuel, 0) + COALESCE(NEW.expense_food, 0) + 
                    COALESCE(NEW.expense_accommodation, 0) + COALESCE(NEW.expense_other, 0);
  
  -- Update existing expense transaction
  UPDATE transactions
  SET 
    transaction_date = NEW.turn_date,
    amount = total_expenses,
    description = 'Turn ' || NEW.turn_no || ' - ' || NEW.vehicle_number || ' (' || COALESCE(NEW.route, 'No route') || ')'
  WHERE reference = OLD.id::TEXT
    AND company_id = NEW.company_id
    AND transaction_type = 'expense';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the expenses column to be computed (for backward compatibility)
-- We'll keep it and update it via trigger
CREATE OR REPLACE FUNCTION update_turn_total_expenses()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expenses := COALESCE(NEW.expense_fuel, 0) + COALESCE(NEW.expense_food, 0) + 
                  COALESCE(NEW.expense_accommodation, 0) + COALESCE(NEW.expense_other, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_turn_total ON turns;
CREATE TRIGGER auto_update_turn_total
  BEFORE INSERT OR UPDATE ON turns
  FOR EACH ROW
  EXECUTE FUNCTION update_turn_total_expenses();