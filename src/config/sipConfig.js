/**
 * SIP.js Configuration Object
 * Pulls variables from the environment and maps them to UserAgent configurations.
 */

// In Vite, environment variables are exposed via import.meta.env, not process.env.
// Thus, we use import.meta.env to grab the variables.
const sipUri = import.meta.env.REACT_APP_SIP_URI;
const sipPassword = import.meta.env.REACT_APP_SIP_PASSWORD;
const wssServer = import.meta.env.REACT_APP_WSS_SERVER;

// Check for missing variables and alert the developer
if (!sipUri || !sipPassword || !wssServer) {
    const missingVars = [];
    if (!sipUri) missingVars.push('REACT_APP_SIP_URI');
    if (!sipPassword) missingVars.push('REACT_APP_SIP_PASSWORD');
    if (!wssServer) missingVars.push('REACT_APP_WSS_SERVER');

    const errorMsg = `CRITICAL ERROR: Missing SIP Configuration!\n\nThe following environment variables are missing from your .env file:\n- ${missingVars.join('\n- ')}\n\nPlease add them and restart the React development server.`;
    
    console.error(errorMsg);
}

const getUsernameFromUri = (uri) => {
    if (!uri) return '';
    // Extracts '1000' from 'sip:1000@domain.com'
    const stripped = uri.replace('sip:', '');
    return stripped.split('@')[0];
};

export const getSipConfiguration = () => {
    return {
        aor: sipUri, // The address-of-record (e.g., sip:1000@dialer.domain.com)
        userAgentOptions: {
            authorizationUsername: getUsernameFromUri(sipUri), 
            authorizationPassword: sipPassword,
            transportOptions: {
                server: wssServer, // The Asterisk/Vicidial WSS connection
                traceSip: true, // Useful for debugging WebRTC flows
                keepAliveInterval: 15,
            }
        }
    };
};
