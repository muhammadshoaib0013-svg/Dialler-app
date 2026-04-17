const https = require('https');
const net = require('net');

// Usage: node deploy_health_check.js <your_domain_or_ip>
const HOST = process.argv[2] || 'dialer.yourdomain.com';
const API_URL = `https://${HOST}/agc/api.php`;
const WSS_PORT = 8089;

console.log(`Starting Pre-Flight Health Check on Domain: ${HOST}\n`);

// 1. Check HTTP/HTTPS API Port Connectivity
const checkApi = new Promise((resolve) => {
    console.log(`Testing Vicidial API Endpoint: ${API_URL}`);
    https.get(API_URL, { rejectUnauthorized: false }, (res) => {
        console.log(`[PASS] HTTPS Port 443 Open. API responded with HTTP ${res.statusCode}`);
        resolve();
    }).on('error', (e) => {
        console.error(`[FAIL] API Unreachable - Check Firewalls / Apache. Error: ${e.message}`);
        resolve();
    });
});

// 2. Check Raw TCP Port 8089 for Asterisk WSS
const checkWss = new Promise((resolve) => {
    console.log(`Testing Asterisk WSS Port TCP:${WSS_PORT}`);
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
        console.log(`[PASS] TCP Port ${WSS_PORT} is completely open and reachable by Asterisk.`);
        socket.destroy();
        resolve();
    });
    
    socket.on('timeout', () => {
        console.error(`[FAIL] Connection timed out on Port ${WSS_PORT}. Port is likely blocked by cloud firewalls (UFW/AWS Security Groups).`);
        socket.destroy();
        resolve();
    });
    
    socket.on('error', (err) => {
        console.error(`[FAIL] Connection refused on Port ${WSS_PORT}. Asterisk WSS service is offline or blocked.`, err.message);
        resolve();
    });

    socket.connect(WSS_PORT, HOST);
});

Promise.all([checkApi, checkWss]).then(() => {
    console.log('\nHealth Check Complete. Press Ctrl+C to exit.');
});
