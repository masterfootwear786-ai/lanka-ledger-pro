import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { useToast } from '@/hooks/use-toast';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallState {
  status: CallStatus;
  callId: string | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  isMuted: boolean;
  duration: number;
}

export const useVoiceCall = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    callId: null,
    remoteUserId: null,
    remoteUserName: null,
    isMuted: false,
    duration: 0
  });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const callLogId = useRef<string | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const signalingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize audio element
  useEffect(() => {
    remoteAudio.current = new Audio();
    remoteAudio.current.autoplay = true;
    return () => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = null;
      }
    };
  }, []);

  const cleanup = useCallback(() => {
    // Send end signal
    if (signalingChannel.current) {
      signalingChannel.current.send({
        type: 'broadcast',
        event: 'end-call',
        payload: {}
      });
      supabase.removeChannel(signalingChannel.current);
      signalingChannel.current = null;
    }

    // Stop local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Stop duration timer
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const setupPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudio.current && event.streams[0]) {
        remoteAudio.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, []);

  const startDurationTimer = useCallback(() => {
    durationInterval.current = setInterval(() => {
      setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const endCall = useCallback(async () => {
    const currentStatus = callState.status;
    const currentDuration = callState.duration;
    const currentCallLogId = callLogId.current;

    cleanup();

    // Update call log
    if (currentCallLogId) {
      if (currentStatus === 'connected') {
        await supabase
          .from('call_logs')
          .update({ 
            status: 'ended', 
            ended_at: new Date().toISOString(),
            duration_seconds: currentDuration
          })
          .eq('id', currentCallLogId);
      } else if (currentStatus === 'calling') {
        await supabase
          .from('call_logs')
          .update({ status: 'missed', ended_at: new Date().toISOString() })
          .eq('id', currentCallLogId);
      }
    }

    callLogId.current = null;

    setCallState({
      status: 'idle',
      callId: null,
      remoteUserId: null,
      remoteUserName: null,
      isMuted: false,
      duration: 0
    });
  }, [callState.status, callState.duration, cleanup]);

  const startCall = useCallback(async (targetUserId: string, targetUserName: string) => {
    if (!user || !profile?.company_id) return;

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;

      // Create call log
      const { data: callLog, error } = await supabase
        .from('call_logs')
        .insert({
          company_id: profile.company_id,
          caller_id: user.id,
          receiver_id: targetUserId,
          call_type: 'voice',
          status: 'initiated'
        })
        .select()
        .single();

      if (error) throw error;
      callLogId.current = callLog.id;

      // Set up peer connection
      const pc = setupPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Set up signaling channel
      const channelName = `call-${[user.id, targetUserId].sort().join('-')}`;
      signalingChannel.current = supabase.channel(channelName)
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (peerConnection.current && payload.answer) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            setCallState(prev => ({ ...prev, status: 'connected' }));
            startDurationTimer();
            
            // Update call log
            await supabase
              .from('call_logs')
              .update({ status: 'answered', answered_at: new Date().toISOString() })
              .eq('id', callLogId.current);
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (peerConnection.current && payload.candidate) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        })
        .on('broadcast', { event: 'end-call' }, () => {
          endCall();
        })
        .on('broadcast', { event: 'reject-call' }, () => {
          toast({ title: "Call Rejected", description: `${targetUserName} rejected the call` });
          endCall();
        })
        .subscribe();

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      signalingChannel.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: { 
          offer,
          callerId: user.id,
          callerName: profile.full_name || 'Unknown',
          callLogId: callLog.id
        }
      });

      setCallState({
        status: 'calling',
        callId: callLog.id,
        remoteUserId: targetUserId,
        remoteUserName: targetUserName,
        isMuted: false,
        duration: 0
      });

      // Update call log to ringing
      await supabase
        .from('call_logs')
        .update({ status: 'ringing' })
        .eq('id', callLog.id);

    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: error instanceof Error ? error.message : "Could not start call",
        variant: "destructive"
      });
      endCall();
    }
  }, [user, profile, setupPeerConnection, toast, startDurationTimer, endCall]);

  const answerCall = useCallback(async (callerId: string, callerName: string, offer: RTCSessionDescriptionInit, incomingCallLogId: string) => {
    if (!user) return;

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      callLogId.current = incomingCallLogId;

      // Set up peer connection
      const pc = setupPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Set up signaling channel
      const channelName = `call-${[user.id, callerId].sort().join('-')}`;
      signalingChannel.current = supabase.channel(channelName)
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (peerConnection.current && payload.candidate) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        })
        .on('broadcast', { event: 'end-call' }, () => {
          endCall();
        })
        .subscribe();

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      signalingChannel.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: { answer }
      });

      setCallState({
        status: 'connected',
        callId: incomingCallLogId,
        remoteUserId: callerId,
        remoteUserName: callerName,
        isMuted: false,
        duration: 0
      });

      startDurationTimer();

    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: "Call Failed",
        description: "Could not answer call",
        variant: "destructive"
      });
      rejectCall(callerId, incomingCallLogId);
    }
  }, [user, setupPeerConnection, toast, startDurationTimer, endCall]);

  const rejectCall = useCallback(async (callerId: string, incomingCallLogId: string) => {
    if (!user) return;
    
    const channelName = `call-${[user.id, callerId].sort().join('-')}`;
    const channel = supabase.channel(channelName);
    
    await channel.subscribe();
    channel.send({
      type: 'broadcast',
      event: 'reject-call',
      payload: {}
    });

    // Update call log
    await supabase
      .from('call_logs')
      .update({ status: 'rejected', ended_at: new Date().toISOString() })
      .eq('id', incomingCallLogId);

    supabase.removeChannel(channel);
  }, [user]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  return {
    callState,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute
  };
};
