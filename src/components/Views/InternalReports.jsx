import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon, Activity, Terminal, Filter } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';
import { useAdminContext } from '../../context/AdminContext';

const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#f97316', '#64748b', '#334155'];

export default function InternalReports() {
  const { sessionLogs, sipLogs, pingVOSGateway, userRole } = useCallContext();
  const { agents } = useAdminContext();
  const sipLogsEndRef = useRef(null);
  const [agentFilter, setAgentFilter] = useState('all');

  // Filter logs by selected agent (admin only feature)
  const filteredLogs = useMemo(() => {
    if (userRole !== 'admin' || agentFilter === 'all') return sessionLogs;
    return sessionLogs.filter(l => (l.agentId || '') === agentFilter);
  }, [sessionLogs, agentFilter, userRole]);

  useEffect(() => {
    sipLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sipLogs]);

  // Aggregate Data for 'Sales vs Hangups' (Disposition Distribution)
  const dispositionData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(log => {
      const code = log.dispositionLabel || log.disposition || 'Unknown';
      counts[code] = (counts[code] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredLogs]);

  // Aggregate Data for Hourly Dial Velocity (calls per hour)
  const hourlyData = useMemo(() => {
    const hours = {};
    filteredLogs.forEach(log => {
      if (!log.time && !log.callEndTime) return;
      const t = new Date(log.callEndTime || log.time);
      const h = t.getHours();
      const label = h.toString().padStart(2, '0') + ':00';
      hours[label] = (hours[label] || 0) + 1;
    });
    return Object.entries(hours).map(([time, calls]) => ({ time, calls })).sort((a,b) => a.time.localeCompare(b.time));
  }, [filteredLogs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-[1800px] mx-auto h-full flex flex-col pt-2"
    >
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <PieChartIcon className="text-gold-400" />
            Internal Analytics
         </h2>
         <div className="flex items-center gap-4">
           {/* Agent Filter — Admin only */}
           {userRole === 'admin' && agents.length > 0 && (
             <div className="flex items-center gap-2">
               <Filter size={14} className="text-slate-500" />
               <select
                 value={agentFilter}
                 onChange={e => setAgentFilter(e.target.value)}
                 className="bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-gold-500/50 cursor-pointer"
               >
                 <option value="all">All Agents</option>
                 {agents.map(a => (
                   <option key={a.agentId} value={a.agentId}>{a.name} ({a.agentId})</option>
                 ))}
               </select>
             </div>
           )}
           <div className="text-sm font-mono text-slate-400 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             Records: <span className="text-gold-400 font-bold">{filteredLogs.length}</span>
             {agentFilter !== 'all' && <span className="text-slate-600 ml-1">/ {sessionLogs.length} total</span>}
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="glass-panel p-6 shadow-xl border-t-2 border-gold-500/50 flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-6 w-full text-left">Dispositions (Sales vs Hangups)</h3>
            
            {sessionLogs.length === 0 ? (
               <div className="flex-1 flex items-center justify-center text-slate-600 w-full min-h-[300px]">No call data available.</div>
            ) : (
               <div className="w-full h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={dispositionData}
                       cx="50%"
                       cy="50%"
                       innerRadius={70}
                       outerRadius={100}
                       paddingAngle={3}
                       dataKey="value"
                       stroke="rgba(0,0,0,0.2)"
                     >
                       {dispositionData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip 
                       contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(51, 65, 85, 0.5)', borderRadius: '8px', color: '#fff' }}
                       itemStyle={{ color: '#fff', fontSize: '12px' }}
                     />
                     <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            )}
        </div>

        {/* Bar Chart */}
        <div className="glass-panel p-6 shadow-xl border-t-2 border-blue-500/50 flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-6 w-full text-left flex items-center gap-2">
               <Activity size={16} className="text-blue-400"/> Hourly Dial Velocity
            </h3>
            
            {sessionLogs.length === 0 ? (
               <div className="flex-1 flex items-center justify-center text-slate-600 w-full min-h-[300px]">No call data available.</div>
            ) : (
               <div className="w-full h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" vertical={false} />
                     <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickMargin={10} />
                     <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(51, 65, 85, 0.5)', borderRadius: '8px' }}
                        itemStyle={{ color: '#60a5fa', fontSize: '12px', fontWeight: 'bold' }}
                        cursor={{ fill: 'rgba(51,65,85,0.2)' }}
                     />
                     <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            )}
        </div>
      </div>

      {/* SIP Debugger Section */}
      <div className="glass-panel p-6 shadow-xl border-t-2 border-emerald-500/50 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={16} className="text-emerald-400"/> VOS3000 SIP Debugger
             </h3>
             <button
               onClick={pingVOSGateway}
               className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded transition-colors text-xs font-bold uppercase tracking-widest"
             >
               <Activity size={14} /> Ping Gateway
             </button>
          </div>
          
          <div className="w-full h-[250px] bg-slate-950 rounded-lg p-4 font-mono text-xs overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner">
             {sipLogs.length === 0 ? (
                <div className="text-slate-500 flex items-center justify-center h-full">Waiting for proxy registration and SIP events...</div>
             ) : (
                sipLogs.map((log, index) => {
                  let colorClass = 'text-slate-300';
                  if (log.includes('->')) colorClass = 'text-cyan-400';
                  if (log.includes('<- 200') || log.includes('<- 180') || log.includes('<- 100')) colorClass = 'text-green-400';
                  if (log.match(/<- [456]\d{2}/)) colorClass = 'text-red-400';
                  
                  return (
                    <div key={index} className={`mb-1.5 ${colorClass} tracking-wide`}>
                      {log}
                    </div>
                  );
                })
             )}
             <div ref={sipLogsEndRef} />
          </div>
      </div>
    </motion.div>
  );
}
