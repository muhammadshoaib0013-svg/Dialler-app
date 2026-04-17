import { useState } from 'react';
import { Volume2, Sparkles, Copy, CheckCheck, Lock } from 'lucide-react';
import { useCallContext, configureTTSVoice } from '../../context/CallContext';
import { useAdminContext } from '../../context/AdminContext';

// ─── Main Component ────────────────────────────────────────────────────────────
const SCRIPT_TEMPLATES_FALLBACK = [
  { title: 'Introduction', text: 'Assalam-o-Alaikum [Customer Name]! This is Hassan calling from HB Electronics.' },
  { title: 'Warranty & Delivery', text: '[Customer Name], all our appliances come with a 2-year warranty and free delivery.' },
  { title: 'Closing', text: "Perfect, [Customer Name]! I'll lock in that exclusive price for you right now." },
  { title: 'Payment Confirmation', text: 'Thank you, [Customer Name]! We accept EasyPaisa, JazzCash, bank transfer, and COD.' },
];

export default function ScriptPanel() {
  const { callStatus, setIsTTSPlaying, setCurrentSubtitle, currentLeadData, activeScriptSection } = useCallContext();
  const { scriptTemplates } = useAdminContext();
  const SCRIPT_TEMPLATES = scriptTemplates?.length ? scriptTemplates : SCRIPT_TEMPLATES_FALLBACK;
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Resolve the live customer name or fall back to a readable placeholder
  const customerName = currentLeadData?.name || '[Customer Name]';

  /** Replace [Customer Name] in any script text with the live lead name */
  const resolveScript = (template) =>
    template.replace(/\[Customer Name\]/g, customerName);

  /** Play a quick script via TTS */
  const playQuickScript = (rawText) => {
    if (callStatus !== 'Connected') return;

    const text = resolveScript(rawText);

    window.speechSynthesis.cancel();
    setIsTTSPlaying(true);
    setCurrentSubtitle('Quick action triggered…');

    const utterance = new SpeechSynthesisUtterance(text);
    configureTTSVoice(utterance, text);

    utterance.onboundary = (event) => {
      const i = event.charIndex;
      const chunk = text.slice(Math.max(0, i - 30), i + 40);
      setCurrentSubtitle('…' + chunk.replace(/\n/g, ' ') + '…');
    };

    utterance.onend = () => {
      setIsTTSPlaying(false);
      setCurrentSubtitle('');
    };

    window.speechSynthesis.speak(utterance);
  };

  /** Copy resolved script to clipboard */
  const copyToClipboard = async (rawText, index) => {
    try {
      await navigator.clipboard.writeText(resolveScript(rawText));
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = resolveScript(rawText);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }
  };

  const isConnected = callStatus === 'Connected';

  return (
    <div className="glass-panel p-6 shadow-xl flex flex-col h-full min-h-0 font-sans border border-slate-700/50">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sparkles size={18} className="text-gold-400" />
          Quick Actions
        </h3>
        {!isConnected && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-slate-500 bg-slate-800/60 border border-slate-700 px-2 py-1 rounded tracking-widest uppercase">
            <Lock size={9} /> Call Required
          </span>
        )}
      </div>

      {/* Live customer context pill */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Context:</span>
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
          currentLeadData
            ? 'bg-gold-500/10 text-gold-400 border-gold-500/30'
            : 'bg-slate-800/60 text-slate-500 border-slate-700'
        }`}>
          {currentLeadData ? customerName : 'No Active Lead'}
        </span>
      </div>

      {/* Script cards — each must be flex-shrink-0 to prevent compression and enable scroll */}
      <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1" style={{ flex: '1 1 0', minHeight: 0 }}>
        {SCRIPT_TEMPLATES.map((script, idx) => {
          const isCopied = copiedIndex === idx;
          const resolved = resolveScript(script.text);
          const isActive = activeScriptSection === script.title;

          return (
            <div
              key={idx}
              className={`flex-shrink-0 bg-slate-900/70 border rounded-xl transition-all relative group overflow-hidden ${
                isActive ? 'border-gold-500/50 shadow-[0_0_15px_rgba(212,175,55,0.2)] bg-slate-800/80 scale-[1.02]' :
                isConnected
                  ? 'border-slate-700/80 hover:border-gold-500/40 hover:bg-slate-800/60 cursor-pointer'
                  : 'border-slate-800/50 opacity-50 cursor-not-allowed'
              }`}
            >
              {/* Left color bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${script.colorBar} rounded-l-xl ${isActive ? 'animate-pulse' : ''}`} />

              <div className="pl-4 pr-3 pt-3 pb-3">
                {/* Title row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${script.badge}`}>
                      {script.title}
                    </span>
                    {isActive && (
                      <span className="text-[9px] text-gold-400 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={10} /> Active
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className={`flex items-center gap-1.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {/* Copy button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(script.text, idx); }}
                      disabled={!isConnected}
                      title="Copy to clipboard"
                      className={`p-1.5 rounded-lg border transition-all ${
                        isCopied
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-gold-400 hover:border-gold-500/40'
                      }`}
                    >
                      {isCopied ? <CheckCheck size={13} /> : <Copy size={13} />}
                    </button>

                    {/* TTS Play button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); playQuickScript(script.text); }}
                      disabled={!isConnected}
                      title="Play via Text-to-Speech"
                      className="p-1.5 rounded-lg border bg-slate-800 text-slate-400 border-slate-700 hover:text-gold-400 hover:border-gold-500/40 transition-all"
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Script text with resolved name */}
                <p className={`text-xs leading-relaxed line-clamp-3 transition-colors ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                  {resolved}
                </p>

                {/* Copied flash */}
                {isCopied && (
                  <div className="mt-2 text-[10px] text-green-400 flex items-center gap-1 font-bold">
                    <CheckCheck size={10} /> Copied to clipboard
                  </div>
                )}
              </div>

              {/* Full-card click → TTS */}
              {isConnected && (
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => playQuickScript(script.text)}
                  role="button"
                  aria-label={`Play script: ${script.title}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
