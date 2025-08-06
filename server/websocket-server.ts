import WebSocket from 'ws';

let wss: WebSocket.Server | null = null;

// Initialize WebSocket server immediately
initializeWebSocketServer(3001);

export function initializeWebSocketServer(port: number) {
  wss = new WebSocket.Server({ port });

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

  console.log(`WebSocket server started on port ${port}`);
}

export function broadcastPopupClose(success: boolean) {
  if (wss) {
    const message = JSON.stringify({
      type: 'popup_close',
      success
    });

    wss.clients.forEach((client: any) => {
      if (client.readyState === 1) { // WebSocket.OPEN
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

    wss.clients.forEach((client: any) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });

    console.log('Broadcasted payment success:', { transactionUuid });
  }
}