-- Drop existing select policy and create a new one that handles pending users (null company_id)
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;

-- Create new select policy that allows admins to view:
-- 1. Their own profile
-- 2. Profiles in their company
-- 3. Pending profiles (null company_id) for assignment
CREATE POLICY "Admins can view profiles"
ON public.profiles
FOR SELECT
USING (
  (id = auth.uid()) 
  OR (has_role(auth.uid(), 'admin'::app_role) AND company_id = get_user_company(auth.uid()))
  OR (has_role(auth.uid(), 'admin'::app_role) AND company_id IS NULL)
);