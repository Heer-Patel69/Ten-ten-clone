export class BackgroundKeepAlive {
  private static instance: BackgroundKeepAlive | null = null;
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  private constructor() {}

  public static getInstance(): BackgroundKeepAlive {
    if (!BackgroundKeepAlive.instance) {
      BackgroundKeepAlive.instance = new BackgroundKeepAlive();
    }
    return BackgroundKeepAlive.instance;
  }

  public enable() {
    if (this.isPlaying) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioContext = new AudioContextClass();
      
      // Create an oscillator (sound generator)
      this.oscillator = this.audioContext.createOscillator();
      this.oscillator.type = 'sine';
      this.oscillator.frequency.value = 440; // A4 note

      // Create a gain node to control volume
      this.gainNode = this.audioContext.createGain();
      
      // Set volume to absolute zero (silent)
      this.gainNode.gain.value = 0;

      // Connect: Oscillator -> Gain -> Destination (speakers)
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Start the silent loop
      this.oscillator.start();
      this.isPlaying = true;

      // Register MediaSession so the OS thinks it's a media app playing in background
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'WalkieTalk Connection',
          artist: 'Listening for voice...',
          album: 'WalkieTalk App',
          artwork: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        // Set action handlers so it shows up nicely on the lock screen
        navigator.mediaSession.setActionHandler('play', () => { /* Prevent default play/pause */ });
        navigator.mediaSession.setActionHandler('pause', () => { /* Prevent default play/pause */ });
      }

    } catch (e) {
      console.warn('Background Keep-Alive failed to initialize:', e);
    }
  }

  public disable() {
    if (!this.isPlaying) return;
    
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isPlaying = false;
  }
}

export const keepAlive = BackgroundKeepAlive.getInstance();
