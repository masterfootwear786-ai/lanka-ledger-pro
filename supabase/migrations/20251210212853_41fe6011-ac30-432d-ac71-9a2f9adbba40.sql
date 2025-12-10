-- Add delete policy for profiles table to allow admins to delete pending users
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (
    company_id = get_user_company(auth.uid()) 
    OR company_id IS NULL
  )
);