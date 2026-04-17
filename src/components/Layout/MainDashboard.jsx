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

// Subtitle bar
import LiveSubtitleBar from './LiveSubtitleBar';

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState('cockpit');

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
    <div className="h-screen w-full flex bg-[#0a0f18] overflow-hidden font-sans text-slate-100 relative">
      <NavigationSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />

        <Header />

        {/* ══════════════════════════════════════════════════════════════════
            LIVE SUBTITLE BAR
            Full-width — stretches from left edge to right edge of content area
            Always visible. Shows live subtitles for BOTH Inbound & Outbound.
        ══════════════════════════════════════════════════════════════════ */}
        <LiveSubtitleBar />

        <main className="flex-1 overflow-hidden relative z-10">
          <div className="max-w-[1800px] mx-auto px-8 py-8 h-full">
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
    </div>
  );
}
