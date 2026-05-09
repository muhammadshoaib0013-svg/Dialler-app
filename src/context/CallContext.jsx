import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { sendWhatsAppReceipt } from '../utils/whatsapp';
import { useWebRTC } from '../hooks/useWebRTC';
import { LiveSubtitleSystem } from '../services/LiveSubtitleSystem';
import edgeTTS from '../services/edgeTtsService';
import { loadVosConfig, saveVosConfig } from '../components/Admin/ServerSetupModal';

// ─── Script Definitions (Migrated from ScriptPanel) ──────────────────────────────
export const SCRIPT_TEMPLATES = [
  {
    title: 'Smart TV Promotion',
    colorBar: 'from-blue-600 to-blue-500',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    color: 'blue',
    sections: {
      opening:   { label: 'Opening', text: 'Assalam-o-Alaikum [Customer Name]! This is Hassan calling from HB Electronics. Do you have a quick minute?' },
      pitch:     { label: 'Product Pitch', text: 'We have an exclusive offer on our Samsung 55" 4K Smart TV at 30% off — just PKR 89,999.' },
      objection_handler: { label: 'Objection Handler', text: 'I understand price is a concern. We offer easy monthly installments and free next-day delivery with a 2-year warranty.' },
      close:     { label: 'Trial Close', text: 'Perfect! I\'ll lock in that exclusive price for you. Which payment method do you prefer?' },
      callback:  { label: 'Callback Setup', text: 'No problem at all! When would be a better time for me to call you back?' }
    }
  }
];

// ─── Mock Customer Names Pool ──────────────────────────────────────────────────
const MOCK_NAMES = [
  'Ahmed Khan', 'Fatima Siddiqui', 'Usman Ali', 'Sara Malik',
  'Bilal Hassan', 'Ayesha Raza', 'Zara Ahmed', 'Hamza Sheikh',
  'Nadia Iqbal', 'Omar Farooq', 'Hina Baig', 'Tariq Mehmood',
];

// ─── Inbound Mock Caller Pool ──────────────────────────────────────────────────
const INBOUND_CALLERS = [
  { name: 'Kamran Mirza',   phone: '03001234567' },
  { name: 'Sana Butt',      phone: '03219876543' },
  { name: 'Faisal Qureshi', phone: '03451112233' },
  { name: 'Rabia Noor',     phone: '03334455667' },
  { name: 'Junaid Shah',    phone: '03121234567' },
];

// ─── Urdu IVR Welcome Message ─────────────────────────────────────────────────
const IVR_URDU_MESSAGE =
  'Assalam-o-Alaikum! HB Electronics mein aapka khush amdeed hai. ' +
  'Aapki call aik lamhe mein connect ho rahi hai. Meherbani farma ke intezaar karein. Shukriya.';

// ─── AI Greeting Script (Fallback) ────────────────────────────────
const buildAIGreeting = (name = 'valued customer') =>
  `Assalam-o-Alaikum ${name}! This is HB Electronics AI Assistant calling. ` +
  `I hope you're having a wonderful day. We have an exclusive Smart TV offer this week — ` +
  `a Samsung 55 inch 4K Smart TV at 30% off, just PKR 89,999 including free delivery and 2-year warranty. ` +
  `Would you like to know more, or shall I connect you to one of our agents?`;

// ─── Shared TTS Configuration Helper ──────────────────────────────────────────
// Detects Urdu Unicode characters. If present → ur-PK voice.
// Otherwise → Natural English (Roman Urdu optimisation: pitch 1.1, rate 0.85).
export const configureTTSVoice = (utterance, text) => {
  const isUrdu = /[\u0600-\u06FF]/.test(text);

  const applyVoice = (voices) => {
    if (isUrdu) {
      utterance.lang  = 'ur-PK';
      utterance.rate  = 0.9;
      utterance.pitch = 1.0;
      const urVoice =
        voices.find(v => v.name.includes('Uzma'))  ||
        voices.find(v => v.name.includes('Imran')) ||
        voices.find(v => v.lang === 'ur-PK')        ||
        voices.find(v => v.lang.startsWith('ur'));
      if (urVoice) utterance.voice = urVoice;
    } else {
      // Roman Urdu / English — slower, slightly elevated pitch for clarity
      utterance.lang  = 'en-GB';
      utterance.rate  = 0.85;
      utterance.pitch = 1.1;
      const engVoice =
        voices.find(v => v.lang === 'en-GB' && v.localService === false) ||
        voices.find(v => v.lang.startsWith('en-GB'))                     ||
        voices.find(v => v.lang.startsWith('en'));
      if (engVoice) utterance.voice = engVoice;
    }
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    applyVoice(voices);
  } else {
    // Voices not loaded yet — wait for browser event then apply
    window.speechSynthesis.onvoiceschanged = () => {
      applyVoice(window.speechSynthesis.getVoices());
      window.speechSynthesis.onvoiceschanged = null;
    };
  }
};

