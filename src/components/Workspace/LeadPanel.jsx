import { User, MapPin, Phone, Loader2 } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

export default function LeadPanel() {
  const { currentLeadData, callStatus } = useCallContext();

  // Nothing active yet
  if (callStatus === 'Idle' && !currentLeadData) {
    return (
      <div className="glass-panel p-8 h-full flex flex-col items-center justify-center text-slate-500 border-dashed border-2 border-slate-800 shadow-xl bg-slate-950/20">
        <User size={64} className="mb-4 opacity-20 drop-shadow-lg" />
        <p className="text-lg font-sans tracking-wide">No Active CRM Record</p>
        <p className="text-sm mt-2 text-center text-slate-600 font-mono tracking-widest max-w-sm">Dial a number to inject lead data from the Vicidial server pool.</p>
      </div>
    );
  }

  // Calling but lead data not yet injected (edge case / real SIP mode)
  if ((callStatus === 'Calling' || callStatus === 'Ringing') && !currentLeadData) {
    return (
      <div className="glass-panel p-8 h-full flex flex-col items-center justify-center shadow-xl">
        <Loader2 size={48} className="animate-spin text-gold-500 mb-6 drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
        <p className="text-gold-500 font-mono tracking-widest animate-pulse uppercase">Fetching Vicidial Lead DB...</p>
      </div>
    );
  }

  // Determine status bar appearance
  const statusConfig = {
    Calling:   { label: '⏳ Dialing…',   cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    Ringing:   { label: '🔔 Ringing…',   cls: 'bg-blue-500/20  text-blue-400  border-blue-500/30 animate-pulse' },
    Connected: { label: '🟢 Live Call',  cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    Ended:     { label: '📵 Call Ended', cls: 'bg-slate-500/20 text-slate-400 border-slate-600/30' },
  };
  const status = statusConfig[callStatus] || statusConfig.Connected;

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden shadow-xl">
      <div className="bg-slate-950/80 p-6 border-b border-slate-800 flex items-center justify-between shadow-sm">
         <h3 className="text-xl font-semibold text-white tracking-wide">Customer Details</h3>
         <span className={`px-3 py-1 rounded text-xs font-bold font-mono tracking-widest uppercase border ${status.cls}`}>
           {status.label}
         </span>
      </div>
      
      <div className="p-8 flex-1 space-y-8 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-gold-500 drop-shadow flex-shrink-0">
             <User size={28} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mb-1">Customer Primary Name</p>
            <p className="text-3xl font-bold text-slate-100 font-sans tracking-tight drop-shadow-sm">{currentLeadData?.name}</p>
          </div>
        </div>

        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-gold-500 drop-shadow flex-shrink-0">
             <Phone size={28} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mb-1">Phone Line</p>
            <p className="text-xl text-slate-100 font-mono tracking-wider bg-slate-950 px-3 py-1 rounded border border-slate-800 w-fit">{currentLeadData?.phone}</p>
          </div>
        </div>

        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-gold-500 drop-shadow flex-shrink-0">
             <MapPin size={28} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mb-1">Geographic Address</p>
            <p className="text-lg text-slate-200">{currentLeadData?.address}</p>
            <p className="text-slate-400 text-sm mt-1">{currentLeadData?.city}, {currentLeadData?.state}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
