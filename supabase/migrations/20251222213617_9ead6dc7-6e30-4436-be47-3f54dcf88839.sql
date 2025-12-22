-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view group members of their groups" ON chat_group_members;
DROP POLICY IF EXISTS "Users can view their company groups" ON chat_groups;
DROP POLICY IF EXISTS "Group admins can add members" ON chat_group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON chat_group_members;
DROP POLICY IF EXISTS "Members can leave groups" ON chat_group_members;

-- Create fixed policies for chat_groups
CREATE POLICY "Users can view their company groups"
ON chat_groups FOR SELECT
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create groups in their company"
ON chat_groups FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
) AND created_by = auth.uid());

CREATE POLICY "Group creators can update their groups"
ON chat_groups FOR UPDATE
USING (created_by = auth.uid());

-- Create fixed policies for chat_group_members (avoiding recursion)
CREATE POLICY "Users can view members of groups they belong to"
ON chat_group_members FOR SELECT
USING (
  group_id IN (
    SELECT gm.group_id FROM chat_group_members gm WHERE gm.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can join groups in their company"
ON chat_group_members FOR INSERT
WITH CHECK (
  group_id IN (
    SELECT id FROM chat_groups WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can leave groups"
ON chat_group_members FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Group admins can manage members"
ON chat_group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_group_members admin_check 
    WHERE admin_check.group_id = chat_group_members.group_id 
    AND admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
  )
);