/**
 * edgeTtsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend service that calls the local Edge-TTS proxy server.
 * Falls back to browser Speech Synthesis (window.speechSynthesis) if the proxy
 * is not reachable (e.g., dev without server running).
 *
 * Usage:
 *   import { edgeTtsSpeak, edgeTtsAbort } from './edgeTtsService';
 *
 *   edgeTtsSpeak({
 *     text:      'آپ کا شکریہ، ہم آپ کی مدد کے لیے حاضر ہیں',
 *     voice:     'ur-PK-GulNeural',
 *     onWord:    (word, charOffset) => highlightWord(word),
 *     onStart:   ()  => setPlaying(true),
 *     onEnd:     ()  => setPlaying(false),
 *     onSubtitle:(text) => setCurrentSubtitle(text),
 *   });
 */

const PROXY_BASE = 'http://localhost:3001/api/tts';

let _currentAudio = null; // holds the active HTMLAudioElement

// ─── Main speak function ──────────────────────────────────────────────────────
export async function edgeTtsSpeak({
  text         = '',
  voice        = 'ur-PK-GulNeural',
  rate         = '+0%',
  pitch        = '+0Hz',
  onStart      = () => {},
  onEnd        = () => {},
  onError      = () => {},
  onWord       = (_word, _index) => {},   // called per word for karaoke highlight
  onSubtitle   = (_text) => {},           // called with running subtitle text
}) {
  if (!text.trim()) return;

  // Stop any previous playback
  edgeTtsAbort();

  // ── Try Edge TTS proxy first ────────────────────────────────────────────────
  let proxyOk = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${PROXY_BASE}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, voice, rate, pitch }),
      signal:  controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      proxyOk = true;
      const blob    = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio   = new Audio(audioUrl);
      _currentAudio = audio;

      // ── Word-by-word karaoke simulation ─────────────────────────────────────
      // Since MP3 audio doesn't carry word boundary events, we simulate timing
      // based on average speaking speed (~140 words/min = ~430ms per word)
      const words = text.trim().split(/\s+/);
      let wordIndex = 0;
      const avgMsPerWord = Math.max(250, Math.min(600, (text.length / 5) * 40 / words.length * 1000));

      audio.addEventListener('play', () => {
        onStart();
        onSubtitle(text);

        // Word highlighter interval
        const wordTimer = setInterval(() => {
          if (wordIndex >= words.length) { clearInterval(wordTimer); return; }
          onWord(words[wordIndex], wordIndex);
          wordIndex++;
        }, avgMsPerWord);

        audio.addEventListener('ended', () => clearInterval(wordTimer), { once: true });
        audio.addEventListener('pause', () => clearInterval(wordTimer), { once: true });
      }, { once: true });

      audio.addEventListener('ended', () => {
        onEnd();
        URL.revokeObjectURL(audioUrl);
        _currentAudio = null;
      }, { once: true });

      audio.addEventListener('error', (e) => {
        console.warn('[EdgeTTS] Audio element error:', e);
        onError(e);
        _currentAudio = null;
        _fallbackBrowserTTS({ text, onStart, onEnd, onWord, onSubtitle });
      }, { once: true });

      await audio.play();
      return;
    }
  } catch (err) {
    console.warn('[EdgeTTS] Proxy unreachable, falling back to browser TTS:', err.message);
  }

  // ── Browser TTS fallback ────────────────────────────────────────────────────
  if (!proxyOk) {
    _fallbackBrowserTTS({ text, voice, onStart, onEnd, onWord, onSubtitle, onError });
  }
}

// ─── Stop current playback ───────────────────────────────────────────────────
export function edgeTtsAbort() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio = null;
  }
  window.speechSynthesis?.cancel();
}

// ─── Fetch available voices from proxy ──────────────────────────────────────
export async function fetchEdgeVoices() {
  try {
    const res = await fetch(`${PROXY_BASE}/voices`);
    if (res.ok) return await res.json();
  } catch { /* proxy offline */ }
  // Return built-in defaults
  return [
    { id: 'ur-PK-GulNeural',    name: 'Gul (Urdu Female)',    lang: 'ur-PK' },
    { id: 'ur-PK-SalmanNeural', name: 'Salman (Urdu Male)',   lang: 'ur-PK' },
    { id: 'en-US-AriaNeural',   name: 'Aria (English Female)',lang: 'en-US' },
    { id: 'en-US-GuyNeural',    name: 'Guy (English Male)',   lang: 'en-US' },
  ];
}

// ─── Check if proxy is online ────────────────────────────────────────────────
export async function checkProxyHealth() {
  try {
    const res = await fetch(`${PROXY_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

// ─── Browser SpeechSynthesis fallback ────────────────────────────────────────
function _fallbackBrowserTTS({ text, voice = 'ur-PK-GulNeural', onStart, onEnd, onWord, onSubtitle, onError }) {
  const utter = new SpeechSynthesisUtterance(text);

  // Try to match an Urdu voice if available
  const voices = window.speechSynthesis.getVoices();
  const urduVoice = voices.find(v =>
    v.lang.startsWith('ur') || v.name.toLowerCase().includes('urdu')
  );
  if (urduVoice) utter.voice = urduVoice;

  utter.rate  = 0.9;
  utter.pitch = 1.0;

  utter.onstart = () => {
    onStart();
    onSubtitle(text);
  };

  utter.onend = () => onEnd();

  utter.onboundary = (e) => {
    if (e.name === 'word') {
      const word = text.substring(e.charIndex, e.charIndex + e.charLength);
      onWord(word, e.charIndex);
    }
  };

  utter.onerror = (e) => {
    console.warn('[BrowserTTS] Error:', e.error);
    onError?.(e);
  };

  window.speechSynthesis.speak(utter);
}
