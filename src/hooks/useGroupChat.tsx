import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { useToast } from '@/hooks/use-toast';
import { audioNotifications } from '@/utils/audioNotifications';

export interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ChatGroup {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  members?: GroupMember[];
  last_message?: GroupMessage;
  unread_count?: number;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'deleted';
  content: string | null;
  image_url: string | null;
  duration_seconds: number | null;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export const useGroupChat = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!user || !profile?.company_id) return;

    try {
      // Get groups where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const groupIds = memberships.map(m => m.group_id);

      const { data: groupsData, error: groupsError } = await supabase
        .from('chat_groups')
        .select('*')
        .in('id', groupIds)
        .order('updated_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Enrich groups with members and last message
      const enrichedGroups: ChatGroup[] = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Get members
          const { data: members } = await supabase
            .from('chat_group_members')
            .select('*')
            .eq('group_id', group.id);

          // Get member profiles
          const memberIds = (members || []).map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', memberIds);

          const enrichedMembers: GroupMember[] = (members || []).map(m => ({
            ...m,
            role: m.role as 'admin' | 'member',
            profile: profiles?.find(p => p.id === m.user_id)
          }));

          // Get last message
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...group,
            members: enrichedMembers,
            last_message: lastMsg ? {
              ...lastMsg,
              group_id: lastMsg.group_id!,
              message_type: lastMsg.message_type as GroupMessage['message_type']
            } : undefined,
            unread_count: count || 0
          };
        })
      );

      setGroups(enrichedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.company_id]);

  // Fetch messages for active group
  const fetchGroupMessages = useCallback(async (groupId: string) => {
    if (!user) return;

    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      const enrichedMessages: GroupMessage[] = (messages || []).map(msg => ({
        ...msg,
        group_id: msg.group_id!,
        message_type: msg.message_type as GroupMessage['message_type'],
        sender: profiles?.find(p => p.id === msg.sender_id)
      }));

      setGroupMessages(enrichedMessages);

      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('group_id', groupId)
        .neq('sender_id', user.id)
        .is('read_at', null);

    } catch (error) {
      console.error('Error fetching group messages:', error);
    }
  }, [user]);

  // Send message to group
  const sendGroupMessage = useCallback(async (
    content: string,
    type: 'text' | 'image' | 'file' | 'voice' = 'text',
    fileUrl?: string,
    fileName?: string,
    durationSeconds?: number
  ) => {
    if (!user || !activeGroup) return;

    setSendingMessage(true);
    try {
      // For group messages, conversation_id is null (we made it nullable)
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: null,
          group_id: activeGroup.id,
          sender_id: user.id,
          message_type: type,
          content: type === 'text' ? content : (fileName || null),
          image_url: (type === 'image' || type === 'file' || type === 'voice') ? fileUrl : null,
          duration_seconds: type === 'voice' ? durationSeconds : null
        } as any);

      if (error) throw error;

      // Update group updated_at
      await supabase
        .from('chat_groups')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeGroup.id);

    } catch (error) {
      console.error('Error sending group message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  }, [user, activeGroup, toast]);

  // Create group
  const createGroup = useCallback(async (name: string, memberIds: string[], description?: string) => {
    if (!user || !profile?.company_id) return null;

    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          company_id: profile.company_id,
          name,
          description: description || null,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: adminError } = await supabase
        .from('chat_group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      if (adminError) throw adminError;

      // Add other members
      if (memberIds.length > 0) {
        const membersToAdd = memberIds
          .filter(id => id !== user.id)
          .map(id => ({
            group_id: group.id,
            user_id: id,
            role: 'member' as const
          }));

        if (membersToAdd.length > 0) {
          const { error: membersError } = await supabase
            .from('chat_group_members')
            .insert(membersToAdd);

          if (membersError) throw membersError;
        }
      }

      await fetchGroups();
      toast({
        title: "Success",
        description: "Group created successfully"
      });
      return group;
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive"
      });
      return null;
    }
  }, [user, profile?.company_id, fetchGroups, toast]);

  // Add member to group
  const addMember = useCallback(async (groupId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('chat_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;
      await fetchGroups();
      return true;
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive"
      });
      return false;
    }
  }, [fetchGroups, toast]);

  // Remove member from group
  const removeMember = useCallback(async (groupId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      await fetchGroups();
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive"
      });
      return false;
    }
  }, [fetchGroups, toast]);

  // Leave group
  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return false;
    return removeMember(groupId, user.id);
  }, [user, removeMember]);

  // Subscribe to group message changes
  useEffect(() => {
    if (!activeGroup) return;

    const channel = supabase
      .channel(`group-messages-${activeGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${activeGroup.id}`
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Get sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();

          const newMessage: GroupMessage = {
            ...newMsg,
            group_id: newMsg.group_id,
            message_type: newMsg.message_type as GroupMessage['message_type'],
            sender: senderProfile || undefined
          };
          
          setGroupMessages(prev => [...prev, newMessage]);

          // Play notification sound if not sender
          if (user && newMessage.sender_id !== user.id) {
            audioNotifications.playMessageNotification();
            
            await supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMessage.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${activeGroup.id}`
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          setGroupMessages(prev => prev.map(m => 
            m.id === updatedMsg.id 
              ? { ...m, ...updatedMsg, message_type: updatedMsg.message_type as GroupMessage['message_type'] }
              : m
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroup, user]);

  // Initial fetch
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Fetch messages when active group changes
  useEffect(() => {
    if (activeGroup) {
      fetchGroupMessages(activeGroup.id);
    } else {
      setGroupMessages([]);
    }
  }, [activeGroup, fetchGroupMessages]);

  return {
    groups,
    activeGroup,
    setActiveGroup,
    groupMessages,
    loading,
    sendingMessage,
    sendGroupMessage,
    createGroup,
    addMember,
    removeMember,
    leaveGroup,
    fetchGroups
  };
};
