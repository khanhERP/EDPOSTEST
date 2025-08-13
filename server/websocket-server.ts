import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer | null = null;
// Keep track of all connected clients
const clients = new Set<WebSocket>();

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

  wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📩 Received WebSocket message:', data);

        // Handle different message types
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        } else if (data.type === 'cart_update') {
          // Broadcast cart update to all connected clients (customer displays)
          console.log('📡 Broadcasting cart update to customer displays');
          clients.forEach(client => {
            if (client.readyState === client.OPEN && client !== ws) {
              client.send(JSON.stringify({
                type: 'cart_update',
                cart: data.cart,
                subtotal: data.subtotal,
                tax: data.tax,
                total: data.total,
                timestamp: data.timestamp
              }));
            }
          });
        } else if (data.type === 'qr_payment') {
          // Broadcast QR payment info to customer displays
          console.log('📱 Broadcasting QR payment to customer displays');
          clients.forEach(client => {
            if (client.readyState === client.OPEN && client !== ws) {
              client.send(JSON.stringify({
                type: 'qr_payment',
                qrCodeUrl: data.qrCodeUrl,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                transactionUuid: data.transactionUuid,
                timestamp: data.timestamp
              }));
            }
          });
        } else if (data.type === 'customer_display_connected') {
          console.log('👥 Customer display connected');
          // Mark this connection as customer display if needed
          (ws as any).isCustomerDisplay = true;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
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