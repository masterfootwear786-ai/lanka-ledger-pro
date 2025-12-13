-- Allow users to (re)create their own profile row when logging in
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());