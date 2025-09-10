import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer | null = null;
// Keep track of all connected clients
const clients = new Set<WebSocket>();

// Global state for customer display
let currentCartState = {
  cart: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  storeInfo: null,
  qrPayment: null
};

export function initializeWebSocketServer(server: Server) {
  if (wss) {
    console.log('WebSocket server already running');
    return;
  }

  try {
    wss = new WebSocketServer({
      server,
      path: '/ws',
      perMessageDeflate: false,
      maxPayload: 16 * 1024 // 16KB
    });
    console.log('✅ WebSocket server created successfully on path /ws');
  } catch (error) {
    console.error('Failed to create WebSocket server:', error);
    return;
  }

  wss.on('connection', (ws, request) => {
    console.log('📡 Client connected to WebSocket:', {
      url: request.url,
      origin: request.headers.origin,
      userAgent: request.headers['user-agent']?.substring(0, 50) + '...'
    });

    clients.add(ws);

    // Send initial ping to confirm connection
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Error sending connection confirmation:', error);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📩 Received WebSocket message:', data);

        // Handle different message types
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        } else if (data.type === 'register_order_management') {
          console.log('✅ Order Management client registered');
          (ws as any).clientType = 'order_management';
        } else if (data.type === 'register_table_grid') {
          console.log('✅ Table Grid client registered');
          (ws as any).clientType = 'table_grid';
        } else if (data.type === 'register_table_management') {
          console.log('✅ Table Management client registered');
          (ws as any).clientType = 'table_management';
        } else if (data.type === 'register_pos') {
          console.log('✅ POS client registered');
          (ws as any).clientType = 'pos';
        } else if (data.type === 'cart_update') {
          // Only broadcast if this is from POS context, not from navigation
          const fromPOS = data.fromPOS !== false; // Default to true unless explicitly set to false

          console.log('📡 WebSocket: Cart update received', {
            cartItems: data.cart?.length || 0,
            subtotal: data.subtotal,
            tax: data.tax,
            total: data.total,
            fromPOS: fromPOS,
            connectedClients: wss.clients.size
          });

          if (fromPOS) {
            console.log('📡 Broadcasting to customer displays (from POS)');

            // Ensure cart items have proper names
            const validatedCart = (data.cart || []).map(item => ({
              ...item,
              name: item.name || item.productName || item.product?.name || `Sản phẩm ${item.id || item.productId}`,
              productName: item.name || item.productName || item.product?.name || `Sản phẩm ${item.id || item.productId}`
            }));

            // Store current cart state for new customer display connections
            currentCartState = {
              cart: validatedCart,
              subtotal: data.subtotal || 0,
              tax: data.tax || 0,
              total: data.total || 0,
              timestamp: data.timestamp || new Date().toISOString()
            };

            // Log cart items for debugging
            console.log('📦 Cart items:', validatedCart.map(item => ({
              productName: item.name || 'Unknown',
              quantity: item.quantity,
              price: item.price,
              total: item.total
            })));

            // Create validated message with proper order number
            const validatedMessage = {
              ...data,
              cart: validatedCart,
              orderNumber: data.orderNumber || `ORD-${Date.now()}`
            };

            // Broadcast to all connected clients (especially customer displays)
            let broadcastCount = 0;
            wss.clients.forEach((client: WebSocket) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                try {
                  client.send(JSON.stringify(validatedMessage));
                  broadcastCount++;
                } catch (error) {
                  console.error('📡 Error broadcasting cart update:', error);
                }
              }
            });

            console.log(`✅ Cart update broadcasted to ${broadcastCount} clients`);
          } else {
            console.log('📡 Skipping broadcast (not from POS context)');
          }
        } else if (data.type === 'qr_payment') {
          // Update global QR payment state
          currentCartState.qrPayment = {
            qrCodeUrl: data.qrCodeUrl,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            transactionUuid: data.transactionUuid
          };

          console.log('📱 Broadcasting QR payment to customer displays');

          // Broadcast QR payment info to customer displays
          clients.forEach(client => {
            if (client.readyState === client.OPEN && client !== ws) {
              client.send(JSON.stringify({
                type: 'qr_payment',
                qrCodeUrl: data.qrCodeUrl,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                transactionUuid: data.transactionUuid,
                timestamp: data.timestamp || new Date().toISOString()
              }));
            }
          });
        } else if (data.type === 'customer_display_connected') {
          console.log('👥 Customer display connected - sending current state');
          // Mark this connection as customer display
          (ws as any).isCustomerDisplay = true;

          // Send current cart state to newly connected customer display
          try {
            ws.send(JSON.stringify({
              type: 'cart_update',
              cart: currentCartState.cart,
              subtotal: currentCartState.subtotal,
              tax: currentCartState.tax,
              total: currentCartState.total,
              timestamp: new Date().toISOString()
            }));

            if (currentCartState.storeInfo) {
              ws.send(JSON.stringify({
                type: 'store_info',
                storeInfo: currentCartState.storeInfo,
                timestamp: new Date().toISOString()
              }));
            }

            if (currentCartState.qrPayment) {
              ws.send(JSON.stringify({
                type: 'qr_payment',
                ...currentCartState.qrPayment,
                timestamp: new Date().toISOString()
              }));
            }

            console.log('✅ Sent current state to customer display:', {
              cartItems: currentCartState.cart.length,
              hasStoreInfo: !!currentCartState.storeInfo,
              hasQrPayment: !!currentCartState.qrPayment
            });
          } catch (error) {
            console.error('❌ Failed to send current state to customer display:', error);
          }
        } else if (data.type === 'popup_close' || data.type === 'payment_success' || data.type === 'order_status_update' || data.type === 'force_refresh' || data.type === 'einvoice_published' || data.type === 'einvoice_saved_for_later') {
          // Broadcast data refresh signals to all connected table grids and order management clients
          console.log(`📡 Broadcasting ${data.type} to all clients`);
          // Handle payment success specifically
          if (data.type === 'payment_success') {
            // Clear cart state on payment success
            currentCartState = {
              cart: [],
              subtotal: 0,
              tax: 0,
              total: 0,
              storeInfo: currentCartState.storeInfo,
              qrPayment: null
            };
            console.log('💰 Payment success - cleared cart state');
          }

          clients.forEach(client => {
            if (client.readyState === client.OPEN && client !== ws) {
              const clientType = (client as any).clientType;
              if (clientType === 'table_grid' || clientType === 'order_management' || clientType === 'table_management' || clientType === 'pos') {
                client.send(JSON.stringify({
                  type: data.type,
                  source: data.source || 'unknown',
                  reason: data.reason || 'data_refresh',
                  action: data.action || 'refresh',
                  invoiceId: data.invoiceId || null,
                  invoiceNumber: data.invoiceNumber || null,
                  success: data.success !== undefined ? data.success : true,
                  timestamp: data.timestamp || new Date().toISOString()
                }));
              }
            }
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', (code, reason) => {
      console.log('📡 Client disconnected:', {
        code,
        reason: reason.toString(),
        clientType: (ws as any).clientType || 'unknown'
      });
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', {
        error: error.message,
        clientType: (ws as any).clientType || 'unknown'
      });
      clients.delete(ws);
    });

    ws.on('pong', () => {
      console.log('🏓 Pong received from client');
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