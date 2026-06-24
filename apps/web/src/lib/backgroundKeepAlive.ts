class HTMLAudioKeepAlive {
  private silentAudio: HTMLAudioElement | null = null;
  private isEnabled = false;

  enable() {
    if (this.isEnabled) return;
    if (typeof window === 'undefined') return;

    try {
      // 1-second silent WAV file base64
      const silentBase64 = 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      
      let audio = document.getElementById('silent-keep-alive') as HTMLAudioElement | null;
      if (!audio) {
        audio = new Audio('data:audio/wav;base64,' + silentBase64);
        audio.id = 'silent-keep-alive';
        audio.loop = true;
        // Keep volume extremely low but non-zero to prevent iOS from discarding it
        audio.volume = 0.01; 
        audio.setAttribute('playsinline', 'true');
        
        // Prevent it from showing up in lock screen media controls on some devices
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'WalkieTalk Connection',
            artist: 'Listening for voice...',
          });
        }

        document.body.appendChild(audio);
      }

      this.silentAudio = audio;
      this.silentAudio.play().catch(e => {
        console.warn('Silent audio keep-alive play failed:', e);
      });
      
      this.isEnabled = true;
    } catch (e) {
      console.warn('Background Keep-Alive failed to initialize:', e);
    }
  }

  disable() {
    if (this.silentAudio) {
      this.silentAudio.pause();
      this.silentAudio.currentTime = 0;
    }
    this.isEnabled = false;
  }
}

export const keepAlive = new HTMLAudioKeepAlive();
