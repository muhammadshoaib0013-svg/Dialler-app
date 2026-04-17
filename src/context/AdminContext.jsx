import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SCRIPT_TEMPLATES as DEFAULT_SCRIPTS } from './CallContext';

// ─── Default Admin Credentials ────────────────────────────────────────────────
const ADMIN_CREDENTIALS = { username: 'admin', password: '123' };

// ─── localStorage Keys ────────────────────────────────────────────────────────
const AGENTS_KEY   = 'hb_agents_v1';
const SCRIPTS_KEY  = 'hb_scripts_v1';

// ─── Agent Status Pool ────────────────────────────────────────────────────────
export const AGENT_STATUSES = {
  ready:   { label: 'Ready',   color: 'bg-emerald-400', glow: 'shadow-[0_0_8px_rgba(52,211,153,0.8)]', text: 'text-emerald-400' },
  on_call: { label: 'On Call', color: 'bg-red-500',     glow: 'shadow-[0_0_8px_rgba(239,68,68,0.8)]',  text: 'text-red-400'     },
  paused:  { label: 'Paused',  color: 'bg-amber-400',   glow: 'shadow-[0_0_8px_rgba(251,191,36,0.8)]', text: 'text-amber-400'   },
  offline: { label: 'Offline', color: 'bg-slate-600',   glow: '',                                      text: 'text-slate-500'   },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {

  // ── Auth ────────────────────────────────────────────────────────────────────
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  // ── Agent Roster ────────────────────────────────────────────────────────────
  const [agents, setAgents] = useState(() => {
    try {
      const stored = localStorage.getItem(AGENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Persist agents whenever they change
  useEffect(() => {
    localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
  }, [agents]);

  // ── Script Store (Editable by Admin) ────────────────────────────────────────
  const [scriptTemplates, setScriptTemplates] = useState(() => {
    try {
      const stored = localStorage.getItem(SCRIPTS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_SCRIPTS;
    } catch { return DEFAULT_SCRIPTS; }
  });

  useEffect(() => {
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scriptTemplates));
  }, [scriptTemplates]);

  const updateScript = useCallback((index, newText) => {
    setScriptTemplates(prev => prev.map((s, i) => i === index ? { ...s, text: newText } : s));
  }, []);

  const updateScriptTitle = useCallback((index, newTitle) => {
    setScriptTemplates(prev => prev.map((s, i) => i === index ? { ...s, title: newTitle } : s));
  }, []);

  const resetScript = useCallback((index) => {
    setScriptTemplates(prev => prev.map((s, i) => i === index ? { ...s, text: DEFAULT_SCRIPTS[i]?.text ?? s.text } : s));
  }, []);

  const resetAllScripts = useCallback(() => {
    setScriptTemplates(DEFAULT_SCRIPTS);
  }, []);

  const addScript = useCallback(() => {
    const COLORS = ['blue', 'purple', 'green', 'amber', 'rose', 'cyan', 'indigo', 'teal'];
    const color = COLORS[scriptTemplates.length % COLORS.length];
    setScriptTemplates(prev => [...prev, {
      title: `Custom Script ${prev.length + 1}`,
      text: 'Enter your custom script here. Use [Customer Name] as a placeholder.',
      color,
      custom: true,
    }]);
  }, [scriptTemplates.length]);

  const deleteScript = useCallback((index) => {
    setScriptTemplates(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Live Agent Status Simulation ────────────────────────────────────────────
  // In production, replace this with WebSocket events from Vicidial
  const [agentStatuses, setAgentStatuses] = useState({});

  useEffect(() => {
    const STATUS_POOL = ['ready', 'ready', 'paused', 'on_call', 'offline'];
    // Initialize statuses
    const initial = {};
    agents.forEach(a => { initial[a.agentId] = 'offline'; });
    setAgentStatuses(initial);

    const interval = setInterval(() => {
      setAgentStatuses(prev => {
        const next = { ...prev };
        agents.forEach(a => {
          // 15% chance of status change per tick for simulation realism
          if (Math.random() < 0.15) {
            next[a.agentId] = STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)];
          }
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [agents]);

  // ── CRUD Methods ────────────────────────────────────────────────────────────
  const addAgent = useCallback((agentData) => {
    const newAgent = {
      ...agentData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setAgents(prev => [...prev, newAgent]);
    setAgentStatuses(prev => ({ ...prev, [agentData.agentId]: 'offline' }));
    return newAgent;
  }, []);

  const deleteAgent = useCallback((id) => {
    setAgents(prev => {
      const agent = prev.find(a => a.id === id);
      if (agent) {
        setAgentStatuses(s => {
          const copy = { ...s };
          delete copy[agent.agentId];
          return copy;
        });
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const updateAgent = useCallback((id, updates) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const resetPassword = useCallback((id, newPassword) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, password: newPassword } : a));
  }, []);

  // ── Login validation for agents (used by CallContext) ──────────────────────
  const validateLogin = useCallback((username, password) => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      return { valid: true, role: 'admin', data: { username, extension: 'ADM-01', campaign: 'All' } };
    }
    const agent = agents.find(a => a.agentId === username && a.password === password);
    if (agent) {
      return { valid: true, role: 'agent', data: { username: agent.name, extension: agent.extension, agentId: agent.agentId, campaign: 'Default' } };
    }
    return { valid: false };
  }, [agents]);

  const value = {
    // Auth
    adminLoggedIn, setAdminLoggedIn,
    // Agent roster
    agents, addAgent, deleteAgent, updateAgent, resetPassword,
    // Live statuses
    agentStatuses,
    // Scripts
    scriptTemplates, updateScript, updateScriptTitle, resetScript, resetAllScripts, addScript, deleteScript,
    // Login helper
    validateLogin,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdminContext = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdminContext must be used inside AdminProvider');
  return ctx;
};
