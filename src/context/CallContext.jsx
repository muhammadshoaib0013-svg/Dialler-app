import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { sendWhatsAppReceipt } from '../utils/whatsapp';
import { LiveSubtitleSystem } from '../services/LiveSubtitleSystem';
import edgeTTS from '../services/EdgeTTSManager';

// ─── Script Definitions (Migrated from ScriptPanel) ──────────────────────────────
export const SCRIPT_TEMPLATES = [
  {
    title: 'Introduction',
    colorBar: 'from-blue-600 to-blue-500',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    text: 'Assalam-o-Alaikum [Customer Name]! This is Hassan calling from HB Electronics. I saw you were browsing our Smart TV range online — do you have a quick minute to hear about an exclusive offer?',
  },
  {
    title: 'Warranty & Delivery',
    colorBar: 'from-purple-600 to-purple-500',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    text: '[Customer Name], all our appliances come with a standard 2-year manufacturer warranty and free next-day home delivery — fully registered and certified.',
  },
  {
    title: 'Closing',
    colorBar: 'from-green-600 to-green-500',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    text: 'Perfect, [Customer Name]! I\'ll lock in that exclusive price for you right now. Our delivery team will WhatsApp you the confirmation shortly. Have a wonderful day!',
  },
  {
    title: 'Payment Confirmation',
    colorBar: 'from-gold-500 to-amber-500',
    badge: 'bg-gold-500/20 text-gold-400 border-gold-500/30',
    text: 'Thank you, [Customer Name]! To confirm your order, we accept EasyPaisa, JazzCash, bank transfer, and cash on delivery. Which payment method would you prefer today?',
  },
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
  const [scheduleLimits, setScheduleLimits]   = useState({ maxPerHour: 50, maxPerDay: 500 });
  const [callsMadeHour, setCallsMadeHour]     = useState(0);
  const [callsMadeDay, setCallsMadeDay]       = useState(0);
  const [totalListLength, setTotalListLength] = useState(0);

  // ── Internal Refs ──────────────────────────────────────────────────────────
  const callTimersRef = useRef([]);
  const disposedRef = useRef(false);
  const aiUtteranceRef = useRef(null);

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
  const disposedRef   = useRef(false);
  const userAgentRef  = useRef({ 
    // SIP WebRTC stub - low latency logic for VOS3000 WebRTC-to-SIP Proxy Handshake
    current: {
      configuration: {
        rtcpMuxPolicy: 'require',     // Required for strict NAT traversal optimization
        bundlePolicy: 'max-bundle',   // Maximizes stream multiplexing to reduce port usage
        iceTransportPolicy: 'all',
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
          // Configure your TURN server credentials here for a resilient WebRTC-to-VOS bridge
        ]
      }
    } 
  });

  // ── VOS3000 Integration ────────────────────────────────────────────────────
  const [vosBalance, setVosBalance]           = useState(0.00);
  const [vosStatus, setVosStatus]             = useState('Connecting...');
  const [sipLogs, setSipLogs]                 = useState([]);

  // Mock Ping Gateway
  const pingVOSGateway = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    setSipLogs(prev => [...prev.slice(-49), `[${timestamp}] -> OPTIONS sip:vos.gateway:5060 SIP/2.0`]);
    
    setTimeout(() => {
      const ts2 = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
      const isSuccess = Math.random() > 0.2; // 80% success rate for simulation
      if (isSuccess) {
        setSipLogs(prev => [...prev.slice(-49), `[${ts2}] <- 200 OK (VOS3000 Node-1 Active)`]);
      } else {
        setSipLogs(prev => [...prev.slice(-49), `[${ts2}] <- 408 Request Timeout (VOS3000 Unreachable)`]);
      }
    }, Math.floor(Math.random() * 300) + 100); 
  }, []);

  // Mock checking VOS Wallet balance in real-time
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Simulate initial connection
    const connectTimer = setTimeout(() => {
      setVosStatus('Connected');
      setVosBalance(250.50); // Initial mock balance
    }, 1500);

    // Simulate polling for real-time balance updates via VOS API
    const pollInterval = setInterval(() => {
      setVosBalance(prev => {
        // Decrease by small amount continuously if on an active call
        if (callStatus === 'Connected') {
          return Math.max(0, prev - (Math.random() * 0.05 + 0.01));
        }
        return prev;
      });
    }, 5000);

    return () => {
      clearTimeout(connectTimer);
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, callStatus]);

  /**
   * Stable refs — these survive React's batched Idle state transition
   * (setActiveSIPCall('') and setCurrentLeadData(null) in the same setTimeout)
   * so the HANGUP auto-log always has real data, never 'Unknown'.
   */
  const activeCallPhoneRef = useRef('');      // dialed number
  const activeLeadRef      = useRef(null);    // full lead object
  const callStartRef       = useRef('');      // ISO timestamp when makeCall fires
  const callAnswerRef      = useRef('');      // ISO timestamp when Connected
  const transcriptRef      = useRef([]);      // snapshot of transcript at call end

  // ── Inbound Refs ───────────────────────────────────────────────────────────
  const inboundRingTimerRef = useRef(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const loginAgent = async (data) => {
    // Admin hard credentials
    if (data.username === 'admin' && data.password === '123') {
      setAgentAuth({ ...data, username: 'admin', extension: 'ADM-01', campaign: 'All', status: 'PAUSED' });
      setUserRole('admin');
      setIsAuthenticated(true);
      return;
    }
    // Agent credentials — validated against localStorage roster
    const storedAgents = (() => { try { return JSON.parse(localStorage.getItem('hb_agents_v1') || '[]'); } catch { return []; } })();
    const agent = storedAgents.find(a => a.agentId === data.username && a.password === data.password);
    if (agent) {
      setAgentAuth({ ...data, username: agent.name, extension: agent.extension, campaign: 'Default', status: 'PAUSED' });
      setUserRole('agent');
      setIsAuthenticated(true);
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
        if (scriptMode === 'fixed') {
           playbackText = introScript.replace(/\[Customer Name\]/g, customerName);
        } else {
           playbackText = voiceScript || buildAIGreeting(customerName);
        }

        setTimeout(() => {
          setIsAISpeaking(true);
          setIsTTSPlaying(true);
          
          edgeTTS.speak({
            text: playbackText,
            voice: 'ur-PK-GulNeural',
            onStart: () => setCurrentSubtitle('AI Assistant initiating script...'),
            onSubtitle: (txt) => setCurrentSubtitle(`AI: ${txt}`),
            onWord: (word) => { }, 
            onEnd: () => {
              setIsAISpeaking(false);
              setIsTTSPlaying(false);
              setCurrentSubtitle('');
              
              // Auto-disconnect if it was a robotic dialer call and human hasn't intervened
              if (autoDialerActive && !agentHandedOff) {
                setTimeout(() => { if (callStatus === 'Connected') endCall(); }, 2000);
              }
            },
            onError: (err) => console.error('[EdgeTTS] Error:', err)
          });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus]);

  // ── Live Transcript Engine (Replaced by LiveSubtitleSystem) ────────

  // ── Auto-Dialer Loop ───────────────────────────────────────────────────────
  useEffect(() => {
    let timeout;
    if (autoDialerActive && callStatus === 'Idle' && autoDialerList.length > 0) {
      if (callsMadeHour >= scheduleLimits.maxPerHour || callsMadeDay >= scheduleLimits.maxPerDay) {
        setAutoDialerActive(false);
        return;
      }
      timeout = setTimeout(() => {
        const next = autoDialerList[0];
        setAutoDialerList(prev => prev.slice(1));
        setCallsMadeHour(prev => prev + 1);
        setCallsMadeDay(prev => prev + 1);
        makeCall(next?.phone || next);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDialerActive, callStatus, autoDialerList, callsMadeHour, callsMadeDay, scheduleLimits]);

  // ── makeCall ───────────────────────────────────────────────────────────────
  const makeCall = useCallback((phoneNumber) => {
    if (!phoneNumber) return;

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

    setSipLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}] -> INVITE sip:${phoneNumber}@vos.gateway SIP/2.0`]);

    // Clear lingering timers before scheduling new ones
    callTimersRef.current.forEach(clearTimeout);
    callTimersRef.current = [];

    // Simulate SIP signalling: Calling → Ringing → Connected
    callTimersRef.current.push(setTimeout(() => {
      setSipLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}] <- 100 Trying`]);
      setSipLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}] <- 180 Ringing`]);
      setCallStatus('Ringing');
    }, 1000));
    callTimersRef.current.push(setTimeout(() => {
      setSipLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}] <- 200 OK`]);
      callAnswerRef.current = new Date().toISOString();
      setCallStatus('Connected');
    }, 2500));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── endCall ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    callTimersRef.current.forEach(clearTimeout);
    callTimersRef.current = [];
    window.speechSynthesis.cancel();
    aiUtteranceRef.current = null;

    setSipLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}] -> BYE sip:vos.gateway:5060 SIP/2.0`]);
    setTimeout(() => {
        setSipLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}] <- 200 OK`]);
    }, 150);

    setCallStatus('Ended');
    const t = setTimeout(() => {
      setCallStatus('Idle');
      setCurrentLeadData(null);
      setActiveSIPCall('');
    }, 800);
    callTimersRef.current.push(t);
  }, []);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboundCall, customerLeads]);

  // ── acceptInboundCall ──────────────────────────────────────────────────────
  const acceptInboundCall = useCallback(() => {
    if (!inboundCall) return;
    clearTimeout(inboundRingTimerRef.current);

    // 1. Play Urdu IVR welcome via Web Speech API
    setIvrPlaying(true);
    window.speechSynthesis.cancel();

    const utt   = new SpeechSynthesisUtterance(IVR_URDU_MESSAGE);
    utt.rate    = 0.82;
    utt.pitch   = 1.05;

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

    utt.onend   = finishIVR;
    utt.onerror = finishIVR;
    window.speechSynthesis.speak(utt);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    campaign:         agentAuth.campaign    || 'Manual Outbound',
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

    // ── Rich CRM record ───────────────────────────────────────────────────────
    setCustomerLeads(prev => [{
      id:             Date.now(),
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
    setSessionLogs(prev => [...prev, {
      ...buildLogRecord({ code, lead, phone, endTime, talkDuration, ringDuration, whatsappSent: wasSent, transcriptSnap }),
      // Keep legacy short keys for the UI table backward compat
      time:        endTime,
      duration:    callDuration,
      lead:        lead?.name || 'Unknown',
      transcriptSnap,  // stored for recording voice playback
    }]);

    // ── WhatsApp receipt ───────────────────────────────────────────────────────
    if ((code === 'SALE' || code === 'CBHOLD') && phone) {
      sendWhatsAppReceipt({ ...lead, phone }, code, activeRecordingId);
    }

    endCall();
  };

  // ── Misc Helpers ───────────────────────────────────────────────────────────
  const clearTranscript     = () => { setTranscriptLines([]); setSentimentScore('neutral'); };
  const toggleAgentStatus   = () => setAgentAuth(prev => ({ ...prev, status: prev.status === 'PAUSED' ? 'READY' : 'PAUSED' }));
  const handleMute          = () => setIsMuting(m => !m);

  // ── Context Value ──────────────────────────────────────────────────────────
  const value = {
    // Auth
    agentAuth, isAuthenticated, loginAgent, toggleAgentStatus,
    // SIP
    isRegistered, userAgentRef,
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
    activeScriptSection,
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
    scheduleLimits,   setScheduleLimits,
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
