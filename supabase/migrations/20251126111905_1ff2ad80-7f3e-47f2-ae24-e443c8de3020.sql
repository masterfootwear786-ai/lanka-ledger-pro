-- Ensure user_roles table has proper RLS policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Allow users to view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT 
USING (user_id = auth.uid());

-- Allow admins to view all roles in their company
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_roles.user_id 
    AND profiles.company_id = get_user_company(auth.uid())
  )
);

-- Allow admins to insert roles for users in their company
CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_roles.user_id 
    AND profiles.company_id = get_user_company(auth.uid())
  )
);

-- Allow admins to update roles for users in their company
CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_roles.user_id 
    AND profiles.company_id = get_user_company(auth.uid())
  )
);

-- Allow admins to delete roles for users in their company
CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_roles.user_id 
    AND profiles.company_id = get_user_company(auth.uid())
  )
);

-- Update profiles table policies to allow admins to view all profiles in company
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;
CREATE POLICY "Admins can view company profiles" ON public.profiles
FOR SELECT 
USING (
  (id = auth.uid()) 
  OR (has_role(auth.uid(), 'admin') AND company_id = get_user_company(auth.uid()))
);

-- Allow admins to update profiles in their company
DROP POLICY IF EXISTS "Admins can update company profiles" ON public.profiles;
CREATE POLICY "Admins can update company profiles" ON public.profiles
FOR UPDATE 
USING (
  (id = auth.uid()) 
  OR (has_role(auth.uid(), 'admin') AND company_id = get_user_company(auth.uid()))
);