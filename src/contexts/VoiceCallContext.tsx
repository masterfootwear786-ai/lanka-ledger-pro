import React, { createContext, useContext, ReactNode } from 'react';
import { useVoiceCall, CallState } from '@/hooks/useVoiceCall';

interface VoiceCallContextType {
  callState: CallState;
  startCall: (targetUserId: string, targetUserName: string) => Promise<void>;
  answerCall: (
    callerId: string,
    callerName: string,
    offer: RTCSessionDescriptionInit,
    incomingCallLogId: string,
    signalingChannel: string
  ) => Promise<void>;
  rejectCall: (callerId: string, incomingCallLogId: string, signalingChannel?: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
}

const defaultVoiceCallContext: VoiceCallContextType = {
  callState: {
    status: 'idle',
    callId: null,
    remoteUserId: null,
    remoteUserName: null,
    isMuted: false,
    isSpeakerOn: true,
    duration: 0,
  },
  startCall: async () => {
    console.warn('VoiceCallProvider missing: startCall ignored');
  },
  answerCall: async () => {
    console.warn('VoiceCallProvider missing: answerCall ignored');
  },
  rejectCall: async () => {
    console.warn('VoiceCallProvider missing: rejectCall ignored');
  },
  endCall: async () => {
    console.warn('VoiceCallProvider missing: endCall ignored');
  },
  toggleMute: () => {
    console.warn('VoiceCallProvider missing: toggleMute ignored');
  },
  toggleSpeaker: () => {
    console.warn('VoiceCallProvider missing: toggleSpeaker ignored');
  },
};

const VoiceCallContext = createContext<VoiceCallContextType>(defaultVoiceCallContext);

export const VoiceCallProvider = ({ children }: { children: ReactNode }) => {
  const voiceCall = useVoiceCall();

  return (
    <VoiceCallContext.Provider value={voiceCall}>
      {children}
    </VoiceCallContext.Provider>
  );
};

export const useVoiceCallContext = () => {
  return useContext(VoiceCallContext);
};
