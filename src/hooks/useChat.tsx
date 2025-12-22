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
  message_type: 'text' | 'image' | 'file' | 'call_started' | 'call_ended';
  content: string | null;
  image_url: string | null;
  file_name?: string | null;
  file_size?: number | null;
  read_at: string | null;
  created_at: string;
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
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const typedMessages: ChatMessage[] = (data || []).map(msg => ({
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
    type: 'text' | 'image' | 'file' = 'text', 
    fileUrl?: string,
    fileName?: string,
    fileSize?: number
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
          image_url: (type === 'image' || type === 'file') ? fileUrl : null
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

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;

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

  // Subscribe to new messages
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
            // Play message notification sound
            audioNotifications.playMessageNotification();
            
            supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMessage.id);
          }
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
    startConversation,
    fetchConversations
  };
};
