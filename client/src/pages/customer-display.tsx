
import { useState, useEffect } from "react";
import { CustomerDisplay } from "@/components/pos/customer-display";
import type { CartItem } from "@shared/schema";

export default function CustomerDisplayPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [qrPayment, setQrPayment] = useState<{
    qrCodeUrl: string;
    amount: number;
    paymentMethod: string;
    transactionUuid: string;
  } | null>(null);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const tax = cart.reduce((sum, item) => {
    if (item.taxRate && parseFloat(item.taxRate) > 0) {
      return sum + (parseFloat(item.price) * parseFloat(item.taxRate) / 100 * item.quantity);
    }
    return sum;
  }, 0);
  const total = subtotal + tax;

  // WebSocket connection to receive real-time updates
  useEffect(() => {
    console.log("Customer Display: Initializing WebSocket connection");
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;
    let isConnected = false;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Customer Display: WebSocket connected");
          isConnected = true;
          // Send identification as customer display
          ws.send(JSON.stringify({ 
            type: 'customer_display_connected',
            timestamp: new Date().toISOString()
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Customer Display: Received message:", data);

            switch (data.type) {
              case 'cart_update':
                console.log("Customer Display: Updating cart:", data.cart);
                // Use React's functional update to ensure we get the latest state
                setCart(prevCart => {
                  const newCart = data.cart || [];
                  console.log("Customer Display: Cart state update from", prevCart.length, "to", newCart.length, "items");
                  return newCart;
                });
                // Clear QR payment when cart updates (new order started)
                setQrPayment(prevQr => {
                  if (prevQr) {
                    console.log("Customer Display: Clearing QR payment due to cart update");
                    return null;
                  }
                  return prevQr;
                });
                break;
              case 'store_info':
                console.log("Customer Display: Updating store info:", data.storeInfo);
                setStoreInfo(data.storeInfo);
                break;
              case 'qr_payment':
                console.log("Customer Display: Showing QR payment:", data);
                setQrPayment({
                  qrCodeUrl: data.qrCodeUrl,
                  amount: data.amount,
                  paymentMethod: data.paymentMethod,
                  transactionUuid: data.transactionUuid
                });
                break;
              case 'payment_success':
                console.log("Customer Display: Payment completed, clearing QR");
                setQrPayment(null);
                setCart([]);
                break;
              case 'qr_payment_cancelled':
                console.log("Customer Display: QR payment cancelled, clearing QR and showing cart");
                setQrPayment(null);
                // Keep cart visible (don't clear it)
                break;
              case 'refresh_customer_display':
                console.log("Customer Display: Refresh requested, reloading page in 500ms");
                // Add a small delay to ensure all cleanup is done
                setTimeout(() => {
                  console.log("Customer Display: Executing page reload now");
                  window.location.reload();
                }, 500);
                break;
              case 'restore_cart_display':
                console.log("Customer Display: Restoring cart display, clearing QR payment");
                // Clear QR payment to show cart again
                setQrPayment(null);
                // Cart should already be available, no need to modify it
                break;
              default:
                console.log("Customer Display: Unknown message type:", data.type);
            }
          } catch (error) {
            console.error("Customer Display: Error parsing message:", error);
          }
        };

        ws.onclose = (event) => {
          console.log("Customer Display: WebSocket closed:", event.code, event.reason);
          isConnected = false;
          // Only reconnect if not manually closed
          if (event.code !== 1000) {
            reconnectTimer = setTimeout(() => {
              console.log("Customer Display: Attempting to reconnect...");
              connectWebSocket();
            }, 1000); // Reduced reconnect delay
          }
        };

        ws.onerror = (error) => {
          console.error("Customer Display: WebSocket error:", error);
          isConnected = false;
        };
      } catch (error) {
        console.error("Customer Display: Failed to create WebSocket:", error);
        // Retry after 1 second
        reconnectTimer = setTimeout(connectWebSocket, 1000);
      }
    };

    connectWebSocket();

    // Fetch initial store info
    fetch('/api/store-settings')
      .then(res => res.json())
      .then(data => setStoreInfo(data))
      .catch(err => console.error('Failed to fetch store info:', err));

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws && isConnected) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, []);

  return (
    <CustomerDisplay
      cart={cart}
      subtotal={subtotal}
      tax={tax}
      total={total}
      storeInfo={storeInfo}
      qrPayment={qrPayment}
    />
  );
}
