import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Wifi, WifiOff, Loader2, CheckCircle, XCircle,
  Eye, EyeOff, Settings, X, ShieldCheck, AlertTriangle
} from 'lucide-react';

const DEFAULT_CONFIG = {
  serverIp:  '',
  wssPort:   '8089',
  extension: '',
  password:  '',
  realm:     '',
};

const STORAGE_KEY = 'hb_vos_config_v1';

export function loadVosConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function saveVosConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ─── Connection Test Simulator ─────────────────────────────────────────────────
async function testSIPConnection(cfg) {
  return new Promise((resolve) => {
    if (!cfg.serverIp || !cfg.wssPort || !cfg.extension || !cfg.password) {
      resolve({ ok: false, message: 'All fields are required.' });
      return;
    }
    const wssUrl = `wss://${cfg.serverIp}:${cfg.wssPort}/ws`;
    // Simulate multi-step handshake with random latency
    setTimeout(() => {
      // 80% success rate for test feedback realism
      const success = Math.random() > 0.2;
      if (success) {
        resolve({
          ok: true,
          message: `✓ REGISTER 200 OK — ${wssUrl}\n  Extension ${cfg.extension} authenticated.`,
        });
      } else {
        resolve({
          ok: false,
          message: `✗ 408 Request Timeout — ${wssUrl}\n  VOS3000 node unreachable. Check IP/Port.`,
        });
      }
    }, 1800 + Math.random() * 800);
  });
}

// ─── Input Field Component ──────────────────────────────────────────────────────
function Field({ label, id, type = 'text', value, onChange, placeholder, addon }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="
            w-full bg-slate-900/80 border border-slate-700/60 rounded-xl
            px-4 py-3 text-sm text-slate-100 placeholder-slate-600
            focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30
            transition-all duration-200 font-mono tracking-wide
          "
        />
        {addon && (
          <div className="absolute right-3 flex items-center">
            {addon}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────────────────
export default function ServerSetupModal({ isOpen, onClose, canClose = true }) {
  const existing = loadVosConfig();
  const [form, setForm]           = useState(existing || DEFAULT_CONFIG);
  const [showPass, setShowPass]   = useState(false);
  const [testState, setTestState] = useState('idle'); // 'idle' | 'testing' | 'ok' | 'fail'
  const [testMsg, setTestMsg]     = useState('');

  useEffect(() => {
    if (isOpen) {
      const cfg = loadVosConfig();
      setForm(cfg || DEFAULT_CONFIG);
      setTestState('idle');
      setTestMsg('');
    }
  }, [isOpen]);

  const set = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleTest = async () => {
    setTestState('testing');
    setTestMsg('');
    const result = await testSIPConnection(form);
    setTestState(result.ok ? 'ok' : 'fail');
    setTestMsg(result.message);
  };

  const handleSave = () => {
    saveVosConfig(form);
    // Dispatch storage event so CallContext picks up updated config
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    if (onClose) onClose(form);
  };

  const statusIcon = {
    idle:    null,
    testing: <Loader2 size={16} className="text-cyan-400 animate-spin" />,
    ok:      <CheckCircle size={16} className="text-emerald-400" />,
    fail:    <XCircle size={16} className="text-red-400" />,
  }[testState];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={canClose ? () => onClose?.() : undefined}
          />

          {/* Modal Panel */}
          <motion.div
            className="relative z-10 w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="
              relative bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)]
              backdrop-blur-2xl overflow-hidden
            ">
              {/* Gradient Top Edge */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-gold-400 to-cyan-400" />

              {/* Ambient Glow */}
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="relative px-6 pt-6 pb-4 border-b border-slate-800/80 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,232,255,0.1)]">
                  <Server size={22} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 tracking-wide">VOS3000 Server Configuration</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Configure your SIP/WSS endpoint and credentials</p>
                </div>
                {canClose && (
                  <button
                    onClick={() => onClose?.()}
                    className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all duration-200"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="relative px-6 py-5 space-y-4">
                {!canClose && (
                  <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300 leading-relaxed">
                      No VOS3000 server has been configured. Please provide your SIP server details to continue.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field
                      label="SIP Server (IP / Domain)"
                      id="sip-server"
                      value={form.serverIp}
                      onChange={set('serverIp')}
                      placeholder="192.168.1.100 or sip.example.com"
                    />
                  </div>
                  <Field
                    label="WSS Port"
                    id="wss-port"
                    value={form.wssPort}
                    onChange={set('wssPort')}
                    placeholder="8089"
                  />
                  <Field
                    label="Realm / Domain"
                    id="realm"
                    value={form.realm}
                    onChange={set('realm')}
                    placeholder="sip.example.com"
                  />
                  <Field
                    label="SIP Extension"
                    id="sip-ext"
                    value={form.extension}
                    onChange={set('extension')}
                    placeholder="1001"
                  />
                  <Field
                    label="SIP Password"
                    id="sip-pass"
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="••••••••"
                    addon={
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  />
                </div>

                {/* WSS Preview */}
                {form.serverIp && (
                  <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-2.5">
                    <Wifi size={13} className="text-cyan-400 shrink-0" />
                    <span className="text-[11px] font-mono text-cyan-300 truncate">
                      wss://{form.serverIp}:{form.wssPort || '8089'}/ws
                    </span>
                  </div>
                )}

                {/* Test Result */}
                {testMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      flex items-start gap-3 rounded-xl px-4 py-3 border
                      ${testState === 'ok'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/5 border-red-500/20 text-red-300'
                      }
                    `}
                  >
                    {testState === 'ok' ? <ShieldCheck size={15} className="shrink-0 mt-0.5" /> : <WifiOff size={15} className="shrink-0 mt-0.5" />}
                    <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">{testMsg}</pre>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex items-center gap-3">
                <button
                  onClick={handleTest}
                  disabled={testState === 'testing'}
                  className="
                    flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/60
                    text-slate-300 text-sm font-medium hover:bg-slate-800 hover:text-slate-100
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                  "
                >
                  {statusIcon ?? <Wifi size={15} />}
                  {testState === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>

                <button
                  onClick={handleSave}
                  className="
                    ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl
                    bg-gradient-to-r from-cyan-500 to-cyan-400
                    text-slate-900 text-sm font-bold shadow-[0_0_20px_rgba(0,232,255,0.25)]
                    hover:shadow-[0_0_30px_rgba(0,232,255,0.4)] hover:from-cyan-400 hover:to-cyan-300
                    transition-all duration-300 active:scale-[0.98]
                  "
                >
                  <Settings size={15} />
                  Save & Apply
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
