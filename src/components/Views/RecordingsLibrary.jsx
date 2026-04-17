import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import { DownloadCloud, Play, X, Server, Radio, PhoneIncoming, PhoneOff, Voicemail } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

// ─── Disposition badge config ──────────────────────────────────────────────────
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

// ─── Inbound status badge config ───────────────────────────────────────────────
const INBOUND_STYLE = {
  answered:  'bg-green-500/20 text-green-400 border-green-500/30',
  missed:    'bg-red-500/20   text-red-400   border-red-500/30',
  voicemail: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const INBOUND_ICON = {
  answered:  <PhoneIncoming size={10} />,
  missed:    <PhoneOff size={10} />,
  voicemail: <Voicemail size={10} />,
};

const INBOUND_LABEL = {
  answered:  'Answered',
  missed:    'Missed',
  voicemail: 'Voicemail',
};

// ─── Mock Waveform Visualizer ──────────────────────────────────────────────────
function MockWaveform({ playing }) {
  const [bars, setBars] = useState(() => Array.from({ length: 32 }, () => Math.random() * 80 + 20));

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setBars(Array.from({ length: 32 }, () => Math.random() * 80 + 20));
    }, 120);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <div className="flex gap-0.5 h-12 items-center justify-center w-full">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full bg-gold-400/70"
          style={{
            height: `${playing ? h : 20}%`,
            transition: 'height 0.1s ease-in-out',
            boxShadow: playing ? '0 0 4px rgba(212,175,55,0.4)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ─── Recording Player Modal ────────────────────────────────────────────────────
const DEFAULT_TRANSCRIPT = [
  { role: 'agent',    text: "Assalam-o-Alaikum! Am I speaking with the customer?" },
  { role: 'customer', text: "Yes, speaking. Who is this please?" },
  { role: 'agent',    text: "This is Hassan calling from HB Electronics. We have an exclusive Smart TV promotion." },
  { role: 'customer', text: "Oh! Tell me more about the offer." },
  { role: 'agent',    text: "Our Samsung 55 inch 4K Smart TV is at 30% off — PKR 89,999 inclusive of delivery." },
  { role: 'customer', text: "That sounds like a great deal. Please confirm my order." },
  { role: 'agent',    text: "Perfect! Order confirmed. You will receive a WhatsApp receipt shortly. Thank you!" },
];

function RecordingModal({ log, onClose }) {
  const [playing, setPlaying]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const progressRef   = useRef(null);
  const utteranceRef  = useRef(null);
  const lineOrderRef  = useRef(0);
  const transcriptEndRef = useRef(null);

  const transcript = (log.transcriptSnap && log.transcriptSnap.length)
    ? log.transcriptSnap
    : DEFAULT_TRANSCRIPT;

  const totalDuration = log.duration || log.totalDuration || 30;

  useEffect(() => {
    return () => {
      clearInterval(progressRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeLineIdx]);

  const speakLine = (lineIndex) => {
    if (lineIndex >= transcript.length) {
      setPlaying(false);
      setActiveLineIdx(-1);
      clearInterval(progressRef.current);
      setProgress(100);
      return;
    }

    const line   = transcript[lineIndex];
    if (line.role === 'system') { // skip sys lines
       speakLine(lineIndex + 1);
       return;
    }
    const voices = window.speechSynthesis.getVoices();

    const maleVoice   = voices.find(v => /male/i.test(v.name)) || voices.find(v => /david|james|mark/i.test(v.name)) || voices[0];
    const femaleVoice = voices.find(v => /female/i.test(v.name)) || voices.find(v => /zira|samantha/i.test(v.name)) || voices[1] || voices[0];

    const utt  = new SpeechSynthesisUtterance(line.text);
    utt.rate   = 0.9;
    utt.pitch  = line.role === 'agent' ? 0.85 : 1.15;
    utt.volume = 1;
    utt.voice  = line.role === 'agent' ? maleVoice : femaleVoice;

    utt.onstart = () => { setActiveLineIdx(lineIndex); };
    utt.onend   = () => { setTimeout(() => speakLine(lineIndex + 1), 400); };
    utt.onerror = () => { speakLine(lineIndex + 1); };

    utteranceRef.current = utt;
    lineOrderRef.current = lineIndex;
    window.speechSynthesis.speak(utt);
  };

  const startProgress = () => {
    clearInterval(progressRef.current);
    const totalMs = totalDuration * 1000;
    const step    = 300;
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(progressRef.current); return 100; }
        return Math.min(100, prev + (step / totalMs) * 100);
      });
    }, step);
  };

  const handlePlay = () => {
    if (playing) {
      window.speechSynthesis.pause();
      clearInterval(progressRef.current);
      setPlaying(false);
    } else {
      if (progress >= 100) {
        setProgress(0);
        setActiveLineIdx(-1);
        window.speechSynthesis.cancel();
        setTimeout(() => { setPlaying(true); startProgress(); speakLine(0); }, 100);
      } else {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          window.speechSynthesis.cancel();
          speakLine(activeLineIdx >= 0 ? activeLineIdx : 0);
        }
        startProgress();
        setPlaying(true);
      }
    }
  };

  const formatTime = (pct) => {
    const secs = Math.floor((pct / 100) * totalDuration);
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalFmt = (() => {
    const d = totalDuration;
    return `${Math.floor(d / 60).toString().padStart(2, '0')}:${(d % 60).toString().padStart(2, '0')}`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
              <Radio size={15} className="text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Call Recording</p>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest">{log.recordingId || 'NO-REC-ID'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
            <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
              <p className="text-slate-500 uppercase tracking-widest mb-1 text-[9px]">Customer</p>
              <p className="text-slate-100 font-semibold truncate">{log.customerName || log.name || log.lead || '—'}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
              <p className="text-slate-500 uppercase tracking-widest mb-1 text-[9px]">Duration</p>
              <p className="text-gold-400 font-mono font-bold">{totalFmt}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
              <p className="text-slate-500 uppercase tracking-widest mb-1 text-[9px]">Result</p>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${DISPO_STYLE[log.disposition] || DISPO_STYLE.HANGUP}`}>
                {DISPO_LABEL[log.disposition] || log.status || log.disposition || 'N/A'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-3">
            <MockWaveform playing={playing} />
            <div className="mt-3 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer" title="Progress">
              <div className="h-full bg-gold-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>{formatTime(progress)}</span>
              <span>{totalFmt}</span>
            </div>
          </div>

          {/* Transcript scroll panel */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden mb-4" style={{ maxHeight: '130px' }}>
            <div className="px-2 py-1.5 border-b border-slate-800 bg-slate-900/60">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {playing ? '🎙 Playing recording…' : '📋 Transcript'}
              </span>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-2 space-y-1.5" style={{ maxHeight: '100px' }}>
              {transcript.map((line, i) => (
                <div key={i} className={`flex gap-2 items-start rounded px-1.5 py-1 ${activeLineIdx === i ? 'bg-gold-500/10 border border-gold-500/20' : ''}`}>
                  {line.role === 'system' ? (
                     <span className="w-full text-center text-[9px] text-purple-400 opacity-80">{line.text}</span>
                  ) : (
                    <>
                      <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded leading-tight mt-0.5 ${line.role === 'agent' ? 'bg-gold-500/20 text-gold-400' : 'bg-slate-700/60 text-slate-400'}`}>
                        {line.role === 'agent' ? 'AGT' : 'CST'}
                      </span>
                      <span className={`text-[11px] leading-relaxed ${activeLineIdx === i ? 'text-white' : 'text-slate-500'}`}>{line.text}</span>
                    </>
                  )}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Play button */}
          <div className="flex justify-center mb-3">
            <button onClick={handlePlay} className="w-14 h-14 rounded-full bg-gold-500 hover:bg-gold-400 active:scale-95 text-slate-950 flex items-center justify-center shadow-lg shadow-gold-900/30">
              {playing ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : <Play size={20} className="ml-1" />}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-800/40 rounded-lg px-3 py-2">
            <Server size={11} className="text-slate-600 flex-shrink-0" />
            <span className="font-mono break-all">recordings.hbelectronics.pk/listen/{log.recordingId || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, count, countColor = 'text-gold-400' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${
        active ? 'bg-gold-500/15 border-gold-500/40 text-gold-400 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
      }`}
    >
      <Icon size={13} /> {label}
      {count !== undefined && <span className={`text-[10px] font-bold ${active ? countColor : 'text-slate-600'}`}>({count})</span>}
    </button>
  );
}

export default function RecordingsLibrary() {
  const { sessionLogs, agentAuth, customerLeads, inboundLogs } = useCallContext();
  const [playingLog, setPlayingLog] = useState(null);
  const [activeTab,  setActiveTab]  = useState('outbound');

  /**
   * Fix CSV export: Maps complex session data into a flat, readable format 
   * guaranteed to capture Real Data instead of 'Unknown' or raw objects.
   */
  const handleExportCSV = () => {
    const rawData = activeTab === 'outbound' ? sessionLogs : inboundLogs;
    if (!rawData?.length) {
      alert(`There are currently no ${activeTab} logs to export.`);
      return;
    }

    const exportMapping = rawData.map(log => {
      if (activeTab === 'outbound') {
         // Fix: Outbound mapping pulling true properties
         return {
           Timestamp: new Date(log.callEndTime || log.time).toLocaleString(),
           Agent: log.agentName || agentAuth.username,
           Customer_Name: log.customerName || log.lead?.name || log.lead || 'Unknown',
           Phone: log.phone || 'Unknown',
           Disposition: DISPO_LABEL[log.disposition] || log.disposition || 'HANGUP',
           Duration_Seconds: log.totalDuration || log.duration || 0,
           WhatsApp_Sent: log.whatsappSent || 'No',
           Recording_ID: log.recordingId || 'N/A'
         };
      } else {
         // Fix: Inbound mapping
         return {
           Timestamp: new Date(log.time).toLocaleString(),
           Caller_Name: log.name || 'Unknown Caller',
           Phone: log.phone || 'Unknown',
           Status: INBOUND_LABEL[log.status] || log.status,
           Duration_Seconds: log.duration || 0,
           Recording_ID: log.recordingId || 'N/A'
         };
      }
    });

    const csv  = Papa.unparse(exportMapping);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];

    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `Recordings_${activeTab}_${agentAuth.username}_${date}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="glass-panel p-6 shadow-xl h-full flex flex-col font-sans"
    >
      <div className="flex items-start justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
             <Radio size={22} className="text-gold-400" />
             Recordings Library
          </h3>
          <p className="text-xs text-slate-400 font-mono tracking-widest mt-1 uppercase">Playback & Export Archives</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={activeTab === 'outbound' ? !sessionLogs.length : !inboundLogs.length}
          className="btn-outline-gold flex items-center gap-2 text-xs font-bold tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <DownloadCloud size={14} /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 p-1 bg-slate-900/50 rounded-xl border border-slate-800/50 shrink-0">
        <TabBtn active={activeTab === 'outbound'} onClick={() => setActiveTab('outbound')} icon={Radio} label="Outbound" count={sessionLogs.length} />
        <TabBtn active={activeTab === 'inbound'} onClick={() => setActiveTab('inbound')} icon={PhoneIncoming} label="Inbound" count={inboundLogs.length} countColor="text-green-400" />
      </div>

      {activeTab === 'outbound' && (
        sessionLogs.length > 0 ? (
          <div className="flex-1 border border-slate-800 rounded-xl bg-slate-900/40 overflow-auto custom-scrollbar shadow-inner">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 z-10 shadow-sm font-bold">
                <tr>
                  <th className="px-4 py-3">Date / Time</th>
                  <th className="px-4 py-3">Customer Profile</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3 text-center">Duration</th>
                  <th className="px-4 py-3 text-center">Playback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessionLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(log.callEndTime || log.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{log.customerName || log.lead?.name || log.lead || 'Unknown'}</td>
                    <td className="px-4 py-3 font-mono text-gold-400 font-bold tracking-wide">{log.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${DISPO_STYLE[log.disposition] || DISPO_STYLE.HANGUP}`}>
                        {DISPO_LABEL[log.disposition] || log.disposition || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-400">{log.totalDuration || log.duration || 0}s</td>
                    <td className="px-4 py-3 text-center">
                      {log.recordingId ? (
                        <button onClick={() => setPlayingLog(log)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-gold-500/20 hover:text-gold-400 text-slate-400 border border-slate-700 hover:border-gold-500/40 transition-all flex items-center justify-center mx-auto active:scale-95">
                          <Play size={14} className="ml-0.5" />
                        </button>
                      ) : <span className="text-slate-700">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-16">
            <Radio size={48} className="opacity-20 mb-4" />
            <p className="text-base font-sans text-slate-400 font-semibold">No Outbound Recordings</p>
            <p className="text-xs mt-1 text-slate-600 font-mono">Archive populates after outbound calls drop.</p>
          </div>
        )
      )}

      {activeTab === 'inbound' && (
        inboundLogs.length > 0 ? (
          <div className="flex-1 border border-slate-800 rounded-xl bg-slate-900/40 overflow-auto custom-scrollbar shadow-inner">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 z-10 shadow-sm font-bold">
                <tr>
                  <th className="px-4 py-3">Date / Time</th>
                  <th className="px-4 py-3">Caller Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Playback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inboundLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(log.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{log.name || 'Unknown Caller'}</td>
                    <td className="px-4 py-3 font-mono text-gold-400 font-bold tracking-wide">{log.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${INBOUND_STYLE[log.status] || INBOUND_STYLE.missed}`}>
                        {INBOUND_ICON[log.status]} {INBOUND_LABEL[log.status] || log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.recordingId ? (
                        <button onClick={() => setPlayingLog(log)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-gold-500/20 hover:text-gold-400 text-slate-400 border border-slate-700 hover:border-gold-500/40 transition-all flex items-center justify-center mx-auto active:scale-95">
                          <Play size={14} className="ml-0.5" />
                        </button>
                      ) : <span className="text-slate-700">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-16">
            <PhoneIncoming size={48} className="opacity-20 mb-4" />
            <p className="text-base font-sans text-slate-400 font-semibold">No Inbound Recordings</p>
            <p className="text-xs mt-1 text-slate-600 font-mono">Archive populates after receiving calls.</p>
          </div>
        )
      )}

      {playingLog && <RecordingModal log={playingLog} onClose={() => setPlayingLog(null)} />}
    </motion.div>
  );
}
