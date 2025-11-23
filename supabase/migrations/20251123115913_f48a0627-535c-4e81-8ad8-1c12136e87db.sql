-- Update contacts table RLS policy to allow company users to delete
DROP POLICY IF EXISTS "Company scoped delete" ON public.contacts;

CREATE POLICY "Company scoped delete" 
ON public.contacts 
FOR DELETE 
USING (company_id = get_user_company(auth.uid()));