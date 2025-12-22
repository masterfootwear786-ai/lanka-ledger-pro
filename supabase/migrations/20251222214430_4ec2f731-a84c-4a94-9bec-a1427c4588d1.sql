-- Drop existing policies on chat_messages
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;

-- Create policies that support BOTH 1-1 conversations AND group chats

-- SELECT policy: can view if in conversation OR in group
CREATE POLICY "chat_messages_select"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  -- Direct conversation
  (group_id IS NULL AND EXISTS (
    SELECT 1 FROM chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ))
  OR
  -- Group message
  (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

-- INSERT policy: can send if in conversation OR in group
CREATE POLICY "chat_messages_insert"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- Direct conversation
    (group_id IS NULL AND EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    ))
    OR
    -- Group message
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
  )
);

-- UPDATE policy: can update own messages in conversations or groups they belong to
CREATE POLICY "chat_messages_update"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  (group_id IS NULL AND EXISTS (
    SELECT 1 FROM chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ))
  OR
  (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

-- DELETE policy: can delete own messages
CREATE POLICY "chat_messages_delete"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());