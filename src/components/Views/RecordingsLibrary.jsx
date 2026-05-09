import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, Play, FileText, ChevronDown, ChevronUp, CheckCircle, ShieldAlert, Award, Star } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

const DISPO_STYLE = {
  SALE: 'bg-green-500/20 text-green-400 border-green-500/30',
  CBHOLD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DNC: 'bg-red-500/20 text-red-400 border-red-500/30',
  NI: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  HANGUP: 'bg-slate-600/40 text-slate-400 border-slate-600/30',
};

const DISPO_LABEL = {
  SALE: 'Sale', CBHOLD: 'Callback', DNC: 'DNC', NI: 'Not Int.', HANGUP: 'Hung Up',
};

export default function RecordingsLibrary() {
  const { userRole } = useCallContext();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchAgent, setSearchAgent] = useState('');
  const [filterDispo, setFilterDispo] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Fetch calls from DB
  useEffect(() => {
    fetch('/api/calls', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('agent_token') }
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) setCalls(data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredCalls = calls.filter(c => {
    if (searchPhone && !c.phone?.includes(searchPhone)) return false;
    if (searchAgent && !c.agent_name?.toLowerCase().includes(searchAgent.toLowerCase())) return false;
    if (filterDispo && c.disposition !== filterDispo) return false;
    if (dateFilter) {
      const callDate = new Date(c.created_at).toISOString().split('T')[0];
      if (callDate !== dateFilter) return false;
    }
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col space-y-4 max-w-[1600px] mx-auto p-4"
    >
      {/* Header & Filters */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg shrink-0">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Play size={20} className="text-gold-400" />
          Call Recordings & QA
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search Phone..." 
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:border-gold-500/50 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search Agent..." 
              value={searchAgent}
              onChange={e => setSearchAgent(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:border-gold-500/50 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <select 
              value={filterDispo}
              onChange={e => setFilterDispo(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:border-gold-500/50 focus:outline-none appearance-none"
            >
              <option value="">All Dispositions</option>
              <option value="SALE">Sale</option>
              <option value="CBHOLD">Callback</option>
              <option value="NI">Not Interested</option>
              <option value="DNC">DNC</option>
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:border-gold-500/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-10">
        {loading ? (
          <div className="text-center text-slate-500 py-10">Loading recordings...</div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center text-slate-500 py-10">No recordings found matching criteria.</div>
        ) : (
          filteredCalls.map(call => (
            <RecordingCard key={call.id} call={call} userRole={userRole} />
          ))
        )}
      </div>
    </motion.div>
  );
}

function RecordingCard({ call, userRole }) {
  const [expanded, setExpanded] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [savedQa, setSavedQa] = useState(call.qa_score !== null ? { total: call.qa_score } : null);

  // Parsing AI Summary
  let aiData = null;
  if (call.ai_summary) {
    try { aiData = JSON.parse(call.ai_summary); } catch(e) {}
  }

  const durationStr = call.total_duration ? `${Math.floor(call.total_duration/60)}:${(call.total_duration%60).toString().padStart(2,'0')}` : '0:00';
  const dateStr = new Date(call.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
      <div 
        className="p-5 flex flex-wrap md:flex-nowrap items-center gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
          <Play size={20} className="text-gold-400 ml-1" />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-slate-200 font-bold tracking-wide font-mono text-sm">{call.phone}</h4>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${DISPO_STYLE[call.disposition] || DISPO_STYLE.HANGUP}`}>
              {DISPO_LABEL[call.disposition] || call.disposition || 'Unknown'}
            </span>
            {call.sentiment && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                call.sentiment === 'positive' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                call.sentiment === 'negative' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                'bg-slate-500/10 text-slate-400 border-slate-500/30'
              }`}>
                {call.sentiment}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Calendar size={12}/> {dateStr}</span>
            <span className="flex items-center gap-1 text-slate-400">Agent: <span className="text-cyan-400">{call.agent_name}</span></span>
            <span>{durationStr}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {savedQa ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 rounded-lg">
              <Award size={14} className="text-gold-400" />
              <span className="text-xs font-bold text-gold-400">QA: {savedQa.total}/100</span>
            </div>
          ) : (
            <div className="text-xs text-slate-600 italic">Not Reviewed</div>
          )}
          {expanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-800/50 bg-slate-900/20">
          
          {/* HTML5 Audio Player */}
          <div className="mb-6 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Recording Playback</p>
            {/* If actual recording URLs exist we'd map them here. Using placeholder audio tag */}
            <audio controls className="w-full h-10 outline-none">
              <source src={call.recording_id ? `/recordings/${call.recording_id}.mp3` : ''} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Summary */}
            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-2">
                <FileText size={14} /> AI Call Summary
              </h5>
              {aiData ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300 leading-relaxed">{aiData.summary}</p>
                  {aiData.nextAction && (
                    <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
                      <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">Recommended Action</span>
                      {aiData.nextAction}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No AI summary generated for this call.</p>
              )}
            </div>

            {/* QA Section */}
            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
              <div className="flex justify-between items-center mb-3">
                 <h5 className="text-[10px] font-bold uppercase tracking-widest text-gold-400 flex items-center gap-2">
                   <ShieldAlert size={14} /> Quality Assurance
                 </h5>
                 {(userRole === 'admin' || userRole === 'supervisor') && !savedQa && (
                   <button 
                     onClick={() => setQaOpen(!qaOpen)}
                     className="text-[10px] font-bold uppercase tracking-widest bg-gold-500 hover:bg-gold-400 text-slate-900 px-3 py-1 rounded transition-colors"
                   >
                     Score Call
                   </button>
                 )}
              </div>

              {savedQa ? (
                <div className="flex items-center justify-center h-24">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gold-400 mb-1">{savedQa.total}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Total QA Score</div>
                  </div>
                </div>
              ) : qaOpen ? (
                <QaScoringForm callId={call.id} onSaved={(total) => { setSavedQa({ total }); setQaOpen(false); }} />
              ) : (
                <div className="flex items-center justify-center h-24 text-xs text-slate-600 italic">
                  Pending Supervisor Review
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QaScoringForm({ callId, onSaved }) {
  const [scores, setScores] = useState({ greeting: 20, pitch: 20, objection: 20, close: 20, compliance: 20 });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    fetch('/api/qa/score', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('agent_token')
      },
      body: JSON.stringify({
        callLogId: callId,
        greeting: scores.greeting,
        pitch: scores.pitch,
        objection: scores.objection,
        close: scores.close,
        compliance: scores.compliance,
        notes
      })
    })
    .then(r => r.json())
    .then(d => {
      if (d.ok) onSaved(d.total);
    })
    .finally(() => setSaving(false));
  };

  const total = scores.greeting + scores.pitch + scores.objection + scores.close + scores.compliance;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {['greeting', 'pitch', 'objection', 'close', 'compliance'].map(crit => (
        <div key={crit} className="flex items-center justify-between">
          <span className="text-[10px] text-slate-300 uppercase tracking-wider">{crit}</span>
          <input 
            type="range" min="0" max="20" step="5"
            value={scores[crit]}
            onChange={e => setScores({ ...scores, [crit]: parseInt(e.target.value) })}
            className="w-1/2 accent-gold-500"
          />
          <span className="text-xs text-gold-400 font-mono w-6 text-right">{scores[crit]}</span>
        </div>
      ))}
      <textarea 
        placeholder="Reviewer notes..." 
        value={notes} onChange={e => setNotes(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 h-16 focus:outline-none focus:border-gold-500"
      />
      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-slate-400">Total: <strong className="text-gold-400">{total}</strong>/100</span>
        <button disabled={saving} type="submit" className="bg-gold-500 text-slate-900 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-widest hover:bg-gold-400">
          {saving ? 'Saving...' : 'Submit QA'}
        </button>
      </div>
    </form>
  );
}
