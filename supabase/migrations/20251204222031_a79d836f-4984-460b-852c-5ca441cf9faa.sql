-- Add start and end date columns for multi-day turns
ALTER TABLE public.turns ADD COLUMN IF NOT EXISTS turn_start_date date;
ALTER TABLE public.turns ADD COLUMN IF NOT EXISTS turn_end_date date;

-- Copy existing turn_date to turn_start_date for existing records
UPDATE public.turns SET turn_start_date = turn_date WHERE turn_start_date IS NULL;