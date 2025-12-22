-- Make conversation_id nullable to support group messages
ALTER TABLE public.chat_messages
ALTER COLUMN conversation_id DROP NOT NULL;

-- Update the RLS policies to handle nullable conversation_id
DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;

-- Recreate policies handling nullable conversation_id properly
CREATE POLICY "chat_messages_select"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  -- Direct conversation (conversation_id is set)
  (conversation_id IS NOT NULL AND group_id IS NULL AND EXISTS (
    SELECT 1 FROM chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ))
  OR
  -- Group message (group_id is set)
  (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "chat_messages_insert"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- Direct conversation
    (conversation_id IS NOT NULL AND group_id IS NULL AND EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    ))
    OR
    -- Group message
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
  )
);

CREATE POLICY "chat_messages_update"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  (conversation_id IS NOT NULL AND group_id IS NULL AND EXISTS (
    SELECT 1 FROM chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ))
  OR
  (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);