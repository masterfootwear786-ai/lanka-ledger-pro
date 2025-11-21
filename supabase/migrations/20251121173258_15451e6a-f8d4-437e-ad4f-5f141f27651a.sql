-- Add action_password column to companies table for securing edit/delete actions
ALTER TABLE public.companies 
ADD COLUMN action_password TEXT;