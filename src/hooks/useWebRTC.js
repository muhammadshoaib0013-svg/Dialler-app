import { useRef, useState, useEffect } from 'react';
import { Web } from 'sip.js';

export function useWebRTC(extension, password, serverIp, wssPort, onHangup) {
  const [status, setStatus] = useState('DISCONNECTED');
  const userRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // We create the audio element once and keep it alive
    audioRef.current = document.getElementById('remoteAudio') || new Audio();
    audioRef.current.autoplay = true;

    if (!extension || !password || !serverIp || !wssPort) return;

    setStatus('CONNECTING');
    const uri = `wss://${serverIp}:${wssPort}/ws`;
    const domain = serverIp;
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
        if (onHangup) onHangup();
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
  }, [extension, password, serverIp, wssPort, onHangup]);

  const call = async (targetNumber) => {
    if (!userRef.current) return;
    try {
      await userRef.current.call(`sip:${targetNumber}@${serverIp}`);
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
          await userRef.current.session.refer(`sip:${targetAor}@${serverIp}`);
       } catch (e) {
         console.error("Transfer failed", e);
       }
     }
  };

  return { status, call, hangup, mute, unmute, transfer };
}
