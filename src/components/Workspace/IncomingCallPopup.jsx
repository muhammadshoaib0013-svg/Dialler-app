import { PhoneOff, Phone, Voicemail, Mic, PhoneIncoming } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

// ─── Pulsing Ring Animation ────────────────────────────────────────────────────
function PulsingRings() {
  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Ring 1 – slowest / outermost */}
      <div
        className="absolute rounded-full border border-gold-500/20"
        style={{ width: 192, height: 192, animation: 'ring-pulse 2.2s ease-out 0s infinite' }}
      />
      {/* Ring 2 */}
      <div
        className="absolute rounded-full border border-gold-500/30"
        style={{ width: 152, height: 152, animation: 'ring-pulse 2.2s ease-out 0.5s infinite' }}
      />
      {/* Ring 3 – inner */}
      <div
        className="absolute rounded-full border border-gold-500/50"
        style={{ width: 112, height: 112, animation: 'ring-pulse 2.2s ease-out 1s infinite' }}
      />
      {/* Avatar */}
      <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-gold-500/25 to-gold-700/15 border-2 border-gold-500/60 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.35)]">
        <PhoneIncoming size={34} className="text-gold-400" />
      </div>
    </div>
  );
}

// ─── IVR Playing Strip ─────────────────────────────────────────────────────────
function IVRStrip() {
  const HEIGHTS = [35, 60, 85, 50, 90, 70, 55, 80, 65, 40, 75, 55];
  return (
    <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-2.5 w-full">
      <div className="flex items-end gap-0.5 h-6 shrink-0">
        {HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="w-1 bg-purple-400 rounded-full"
            style={{ height: `${h}%`, animation: `ivr-bar 0.7s ease-in-out ${i * 0.08}s infinite alternate` }}
          />
        ))}
      </div>
      <span className="text-purple-300 text-xs font-semibold tracking-wide leading-snug">
        🎙 Playing Urdu IVR welcome message…
      </span>
    </div>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────
function ActionBtn({ onClick, icon: Icon, label, color, large = false, pulse = false, ariaLabel }) {
  const sizeBtn = large ? 'w-16 h-16' : 'w-14 h-14';
  const sizeIcon = large ? 26 : 22;

  const colorMap = {
    green:  'bg-green-600 hover:bg-green-500 border-green-400/50 text-white shadow-xl shadow-green-900/40',
    red:    'bg-red-500/15 hover:bg-red-600/30 border-red-500/40 text-red-400',
    amber:  'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-400',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        className={`${sizeBtn} rounded-full border flex items-center justify-center transition-all active:scale-95 shadow-lg ${colorMap[color]} ${pulse ? 'animate-pulse' : ''}`}
        aria-label={ariaLabel}
      >
        <Icon size={sizeIcon} />
      </button>
      <span className={`text-[10px] uppercase tracking-widest font-bold ${
        color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : 'text-amber-400'
      }`}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Popup ────────────────────────────────────────────────────────────────
export default function IncomingCallPopup() {
  const {
    inboundCall,
    inboundStatus,
    ivrPlaying,
    acceptInboundCall,
    rejectInboundCall,
    sendToVoicemail,
  } = useCallContext();

  // Visible while ringing OR while IVR is talking (still "connecting")
  const visible = !!inboundCall && (inboundStatus === 'ringing' || ivrPlaying);
  if (!visible) return null;

  const isConnecting = inboundStatus === 'answered' || ivrPlaying;

  return (
    <>
      {/* ─── Injected Keyframes ─────────────────────────────────────────── */}
      <style>{`
        @keyframes ring-pulse {
          0%   { transform: scale(1);    opacity: 0.8; }
          100% { transform: scale(1.7);  opacity: 0;   }
        }
        @keyframes ivr-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1);   }
        }
        @keyframes popup-slide-in {
          from { opacity: 0; transform: scale(0.88) translateY(28px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes gold-breathe {
          0%, 100% { box-shadow: 0 0 25px rgba(212,175,55,0.15), 0 25px 50px rgba(0,0,0,0.5); }
          50%       { box-shadow: 0 0 55px rgba(212,175,55,0.40), 0 25px 50px rgba(0,0,0,0.5); }
        }
      `}</style>

      {/* ─── Backdrop ──────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-[990] bg-slate-950/75 backdrop-blur-md" />

      {/* ─── Card ──────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-gold-500/35 rounded-3xl w-full max-w-sm overflow-hidden"
          style={{ animation: 'popup-slide-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards, gold-breathe 3s ease-in-out infinite' }}
        >
          {/* Gold top line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gold-500 to-transparent shadow-[0_0_20px_rgba(212,175,55,0.9)]" />

          {/* Status badge */}
          <div className="flex justify-center pt-5 pb-3">
            <span className={`text-[10px] font-bold tracking-[0.3em] uppercase px-3 py-1 rounded-full border ${
              isConnecting
                ? 'bg-green-500/20 text-green-400 border-green-500/40'
                : 'bg-red-500/15 text-red-300 border-red-500/30 animate-pulse'
            }`}>
              {isConnecting ? '🟢 Connecting…' : '📞 Incoming Call'}
            </span>
          </div>

          {/* Body */}
          <div className="flex flex-col items-center px-7 pb-7 gap-5">
            {/* Animated rings + avatar */}
            <PulsingRings />

            {/* Caller info */}
            <div className="text-center">
              <p className="text-2xl font-bold text-white tracking-tight mb-1 leading-tight">
                {inboundCall.name}
              </p>
              <p className="text-gold-400 font-mono text-sm tracking-widest font-bold">
                {inboundCall.phone}
              </p>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1.5 font-semibold">
                Inbound · HB Electronics Queue
              </p>
            </div>

            {/* IVR strip */}
            {ivrPlaying && <IVRStrip />}

            {/* Connecting message (post-accept) */}
            {ivrPlaying && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 border border-slate-700/40 px-4 py-2 rounded-lg">
                <Mic size={13} className="text-green-400 animate-pulse shrink-0" />
                Transferring to agent workstation…
              </div>
            )}

            {/* Action buttons — only while ringing */}
            {!isConnecting && (
              <div className="w-full grid grid-cols-3 gap-3 mt-1">
                <ActionBtn
                  onClick={sendToVoicemail}
                  icon={Voicemail}
                  label="Voicemail"
                  color="amber"
                  ariaLabel="Send to voicemail"
                />
                <ActionBtn
                  onClick={acceptInboundCall}
                  icon={Phone}
                  label="Accept"
                  color="green"
                  large
                  pulse
                  ariaLabel="Accept incoming call"
                />
                <ActionBtn
                  onClick={rejectInboundCall}
                  icon={PhoneOff}
                  label="Reject"
                  color="red"
                  ariaLabel="Reject incoming call"
                />
              </div>
            )}
          </div>

          {/* Bottom gold line */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
        </div>
      </div>
    </>
  );
}
