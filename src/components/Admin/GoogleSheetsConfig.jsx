import React, { useState } from 'react';
import { Database, Save, CheckCircle, XCircle } from 'lucide-react';

export default function GoogleSheetsConfig() {
  const [sheetId, setSheetId] = useState(process.env.GOOGLE_SHEET_ID || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real app we might POST this to the backend to update process.env or settings table
    // For this prototype, we'll store it locally and mock the backend update
    localStorage.setItem('GOOGLE_SHEET_ID', sheetId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <Database size={20} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100 tracking-wide">Google Sheets Live Sync</h3>
          <p className="text-xs text-slate-500 font-mono">Push all disposed calls to a Google Sheet automatically</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Google Sheet ID</label>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" 
              className="flex-1 bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
            />
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
            >
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {saved ? 'Saved' : 'Save Config'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Extracted from URL: https://docs.google.com/spreadsheets/d/<span className="text-emerald-400">YOUR_SHEET_ID_HERE</span>/edit
          </p>
        </div>

        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-800 pb-2">Column Mapping Preview</p>
          <div className="flex text-xs font-mono text-slate-300 gap-4 overflow-x-auto pb-2">
            <span className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700">A: Phone</span>
            <span className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700">B: Name</span>
            <span className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700">C: Disposition</span>
            <span className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700">D: Talk Time</span>
            <span className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700">E: Sentiment</span>
            <span className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700">F: Agent Name</span>
            <span className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700">G: Timestamp</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 italic">Make sure to share your sheet with the service account email as an Editor.</p>
        </div>
      </div>
    </div>
  );
}
