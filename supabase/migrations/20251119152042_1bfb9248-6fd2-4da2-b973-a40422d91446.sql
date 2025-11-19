-- Add district and area columns to contacts table for location-based organization
ALTER TABLE public.contacts 
ADD COLUMN district TEXT,
ADD COLUMN area TEXT;

-- Create index for better query performance on district and area
CREATE INDEX idx_contacts_district ON public.contacts(district);
CREATE INDEX idx_contacts_area ON public.contacts(area);