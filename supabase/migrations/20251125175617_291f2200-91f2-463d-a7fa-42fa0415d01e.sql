-- Add delete policy for bills table
CREATE POLICY "Company scoped delete" ON public.bills
FOR DELETE 
USING (company_id = get_user_company(auth.uid()));

-- Update bill_lines foreign key to cascade delete
ALTER TABLE public.bill_lines
DROP CONSTRAINT IF EXISTS bill_lines_bill_id_fkey;

ALTER TABLE public.bill_lines
ADD CONSTRAINT bill_lines_bill_id_fkey 
FOREIGN KEY (bill_id) 
REFERENCES public.bills(id) 
ON DELETE CASCADE;