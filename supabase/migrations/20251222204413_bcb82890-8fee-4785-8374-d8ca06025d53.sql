-- Drop the existing check constraint and add a new one that includes 'deleted'
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'file', 'call_started', 'call_ended', 'deleted'));