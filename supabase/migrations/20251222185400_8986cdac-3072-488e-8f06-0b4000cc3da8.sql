-- Drop existing user_permissions table and recreate with more granular modules
DROP TABLE IF EXISTS public.user_permissions;

-- Create new user_permissions table with granular module/sub-module support
CREATE TABLE public.user_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    sub_module TEXT,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, module, sub_module)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions"
ON public.user_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_module ON public.user_permissions(module, sub_module);