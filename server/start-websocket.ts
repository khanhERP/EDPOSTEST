
import { popupSignalServer } from './websocket-server';

console.log('WebSocket server for popup signals has been started independently');
console.log(`Active clients: ${popupSignalServer.getClientsCount()}`);
