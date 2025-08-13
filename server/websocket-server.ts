
import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer | null = null;

export function initializeWebSocketServer(server: Server) {
  if (wss) {
    console.log('WebSocket server already running');
    return;
  }

  try {
    wss = new WebSocketServer({ server, path: '/ws' });
  } catch (error) {
    console.error('Failed to create WebSocket server:', error);
    return;
  }

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', (message: string) => {
      console.log(`Received message => ${message}`);
      // Handle incoming messages if needed
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('WebSocket server started on the same port as HTTP server');
}

export function broadcastPopupClose(success: boolean) {
  if (wss) {
    const message = JSON.stringify({
      type: 'popup_close',
      success
    });

    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log('Broadcasted popup close signal:', { success });
  }
}

export function broadcastPaymentSuccess(transactionUuid: string) {
  if (wss) {
    const message = JSON.stringify({
      type: 'payment_success',
      transactionUuid
    });

    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log('Broadcasted payment success:', { transactionUuid });
  }
}
