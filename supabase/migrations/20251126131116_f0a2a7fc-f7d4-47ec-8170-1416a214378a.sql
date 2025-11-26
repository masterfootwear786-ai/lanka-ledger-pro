-- Ensure admins can see deleted items in trash
-- Drop existing policy if it exists and recreate it
DROP POLICY IF EXISTS "Admins can view deleted items" ON items;

-- Create policy to allow admins to view deleted items
CREATE POLICY "Admins can view deleted items" 
ON items 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role) 
  AND deleted_at IS NOT NULL
);

-- Also ensure the regular select policy doesn't conflict
DROP POLICY IF EXISTS "Company scoped select" ON items;

CREATE POLICY "Company scoped select" 
ON items 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) 
  AND deleted_at IS NULL
);