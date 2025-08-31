const WebSocket = require('ws');
const url = require('url');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PORT = process.env.PORT || 3000;
let proxies = [];
try {
    const proxyFile = fs.readFileSync('proxies.txt', 'utf8');
    proxies = proxyFile.split('\n').map(p => p.trim()).filter(p => p && !p.startsWith('#'));
    if (proxies.length > 0) console.log(`✅ Loaded ${proxies.length} proxies.`);
} catch (error) {
    console.error("❌ Could not read proxies.txt.");
}

const wss = new WebSocket.Server({ port: PORT });
console.log(`🚀 Relay server starting...`);
wss.on('listening', () => console.log(`🎉 Relay server is listening on port ${PORT}.`));

wss.on('connection', (clientFromBrowser, req) => {
    const targetUrl = url.parse(req.url, true).query.target;
    if (!targetUrl) return clientFromBrowser.close(1008, "No target URL.");
    if (proxies.length === 0) return clientFromBrowser.close(1011, "No proxies available.");
    
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    const proxyAgent = new HttpsProxyAgent(randomProxy);
    const clientToGame = new WebSocket(targetUrl, { agent: proxyAgent });

    const relay = (source, dest) => {
        source.on('message', msg => dest.readyState === WebSocket.OPEN && dest.send(msg));
        source.on('close', () => dest.readyState === WebSocket.OPEN && dest.close());
        source.on('error', () => dest.readyState === WebSocket.OPEN && dest.close());
    };

    relay(clientFromBrowser, clientToGame);
    relay(clientToGame, clientFromBrowser);
});
