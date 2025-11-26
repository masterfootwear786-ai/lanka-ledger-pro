-- Add new roles to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'sales_rep';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'storekeeper';

-- Create permissions table for granular module-level access control
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('sales', 'purchasing', 'inventory', 'expenses', 'reports', 'settings')),
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, company_id, module)
);

-- Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_permissions
CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage permissions"
ON public.user_permissions
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  AND company_id = get_user_company(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND company_id = get_user_company(auth.uid())
);

-- Create helper function to check module permissions
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID, 
  _module TEXT, 
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT 
        CASE 
          WHEN _permission = 'view' THEN can_view
          WHEN _permission = 'create' THEN can_create
          WHEN _permission = 'edit' THEN can_edit
          WHEN _permission = 'delete' THEN can_delete
          ELSE false
        END
      FROM public.user_permissions
      WHERE user_id = _user_id AND module = _module
      LIMIT 1
    ),
    -- Admins have all permissions by default
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'admin'
    )
  )
$$;

-- Add comment to explain the permissions system
COMMENT ON TABLE public.user_permissions IS 'Granular module-level permissions for users. Permissions include view, create, edit, and delete for each module: sales, purchasing, inventory, expenses, reports, settings';