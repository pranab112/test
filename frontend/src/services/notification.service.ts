// Notification sound service
class NotificationService {
  private audioContext: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    this.initAudio();
    this.loadSoundPreference();
  }

  private initAudio() {
    // Create a simple notification sound using Web Audio API
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
  }

  private loadSoundPreference() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('notification_sound_enabled');
      this.soundEnabled = stored !== 'false';
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('notification_sound_enabled', String(enabled));
    }
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  // Play a pleasant notification sound using Web Audio API
  playNotificationSound(type: 'message' | 'promotion' | 'alert' = 'message') {
    if (!this.soundEnabled || !this.audioContext) return;

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different tones for different notification types
      switch (type) {
        case 'message':
          // Pleasant two-tone chime for messages
          oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
          oscillator.frequency.setValueAtTime(1100, this.audioContext.currentTime + 0.1); // C#6
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + 0.3);
          break;

        case 'promotion':
          // Celebratory sound for promotions
          oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
          oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
          oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + 0.4);
          break;

        case 'alert':
          // Alert sound
          oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
          oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + 0.2);
          break;
      }

      oscillator.type = 'sine';
    } catch (e) {
      console.warn('Failed to play notification sound:', e);
    }
  }
}

export const notificationService = new NotificationService();
