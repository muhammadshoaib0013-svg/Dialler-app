import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'dialler.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT,
    agent_name TEXT,
    campaign TEXT,
    customer_name TEXT,
    phone TEXT,
    call_start TEXT,
    call_answer TEXT,
    call_end TEXT,
    total_duration INTEGER,
    ring_duration INTEGER,
    talk_duration INTEGER,
    disposition TEXT,
    disposition_label TEXT,
    sentiment TEXT,
    whatsapp_sent TEXT,
    recording_id TEXT,
    recording_url TEXT,
    transcript TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customer_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    disposition TEXT,
    call_time TEXT,
    duration INTEGER,
    sentiment TEXT,
    recording_id TEXT,
    whatsapp_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
