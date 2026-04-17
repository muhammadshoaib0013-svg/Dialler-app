/**
 * LiveSubtitleBar.jsx
 * Full-width live subtitle bar — rendered at MainDashboard level so it
 * spans the complete width between sidebar and right edge. No max-width cap.
 *
 * Priority chain for subtitle text:
 *   currentSubtitle (Edge/browser TTS)
 *   → isTTSPlaying / isAISpeaking fallback
 *   → latest transcriptLines entry
 *   → inboundCall caller id
 *   → callStatus message
 *   → idle placeholder
 */

import React, { useMemo } from 'react';
import { PhoneIncoming, PhoneOutgoing, Activity } from 'lucide-react';
import { useCallContext } from '../../context/CallContext';

// Sentiment mini-badge
const SENT = {
  positive: { cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', dot: 'bg-emerald-400', label: '😊 Positive' },
  negative: { cls: 'text-red-400    border-red-500/30    bg-red-500/10',    dot: 'bg-red-400',     label: '😞 Negative' },
  neutral:  { cls: 'text-amber-400  border-amber-500/30  bg-amber-500/10',  dot: 'bg-amber-400',   label: '😐 Neutral'  },
};

export default function LiveSubtitleBar() {
  const {
    callStatus,
    inboundCall,
    inboundStatus,
    isTTSPlaying,
    isAISpeaking,
    currentSubtitle,
    transcriptLines,
    sentimentScore,
  } = useCallContext();

  // ── Is any call active? ───────────────────────────────────────────────────
  const isActive =
    callStatus === 'Connected' ||
    callStatus === 'Ringing'   ||
    callStatus === 'Ended'     ||
    isTTSPlaying               ||
    isAISpeaking               ||
    !!inboundCall              ||
    inboundStatus === 'answered';

  const isInbound = !!inboundCall || inboundStatus === 'answered';

  // ── Derive best subtitle text ─────────────────────────────────────────────
  const latestLine = transcriptLines.length
    ? transcriptLines[transcriptLines.length - 1]?.text
    : null;

  const text = useMemo(() =>
    currentSubtitle
    || (isTTSPlaying || isAISpeaking ? 'AI Agent is speaking...' : null)
    || latestLine
    || (inboundCall ? `📞 Incoming call — ${inboundCall.name || inboundCall.phone || 'Unknown'}` : null)
    || (callStatus === 'Ringing'   ? '⏳ Dialling — waiting for answer...' : null)
    || (callStatus === 'Connected' ? '🔗 Call live — real-time transcription active' : null)
    || (callStatus === 'Ended'     ? '📋 Call ended — wrap-up mode' : null)
    || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSubtitle, isTTSPlaying, isAISpeaking, latestLine, inboundCall, callStatus]
  );

  const sent = SENT[sentimentScore] || SENT.neutral;

  // ── Styles per state ──────────────────────────────────────────────────────
  const barCls = isActive
    ? isInbound
      ? 'bg-[#071428] border-blue-500/50 shadow-[0_2px_20px_rgba(59,130,246,0.18)]'
      : 'bg-[#0d0f18] border-gold-500/40 shadow-[0_2px_20px_rgba(212,175,55,0.12)]'
    : 'bg-[#0b0e17] border-slate-800/60';

  const badgeCls = isActive
    ? isInbound
      ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
      : 'bg-gold-500/15 text-gold-400 border-gold-500/40'
    : 'bg-slate-800/60 text-slate-500 border-slate-700/50';

  const dotCls = isActive
    ? isInbound ? 'bg-blue-400 animate-pulse' : 'bg-gold-400 animate-pulse'
    : 'bg-slate-600';

  const barIcon = isActive
    ? isInbound
      ? <PhoneIncoming size={12} />
      : <PhoneOutgoing size={12} />
    : <Activity size={12} />;

  const badgeLabel = isActive
    ? isInbound ? 'Inbound' : 'Outbound'
    : 'Standby';

  return (
    <div
      className={`
        w-full flex items-center gap-4 px-6 border-b transition-all duration-500
        ${barCls}
      `}
      style={{ height: 44, minHeight: 44, flexShrink: 0 }}
    >
      {/* Direction badge */}
      <span className={`
        shrink-0 flex items-center gap-1.5 px-3 py-0.5 rounded-full border
        text-[10px] font-bold uppercase tracking-widest whitespace-nowrap
        transition-all duration-500 ${badgeCls}
      `}>
        <span className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${dotCls}`} />
        {barIcon}
        {badgeLabel}
      </span>

      {/* ── Subtitle text — fills all remaining width ── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {text ? (
          <p
            dir="auto"
            className={`text-sm font-medium truncate transition-colors duration-500 ${
              isActive
                ? isInbound ? 'text-blue-100' : 'text-slate-100'
                : 'text-slate-600 italic'
            }`}
          >
            {text}
          </p>
        ) : (
          <p className="text-xs italic text-slate-600 font-mono tracking-wide">
            Live subtitles appear here during inbound &amp; outbound calls
          </p>
        )}
      </div>

      {/* Audio visualiser — only when live */}
      {isActive && (
        <div className="shrink-0 flex items-end gap-[3px] h-4">
          {[3, 6, 9, 12, 8, 5, 10, 7, 4].map((h, i) => (
            <div
              key={i}
              className={`w-[3px] rounded-full animate-pulse ${
                isInbound ? 'bg-blue-400/70' : 'bg-gold-400/70'
              }`}
              style={{
                height: `${h}px`,
                animationDelay: `${i * 80}ms`,
                animationDuration: '900ms',
              }}
            />
          ))}
        </div>
      )}

      {/* Sentiment badge — only when live */}
      {isActive && (
        <span className={`
          shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border
          text-[10px] font-bold uppercase tracking-widest transition-all duration-500
          ${sent.cls}
        `}>
          <span className={`w-1.5 h-1.5 rounded-full ${sent.dot}`} />
          {sent.label}
        </span>
      )}
    </div>
  );
}
