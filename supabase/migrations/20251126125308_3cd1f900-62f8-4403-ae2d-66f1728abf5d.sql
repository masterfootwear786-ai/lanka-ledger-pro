-- Add foreign key constraint for deleted_by in tax_rates
ALTER TABLE public.tax_rates 
ADD CONSTRAINT tax_rates_deleted_by_fkey 
FOREIGN KEY (deleted_by) REFERENCES auth.users(id);

-- Add foreign key constraint for created_by in tax_rates if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tax_rates_created_by_fkey'
  ) THEN
    ALTER TABLE public.tax_rates 
    ADD CONSTRAINT tax_rates_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
END $$;