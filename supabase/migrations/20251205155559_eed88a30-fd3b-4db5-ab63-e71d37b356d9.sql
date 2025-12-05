-- Add driver and sales_reps to turns table
ALTER TABLE public.turns 
ADD COLUMN IF NOT EXISTS driver text,
ADD COLUMN IF NOT EXISTS sales_reps text[];

-- Add start_km and end_km to turn_daily_expenses table
ALTER TABLE public.turn_daily_expenses 
ADD COLUMN IF NOT EXISTS start_km numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_km numeric DEFAULT 0;