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
  signalingChannel: string;
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
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
    if (!user?.id) return;

    console.log('Setting up incoming call listener for user:', user.id);

    // Create a dedicated channel for this user to receive incoming calls
    const channelName = `incoming-call-${user.id}`;
    
    channelRef.current = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channelRef.current
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        console.log('Received incoming call from:', payload.callerName);
        
        // Don't process our own calls
        if (payload.callerId === user.id) {
          console.log('Ignoring own call');
          return;
        }

        setIncomingCall({
          callerId: payload.callerId,
          callerName: payload.callerName,
          offer: payload.offer,
          callLogId: payload.callLogId,
          signalingChannel: payload.signalingChannel
        });
        
        // Play incoming ringtone
        audioNotifications.playIncomingRing();
        
        // Show browser notification
        notificationRef.current = showCallNotification(payload.callerName);
      })
      .subscribe((status) => {
        console.log(`Incoming call channel ${channelName} status:`, status);
      });

    return () => {
      console.log('Cleaning up incoming call listener');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      audioNotifications.stopIncomingRing();
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
    };
  }, [user?.id]);

  // Listen for call cancellation
  useEffect(() => {
    if (!incomingCall?.signalingChannel) return;

    console.log('Setting up call cancellation listener on:', incomingCall.signalingChannel);
    
    const cancelChannel = supabase.channel(`cancel-${incomingCall.signalingChannel}`, {
      config: { broadcast: { self: false } }
    });

    // Also listen on the actual signaling channel for end-call events
    const signalingChannel = supabase.channel(incomingCall.signalingChannel, {
      config: { broadcast: { self: false } }
    });

    signalingChannel
      .on('broadcast', { event: 'end-call' }, () => {
        console.log('Caller cancelled the call');
        clearIncomingCall();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(cancelChannel);
      supabase.removeChannel(signalingChannel);
    };
  }, [incomingCall?.signalingChannel, clearIncomingCall]);

  return {
    incomingCall,
    clearIncomingCall
  };
};
