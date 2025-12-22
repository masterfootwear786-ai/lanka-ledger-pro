import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IncomingCall {
  callerId: string;
  callerName: string;
  offer: RTCSessionDescriptionInit;
  callLogId: string;
}

export const useIncomingCall = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls from any user
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const setupListener = async () => {
      // Get all users in company
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', user.id);

      if (!profiles) return;

      // Listen for calls from each user
      profiles.forEach(profile => {
        const channelName = `call-${[user.id, profile.id].sort().join('-')}`;
        const channel = supabase.channel(channelName)
          .on('broadcast', { event: 'offer' }, ({ payload }) => {
            if (payload.callerId !== user.id) {
              setIncomingCall({
                callerId: payload.callerId,
                callerName: payload.callerName,
                offer: payload.offer,
                callLogId: payload.callLogId
              });
            }
          })
          .subscribe();

        channels.push(channel);
      });
    };

    setupListener();

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user]);

  return {
    incomingCall,
    clearIncomingCall
  };
};
