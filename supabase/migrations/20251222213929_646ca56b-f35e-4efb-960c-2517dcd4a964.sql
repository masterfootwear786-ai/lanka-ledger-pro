-- Drop all existing policies on chat_group_members
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON chat_group_members;
DROP POLICY IF EXISTS "Users can join groups in their company" ON chat_group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON chat_group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON chat_group_members;

-- Create a security definer function to check group membership without recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chat_group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Create a security definer function to check if user is group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chat_group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND role = 'admin'
  )
$$;

-- Create a security definer function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = _user_id
$$;

-- Create non-recursive policies for chat_group_members
CREATE POLICY "Users can view group members"
ON chat_group_members FOR SELECT
USING (
  public.is_group_member(auth.uid(), group_id)
  OR user_id = auth.uid()
);

CREATE POLICY "Users can insert group members"
ON chat_group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_groups 
    WHERE id = group_id 
    AND company_id = public.get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Users can delete own membership"
ON chat_group_members FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete group members"
ON chat_group_members FOR DELETE
USING (public.is_group_admin(auth.uid(), group_id));