-- Remove ALL policies on chat_group_members to eliminate any remaining recursive policy
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_group_members'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_group_members', pol.policyname);
  END LOOP;
END $$;

-- Recreate non-recursive policies using SECURITY DEFINER helpers
CREATE POLICY "chat_group_members_select"
ON public.chat_group_members
FOR SELECT
TO authenticated
USING (
  public.is_group_member(auth.uid(), group_id)
  OR user_id = auth.uid()
);

CREATE POLICY "chat_group_members_insert"
ON public.chat_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_groups g
    WHERE g.id = chat_group_members.group_id
      AND g.company_id = public.get_user_company_id(auth.uid())
  )
);

CREATE POLICY "chat_group_members_delete_self"
ON public.chat_group_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "chat_group_members_delete_admin"
ON public.chat_group_members
FOR DELETE
TO authenticated
USING (public.is_group_admin(auth.uid(), group_id));