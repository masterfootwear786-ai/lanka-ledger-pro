import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { audioNotifications } from '@/utils/audioNotifications';

export interface IncomingCall {
  callerId: string;
  callerName: string;
  offer: RTCSessionDescriptionInit;
  callLogId: string;
}

// Request notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

// Show browser notification for incoming call
const showCallNotification = (callerName: string): Notification | null => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification('Incoming Call', {
      body: `${callerName} is calling...`,
      icon: '/icon-192.png',
      tag: 'incoming-call',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
};

export const useIncomingCall = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const notificationRef = useRef<Notification | null>(null);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
    // Stop ringtone
    audioNotifications.stopIncomingRing();
    // Close browser notification
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Request notification permission on mount
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!user || !profile?.company_id) return;

    console.log('Setting up incoming call listeners for user:', user.id);

    const setupListeners = async () => {
      // Get all users in company
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', profile.company_id)
        .neq('id', user.id);

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      if (!profiles || profiles.length === 0) {
        console.log('No other users in company');
        return;
      }

      console.log('Setting up listeners for', profiles.length, 'users');

      // Listen for calls from each user
      for (const otherProfile of profiles) {
        const channelName = `voice-call-${[user.id, otherProfile.id].sort().join('-')}`;
        
        // Skip if already listening
        if (channelsRef.current.has(channelName)) continue;

        console.log('Creating listener channel:', channelName);
        
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: 'offer' }, ({ payload }) => {
            console.log('Received call offer from:', payload.callerName);
            if (payload.callerId !== user.id) {
              setIncomingCall({
                callerId: payload.callerId,
                callerName: payload.callerName,
                offer: payload.offer,
                callLogId: payload.callLogId
              });
              // Play incoming ringtone
              audioNotifications.playIncomingRing();
              // Show browser notification
              notificationRef.current = showCallNotification(payload.callerName);
            }
          })
          .on('broadcast', { event: 'end-call' }, () => {
            console.log('Caller ended call before answer');
            clearIncomingCall();
          })
          .subscribe((status) => {
            console.log(`Incoming call channel ${channelName} status:`, status);
          });

        channelsRef.current.set(channelName, channel);
      }
    };

    setupListeners();

    return () => {
      console.log('Cleaning up incoming call listeners');
      channelsRef.current.forEach((channel, name) => {
        console.log('Removing channel:', name);
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      audioNotifications.stopIncomingRing();
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
    };
  }, [user, profile?.company_id, clearIncomingCall]);

  return {
    incomingCall,
    clearIncomingCall
  };
};