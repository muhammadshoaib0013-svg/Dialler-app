import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, RefreshCw } from 'lucide-react';
import { useAdminContext, AGENT_STATUSES } from '../../context/AdminContext';

const STATUS_FILTERS = ['all', 'ready', 'on_call', 'paused', 'offline'];

export default function LiveMonitor() {
  const { agents, agentStatuses } = useAdminContext();
  const [filter, setFilter] = useState('all');

  const filteredAgents = agents.filter(a =>
    filter === 'all' ? true : (agentStatuses[a.agentId] || 'offline') === filter
  );

  const counts = STATUS_FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = agents.filter(a => (agentStatuses[a.agentId] || 'offline') === s).length;
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex flex-col gap-6 h-full"
    >
      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'ready',   label: 'Ready',   colorCls: 'text-emerald-400', bgCls: 'bg-emerald-500/10 border-emerald-500/30' },
          { key: 'on_call', label: 'On Call', colorCls: 'text-red-400',     bgCls: 'bg-red-500/10 border-red-500/30'         },
          { key: 'paused',  label: 'Paused',  colorCls: 'text-amber-400',   bgCls: 'bg-amber-500/10 border-amber-500/30'     },
          { key: 'offline', label: 'Offline', colorCls: 'text-slate-400',   bgCls: 'bg-slate-800/60 border-slate-700'        },
        ].map(s => (
          <div key={s.key} className={`glass-panel p-4 border ${s.bgCls} rounded-xl flex items-center gap-4`}>
            <div className={`text-3xl font-bold font-mono ${s.colorCls}`}>{counts[s.key]}</div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{s.label}</p>
              <p className="text-xs text-slate-400">agents</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Board */}
      <div className="glass-panel p-6 flex-1 flex flex-col border border-slate-700/50 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200 flex items-center gap-2">
            <Monitor size={16} className="text-cyan-400" />
            Live Agent Board
          </h3>
          <div className="flex gap-1.5 bg-slate-950/60 border border-slate-800 rounded-xl p-1">
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === f
                    ? 'bg-slate-800 text-gold-400 border border-slate-700'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f === 'all' ? `All (${agents.length})` : `${f.replace('_', ' ')} (${counts[f]})`}
              </button>
            ))}
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <Monitor size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-mono">No agents to monitor.</p>
            <p className="text-xs text-slate-700 mt-1">Create agents in the User Management tab first.</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-600">
            <p className="text-sm font-mono">No agents with status "{filter.replace('_', ' ')}".</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAgents.map(agent => {
                const statusKey = agentStatuses[agent.agentId] || 'offline';
                const status    = AGENT_STATUSES[statusKey];
                return (
                  <AgentCard key={agent.id} agent={agent} status={status} statusKey={statusKey} />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AgentCard({ agent, status, statusKey }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-slate-700 transition-colors relative overflow-hidden group"
    >
      {/* Glow top line */}
      <div className={`absolute top-0 left-0 w-full h-0.5 ${status.color} opacity-40`} />

      {/* Avatar + Status */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-base font-bold text-slate-300 overflow-hidden">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=0B1120&color=00E8FF&font-size=0.4`}
              alt={agent.name}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Status dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${status.color} ${status.glow} ${statusKey !== 'offline' ? 'animate-pulse' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-100 truncate">{agent.name}</p>
          <p className="text-[10px] font-mono text-cyan-400 tracking-wider">{agent.agentId}</p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950/60 rounded-lg p-2">
          <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-0.5">Extension</p>
          <p className="text-xs font-mono text-gold-400 font-bold">{agent.extension}</p>
        </div>
        <div className="bg-slate-950/60 rounded-lg p-2">
          <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-0.5">Status</p>
          <p className={`text-xs font-bold flex items-center gap-1.5 ${status.text}`}>
            <span className={`w-2 h-2 rounded-full ${status.color} inline-block ${statusKey !== 'offline' ? 'animate-pulse' : ''}`} />
            {status.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
