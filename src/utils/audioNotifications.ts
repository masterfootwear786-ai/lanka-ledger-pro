// Audio notification utilities using Web Audio API
class AudioNotifications {
  private audioContext: AudioContext | null = null;
  private isPlaying: Map<string, boolean> = new Map();
  private oscillators: Map<string, OscillatorNode> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  private getContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  // Incoming call ringtone - classic phone ring pattern
  playIncomingRing(): void {
    if (this.isPlaying.get('incoming')) return;
    this.isPlaying.set('incoming', true);

    const playRingCycle = () => {
      if (!this.isPlaying.get('incoming')) return;
      
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      // Ring pattern: two tones alternating
      const now = ctx.currentTime;
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(480, now + 0.2);
      oscillator.frequency.setValueAtTime(440, now + 0.4);
      oscillator.frequency.setValueAtTime(480, now + 0.6);
      
      // Fade out
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.8);
      
      oscillator.start(now);
      oscillator.stop(now + 0.8);
    };

    playRingCycle();
    const interval = setInterval(playRingCycle, 2000);
    this.intervals.set('incoming', interval);
  }

  stopIncomingRing(): void {
    this.isPlaying.set('incoming', false);
    const interval = this.intervals.get('incoming');
    if (interval) {
      clearInterval(interval);
      this.intervals.delete('incoming');
    }
  }

  // Outgoing call ringback tone - continuous ring-ring pattern
  playOutgoingRing(): void {
    if (this.isPlaying.get('outgoing')) return;
    this.isPlaying.set('outgoing', true);

    const playRingbackCycle = () => {
      if (!this.isPlaying.get('outgoing')) return;
      
      const ctx = this.getContext();
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Standard ringback frequencies (US style)
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      oscillator1.frequency.value = 440;
      oscillator2.frequency.value = 480;
      gainNode.gain.value = 0.15;
      
      const now = ctx.currentTime;
      
      // 2 seconds on, 4 seconds off pattern
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.setValueAtTime(0.15, now + 1.9);
      gainNode.gain.linearRampToValueAtTime(0, now + 2);
      
      oscillator1.start(now);
      oscillator2.start(now);
      oscillator1.stop(now + 2);
      oscillator2.stop(now + 2);
    };

    playRingbackCycle();
    const interval = setInterval(playRingbackCycle, 4000);
    this.intervals.set('outgoing', interval);
  }

  stopOutgoingRing(): void {
    this.isPlaying.set('outgoing', false);
    const interval = this.intervals.get('outgoing');
    if (interval) {
      clearInterval(interval);
      this.intervals.delete('outgoing');
    }
  }

  // Message notification sound - short pleasant chime
  playMessageNotification(): void {
    const ctx = this.getContext();
    
    // Create a pleasant notification chime
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    
    // Two-note chime (like iMessage)
    playNote(880, now, 0.15);        // A5
    playNote(1318.5, now + 0.1, 0.2); // E6
  }

  // Call connected sound
  playCallConnected(): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 600;
    gainNode.gain.value = 0.2;
    
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
    
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  // Call ended sound
  playCallEnded(): void {
    const ctx = this.getContext();
    
    const playTone = (frequency: number, startTime: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.2;
      
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.linearRampToValueAtTime(0, startTime + 0.2);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    };

    const now = ctx.currentTime;
    playTone(480, now);
    playTone(380, now + 0.15);
    playTone(280, now + 0.3);
  }

  // Stop all sounds
  stopAll(): void {
    this.stopIncomingRing();
    this.stopOutgoingRing();
  }
}

export const audioNotifications = new AudioNotifications();