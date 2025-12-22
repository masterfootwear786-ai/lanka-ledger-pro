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
  isSpeakerOn: boolean;
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
    isSpeakerOn: true,
    duration: 0
  });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const callLogId = useRef<string | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const signalingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const localIceCandidates = useRef<RTCIceCandidateInit[]>([]); // Store local ICE candidates to resend
  const isSubscribed = useRef<boolean>(false);
  const callStatusRef = useRef<CallStatus>('idle');
  const connectionFailTimer = useRef<NodeJS.Timeout | null>(null);
  const endCallRef = useRef<() => void>(() => {});
  const isCleaningUp = useRef<boolean>(false);
  const answererReady = useRef<boolean>(false);

  useEffect(() => {
    callStatusRef.current = callState.status;
  }, [callState.status]);

  // Initialize audio element (append to DOM to support mobile playback)
  useEffect(() => {
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.setAttribute('playsinline', 'true');
    (audioEl as any).playsInline = true;
    audioEl.style.position = 'fixed';
    audioEl.style.left = '-9999px';
    audioEl.style.width = '1px';
    audioEl.style.height = '1px';
    document.body.appendChild(audioEl);
    remoteAudio.current = audioEl;

    return () => {
      audioEl.srcObject = null;
      audioEl.remove();
      if (remoteAudio.current === audioEl) remoteAudio.current = null;
    };
  }, []);

  const ensureRemoteAudioUnlocked = useCallback(async () => {
    const audioEl = remoteAudio.current;
    if (!audioEl) return;

    try {
      // "Unlock" audio on iOS/Safari: play a muted element once from a user gesture
      audioEl.muted = true;
      await audioEl.play();
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.muted = false;
      console.log('Remote audio unlocked');
    } catch (err) {
      console.log('Remote audio unlock failed (may still work):', err);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (isCleaningUp.current) {
      console.log('Already cleaning up, skipping...');
      return;
    }
    isCleaningUp.current = true;
    console.log('Cleaning up call...');

    if (connectionFailTimer.current) {
      clearTimeout(connectionFailTimer.current);
      connectionFailTimer.current = null;
    }
    
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
      peerConnection.current.onicecandidate = null;
      peerConnection.current.ontrack = null;
      peerConnection.current.oniceconnectionstatechange = null;
      peerConnection.current.onconnectionstatechange = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Clear remote audio
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
    }
    remoteStream.current = null;

    // Clear ICE queues
    iceCandidatesQueue.current = [];
    localIceCandidates.current = [];
    answererReady.current = false;

    // Remove signaling channel with delay
    if (signalingChannel.current) {
      const channelToRemove = signalingChannel.current;
      signalingChannel.current = null;
      isSubscribed.current = false;
      
      setTimeout(() => {
        try {
          supabase.removeChannel(channelToRemove);
          console.log('Removed signaling channel');
        } catch (e) {
          console.error('Error removing channel:', e);
        }
      }, 500);
    }

    // Reset cleanup flag after a short delay
    setTimeout(() => {
      isCleaningUp.current = false;
    }, 1000);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const processIceCandidateQueue = useCallback(async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) return;
    
    console.log('Processing ICE candidate queue, count:', iceCandidatesQueue.current.length);
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

  const sendStoredIceCandidates = useCallback(() => {
    if (!signalingChannel.current || !isSubscribed.current) return;
    
    console.log('Sending stored ICE candidates, count:', localIceCandidates.current.length);
    localIceCandidates.current.forEach(candidate => {
      signalingChannel.current?.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { candidate }
      });
    });
  }, []);

  const setupPeerConnection = useCallback((isCaller: boolean) => {
    console.log('Setting up peer connection... isCaller:', isCaller);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateJson = event.candidate.toJSON();
        console.log('Got ICE candidate');
        
        if (isCaller) {
          // Store ICE candidates - will send when answerer is ready
          localIceCandidates.current.push(candidateJson);
          
          // If answerer is already ready, send immediately
          if (answererReady.current && signalingChannel.current && isSubscribed.current) {
            console.log('Sending ICE candidate immediately (answerer ready)');
            signalingChannel.current.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: candidateJson }
            });
          }
        } else {
          // Answerer sends ICE candidates immediately
          if (signalingChannel.current && isSubscribed.current) {
            console.log('Sending ICE candidate (answerer)');
            signalingChannel.current.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: candidateJson }
            });
          }
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);

      // Safari/iOS sometimes doesn't populate event.streams
      const streamFromEvent = event.streams && event.streams[0] ? event.streams[0] : null;
      const stream = streamFromEvent ?? remoteStream.current ?? new MediaStream();

      if (!stream.getTracks().some((t) => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }

      remoteStream.current = stream;
      console.log(
        'Remote stream tracks:',
        stream.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled, muted: t.muted }))
      );

      if (remoteAudio.current) {
        remoteAudio.current.srcObject = stream;
        remoteAudio.current.volume = 1.0;
        remoteAudio.current.muted = false;

        const playAudio = () => {
          if (!remoteAudio.current) return;
          remoteAudio.current
            .play()
            .then(() => console.log('Remote audio playing successfully'))
            .catch((err) => {
              console.error('Error playing audio:', err);
              setTimeout(playAudio, 500);
            });
        };

        playAudio();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('ICE connection state:', state);

      if (state === 'connected' || state === 'completed') {
        console.log('Call connected!');
        if (connectionFailTimer.current) {
          clearTimeout(connectionFailTimer.current);
          connectionFailTimer.current = null;
        }
        return;
      }

      if (state === 'disconnected' || state === 'failed') {
        const currentStatus = callStatusRef.current;
        console.log('ICE issue while call status:', currentStatus);

        const graceMs = currentStatus === 'connected' ? 3000 : 15000;

        if (connectionFailTimer.current) {
          clearTimeout(connectionFailTimer.current);
        }

        connectionFailTimer.current = setTimeout(() => {
          const stillStatus = callStatusRef.current;
          const stillIceState = pc.iceConnectionState;
          console.log('ICE grace elapsed. status:', stillStatus, 'ice:', stillIceState);

          if (stillIceState === 'failed' || stillIceState === 'disconnected') {
            console.log('Ending call due to ICE failure/disconnect');
            endCallRef.current();
          }
        }, graceMs);
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
    if (isCleaningUp.current) {
      console.log('Already ending call, skipping...');
      return;
    }

    const currentStatus = callState.status;
    const currentDuration = callState.duration;
    const currentCallLogId = callLogId.current;

    console.log('Ending call, status:', currentStatus);

    // Stop all ring sounds
    audioNotifications.stopAll();
    
    // Play call ended sound if was connected
    if (currentStatus === 'connected') {
      audioNotifications.playCallEnded();
    }

    // Send end signal before cleanup
    if (signalingChannel.current && isSubscribed.current) {
      try {
        await signalingChannel.current.send({
          type: 'broadcast',
          event: 'end-call',
          payload: {}
        });
        console.log('Sent end-call signal');
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
      isSpeakerOn: true,
      duration: 0
    });
  }, [callState.status, callState.duration, cleanup]);

  useEffect(() => {
    endCallRef.current = () => {
      void endCall();
    };
  }, [endCall]);

  const startCall = useCallback(async (targetUserId: string, targetUserName: string) => {
    if (!user || !profile?.company_id) {
      toast({
        title: "Error",
        description: "You must be logged in to make calls",
        variant: "destructive"
      });
      return;
    }

    // Check if already in a call
    if (callState.status !== 'idle') {
      toast({
        title: "Already in a call",
        description: "Please end the current call before starting a new one",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Starting call to:', targetUserName);
      void ensureRemoteAudioUnlocked();
      
      // Reset state
      localIceCandidates.current = [];
      answererReady.current = false;
      
      // Get microphone access
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      } catch (mediaError: any) {
        console.error('Microphone access error:', mediaError);
        toast({
          title: "Microphone Error",
          description: "Could not access microphone. Please check permissions.",
          variant: "destructive"
        });
        return;
      }

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

      // Set up peer connection (as caller)
      const pc = setupPeerConnection(true);
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('Added track to peer connection:', track.kind);
      });

      // Set up signaling channel
      const channelName = `voice-call-${callLog.id}`;
      console.log('Setting up signaling channel:', channelName);
      
      signalingChannel.current = supabase.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      signalingChannel.current
        .on('broadcast', { event: 'answerer-ready' }, () => {
          console.log('Answerer is ready, sending stored ICE candidates');
          answererReady.current = true;
          sendStoredIceCandidates();
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          console.log('Received answer');
          if (peerConnection.current && payload.answer) {
            try {
              audioNotifications.stopOutgoingRing();
              audioNotifications.playCallConnected();
              
              await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
              console.log('Set remote description (answer)');
              await processIceCandidateQueue();
              
              setCallState(prev => ({ ...prev, status: 'connected' }));
              startDurationTimer();
              
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
          console.log('Received ICE candidate from answerer');
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

      await new Promise(resolve => setTimeout(resolve, 500));

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Created and set local description (offer)');

      // Send offer to the dedicated incoming call channel
      const incomingCallChannel = supabase.channel(`incoming-call-${targetUserId}`, {
        config: { broadcast: { self: false } }
      });

      await incomingCallChannel.subscribe();
      await new Promise(resolve => setTimeout(resolve, 300));

      incomingCallChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: { 
          offer: { type: offer.type, sdp: offer.sdp },
          callerId: user.id,
          callerName: profile.full_name || 'Unknown',
          callLogId: callLog.id,
          signalingChannel: channelName
        }
      });
      console.log('Sent offer to incoming call channel');

      setTimeout(() => {
        supabase.removeChannel(incomingCallChannel);
      }, 1000);

      audioNotifications.playOutgoingRing();

      setCallState({
        status: 'calling',
        callId: callLog.id,
        remoteUserId: targetUserId,
        remoteUserName: targetUserName,
        isMuted: false,
        isSpeakerOn: true,
        duration: 0
      });

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
        description: error instanceof Error ? error.message : "Could not start call. Please try again.",
        variant: "destructive"
      });
      cleanup();
      setCallState({
        status: 'idle',
        callId: null,
        remoteUserId: null,
        remoteUserName: null,
        isMuted: false,
        isSpeakerOn: true,
        duration: 0
      });
    }
  }, [user, profile, callState.status, setupPeerConnection, toast, startDurationTimer, endCall, cleanup, processIceCandidateQueue, sendStoredIceCandidates, ensureRemoteAudioUnlocked]);

  const answerCall = useCallback(async (callerId: string, callerName: string, offer: RTCSessionDescriptionInit, incomingCallLogId: string, channelName: string) => {
    if (!user) return;

    try {
      console.log('Answering call from:', callerName, 'channel:', channelName);
      
      audioNotifications.stopIncomingRing();
      void ensureRemoteAudioUnlocked();
      
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

      // Set up peer connection (as answerer)
      const pc = setupPeerConnection(false);
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('Added track for answer:', track.kind);
      });

      // Join the caller's signaling channel
      console.log('Joining signaling channel:', channelName);
      
      signalingChannel.current = supabase.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      signalingChannel.current
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          console.log('Received ICE candidate from caller');
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

      await new Promise(resolve => setTimeout(resolve, 300));

      // Notify caller that answerer is ready to receive ICE candidates
      console.log('Sending answerer-ready signal');
      signalingChannel.current.send({
        type: 'broadcast',
        event: 'answerer-ready',
        payload: {}
      });

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

      audioNotifications.playCallConnected();

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
        isSpeakerOn: true,
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
      // Cleanup on error
      audioNotifications.stopIncomingRing();
      cleanup();
      
      // Send reject signal
      if (channelName) {
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
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
      
      await supabase
        .from('call_logs')
        .update({ status: 'rejected', ended_at: new Date().toISOString() })
        .eq('id', incomingCallLogId);
    }
  }, [user, setupPeerConnection, toast, startDurationTimer, endCall, processIceCandidateQueue, cleanup, ensureRemoteAudioUnlocked]);

  const rejectCall = useCallback(async (callerId: string, incomingCallLogId: string, channelName?: string) => {
    if (!user) return;
    
    console.log('Rejecting call');
    audioNotifications.stopIncomingRing();

    if (channelName) {
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

      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 1000);
    }

    await supabase
      .from('call_logs')
      .update({ status: 'rejected', ended_at: new Date().toISOString() })
      .eq('id', incomingCallLogId);
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

  const toggleSpeaker = useCallback(() => {
    if (remoteAudio.current) {
      const newSpeakerState = !callState.isSpeakerOn;
      remoteAudio.current.volume = newSpeakerState ? 1.0 : 0;
      setCallState(prev => ({ ...prev, isSpeakerOn: newSpeakerState }));
      toast({
        title: newSpeakerState ? "Speaker On" : "Speaker Off",
        description: newSpeakerState ? "You can hear the caller" : "Audio muted"
      });
    }
  }, [callState.isSpeakerOn, toast]);

  return {
    callState,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker
  };
};
