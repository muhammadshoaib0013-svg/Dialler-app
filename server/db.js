import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'dialler.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    agent_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    extension TEXT,
    role TEXT DEFAULT 'agent',
    status TEXT DEFAULT 'offline',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT, agent_name TEXT, campaign TEXT,
    customer_name TEXT, phone TEXT,
    call_start TEXT, call_answer TEXT, call_end TEXT,
    total_duration INTEGER, ring_duration INTEGER, talk_duration INTEGER,
    disposition TEXT, disposition_label TEXT,
    sentiment TEXT, whatsapp_sent INTEGER DEFAULT 0,
    recording_id TEXT, recording_url TEXT,
    transcript TEXT, ai_summary TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS customer_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, phone TEXT UNIQUE, email TEXT,
    disposition TEXT, call_time TEXT, duration INTEGER,
    sentiment TEXT, lead_score INTEGER DEFAULT 0,
    recording_id TEXT, whatsapp_sent INTEGER DEFAULT 0,
    notes TEXT, callback_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, script_id INTEGER,
    status TEXT DEFAULT 'active',
    total_leads INTEGER DEFAULT 0, contacted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT DEFAULT 'Dialler Pro',
    primary_color TEXT DEFAULT '#D4AF37',
    logo_url TEXT,
    welcome_message TEXT
  );
  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL,
    text TEXT,
    ts TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS qa_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_log_id INTEGER REFERENCES call_logs(id),
    reviewer_id TEXT,
    tenant_id TEXT,
    score_greeting INTEGER,
    score_pitch INTEGER,
    score_objection INTEGER,
    score_close INTEGER,
    score_compliance INTEGER,
    total_score INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES ('dialler_max_per_hour', '60');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('dialler_max_per_day', '400');
  INSERT OR IGNORE INTO tenants (id, company_name) VALUES (1, 'Dialler Pro');
  CREATE INDEX IF NOT EXISTS idx_calls_agent ON call_logs(agent_id);
  CREATE INDEX IF NOT EXISTS idx_calls_created ON call_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_leads_phone ON customer_leads(phone);
`);
export default db;
