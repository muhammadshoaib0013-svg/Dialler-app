import React, { useEffect, useRef } from 'react';

export default function ActiveCall() {
  const audioRef = useRef(null);

  useEffect(() => {
    // Listen for connection events from our context and connect media
    const handleTrackAdded = (e) => {
      const sessionDescriptionHandler = e.detail;
      const peerConnection = sessionDescriptionHandler.peerConnection;
      
      if (peerConnection) {
        peerConnection.ontrack = (event) => {
          console.log("[SIP] Media Track attached to DOM element");
          if (audioRef.current && event.streams[0]) {
            audioRef.current.srcObject = event.streams[0];
            audioRef.current.play().catch(err => console.warn("Audio autoplay blocked", err));
          }
        };
      }
    };

    window.addEventListener('sip-track-added', handleTrackAdded);
    return () => window.removeEventListener('sip-track-added', handleTrackAdded);
  }, []);

  return (
    <audio id="remoteAudio" ref={audioRef} autoPlay hidden controls={false} />
  );
}
