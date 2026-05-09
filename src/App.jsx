import React, { useState, useEffect } from 'react';
import LoginForm from './components/Auth/LoginForm';
import MainDashboard from './components/Layout/MainDashboard';
import { useCallContext } from './context/CallContext';
import { AdminProvider } from './context/AdminContext';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';

function App() {
  const { isAuthenticated } = useCallContext();
  const [isOnboarded, setIsOnboarded] = useState(() => localStorage.getItem('onboarding_complete') === 'true');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  return (
    <>
      {deferredPrompt && (
        <div className="fixed top-0 left-0 right-0 bg-gold-500 text-slate-900 text-sm font-bold px-4 py-2 flex items-center justify-between z-[100] shadow-md">
          <span>Install Dialler Pro as a native application for a better experience.</span>
          <button onClick={handleInstall} className="bg-slate-900 text-gold-500 px-3 py-1 rounded shadow hover:bg-slate-800 transition-colors">Install App</button>
        </div>
      )}
      {!isOnboarded && <OnboardingWizard onComplete={() => setIsOnboarded(true)} />}
      {isAuthenticated ? <MainDashboard /> : <LoginForm />}
    </>
  );
}

export default App;
