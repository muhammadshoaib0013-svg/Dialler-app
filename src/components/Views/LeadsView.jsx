import React from 'react';
import { motion } from 'framer-motion';
import { Network, Server } from 'lucide-react';
import CustomerLeadsPanel from '../Workspace/CustomerLeadsPanel';
import { useCallContext } from '../../context/CallContext';

export default function LeadsView() {
  const { autoDialerActive, callsMadeDay, totalListLength, autoDialerList } = useCallContext();

  const progressPercent = totalListLength > 0 ? Math.min(100, Math.round((callsMadeDay / totalListLength) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-[1800px] mx-auto h-full flex flex-col pt-2"
    >
      {/* ── Active Campaign Progress ── */}
      {(autoDialerActive || totalListLength > 0) && (
        <div className="glass-panel p-5 border-t-2 border-purple-500/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${autoDialerActive ? 'bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-pulse' : 'bg-slate-800'}`}>
              <Network size={24} className={autoDialerActive ? 'text-purple-400' : 'text-slate-500'} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Active Campaign Status</h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                {autoDialerActive ? 'Dialer is running' : 'Dialer stopped'} • {autoDialerList.length} queued
              </p>
            </div>
          </div>

          <div className="flex-1 w-full max-w-xl">
             <div className="flex justify-between text-[11px] uppercase text-slate-400 mb-1.5 font-bold tracking-wider">
                 <span>List Progress</span>
                 <span className="text-purple-400">{progressPercent}%</span>
             </div>
             <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                 <div className="h-full bg-purple-500 transition-all duration-500 flex items-center justify-end" style={{ width: `${progressPercent}%` }}>
                    <div className="w-full h-full bg-gradient-to-r from-transparent to-white/20" />
                 </div>
             </div>
             <div className="text-right text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-mono">
               {callsMadeDay} / {totalListLength} dialed today
             </div>
          </div>
        </div>
      )}

      {/* ── CRM Table panel ── */}
      <CustomerLeadsPanel />
    </motion.div>
  );
}
