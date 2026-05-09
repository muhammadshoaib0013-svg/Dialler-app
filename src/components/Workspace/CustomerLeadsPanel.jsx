import { useState, useEffect, useMemo } from 'react';
import { Users, Phone, Filter, TrendingUp, Target, Clock, Ban, PhoneOff, MessageCircle, CheckCircle2, Search, Send, MessageSquare } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';
import Papa from 'papaparse';

// ─── Config Maps ───────────────────────────────────────────────────────────────
const DISPO_META = {
  SALE:   { label: 'Completed Sale',  cls: 'bg-green-500/20  text-green-400  border-green-500/30',  icon: <Target size={11} /> },
  CBHOLD: { label: 'Call Back',       cls: 'bg-blue-500/20   text-blue-400   border-blue-500/30',   icon: <Clock  size={11} /> },
  DNC:    { label: 'Do Not Call',     cls: 'bg-red-500/20    text-red-400    border-red-500/30',    icon: <Ban    size={11} /> },
  NI:     { label: 'Not Interested',  cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <PhoneOff size={11} /> },
  A:      { label: 'Ans. Machine',    cls: 'bg-slate-600/40  text-slate-400  border-slate-600/30',  icon: null },
  DEC:    { label: 'Declined',        cls: 'bg-slate-700/40  text-slate-400  border-slate-700/30',  icon: null },
  HANGUP: { label: 'Hung Up',         cls: 'bg-slate-600/40  text-slate-400  border-slate-600/30',  icon: null },
};

const SENTIMENT_META = {
  positive: { icon: '😊', cls: 'text-green-400',  label: 'Positive' },
  neutral:  { icon: '😐', cls: 'text-amber-400',  label: 'Neutral'  },
  negative: { icon: '😠', cls: 'text-red-400',    label: 'Negative' },
};

const FILTER_TABS = [
  { key: 'All',          label: 'All' },
  { key: 'HighPriority', label: '🔥 High Priority' },
  { key: 'SALE',         label: '🎯 Sales' },
  { key: 'CBHOLD',       label: '🔁 Callbacks' },
  { key: 'DNC',          label: '🚫 DNC' },
  { key: 'NI',           label: '👎 Not Int.' },
];

