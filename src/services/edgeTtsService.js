class EdgeTTSService {
  constructor() {
    this.audio = new Audio();
    this.audio.autoplay = true;
    this._queue = [];
    this._playing = false;
  }
  unlock() { this.audio.play().catch(()=>{}); this.audio.pause(); }
  stop() { this.audio.pause(); this.audio.src = ''; this._queue = []; this._playing = false; }
  async speak({ text, voice='ur-PK-GulNeural', rate='+0%', pitch='+0Hz', onStart, onEnd, onError }) {
    if (!text?.trim()) return;
    return new Promise(async (resolve) => {
      try {
        if (onStart) onStart();
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, rate, pitch })
        });
        if (!res.ok) throw new Error(`TTS error ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        this.audio.src = url;
        this.audio.onended = () => { URL.revokeObjectURL(url); if (onEnd) onEnd(); resolve(); };
        this.audio.onerror = (e) => { if (onError) onError(e); resolve(); };
        await this.audio.play();
      } catch(e) {
        if (onError) onError(e);
        resolve();
      }
    });
  }
}
export default new EdgeTTSService();
