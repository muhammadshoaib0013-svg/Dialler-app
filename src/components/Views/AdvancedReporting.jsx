import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel,
  LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  TrendingUp, Download, Phone, PhoneIncoming, PhoneOutgoing,
  Award, Clock, Users, BarChart2, Filter, FileText,
} from 'lucide-react';
import { useCallContext } from '../../context/CallContext';
import { useAdminContext } from '../../context/AdminContext';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  gold:    '#D4AF37',
  cyan:    '#00E8FF',
  green:   '#22c55e',
  red:     '#ef4444',
  blue:    '#3b82f6',
  purple:  '#a855f7',
  amber:   '#f59e0b',
  slate:   '#64748b',
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      {label && <p className="text-slate-400 font-mono mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = C.gold }) {
  return (
    <div className="glass-panel p-5 flex items-center gap-4 border border-slate-800 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: color }} />
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '15', border: `1px solid ${color}30` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section Shell ────────────────────────────────────────────────────────────
function Section({ title, icon, children, action }) {
  return (
    <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200 flex items-center gap-2">
          <span className="text-gold-400">{icon}</span> {title}
        </h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdvancedReporting() {
  const { sessionLogs, inboundLogs, userRole } = useCallContext();
  const { agents } = useAdminContext();
  const [agentFilter, setAgentFilter] = useState('all');
  const printRef = useRef(null);

  const filtered = useMemo(() =>
    agentFilter === 'all' ? sessionLogs : sessionLogs.filter(l => (l.agentId || '') === agentFilter),
    [sessionLogs, agentFilter]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const total    = filtered.length;
    const connected = filtered.filter(l => l.talkDuration > 0).length;
    const sales    = filtered.filter(l => l.disposition === 'SALE').length;
    const avgHandle = total ? Math.round(filtered.reduce((s, l) => s + (l.talkDuration || 0), 0) / total) : 0;
    const convRate = connected ? ((sales / connected) * 100).toFixed(1) : '0.0';
    return { total, connected, sales, avgHandle, convRate };
  }, [filtered]);

  // ── Funnel ────────────────────────────────────────────────────────────────
  const funnelData = useMemo(() => [
    { name: 'Total Leads',      value: kpi.total,     fill: C.blue   },
    { name: 'Connected Calls',  value: kpi.connected, fill: C.cyan   },
    { name: 'Confirmed Sales',  value: kpi.sales,     fill: C.green  },
  ], [kpi]);

  // ── Hourly Heatmap ────────────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const h = {};
    [...filtered, ...inboundLogs].forEach(l => {
      const t = new Date(l.callEndTime || l.time || Date.now());
      const hr = t.getHours().toString().padStart(2, '0') + ':00';
      h[hr] = (h[hr] || 0) + 1;
    });
    return Array.from({ length: 24 }, (_, i) => {
      const label = i.toString().padStart(2, '0') + ':00';
      return { time: label, calls: h[label] || 0 };
    });
  }, [filtered, inboundLogs]);

  // ── AHT Chart ─────────────────────────────────────────────────────────────
  const ahtData = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      const code = l.dispositionLabel || l.disposition || 'Unknown';
      if (!map[code]) map[code] = { total: 0, count: 0 };
      map[code].total += l.talkDuration || 0;
      map[code].count += 1;
    });
    return Object.entries(map).map(([name, v]) => ({ name, aht: Math.round(v.total / v.count) || 0 }))
      .sort((a, b) => b.aht - a.aht).slice(0, 7);
  }, [filtered]);

  // ── Agent Leaderboard ─────────────────────────────────────────────────────
  const leaderboard = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      const key = l.agentName || l.agentId || 'Unknown';
      if (!map[key]) map[key] = { name: key, sales: 0, talkTime: 0, calls: 0 };
      if (l.disposition === 'SALE') map[key].sales += 1;
      map[key].talkTime += l.talkDuration || 0;
      map[key].calls += 1;
    });
    return Object.values(map).sort((a, b) => b.sales - a.sales || b.talkTime - a.talkTime).slice(0, 10);
  }, [filtered]);

  // ── Combined Log (Inbound + Outbound) ────────────────────────────────────
  const combinedLog = useMemo(() => {
    const out = filtered.map(l => ({ ...l, direction: 'outbound', phone: l.phone, name: l.customerName, time: l.callEndTime || l.time }));
    const inb = inboundLogs.map(l => ({ ...l, direction: 'inbound',  disposition: l.status, dispositionLabel: l.status }));
    return [...out, ...inb].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 100);
  }, [filtered, inboundLogs]);

  // ── PDF Export (print-friendly) ───────────────────────────────────────────
  const handlePrint = () => window.print();

  const fmtSec = (s) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-[1900px] mx-auto flex flex-col pt-2"
      ref={printRef}
    >
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="text-gold-400" size={26} /> Executive Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-widest">World-Class Reporting · Real-Time</p>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'admin' && agents.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
              <Filter size={13} className="text-slate-500" />
              <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
                className="bg-transparent text-slate-300 text-xs font-mono outline-none cursor-pointer">
                <option value="all">All Agents</option>
                {agents.map(a => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/40 text-gold-400 font-bold text-xs uppercase tracking-widest transition-all no-print">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={<Phone size={20} />}        label="Total Calls"      value={kpi.total}      color={C.cyan}   />
        <StatCard icon={<PhoneOutgoing size={20} />} label="Connected"        value={kpi.connected}  color={C.blue}   />
        <StatCard icon={<Award size={20} />}         label="Sales Closed"     value={kpi.sales}      color={C.green}  />
        <StatCard icon={<Clock size={20} />}         label="Avg Handle Time"  value={fmtSec(kpi.avgHandle)} color={C.purple} />
        <StatCard icon={<TrendingUp size={20} />}    label="Conversion Rate"  value={`${kpi.convRate}%`}    sub={`${kpi.connected} connected`} color={C.gold} />
      </div>

      {/* ── Row 1: Funnel + AHT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Conversion Funnel" icon={<BarChart2 size={16} />}>
          {kpi.total === 0 ? (
            <EmptyState text="Make calls to see funnel data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical" barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {funnelData.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.85} />)}
                  <LabelList dataKey="value" position="right" style={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="AHT by Disposition (seconds)" icon={<Clock size={16} />}>
          {ahtData.length === 0 ? (
            <EmptyState text="No call data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ahtData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="aht" name="Avg Handle Time (s)" fill={C.purple} radius={[4, 4, 0, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* ── Row 2: Hourly Heatmap ── */}
      <Section title="24-Hour Call Traffic Heatmap" icon={<TrendingUp size={16} />}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourlyData} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} interval={1} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey="calls" name="Calls" radius={[3, 3, 0, 0]}>
              {hourlyData.map((d, i) => (
                <Cell key={i} fill={d.calls > 0 ? C.cyan : '#1e293b'} fillOpacity={Math.min(0.3 + (d.calls / (Math.max(...hourlyData.map(h => h.calls)) || 1)) * 0.7, 1)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* ── Row 3: Leaderboard ── */}
      <Section title="Agent Leaderboard" icon={<Award size={16} />}>
        {leaderboard.length === 0 ? (
          <EmptyState text="No agent data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Rank', 'Agent', 'Sales', 'Talk Time', 'Total Calls', 'Conv. %'].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold pb-3 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {leaderboard.map((a, i) => (
                  <tr key={a.name} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`text-xs font-bold font-mono ${i === 0 ? 'text-gold-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-200">{a.name}</td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-400 font-bold text-sm">{a.sales}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-xs">{fmtSec(a.talkTime)}</td>
                    <td className="py-3 px-3 text-cyan-400 font-mono text-xs">{a.calls}</td>
                    <td className="py-3 px-3 text-gold-400 font-bold text-xs">
                      {a.calls > 0 ? ((a.sales / a.calls) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Row 4: Multi-Channel Combined Log ── */}
      <Section
        title="Multi-Channel Call Log"
        icon={<FileText size={16} />}
        action={
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Inbound
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Outbound
            </span>
          </div>
        }
      >
        {combinedLog.length === 0 ? (
          <EmptyState text="No call logs yet — make or receive a call to see records here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Direction', 'Time', 'Phone', 'Name', 'Duration', 'Disposition', 'Agent', 'Recording'].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold pb-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {combinedLog.map((log, i) => {
                  const isIn = log.direction === 'inbound';
                  return (
                    <tr key={i} className={`hover:bg-slate-800/30 transition-colors ${isIn ? 'border-l-2 border-blue-500/30' : 'border-l-2 border-emerald-500/30'}`}>
                      <td className="py-2.5 px-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold ${isIn ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          {isIn ? <PhoneIncoming size={10} /> : <PhoneOutgoing size={10} />}
                          {isIn ? 'Inbound' : 'Outbound'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-500 whitespace-nowrap">
                        {log.time ? new Date(log.time).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-cyan-400">{log.phone || '—'}</td>
                      <td className="py-2.5 px-2 text-slate-300">{log.name || log.customerName || '—'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-400">{log.duration || log.talkDuration ? fmtSec(log.duration || log.talkDuration) : '—'}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          (log.disposition || '').includes('SALE') || (log.disposition || '') === 'answered' ? 'bg-emerald-500/10 text-emerald-400' :
                          (log.disposition || '').includes('NI') || (log.disposition || '') === 'missed' ? 'bg-red-500/10 text-red-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {log.dispositionLabel || log.disposition || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-400">{log.agentName || log.agentId || 'Admin'}</td>
                      <td className="py-2.5 px-2">
                        {log.recordingId && log.recordingId !== 'N/A' ? (
                          <a href={`https://recordings.hbelectronics.pk/listen/${log.recordingId}`}
                            target="_blank" rel="noreferrer"
                            className="text-gold-400 hover:text-gold-300 font-mono text-[10px] underline underline-offset-2">
                            ▶ Play
                          </a>
                        ) : <span className="text-slate-700">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </motion.div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-600">
      <BarChart2 size={36} className="mb-3 opacity-30" />
      <p className="text-sm font-mono">{text}</p>
    </div>
  );
}
