import { useState } from 'react';
import { useCallContext } from '../../context/CallContext';
import { LogIn } from 'lucide-react';

export default function LoginForm() {
  const [formData, setFormData] = useState({ username: '', password: '', extension: '', campaign: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAgent } = useCallContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await loginAgent(formData);
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="glass-panel p-8 w-full max-w-md shadow-xl border border-slate-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-500 mb-2 font-sans tracking-wide">Vicidial Connect</h1>
          <p className="text-slate-400">Agent Workspace Login</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-900/40 border border-red-500 text-red-200 rounded text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm text-slate-300 mb-1 tracking-wide">Username <span className="text-slate-500 text-xs">(admin)</span></label>
            <input required type="text" className="input-field" 
              value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1 tracking-wide">Password <span className="text-slate-500 text-xs">(123)</span></label>
            <input required type="password" className="input-field" 
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1 tracking-wide">Extension</label>
              <input required type="text" className="input-field" 
                value={formData.extension} onChange={e => setFormData({...formData, extension: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1 tracking-wide">Campaign</label>
              <input required type="text" className="input-field" 
                value={formData.campaign} onChange={e => setFormData({...formData, campaign: e.target.value})} 
              />
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="btn-gold w-full mt-6 flex justify-center items-center gap-2 shadow-lg shadow-gold-500/20">
            {loading ? <span className="animate-pulse">Authenticating...</span> : <><LogIn size={18} /> Login Session</>}
          </button>
        </form>
      </div>
    </div>
  );
}
