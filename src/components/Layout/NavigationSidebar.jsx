import React from 'react';
import { LayoutDashboard, PhoneCall, Database, BarChart3, HardDrive, PhoneOff, Shield } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

export default function NavigationSidebar({ activeTab, setActiveTab }) {
  const { agentAuth, userRole } = useCallContext();
  
  const AGENT_TABS = [
    { key: 'cockpit',     icon: <LayoutDashboard size={20} />, label: 'Cockpit'           },
    { key: 'omnichannel', icon: <PhoneCall size={20} />,       label: 'Omnichannel Center' },
    { key: 'leadvault',   icon: <Database size={20} />,        label: 'Lead Vault'         },
    { key: 'analytics',   icon: <BarChart3 size={20} />,       label: 'Analytics'          },
    { key: 'reporting',   icon: <BarChart3 size={20} />,       label: 'Advanced Reports'   },
    { key: 'vault',       icon: <HardDrive size={20} />,       label: 'Vault'              },
  ];

  const ADMIN_ONLY_TABS = [
    { key: 'admin', icon: <Shield size={20} />, label: 'Admin Control' },
  ];

  const TABS = userRole === 'admin' ? [...AGENT_TABS, ...ADMIN_ONLY_TABS] : AGENT_TABS;

  return (
    <aside className="w-68 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6 z-10 hidden md:flex shrink-0 shadow-2xl relative transition-all duration-300">
      {/* Nayatel Glassmorphism sidebar accent */}
      <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-cyan-400/50 via-gold-500/30 to-transparent" />

      {/* Brand & Agent Info */}
      <div className="w-full px-6 mb-8 flex flex-col items-center">
        <div className="relative mb-4 group cursor-pointer">
          <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full group-hover:bg-cyan-400/40 transition-all duration-500"></div>
          <div className="relative w-20 h-20 rounded-full bg-slate-900 border-[3px] border-gold-400/80 flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(0,232,255,0.15)] group-hover:shadow-[0_0_35px_rgba(0,232,255,0.3)] transition-all duration-500">
            <img src={`https://ui-avatars.com/api/?name=${agentAuth?.username || 'A'}&background=0B1120&color=00E8FF&font-size=0.4`} alt="Agent" className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity" />
          </div>
          {/* Status Indicator */}
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
        </div>
        
        <div className="text-center w-full">
           <p className="text-base font-bold text-slate-100 truncate tracking-wide">{agentAuth?.username || 'Agent Desk'}</p>
           <p className="text-xs text-cyan-400 font-mono tracking-[0.2em] uppercase mt-1 opacity-80">ID: {agentAuth?.extension || 'SYS-01'}</p>
           {/* Role Badge */}
           <div className="mt-2">
             <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
               userRole === 'admin'
                 ? 'bg-gold-500/20 text-gold-400 border-gold-500/40 shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                 : 'bg-slate-800 text-slate-500 border-slate-700'
             }`}>
               <span className={`w-1.5 h-1.5 rounded-full ${userRole === 'admin' ? 'bg-gold-400 animate-pulse' : 'bg-slate-600'}`} />
               {userRole === 'admin' ? 'Super Admin' : 'Agent'}
             </span>
           </div>
        </div>
      </div>

      <nav className="flex-1 w-full space-y-2 px-4">
         {TABS.map(tab => (
           <NavItem 
             key={tab.key}
             icon={tab.icon} 
             label={tab.label} 
             active={activeTab === tab.key} 
             onClick={() => setActiveTab(tab.key)}
           />
         ))}
      </nav>
      
      {/* System Status */}
      <div className="w-full px-4 mb-2 mt-auto">
        <div className="relative p-4 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
           <PhoneOff className="mx-auto text-slate-500 mb-2 drop-shadow-md group-hover:text-cyan-400 transition-colors duration-300" size={22} />
           <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase text-center group-hover:text-cyan-300 transition-colors">WebRTC Active</p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`relative w-full flex items-center py-3 px-4 rounded-xl transition-all duration-400 transform active:scale-[0.98]
      ${active 
        ? 'bg-slate-800/50 text-cyan-400 border border-slate-700/50 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md' 
        : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-300 border border-transparent'
      }`}
    >
      {/* Active Tab Glow */}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent rounded-xl pointer-events-none"></div>
      )}
      
      <span className={`relative z-10 drop-shadow-md mr-3.5 transition-colors duration-300 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
        {icon}
      </span>
      
      <span className={`relative z-10 text-[13px] tracking-wide transition-all duration-300 ${active ? 'font-semibold' : 'font-medium'}`}>
        {label}
      </span>
      
      {active && (
        <div className="ml-auto flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gold-400 shadow-[0_0_10px_rgba(212,175,55,1)] animate-pulse"></div>
        </div>
      )}
    </button>
  );
}
