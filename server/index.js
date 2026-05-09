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
import crypto, { randomUUID } from 'crypto';
import cors from 'cors';
import db from './db.js';
import Anthropic from '@anthropic-ai/sdk';
import { appendCallToSheet } from './sheets.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app  = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/tts/health', (_req, res) => res.json({ ok: true, engine: 'edge-neural' }));

// ── Tenant Resolution Middleware ──────────────────────────────────────────────
const resolveTenant = (req, res, next) => {
  req.tenantId = 1; // Default tenant ID for single-tenant mode
  next();
};

// ── Tenant API ────────────────────────────────────────────────────────────────
app.get('/api/tenant/theme', resolveTenant, (req, res) => {
  const t = db.prepare('SELECT company_name,primary_color,logo_url,welcome_message FROM tenants WHERE id=?').get(req.tenantId);
  res.json(t || { company_name: 'Dialler Pro', primary_color: '#D4AF37', logo_url: null });
});

app.post('/api/tenant/setup', resolveTenant, (req, res) => {
  const { company_name, primary_color, logo_url, welcome_message, agent_id, agent_name, agent_password, agent_extension } = req.body;
  
  try {
    db.prepare('UPDATE tenants SET company_name=?, primary_color=?, logo_url=?, welcome_message=? WHERE id=?').run(
      company_name, primary_color, logo_url, welcome_message, req.tenantId
    );
    
    if (agent_id) {
      const id = randomUUID();
      db.prepare('INSERT OR IGNORE INTO agents (id,agent_id,name,password,extension,role) VALUES (?,?,?,?,?,?)').run(
        id, agent_id, agent_name, agent_password, agent_extension || 'EXT01', 'admin'
      );
    }
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
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

// ── WhatsApp Webhook ────────────────────────────────────────────────────────
app.post('/api/whatsapp/webhook', (req, res) => {
  // Verify webhook signature
  const sig = req.headers['x-hub-signature-256'];
  if (!process.env.WHATSAPP_WEBHOOK_SECRET) return res.sendStatus(200); // Skip if no secret
  
  if (sig) {
    const expected = 'sha256=' + crypto.createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
    if (sig !== expected) return res.sendStatus(403);
  }
  
  const entry = req.body.entry?.[0]?.changes?.[0]?.value;
  if (entry?.messages?.[0]) {
    const msg = entry.messages[0];
    db.prepare('INSERT INTO whatsapp_messages (phone,direction,text,ts) VALUES (?,?,?,?)').run(msg.from, 'in', msg.text?.body, msg.timestamp);
    // Future: Broadcast to WebSocket
  }
  res.sendStatus(200);
});

app.get('/api/whatsapp/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) res.send(req.query['hub.challenge']);
  else res.sendStatus(403);
});

app.get('/api/whatsapp/messages', verifyToken, (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  const rows = db.prepare('SELECT * FROM whatsapp_messages WHERE phone = ? ORDER BY ts ASC').all(phone);
  res.json({ ok: true, data: rows });
});

app.post('/api/whatsapp/messages', verifyToken, (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'Missing phone or text' });
  // Store it locally immediately
  db.prepare('INSERT INTO whatsapp_messages (phone,direction,text,ts) VALUES (?,?,?,?)').run(phone, 'out', text, Date.now().toString());
  // Future: Send to Meta API
  res.json({ ok: true });
});

// ── QA Endpoints ────────────────────────────────────────────────────────────
app.post('/api/qa/score', verifyToken, (req, res) => {
  const { callLogId, reviewerId, tenantId, greeting, pitch, objection, close, compliance, notes } = req.body;
  const total = (greeting || 0) + (pitch || 0) + (objection || 0) + (close || 0) + (compliance || 0);
  const stmt = db.prepare('INSERT INTO qa_scores (call_log_id, reviewer_id, tenant_id, score_greeting, score_pitch, score_objection, score_close, score_compliance, total_score, notes) VALUES (?,?,?,?,?,?,?,?,?,?)');
  const info = stmt.run(callLogId, reviewerId, tenantId, greeting, pitch, objection, close, compliance, total, notes);
  res.json({ ok: true, id: info.lastInsertRowid, total });
});

