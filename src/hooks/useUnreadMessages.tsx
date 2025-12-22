import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      // Get all conversations where the user is a participant
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

      if (!conversations || conversations.length === 0) {
        setUnreadCount(0);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Get unread messages (not from current user, not read yet)
      // Also exclude messages that the user has deleted for themselves
      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .neq('message_type', 'deleted');

      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }

      // Subtract messages the user has "deleted for me"
      const { count: deletedCount } = await supabase
        .from('chat_message_deletions')
        .select('message_id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setUnreadCount(Math.max(0, (count || 0) - (deletedCount || 0)));
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          // If new message is not from current user, increment count
          if (payload.new && payload.new.sender_id !== user.id) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          // If message was read by current user, decrement count
          if (payload.new && payload.old && 
              !payload.old.read_at && payload.new.read_at &&
              payload.new.sender_id !== user.id) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount };
};
