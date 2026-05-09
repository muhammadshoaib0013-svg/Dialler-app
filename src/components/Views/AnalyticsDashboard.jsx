import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, ReferenceLine
} from 'recharts';
import { useCallContext } from '../../context/CallContext';

export default function AnalyticsDashboard() {
  const { agentAuth } = useCallContext();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('Today'); // 'Today', 'This Week', 'This Month'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calls?limit=500', {
      headers: { 'Authorization': `Bearer ${window.__authToken || ''}` }
    })
      .then(r => r.json())
      .then(d => {
        setLogs(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []));
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      const logDate = new Date(log.created_at || log.call_start);
      if (filter === 'Today') {
        return logDate.toDateString() === now.toDateString();
      } else if (filter === 'This Week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return logDate >= weekAgo;
      } else if (filter === 'This Month') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [logs, filter]);

  // SEC 1: KPIs
  const kpis = useMemo(() => {
    const total = filteredLogs.length;
    const sales = filteredLogs.filter(l => l.disposition === 'SALE').length;
    const rate = total > 0 ? ((sales / total) * 100).toFixed(1) : 0;
    const talkTotal = filteredLogs.reduce((acc, l) => acc + (l.talk_duration || 0), 0);
    const avgTalk = total > 0 ? Math.round(talkTotal / total) : 0;
    const m = Math.floor(avgTalk / 60).toString().padStart(2, '0');
    const s = (avgTalk % 60).toString().padStart(2, '0');
    return { total, sales, rate, avgTalkStr: `${m}:${s}` };
  }, [filteredLogs]);

  // SEC 2: Disposition
  const dispoData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => { counts[l.disposition] = (counts[l.disposition] || 0) + 1; });
    const segments = [
      { name: 'SALE', color: '#10b981', count: counts['SALE'] || 0 },
      { name: 'CBHOLD', color: '#3b82f6', count: counts['CBHOLD'] || 0 },
      { name: 'NI', color: '#f97316', count: counts['NI'] || 0 },
      { name: 'DNC', color: '#ef4444', count: counts['DNC'] || 0 },
      { name: 'A', color: '#94a3b8', count: counts['A'] || 0 },
      { name: 'HANGUP', color: '#64748b', count: counts['HANGUP'] || 0 },
    ].filter(s => s.count > 0);
    return segments;
  }, [filteredLogs]);

  // SEC 3: Hourly
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, calls: 0, sales: 0 }));
    filteredLogs.forEach(l => {
      const logDate = new Date(log.created_at || log.call_start);
      const h = logDate.getHours();
      if (hours[h]) {
        hours[h].calls++;
        if (l.disposition === 'SALE') hours[h].sales++;
      }
    });
    return hours.map(h => ({ name: `${h.hour}:00`, total: h.calls, sales: h.sales }));
  }, [filteredLogs]);

  // SEC 4: Agents
  const agentStats = useMemo(() => {
    const agents = {};
    filteredLogs.forEach(l => {
      const name = l.agent_name || 'Unknown';
      if (!agents[name]) agents[name] = { name, calls: 0, sales: 0, talkTotal: 0, sentTotal: 0 };
      agents[name].calls++;
      if (l.disposition === 'SALE') agents[name].sales++;
      agents[name].talkTotal += (l.talk_duration || 0);
      const sentMap = { positive: 1, neutral: 0, negative: -1 };
      agents[name].sentTotal += (sentMap[l.sentiment?.toLowerCase()] || 0);
    });
    return Object.values(agents).map(a => ({
      ...a,
      rate: a.calls > 0 ? (a.sales / a.calls) * 100 : 0,
      avgTalk: a.calls > 0 ? Math.round(a.talkTotal / a.calls) : 0,
      avgSent: a.calls > 0 ? (a.sentTotal / a.calls) : 0
    })).sort((a, b) => b.rate - a.rate);
  }, [filteredLogs]);

  // SEC 5: Sentiment Trend
  const sentimentTrend = useMemo(() => {
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days[d.toDateString()] = { name: d.toLocaleDateString(undefined, { weekday: 'short' }), totalSent: 0, count: 0 };
    }
    filteredLogs.forEach(l => {
      const logDate = new Date(log.created_at || log.call_start);
      const key = logDate.toDateString();
      if (days[key]) {
        const sentMap = { positive: 1, neutral: 0, negative: -1 };
        days[key].totalSent += (sentMap[l.sentiment?.toLowerCase()] || 0);
        days[key].count++;
      }
    });
    return Object.values(days).map(d => ({ name: d.name, score: d.count > 0 ? d.totalSent / d.count : 0 }));
  }, [filteredLogs]);

  const customTooltip = { contentStyle: { backgroundColor: '#0F172A', borderColor: '#1e293b', color: '#f8fafc' }, itemStyle: { color: '#e2e8f0' } };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading metrics...</div>;

  return (
    <div className="w-full h-full flex flex-col gap-6 p-4 md:p-6 overflow-y-auto">
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-wide">Analytics Dashboard</h2>
        <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
          {['Today', 'This Week', 'This Month'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${filter === f ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Calls', val: kpis.total },
          { label: 'Sales', val: kpis.sales, color: 'text-emerald-400' },
          { label: 'Conversion', val: `${kpis.rate}%`, color: 'text-gold-400' },
          { label: 'Avg Talk', val: kpis.avgTalkStr },
        ].map((k, i) => (
          <div key={i} className="p-4 bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-lg flex flex-col items-center">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{k.label}</span>
            <span className={`text-3xl font-bold mt-2 ${k.color || 'text-white'}`}>{k.val}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 2: Disposition PieChart */}
        <div className="col-span-1 p-4 bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-lg">
          <h3 className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-4">Disposition Breakdown</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dispoData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} stroke="none">
                  {dispoData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip {...customTooltip} />
                <Legend verticalAlign="middle" align="right" layout="vertical" formatter={(val, e) => <span className="text-slate-300 text-xs ml-1">{val}: {e.payload.count}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 3: Hourly BarChart */}
        <div className="col-span-2 p-4 bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-lg">
          <h3 className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-4">Hourly Call Volume</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip {...customTooltip} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                <Bar dataKey="total" name="Total Calls" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" name="Sales" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* SECTION 4: Leaderboard */}
        <div className="col-span-2 p-4 bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-lg overflow-x-auto">
          <h3 className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-4">Agent Leaderboard</h3>
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-lg">Rank</th>
                <th className="px-4 py-3 font-semibold">Agent Name</th>
                <th className="px-4 py-3 font-semibold">Calls</th>
                <th className="px-4 py-3 font-semibold">Sales</th>
                <th className="px-4 py-3 font-semibold">Conv %</th>
                <th className="px-4 py-3 font-semibold">Avg Dur</th>
                <th className="px-4 py-3 font-semibold rounded-tr-lg">Sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {agentStats.map((a, i) => {
                let borderAccent = '';
                if (i === 0) borderAccent = 'border-l-[3px] border-l-gold-400';
                else if (i === 1) borderAccent = 'border-l-[3px] border-l-slate-300';
                else if (i === 2) borderAccent = 'border-l-[3px] border-l-amber-700';
                else borderAccent = 'border-l-[3px] border-l-transparent';

                const m = Math.floor(a.avgTalk / 60).toString().padStart(2, '0');
                const s = (a.avgTalk % 60).toString().padStart(2, '0');

                return (
                  <tr key={i} className={`hover:bg-slate-800/20 transition-colors ${borderAccent}`}>
                    <td className="px-4 py-3 font-medium text-slate-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-white">{a.name}</td>
                    <td className="px-4 py-3">{a.calls}</td>
                    <td className="px-4 py-3 text-emerald-400">{a.sales}</td>
                    <td className="px-4 py-3 text-gold-400">{a.rate.toFixed(1)}%</td>
                    <td className="px-4 py-3">{m}:{s}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${a.avgSent > 0 ? 'bg-emerald-500/10 text-emerald-400' : a.avgSent < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        {a.avgSent > 0 ? 'POSITIVE' : a.avgSent < 0 ? 'NEGATIVE' : 'NEUTRAL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {agentStats.length === 0 && <tr><td colSpan="7" className="px-4 py-6 text-center text-slate-500">No agents found for this period.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* SECTION 5: Sentiment LineChart */}
        <div className="col-span-1 p-4 bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-lg flex flex-col">
          <h3 className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-4">7-Day Sentiment</h3>
          <div className="h-[250px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} domain={[-1, 1]} ticks={[-1, 0, 1]} />
                <Tooltip {...customTooltip} cursor={{ stroke: '#334155' }} />
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="score" stroke="#00E8FF" strokeWidth={2} dot={{ fill: '#00E8FF', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 6: Script Performance */}
      <div className="p-4 bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-lg mb-8">
         <h3 className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-4">Script Performance (Sales vs. Negative Sentiment)</h3>
         <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart 
                 data={[
                    { name: 'Opening', salesViews: 24, negViews: 12 },
                    { name: 'Product Pitch', salesViews: 45, negViews: 8 },
                    { name: 'Objection Handler', salesViews: 18, negViews: 35 },
                    { name: 'Trial Close', salesViews: 60, negViews: 4 },
                    { name: 'Callback Setup', salesViews: 10, negViews: 20 },
                 ]} 
                 margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                 barGap={5}
               >
                 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                 <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                 <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                 <Tooltip {...customTooltip} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                 <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                 <Bar dataKey="salesViews" name="Views during SALE" fill="#10b981" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="negViews" name="Views leading to NEGATIVE Sentiment" fill="#ef4444" radius={[4, 4, 0, 0]} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}
