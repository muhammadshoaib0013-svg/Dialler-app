/**
 * Edge TTS Proxy Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges the browser to Microsoft Edge's Neural TTS WebSocket API.
 * Run with:  node server/index.js
 * Port:      3001  (proxied by Vite in dev via vite.config.js)
 *
 * Microsoft Edge TTS WebSocket endpoint (no API key required):
 * wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1
 *   ?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4
 *   &ConnectionId=<uuid>
 */

import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import cors from 'cors';

const app  = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/tts/health', (_req, res) => res.json({ ok: true, engine: 'edge-neural' }));

// ── HTTP POST  /api/tts  → returns MP3 binary ─────────────────────────────────
// Body: { text, voice, rate, pitch }
app.post('/api/tts', async (req, res) => {
  const {
    text  = 'Hello, this is Edge Neural TTS.',
    voice = 'ur-PK-GulNeural',
    rate  = '+0%',
    pitch = '+0Hz',
  } = req.body;

  const EDGE_WS_URL =
    'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1' +
    `?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${randomUUID()}`;

  let resolved = false;
  const audioChunks = [];

  try {
    const ws = new WebSocket(EDGE_WS_URL, {
      headers: {
        'Pragma':          'no-cache',
        'Cache-Control':   'no-cache',
        'Origin':          'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
      },
    });

    ws.on('open', () => {
      const ts = new Date().toUTCString();
      const reqId = randomUUID().replace(/-/g, '');

      // ── Config message ────────────────────────────────────────────────────
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: { metadataoptions: { sentenceBoundaryEnabled: true, wordBoundaryEnabled: true }, outputFormat: 'audio-24khz-48kbitrate-mono-mp3' },
            },
          },
        })
      );

      // ── SSML synthesis request ────────────────────────────────────────────
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ur-PK'>` +
        `<voice name='${voice}'>` +
        `<prosody rate='${rate}' pitch='${pitch}'>` +
        escapeXml(text) +
        `</prosody></voice></speak>`;

      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${ts}\r\nPath:ssml\r\n\r\n${ssml}`
      );
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        // Binary message = audio chunk (after the header separator)
        const buf = Buffer.from(data);
        // Edge TTS prefixes binary messages with a text header ending in \r\n\r\n
        const separator = buf.indexOf(Buffer.from('Path:audio\r\n'));
        if (separator !== -1) {
          const audioStart = separator + 'Path:audio\r\n'.length;
          audioChunks.push(buf.slice(audioStart));
        } else {
          audioChunks.push(buf);
        }
      } else {
        const msg = data.toString();
        if (msg.includes('Path:turn.end')) {
          ws.close();
          if (!resolved) {
            resolved = true;
            const audio = Buffer.concat(audioChunks);
            res.set('Content-Type', 'audio/mpeg');
            res.set('Content-Disposition', 'inline; filename="tts.mp3"');
            res.send(audio);
          }
        }
      }
    });

    ws.on('error', (err) => {
      console.error('[EdgeTTS] WebSocket error:', err.message);
      if (!resolved) { resolved = true; res.status(502).json({ error: err.message }); }
    });

    ws.on('close', () => {
      if (!resolved && audioChunks.length) {
        resolved = true;
        const audio = Buffer.concat(audioChunks);
        res.set('Content-Type', 'audio/mpeg');
        res.send(audio);
      } else if (!resolved) {
        resolved = true;
        res.status(504).json({ error: 'Edge TTS closed without audio' });
      }
    });

    // Timeout guard
    setTimeout(() => {
      if (!resolved) { resolved = true; ws.terminate(); res.status(504).json({ error: 'TTS timeout' }); }
    }, 15000);

  } catch (err) {
    console.error('[EdgeTTS] Fatal:', err);
    if (!resolved) res.status(500).json({ error: err.message });
  }
});

// ── Available voices list ─────────────────────────────────────────────────────
app.get('/api/tts/voices', (_req, res) => {
  res.json([
    { id: 'ur-PK-GulNeural',    name: 'Gul (Urdu Female)',    lang: 'ur-PK', gender: 'Female' },
    { id: 'ur-PK-SalmanNeural', name: 'Salman (Urdu Male)',   lang: 'ur-PK', gender: 'Male'   },
    { id: 'en-US-AriaNeural',   name: 'Aria (English Female)',lang: 'en-US', gender: 'Female' },
    { id: 'en-US-GuyNeural',    name: 'Guy (English Male)',   lang: 'en-US', gender: 'Male'   },
    { id: 'en-GB-SoniaNeural',  name: 'Sonia (British Female)',lang:'en-GB', gender: 'Female' },
    { id: 'ar-SA-ZariyahNeural',name: 'Zariyah (Arabic Female)',lang:'ar-SA',gender: 'Female' },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
function escapeXml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`\n✅ Edge-TTS Proxy running → http://localhost:${PORT}`);
  console.log('   POST /api/tts          → returns MP3 audio');
  console.log('   GET  /api/tts/voices   → list available voices');
  console.log('   GET  /api/tts/health   → health check\n');
});