// ─── Stat Chip ─────────────────────────────────────────────────────────────────
function StatChip({ value, label, color }) {
  return (
    <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${color}`}>
      <span className="font-bold text-sm">{value}</span>
      <span className="ml-1.5 opacity-70">{label}</span>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 select-none">
      <div className="w-20 h-20 rounded-full bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mb-5 shadow-inner">
        <TrendingUp size={36} className="text-slate-600 opacity-60" />
      </div>
      <p className="text-slate-400 font-sans font-semibold tracking-wide">No Leads Recorded Yet</p>
      <p className="text-xs mt-2 text-slate-600 font-mono text-center max-w-xs leading-relaxed">
        Customer records appear here after each call is<br />
        disposed via the Disposition Protocol.
      </p>
    </div>
  );
}

// ─── WhatsApp Chat ─────────────────────────────────────────────────────────────
function WhatsAppChat({ phone }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval;
    const fetchMsgs = () => {
      fetch(`/api/whatsapp/messages?phone=${phone}`, { headers: { 'Authorization': 'Bearer placeholder' } })
        .then(r => r.json())
        .then(d => { if (d.ok) setMessages(d.data); setLoading(false); })
        .catch(() => setLoading(false));
    };
    fetchMsgs();
    interval = setInterval(fetchMsgs, 5000);
    return () => clearInterval(interval);
  }, [phone]);

  const handleSend = () => {
    if (!input.trim()) return;
    fetch('/api/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer placeholder' },
      body: JSON.stringify({ phone, text: input })
    }).then(() => {
      setMessages([...messages, { id: Date.now(), direction: 'out', text: input, ts: Date.now().toString() }]);
      setInput('');
    });
  };

  return (
    <div className="flex flex-col h-64 bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden mt-4">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700/60 flex items-center gap-2">
        <MessageSquare size={14} className="text-emerald-400" />
        <span className="text-xs font-bold text-slate-200">WhatsApp: {phone}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
        {loading ? <div className="text-xs text-slate-500 m-auto">Loading...</div> : messages.length === 0 ? <div className="text-xs text-slate-500 m-auto text-center italic">No messages yet.<br/>Start a conversation!</div> : (
          messages.map(m => (
            <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${m.direction === 'in' ? 'bg-slate-800 text-slate-200 self-start border border-slate-700' : 'bg-emerald-600/20 text-emerald-100 self-end border border-emerald-500/30'}`}>
              {m.text}
            </div>
          ))
        )}
      </div>
      <div className="p-2 bg-slate-950/50 border-t border-slate-700/60 flex items-center gap-2">
        <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSend()} placeholder="Type message..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
        <button onClick={handleSend} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"><Send size={14} /></button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CustomerLeadsPanel() {
  const { customerLeads, callStatus, makeCall } = useCallContext();
  const [activeFilter, setActiveFilter]         = useState('All');
  const [searchQuery, setSearchQuery]           = useState('');
  const [hoveredRow, setHoveredRow]             = useState(null);
  const [expandedRow, setExpandedRow]           = useState(null);
  const [sortByScore, setSortByScore]           = useState(false);

  // Filter and format leads based on both tab and search query
  const filtered = useMemo(() => {
    let result = customerLeads.filter(lead => {
       // Filter Tab
       const passTab = activeFilter === 'All' ? true 
         : activeFilter === 'HighPriority' ? (lead.lead_score > 70 && lead.disposition !== 'SALE')
         : lead.disposition === activeFilter;
       
       // Search Term (Phone or name or Disposition)
       const passSearch = searchQuery === '' || 
         (lead.phone && lead.phone.includes(searchQuery)) ||
         (lead.name && lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (lead.disposition && lead.disposition.toLowerCase().includes(searchQuery.toLowerCase()));

       return passTab && passSearch;
    });
    
    if (sortByScore) {
       result = [...result].sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));
    }
    return result;
  }, [customerLeads, activeFilter, searchQuery, sortByScore]);

  // Stats
  const salesCount = customerLeads.filter(l => l.disposition === 'SALE').length;
  const cbCount    = customerLeads.filter(l => l.disposition === 'CBHOLD').length;
  const dncCount   = customerLeads.filter(l => l.disposition === 'DNC').length;

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-gold-500/10"
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.85) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
        <div className="flex items-center gap-4">
          {/* Icon badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            <Users size={18} className="text-gold-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">Customer Leads</h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">
              {customerLeads.length} {customerLeads.length === 1 ? 'Record' : 'Records'} — CRM Intelligence Layer
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatChip value={salesCount} label="Sales"     color="bg-green-500/10 text-green-400 border-green-500/20" />
          <StatChip value={cbCount}    label="Callbacks" color="bg-blue-500/10  text-blue-400  border-blue-500/20"  />
          <StatChip value={dncCount}   label="DNC"       color="bg-red-500/10   text-red-400   border-red-500/20"   />
        </div>
      </div>

      {/* ── Toolbar: Search & Filters ───────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-slate-800/50 flex flex-wrap items-center justify-between gap-4 bg-slate-900/20">
        
        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
           <Filter size={11} className="text-slate-600 mr-1 flex-shrink-0" />
           {FILTER_TABS.map(tab => {
             const count = tab.key === 'All'
               ? customerLeads.length
               : tab.key === 'HighPriority' 
                 ? customerLeads.filter(l => l.lead_score > 70 && l.disposition !== 'SALE').length
                 : customerLeads.filter(l => l.disposition === tab.key).length;
             return (
               <button
                 key={tab.key}
                 onClick={() => setActiveFilter(tab.key)}
                 className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-200 ${
                   activeFilter === tab.key
                     ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-inner'
                     : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'
                 }`}
               >
                 {tab.label} ({count})
               </button>
             );
           })}
           <button
             onClick={() => setSortByScore(!sortByScore)}
             className={`ml-2 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-200 border ${
                sortByScore ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : 'text-slate-500 hover:text-slate-300 border-slate-700'
             }`}
           >
             Sort by Score
           </button>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-3">
           <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                 type="text" 
                 placeholder="Search phone, name, status..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="bg-slate-950/60 border border-slate-700 text-slate-200 text-xs rounded-full pl-8 pr-4 py-1.5 focus:outline-none focus:border-gold-500/50 transition-colors placeholder-slate-600 w-[200px]"
              />
           </div>
           
           <button
             onClick={() => {
                   const exportData = filtered.map(lead => {
                      // Format duration to MM:SS string or numeric if preferred
                      const mins = Math.floor((lead.duration || 0) / 60);
                      const secs = (lead.duration || 0) % 60;
                      const formattedDuration = `${mins}m ${secs}s`;
                      
                      return {
                         "Lead Name": lead.name || 'Unknown',
                         "Phone": lead.phone,
                         "Disposition": lead.disposition,
                         "Duration": formattedDuration,
                         "Call Time (System)": new Date(lead.time).toLocaleString()
                      };
                   });
                   const csv = Papa.unparse(exportData);
                   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                   const link = document.createElement("a");
                   link.href = URL.createObjectURL(blob);
                   link.setAttribute("download", `Nayatel_Leads_Export_${new Date().getTime()}.csv`);
                   document.body.appendChild(link);
                   link.click();
                   document.body.removeChild(link);
             }}
             className="flex items-center gap-2 px-4 py-1.5 bg-slate-800/80 hover:bg-gold-500/20 text-slate-300 hover:text-gold-400 border border-slate-700 hover:border-gold-500/50 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all"
           >
             Export CSV
           </button>
        </div>
      </div>

      {/* ── Table / Empty State ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar min-h-[300px]">
          <table className="w-full text-left text-sm" style={{ minWidth: '800px' }}>
            <thead
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sticky top-0 z-10 shadow-sm"
              style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)' }}
            >
              <tr>
                <th className="px-5 py-3.5 border-b border-slate-800/60">Customer</th>
                <th className="px-5 py-3.5 border-b border-slate-800/60">Phone</th>
                <th className="px-5 py-3.5 border-b border-slate-800/60 text-center">Score</th>
                <th className="px-5 py-3.5 border-b border-slate-800/60">Status</th>
                <th className="px-5 py-3.5 border-b border-slate-800/60 text-center">Mood</th>
                <th className="px-5 py-3.5 border-b border-slate-800/60 text-center">WhatsApp Sent</th>
                <th className="px-5 py-3.5 border-b border-slate-800/60">Duration</th>
                <th className="px-5 py-3.5 border-b border-slate-800/60 text-right">Re-Dial</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((lead, idx) => {
                const dispo = DISPO_META[lead.disposition] || { label: lead.disposition, cls: 'bg-slate-700 text-slate-400 border-slate-600', icon: null };
                const sent  = SENTIMENT_META[lead.sentiment] || SENTIMENT_META.neutral;
                const mins  = Math.floor((lead.duration || 0) / 60);
                const secs  = (lead.duration || 0) % 60;
                const isHovered = hoveredRow === idx;

                  <React.Fragment key={lead.id}>
                    <tr
                      onMouseEnter={() => setHoveredRow(idx)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      className="transition-colors border-b border-slate-800/30 cursor-pointer"
                      style={{ background: isHovered ? 'rgba(30,41,59,0.5)' : 'transparent' }}
                    >
                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-gold-400 flex-shrink-0"
                            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}
                          >
                            {(lead.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-slate-100 font-medium truncate max-w-[140px] leading-tight">{lead.name}</p>
                            <p className="text-slate-500 text-[10px] uppercase font-mono mt-0.5">
                              {new Date(lead.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 font-mono text-gold-400 font-bold tracking-wider text-sm">
                        {lead.phone}
                      </td>

                      {/* Score */}
                      <td className="px-5 py-4 text-center">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-[10px] font-bold ${
                           (lead.lead_score || 0) < 40 ? 'text-red-400 border-red-500/30 bg-red-500/10' 
                           : (lead.lead_score || 0) <= 70 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                           : 'text-green-400 border-green-500/30 bg-green-500/10'
                        }`}>
                          {lead.lead_score || 0}
                        </div>
                      </td>

                      {/* Disposition */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${dispo.cls}`}>
                          {dispo.icon}
                          {dispo.label}
                        </span>
                      </td>

                      {/* Sentiment */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`text-xl ${sent.cls}`}
                          title={sent.label}
                          role="img"
                          aria-label={sent.label}
                        >
                          {sent.icon}
                        </span>
                      </td>

                      {/* WhatsApp Sent */}
                      <td className="px-5 py-4 text-center">
                        {lead.whatsappSent ? (
                            <div className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm mx-auto">
                              <CheckCircle2 size={12} />
                              Sent
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1 text-slate-500 px-2 py-0.5 text-[10px] font-bold uppercase mx-auto">
                              <MessageCircle size={12} className="opacity-40" />
                              No
                            </div>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-4 font-mono text-slate-400 text-xs">
                        {mins > 0 ? `${mins}m ` : ''}{secs}s
                      </td>

                      {/* Re-Dial */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); makeCall(lead.phone); }}
                          disabled={callStatus !== 'Idle' || lead.disposition === 'DNC'}
                          title={
                            lead.disposition === 'DNC'
                              ? 'DNC — Do Not Call'
                              : callStatus !== 'Idle'
                                ? 'A call is already active'
                                : `Re-dial ${lead.phone}`
                          }
                          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 ml-auto ${
                            lead.disposition === 'DNC'
                              ? 'opacity-20 cursor-not-allowed bg-slate-800 text-slate-600 border-slate-700'
                              : callStatus !== 'Idle'
                                ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                                : 'bg-slate-800 hover:bg-gold-500/20 text-slate-400 hover:text-gold-400 border-slate-700 hover:border-gold-500/40 shadow-sm'
                          }`}
                          aria-label={`Re-dial ${lead.phone}`}
                        >
                          <Phone size={13} />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded AI Summary Row */}
                    {expandedRow === idx && (
                       <tr>
                         <td colSpan="8" className="px-5 py-4 bg-slate-900/60 border-b border-slate-800/40">
                            {lead.ai_summary ? (() => {
                               try {
                                  const ai = JSON.parse(lead.ai_summary);
                                  return (
                                     <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2">
                                        <div className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                                          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1.5">Call Summary</p>
                                          {ai.summary}
                                        </div>
                                        {ai.nextAction && (
                                          <div className="mt-1 flex items-start gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5">
                                            <Target size={14} className="text-purple-400 mt-0.5 shrink-0" />
                                            <div>
                                              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-0.5">Recommended Action</p>
                                              <p className="text-xs text-purple-200">{ai.nextAction}</p>
                                            </div>
                                          </div>
                                        )}
                                     </div>
                                  );
                               } catch(e) { return <span className="text-slate-500 text-xs">Analysis processing...</span>; }
                            })() : (
                               <div className="text-slate-500 text-xs italic p-2">No AI summary generated for this call.</div>
                            )}
                            <WhatsAppChat phone={lead.phone} />
                         </td>
                       </tr>
                    )}
                  </React.Fragment>
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

