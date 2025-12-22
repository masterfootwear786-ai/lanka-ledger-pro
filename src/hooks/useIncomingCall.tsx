import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';

export interface IncomingCall {
  callerId: string;
  callerName: string;
  offer: RTCSessionDescriptionInit;
  callLogId: string;
}

export const useIncomingCall = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // Play ringtone
  const playRingtone = useCallback(() => {
    // Create a simple oscillator-based ringtone
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Stop after 500ms, then repeat
      const interval = setInterval(() => {
        oscillator.frequency.value = oscillator.frequency.value === 440 ? 520 : 440;
      }, 500);
      
      // Store cleanup
      ringtoneRef.current = {
        pause: () => {
          oscillator.stop();
          clearInterval(interval);
          audioContext.close();
        },
        currentTime: 0
      } as HTMLAudioElement;
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
        }
      }, 30000);
    } catch (err) {
      console.error('Error playing ringtone:', err);
    }
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
              playRingtone();
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
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
      }
    };
  }, [user, profile?.company_id, playRingtone, clearIncomingCall]);

  return {
    incomingCall,
    clearIncomingCall
  };
};