import React, { createContext, useContext, ReactNode } from 'react';
import { useVoiceCall, CallState } from '@/hooks/useVoiceCall';

interface VoiceCallContextType {
  callState: CallState;
  startCall: (targetUserId: string, targetUserName: string) => Promise<void>;
  answerCall: (callerId: string, callerName: string, offer: RTCSessionDescriptionInit, incomingCallLogId: string) => Promise<void>;
  rejectCall: (callerId: string, incomingCallLogId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
}

const VoiceCallContext = createContext<VoiceCallContextType | null>(null);

export const VoiceCallProvider = ({ children }: { children: ReactNode }) => {
  const voiceCall = useVoiceCall();

  return (
    <VoiceCallContext.Provider value={voiceCall}>
      {children}
    </VoiceCallContext.Provider>
  );
};

export const useVoiceCallContext = () => {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error('useVoiceCallContext must be used within a VoiceCallProvider');
  }
  return context;
};
