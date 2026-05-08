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
import db from './db.js';

const app  = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/tts/health', (_req, res) => res.json({ ok: true, engine: 'edge-neural' }));

// ── Call Logs ────────────────────────────────────────────────────────────────
app.post('/api/calls', (req, res) => {
  const { agentId, agentName, campaign, customerName, phone, callStartTime, callAnswerTime, callEndTime, totalDuration, ringDuration, talkDuration, disposition, dispositionLabel, sentiment, whatsappSent, recordingId, recordingUrl, transcript } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO call_logs (
        agent_id, agent_name, campaign, customer_name, phone, call_start, call_answer, call_end, total_duration, ring_duration, talk_duration, disposition, disposition_label, sentiment, whatsapp_sent, recording_id, recording_url, transcript
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(agentId, agentName, campaign, customerName, phone, callStartTime, callAnswerTime, callEndTime, totalDuration, ringDuration, talkDuration, disposition, dispositionLabel, sentiment, whatsappSent, recordingId, recordingUrl, transcript);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error('Insert call_logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calls', (req, res) => {
  const { agentId, limit = 100 } = req.query;
  try {
    const stmt = db.prepare(`SELECT * FROM call_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?`);
    const logs = stmt.all(agentId, parseInt(limit, 10));
    res.json(logs);
  } catch (err) {
    console.error('Get call_logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Customer Leads ────────────────────────────────────────────────────────────
app.post('/api/leads', (req, res) => {
  const { name, phone, disposition, time, duration, sentiment, recordingId, whatsappSent } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO customer_leads (
        name, phone, disposition, call_time, duration, sentiment, recording_id, whatsapp_sent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, phone, disposition, time, duration, sentiment, recordingId, whatsappSent ? 1 : 0);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error('Insert customer_leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads', (req, res) => {
  const { limit = 200 } = req.query;
  try {
    const stmt = db.prepare(`SELECT * FROM customer_leads ORDER BY created_at DESC LIMIT ?`);
    const leads = stmt.all(parseInt(limit, 10));
    res.json(leads);
  } catch (err) {
    console.error('Get customer_leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leads/:id', (req, res) => {
  try {
    const stmt = db.prepare(`DELETE FROM customer_leads WHERE id = ?`);
    stmt.run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete customer_leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── VOS3000 Ping ─────────────────────────────────────────────────────────────
app.post('/api/vos/ping', (req, res) => {
  const { serverIp, wssPort } = req.body;
  if (!serverIp || !wssPort) return res.status(400).json({ ok: false, error: 'Missing serverIp or wssPort' });

  const start = Date.now();
  const ws = new WebSocket(`wss://${serverIp}:${wssPort}/ws`);
  
  const timeout = setTimeout(() => {
    if (ws.readyState !== WebSocket.CLOSED) ws.terminate();
    res.json({ ok: false, error: 'Timeout' });
  }, 3000);

  ws.on('open', () => {
    clearTimeout(timeout);
    ws.close();
    res.json({ ok: true, latency: Date.now() - start });
  });

  ws.on('error', (err) => {
    clearTimeout(timeout);
    res.json({ ok: false, error: err.message });
  });
});

// ── VOS3000 Balance ──────────────────────────────────────────────────────────
app.get('/api/vos/balance', async (req, res) => {
  const { serverIp, apiKey } = req.query;
  try {
    const response = await fetch(`http://${serverIp}/api/balance`);
    if (response.ok) {
      const data = await response.json();
      res.json({ ok: true, balance: data.balance ?? 0 });
    } else {
      res.json({ ok: false, balance: null });
    }
  } catch (err) {
    res.json({ ok: false, balance: null, error: err.message });
  }
});

// ── WhatsApp Business Cloud API ──────────────────────────────────────────────
app.post('/api/whatsapp/send', async (req, res) => {
  const { to, customerName, disposition, recordingId, agentName = 'Agent' } = req.body;
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return res.status(500).json({ ok: false, error: 'WhatsApp credentials missing' });
  }

  // Format Pakistani phone number
  let phone = String(to).replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '92' + phone.substring(1);
  } else if (!phone.startsWith('92') && phone.length === 10) {
    phone = '92' + phone;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

  let templateName = null;
  if (disposition === 'SALE') templateName = 'order_confirmation';
  if (disposition === 'CBHOLD') templateName = 'callback_scheduled';

  const sendTextFallback = async (errorMsg) => {
    console.warn(`[WhatsApp] Template failed (${errorMsg}), trying text fallback for ${phone}`);
    const textMsg = `Thank you ${customerName}! Your order has been confirmed by ${agentName}. Recording: ${recordingId}`;
    try {
      const fallbackRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: textMsg }
        })
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackRes.ok) {
        return res.json({ ok: true, messageId: fallbackData.messages?.[0]?.id, fallback: true });
      } else {
        return res.json({ ok: false, error: fallbackData.error?.message || 'Fallback failed' });
      }
    } catch (err) {
      return res.json({ ok: false, error: err.message });
    }
  };

  if (templateName) {
    try {
      const templateRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'ur' }
          }
        })
      });
      const data = await templateRes.json();
      if (templateRes.ok) {
        return res.json({ ok: true, messageId: data.messages?.[0]?.id });
      } else {
        await sendTextFallback(data.error?.message);
      }
    } catch (err) {
      await sendTextFallback(err.message);
    }
  } else {
    await sendTextFallback('No template mapped');
  }
});

// ── HTTP POST  /api/auth/login ──────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (adminUser && adminPass && username === adminUser && password === adminPass) {
    return res.json({ ok: true, role: 'admin' });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

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
