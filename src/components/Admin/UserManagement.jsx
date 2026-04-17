import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, Edit3, KeyRound, CheckCircle, XCircle, Users } from 'lucide-react';
import { useAdminContext } from '../../context/AdminContext';

const EMPTY_FORM = { name: '', agentId: '', password: '', extension: '' };

// ── Field MUST be defined OUTSIDE the component to prevent re-mount on every render ─
function Field({ label, name, type = 'text', placeholder, value, onChange, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className={`bg-slate-950 border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 ${
          error ? 'border-red-500/60 focus:border-red-400' : 'border-slate-800 focus:border-gold-500/50'
        }`}
      />
      {error && <p className="text-red-400 text-[10px] font-mono mt-0.5">{error}</p>}
    </div>
  );
}

export default function UserManagement() {
  const { agents, addAgent, deleteAgent, updateAgent, resetPassword } = useAdminContext();

  const [form, setForm]               = useState(EMPTY_FORM);
  const [errors, setErrors]           = useState({});
  const [successMsg, setSuccessMsg]   = useState('');
  const [editId, setEditId]           = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPass, setNewPass]         = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const setField = (name) => (e) => setForm(p => ({ ...p, [name]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())      e.name      = 'Name required';
    if (!form.agentId.trim())   e.agentId   = 'Agent ID required';
    if (!form.password.trim())  e.password  = 'Password required';
    if (!form.extension.trim()) e.extension = 'Extension required';
    if (agents.some(a => a.agentId === form.agentId && a.id !== editId))
      e.agentId = 'Agent ID already exists';
    return e;
  };

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 2500); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (editId) {
      updateAgent(editId, form);
      flash('Agent updated successfully!');
      setEditId(null);
    } else {
      addAgent(form);
      flash('Agent created successfully!');
    }
    setForm(EMPTY_FORM);
  };

  const startEdit = (agent) => {
    setEditId(agent.id);
    setForm({ name: agent.name, agentId: agent.agentId, password: agent.password, extension: agent.extension });
    setErrors({});
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); setErrors({}); };

  const handleResetPassword = () => {
    if (!newPass.trim()) return;
    resetPassword(resetTarget, newPass);
    setResetTarget(null);
    setNewPass('');
    flash('Password reset!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full"
    >
      {/* ── Add / Edit Agent Form ── */}
      <div className="xl:col-span-1">
        <div className="glass-panel p-6 h-full flex flex-col border border-gold-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-gold-500 to-cyan-400" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200 flex items-center gap-2 mb-6">
            <UserPlus size={16} className="text-gold-400" />
            {editId ? 'Edit Agent' : 'Add New Agent'}
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
            <Field label="Full Name"  name="name"      placeholder="e.g. Ali Hassan"   value={form.name}      onChange={setField('name')}      error={errors.name} />
            <Field label="Agent ID"   name="agentId"   placeholder="e.g. AGT-001"      value={form.agentId}   onChange={setField('agentId')}   error={errors.agentId} />
            <Field label="Password"   name="password"  placeholder="Secure password"   value={form.password}  onChange={setField('password')}  error={errors.password}  type="password" />
            <Field label="Extension"  name="extension" placeholder="e.g. 8001"          value={form.extension} onChange={setField('extension')} error={errors.extension} />

            <div className="mt-auto flex gap-3 pt-4">
              <button type="submit"
                className="flex-1 py-3 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/40 text-gold-400 font-bold uppercase tracking-widest text-xs transition-all"
              >
                {editId ? 'Update Agent' : 'Create Agent'}
              </button>
              {editId && (
                <button type="button" onClick={cancelEdit}
                  className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <AnimatePresence>
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2"
              >
                <CheckCircle size={14} /> {successMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Agent Table ── */}
      <div className="xl:col-span-2">
        <div className="glass-panel p-6 h-full flex flex-col border border-slate-700/50 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200 flex items-center gap-2">
              <Users size={16} className="text-cyan-400" />Agent Roster
            </h3>
            <span className="text-xs font-mono bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg text-slate-400">
              {agents.length} agent{agents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {agents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
              <Users size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-mono">No agents created yet.</p>
              <p className="text-xs text-slate-700 mt-1">Use the form on the left to add your first agent.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Name', 'Agent ID', 'Extension', 'Created', 'Actions'].map(col => (
                      <th key={col} className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold pb-3 px-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {agents.map(agent => (
                    <tr key={agent.id} className="group hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-2 font-medium text-slate-200">{agent.name}</td>
                      <td className="py-3 px-2 font-mono text-cyan-400 text-xs">{agent.agentId}</td>
                      <td className="py-3 px-2 font-mono text-gold-400 text-xs">{agent.extension}</td>
                      <td className="py-3 px-2 text-slate-500 text-[11px] font-mono">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(agent)} title="Edit"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 border border-slate-700 transition-all">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => { setResetTarget(agent.id); setNewPass(''); }} title="Reset Password"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border border-slate-700 transition-all">
                            <KeyRound size={13} />
                          </button>
                          <button onClick={() => setDeleteConfirm(agent.id)} title="Delete"
                            className="p-1.5 rounded bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-slate-700 transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Reset Password Modal ── */}
      <AnimatePresence>
        {resetTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setResetTarget(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                <KeyRound size={16} className="text-amber-400" /> Reset Password
              </h4>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50 mb-4"
              />
              <div className="flex gap-3">
                <button onClick={handleResetPassword}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs uppercase tracking-widest">
                  Confirm Reset
                </button>
                <button onClick={() => setResetTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                <Trash2 size={16} /> Delete Agent?
              </h4>
              <p className="text-slate-400 text-xs mb-5">This action cannot be undone. The agent will lose access immediately.</p>
              <div className="flex gap-3">
                <button onClick={() => { deleteAgent(deleteConfirm); setDeleteConfirm(null); flash('Agent deleted.'); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-xs uppercase tracking-widest">
                  <XCircle size={13} className="inline mr-1" /> Yes, Delete
                </button>
                <button onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