app.get('/api/qa/scores', verifyToken, (req, res) => {
  const { agentId } = req.query;
  const rows = agentId 
    ? db.prepare('SELECT q.* FROM qa_scores q JOIN call_logs c ON q.call_log_id = c.id WHERE c.agent_id = ?').all(agentId)
    : db.prepare('SELECT * FROM qa_scores').all();
  res.json({ ok: true, data: rows });
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

// Dummy verifyToken middleware (replace with real JWT validation later)
const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  req.user = { role: 'admin' }; // Mock user role for /api/agents
  next();
};

app.post('/api/calls', verifyToken, (req, res) => {
  const stmt = db.prepare('INSERT INTO call_logs (agent_id,agent_name,campaign,customer_name,phone,call_start,call_end,total_duration,talk_duration,disposition,disposition_label,sentiment,whatsapp_sent,recording_id,transcript, ai_summary) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const r = req.body;
  const info = stmt.run(r.agentId,r.agentName,r.campaign,r.customerName,r.phone,r.callStart,r.callEnd,r.totalDuration,r.talkDuration,r.disposition,r.dispositionLabel,r.sentiment,r.whatsappSent?1:0,r.recordingId,r.transcript, r.aiSummary || null);
  
  if (process.env.GOOGLE_SHEET_ID) {
    appendCallToSheet(process.env.GOOGLE_SHEET_ID, r).catch(console.error);
  }
  
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.get('/api/calls', verifyToken, (req, res) => {
  const { agentId, limit=100, offset=0 } = req.query;
  const q = `SELECT c.*, q.total_score as qa_score, q.id as qa_id FROM call_logs c LEFT JOIN qa_scores q ON c.id = q.call_log_id`;
  const rows = agentId
    ? db.prepare(q + ' WHERE c.agent_id=? ORDER BY c.created_at DESC LIMIT ? OFFSET ?').all(agentId, +limit, +offset)
    : db.prepare(q + ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?').all(+limit, +offset);
  res.json({ ok: true, data: rows });
});

app.post('/api/leads', verifyToken, (req, res) => {
  const r = req.body;
  const stmt = db.prepare('INSERT INTO customer_leads (name,phone,disposition,call_time,duration,sentiment,recording_id,whatsapp_sent, lead_score) VALUES (?,?,?,?,?,?,?,?,?)');
  const info = stmt.run(r.name, r.phone, r.disposition, r.time, r.duration, r.sentiment, r.recordingId, r.whatsappSent ? 1 : 0, r.leadScore || 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.get('/api/leads', verifyToken, (req, res) => {
  const { limit=200, offset=0 } = req.query;
  const rows = db.prepare('SELECT * FROM customer_leads ORDER BY created_at DESC LIMIT ? OFFSET ?').all(+limit, +offset);
  res.json({ ok: true, data: rows });
});

app.get('/api/agents', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json({ ok: true, data: db.prepare('SELECT id,agent_id,name,extension,role,status FROM agents').all() });
});

app.post('/api/agents', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { agentId, name, password, extension } = req.body;
  const id = randomUUID();
  db.prepare('INSERT INTO agents (id,agent_id,name,password,extension) VALUES (?,?,?,?,?)').run(id,agentId,name,password,extension);
  res.json({ ok: true, id });
});

// ── AI Summary ────────────────────────────────────────────────────────────────
app.post('/api/ai/summarize', verifyToken, async (req, res) => {
  const { transcript, disposition, duration, customerName } = req.body;
  if (!transcript || transcript.length < 50) return res.json({ summary: '', leadScore: 0 });
  
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `
Call transcript for ${customerName}, disposition: ${disposition}, duration: ${duration}s.
Transcript: ${transcript.slice(0, 2000)}

Respond ONLY with JSON: {
  "summary": "2-3 sentence professional call summary",
  "keyPoints": ["point1", "point2"],
  "leadScore": 0-100,
  "scoreReason": "one sentence explanation",
  "nextAction": "specific recommended next step"
}

Lead score guide: 0-20=DNC/hostile, 21-40=not interested, 41-60=lukewarm, 61-80=interested/callback, 81-100=ready to buy/sale`}]
  });
  try { res.json(JSON.parse(msg.content[0].text)); }
  catch { res.json({ summary: '', leadScore: 0 }); }
});

// ── Dialler Check ─────────────────────────────────────────────────────────────
app.get('/api/dialler/can-dial', (req, res) => {
  const { agentId } = req.query;
  if (!agentId) return res.status(400).json({ error: 'Missing agentId' });

  // Get limits
  let maxPerHour = 60, maxPerDay = 400;
  try {
    const s1 = db.prepare('SELECT value FROM settings WHERE key=?').get('dialler_max_per_hour');
    const s2 = db.prepare('SELECT value FROM settings WHERE key=?').get('dialler_max_per_day');
    if (s1) maxPerHour = parseInt(s1.value, 10);
    if (s2) maxPerDay = parseInt(s2.value, 10);
  } catch (e) {}

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const hourStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const dayCount = db.prepare('SELECT COUNT(*) as c FROM call_logs WHERE agent_id=? AND created_at >= ?').get(agentId, todayStart).c;
  const hourCount = db.prepare('SELECT COUNT(*) as c FROM call_logs WHERE agent_id=? AND created_at >= ?').get(agentId, hourStart).c;

  res.json({
    canDial: hourCount < maxPerHour && dayCount < maxPerDay,
    callsThisHour: hourCount,
    callsToday: dayCount,
    maxPerHour,
    maxPerDay
  });
});

// ── Campaigns ─────────────────────────────────────────────────────────────────
app.get('/api/campaigns', (req, res) => {
  res.json({ ok: true, data: db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all() });
});

app.post('/api/campaigns/:id/leads', (req, res) => {
  const { id } = req.params;
  const { leads } = req.body;
  if (!leads || !Array.isArray(leads)) return res.status(400).json({ error: 'Invalid leads array' });

  const stmt = db.prepare('INSERT OR IGNORE INTO customer_leads (name, phone, disposition) VALUES (?, ?, ?)');
  const updateCamp = db.prepare('UPDATE campaigns SET total_leads = total_leads + ? WHERE id = ?');

  let inserted = 0;
  db.transaction(() => {
    for (const phone of leads) {
      const info = stmt.run('Unknown', phone, 'NEW');
      if (info.changes > 0) inserted++;
    }
    if (inserted > 0) updateCamp.run(inserted, id);
  })();

  res.json({ ok: true, inserted });
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
