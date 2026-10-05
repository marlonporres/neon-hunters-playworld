import os from 'node:os';
import { createServer } from 'vite';

const privateIP = value => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value);
const interfaces = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) => (addresses || []).filter(address => address.family === 'IPv4' && !address.internal && privateIP(address.address)).map(address => ({ name, ip: address.address })));
const requested = process.env.TABLET_LAN_IP;
const network = requested ? interfaces.find(item => item.ip === requested) : interfaces.find(item => !/virtual|vethernet|docker|wsl|vpn/i.test(item.name));
if (!network) throw new Error('No private LAN adapter found. Set TABLET_LAN_IP to an existing private IPv4 address.');
// Bind only the private adapter, not all interfaces. No tunnel, firewall changes, or public hosting.
const server = await createServer({ server: { host: network.ip, port: 5200, strictPort: true } });
await server.listen();
console.log(`Tablet playground (${network.name}): http://${network.ip}:5200/`);
console.log('Use the same Wi-Fi. Press Ctrl+C to stop local sharing.');