// ─── Live Transcript Script (synced to Script Panel sections) ─────────────────
const buildTranscriptScript = (customerName = 'Sir/Ma\'am') => [
  { role: 'agent',    text: `Assalam-o-Alaikum! Am I speaking with ${customerName}?`, section: 'Introduction' },
  { role: 'customer', text: 'Yes, speaking. Who is this please?', section: null },
  { role: 'agent',    text: 'This is Hassan calling from HB Electronics. We have an exclusive Smart TV promotion this week.', section: 'Introduction' },
  { role: 'customer', text: 'Oh! I was actually browsing your website yesterday evening.', section: null },
  { role: 'agent',    text: 'Wonderful! Our Samsung 55\" 4K UHD Smart TV is at 30% off — available today only.', section: 'Warranty & Delivery' },
  { role: 'customer', text: 'Sounds interesting. What is the final price including delivery?', section: null },
  { role: 'agent',    text: 'PKR 89,999 all-inclusive — free home delivery and a full 2-year warranty, registered.', section: 'Warranty & Delivery' },
  { role: 'customer', text: 'And installation — is that included in the package as well?', section: null },
  { role: 'agent',    text: 'Absolutely. Our certified technician arrives within 24 hours, completely free of charge.', section: 'Closing' },
  { role: 'customer', text: 'That\'s a great deal. I would like to go ahead. Please confirm the order.', section: null },
  { role: 'agent',    text: `Perfect! Your order is confirmed, ${customerName}. A WhatsApp receipt will be sent to you shortly. Thank you!`, section: 'Payment Confirmation' },
];

// ─── Sentiment Analysis Engine ─────────────────────────────────────────────────
const POSITIVE_TOKENS = [
  'yes', 'sure', 'interested', 'great', 'wonderful', 'excellent',
  'perfect', 'confirm', 'proceed', 'thank', 'deal', 'good', 'happy',
  'order', 'buy', 'purchase', 'absolutely', 'sounds', 'nice',
];
const NEGATIVE_TOKENS = [
  'no', 'not', 'cancel', 'refuse', 'stop', 'busy', 'problem',
  'issue', 'complaint', 'never', "don't", 'annoying', 'waste',
  'wrong', 'bad', 'expensive', 'overpriced',
];

