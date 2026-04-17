import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Save, Eye, EyeOff, Sparkles, Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import { useAdminContext } from '../../context/AdminContext';

const SAMPLE_NAME = 'Ahmed Khan';

// Deterministic color palette cycling for unlimited cards
const PALETTE = [
  { bar: 'from-blue-600 to-blue-500',    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     glow: 'shadow-[0_0_20px_rgba(59,130,246,0.08)]'  },
  { bar: 'from-purple-600 to-purple-500', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.08)]'  },
  { bar: 'from-emerald-600 to-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.08)]' },
  { bar: 'from-gold-500 to-amber-500',    badge: 'bg-gold-500/20 text-gold-400 border-gold-500/30',      glow: 'shadow-[0_0_20px_rgba(212,175,55,0.08)]'  },
  { bar: 'from-rose-600 to-rose-500',     badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]'   },
  { bar: 'from-cyan-600 to-cyan-500',     badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.08)]'   },
  { bar: 'from-indigo-600 to-indigo-500', badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.08)]' },
  { bar: 'from-teal-600 to-teal-500',     badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30',      glow: 'shadow-[0_0_20px_rgba(20,184,166,0.08)]'  },
];

export default function ScriptManager() {
  const { scriptTemplates, updateScript, updateScriptTitle, resetScript, resetAllScripts, addScript, deleteScript } = useAdminContext();

  // localDrafts mirrors scriptTemplates text values
  const [localDrafts, setLocalDrafts] = useState(() => scriptTemplates.map(s => s.text));
  const [savedIdx,    setSavedIdx]    = useState(null);
  const [previewIdx,  setPreviewIdx]  = useState(null);
  const [editTitleIdx, setEditTitleIdx] = useState(null);
  const [titleDraft,  setTitleDraft]  = useState('');

  // Sync drafts when template count changes (add/remove)
  useEffect(() => {
    setLocalDrafts(scriptTemplates.map(s => s.text));
  }, [scriptTemplates.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTextChange = (idx, val) =>
    setLocalDrafts(prev => prev.map((t, i) => i === idx ? val : t));

  const handleSave = (idx) => {
    updateScript(idx, localDrafts[idx]);
    setSavedIdx(idx);
    setTimeout(() => setSavedIdx(null), 2000);
  };

  const handleReset = (idx) => {
    resetScript(idx);
    setLocalDrafts(prev => prev.map((t, i) => i === idx ? scriptTemplates[idx].text : t));
  };

  // ── Title editing ──────────────────────────────────────────────────────────
  const startEditTitle = (idx) => {
    setEditTitleIdx(idx);
    setTitleDraft(scriptTemplates[idx].title);
  };

  const commitTitle = (idx) => {
    if (titleDraft.trim()) {
      updateScriptTitle(idx, titleDraft.trim());
    }
    setEditTitleIdx(null);
  };

  const cancelTitle = () => setEditTitleIdx(null);

  const resolvePreview = (text) => (text || '').replace(/\[Customer Name\]/g, SAMPLE_NAME);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex flex-col gap-6 h-full"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <p className="text-xs text-slate-500">
          Scripts saved here are used globally by the AI auto-reader. Changes are instant & persistent.
          &nbsp;Use <span className="text-cyan-400 font-mono">[Customer Name]</span> as a live placeholder.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={addScript}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/40 text-gold-400 font-bold text-xs uppercase tracking-widest transition-all"
          >
            <Plus size={13} /> Add Script
          </button>
          <button
            onClick={() => { resetAllScripts(); setLocalDrafts(scriptTemplates.map(s => s.text)); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all hover:border-slate-600"
          >
            <RotateCcw size={13} /> Reset Defaults
          </button>
        </div>
      </div>

      {/* ── Script Cards Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 flex-1 overflow-y-auto custom-scrollbar pb-2">
        <AnimatePresence>
          {scriptTemplates.map((script, idx) => {
            const colors   = PALETTE[idx % PALETTE.length];
            const isPrev   = previewIdx === idx;
            const isSaved  = savedIdx === idx;
            const isDirty  = (localDrafts[idx] ?? '') !== script.text;
            const isCustom = !!script.custom;

            return (
              <motion.div
                key={`script-${idx}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden relative flex flex-col ${colors.glow} hover:border-slate-700 transition-all duration-300`}
              >
                <div className={`h-1 w-full bg-gradient-to-r ${colors.bar}`} />

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Title Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Sparkles size={13} className="text-slate-500 shrink-0" />
                      {editTitleIdx === idx ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            autoFocus
                            value={titleDraft}
                            onChange={e => setTitleDraft(e.target.value)}
                            onBlur={() => commitTitle(idx)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitTitle(idx);
                              if (e.key === 'Escape') cancelTitle();
                            }}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-200 outline-none focus:border-gold-500/50"
                          />
                          <button onClick={() => commitTitle(idx)}
                            className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors">
                            <Check size={13} />
                          </button>
                          <button onClick={cancelTitle}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${colors.badge} truncate`}>
                          {script.title}
                        </span>
                      )}

                      {isDirty && !isSaved && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded animate-pulse shrink-0">
                          Unsaved
                        </span>
                      )}
                      {isSaved && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                          ✓ Saved
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEditTitle(idx)} title="Edit title"
                        className="p-1.5 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors">
                        <Edit3 size={11} />
                      </button>
                      <button onClick={() => setPreviewIdx(isPrev ? null : idx)}
                        className="p-1.5 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
                        {isPrev ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                      {isCustom && (
                        <button onClick={() => deleteScript(idx)} title="Delete this script"
                          className="p-1.5 rounded bg-slate-800/60 hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={localDrafts[idx] ?? ''}
                    onChange={e => handleTextChange(idx, e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-slate-600 rounded-xl p-4 text-sm text-slate-200 resize-none outline-none transition-colors leading-relaxed placeholder:text-slate-600 font-sans custom-scrollbar"
                    placeholder="Enter script text here. Use [Customer Name] as a dynamic placeholder."
                  />

                  {/* Live Preview */}
                  <AnimatePresence>
                    {isPrev && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-slate-950/80 border border-cyan-500/20 rounded-xl p-4">
                          <p className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold mb-2 flex items-center gap-1.5">
                            <Eye size={10} /> Preview — {SAMPLE_NAME}
                          </p>
                          <p dir="auto" className="text-sm text-slate-300 leading-relaxed">
                            {resolvePreview(localDrafts[idx]) || <span className="italic text-slate-600">Empty script</span>}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="flex gap-3 mt-auto">
                    <button
                      onClick={() => handleSave(idx)}
                      disabled={!isDirty}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs border transition-all ${
                        isDirty
                          ? 'bg-gold-500/10 hover:bg-gold-500/20 border-gold-500/40 text-gold-400'
                          : 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <Save size={13} /> Save Script
                    </button>
                    {!isCustom && (
                      <button onClick={() => handleReset(idx)}
                        title="Reset to default"
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all">
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add Script Button Card */}
        <motion.button
          layout
          onClick={addScript}
          className="bg-slate-900/40 border-2 border-dashed border-slate-700/60 hover:border-gold-500/40 rounded-2xl flex flex-col items-center justify-center gap-3 p-10 text-slate-600 hover:text-gold-400 transition-all duration-300 group min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-gold-500/10 border border-slate-700 group-hover:border-gold-500/40 flex items-center justify-center transition-all">
            <Plus size={20} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Add New Script Box</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
