-- Create trigger function to auto-create expense transaction when a turn is created
CREATE OR REPLACE FUNCTION create_expense_from_turn()
RETURNS TRIGGER AS $$
DECLARE
  new_txn_no TEXT;
  txn_count INTEGER;
BEGIN
  -- Only create expense if expenses > 0
  IF NEW.expenses > 0 THEN
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
      NEW.expenses,
      'Turn ' || NEW.turn_no || ' - ' || NEW.vehicle_number || ' (' || COALESCE(NEW.route, 'No route') || ')',
      NEW.id::TEXT,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on turns table
DROP TRIGGER IF EXISTS auto_create_expense_from_turn ON turns;
CREATE TRIGGER auto_create_expense_from_turn
  AFTER INSERT ON turns
  FOR EACH ROW
  EXECUTE FUNCTION create_expense_from_turn();

-- Create trigger function to update expense when turn is updated
CREATE OR REPLACE FUNCTION update_expense_from_turn()
RETURNS TRIGGER AS $$
BEGIN
  -- Update existing expense transaction
  UPDATE transactions
  SET 
    transaction_date = NEW.turn_date,
    amount = NEW.expenses,
    description = 'Turn ' || NEW.turn_no || ' - ' || NEW.vehicle_number || ' (' || COALESCE(NEW.route, 'No route') || ')'
  WHERE reference = OLD.id::TEXT
    AND company_id = NEW.company_id
    AND transaction_type = 'expense';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create update trigger on turns table
DROP TRIGGER IF EXISTS auto_update_expense_from_turn ON turns;
CREATE TRIGGER auto_update_expense_from_turn
  AFTER UPDATE ON turns
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_from_turn();

-- Create trigger function to delete expense when turn is deleted
CREATE OR REPLACE FUNCTION delete_expense_from_turn()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete associated expense transaction
  DELETE FROM transactions
  WHERE reference = OLD.id::TEXT
    AND company_id = OLD.company_id
    AND transaction_type = 'expense';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create delete trigger on turns table
DROP TRIGGER IF EXISTS auto_delete_expense_from_turn ON turns;
CREATE TRIGGER auto_delete_expense_from_turn
  BEFORE DELETE ON turns
  FOR EACH ROW
  EXECUTE FUNCTION delete_expense_from_turn();