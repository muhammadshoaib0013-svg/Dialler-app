import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import NavigationSidebar from './NavigationSidebar';
import Header from './Header';
import ActiveCall from '../Workspace/ActiveCall';
import IncomingCallPopup from '../Workspace/IncomingCallPopup';

// Views
import NayatelCockpit from '../Views/NayatelCockpit';
import InboundCenter from '../Views/InboundCenter';
import LeadsView from '../Views/LeadsView';
import InternalReports from '../Views/InternalReports';
import RecordingsLibrary from '../Views/RecordingsLibrary';
import AdvancedReporting from '../Views/AdvancedReporting';
import AdminPanel from '../Admin/AdminPanel';
import ServerSetupModal from '../Admin/ServerSetupModal';

// Subtitle bar
import LiveSubtitleBar from './LiveSubtitleBar';
import { useCallContext } from '../../context/CallContext';

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState('cockpit');
  const { isServerSetupOpen, setIsServerSetupOpen } = useCallContext();

  const renderView = () => {
    switch (activeTab) {
      case 'cockpit':    return <NayatelCockpit key="cockpit" />;
      case 'omnichannel':return <InboundCenter key="omnichannel" />;
      case 'leadvault':  return <LeadsView key="leadvault" />;
      case 'analytics':  return <InternalReports key="analytics" />;
      case 'reporting':  return <AdvancedReporting key="reporting" />;
      case 'vault':      return <RecordingsLibrary key="vault" />;
      case 'admin':      return <AdminPanel key="admin" />;
      default:           return <NayatelCockpit key="cockpit" />;
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0a0f18] font-sans text-slate-100 relative">
      <NavigationSidebar activeTab={activeTab} setActiveTab={setActiveTab} className="sticky top-0 h-screen shrink-0" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />

        <Header />

        {/* ══════════════════════════════════════════════════════════════════
            LIVE SUBTITLE BAR
            Full-width — stretches from left edge to right edge of content area
            Always visible. Shows live subtitles for BOTH Inbound & Outbound.
        ══════════════════════════════════════════════════════════════════ */}
        <LiveSubtitleBar />

        <main className="relative z-10 flex-1 flex flex-col min-h-0">
          <div className="max-w-[1800px] mx-auto w-full px-4 lg:px-8 py-4 flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {renderView()}
            </AnimatePresence>
          </div>

          {/* WebRTC Audio Layer — must remain permanently mounted */}
          <ActiveCall />
        </main>
      </div>

      {/* Global Inbound Screen Pop */}
      <IncomingCallPopup />

      {/* VOS3000 Server Setup Modal */}
      <ServerSetupModal
        isOpen={isServerSetupOpen}
        canClose={!!localStorage.getItem('hb_vos_config_v1')}
        onClose={() => setIsServerSetupOpen(false)}
      />
    </div>
  );
}
