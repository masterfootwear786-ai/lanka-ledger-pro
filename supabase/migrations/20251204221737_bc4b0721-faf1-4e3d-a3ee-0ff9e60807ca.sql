-- Add km column for fuel tracking in turns table
ALTER TABLE public.turns ADD COLUMN IF NOT EXISTS km numeric DEFAULT 0;