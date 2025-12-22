import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { useToast } from '@/hooks/use-toast';
import { audioNotifications } from '@/utils/audioNotifications';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallState {
  status: CallStatus;
  callId: string | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  isMuted: boolean;
  duration: number;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

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
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const isSubscribed = useRef<boolean>(false);

  // Initialize audio element
  useEffect(() => {
    remoteAudio.current = new Audio();
    remoteAudio.current.autoplay = true;
    (remoteAudio.current as any).playsInline = true;
    return () => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = null;
      }
    };
  }, []);

  const cleanup = useCallback(() => {
    console.log('Cleaning up call...');
    
    // Stop duration timer
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    // Stop local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStream.current = null;
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Clear ICE queue
    iceCandidatesQueue.current = [];

    // Remove signaling channel
    if (signalingChannel.current) {
      supabase.removeChannel(signalingChannel.current);
      signalingChannel.current = null;
      isSubscribed.current = false;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const processIceCandidateQueue = useCallback(async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) return;
    
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('Added queued ICE candidate');
        } catch (err) {
          console.error('Error adding queued ICE candidate:', err);
        }
      }
    }
  }, []);

  const setupPeerConnection = useCallback(() => {
    console.log('Setting up peer connection...');
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current && isSubscribed.current) {
        console.log('Sending ICE candidate');
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate.toJSON() }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteAudio.current && event.streams[0]) {
        remoteAudio.current.srcObject = event.streams[0];
        remoteAudio.current.play().catch(err => console.error('Error playing audio:', err));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        console.log('Call connected!');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.log('Call disconnected or failed');
        endCall();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
    };

    peerConnection.current = pc;
    return pc;
  }, []);

  const startDurationTimer = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    durationInterval.current = setInterval(() => {
      setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const endCall = useCallback(async () => {
    const currentStatus = callState.status;
    const currentDuration = callState.duration;
    const currentCallLogId = callLogId.current;

    // Stop all ring sounds
    audioNotifications.stopAll();
    
    // Play call ended sound if was connected
    if (currentStatus === 'connected') {
      audioNotifications.playCallEnded();
    }

    // Send end signal before cleanup
    if (signalingChannel.current && isSubscribed.current) {
      try {
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'end-call',
          payload: {}
        });
      } catch (err) {
        console.error('Error sending end-call:', err);
      }
    }

    cleanup();

    // Update call log
    if (currentCallLogId) {
      try {
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
      } catch (err) {
        console.error('Error updating call log:', err);
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
    if (!user || !profile?.company_id) {
      toast({
        title: "Error",
        description: "You must be logged in to make calls",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Starting call to:', targetUserName);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      localStream.current = stream;
      console.log('Got local audio stream');

      // Create call log
      const { data: callLog, error } = await supabase
        .from('call_logs')
        .insert({
          company_id: profile.company_id,
          caller_id: user.id,
          receiver_id: targetUserId,
          call_type: 'voice',
          status: 'initiated',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      callLogId.current = callLog.id;
      console.log('Created call log:', callLog.id);

      // Set up peer connection
      const pc = setupPeerConnection();
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('Added track to peer connection:', track.kind);
      });

      // Set up signaling channel
      const channelName = `voice-call-${[user.id, targetUserId].sort().join('-')}`;
      console.log('Setting up signaling channel:', channelName);
      
      signalingChannel.current = supabase.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      signalingChannel.current
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          console.log('Received answer');
          if (peerConnection.current && payload.answer) {
            try {
              // Stop outgoing ring and play connected sound
              audioNotifications.stopOutgoingRing();
              audioNotifications.playCallConnected();
              
              await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
              console.log('Set remote description (answer)');
              await processIceCandidateQueue();
              
              setCallState(prev => ({ ...prev, status: 'connected' }));
              startDurationTimer();
              
              // Update call log
              await supabase
                .from('call_logs')
                .update({ status: 'answered', answered_at: new Date().toISOString() })
                .eq('id', callLogId.current);
            } catch (err) {
              console.error('Error setting remote description:', err);
            }
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          console.log('Received ICE candidate');
          if (payload.candidate) {
            if (peerConnection.current?.remoteDescription) {
              try {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                console.log('Added ICE candidate');
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
              }
            } else {
              console.log('Queueing ICE candidate');
              iceCandidatesQueue.current.push(payload.candidate);
            }
          }
        })
        .on('broadcast', { event: 'end-call' }, () => {
          console.log('Received end-call signal');
          toast({ title: "Call Ended", description: "The call has ended" });
          endCall();
        })
        .on('broadcast', { event: 'reject-call' }, () => {
          console.log('Call rejected');
          toast({ title: "Call Rejected", description: `${targetUserName} rejected the call` });
          endCall();
        });

      await signalingChannel.current.subscribe((status) => {
        console.log('Signaling channel status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribed.current = true;
        }
      });

      // Wait for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Created and set local description (offer)');

      signalingChannel.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: { 
          offer: { type: offer.type, sdp: offer.sdp },
          callerId: user.id,
          callerName: profile.full_name || 'Unknown',
          callLogId: callLog.id
        }
      });
      console.log('Sent offer');

      // Start outgoing ring sound
      audioNotifications.playOutgoingRing();

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

      toast({
        title: "Calling...",
        description: `Calling ${targetUserName}`
      });

    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: error instanceof Error ? error.message : "Could not start call. Please check microphone permissions.",
        variant: "destructive"
      });
      cleanup();
      setCallState({
        status: 'idle',
        callId: null,
        remoteUserId: null,
        remoteUserName: null,
        isMuted: false,
        duration: 0
      });
    }
  }, [user, profile, setupPeerConnection, toast, startDurationTimer, endCall, cleanup, processIceCandidateQueue]);

  const answerCall = useCallback(async (callerId: string, callerName: string, offer: RTCSessionDescriptionInit, incomingCallLogId: string) => {
    if (!user) return;

    try {
      console.log('Answering call from:', callerName);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      localStream.current = stream;
      callLogId.current = incomingCallLogId;
      console.log('Got local audio stream for answering');

      // Set up peer connection
      const pc = setupPeerConnection();
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('Added track for answer:', track.kind);
      });

      // Set up signaling channel
      const channelName = `voice-call-${[user.id, callerId].sort().join('-')}`;
      console.log('Joining signaling channel:', channelName);
      
      signalingChannel.current = supabase.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      signalingChannel.current
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          console.log('Received ICE candidate (answerer)');
          if (payload.candidate) {
            if (peerConnection.current?.remoteDescription) {
              try {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
              }
            } else {
              iceCandidatesQueue.current.push(payload.candidate);
            }
          }
        })
        .on('broadcast', { event: 'end-call' }, () => {
          console.log('Call ended by caller');
          toast({ title: "Call Ended", description: "The call has ended" });
          endCall();
        });

      await signalingChannel.current.subscribe((status) => {
        console.log('Answerer signaling channel status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribed.current = true;
        }
      });

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Set remote description (offer)');
      await processIceCandidateQueue();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Created and set local description (answer)');

      signalingChannel.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: { answer: { type: answer.type, sdp: answer.sdp } }
      });
      console.log('Sent answer');

      // Update call log
      await supabase
        .from('call_logs')
        .update({ status: 'answered', answered_at: new Date().toISOString() })
        .eq('id', incomingCallLogId);

      setCallState({
        status: 'connected',
        callId: incomingCallLogId,
        remoteUserId: callerId,
        remoteUserName: callerName,
        isMuted: false,
        duration: 0
      });

      startDurationTimer();

      toast({
        title: "Connected",
        description: `Connected with ${callerName}`
      });

    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: "Call Failed",
        description: "Could not answer call. Please check microphone permissions.",
        variant: "destructive"
      });
      rejectCall(callerId, incomingCallLogId);
    }
  }, [user, setupPeerConnection, toast, startDurationTimer, endCall, processIceCandidateQueue]);

  const rejectCall = useCallback(async (callerId: string, incomingCallLogId: string) => {
    if (!user) return;
    
    console.log('Rejecting call');
    const channelName = `voice-call-${[user.id, callerId].sort().join('-')}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });
    
    await channel.subscribe();
    await new Promise(resolve => setTimeout(resolve, 300));
    
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

    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 1000);
  }, [user]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
        toast({
          title: audioTrack.enabled ? "Unmuted" : "Muted",
          description: audioTrack.enabled ? "Your microphone is on" : "Your microphone is muted"
        });
      }
    }
  }, [toast]);

  return {
    callState,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute
  };
};