const analyzeSentiment = (lines) => {
  if (!lines.length) return 'neutral';
  const allText = lines.map(l => l.text.toLowerCase()).join(' ');
  let pos = 0, neg = 0;
  POSITIVE_TOKENS.forEach(w => { if (allText.includes(w)) pos++; });
  NEGATIVE_TOKENS.forEach(w => { if (allText.includes(w)) neg++; });
  if (pos >= neg + 2) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateRecordingId = () =>
  `REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const randomMockName = () =>
  MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];

// ─── Context ──────────────────────────────────────────────────────────────────
const CallContext = createContext(null);

export const CallProvider = ({ children }) => {

  // ── Agent ──────────────────────────────────────────────────────────────────
  const [agentAuth, setAgentAuth] = useState({
    username: '', password: '', extension: '', campaign: '', status: 'PAUSED',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole]               = useState('agent'); // 'admin' | 'agent'
  const [isRegistered]                        = useState(true); // MOCK: always registered

  // ── Call Session ───────────────────────────────────────────────────────────
  const [callStatus, setCallStatus]           = useState('Idle');
  const [isMuting, setIsMuting]               = useState(false);
  const [activeSIPCall, setActiveSIPCall]     = useState('');
  const [callDuration, setCallDuration]       = useState(0);
  const [isRecording, setIsRecording]         = useState(false);
  const [activeRecordingId, setActiveRecordingId] = useState('');

  // ── AI Voice Assistant Layer ───────────────────────────────────────────────
  /**
   * isAISpeaking: true while AI greeting utterance is being delivered
   * agentHandedOff: true after "Transfer to Agent" is clicked
   */
  const [isAISpeaking, setIsAISpeaking]       = useState(false);
  const [agentHandedOff, setAgentHandedOff]   = useState(false);
  const aiUtteranceRef                        = useRef(null);

  // ── Lead / CRM ─────────────────────────────────────────────────────────────
  const [currentLeadData, setCurrentLeadData] = useState(null);
  const [customerLeads, setCustomerLeads]     = useState([]);

  // ── Outbound Logs ──────────────────────────────────────────────────────────
  const [sessionLogs, setSessionLogs]         = useState([]);

  // ── Inbound Call System ────────────────────────────────────────────────────
  const [inboundCall,     setInboundCall]     = useState(null);
  // inboundStatus: null | 'ringing' | 'answered' | 'missed' | 'voicemail'
  const [inboundStatus,   setInboundStatus]   = useState(null);
  const [inboundLogs,     setInboundLogs]     = useState([]);
  const [ivrPlaying,      setIvrPlaying]      = useState(false);
  const [supervisorCalls, setSupervisorCalls] = useState([
    // Seed with a couple of static mock agents already on calls
    { id: 'SV-001', agent: 'Zain Ul Abideen', phone: '03051111222', startTime: Date.now() - 125000 },
    { id: 'SV-002', agent: 'Hira Baig',       phone: '03331234567', startTime: Date.now() - 48000  },
  ]);
  const [screenPopData,   setScreenPopData]   = useState(null);

  // ── Intelligence Layer ─────────────────────────────────────────────────────
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [sentimentScore, setSentimentScore]   = useState('neutral');
  // activeScriptSection: string | null — which Script Panel section is "live"
  const [activeScriptSection, setActiveScriptSection] = useState(null);
  const [recommendedScriptSection, setRecommendedScriptSection] = useState(null);
  const [currentScriptSection, setCurrentScriptSection] = useState(null);

  // Auto-recommend script section based on live sentiment
  useEffect(() => {
    if (callStatus === 'Connected') {
      if (sentimentScore === 'negative' && callDuration > 30) {
        setRecommendedScriptSection('objection_handler');
      } else if (sentimentScore === 'positive' && callDuration > 60) {
        setRecommendedScriptSection('close');
      } else {
        setRecommendedScriptSection(null);
      }
    } else {
      setRecommendedScriptSection(null);
    }
  }, [sentimentScore, callDuration, callStatus]);

  // ── TTS (Auto-Dialer) ──────────────────────────────────────────────────────
  const [voiceScript, setVoiceScript] = useState(
    "Hi, this is a smart auto-voice assistant calling. I hope you're having a great day."
  );
  const [scriptMode, setScriptMode]           = useState('fixed'); // 'fixed' | 'manual'
  const [isTTSPlaying, setIsTTSPlaying]       = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');

  // ── Auto-Dialer ────────────────────────────────────────────────────────────
  const [autoDialerList, setAutoDialerList]   = useState([]);
  const [autoDialerActive, setAutoDialerActive] = useState(false);
  const [callsMadeHour, setCallsMadeHour]     = useState(0);
  const [callsMadeDay, setCallsMadeDay]       = useState(0);
  const [totalListLength, setTotalListLength] = useState(0);
  const [diallerMode, setDiallerMode]         = useState('PROGRESSIVE'); // PREVIEW, PROGRESSIVE, POWER
  const [activeCampaign, setActiveCampaign]   = useState('');
  const [dialCountdown, setDialCountdown]     = useState(null);
  const diallerPaceRef = useRef(3000);
  const recentDurationsRef = useRef([]);

  // ── Internal Refs ──────────────────────────────────────────────────────────
  const callTimersRef = useRef([]);
  const disposedRef = useRef(false);

  const activeCallPhoneRef = useRef('');
  const activeLeadRef = useRef(null);
  const callStartRef = useRef('');
  const callAnswerRef = useRef('');
  const transcriptRef = useRef([]);

  // ── Live Subtitle Engine Ref ───────────────────────────────────────────────
  const subtitleSysRef = useRef(null);
  useEffect(() => {
    subtitleSysRef.current = new LiveSubtitleSystem({
      onTranscript: (t) => {
        setTranscriptLines((prev) => {
          const updated = [...prev, t];
          transcriptRef.current = updated;
          return updated;
        });
      },
      onSubtitle: (text) => setCurrentSubtitle(text),
      onSentiment: (sent) => setSentimentScore(sent),
    });
    return () => {
      subtitleSysRef.current?.stop();
    };
  }, []);
  /**
   * disposedRef prevents double-logging.
   * Set to `true` when DispositionGrid calls disposeAndLog().
   * When `true`, the auto-log fallback in the Idle useEffect is skipped.
   */


  // ── VOS3000 Integration ────────────────────────────────────────────────────
  const [vosBalance, setVosBalance]           = useState(0.00);
  const [vosStatus, setVosStatus]             = useState('Connecting...');
  const [sipLogs, setSipLogs]                 = useState([]);
  const [isServerSetupOpen, setIsServerSetupOpen] = useState(false);

  // ── Dynamic VOS3000 Config ──────────────────────────────────────────────────
  const [vosConfig, setVosConfig] = useState(() => {
    const cfg = loadVosConfig();
    return cfg || { serverIp: 'vos.gateway', wssPort: '5060', extension: '', password: '' };
  });

  // Listen for config changes made through the Admin modal
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'hb_vos_config_v1') {
        const cfg = loadVosConfig();
        if (cfg) setVosConfig(cfg);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Check if first boot (no config saved yet)
  useEffect(() => {
    const cfg = loadVosConfig();
    if (!cfg) setIsServerSetupOpen(true);
  }, []);

  const remoteAudioRef = useRef(null);

  const { status: sipStatus, call: sipCall, hangup: sipHangup, mute: sipMute, unmute: sipUnmute } = useWebRTC(
    vosConfig?.extension,
    vosConfig?.password,
    vosConfig?.serverIp,
    vosConfig?.wssPort,
    () => { setCallStatus('Idle'); setActiveSIPCall(null); }
  );

  // Real Ping Gateway
  const pingVOSGateway = useCallback(async () => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    setSipLogs(prev => [...prev.slice(-49), `[${timestamp}] -> WSS CONNECTION wss://${vosConfig.serverIp}:${vosConfig.wssPort}/ws`]);
    
    try {
      const res = await fetch('/api/vos/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverIp: vosConfig.serverIp, wssPort: vosConfig.wssPort })
      });
      const data = await res.json();
      const ts2 = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
      
      if (data.ok) {
        setSipLogs(prev => [...prev.slice(-49), `[${ts2}] <- 200 OK (Connected in ${data.latency}ms)`]);
      } else {
        setSipLogs(prev => [...prev.slice(-49), `[${ts2}] <- ERROR (${data.error})`]);
      }
    } catch (err) {
      const ts2 = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
      setSipLogs(prev => [...prev.slice(-49), `[${ts2}] <- FETCH FAILED (${err.message})`]);
    }
  }, [vosConfig]);

  // Real checking VOS Wallet balance
  useEffect(() => {
    if (!isAuthenticated) return;

    setVosStatus('Connecting...');
    
    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/vos/balance?serverIp=${encodeURIComponent(vosConfig.serverIp)}&apiKey=test`);
        const data = await res.json();
        if (data.ok) {
          setVosBalance(data.balance);
          setVosStatus('Connected');
        } else {
          setVosStatus('Error');
        }
      } catch (err) {
        console.error('Failed to fetch VOS balance:', err);
        setVosStatus('Error');
      }
    };

    fetchBalance();
    const pollInterval = setInterval(fetchBalance, 30000);

    return () => clearInterval(pollInterval);
  }, [isAuthenticated, vosConfig.serverIp]);

  /**
   * Stable refs — these survive React's batched Idle state transition
   * (setActiveSIPCall('') and setCurrentLeadData(null) in the same setTimeout)
   * so the HANGUP auto-log always has real data, never 'Unknown'.
   */

  // ── Inbound Refs ───────────────────────────────────────────────────────────
  const inboundRingTimerRef = useRef(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const loginAgent = async (data) => {
    const finalizeLogin = async (role, username, extension) => {
      setAgentAuth({ ...data, username, extension, campaign: role === 'admin' ? 'All' : 'Default', status: 'PAUSED' });
      setUserRole(role);
      setIsAuthenticated(true);
      
      try {
        const [logsRes, leadsRes] = await Promise.all([
          fetch(`/api/calls?agentId=${encodeURIComponent(data.username)}&limit=100`, { headers: { 'Authorization': `Bearer ${window.__authToken}` } }),
          fetch('/api/leads?limit=200', { headers: { 'Authorization': `Bearer ${window.__authToken}` } })
        ]);
        if (logsRes.ok) {
          const logs = await logsRes.json();
          setSessionLogs(logs.map(log => ({
            callStartTime: log.call_start,
            callAnswerTime: log.call_answer,
            callEndTime: log.call_end,
            agentId: log.agent_id,
            agentName: log.agent_name,
            campaign: log.campaign,
            callDirection: 'Outbound',
            leadId: 'N/A',
            customerName: log.customer_name,
            phone: log.phone,
            totalDuration: log.total_duration,
            ringDuration: log.ring_duration,
            talkDuration: log.talk_duration,
            disposition: log.disposition,
            dispositionLabel: log.disposition_label,
            sentiment: log.sentiment,
            whatsappSent: log.whatsapp_sent,
            recordingId: log.recording_id,
            recordingUrl: log.recording_url,
            transcript: log.transcript,
            time: log.call_end,
            duration: log.total_duration,
            lead: log.customer_name,
            code: log.disposition,
          })));
        }
        if (leadsRes.ok) {
          const leads = await leadsRes.json();
          const data = leads.data || leads;
          setCustomerLeads(data.map(lead => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            disposition: lead.disposition,
            time: lead.call_time,
            duration: lead.duration,
            sentiment: lead.sentiment,
            recordingId: lead.recording_id,
            whatsappSent: lead.whatsapp_sent === 1,
          })));
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };

    // Admin credentials
    const envUser = import.meta.env.VITE_ADMIN_USER;
    const envPass = import.meta.env.VITE_ADMIN_PASS;

    if (envUser && envPass) {
      if (data.username === envUser && data.password === envPass) {
        await finalizeLogin('admin', envUser, 'ADM-01');
        return;
      }
    } else {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username, password: data.password })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.role === 'admin') {
            await finalizeLogin('admin', data.username, 'ADM-01');
            return;
          }
        }
      } catch (err) {
        console.error('Server auth fallback failed:', err);
      }
    }
    // Agent credentials — validated against localStorage roster
    const storedAgents = (() => { try { return JSON.parse(localStorage.getItem('hb_agents_v1') || '[]'); } catch { return []; } })();
    const agent = storedAgents.find(a => a.agentId === data.username && a.password === data.password);
    if (agent) {
      await finalizeLogin('agent', agent.name, agent.extension);
      return;
    }
    throw new Error('Invalid credentials');
  };

  // ── AI Agent Handoff ───────────────────────────────────────────────────────
  /**
   * Stops AI speech and marks human agent as active.
   * The transcript continues as normal conversation mode.
   */
  const transferToAgent = useCallback(() => {
    if (aiUtteranceRef.current) {
      window.speechSynthesis.cancel();
      aiUtteranceRef.current = null;
    }
    setIsAISpeaking(false);
    setAgentHandedOff(true);
    setIsTTSPlaying(false);
    setCurrentSubtitle('');
    // Add a system line to transcript
    setTranscriptLines(prev => {
      const updated = [
        ...prev,
        {
          role: 'system',
          text: '— AI Agent handed off to Human Agent —',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          section: null,
        },
      ];
      transcriptRef.current = updated;
      return updated;
    });
  }, []);

  // ── Synced Refs for callStatus effect ──────────────────────────────────────
  const autoDialerActiveRef = useRef(autoDialerActive);
  useEffect(() => { autoDialerActiveRef.current = autoDialerActive; }, [autoDialerActive]);

  const agentHandedOffRef = useRef(agentHandedOff);
  useEffect(() => { agentHandedOffRef.current = agentHandedOff; }, [agentHandedOff]);

  const voiceScriptRef = useRef(voiceScript);
  useEffect(() => { voiceScriptRef.current = voiceScript; }, [voiceScript]);

  const scriptModeRef = useRef(scriptMode);
  useEffect(() => { scriptModeRef.current = scriptMode; }, [scriptMode]);

  // ── Timer + TTS Effect (fires on every callStatus change) ──────────────────
  useEffect(() => {
    let interval;

    if (callStatus === 'Connected' || callStatus === 'Ringing') {
      setIsRecording(callStatus === 'Connected');
      interval = setInterval(() => setCallDuration(d => d + 1), 1000);

      // ── AI Smart Scripting — fires automatically on Connect ──────────────
      if (callStatus === 'Connected') {
        const customerName = activeLeadRef.current?.name || 'Sir/Ma\'am';
        
        // Read admin-edited scripts from localStorage (set by AdminContext/ScriptManager)
        const getAdminScripts = () => {
          try { return JSON.parse(localStorage.getItem('hb_scripts_v1') || '[]'); } catch { return []; }
        };
        const adminScripts = getAdminScripts();
        const introScript  = adminScripts[0]?.text || SCRIPT_TEMPLATES[0].text;

        // ── LIVE SUBTITLE SYSTEM START ──────────────────────────
        subtitleSysRef.current?.start(); // (Pass remoteStream here if available from WebRTC)

        let playbackText = '';
        if (scriptModeRef.current === 'fixed') {
           playbackText = introScript.replace(/\[Customer Name\]/g, customerName);
        } else {
           playbackText = voiceScriptRef.current || buildAIGreeting(customerName);
        }

        setTimeout(() => {
          setIsAISpeaking(true);
          setIsTTSPlaying(true);
          
          // Instantly sync the AI script text directly into the Live Transcript
          setTranscriptLines(prev => {
             const updated = [
               ...prev,
               {
                 role: 'agent', // Shows up as AI/Agent in the UI
                 text: `💬 [AI Broadcast]: ${playbackText}`,
                 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                 section: null,
               }
             ];
             transcriptRef.current = updated;
             return updated;
          });

          // ── Foolproof Native SpeechSynthesis Trigger ──
          const utterance = new SpeechSynthesisUtterance(playbackText);
          utterance.volume = 1; // Explicit volume enforcement
          configureTTSVoice(utterance, playbackText);
          
          utterance.onstart = () => {
             setCurrentSubtitle('AI Assistant initiating script...');
             setTimeout(() => setCurrentSubtitle(`AI: ${playbackText}`), 500);
          };
          
          utterance.onend = () => {
              setIsAISpeaking(false);
              setIsTTSPlaying(false);
              setCurrentSubtitle('');
              
              // Auto-disconnect if it was a robotic dialer call and human hasn't intervened
              if (autoDialerActiveRef.current && !agentHandedOffRef.current) {
                setTimeout(() => { if (callStatus === 'Connected') endCall(); }, 2000);
              }
          };

          utterance.onerror = (err) => {
             console.error('[SpeechSynthesis] Error:', err);
             setIsAISpeaking(false);
             setIsTTSPlaying(false);
          };

          aiUtteranceRef.current = utterance;
          console.log('TTS Triggered', utterance.text);
          window.speechSynthesis.speak(utterance);
          
          // Legacy EdgeTTS Fallback Hook
          try {
             edgeTTS.speak({
                text: '', // silent ping just in case
                onEnd: () => {}
             });
          } catch(e) {}

        }, 500);
      }

    } else {
      // Cleanup on non-active states
      setIsRecording(false);
      edgeTTS.stop();
      subtitleSysRef.current?.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsTTSPlaying(false);
      setIsAISpeaking(false);
      setAgentHandedOff(false);
      setCurrentSubtitle('');
      setActiveScriptSection(null);
      aiUtteranceRef.current = null;

      if (callStatus === 'Idle') {
        // Pacing logic
        if (callDuration > 0) {
          recentDurationsRef.current.push(callDuration);
          if (recentDurationsRef.current.length > 5) recentDurationsRef.current.shift();
          if (recentDurationsRef.current.length === 5) {
            const avg = recentDurationsRef.current.reduce((a,b)=>a+b, 0) / 5;
            if (avg > 120) diallerPaceRef.current = Math.min(diallerPaceRef.current + 15000, 60000);
            else if (avg < 45) diallerPaceRef.current = Math.min(diallerPaceRef.current + 30000, 60000);
          }
        }

        // Only auto-log if user hung up WITHOUT clicking a disposition
        if (callDuration > 0 && !disposedRef.current) {
          const endTime = new Date().toISOString();
          // Use stable refs — activeSIPCall / currentLeadData are already '' / null here
          const phone   = activeCallPhoneRef.current || 'Unknown';
          const lead    = activeLeadRef.current;
          const ringMs  = callAnswerRef.current
            ? new Date(callAnswerRef.current) - new Date(callStartRef.current)
            : 0;
          const talkDuration = Math.max(0, callDuration - Math.round(ringMs / 1000));

          // Minimal CRM record for HANGUP
          setCustomerLeads(prev => [{
            id:            Date.now(),
            name:          lead?.name  || 'Unknown',
            phone,
            disposition:   'HANGUP',
            time:          endTime,
            duration:      callDuration,
            sentiment:     'neutral',
            recordingId:   activeRecordingId,
            whatsappSent:  false,
          }, ...prev]);

          setSessionLogs(prev => [...prev, buildLogRecord({
            code:          'HANGUP',
            lead:          lead,
            phone,
            endTime,
            talkDuration,
            ringDuration:  Math.round(ringMs / 1000),
            whatsappSent:  'No',
            transcriptSnap: transcriptRef.current,
          })]);
        }
        // Always reset duration when returning to Idle
        setCallDuration(0);
      }
    }

    return () => clearInterval(interval);
  }, [callStatus, endCall]);

  // ── Live Transcript Engine (Replaced by LiveSubtitleSystem) ────────

  // ── Auto-Dialer Loop ───────────────────────────────────────────────────────
  useEffect(() => {
    let timeout;
    let countdownInterval;

    const attemptDial = async () => {
      if (!autoDialerActive || callStatus !== 'Idle' || autoDialerList.length === 0) return;

      try {
        const res = await fetch(`/api/dialler/can-dial?agentId=${encodeURIComponent(agentAuth.username)}`, {
          headers: { 'Authorization': `Bearer ${window.__authToken || ''}` }
        });
        const data = await res.json();
        
        if (!data.canDial) {
           setDialCountdown('LIMIT REACHED');
           setAutoDialerActive(false);
           return;
        }

        setCallsMadeHour(data.callsThisHour);
        setCallsMadeDay(data.callsToday);

        const next = autoDialerList[0];
        
        let delay = diallerMode === 'PREVIEW' ? 5000 : diallerPaceRef.current;
        if (diallerMode === 'POWER') delay = 0;
        
        setDialCountdown(Math.ceil(delay / 1000));
        
        countdownInterval = setInterval(() => {
          setDialCountdown(prev => (typeof prev === 'number' && prev > 0 ? prev - 1 : prev));
        }, 1000);

        timeout = setTimeout(() => {
          clearInterval(countdownInterval);
          setDialCountdown(null);
          setAutoDialerList(prev => prev.slice(1));
          makeCall(next?.phone || next);
        }, delay);

      } catch (err) {
        console.error(err);
        setAutoDialerActive(false);
      }
    };

    attemptDial();

    return () => { clearTimeout(timeout); clearInterval(countdownInterval); };
  }, [autoDialerActive, callStatus, autoDialerList, agentAuth.username, diallerMode, makeCall]);

  // ── makeCall ───────────────────────────────────────────────────────────────
  const makeCall = useCallback(async (phoneNumber) => {
    if (!phoneNumber) return;

    // Unlock voice synthesis modules on human interaction
    try {
       edgeTTS.unlock();
       if (window.speechSynthesis) {
           const u = new SpeechSynthesisUtterance('');
           // Unlock by playing a silent, empty utterance on the first user interaction
           u.volume = 0;
           window.speechSynthesis.speak(u);
       }
    } catch(e) {}

    // Idempotency guard — functional updater reads committed state
    setCallStatus(prev => {
      if (prev !== 'Idle') return prev;
      return 'Calling';
    });

    disposedRef.current = false;
    const recId         = generateRecordingId();
    const name          = randomMockName();
    const leadObj = {
      id:       `MOCK-${Math.floor(Math.random() * 90000) + 10000}`,
      name,
      phone:    phoneNumber,
      address:  '742 Evergreen Terrace',
      city:     'Springfield',
      state:    'IL',
      campaign: activeCampaign || 'Default'
    };

    // ── Populate stable refs BEFORE any setState ────────────────────────────
    activeCallPhoneRef.current = phoneNumber;
    activeLeadRef.current      = leadObj;
    callStartRef.current       = new Date().toISOString();
    callAnswerRef.current      = '';
    transcriptRef.current      = [];

    setActiveRecordingId(recId);
    setActiveSIPCall(phoneNumber);
    setTranscriptLines([]);
    setSentimentScore('neutral');
    setCurrentLeadData(leadObj);
    setAgentHandedOff(false);
    setIsAISpeaking(false);
    setActiveScriptSection(null);

    setSipLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}] -> INVITE sip:${phoneNumber}@${vosConfig.serverIp}:${vosConfig.wssPort} SIP/2.0`]);

    // Clear lingering timers before scheduling new ones
    callTimersRef.current.forEach(clearTimeout);
    callTimersRef.current = [];

    setCallStatus('Calling');
    setActiveSIPCall(phoneNumber);
    try {
      await sipCall(phoneNumber);
      callAnswerRef.current = new Date().toISOString();
      setCallStatus('Connected');
    } catch(e) {
      setCallStatus('Idle');
      setActiveSIPCall(null);
    }
  }, [sipCall, vosConfig, activeCampaign]);

  // ── endCall ────────────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    callTimersRef.current.forEach(clearTimeout);
    callTimersRef.current = [];
    window.speechSynthesis.cancel();
    aiUtteranceRef.current = null;

    await sipHangup();

    setCallStatus('Ended');
    setTimeout(() => {
      setCallStatus('Idle');
      setCurrentLeadData(null);
      setActiveSIPCall('');
    }, 800);
  }, [sipHangup]);

  // ── simulateInboundCall ────────────────────────────────────────────────────
  const simulateInboundCall = useCallback(() => {
    if (inboundCall) return; // already ringing

    // Prefer a number already in CRM so screen pop gets a full match
    let caller;
    const crmMatch = customerLeads.find(l => l.phone);
    if (crmMatch) {
      caller = { phone: crmMatch.phone, name: crmMatch.name };
    } else {
      caller = INBOUND_CALLERS[Math.floor(Math.random() * INBOUND_CALLERS.length)];
    }

    setInboundCall(caller);
    setInboundStatus('ringing');
    setScreenPopData(null);

    // Auto-miss after 30 s if nobody responds
    clearTimeout(inboundRingTimerRef.current);
    inboundRingTimerRef.current = setTimeout(() => {
      setInboundStatus(prev => {
        if (prev === 'ringing') {
          setInboundLogs(logs => [{
            id:          `IB-${Date.now()}`,
            time:        new Date().toISOString(),
            phone:       caller.phone,
            name:        caller.name,
            status:      'missed',
            duration:    0,
            recordingId: null,
          }, ...logs]);
          setTimeout(() => { setInboundCall(null); setInboundStatus(null); }, 1500);
          return 'missed';
        }
        return prev;
      });
    }, 30000);
  }, [inboundCall, customerLeads]);

  // ── acceptInboundCall ──────────────────────────────────────────────────────
  const acceptInboundCall = useCallback(() => {
    if (!inboundCall) return;
    clearTimeout(inboundRingTimerRef.current);

    // 1. Play Urdu IVR welcome via EdgeTTS (bypasses Chromium mic ducking)
    setIvrPlaying(true);
    
    const finishIVR = () => {
      setIvrPlaying(false);
      setInboundStatus('answered');

      // Log answered call
      const recId = generateRecordingId();
      setInboundLogs(logs => [{
        id:          `IB-${Date.now()}`,
        time:        new Date().toISOString(),
        phone:       inboundCall.phone,
        name:        inboundCall.name,
        status:      'answered',
        duration:    0,
        recordingId: recId,
      }, ...logs]);

      // Add entry to supervisor panel
      setSupervisorCalls(prev => [{
        id:        `SV-${Date.now()}`,
        agent:     agentAuth.username || 'Agent',
        phone:     inboundCall.phone,
        startTime: Date.now(),
      }, ...prev]);
    };

    edgeTTS.speak({
       text: IVR_URDU_MESSAGE,
       voice: 'ur-PK-GulNeural',
       onEnd: finishIVR,
       onError: finishIVR
    });

    // 2. Build screen pop — match CRM leads + outbound call history
    const matchedLead = customerLeads.find(l => l.phone === inboundCall.phone);
    const callHistory = sessionLogs.filter(l => l.phone === inboundCall.phone);
    setScreenPopData({
      lead: matchedLead || {
        id:    `INBOUND-${Date.now()}`,
        name:  inboundCall.name,
        phone: inboundCall.phone,
      },
      callHistory,
    });
  }, [inboundCall, customerLeads, sessionLogs, agentAuth]);

  // ── rejectInboundCall ──────────────────────────────────────────────────────
  const rejectInboundCall = useCallback(() => {
    if (!inboundCall) return;
    clearTimeout(inboundRingTimerRef.current);
    window.speechSynthesis.cancel();
    setIvrPlaying(false);

    setInboundLogs(logs => [{
      id:          `IB-${Date.now()}`,
      time:        new Date().toISOString(),
      phone:       inboundCall.phone,
      name:        inboundCall.name,
      status:      'missed',
      duration:    0,
      recordingId: null,
    }, ...logs]);

    setInboundStatus('missed');
    setTimeout(() => { setInboundCall(null); setInboundStatus(null); }, 1200);
  }, [inboundCall]);

  // ── sendToVoicemail ────────────────────────────────────────────────────────
  const sendToVoicemail = useCallback(() => {
    if (!inboundCall) return;
    clearTimeout(inboundRingTimerRef.current);
    window.speechSynthesis.cancel();
    setIvrPlaying(false);

    setInboundLogs(logs => [{
      id:          `IB-${Date.now()}`,
      time:        new Date().toISOString(),
      phone:       inboundCall.phone,
      name:        inboundCall.name,
      status:      'voicemail',
      duration:    0,
      recordingId: null,
    }, ...logs]);

    setInboundStatus('voicemail');
    setTimeout(() => { setInboundCall(null); setInboundStatus(null); }, 1200);
  }, [inboundCall]);

  // ── closeScreenPop ─────────────────────────────────────────────────────────
  const closeScreenPop = useCallback(() => {
    setScreenPopData(null);
  }, []);

  // ── Disposition label map ──────────────────────────────────────────────────
  const DISPO_LABEL_MAP = {
    SALE: 'Completed Sale', CBHOLD: 'Call Back', DNC: 'Do Not Call',
    NI: 'Not Interested', A: 'Answering Machine', DEC: 'Declined', HANGUP: 'Hung Up',
  };

  /**
   * Builds a fully-enriched professional session log record.
   * All fields are included so Papa.unparse produces a complete CSV.
   */
  const buildLogRecord = ({ code, lead, phone, endTime, talkDuration, ringDuration, whatsappSent, transcriptSnap }) => ({
    // ── Timestamps ───────────────────────────────────────────────────────────
    callStartTime:    callStartRef.current  || 'N/A',
    callAnswerTime:   callAnswerRef.current || 'N/A',
    callEndTime:      endTime,
    // ── Agent ────────────────────────────────────────────────────────────────
    agentId:          agentAuth.agentId  || agentAuth.extension || 'N/A',
    agentName:        agentAuth.username    || 'N/A',
    campaign:         activeCampaign || agentAuth.campaign || 'Manual Outbound',
    callDirection:    'Outbound',
    // ── Lead / Customer ──────────────────────────────────────────────────────
    leadId:           lead?.id   || 'N/A',
    customerName:     lead?.name || 'Unknown',
    phone:            phone      || 'Unknown',
    // ── Durations (seconds) ──────────────────────────────────────────────────
    totalDuration:    callDuration,
    ringDuration:     ringDuration ?? 0,
    talkDuration:     talkDuration ?? callDuration,
    // ── Outcome ──────────────────────────────────────────────────────────────
    disposition:      code,
    dispositionLabel: DISPO_LABEL_MAP[code] || code,
    sentiment:        sentimentScore,
    whatsappSent:     whatsappSent || 'No',
    // ── Recording ────────────────────────────────────────────────────────────
    recordingId:      activeRecordingId || 'N/A',
    recordingUrl:     activeRecordingId
      ? `https://recordings.hbelectronics.pk/listen/${activeRecordingId}`
      : 'N/A',
    // ── AI Transcript (compact JSON, one cell in CSV) ─────────────────────────
    transcript: transcriptSnap?.length
      ? transcriptSnap.map(l => `[${l.role.toUpperCase()}] ${l.text}`).join(' | ')
      : 'N/A',
  });

  // ── disposeAndLog ──────────────────────────────────────────────────────────
  /**
   * Called by DispositionGrid.
   * Atomically: writes to CRM table + session logs, triggers WhatsApp, ends call.
   */
  const disposeAndLog = (code, leadSnapshot) => {
    if (disposedRef.current) return; // prevent double-fire on rapid click
    disposedRef.current = true;

    const endTime = new Date().toISOString();
    const phone   = leadSnapshot?.phone || activeCallPhoneRef.current || 'N/A';
    const lead    = leadSnapshot || activeLeadRef.current;
    const wasSent = (code === 'SALE' || code === 'CBHOLD') ? 'Yes' : 'No';

    const ringMs      = callAnswerRef.current
      ? new Date(callAnswerRef.current) - new Date(callStartRef.current)
      : 0;
    const ringDuration  = Math.round(ringMs / 1000);
    const talkDuration  = Math.max(0, callDuration - ringDuration);
    const transcriptSnap = transcriptRef.current;

    const tempId = Date.now();

    // ── Rich CRM record ───────────────────────────────────────────────────────
    setCustomerLeads(prev => [{
      id:             tempId,
      name:           lead?.name  || 'Unknown',
      phone,
      disposition:    code,
      time:           endTime,
      duration:       callDuration,
      sentiment:      sentimentScore,
      recordingId:    activeRecordingId,
      transcriptSnap, // stored for recording voice playback
      whatsappSent:   code === 'SALE' || code === 'CBHOLD', // boolean
    }, ...prev]);

    // ── Professional session log ───────────────────────────────────────────────
    const logRecord = buildLogRecord({ code, lead, phone, endTime, talkDuration, ringDuration, whatsappSent: wasSent, transcriptSnap });
    setSessionLogs(prev => [...prev, {
      ...logRecord,
      id:          tempId,
      time:        endTime,
      duration:    callDuration,
      lead:        lead?.name || 'Unknown',
      transcriptSnap,  // stored for recording voice playback
    }]);

    // ── Async AI Summary & DB Persistence ──────────────────────────────────────
    (async () => {
      let aiSummaryStr = '';
      let leadScoreVal = 0;
      let nextActionStr = '';

      if (transcriptSnap && transcriptSnap.length > 0) {
        try {
          const aiRes = await fetch('/api/ai/summarize', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.__authToken || ''}` },
             body: JSON.stringify({ 
                transcript: transcriptSnap.map(l => `[${l.role.toUpperCase()}] ${l.text}`).join('\\n'), 
                disposition: code, 
                duration: callDuration, 
                customerName: lead?.name || 'Unknown' 
             })
          });
          const aiData = await aiRes.json();
          if (aiData && aiData.summary) {
             aiSummaryStr = JSON.stringify(aiData);
             leadScoreVal = aiData.leadScore || 0;
             nextActionStr = aiData.nextAction || '';
             
             // Update local states immediately
             setSessionLogs(prev => prev.map(l => l.id === tempId ? { ...l, ai_summary: aiSummaryStr, lead_score: leadScoreVal, next_action: nextActionStr } : l));
             setCustomerLeads(prev => prev.map(l => l.id === tempId ? { ...l, lead_score: leadScoreVal, ai_summary: aiSummaryStr, next_action: nextActionStr } : l));
          }
        } catch(e) { console.error('AI Summary failed', e); }
      }

      fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.__authToken || ''}` },
        body: JSON.stringify({ ...logRecord, aiSummary: aiSummaryStr })
      }).catch(console.error);

      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.__authToken || ''}` },
        body: JSON.stringify({
          name: lead?.name || 'Unknown', phone, disposition: code, time: endTime, duration: callDuration, sentiment: sentimentScore, recordingId: activeRecordingId, whatsappSent: (code === 'SALE' || code === 'CBHOLD'),
          leadScore: leadScoreVal
        })
      }).catch(console.error);
    })();

    // ── WhatsApp receipt ───────────────────────────────────────────────────────
    if ((code === 'SALE' || code === 'CBHOLD') && phone) {
      sendWhatsAppReceipt({ ...lead, phone }, code, activeRecordingId);
    }

    endCall();
  };

  // ── Misc Helpers ───────────────────────────────────────────────────────────
  const clearTranscript     = () => { setTranscriptLines([]); setSentimentScore('neutral'); };
  const toggleAgentStatus   = () => setAgentAuth(prev => ({ ...prev, status: prev.status === 'PAUSED' ? 'READY' : 'PAUSED' }));
  const handleMute = () => {
    setIsMuting(m => {
      const nextMute = !m;
      if (nextMute) sipMute();
      else sipUnmute();
      return nextMute;
    });
  };

  // ── Context Value ──────────────────────────────────────────────────────────
  const value = {
    // Auth
    agentAuth, isAuthenticated, loginAgent, toggleAgentStatus,
    // SIP
    isRegistered,
    // Outbound Call
    callStatus, setCallStatus,
    activeSIPCall,
    callDuration,
    isRecording,
    isMuting, handleMute,
    activeRecordingId,
    // Actions
    makeCall, endCall, disposeAndLog,
    // Lead / CRM
    currentLeadData, setCurrentLeadData,
    customerLeads,   setCustomerLeads,
    // Outbound Logs
    sessionLogs, setSessionLogs,
    // Intelligence Layer
    transcriptLines, sentimentScore, clearTranscript,
    activeScriptSection, recommendedScriptSection, setRecommendedScriptSection,
    currentScriptSection, setCurrentScriptSection,
    // TTS
    voiceScript, setVoiceScript,
    scriptMode, setScriptMode,
    isTTSPlaying, setIsTTSPlaying,
    currentSubtitle, setCurrentSubtitle,
    // ── AI Voice Assistant ──────────────────────────────────────────────────
    isAISpeaking,
    agentHandedOff,
    transferToAgent,
    // Auto-Dialer
    autoDialerList,   setAutoDialerList,
    autoDialerActive, setAutoDialerActive,
    diallerMode, setDiallerMode,
    activeCampaign, setActiveCampaign,
    dialCountdown,
    callsMadeHour, callsMadeDay,
    totalListLength, setTotalListLength,
    // ── Inbound System ──────────────────────────────────────────────────────
    inboundCall,
    inboundStatus,
    inboundLogs,
    ivrPlaying,
    supervisorCalls,
    screenPopData,
    simulateInboundCall,
    acceptInboundCall,
    rejectInboundCall,
    sendToVoicemail,
    closeScreenPop,
    // VOS integration
    vosBalance, vosStatus,
    sipLogs, pingVOSGateway,
    vosConfig, setVosConfig,
    isServerSetupOpen, setIsServerSetupOpen,
    // Role
    userRole,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCallContext must be used within a CallProvider');
  return context;
};
