-- Fix RLS policy for user_permissions to allow admin insert/update
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_permissions;

CREATE POLICY "Admins can manage permissions" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
    AND user_roles.company_id = user_permissions.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
    AND user_roles.company_id = user_permissions.company_id
  )
);