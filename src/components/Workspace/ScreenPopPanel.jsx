import { X, User, Phone, Clock, ShieldCheck, PhoneIncoming, AlertCircle } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

// ─── Disposition Config ────────────────────────────────────────────────────────
const DISPO_STYLE = {
  SALE:   'bg-green-500/20 text-green-400 border-green-500/30',
  CBHOLD: 'bg-blue-500/20  text-blue-400  border-blue-500/30',
  DNC:    'bg-red-500/20   text-red-400   border-red-500/30',
  NI:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  A:      'bg-slate-600/40 text-slate-400 border-slate-600/30',
  DEC:    'bg-slate-700/40 text-slate-400 border-slate-700/30',
  HANGUP: 'bg-slate-600/40 text-slate-400 border-slate-600/30',
};

const DISPO_LABEL = {
  SALE: 'Sale', CBHOLD: 'Callback', DNC: 'DNC',
  NI: 'Not Int.', A: 'Ans. Mach', DEC: 'Declined', HANGUP: 'Hung Up',
};

// ─── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5">
      <div className="w-7 h-7 rounded-md bg-slate-800/60 border border-slate-700/40 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-gold-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">{label}</p>
        <p className={`text-sm text-slate-100 font-semibold truncate ${mono ? 'font-mono text-gold-400 tracking-widest' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ScreenPopPanel() {
  const { screenPopData, closeScreenPop, inboundStatus, inboundCall } = useCallContext();

  if (!screenPopData && !inboundCall) return null;

  const { lead, callHistory } = screenPopData || { lead: inboundCall, callHistory: [] };
  const hasHistory    = callHistory && callHistory.length > 0;
  const isCRMMatched  = !!(lead?.disposition !== undefined || hasHistory);

  return (
    <div
      className="glass-panel h-full flex flex-col overflow-hidden shadow-xl"
      style={{ animation: 'screen-pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
    >
      <style>{`
        @keyframes screen-pop-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-gold-500/12 via-gold-500/8 to-transparent p-4 border-b border-gold-500/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
            <PhoneIncoming size={14} className="text-gold-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-gold-400 uppercase tracking-widest leading-tight">Screen Pop</p>
            <p className="text-[10px] text-slate-500 font-mono">Inbound CRM Match</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border tracking-widest ${
            inboundStatus === 'answered'
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            {inboundStatus === 'answered' ? '🟢 Live' : '📲 Pop'}
          </span>
          <button
            onClick={closeScreenPop}
            className="w-6 h-6 rounded-md text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center"
            aria-label="Close screen pop"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3.5 flex-1 overflow-y-auto custom-scrollbar">

        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-700/10 border-2 border-gold-500/40 flex items-center justify-center text-gold-400 shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <User size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mb-0.5">Customer</p>
            <p className="text-xl font-bold text-white leading-tight truncate">{lead?.name || '—'}</p>
            {lead?.id && (
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">ID: {lead.id}</p>
            )}
          </div>
        </div>

        {/* Phone */}
        <InfoRow icon={Phone} label="Phone Line" value={lead?.phone || '—'} mono />

        {/* CRM match badge */}
        {isCRMMatched ? (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-lg px-3 py-2">
            <ShieldCheck size={13} className="text-green-400 shrink-0" />
            <span className="text-[10px] text-green-400 font-semibold">
              ✓ CRM record matched from lead database
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="text-amber-400 shrink-0" />
            <span className="text-[10px] text-amber-400 font-semibold">
              New contact — no existing CRM record
            </span>
          </div>
        )}

        {/* Previous Call History */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-slate-500" />
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Previous Call History
              </span>
            </div>
            {hasHistory && (
              <span className="text-[9px] bg-gold-500/20 text-gold-400 border border-gold-500/30 px-1.5 py-0.5 rounded-full font-bold">
                {callHistory.length} record{callHistory.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {hasHistory ? (
            <div className="space-y-1.5">
              {callHistory.slice(0, 6).map((log, i) => {
                const ts = log.time || log.callEndTime;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-900/50 border border-slate-800/60 rounded-lg px-3 py-2 hover:border-slate-700/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-mono leading-tight">
                        {ts ? new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                        {' · '}
                        {ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {log.duration ?? 0}s · {log.campaign || 'Outbound'}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border tracking-wider ${
                      DISPO_STYLE[log.disposition] || DISPO_STYLE.HANGUP
                    }`}>
                      {DISPO_LABEL[log.disposition] || log.disposition || '—'}
                    </span>
                  </div>
                );
              })}
              {callHistory.length > 6 && (
                <p className="text-[9px] text-slate-600 font-mono text-center pt-1">
                  + {callHistory.length - 6} more records
                </p>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800/50 border-dashed rounded-lg px-3 py-5 text-center">
              <p className="text-[10px] text-slate-600 font-mono">No previous interactions found</p>
              <p className="text-[10px] text-slate-700 mt-0.5">First time contact</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
