# VOS3000 WebRTC-to-SIP Integration Guide

As web browsers cannot communicate natively over pure UDP/TCP SIP, connecting a React-based WebRTC softphone to a VOS3000 Softswitch requires a WebRTC-to-SIP gateway. 

This guide outlines setup requirements using popular SIP proxies (like Kamailio or Asterisk) to bridge the WebRTC client with your VOS3000 routing engine.

---

## Architecture Overview

**React Dialer (WebRTC) <--> Internet <--> WebRTC-to-SIP Proxy (e.g. Kamailio/RTPengine) <--> SIP Server <--> VOS3000**

1. The **React Dialer** connects via WSS (Secure WebSockets).
2. The **Proxy** unwraps the WebSocket, validates SIP signaling, transcodes the media (DTLS-SRTP to standard RTP if needed), and forwards standard SIP (UDP/TCP) to VOS3000.
3. The **VOS3000** receives the standard SIP INVITE and routes the call to terminal gateways.

---

## Proxy Options & Advantages

### 1. Kamailio + RTPengine (Recommended for High Call Volume)
Kamailio is the most robust edge proxy to place in front of VOS3000.

- **Pros**: Handles tens of thousands of concurrent WebSocket connections, excellent for carrier-grade setups, low latency.
- **Config**: 
  - Install **RTPengine** on the edge server for WebRTC media bridging (`dtls-srtp` to `RTP`).
  - Configure `kamailio.cfg` to listen on WSS (e.g., port 443 with TLS certs loaded).
  - Use Kamailio’s `dispatcher` module to route valid SIP INVITEs directly to the VOS3000 SIP port.

### 2. Asterisk / FreeSWITCH (Recommended for Advanced Media Needs)
Asterisk and FreeSWITCH have built-in WebRTC support and SIP networking.

- **Pros**: Easy to set up out of the box, provides granular control over call recordings, routing logic, and IVRs before sending back to VOS.
- **Config**: 
  - In `pjsip.conf` (Asterisk), set `transport=ws,wss` and make sure your SIP endpoint has `webrtc=yes` and `use_avpf=yes`.
  - Point your Asterisk outbound dialplan to the VOS3000 SIP address using standard `PJSIP` trunks.

---

## Optimizing for Low Latency (VOS Handshakes)

The React dialer needs to establish communication quickly. Ensure these optimizations are completed on your backend proxy:

1. **RTCP Mux**: WebRTC requires RTCP multiplexing (`rtcpMuxPolicy: 'require'`). Ensure your media proxy supports it to avoid unnecessary delays during the ICE negotiation.
2. **ICE Transport Policy**: Set your WebRTC proxy to quickly handle STUN binding requests from the client. Host a local STUN/TURN server if agents are behind restrictive symmetric NATs to avoid the fallback relay delay.
3. **DTLS-SRTP Offloading**: Offload media bridging on powerful servers near the VOS3000 datacenter to minimize transcoding delay and jitter, ensuring the audio latency stays below 150ms.

---

## Exposing VOS Wallet / Balance via API

To allow the frontend to display the user's real-time credit tracking in the dashboard header, you must build an API gateway that interacts with the VOS3000 balance API.

1. Create a lightweight Node.js/Python microservice.
2. Connect this service to the VOS3000 Database or Management API.
3. Expose a secure REST endpoint: `/api/v1/vos/balance`.
4. Ensure the endpoint adds appropriate CORS headers (`Access-Control-Allow-Origin`) so your React dialer can `fetch` the stats periodically.
