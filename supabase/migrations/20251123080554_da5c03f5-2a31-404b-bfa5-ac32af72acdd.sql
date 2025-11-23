-- Add DELETE policy for invoices table
CREATE POLICY "Company scoped delete"
ON public.invoices
FOR DELETE
USING (company_id = get_user_company(auth.uid()));