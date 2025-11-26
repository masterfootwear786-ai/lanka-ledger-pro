-- Fix the company INSERT RLS policy to allow authenticated users to create companies
-- The current policy might be too restrictive

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create companies" ON companies;

-- Create a more explicit INSERT policy that checks authentication
CREATE POLICY "Users can create companies" 
ON companies 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Also ensure the SELECT policy allows users to see companies they create
-- even before their profile is updated with the company_id
DROP POLICY IF EXISTS "Users can view own company" ON companies;

CREATE POLICY "Users can view own company" 
ON companies 
FOR SELECT 
TO authenticated
USING (
  id = get_user_company(auth.uid()) 
  OR created_by = auth.uid()
);