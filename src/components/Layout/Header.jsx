import { useEffect, useState } from 'react';
import { useCallContext } from '../../context/CallContext';

export default function Header() {
  const { agentAuth, toggleAgentStatus, isRegistered, vosBalance, vosStatus } = useCallContext();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 shadow-sm shrink-0">
       <h2 className="text-xl font-semibold text-slate-100 tracking-wide font-sans">
         Vicidial React Connect
       </h2>
       
       <div className="ml-8 flex gap-4 text-xs font-mono tracking-widest uppercase">
          <span className="bg-slate-950 px-3 py-1 rounded border border-slate-800 text-gold-500 shadow-inner">
             Ext: {agentAuth.extension || 'None'}
          </span>
       </div>

       <div className="ml-auto flex items-center gap-6">
          <div className="flex items-center gap-3">
             <span className="text-xs text-gold-400 font-mono tracking-widest uppercase">WSS Status:</span>
             <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isRegistered ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
               <span className={`w-2 h-2 rounded-full ${isRegistered ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
               {isRegistered ? 'Registered' : 'Disconnected'}
             </span>
          </div>

          <div className="w-px h-8 bg-slate-800"></div>

          <div className="flex flex-col text-right justify-center">
             <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mb-0.5">VOS Wallet</span>
             <span className="text-sm font-mono text-gold-400 font-bold flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${vosStatus === 'Connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`}></span>
                ${vosBalance?.toFixed(2)}
             </span>
          </div>

          <div className="w-px h-8 bg-slate-800"></div>

          <div className="text-xl font-mono text-gold-400 font-bold">
             {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          
          <button 
            onClick={toggleAgentStatus}
            className={`cursor-pointer px-5 py-2.5 rounded font-bold uppercase tracking-widest text-xs border shadow transition-colors ${
              agentAuth.status === 'PAUSED' 
               ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
               : 'bg-gold-500/20 border-gold-500 hover:bg-gold-500/30 text-gold-400'
            }`}
          >
            {agentAuth.status === 'PAUSED' ? 'Start Session (Ready)' : 'Pause Active Session'}
          </button>
       </div>
    </header>
  );
}
