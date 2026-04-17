import { useState } from 'react';
import { CheckCircle, Clock, Ban, PhoneOff, Target, MessageSquare } from 'lucide-react';
import { viciApi } from '../../services/viciApi';
import { useCallContext } from '../../context/CallContext';

const DISPOSITIONS = [
  { code: 'SALE',   label: 'Completed Sale',  color: 'bg-green-600',  hcolor: 'hover:bg-green-500',  shadow: 'shadow-green-900/30',  icon: <Target      size={20} /> },
  { code: 'CBHOLD', label: 'Call Back',        color: 'bg-blue-600',   hcolor: 'hover:bg-blue-500',   shadow: 'shadow-blue-900/30',   icon: <Clock       size={20} /> },
  { code: 'DNC',    label: 'Do Not Call',      color: 'bg-red-700',    hcolor: 'hover:bg-red-600',    shadow: 'shadow-red-900/30',    icon: <Ban         size={20} /> },
  { code: 'NI',     label: 'Not Interested',   color: 'bg-orange-600', hcolor: 'hover:bg-orange-500', shadow: 'shadow-orange-900/30', icon: <PhoneOff    size={20} /> },
  { code: 'A',      label: 'Answering Mach',   color: 'bg-slate-600',  hcolor: 'hover:bg-slate-500',  shadow: 'shadow-slate-900/30',  icon: <MessageSquare size={20} /> },
  { code: 'DEC',    label: 'Declined',          color: 'bg-slate-700',  hcolor: 'hover:bg-slate-600',  shadow: 'shadow-slate-900/30',  icon: <CheckCircle size={20} /> },
];

export default function DispositionGrid() {
  const { agentAuth, callStatus, disposeAndLog, currentLeadData } = useCallContext();
  const [loadingCode, setLoadingCode] = useState(null);
  const [successCode, setSuccessCode] = useState(null);

  const handleDisposition = async (code) => {
    if (loadingCode || successCode) return; // prevent double-click

    setLoadingCode(code);

    try {
      // Attempt real Vicidial API — silently swallowed in mock mode
      await viciApi.dispoCall(
        code,
        agentAuth.username,
        agentAuth.password,
        agentAuth.extension,
        currentLeadData?.id || ''
      );
    } catch (e) {
      console.warn('[DispositionGrid] API unavailable (mock mode):', e.message);
    } finally {
      // Always log & end call — works in both mock and real mode
      disposeAndLog(code, currentLeadData);
      setLoadingCode(null);

      // Flash success state on the clicked button
      setSuccessCode(code);
      setTimeout(() => setSuccessCode(null), 1500);
    }
  };

  // Buttons are locked when no call is active
  const isLocked = callStatus === 'Idle' && !loadingCode;

  return (
    <div className="glass-panel p-6 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          Disposition Protocol
          <span className="text-xs font-mono text-slate-500 tracking-widest">(Call Results)</span>
        </h3>
        {isLocked && (
          <span className="text-[10px] font-bold font-mono text-red-400 bg-red-500/10 px-2.5 py-1 border border-red-500/20 rounded tracking-widest uppercase">
            Awaiting Active Call
          </span>
        )}
      </div>

      {/* Disposition buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
        {DISPOSITIONS.map(disp => {
          const isLoading = loadingCode === disp.code;
          const isSuccess = successCode === disp.code;

          return (
            <button
              key={disp.code}
              disabled={isLocked}
              onClick={() => handleDisposition(disp.code)}
              className={`
                relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl text-sm font-bold
                transition-all duration-200 shadow-md active:scale-95 overflow-hidden
                ${isLocked
                  ? 'opacity-25 cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700'
                  : isSuccess
                    ? 'bg-gold-500 text-slate-950 border border-gold-400 shadow-gold-900/30 scale-95'
                    : `${disp.color} ${disp.hcolor} text-white border border-white/10 ${disp.shadow} shadow-lg`
                }
              `}
              aria-label={`Dispose as ${disp.label}`}
            >
              {/* Success shimmer overlay */}
              {isSuccess && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-xl" />
              )}

              {/* Icon / Spinner */}
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isSuccess ? (
                <CheckCircle size={20} className="text-slate-950" />
              ) : (
                <div className="scale-110">{disp.icon}</div>
              )}

              <span className="tracking-wide text-xs text-center leading-tight">
                {isSuccess ? '✓ Done' : disp.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
