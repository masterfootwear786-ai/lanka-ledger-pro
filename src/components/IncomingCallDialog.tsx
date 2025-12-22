import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIncomingCall } from '@/hooks/useIncomingCall';
import { useVoiceCallContext } from '@/contexts/VoiceCallContext';

export const IncomingCallDialog = () => {
  const { incomingCall, clearIncomingCall } = useIncomingCall();
  const { answerCall, rejectCall, callState } = useVoiceCallContext();

  if (!incomingCall || callState.status !== 'idle') return null;

  const handleAnswer = async () => {
    await answerCall(
      incomingCall.callerId,
      incomingCall.callerName,
      incomingCall.offer,
      incomingCall.callLogId,
      incomingCall.signalingChannel
    );
    clearIncomingCall();
  };

  const handleReject = async () => {
    await rejectCall(incomingCall.callerId, incomingCall.callLogId, incomingCall.signalingChannel);
    clearIncomingCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
      <Card className="w-80 animate-in zoom-in-95">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Incoming Call</h3>
            <p className="text-muted-foreground">{incomingCall.callerName}</p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full w-14 h-14"
              onClick={handleReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="rounded-full w-14 h-14 bg-green-500 hover:bg-green-600"
              onClick={handleAnswer}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
