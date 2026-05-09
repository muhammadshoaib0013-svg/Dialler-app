import React, { useState } from 'react';
import { Building2, Server, Users, CheckCircle, ChevronRight, UploadCloud, Loader2, Sparkles, X } from 'lucide-react';
import { saveVosConfig } from '../Admin/ServerSetupModal';

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // 'testing' | 'success' | 'error'
  
  const [formData, setFormData] = useState({
    company_name: 'Dialler Pro',
    primary_color: '#D4AF37',
    logo_url: '',
    welcome_message: 'Welcome to the platform.',
    vos_serverIp: '',
    vos_wssPort: '5060',
    vos_extension: '',
    vos_password: '',
    agent_name: '',
    agent_id: '',
    agent_password: '',
    agent_extension: 'EXT01'
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(p => ({ ...p, logo_url: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  const testVosConnection = async () => {
    if (!formData.vos_serverIp || !formData.vos_wssPort) return;
    setTestStatus('testing');
    try {
      const res = await fetch('/api/vos/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverIp: formData.vos_serverIp, wssPort: formData.vos_wssPort })
      });
      const data = await res.json();
      setTestStatus(data.ok ? 'success' : 'error');
    } catch {
      setTestStatus('error');
    }
  };

  const handleNext = () => {
    if (step === 2 && testStatus !== 'success') {
      alert("Please successfully test the VOS3000 connection before proceeding.");
      return;
    }
    setStep(s => s + 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    // Save VOS config locally for this agent/admin
    saveVosConfig({
      serverIp: formData.vos_serverIp,
      wssPort: formData.vos_wssPort,
      extension: formData.vos_extension,
      password: formData.vos_password
    });

    try {
      await fetch('/api/tenant/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      localStorage.setItem('onboarding_complete', 'true');
      onComplete();
      window.location.reload(); // Reload to apply theme globally
    } catch (e) {
      console.error(e);
      alert("Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Header / Progress */}
        <div className="flex p-4 border-b border-slate-800 bg-slate-900/80 items-center justify-between">
          {[
            { s: 1, icon: Building2, label: 'Company' },
            { s: 2, icon: Server, label: 'VOS3000' },
            { s: 3, icon: Users, label: 'First Agent' },
            { s: 4, icon: CheckCircle, label: 'Launch' }
          ].map((item, i) => (
            <div key={item.s} className="flex flex-col items-center flex-1 relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all z-10 ${
                 step >= item.s ? 'bg-gold-500 text-slate-900 shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}>
                <item.icon size={18} />
              </div>
              <p className={`text-[10px] uppercase tracking-widest font-bold mt-2 ${step >= item.s ? 'text-gold-400' : 'text-slate-500'}`}>
                {item.label}
              </p>
              {i !== 3 && (
                <div className="absolute top-5 left-[50%] right-[-50%] h-0.5 bg-slate-800 z-0">
                  <div className="h-full bg-gold-500 transition-all" style={{ width: step > item.s ? '100%' : '0%' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
          
          {/* STEP 1: Company */}
          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to your new Workspace</h2>
                <p className="text-slate-400 text-sm">Let's start by applying your brand identity.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Company Name</label>
                  <input type="text" value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none transition-colors" placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} className="h-10 w-16 bg-slate-950 border border-slate-700 rounded cursor-pointer" />
                    <span className="text-sm font-mono text-slate-300">{formData.primary_color}</span>
                  </div>
                </div>
              </div>
              
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Welcome Message</label>
                 <textarea value={formData.welcome_message} onChange={e => setFormData({ ...formData, welcome_message: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none custom-scrollbar" placeholder="A short welcoming message for your agents..." />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Company Logo</label>
                <div className="border-2 border-dashed border-slate-700 bg-slate-950/50 rounded-xl p-6 flex flex-col items-center justify-center hover:border-gold-500/50 transition-colors relative cursor-pointer">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo Preview" className="max-h-16 object-contain" />
                  ) : (
                    <>
                      <UploadCloud size={32} className="text-slate-500 mb-2" />
                      <p className="text-sm text-slate-400 font-medium">Click to upload logo</p>
                      <p className="text-[10px] text-slate-600 mt-1">PNG, JPG up to 1MB</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VOS3000 */}
          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Connect VOS3000 Server</h2>
                <p className="text-slate-400 text-sm">Securely bind your platform to your telecommunications gateway.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">VOS Server IP / Domain</label>
                  <input type="text" value={formData.vos_serverIp} onChange={e => { setFormData({ ...formData, vos_serverIp: e.target.value }); setTestStatus(null); }} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 outline-none" placeholder="192.168.1.10" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">WSS Port</label>
                  <input type="text" value={formData.vos_wssPort} onChange={e => { setFormData({ ...formData, vos_wssPort: e.target.value }); setTestStatus(null); }} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 outline-none" placeholder="5060" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Admin Extension</label>
                  <input type="text" value={formData.vos_extension} onChange={e => setFormData({ ...formData, vos_extension: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 outline-none" placeholder="e.g. 1000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">SIP Password</label>
                  <input type="password" value={formData.vos_password} onChange={e => setFormData({ ...formData, vos_password: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 outline-none" placeholder="••••••••" />
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-3 bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
                 <button onClick={testVosConnection} disabled={testStatus === 'testing' || !formData.vos_serverIp} className="btn-outline-gold w-1/2 py-2.5 text-sm">
                   {testStatus === 'testing' ? <Loader2 size={16} className="animate-spin inline mr-2" /> : <Server size={16} className="inline mr-2"/>}
                   {testStatus === 'testing' ? 'Pinging Gateway...' : 'Test Connection'}
                 </button>
                 {testStatus === 'success' && <span className="text-sm font-bold text-green-400 flex items-center gap-1"><CheckCircle size={14}/> Gateway reached successfully</span>}
                 {testStatus === 'error' && <span className="text-sm font-bold text-red-400 flex items-center gap-1"><X size={14}/> Connection failed. Verify IP and Port.</span>}
              </div>
            </div>
          )}

          {/* STEP 3: Agent */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Create First Agent</h2>
                <p className="text-slate-400 text-sm">This will be your primary admin/agent account to log in.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input type="text" value={formData.agent_name} onChange={e => setFormData({ ...formData, agent_name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 outline-none" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Agent Login ID</label>
                  <input type="text" value={formData.agent_id} onChange={e => setFormData({ ...formData, agent_id: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 outline-none" placeholder="john.doe" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                  <input type="password" value={formData.agent_password} onChange={e => setFormData({ ...formData, agent_password: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 outline-none" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">SIP Extension (Optional)</label>
                  <input type="text" value={formData.agent_extension} onChange={e => setFormData({ ...formData, agent_extension: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 outline-none" placeholder="EXT01" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Launch */}
          {step === 4 && (
            <div className="animate-fade-in text-center flex flex-col items-center justify-center h-full space-y-6">
               <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-2">
                 <CheckCircle size={40} className="text-green-400" />
               </div>
               <h2 className="text-3xl font-bold text-white tracking-wide">{formData.company_name} is Ready!</h2>
               <p className="text-slate-400 max-w-md">Your workspace is configured, your gateway is connected, and your first agent profile is set up. You are ready to start making intelligent calls.</p>
               
               <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl w-full max-w-sm text-left mt-6">
                 <p className="text-xs text-slate-500 uppercase font-bold tracking-widest border-b border-slate-800 pb-2 mb-2">Summary</p>
                 <div className="flex justify-between items-center text-sm py-1"><span className="text-slate-400">Gateway:</span> <span className="font-mono text-gold-400">{formData.vos_serverIp || 'Not Configured'}</span></div>
                 <div className="flex justify-between items-center text-sm py-1"><span className="text-slate-400">Admin Account:</span> <span className="font-semibold text-slate-200">{formData.agent_id || 'N/A'}</span></div>
               </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="px-5 py-2 rounded-lg text-sm font-bold tracking-wide text-slate-400 hover:text-white transition-colors">
              Back
            </button>
          ) : <div />}
          
          {step < 4 ? (
            <button onClick={handleNext} className="bg-gold-500 hover:bg-gold-400 text-slate-900 px-6 py-2 rounded-lg text-sm font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] flex items-center gap-2">
              Next Step <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={loading} className="bg-green-500 hover:bg-green-400 text-slate-900 px-8 py-2.5 rounded-lg text-sm font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Start Dialling
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
