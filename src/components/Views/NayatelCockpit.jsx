import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DialPad from '../Workspace/DialPad';
import AutoVoicePanel from '../Workspace/AutoVoicePanel';
import DispositionGrid from '../Workspace/DispositionGrid';
import ScriptPanel from '../Workspace/ScriptPanel';
import { useCallContext } from '../../context/CallContext';
import { Clock, ThermometerSun, Thermometer, ThermometerSnowflake, History, PlayCircle, SmilePlus, Meh, Frown } from 'lucide-react';

const SENTIMENT_CONFIG = {
  positive: { icon: SmilePlus, label: 'Positive', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
  neutral:  { icon: Meh,       label: 'Neutral',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  negative: { icon: Frown,     label: 'Negative', cls: 'text-red-400   bg-red-500/10   border-red-500/30'   },
};

function SentimentBadge({ sentiment }) {
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-500 ${cfg.cls}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

/**
 * Lead Temperature Badge
 */
const TemperatureBadge = ({ calls }) => {
  let temp = 'cold';
  let Icon = ThermometerSnowflake;
  let colors = 'bg-blue-900/40 text-blue-400 border-blue-500/30';
  let label = 'Cold ❄️';

  if (calls > 5) {
    temp = 'hot';
    Icon = ThermometerSun;
    colors = 'bg-red-900/40 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    label = 'Hot 🌶️';
  } else if (calls > 2) {
    temp = 'warm';
    Icon = Thermometer;
    colors = 'bg-orange-900/40 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]';
    label = 'Warm 🔥';
  }

  return (
    <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${colors} backdrop-blur-sm`}>
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
};

/**
 * Local Time Clock
 */
const LocalTimeClock = ({ timezoneOffset = 0 }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Assuming timezoneOffset is string like "+5" or "-8" 
  // In a real app we'd use intl or moment-timezone based on area code / state
  const getLocalTime = () => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-1.5 backdrop-blur-md">
      <Clock size={16} className="text-cyan-400" />
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Local Time</span>
        <span className="text-sm font-bold text-slate-100 font-mono">{getLocalTime()}</span>
      </div>
    </div>
  );
};

/**
 * Interactive Timeline
 */
const InteractiveTimeline = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return (
        <div className="p-4 text-center text-slate-500 text-sm">
            No previous interactions.
        </div>
    );
  }

  return (
    <div className="mt-4 pl-2 border-l-2 border-slate-800 space-y-4">
      {history.map((event, idx) => (
        <div key={idx} className="relative pl-4">
          {/* Node */}
          <div className="absolute -left-[27px] top-1 w-3 h-3 bg-cyan-500 rounded-full ring-4 ring-slate-950 shadow-[0_0_8px_rgba(0,232,255,0.6)]"></div>
          
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-bold text-cyan-400 tracking-wide uppercase">{event.date}</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">{event.agent}</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-2 rounded-md border border-slate-800/50">
            {event.notes}
          </p>
        </div>
      ))}
    </div>
  );
};

/**
 * Cockpit CRM Screen Pop
 */
const CockpitCRM = ({ screenPopData, inboundStatus }) => {
  // Mock data for new features based on screenPopData
  const mockCalls = Math.floor(Math.random() * 8);
  const mockHistory = [
    { date: '12 Oct, 14:30', agent: 'Sarah L.', notes: 'Customer asked to call back next week. Interested in premium tier.' },
    { date: '05 Oct, 09:15', agent: 'Mike T.', notes: 'Initial outreach. Left voicemail.' }
  ];

  return (
    <div className="glass-panel relative overflow-hidden flex flex-col h-full rounded-2xl border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
       {/* High-class gradient overlay */}
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-gold-500"></div>

       <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-6">
             <div>
                <h2 className="text-2xl font-bold font-sans text-slate-50 flex items-center space-x-3 mb-1">
                   <span>{screenPopData?.name || 'Unknown Lead'}</span>
                   <TemperatureBadge calls={screenPopData ? mockCalls : 0} />
                </h2>
                <div className="text-cyan-400 font-mono tracking-widest text-sm flex items-center space-x-2">
                   <span>{screenPopData?.phone || '+1 (555) 000-0000'}</span>
                   {inboundStatus === 'answered' && (
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"></span>
                   )}
                </div>
             </div>
             
             <LocalTimeClock timezoneOffset={screenPopData?.timezone || '0'} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Queue/Skill</span>
              <span className="font-medium text-slate-200">{screenPopData?.queue || 'Outbound Core'}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Campaign</span>
              <span className="font-medium text-slate-200">{screenPopData?.campaign || 'Default_Camp'}</span>
            </div>
          </div>

          <div>
             <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center">
               <History size={14} className="mr-2" />
               Interaction Timeline
             </h3>
             <InteractiveTimeline history={screenPopData ? mockHistory : []} />
          </div>
       </div>
    </div>
  );
};


/**
 * Nayatel Cockpit Main View
 */
export default function NayatelCockpit() {
  const {
    screenPopData, inboundStatus, isDialing,
    transcriptLines, sentimentScore, isTTSPlaying, isAISpeaking,
    currentSubtitle, callStatus, inboundCall,
  } = useCallContext();
  const showScreenPop = !!screenPopData || inboundStatus === 'answered';
  const transcriptRef = React.useRef(null);

  // Mock call flow progress
  const [countdown, setCountdown] = useState(15);
  useEffect(() => {
    if (isDialing) {
       const timer = setInterval(() => {
         setCountdown(prev => (prev > 0 ? prev - 1 : 0));
       }, 1000);
       return () => clearInterval(timer);
    } else {
       setCountdown(15);
    }
  }, [isDialing]);

  useEffect(() => {
    transcriptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [transcriptLines, currentSubtitle]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-[1800px] mx-auto w-full flex flex-col gap-4 pb-12"
    >

      {/* ── Row 1: Cockpit Core (Dialpad + Auto Voice) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[280px]">
        
        {/* Dialpad Panel */}
        <div className="lg:col-span-3 min-h-0">
          <div className="h-full transform transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,232,255,0.05)] rounded-2xl">
            <DialPad />
          </div>
        </div>

        {/* Smart Voice & Execution Panel */}
        <div className="lg:col-span-9 flex flex-col min-h-[250px]">
           <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden relative h-full">
              {/* Animated Background Glow */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="px-4 py-2 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/90">
                 <h3 className="font-bold text-slate-100 uppercase tracking-widest text-sm flex items-center">
                    <span className="w-2 h-2 bg-gold-400 rounded-full mr-2 shadow-[0_0_8px_rgba(212,175,55,1)]"></span>
                    Execution Engine
                 </h3>
                 {/* Call Flow Countdown Ring */}
                 {isDialing && (
                   <div className="flex items-center space-x-3">
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Next Auto-batch in</span>
                      <div className="relative w-8 h-8 flex items-center justify-center">
                         <svg className="absolute inset-0 w-8 h-8 transform -rotate-90">
                            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-slate-800" />
                            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="transparent" 
                                    className="text-cyan-400 transition-all duration-1000 ease-linear"
                                    strokeDasharray="88" strokeDashoffset={88 - (88 * (countdown / 15))} />
                         </svg>
                         <span className="text-[10px] font-bold text-cyan-400">{countdown}s</span>
                      </div>
                   </div>
                 )}
              </div>
              <div className="p-1 h-[calc(100%-42px)]">
                 {/* We wrap AutoVoicePanel here to reuse existing logic while injecting new theme visually via parent */}
                 <div className="h-full [&>div]:h-full [&>div]:shadow-none [&>div]:bg-transparent [&>div]:border-none">
                    <AutoVoicePanel />
                 </div>
               </div>
            </div>
         </div>
      </div>

      {/* ── Call Transcript Strip (Now 100% Width between components) ── */}
      {(callStatus === 'Connected' || isTTSPlaying || isAISpeaking || transcriptLines.length > 0) && (
        <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl flex flex-col min-h-[160px] shrink-0">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-950/80 border-b border-slate-800 shrink-0">
            <span className={`text-xs font-bold tracking-widest uppercase transition-colors duration-300 ${isTTSPlaying || isAISpeaking ? 'text-purple-400' : 'text-gold-400'}`}>
              {isTTSPlaying || isAISpeaking ? '🎤 AI Broadcasting' : '📝 Live Transcript'}
            </span>
            <SentimentBadge sentiment={sentimentScore} />
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {(isTTSPlaying || isAISpeaking) && currentSubtitle && (
              <p dir="auto" className="text-purple-300 text-base text-center font-medium leading-relaxed animate-pulse">
                "{currentSubtitle}"
              </p>
            )}

            {!(isTTSPlaying || isAISpeaking) && transcriptLines.length === 0 && (
              <p className="text-slate-600 italic text-base text-center py-6 animate-pulse">
                Waiting for audio stream...
              </p>
            )}

            {!(isTTSPlaying || isAISpeaking) && transcriptLines.map((line, i) => (
              <div key={i} className={`flex gap-3 items-start transcript-slide-in ${line.role === 'customer' ? 'flex-row-reverse' : ''}`}>
                {line.role === 'system' ? (
                  <span dir="auto" className="w-full text-center text-xs font-mono text-purple-400 opacity-80 my-2">
                    {line.text}
                  </span>
                ) : (
                  <>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded flex-shrink-0 mt-0.5 leading-tight ${
                        line.role === 'agent'
                          ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                          : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'
                      }`}
                    >
                      {line.role === 'agent' ? 'AGT' : 'CST'}
                    </span>
                    <span dir="auto" className={`text-base leading-[1.6] tracking-wide w-full ${line.role === 'agent' ? 'text-slate-200' : 'text-slate-400'}`}>
                      {line.text}
                      <span className="ml-3 text-[11px] text-slate-500 font-mono inline-block" dir="ltr">{line.timestamp}</span>
                    </span>
                  </>
                )}
              </div>
            ))}
            <div ref={transcriptRef} />
          </div>
        </div>
      )}

      {/* ── Row 2: Disposition Protocol ── */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-1 z-10 shrink-0">
         {/* Override internal spacing & colors using CSS child selectors for DispositionGrid */}
         <div className="[&>div]:shadow-none [&>div]:bg-transparent [&>div]:border-none">
           <DispositionGrid />
         </div>
      </div>

      {/* ── Row 3: Advanced Lead CRM & Script Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[400px]">
        <div className="lg:col-span-5 h-full min-h-0 flex flex-col">
           <CockpitCRM screenPopData={screenPopData} inboundStatus={inboundStatus} />
        </div>
        <div className="lg:col-span-7 h-full min-h-0 flex flex-col">
           <div className="glass-panel flex-1 min-h-0 flex flex-col rounded-2xl border-gold-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-500 to-cyan-400 z-10"></div>
              {/* ScriptPanel wrapper — flex chain enables inner scroll */}
              <div className="flex-1 min-h-0 flex flex-col [&>div]:flex-1 [&>div]:min-h-0 [&>div]:shadow-none [&>div]:bg-transparent [&>div]:border-none">
                <ScriptPanel />
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
