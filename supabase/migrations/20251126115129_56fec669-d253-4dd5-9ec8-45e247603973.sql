-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can create companies" ON public.companies;

-- Create a more permissive INSERT policy that allows:
-- 1. Users without a company to create their first one
-- 2. Admins to create additional companies
CREATE POLICY "Users can create companies" ON public.companies
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);