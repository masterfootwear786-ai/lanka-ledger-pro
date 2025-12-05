-- Add fuel_km column to track odometer reading at fuel fill-up
ALTER TABLE public.turn_daily_expenses 
ADD COLUMN IF NOT EXISTS fuel_km numeric DEFAULT 0;