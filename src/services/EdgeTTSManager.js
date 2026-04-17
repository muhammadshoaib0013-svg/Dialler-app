/**
 * EdgeTTSManager.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton manager for Microsoft Edge Neural TTS.
 *
 * Flow:
 *   1. POST /api/tts  →  proxy server  →  Edge WebSocket  →  MP3 binary
 *   2. Inject MP3 into HTMLAudioElement for local preview
 *   3. Optionally inject into WebRTC outgoing stream via AudioContext
 *   4. Falls back to browser SpeechSynthesis if proxy is offline
 *
 * Usage:
 *   import edgeTTS from './EdgeTTSManager';
 *   edgeTTS.speak({ text, voice, onStart, onEnd, onWord, onSubtitle });
 *   edgeTTS.stop();
 */

const PROXY_URL = '/api/tts';

class EdgeTTSManager {
  constructor() {
    this._audio      = null;   // HTMLAudioElement for current playback
    this._wordTimer  = null;
    this._running    = false;
    this._voiceNode  = null;   // AudioNode for WebRTC injection
    this._audioCtx   = null;
  }

  // ── Main speak method ──────────────────────────────────────────────────────
  async speak({
    text       = '',
    voice      = 'ur-PK-GulNeural',
    rate       = '+0%',
    pitch      = '+0Hz',
    onStart    = () => {},
    onEnd      = () => {},
    onWord     = () => {},   // (word, wordIndex)
    onSubtitle = () => {},   // (fullText)
    onError    = () => {},
    peerConnection = null,   // RTCPeerConnection — if provided, injects audio into outgoing stream
  } = {}) {
    if (!text.trim()) return;
    this.stop();
    this._running = true;

    // ─── Try proxy server ────────────────────────────────────────────────────
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, voice, rate, pitch }),
        signal:  controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);

      const blob     = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio    = new Audio(audioUrl);
      this._audio    = audio;

      // ── Optional WebRTC stream injection ───────────────────────────────────
      if (peerConnection) {
        await this._injectIntoPeerConnection(audio, peerConnection);
      }

      // ── Karaoke word-by-word simulation ───────────────────────────────────
      const words      = text.trim().split(/\s+/);
      const msPerWord  = Math.max(180, Math.min(500, (text.length / Math.max(words.length, 1)) * 55));
      let   wordIdx    = 0;

      audio.addEventListener('play', () => {
        onStart();
        onSubtitle(text);
        this._wordTimer = setInterval(() => {
          if (wordIdx < words.length) {
            onWord(words[wordIdx], wordIdx);
            wordIdx++;
          } else {
            clearInterval(this._wordTimer);
          }
        }, msPerWord);
      }, { once: true });

      audio.addEventListener('ended', () => {
        clearInterval(this._wordTimer);
        onEnd();
        onSubtitle('');
        URL.revokeObjectURL(audioUrl);
        this._audio    = null;
        this._running  = false;
      }, { once: true });

      audio.addEventListener('error', () => {
        clearInterval(this._wordTimer);
        console.warn('[EdgeTTS] Audio element error — falling back to browser TTS');
        this._browserFallback({ text, onStart, onEnd, onError });
      }, { once: true });

      await audio.play();
      return;

    } catch (err) {
      console.warn('[EdgeTTS] Proxy unavailable:', err.message, '— using browser TTS fallback');
    }

    // ─── Browser TTS fallback ────────────────────────────────────────────────
    this._browserFallback({ text, onStart, onEnd, onSubtitle, onWord, onError });
  }

  // ── Stop all playback ──────────────────────────────────────────────────────
  stop() {
    this._running = false;
    clearInterval(this._wordTimer);

    if (this._audio) {
      this._audio.pause();
      this._audio = null;
    }

    this._cleanupAudioCtx();
    window.speechSynthesis?.cancel();
  }

  // ── Inject TTS audio into WebRTC outgoing stream ──────────────────────────
  async _injectIntoPeerConnection(audioEl, pc) {
    try {
      const ctx    = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaElementSource(audioEl);
      const dest   = ctx.createMediaStreamDestination();
      source.connect(dest);        // TTS → virtual stream
      source.connect(ctx.destination); // TTS → local speakers (agent hears themselves)

      this._audioCtx = ctx;

      // Find the existing audio sender
      const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
      if (sender) {
        const ttsTrack = dest.stream.getAudioTracks()[0];
        await sender.replaceTrack(ttsTrack);

        // Restore original mic track when playback ends
        audioEl.addEventListener('ended', async () => {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const micTrack  = micStream.getAudioTracks()[0];
            await sender.replaceTrack(micTrack);
          } catch (_) {}
          this._cleanupAudioCtx();
        }, { once: true });
      }
    } catch (e) {
      console.warn('[EdgeTTS] WebRTC injection failed (non-fatal):', e.message);
    }
  }

  _cleanupAudioCtx() {
    try { this._audioCtx?.close(); } catch (_) {}
    this._audioCtx = null;
  }

  // ── Browser SpeechSynthesis fallback ──────────────────────────────────────
  _browserFallback({ text, onStart, onEnd, onSubtitle, onWord, onError }) {
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const urdu   = voices.find(v => v.lang.startsWith('ur'));
    if (urdu) utter.voice = urdu;
    utter.rate  = 0.85;
    utter.pitch = 1.0;

    utter.onstart      = () => { onStart?.(); onSubtitle?.(text); };
    utter.onend        = () => { onEnd?.(); onSubtitle?.(''); this._running = false; };
    utter.onboundary   = (e) => {
      if (e.name === 'word') {
        const word = text.substring(e.charIndex, e.charIndex + (e.charLength || 4));
        onWord?.(word, e.charIndex);
      }
    };
    utter.onerror      = (e) => onError?.(e.error);

    window.speechSynthesis.speak(utter);
  }
}

// Export as singleton
export default new EdgeTTSManager();
