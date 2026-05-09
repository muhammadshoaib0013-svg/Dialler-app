import { useState, useEffect, useRef } from 'react';
import { Volume2, Sparkles, Copy, CheckCheck, Lock } from 'lucide-react';
import { useCallContext, configureTTSVoice } from '../../context/CallContext';
import { useAdminContext } from '../../context/AdminContext';

export default function ScriptPanel() {
  const { 
    callStatus, setIsTTSPlaying, setCurrentSubtitle, currentLeadData, activeScriptSection,
    recommendedScriptSection, currentScriptSection, setCurrentScriptSection 
  } = useCallContext();
  
  const { scriptTemplates } = useAdminContext();
  const activeTemplate = scriptTemplates?.[0]; // Assume using first active template
  
  const [copiedKey, setCopiedKey] = useState(null);
  
  // Refs for scrolling
  const scrollContainerRef = useRef(null);
  const sectionRefs = useRef({});

  // Auto-scroll logic when recommendation changes
  useEffect(() => {
    if (recommendedScriptSection && sectionRefs.current[recommendedScriptSection]) {
      sectionRefs.current[recommendedScriptSection].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [recommendedScriptSection]);

  const customerName = currentLeadData?.name || '[Customer Name]';

  const resolveScript = (templateText) =>
    templateText.replace(/\[Customer Name\]/g, customerName);

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
      setCurrentSubtitle('…' + chunk.replace(/\\n/g, ' ') + '…');
    };
    utterance.onend = () => { setIsTTSPlaying(false); setCurrentSubtitle(''); };
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = async (rawText, key) => {
    const txt = resolveScript(rawText);
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  const isConnected = callStatus === 'Connected';

  if (!activeTemplate || !activeTemplate.sections) {
    return <div className="glass-panel p-6 shadow-xl flex flex-col h-full items-center justify-center text-slate-500">No script sections found.</div>;
  }

  const sections = Object.entries(activeTemplate.sections);

  return (
    <div className="glass-panel p-6 shadow-xl flex flex-col h-full min-h-0 font-sans border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sparkles size={18} className="text-gold-400" />
          Live Script
        </h3>
        {!isConnected && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-slate-500 bg-slate-800/60 border border-slate-700 px-2 py-1 rounded tracking-widest uppercase">
            <Lock size={9} /> Call Required
          </span>
        )}
      </div>

      {/* Live context & Tabs */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Context:</span>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
            currentLeadData ? 'bg-gold-500/10 text-gold-400 border-gold-500/30' : 'bg-slate-800/60 text-slate-500 border-slate-700'
          }`}>
            {currentLeadData ? customerName : 'No Active Lead'}
          </span>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {sections.map(([key, sec]) => {
            const isRecommended = key === recommendedScriptSection;
            const isCurrent = key === currentScriptSection;
            return (
              <button
                key={key}
                onClick={() => {
                  setCurrentScriptSection(key);
                  if (sectionRefs.current[key]) {
                    sectionRefs.current[key].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
                  isRecommended ? 'bg-gold-500/20 text-gold-400 border-gold-500/50 animate-pulse' :
                  isCurrent ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Script Sections Scroller */}
      <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 pb-4" style={{ flex: '1 1 0', minHeight: 0 }} ref={scrollContainerRef}>
        {sections.map(([key, sec]) => {
          const isCopied = copiedKey === key;
          const resolved = resolveScript(sec.text);
          const isRecommended = recommendedScriptSection === key;
          
          return (
            <div
              key={key}
              ref={el => sectionRefs.current[key] = el}
              onClick={() => setCurrentScriptSection(key)}
              className={`flex-shrink-0 bg-slate-900/70 border rounded-xl transition-all relative group overflow-hidden ${
                isRecommended ? 'border-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.3)] bg-slate-800/80' :
                isConnected ? 'border-slate-700/80 hover:border-blue-500/40 hover:bg-slate-800/60 cursor-pointer' :
                'border-slate-800/50 opacity-50 cursor-not-allowed'
              }`}
            >
              {/* Left highlight line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isRecommended ? 'bg-gold-400 animate-pulse' : 'bg-slate-700 group-hover:bg-blue-400'}`} />

              <div className="pl-4 pr-3 pt-3 pb-3">
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${isRecommended ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      {sec.label}
                    </span>
                    {isRecommended && (
                      <span className="text-[9px] text-gold-400 font-bold uppercase tracking-widest flex items-center gap-1 bg-gold-500/10 px-1.5 py-0.5 rounded">
                        <Sparkles size={10} /> AI Suggested
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center gap-1.5 transition-opacity opacity-0 group-hover:opacity-100 ${isRecommended ? 'opacity-100' : ''}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(sec.text, key); }}
                      disabled={!isConnected}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isCopied ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-gold-400 hover:border-gold-500/40'
                      }`}
                    >
                      {isCopied ? <CheckCheck size={13} /> : <Copy size={13} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); playQuickScript(sec.text); }}
                      disabled={!isConnected}
                      className="p-1.5 rounded-lg border bg-slate-800 text-slate-400 border-slate-700 hover:text-blue-400 hover:border-blue-500/40 transition-all"
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Text */}
                <p className={`text-sm leading-relaxed transition-colors ${isRecommended ? 'text-slate-200' : 'text-slate-400'}`}>
                  {resolved}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
