-- Per-user message deletions ("Delete for me")
CREATE TABLE IF NOT EXISTS public.chat_message_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

ALTER TABLE public.chat_message_deletions ENABLE ROW LEVEL SECURITY;

-- Recreate policies (Postgres doesn't support CREATE POLICY IF NOT EXISTS in all versions)
DROP POLICY IF EXISTS "Users can view their own message deletions" ON public.chat_message_deletions;
DROP POLICY IF EXISTS "Users can create their own message deletions" ON public.chat_message_deletions;
DROP POLICY IF EXISTS "Users can delete their own message deletions" ON public.chat_message_deletions;

CREATE POLICY "Users can view their own message deletions"
ON public.chat_message_deletions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own message deletions"
ON public.chat_message_deletions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message deletions"
ON public.chat_message_deletions
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_deletions_user_id ON public.chat_message_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_deletions_message_id ON public.chat_message_deletions(message_id);
