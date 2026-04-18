/**
 * EdgeTTS.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Direct Client-Side WebSocket Bridge for Microsoft Edge Neural TTS.
 * 100% Free, bypasses Vercel backend.
 */

class EdgeTTS {
  constructor() {
    this.ws = null;
    this.chunks = [];
    this.isPlaying = false;
    this.audioElement = new Audio();
    this.callbacks = {};
    this.wordTimer = null;
    this._running = false;
  }

  unlock() {
    // Play a silent blob to unlock audio context on user gesture
    if (this.audioElement.src === '') {
        this.audioElement.src = 'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
    }
    this.audioElement.play().then(() => {
        this.audioElement.pause();
    }).catch(e => {});
  }

  _generateId() {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  _dateToString() {
    return new Date().toString();
  }

  async speak({
    text = '',
    voice = 'ur-PK-GulNeural',
    onStart = () => {},
    onSubtitle = () => {},
    onWord = () => {},
    onEnd = () => {},
    onError = () => {}
  } = {}) {
    if (!text.trim()) return;
    this.stop();

    this.callbacks = { onStart, onSubtitle, onWord, onEnd, onError };
    this.chunks = [];
    this._running = true;
    
    this.callbacks.onStart();
    this.callbacks.onSubtitle(text);

    return new Promise((resolve) => {
      this.ws = new WebSocket('wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4');
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        const reqId = this._generateId();
        
        const configMsg = `X-Timestamp:${this._dateToString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
        this.ws.send(configMsg);

        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody rate='+0%' pitch='+0Hz'>${text}</prosody></voice></speak>`;
        const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${this._dateToString()}Z\r\nPath:ssml\r\n\r\n${ssml}`;
        this.ws.send(ssmlMsg);
      };

      this.ws.onmessage = (e) => {
        if (typeof e.data === 'string') {
          if (e.data.includes('Path:audio.metadata')) {
             try {
                const parts = e.data.split('\r\n\r\n');
                if (parts.length > 1) {
                   const meta = JSON.parse(parts[1]);
                   if (meta && meta.Metadata && meta.Metadata.length > 0) {
                      meta.Metadata.forEach(m => {
                         if(m.Type === 'WordBoundary') {
                             this.callbacks.onWord(m.Data.text || '', m.Data.Offset);
                         }
                      });
                   }
                }
             } catch(err) {}
          }
          if (e.data.includes('Path:turn.end')) {
             if (!this.isPlaying && this.chunks.length > 0) {
                this._playFullAudio(text);
             } else if (this.chunks.length === 0) {
                this.callbacks.onSubtitle('');
                this.callbacks.onEnd();
             }
             try { this.ws.close(); } catch(err) {}
          }
        } else if (e.data instanceof ArrayBuffer) {
          const headerLengthStr = new Uint8Array(e.data.slice(0, 2));
          const headerLength = (headerLengthStr[0] << 8) | headerLengthStr[1];
          const audioChunk = e.data.slice(headerLength + 2);
          
          if (audioChunk.byteLength > 0) {
             this.chunks.push(new Uint8Array(audioChunk));
          }
        }
      };

      this.ws.onerror = (err) => {
        console.error('[EdgeTTS] WebRTC WebSocket error:', err);
        this.callbacks.onError(err);
        this.callbacks.onEnd();
        resolve();
      };
      
      this.ws.onclose = () => {
         if (!this.isPlaying && this.chunks.length > 0) {
            this._playFullAudio(text);
         }
         resolve();
      };
    });
  }

  _playFullAudio(text) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    let totalLen = 0;
    for (let c of this.chunks) totalLen += c.length;
    
    const fullBuf = new Uint8Array(totalLen);
    let offset = 0;
    for (let c of this.chunks) {
       fullBuf.set(c, offset);
       offset += c.length;
    }

    const blob = new Blob([fullBuf], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    this.audioElement.src = url;
    
    const words = text.trim().split(/\s+/);
    const msPerWord = Math.max(180, Math.min(500, (text.length / Math.max(words.length, 1)) * 55));
    let wordIdx = 0;

    this.audioElement.onplay = () => {
       this.callbacks.onSubtitle(text);
       this.wordTimer = setInterval(() => {
          if (wordIdx < words.length) {
            this.callbacks.onWord(words[wordIdx], wordIdx);
            wordIdx++;
          } else {
            clearInterval(this.wordTimer);
          }
       }, msPerWord);
    };

    this.audioElement.onended = () => {
       this.isPlaying = false;
       clearInterval(this.wordTimer);
       this.callbacks.onSubtitle('');
       this.callbacks.onEnd();
    };

    this.audioElement.onerror = (e) => {
       console.error("Audio playback error", e);
       this.isPlaying = false;
       clearInterval(this.wordTimer);
       this.callbacks.onError(e);
       this.callbacks.onEnd();
    };

    this.audioElement.play().catch(e => {
       console.warn("Autoplay prevented", e);
       this.isPlaying = false;
       this.callbacks.onEnd();
    });
  }

  stop() {
    this._running = false;
    clearInterval(this.wordTimer);
    if (this.ws) {
      try { this.ws.close(); } catch(e) {}
      this.ws = null;
    }
    this.chunks = [];
    this.isPlaying = false;
    if (this.audioElement) {
      try { this.audioElement.pause(); } catch(e) {}
    }
  }
}

export default new EdgeTTS();
