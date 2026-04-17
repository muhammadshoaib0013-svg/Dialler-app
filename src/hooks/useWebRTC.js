import { useRef, useState, useEffect } from 'react';
import { Web } from 'sip.js';
import { useAppStore } from '../store/useAppStore';

export function useWebRTC(extension, password) {
  const [status, setStatus] = useState('DISCONNECTED');
  const userRef = useRef(null);
  const audioRef = useRef(null);
  
  const endActiveCall = useAppStore(state => state.endActiveCall);

  useEffect(() => {
    // We create the audio element once and keep it alive
    audioRef.current = new Audio();
    audioRef.current.autoplay = true;

    if (!extension || !password) return;

    setStatus('CONNECTING');
    const uri = 'wss://dialer.yourdomain.com:8089/ws';
    const domain = 'dialer.yourdomain.com';
    const aor = `sip:${extension}@${domain}`;

    const simpleUser = new Web.SimpleUser(uri, {
      aor,
      media: {
        remote: { audio: audioRef.current }
      },
      userAgentOptions: {
        authorizationPassword: password,
        authorizationUsername: extension,
        transportOptions: { server: uri }
      }
    });

    simpleUser.delegate = {
      onCallCreated: () => console.log("[SIP] Call Created"),
      onCallAnswered: () => {
        console.log("[SIP] Call Answered");
        setStatus('CONNECTED_CALL');
      },
      onCallHangup: () => {
        console.log("[SIP] Call Hangup");
        setStatus('REGISTERED');
        endActiveCall();
      },
      onRegistered: () => {
        console.log("[SIP] WSS Registered");
        setStatus('REGISTERED');
      },
      onUnregistered: () => {
        console.log("[SIP] Unregistered");
        setStatus('DISCONNECTED');
      }
    };

    simpleUser.connect()
      .then(() => simpleUser.register())
      .catch(e => {
        console.error("SIP Connect/Register failed", e);
        setStatus('ERROR');
      });

    userRef.current = simpleUser;

    return () => {
      if (userRef.current) {
        userRef.current.unregister().then(() => userRef.current.disconnect());
      }
    };
  }, [extension, password, endActiveCall]);

  const call = async (targetNumber) => {
    if (!userRef.current) return;
    try {
      await userRef.current.call(`sip:${targetNumber}@dialer.yourdomain.com`);
    } catch(e) {
      console.error("Call failed", e);
    }
  };

  const hangup = async () => {
    if (userRef.current?.session) {
      await userRef.current.hangup();
    }
  };

  const mute = () => {
    userRef.current?.mute();
  };

  const unmute = () => {
    userRef.current?.unmute();
  };

  const transfer = async (targetAor) => {
     if (userRef.current?.session) {
       try {
          await userRef.current.session.refer(`sip:${targetAor}@dialer.yourdomain.com`);
       } catch (e) {
         console.error("Transfer failed", e);
       }
     }
  };

  return { status, call, hangup, mute, unmute, transfer };
}
