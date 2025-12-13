-- Fix the handle_new_user trigger to properly create profiles bypassing RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;