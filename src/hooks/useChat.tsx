import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { useToast } from '@/hooks/use-toast';
import { audioNotifications } from '@/utils/audioNotifications';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'file' | 'call_started' | 'call_ended' | 'deleted' | 'voice';
  content: string | null;
  image_url: string | null;
  file_name?: string | null;
  file_size?: number | null;
  duration_seconds?: number | null;
  read_at: string | null;
  created_at: string;
  deleted_at?: string | null;
  deleted_for_everyone?: boolean;
}

export interface ChatConversation {
  id: string;
  company_id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  other_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    is_online: boolean;
  };
  last_message?: ChatMessage;
  unread_count?: number;
}

export const useChat = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user || !profile?.company_id) return;

    try {
      const { data: convos, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('company_id', profile.company_id)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch user details and last messages for each conversation
      const enrichedConvos: ChatConversation[] = await Promise.all(
        (convos || []).map(async (conv) => {
          const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          
          // Get other user's profile
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', otherUserId)
            .single();

          // Get presence
          const { data: presence } = await supabase
            .from('user_presence')
            .select('is_online')
            .eq('user_id', otherUserId)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          const result: ChatConversation = {
            ...conv,
            other_user: otherProfile ? {
              id: otherProfile.id,
              full_name: otherProfile.full_name || 'Unknown',
              avatar_url: otherProfile.avatar_url,
              is_online: presence?.is_online || false
            } : undefined,
            last_message: lastMsg ? {
              ...lastMsg,
              message_type: lastMsg.message_type as ChatMessage['message_type']
            } : undefined,
            unread_count: count || 0
          };

          return result;
        })
      );

      setConversations(enrichedConvos);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.company_id]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const [messagesRes, deletionsRes] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
        user
          ? supabase
              .from('chat_message_deletions')
              .select('message_id, chat_messages!inner(conversation_id)')
              .eq('user_id', user.id)
              .eq('chat_messages.conversation_id', conversationId)
          : Promise.resolve({ data: [], error: null } as any)
      ]);

      if (messagesRes.error) throw messagesRes.error;

      const deletedIds = new Set<string>((deletionsRes.data || []).map((d: any) => d.message_id));

      const typedMessages: ChatMessage[] = (messagesRes.data || [])
        .filter((msg: any) => !deletedIds.has(msg.id))
        .map((msg: any) => ({
          ...msg,
          message_type: msg.message_type as ChatMessage['message_type']
        }));

      setMessages(typedMessages);

      // Mark messages as read
      if (user) {
        await supabase
          .from('chat_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .is('read_at', null);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [user]);

  // Send message
  const sendMessage = useCallback(async (
    content: string, 
    type: 'text' | 'image' | 'file' | 'voice' = 'text', 
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
    durationSeconds?: number
  ) => {
    if (!user || !activeConversation) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          message_type: type,
          content: type === 'text' ? content : (fileName || null),
          image_url: (type === 'image' || type === 'file' || type === 'voice') ? fileUrl : null,
          duration_seconds: type === 'voice' ? durationSeconds : null
        });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversation.id);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  }, [user, activeConversation, toast]);

  // Delete message (just for me) - implemented via per-user deletion marker
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_message_deletions')
        .insert({
          message_id: messageId,
          user_id: user.id
        });

      // If already deleted for this user, treat as success
      if (error && (error as any).code !== '23505') throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Unsend message (delete for everyone)
  const unsendMessage = useCallback(async (messageId: string) => {
    if (!user) return false;

    try {
      // Get message to check for attached files
      const { data: message } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', messageId)
        .eq('sender_id', user.id)
        .single();

      if (!message) throw new Error('Message not found');

      // Delete file from storage if exists
      if (message.image_url) {
        const url = new URL(message.image_url);
        // supports both /chat-files/ and /chat-images/ (legacy)
        const parts = url.pathname.split('/');
        const bucketIndex = parts.findIndex(p => p === 'chat-files' || p === 'chat-images');
        if (bucketIndex !== -1) {
          const bucket = parts[bucketIndex];
          const objectPath = decodeURIComponent(parts.slice(bucketIndex + 1).join('/'));
          if (objectPath) {
            await supabase.storage.from(bucket).remove([objectPath]);
          }
        }
      }

      // Update message to show as deleted for everyone
      const { error } = await supabase
        .from('chat_messages')
        .update({
          message_type: 'deleted',
          content: null,
          image_url: null
        })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;

      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, message_type: 'deleted' as const, content: null, image_url: null }
          : m
      ));
      return true;
    } catch (error) {
      console.error('Error unsending message:', error);
      toast({
        title: "Error",
        description: "Failed to unsend message",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Start or get conversation with user
  const startConversation = useCallback(async (otherUserId: string) => {
    if (!user || !profile?.company_id) return null;

    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('company_id', profile.company_id)
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .single();

      if (existing) {
        return existing;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({
          company_id: profile.company_id,
          participant_1: user.id,
          participant_2: otherUserId
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchConversations();
      return newConv;
    } catch (error) {
      console.error('Error starting conversation:', error);
      return null;
    }
  }, [user, profile?.company_id, fetchConversations]);

  // Subscribe to message changes (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel(`messages-${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const newMessage: ChatMessage = {
            ...payload.new as any,
            message_type: (payload.new as any).message_type as ChatMessage['message_type']
          };
          setMessages(prev => [...prev, newMessage]);
          
          // Play notification sound and mark as read if not sender
          if (user && newMessage.sender_id !== user.id) {
            audioNotifications.playMessageNotification();
            
            supabase
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
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const updatedMessage: ChatMessage = {
            ...payload.new as any,
            message_type: (payload.new as any).message_type as ChatMessage['message_type']
          };
          setMessages(prev => prev.map(m => 
            m.id === updatedMessage.id ? updatedMessage : m
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages(prev => prev.filter(m => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, user]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation, fetchMessages]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    sendingMessage,
    sendMessage,
    deleteMessage,
    unsendMessage,
    startConversation,
    fetchConversations
  };
};
