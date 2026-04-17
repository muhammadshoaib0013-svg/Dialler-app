import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Play, Square, UploadCloud, Settings, Database, Mic, Zap, Volume2, VolumeX, Radio, ChevronDown } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';
import { edgeTtsSpeak, edgeTtsAbort, fetchEdgeVoices, checkProxyHealth } from '../../services/edgeTtsService';

// ── Word-highlighter ──────────────────────────────────────────────────────────
function KaraokeText({ text, activeWordIndex }) {
  if (!text) return null;
  const words = text.trim().split(/\s+/);
  return (
    <p dir="auto" className="text-xs leading-relaxed text-slate-300 font-sans">
      {words.map((word, i) => (
        <span key={i}
          className={`transition-all duration-150 mr-1 rounded px-0.5 ${
            i === activeWordIndex
              ? 'bg-gold-500/30 text-gold-300 font-bold'
              : i < activeWordIndex
              ? 'text-slate-500'
              : 'text-slate-300'
          }`}
        >
          {word}
        </span>
      ))}
    </p>
  );
}

// ── Engine badge ──────────────────────────────────────────────────────────────
function EngineBadge({ online }) {
  return (
    <span className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
      online
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
      {online ? 'Edge Neural' : 'Browser TTS'}
    </span>
  );
}

