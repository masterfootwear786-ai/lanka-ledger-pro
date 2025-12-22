import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';

export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
}

export const usePresence = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(new Map());

  // Update own presence
  const updatePresence = useCallback(async (isOnline: boolean) => {
    if (!user || !profile?.company_id) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          company_id: profile.company_id,
          is_online: isOnline,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id' 
        });

      if (error) console.error('Error updating presence:', error);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user, profile?.company_id]);

  // Fetch all online users in company
  const fetchOnlineUsers = useCallback(async () => {
    if (!profile?.company_id) return;

    try {
      const { data } = await supabase
        .from('user_presence')
        .select('user_id, is_online')
        .eq('company_id', profile.company_id);

      if (data) {
        const presenceMap = new Map<string, boolean>();
        data.forEach(p => presenceMap.set(p.user_id, p.is_online));
        setOnlineUsers(presenceMap);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  }, [profile?.company_id]);

  // Check if specific user is online
  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.get(userId) || false;
  }, [onlineUsers]);

  // Set up presence tracking
  useEffect(() => {
    if (!user || !profile?.company_id) return;

    // Set online when component mounts
    updatePresence(true);
    fetchOnlineUsers();

    // Handle visibility change
    const handleVisibilityChange = () => {
      updatePresence(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Subscribe to presence changes
    const channel = supabase
      .channel('presence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `company_id=eq.${profile.company_id}`
        },
        (payload) => {
          const presence = payload.new as UserPresence;
          setOnlineUsers(prev => {
            const newMap = new Map(prev);
            newMap.set(presence.user_id, presence.is_online);
            return newMap;
          });
        }
      )
      .subscribe();

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence(true);
      }
    }, 30000); // Every 30 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeat);
      updatePresence(false);
      supabase.removeChannel(channel);
    };
  }, [user, profile?.company_id, updatePresence, fetchOnlineUsers]);

  return {
    onlineUsers,
    isUserOnline,
    updatePresence,
    fetchOnlineUsers
  };
};
