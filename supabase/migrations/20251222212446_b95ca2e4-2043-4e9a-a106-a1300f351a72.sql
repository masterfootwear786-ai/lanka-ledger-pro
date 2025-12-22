-- Create chat_groups table
CREATE TABLE public.chat_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_group_members table
CREATE TABLE public.chat_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Add group_id to chat_messages table
ALTER TABLE public.chat_messages ADD COLUMN group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_groups
CREATE POLICY "Users can view groups they belong to"
ON public.chat_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE chat_group_members.group_id = chat_groups.id
    AND chat_group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users in same company can create groups"
ON public.chat_groups FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.company_id = chat_groups.company_id
  )
);

CREATE POLICY "Group admins can update their groups"
ON public.chat_groups FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE chat_group_members.group_id = chat_groups.id
    AND chat_group_members.user_id = auth.uid()
    AND chat_group_members.role = 'admin'
  )
);

CREATE POLICY "Group admins can delete their groups"
ON public.chat_groups FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE chat_group_members.group_id = chat_groups.id
    AND chat_group_members.user_id = auth.uid()
    AND chat_group_members.role = 'admin'
  )
);

-- RLS policies for chat_group_members
CREATE POLICY "Users can view members of their groups"
ON public.chat_group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members AS my_membership
    WHERE my_membership.group_id = chat_group_members.group_id
    AND my_membership.user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can add members"
ON public.chat_group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_group_members AS admin_check
    WHERE admin_check.group_id = chat_group_members.group_id
    AND admin_check.user_id = auth.uid()
    AND admin_check.role = 'admin'
  ) OR (
    -- Allow creators to add themselves as first member
    chat_group_members.user_id = auth.uid()
    AND chat_group_members.role = 'admin'
  )
);

CREATE POLICY "Group admins can remove members"
ON public.chat_group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members AS admin_check
    WHERE admin_check.group_id = chat_group_members.group_id
    AND admin_check.user_id = auth.uid()
    AND admin_check.role = 'admin'
  ) OR chat_group_members.user_id = auth.uid()
);

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;

-- Create indexes for performance
CREATE INDEX idx_chat_group_members_group_id ON public.chat_group_members(group_id);
CREATE INDEX idx_chat_group_members_user_id ON public.chat_group_members(user_id);
CREATE INDEX idx_chat_messages_group_id ON public.chat_messages(group_id);