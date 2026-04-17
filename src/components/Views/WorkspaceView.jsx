import React from 'react';
import { motion } from 'framer-motion';
import DialPad from '../Workspace/DialPad';
import AutoVoicePanel from '../Workspace/AutoVoicePanel';
import DispositionGrid from '../Workspace/DispositionGrid';
import LeadPanel from '../Workspace/LeadPanel';
import ScreenPopPanel from '../Workspace/ScreenPopPanel';
import ScriptPanel from '../Workspace/ScriptPanel';
import { useCallContext } from '../../context/CallContext';

export default function WorkspaceView() {
  const { screenPopData, inboundStatus } = useCallContext();
  const showScreenPop = !!screenPopData || inboundStatus === 'answered';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Row 1: DialPad + Smart Voice System ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DialPad />
        </div>
        <div className="lg:col-span-2">
          <AutoVoicePanel />
        </div>
      </div>

      {/* ── Row 2: Disposition Protocol (full width) ── */}
      <DispositionGrid />

      {/* ── Row 3: Lead / ScreenPop + Script ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {showScreenPop ? <ScreenPopPanel /> : <LeadPanel />}
        </div>
        <div className="lg:col-span-2">
          <ScriptPanel />
        </div>
      </div>
    </motion.div>
  );
}
