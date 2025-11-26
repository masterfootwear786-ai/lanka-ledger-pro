-- Add INSERT policy for companies table to allow admins to create companies
CREATE POLICY "Admins can create companies" ON public.companies
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add DELETE policy for companies in case needed
CREATE POLICY "Admins can delete companies" ON public.companies
FOR DELETE 
USING (id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'admin'));