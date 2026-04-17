/**
 * LiveSubtitleSystem.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time dual-track subtitle engine:
 *   • AGENT voice  → webkitSpeechRecognition (mic input, interim results)
 *   • CUSTOMER voice → WebRTC remote stream VAD (Voice Activity Detection)
 *     + optional server-side ASR label
 *
 * Usage:
 *   const sys = new LiveSubtitleSystem({ onTranscript, onSubtitle, onSentiment });
 *   sys.start(remoteStream);   // remoteStream = MediaStream from WebRTC peer
 *   sys.stop();
 */

const POSITIVE_WORDS = ['yes','ok','sure','great','perfect','interested',
  'good','fine','agree','haan','theek','bilkul','zaroor','acha'];
const NEGATIVE_WORDS = ['no','not','busy','later','remove','stop','nahi',
  'nay','mat','band','nahin','mushkil','problem'];

export class LiveSubtitleSystem {
  constructor({ onTranscript, onSubtitle, onSentiment, onError, lang = 'ur-PK' } = {}) {
    this.onTranscript = onTranscript || (() => {});
    this.onSubtitle   = onSubtitle   || (() => {});
    this.onSentiment  = onSentiment  || (() => {});
    this.onError      = onError      || (() => {});
    this.lang         = lang;

    this._recognition = null;
    this._audioCtx    = null;
    this._vadTimer    = null;
    this._running     = false;
    this._customerSpeaking = false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  start(remoteStream = null) {
    this._running = true;
    this._startAgentRecognition();
    if (remoteStream) this._startCustomerVAD(remoteStream);
  }

  stop() {
    this._running = false;

    try { this._recognition?.abort(); } catch (_) {}
    this._recognition = null;

    clearInterval(this._vadTimer);
    this._vadTimer = null;

    try { this._audioCtx?.close(); } catch (_) {}
    this._audioCtx = null;
    this._customerSpeaking = false;
  }

  setLang(lang) {
    this.lang = lang;
    if (this._recognition) {
      this._recognition.abort();
      // onend handler will restart
    }
  }

  // ── Agent recognition (mic) ───────────────────────────────────────────────
  _startAgentRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.onError('SpeechRecognition not supported — use Chrome/Edge');
      return;
    }

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.lang            = this.lang;

    rec.onstart = () => {};

    rec.onresult = (event) => {
      let interim = '';
      let final_  = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final_ += t;
        else interim += t;
      }

      // Real-time subtitle (interim)
      if (interim) this.onSubtitle(interim);

      // Committed transcript line
      if (final_.trim()) {
        this.onTranscript({
          role:      'agent',
          text:      final_.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        this.onSubtitle('');
        this._analyzeSentiment(final_);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      this.onError(`Recognition error: ${e.error}`);
    };

    rec.onend = () => {
      if (this._running) {
        // Auto-restart after brief pause
        setTimeout(() => {
          if (this._running) {
            try { rec.start(); } catch (_) {}
          }
        }, 300);
      }
    };

    try {
      rec.start();
      this._recognition = rec;
    } catch (e) {
      this.onError(`Cannot start recognition: ${e.message}`);
    }
  }

  // ── Customer VAD via WebRTC remote stream ─────────────────────────────────
  _startCustomerVAD(remoteStream) {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const src  = ctx.createMediaStreamSource(remoteStream);
      const anal = ctx.createAnalyser();
      anal.fftSize = 512;
      src.connect(anal);
      this._audioCtx = ctx;

      const buf   = new Uint8Array(anal.frequencyBinCount);
      const SPEAK_THRESHOLD  = 25;  // avg amplitude to detect speech onset
      const SILENCE_HOLD_MS  = 700; // ms of silence before "stopped speaking"
      let silenceStart = null;

      this._vadTimer = setInterval(() => {
        anal.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;

        if (avg > SPEAK_THRESHOLD) {
          silenceStart = null;
          if (!this._customerSpeaking) {
            this._customerSpeaking = true;
            this.onSubtitle('Customer is speaking...');
          }
        } else {
          if (this._customerSpeaking) {
            if (!silenceStart) {
              silenceStart = Date.now();
            } else if (Date.now() - silenceStart > SILENCE_HOLD_MS) {
              this._customerSpeaking = false;
              silenceStart = null;
              this.onSubtitle('');
              // Emit a customer turn marker
              this.onTranscript({
                role:      'customer',
                text:      '[ Customer responded ]',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }
          }
        }
      }, 100);
    } catch (e) {
      console.warn('[LiveSubtitle] VAD setup failed:', e.message);
    }
  }

  // ── Keyword sentiment ─────────────────────────────────────────────────────
  _analyzeSentiment(text) {
    const lower = text.toLowerCase();
    if (POSITIVE_WORDS.some(w => lower.includes(w))) {
      this.onSentiment('positive');
    } else if (NEGATIVE_WORDS.some(w => lower.includes(w))) {
      this.onSentiment('negative');
    }
    // neutral = no change (keep current)
  }
}
