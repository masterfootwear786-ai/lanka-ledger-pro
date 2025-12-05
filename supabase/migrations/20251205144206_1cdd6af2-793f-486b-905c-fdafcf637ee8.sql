-- Fix mutable search_path in update_turn_total_expenses function
CREATE OR REPLACE FUNCTION public.update_turn_total_expenses()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.expenses := COALESCE(NEW.expense_fuel, 0) + COALESCE(NEW.expense_food, 0) + 
                  COALESCE(NEW.expense_accommodation, 0) + COALESCE(NEW.expense_other, 0);
  RETURN NEW;
END;
$function$;