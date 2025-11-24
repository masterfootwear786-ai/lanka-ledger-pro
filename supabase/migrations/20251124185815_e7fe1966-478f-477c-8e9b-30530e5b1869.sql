-- Add WhatsApp number, owner name, and owner ID to contacts table
ALTER TABLE public.contacts
ADD COLUMN whatsapp text,
ADD COLUMN owner_name text,
ADD COLUMN owner_id text;