-- Add unique constraint for upsert to work on user_permissions
ALTER TABLE public.user_permissions 
ADD CONSTRAINT user_permissions_user_company_module_unique 
UNIQUE (user_id, company_id, module);