export default function AutoVoicePanel() {
  const {
    autoDialerList, setAutoDialerList,
    autoDialerActive, setAutoDialerActive,
    scheduleLimits, setScheduleLimits,
    callsMadeDay,
    voiceScript, setVoiceScript,
    scriptMode, setScriptMode,
    totalListLength, setTotalListLength,
    setCurrentSubtitle, setIsTTSPlaying,
  } = useCallContext();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [proxyOnline,    setProxyOnline]    = useState(false);
  const [voices,         setVoices]         = useState([
    { id: 'ur-PK-GulNeural',    name: 'Gul (Urdu ♀)' },
    { id: 'ur-PK-SalmanNeural', name: 'Salman (Urdu ♂)' },
    { id: 'en-US-AriaNeural',   name: 'Aria (English ♀)' },
    { id: 'en-US-GuyNeural',    name: 'Guy (English ♂)' },
  ]);
  const [selectedVoice,  setSelectedVoice]  = useState('ur-PK-GulNeural');
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [activeWord,     setActiveWord]     = useState(-1);
  const [playingText,    setPlayingText]    = useState('');

  // ── Check proxy health on mount ───────────────────────────────────────────
  useEffect(() => {
    checkProxyHealth().then(ok => setProxyOnline(ok));
    fetchEdgeVoices().then(v => setVoices(v));
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const numbers = results.data
            .map(row => row.phone || row.Phone || row.number || row.Number || Object.values(row)[0])
            .filter(n => n && String(n).trim() !== '');
          setAutoDialerList(prev => [...prev, ...numbers]);
          setTotalListLength(prev => prev + numbers.length);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls', '.xlsx'] }
  });

  // ── Preview / Test TTS ────────────────────────────────────────────────────
  const previewTTS = () => {
    const text = scriptMode === 'fixed'
      ? 'یہ ایجنٹ کی تعارفی آواز ہے۔ Edge Neural TTS سسٹم فعال ہے۔'
      : (voiceScript || 'Hello, Edge TTS is working.');

    setPlayingText(text);
    setActiveWord(-1);
    edgeTtsSpeak({
      text,
      voice:       selectedVoice,
      onStart:     () => { setIsPlaying(true); setIsTTSPlaying?.(true); },
      onEnd:       () => { setIsPlaying(false); setIsTTSPlaying?.(false); setActiveWord(-1); setCurrentSubtitle?.(''); },
      onWord:      (_, idx) => setActiveWord(idx),
      onSubtitle:  (t) => setCurrentSubtitle?.(t),
      onError:     () => { setIsPlaying(false); setIsTTSPlaying?.(false); },
    });
  };

  const stopTTS = () => {
    edgeTtsAbort();
    setIsPlaying(false);
    setActiveWord(-1);
    setIsTTSPlaying?.(false);
    setCurrentSubtitle?.('');
  };

  const toggleDialer = () => {
    if (autoDialerActive) {
      stopTTS();
    }
    setAutoDialerActive(!autoDialerActive);
  };

  const progressPercent = totalListLength > 0
    ? Math.min(100, Math.round((callsMadeDay / totalListLength) * 100))
    : 0;

  return (
    <div className="glass-panel p-5 shadow-xl relative flex flex-col h-full font-sans border border-purple-500/20">

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Mic size={18} className="text-purple-400" /> Smart Voice System
          </h3>
          <EngineBadge online={proxyOnline} />
        </div>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800">
          <Settings size={18} />
        </button>
      </div>

      {/* ── Settings Panel ── */}
      {isSettingsOpen && (
        <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl mb-4 text-sm shadow-inner shrink-0">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Max Calls/Hour</label>
              <input type="number" value={scheduleLimits.maxPerHour}
                onChange={e => setScheduleLimits({ ...scheduleLimits, maxPerHour: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 outline-none focus:border-purple-500/50 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Max Calls/Day</label>
              <input type="number" value={scheduleLimits.maxPerDay}
                onChange={e => setScheduleLimits({ ...scheduleLimits, maxPerDay: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 outline-none focus:border-purple-500/50 text-sm" />
            </div>
          </div>

          {/* Voice Selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Neural Voice</label>
            <div className="relative">
              <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 outline-none focus:border-purple-500/50 text-sm appearance-none cursor-pointer">
                {voices.map(v => <option key={v.id} value={v.id}>{v.name || v.id}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* ── Master Script Box ── */}
      <div className="flex-1 flex flex-col min-h-[120px] mb-4">
        <div className="flex justify-between items-center mb-2 shrink-0">
          <label className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
            <Zap size={12} /> AI Connect Script
          </label>
          <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
            <button onClick={() => setScriptMode('fixed')}
              className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors ${scriptMode === 'fixed' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}>
              Fixed Script
            </button>
            <button onClick={() => setScriptMode('manual')}
              className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors ${scriptMode === 'manual' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}>
              Manual
            </button>
          </div>
        </div>

        <textarea
          value={scriptMode === 'fixed'
            ? 'Auto-reads the "Introduction" script from Admin → Script Manager when connected...'
            : voiceScript}
          onChange={e => { if (scriptMode === 'manual') setVoiceScript(e.target.value); }}
          disabled={scriptMode === 'fixed'}
          placeholder="Type the AI message to read on connect..."
          className={`flex-1 bg-slate-950/60 border border-purple-900/30 rounded-xl p-4 text-sm resize-none outline-none focus:border-purple-500/50 transition-colors custom-scrollbar shadow-inner leading-relaxed ${
            scriptMode === 'fixed' ? 'text-slate-500 italic opacity-70' : 'text-slate-200'
          }`}
        />
      </div>

      {/* ── Karaoke Live Preview ── */}
      {isPlaying && playingText && (
        <div className="mb-3 bg-slate-950/80 border border-purple-500/20 rounded-xl p-4 shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-2 flex items-center gap-1.5">
            <Radio size={10} className="animate-pulse" /> Live Karaoke — {selectedVoice}
          </p>
          <KaraokeText text={playingText} activeWordIndex={activeWord} />
        </div>
      )}

      {/* ── Bulk Targets ── */}
      <div className="shrink-0 mb-4 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Database size={15} className="text-gold-400" /> Bulk Targets
          </div>
          <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
            {autoDialerList.length} queued
          </div>
        </div>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-gold-500 bg-gold-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-950/80'
        }`}>
          <input {...getInputProps()} />
          <UploadCloud size={22} className="text-slate-400 mb-1" />
          <p className="text-slate-400 text-xs">Drop CSV to append contacts</p>
        </div>

        {totalListLength > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] uppercase text-slate-500 mb-1 font-bold tracking-wider">
              <span>Campaign Progress</span>
              <span className="text-purple-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="text-center text-[10px] text-slate-500 mt-1 uppercase tracking-widest">
              {callsMadeDay} / {totalListLength} dialed
            </div>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="mt-auto shrink-0 flex items-center gap-2">
        {/* Preview TTS */}
        <button onClick={isPlaying ? stopTTS : previewTTS}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs border transition-all ${
            isPlaying
              ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
              : 'bg-purple-500/10 border-purple-500/40 text-purple-400 hover:bg-purple-500/20'
          }`}>
          {isPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
          {isPlaying ? 'Stop' : 'Test Voice'}
        </button>

        {/* Start / Stop Campaign */}
        <button onClick={toggleDialer}
          disabled={autoDialerList.length === 0 && !autoDialerActive}
          className={`flex-1 flex justify-center items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg transition-all ${
            autoDialerActive
              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40 text-white'
              : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/40 text-white disabled:opacity-40 disabled:bg-slate-800 disabled:shadow-none disabled:cursor-not-allowed'
          }`}>
          {autoDialerActive ? <><Square size={16} /> Stop Campaign</> : <><Play size={16} /> Start Campaign</>}
        </button>
      </div>
    </div>
  );
}
