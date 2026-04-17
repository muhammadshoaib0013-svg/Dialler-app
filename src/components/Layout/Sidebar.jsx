import { LayoutDashboard, Users, FileBarChart, PhoneOff, Headphones, Library } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { agentAuth } = useCallContext();
  
  const TABS = [
    { key: 'workspace', icon: <LayoutDashboard size={20} />, label: 'Workspace' },
    { key: 'inbound', icon: <Headphones size={20} />, label: 'Inbound Center' },
    { key: 'leads', icon: <Users size={20} />, label: 'Customer Leads' },
    { key: 'reports', icon: <FileBarChart size={20} />, label: 'Internal Reports' },
    { key: 'recordings', icon: <Library size={20} />, label: 'Recordings' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-8 z-10 hidden md:flex shrink-0 shadow-2xl relative">
      <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-slate-800 to-transparent" />

      <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-gold-500 flex items-center justify-center mb-6 overflow-hidden shadow-[0_0_15px_rgba(212,175,55,0.3)]">
        <img src={`https://ui-avatars.com/api/?name=${agentAuth.username || 'A'}&background=random`} alt="Agent" />
      </div>
      
      <div className="text-center mb-8 px-4 w-full">
         <p className="text-sm font-bold text-slate-200 truncate">{agentAuth.username || 'Agent'}</p>
         <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">ID: {agentAuth.extension || 'N/A'}</p>
      </div>

      <nav className="flex-1 w-full space-y-3 px-4">
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
      
      <div className="w-full px-4 mb-4">
        <div className="p-4 bg-slate-950 rounded-lg text-center border border-slate-800 shadow-inner group transition-colors hover:border-slate-700">
           <PhoneOff className="mx-auto text-slate-500 mb-2 isometric-icon group-hover:text-slate-400 transition-colors" size={24} />
           <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">WebRTC Ready</p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center p-3 rounded-lg transition-all duration-300 transform active:scale-95
      ${active 
        ? 'bg-gold-500/10 text-gold-400 border border-gold-500/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]' 
        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent'
      }`}
    >
      <span className={`isometric-icon mr-3 ${active ? 'text-gold-400' : 'text-slate-500'}`}>{icon}</span>
      <span className={`text-[13px] tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.9)] animate-pulse"></div>}
    </button>
  );
}
