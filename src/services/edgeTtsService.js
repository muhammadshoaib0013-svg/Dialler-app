class EdgeTTSService {
  constructor() {
    this.audio = new Audio();
    this.audio.autoplay = true;
  }

  unlock() {
    this.audio.play().catch(() => {});
    this.audio.pause();
  }

  async speak({ text, voice = 'ur-PK-GulNeural', rate = '+0%', pitch = '+0Hz', onStart, onEnd, onError }) {
    if (onStart) onStart();

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice, rate, pitch }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      this.audio.src = url;

      this.audio.onended = () => {
        URL.revokeObjectURL(url);
        if (onEnd) onEnd();
      };

      this.audio.onerror = (err) => {
        URL.revokeObjectURL(url);
        if (onError) onError(err);
      };

      await this.audio.play();
    } catch (err) {
      if (onError) onError(err);
    }
  }

  stop() {
    this.audio.pause();
    this.audio.src = '';
  }
}

export default new EdgeTTSService();
