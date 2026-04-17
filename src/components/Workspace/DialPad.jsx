import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Delete, SmilePlus, Meh, Frown, Sparkles, UserCheck } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

// ─── Sentiment Badge ───────────────────────────────────────────────────────────
const SENTIMENT_CONFIG = {
  positive: { icon: SmilePlus, label: 'Positive', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
  neutral:  { icon: Meh,       label: 'Neutral',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  negative: { icon: Frown,     label: 'Negative', cls: 'text-red-400   bg-red-500/10   border-red-500/30'   },
};

function SentimentBadge({ sentiment }) {
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-500 ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Wave Bar Visualizer ───────────────────────────────────────────────────────
function WaveBars() {
  const [heights, setHeights] = useState(() => Array.from({ length: 16 }, () => Math.random() * 80 + 20));

  useEffect(() => {
    const id = setInterval(() => {
      setHeights(Array.from({ length: 16 }, () => Math.random() * 80 + 20));
    }, 150);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex gap-1 h-10 items-center justify-center mb-6 w-full max-w-xs mx-auto">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-2 bg-gold-400 rounded-sm shadow-[0_0_6px_rgba(212,175,55,0.5)]"
          style={{ height: `${h}%`, transition: 'height 0.12s ease-in-out' }}
        />
      ))}
    </div>
  );
}

// ─── Live Transcript Panel ─────────────────────────────────────────────────────
function TranscriptPanel({ transcriptLines, sentimentScore, isTTSPlaying, currentSubtitle }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptLines.length, currentSubtitle]);

  return (
    <div className="w-full mt-4 bg-slate-950/90 border border-slate-800/80 rounded-xl overflow-hidden backdrop-blur-sm flex flex-col" style={{ maxHeight: '200px', minHeight: '80px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800 shrink-0">
        <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 ${isTTSPlaying ? 'text-purple-400' : 'text-gold-400'}`}>
          {isTTSPlaying ? '🎤 AI Broadcasting' : '📝 Live Transcript'}
        </span>
        <SentimentBadge sentiment={sentimentScore} />
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
        {/* TTS subtitle overlay (auto-dialer mode) */}
        {isTTSPlaying && currentSubtitle && (
          <p className="text-purple-300 text-xs text-center font-medium leading-relaxed animate-pulse px-2">
            "{currentSubtitle}"
          </p>
        )}

        {/* Simulated transcript (manual call mode) */}
        {!isTTSPlaying && transcriptLines.length === 0 && (
          <p className="text-slate-600 italic text-xs text-center py-4 animate-pulse">
            Waiting for audio stream…
          </p>
        )}

        {!isTTSPlaying && transcriptLines.map((line, i) => (
          <div
            key={i}
            className={`flex gap-2 items-start transcript-slide-in ${line.role === 'customer' ? 'flex-row-reverse' : ''}`}
          >
            {line.role === 'system' ? (
              <span className="w-full text-center text-[10px] font-mono text-purple-400 opacity-80 my-1">
                {line.text}
              </span>
            ) : (
              <>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 leading-tight ${
                    line.role === 'agent'
                      ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                      : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'
                  }`}
                >
                  {line.role === 'agent' ? 'AGT' : 'CST'}
                </span>
                <span className={`text-xs leading-relaxed ${line.role === 'agent' ? 'text-slate-200' : 'text-slate-400'}`}>
                  {line.text}
                  <span className="ml-1.5 text-[9px] text-slate-600">{line.timestamp}</span>
                </span>
              </>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DialPad() {
  const [number, setNumber] = useState('');
  const inputRef = useRef(null);
  const {
    callStatus, activeSIPCall,
    makeCall, endCall,
    isMuting, handleMute,
    callDuration, isRecording,
    isTTSPlaying, currentSubtitle,
    transcriptLines, sentimentScore,
    isAISpeaking, agentHandedOff, transferToAgent,
  } = useCallContext();

  const handleDialClick = () => {
    if (callStatus === 'Idle' && number.trim()) {
      makeCall(number.trim());
      setNumber('');
    }
  };

  // ── Global Keyboard Listener ────────────────────────────────────────────────
  // Captures physical key presses from anywhere on the page when Idle.
  // Skips if another input/textarea/select is currently focused.
  useEffect(() => {
    if (callStatus !== 'Idle') return;

    const handler = (e) => {
      // Don't hijack keys when user is typing in search bars or other inputs
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isOtherInput = (tag === 'input' && document.activeElement !== inputRef.current)
        || tag === 'textarea'
        || tag === 'select';
      if (isOtherInput) return;

      // Reject modifier combos (Ctrl+C, Ctrl+V etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const digit = e.key.replace('Numpad', '').replace('Digit', '');

      if (/^[0-9*#+]$/.test(e.key)) {
        e.preventDefault();
        setNumber(prev => prev + e.key);
        inputRef.current?.focus();
      } else if (e.code?.startsWith('Numpad') && /^[0-9*]$/.test(e.key)) {
        e.preventDefault();
        setNumber(prev => prev + e.key);
        inputRef.current?.focus();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setNumber(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleDialClick();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus, number]);

  // Local keyDown for the input field (Enter to dial)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleDialClick();
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isCallActive = callStatus !== 'Idle';

  // ── Active Call View ─────────────────────────────────────────────────────────
  if (isCallActive) {
    return (
      <div className="glass-panel p-5 flex flex-col items-center shadow-xl h-full font-sans relative overflow-hidden">
        {/* Gold accent bar */}
        <div className={`absolute top-0 left-0 w-full h-0.5 shadow-[0_0_15px_rgba(212,175,55,0.6)] bg-gradient-to-r from-transparent via-gold-500 to-transparent`} />
        
        {/* AI Gradient override if AI speaking */}
        {isAISpeaking && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-pulse" />
        )}

        {/* Recording badge */}
        {isRecording && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-950/60 border border-red-900/50 px-2.5 py-1 rounded-full shadow-lg z-10">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
            <span className="text-red-400 text-[10px] font-bold tracking-widest uppercase">
              {isTTSPlaying || isAISpeaking ? 'Broadcasting' : 'REC'}
            </span>
          </div>
        )}

        {/* Call state badge */}
        <div className={`mt-4 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border transition-all duration-300 ${
          callStatus === 'Calling'   ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
          callStatus === 'Ringing'   ? 'bg-blue-500/20  text-blue-400  border-blue-500/40  animate-pulse' :
          isAISpeaking               ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
          agentHandedOff             ? 'bg-green-500/20 text-green-400 border-green-500/40' :
          callStatus === 'Connected' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
          callStatus === 'Ended'     ? 'bg-slate-500/20 text-slate-400 border-slate-600/40' :
                                       'bg-slate-700/30 text-slate-500 border-slate-700'
        }`}>
          {callStatus === 'Calling'   ? '⏳ Calling…'   :
           callStatus === 'Ringing'   ? '🔔 Ringing…'   :
           isAISpeaking               ? '🤖 AI Assistant Speaking'   :
           agentHandedOff             ? '🙋‍♂️ Human Agent Active' :
           callStatus === 'Connected' ? '🟢 Connected'   :
           callStatus === 'Ended'     ? '📵 Ending…'    : 'Active Session'}
        </div>

        {/* Number display */}
        <div className="mt-2 text-3xl font-mono text-white tracking-widest mb-1 drop-shadow-md text-center">
          {activeSIPCall}
        </div>

        {/* Duration */}
        <div className="text-2xl font-mono text-gold-400 mb-4 font-bold">
          {formatTime(callDuration)}
        </div>

        {/* Wave visualizer */}
        {callStatus === 'Connected' && (
           <div className={`flex gap-1 h-10 items-center justify-center w-full max-w-xs mx-auto mb-4 ${isAISpeaking ? 'opacity-100' : ''}`}>
             <WaveBars />
             {/* Add a subtle overlay color for AI vs Human */}
             <div className={`absolute inset-0 pointer-events-none mix-blend-color ${isAISpeaking ? 'bg-purple-600/40' : ''}`}></div>
           </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 w-full justify-center mb-2 px-4">
           {/* Transfer to Agent button - Only show during AI speaking */}
           {isAISpeaking && !agentHandedOff && (
              <button 
                onClick={transferToAgent}
                className="flex-1 max-w-[140px] flex items-center justify-center gap-1.5 py-3 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-lg shadow-black/20 transition-all active:scale-95 text-xs font-bold uppercase tracking-wider group"
              >
                 <UserCheck size={16} className="text-purple-400 group-hover:text-purple-300" />
                 Take Over
              </button>
           )}

           {!isAISpeaking && (
              <button
                onClick={handleMute}
                className={`flex items-center justify-center p-4 rounded-full border shadow-lg transition-all active:scale-95 ${
                  isMuting
                    ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-red-900/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {isMuting ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
           )}

          <button
            onClick={endCall}
            className="flex items-center justify-center p-4 rounded-full bg-red-600 hover:bg-red-500 border border-red-500 text-white shadow-xl shadow-red-900/40 transition-all active:scale-95"
          >
            <PhoneOff size={24} />
          </button>
        </div>


      </div>
    );
  }

  // ── Idle Dial Pad ──────────────────────────────────────────────────────────
  return (
    <div className="glass-panel p-6 flex flex-col items-center shadow-xl h-full">
      {/* Number input */}
      <div className="w-full relative mb-5">
        <input
          ref={inputRef}
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/[^0-9+*#]/g, ''))}
          onKeyDown={handleKeyDown}
          placeholder="Enter number…"
          className="w-full text-center text-3xl font-mono bg-slate-950 border border-slate-800 focus:border-gold-500/50 text-slate-100 py-4 rounded-lg tracking-widest outline-none shadow-inner transition-colors"
          aria-label="Phone number input"
        />
        {number && (
          <button
            onClick={() => setNumber(n => n.slice(0, -1))}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-gold-400 transition-colors"
            aria-label="Delete last digit"
          >
            <Delete size={24} />
          </button>
        )}
      </div>

      {/* Digit grid */}
      <div className="grid grid-cols-3 gap-3 mb-5 w-full max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
          <button
            key={digit}
            onClick={() => setNumber(n => n + digit)}
            className="h-14 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-2xl font-medium text-slate-200 transition-all shadow flex items-center justify-center tracking-tight select-none"
            aria-label={`Digit ${digit}`}
          >
            {digit}
          </button>
        ))}
      </div>

      {/* Call button */}
      <button
        onClick={handleDialClick}
        disabled={!number.trim()}
        className="w-full max-w-[280px] flex justify-center items-center gap-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-4 rounded-full font-bold text-base shadow-lg shadow-green-900/30 transition-all active:scale-95 tracking-widest uppercase select-none"
        aria-label="Connect outbound call"
      >
        <Phone size={22} className={number.trim() ? 'animate-pulse' : ''} />
        Connect Outbound
      </button>
    </div>
  );
}
