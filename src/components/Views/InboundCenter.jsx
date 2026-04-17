import React from 'react';
import { motion } from 'framer-motion';
import { PhoneMissed, PhoneIncoming, Clock, Play } from 'lucide-react';
import InboundCallHandler from '../Workspace/InboundCallHandler';
import SupervisorPanel from '../Shared/SupervisorPanel';
import { useCallContext } from '../../context/CallContext';

export default function InboundCenter() {
  const { inboundLogs } = useCallContext();

  // Filter logs for missed or voicemail types
  const missedCalls = inboundLogs.filter(log => log.status === 'missed' || log.status === 'voicemail');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Row 1: Inbound Handler & Strip ── */}
      <InboundCallHandler />

      {/* ── Row 2: Queue Stats / Supervisor & Missed Call Tracker ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Supervisor Panel */}
        <div className="lg:col-span-1">
          <SupervisorPanel />
        </div>

        {/* Right Col: Missed Call Tracker */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-6 shadow-xl h-full flex flex-col font-sans border-t-2 border-amber-500/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <PhoneMissed size={20} className="text-amber-400" />
                Missed Call Tracker
              </h3>
              <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded text-xs font-bold shadow-sm uppercase tracking-widest">
                {missedCalls.length} Pending
              </div>
            </div>

            {missedCalls.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-10">
                <PhoneIncoming size={36} className="opacity-20 mb-3" />
                <p className="text-sm font-sans font-medium text-slate-400">No Missed Calls</p>
                <p className="text-xs mt-1 text-slate-600 font-mono tracking-wide">Queue is currently clear.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto custom-scrollbar border border-slate-800 rounded-xl bg-slate-900/40">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/70 text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 z-10 font-bold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Phone / Caller</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {missedCalls.map((call, idx) => (
                      <tr key={call.id || idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                          {new Date(call.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                           <div className="font-mono text-gold-400 font-bold tracking-wide text-xs">{call.phone}</div>
                           <div className="text-[11px] text-slate-500 mt-0.5">{call.name || 'Unknown Caller'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                            call.status === 'voicemail' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {call.status === 'voicemail' ? 'Voicemail' : 'Missed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-gold-500/20 hover:text-gold-400 border border-slate-700 hover:border-gold-500/40 text-slate-400 px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest transition-all active:scale-95"
                          >
                            <Clock size={12} /> Call Back
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </motion.div>
  );
}
