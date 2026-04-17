import { PhoneIncoming, Zap, Radio } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

export default function InboundCallHandler() {
  const { simulateInboundCall, inboundCall, inboundStatus, inboundLogs } = useCallContext();

  const isRinging  = inboundCall && inboundStatus === 'ringing';
  const isAnswered = inboundCall && inboundStatus === 'answered';
  const totalInbound = inboundLogs.length;
  const answeredCount = inboundLogs.filter(l => l.status === 'answered').length;
  const missedCount   = inboundLogs.filter(l => l.status === 'missed').length;

  return (
    <div className="glass-panel px-5 py-4 flex items-center justify-between gap-4 shadow-lg">

      {/* Left — icon + label */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center shrink-0">
          <PhoneIncoming size={18} className={`text-gold-400 ${isRinging ? 'animate-bounce' : ''}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 leading-tight">Inbound Call Center</p>
          <p className="text-[10px] text-slate-500 font-mono tracking-widest truncate">
            {isRinging   ? '🔔 Incoming call ringing…' :
             isAnswered  ? '🟢 Call in progress' :
             'Queue ready · Awaiting calls'}
          </p>
        </div>
      </div>

      {/* Center — quick stats */}
      <div className="hidden md:flex items-center gap-4 shrink-0">
        <div className="text-center">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Total</p>
          <p className="text-sm font-bold text-slate-200">{totalInbound}</p>
        </div>
        <div className="w-px h-8 bg-slate-800" />
        <div className="text-center">
          <p className="text-[9px] text-green-500 uppercase tracking-widest font-mono">Answered</p>
          <p className="text-sm font-bold text-green-400">{answeredCount}</p>
        </div>
        <div className="w-px h-8 bg-slate-800" />
        <div className="text-center">
          <p className="text-[9px] text-red-500 uppercase tracking-widest font-mono">Missed</p>
          <p className="text-sm font-bold text-red-400">{missedCount}</p>
        </div>
      </div>

      {/* Right — status + simulate button */}
      <div className="flex items-center gap-3 shrink-0">
        {isRinging && (
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full animate-pulse">
            <Radio size={10} />
            RINGING
          </span>
        )}
        {isAnswered && (
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        )}
        <button
          id="simulate-inbound-btn"
          onClick={simulateInboundCall}
          disabled={!!inboundCall}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/40 hover:border-gold-500/70 text-gold-400 text-xs font-bold tracking-wider uppercase transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed shadow-lg"
          aria-label="Simulate an incoming call"
        >
          <Zap size={14} />
          <span className="hidden sm:inline">Simulate Inbound</span>
          <span className="sm:hidden">Inbound</span>
        </button>
      </div>
    </div>
  );
}
