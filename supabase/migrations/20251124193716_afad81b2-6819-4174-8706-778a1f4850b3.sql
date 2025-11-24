-- Update items delete policy to allow all authenticated users (not just admins)
DROP POLICY IF EXISTS "Company scoped delete" ON public.items;

CREATE POLICY "Company scoped delete" ON public.items
FOR DELETE
USING (company_id = get_user_company(auth.uid()));
