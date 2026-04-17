import { useState, useEffect } from 'react';
import { Headphones, MessageSquare, Radio, X, ShieldAlert } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

// ─── Duration Formatter ────────────────────────────────────────────────────────
function fmtDur(secs) {
  if (!secs && secs !== 0) return '00:00';
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Toast Notification ────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-6 right-6 z-[980] flex items-center gap-3 bg-slate-800/95 backdrop-blur-sm border border-gold-500/30 text-slate-200 text-xs px-5 py-3.5 rounded-2xl shadow-2xl"
      style={{ animation: 'toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
    >
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(15px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
      <Radio size={14} className="text-gold-400 shrink-0 animate-pulse" />
      <span className="font-medium leading-snug">{message}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-1">
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Live Duration Hook ────────────────────────────────────────────────────────
function useLiveDurations(calls) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // returns a function to compute seconds live
  return (call) => Math.floor((Date.now() - call.startTime) / 1000);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SupervisorPanel() {
  const { supervisorCalls } = useCallContext();
  const [toast, setToast]   = useState(null);
  const getDuration         = useLiveDurations(supervisorCalls);

  const showToast = (msg) => setToast(msg);

  return (
    <>
      <div className="glass-panel p-5 shadow-xl flex flex-col h-full">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <ShieldAlert size={16} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 leading-tight">Supervisor Console</h3>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest">Live Inbound Monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-blue-500/12 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {supervisorCalls.length} Live
          </div>
        </div>

        {/* ── Table or Empty ───────────────────────────────────────────── */}
        {supervisorCalls.length > 0 ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-slate-500 border-b border-slate-800">
                  <th className="pb-2.5 text-left pl-1 font-semibold">Agent</th>
                  <th className="pb-2.5 text-left font-semibold">Phone</th>
                  <th className="pb-2.5 text-right font-semibold">Duration</th>
                  <th className="pb-2.5 text-center font-semibold" colSpan={2}>Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {supervisorCalls.map((call) => {
                  const dur = getDuration(call);
                  return (
                    <tr key={call.id} className="hover:bg-slate-800/20 transition-colors group">
                      {/* Agent */}
                      <td className="py-3 pl-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_5px_rgba(74,222,128,0.7)] animate-pulse" />
                          <span className="text-slate-200 font-semibold truncate max-w-[85px]">{call.agent}</span>
                        </div>
                      </td>
                      {/* Phone */}
                      <td className="py-3 font-mono text-gold-400 text-[10px] tracking-wider">{call.phone}</td>
                      {/* Duration */}
                      <td className="py-3 text-right font-mono font-bold text-green-400 text-[11px] tabular-nums">
                        {fmtDur(dur)}
                      </td>
                      {/* Listen */}
                      <td className="py-3 text-center">
                        <button
                          onClick={() => showToast(`🎧 Monitoring ${call.agent}'s inbound call silently…`)}
                          title="Listen (silent monitor)"
                          className="w-7 h-7 rounded-lg bg-blue-500/12 hover:bg-blue-500/30 border border-blue-500/25 hover:border-blue-500/50 text-blue-400 flex items-center justify-center transition-all active:scale-90 mx-auto"
                          aria-label={`Listen to ${call.agent}`}
                        >
                          <Headphones size={12} />
                        </button>
                      </td>
                      {/* Whisper */}
                      <td className="py-3 text-center">
                        <button
                          onClick={() => showToast(`💬 Whisper active — ${call.agent} can hear you, customer cannot`)}
                          title="Whisper to agent"
                          className="w-7 h-7 rounded-lg bg-purple-500/12 hover:bg-purple-500/30 border border-purple-500/25 hover:border-purple-500/50 text-purple-400 flex items-center justify-center transition-all active:scale-90 mx-auto"
                          aria-label={`Whisper to ${call.agent}`}
                        >
                          <MessageSquare size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-6">
            <Headphones size={36} className="opacity-20 mb-3" />
            <p className="text-xs font-mono text-center">No active inbound calls</p>
            <p className="text-[10px] text-slate-700 mt-1 font-mono text-center">Simulate an inbound call to see live data</p>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 shrink-0">
          <p className="text-[9px] text-slate-600 font-mono text-center tracking-widest uppercase">
            Mock Supervisor Mode · Listen &amp; Whisper Enabled
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
