-- Add accommodation city column to turns table
ALTER TABLE public.turns ADD COLUMN IF NOT EXISTS accommodation_city text;