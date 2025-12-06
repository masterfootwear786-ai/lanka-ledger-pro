-- Drop and recreate the admin update policy to ensure it works correctly
DROP POLICY IF EXISTS "Admins can update company profiles" ON public.profiles;

CREATE POLICY "Admins can update company profiles" 
ON public.profiles 
FOR UPDATE
USING (
  (id = auth.uid()) OR 
  (has_role(auth.uid(), 'admin'::app_role) AND company_id = get_user_company(auth.uid()))
)
WITH CHECK (
  (id = auth.uid()) OR 
  (has_role(auth.uid(), 'admin'::app_role) AND company_id = get_user_company(auth.uid()))
);