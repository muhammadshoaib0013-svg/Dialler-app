import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, FileText, Shield } from 'lucide-react';
import UserManagement from './UserManagement';
import LiveMonitor from './LiveMonitor';
import ScriptManager from './ScriptManager';

const ADMIN_TABS = [
  { key: 'users',   icon: <Users size={16} />,    label: 'User Management' },
  { key: 'monitor', icon: <Activity size={16} />,  label: 'Live Monitor'    },
  { key: 'scripts', icon: <FileText size={16} />,  label: 'Script Manager'  },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('users');

  const renderContent = () => {
    switch (tab) {
      case 'users':   return <UserManagement key="users" />;
      case 'monitor': return <LiveMonitor    key="monitor" />;
      case 'scripts': return <ScriptManager  key="scripts" />;
      default:        return <UserManagement key="users" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-[1800px] mx-auto h-full flex flex-col pt-2"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.15)]">
            <Shield size={20} className="text-gold-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-wide">Admin Control Center</h2>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Secure • Multi-Role • Enterprise</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-1.5 w-fit">
        {ADMIN_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
              tab === t.key
                ? 'bg-slate-800 text-gold-400 border border-slate-700 shadow-lg shadow-black/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className={tab === t.key ? 'text-gold-400' : 'text-slate-600'}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
