-- Drop existing constraint and add new one with 'voice' type
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check 
  CHECK (message_type IN ('text', 'image', 'file', 'call_started', 'call_ended', 'deleted', 'voice'));

-- Add duration column for voice messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS duration_seconds integer;