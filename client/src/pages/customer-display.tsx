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

  console.log("Customer Display: Component rendered with cart:", cart.length, "items, storeInfo:", !!storeInfo, "qrPayment:", !!qrPayment);

  // Auto-clear QR payment after 5 minutes if not manually cleared
  useEffect(() => {
    if (qrPayment) {
      console.log("Customer Display: QR payment shown, setting 5-minute auto-clear timer");
      const timeoutId = setTimeout(() => {
        console.log("Customer Display: Auto-clearing QR payment after timeout");
        setQrPayment(null);
      }, 5 * 60 * 1000); // 5 minutes

      return () => {
        console.log("Customer Display: Clearing QR payment timeout");
        clearTimeout(timeoutId);
      };
    }
  }, [qrPayment]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const tax = cart.reduce((sum, item) => {
    if (item.taxRate && parseFloat(item.taxRate) > 0) {
      return sum + (parseFloat(item.price) * parseFloat(item.taxRate) / 100 * item.quantity);
    }
    return sum;
  }, 0);
  const total = subtotal + tax;

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log("Customer Display: Fetching initial data...");

        // Fetch store info
        const storeResponse = await fetch('/api/store-settings');
        if (storeResponse.ok) {
          const storeData = await storeResponse.json();
          console.log("Customer Display: Store info loaded:", storeData);
          setStoreInfo(storeData);
        } else {
          console.error("Customer Display: Failed to fetch store settings:", storeResponse.status);
        }

        // Try to fetch current cart state if available
        const cartResponse = await fetch('/api/current-cart');
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          console.log("Customer Display: Initial cart loaded:", cartData);
          if (cartData.cart && Array.isArray(cartData.cart)) {
            setCart(cartData.cart);
            console.log("Customer Display: Cart state updated with", cartData.cart.length, "items");
          }
          if (cartData.storeInfo) {
            setStoreInfo(cartData.storeInfo);
            console.log("Customer Display: Store info updated from cart API");
          }
        } else {
          console.error("Customer Display: Failed to fetch current cart:", cartResponse.status);
        }
      } catch (error) {
        console.error("Customer Display: Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, []);

  // WebSocket connection to receive real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Customer Display: WebSocket connected');
          ws.send(JSON.stringify({
            type: 'customer_display_connected',
            timestamp: new Date().toISOString()
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Customer Display: Received message:', data);

            if (data.type === 'cart_update') {
              console.log('Customer Display: Cart update received:', data);
              setCart(data.cart || []);
              // Clear QR payment when cart updates (unless it's from payment)
              if (!data.fromPayment) {
                setQrPayment(null);
              }
            } else if (data.type === 'qr_payment') {
              console.log('Customer Display: QR payment message received:', {
                hasQrCodeUrl: !!data.qrCodeUrl,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                transactionUuid: data.transactionUuid
              });

              if (data.qrCodeUrl && data.amount && data.transactionUuid) {
                console.log('Customer Display: Setting QR payment state');

                // Clear cart first to ensure QR payment is prioritized
                setCart([]);

                // Set QR payment state
                setQrPayment({
                  qrCodeUrl: data.qrCodeUrl,
                  amount: data.amount,
                  paymentMethod: data.paymentMethod || 'QR Code',
                  transactionUuid: data.transactionUuid
                });

                console.log('Customer Display: QR payment state set successfully');

                // Force re-render and verify state
                setTimeout(() => {
                  console.log('Customer Display: Verifying QR payment state after 100ms');
                  setQrPayment(prevQr => {
                    console.log('Customer Display: Current QR state:', !!prevQr);
                    return prevQr; // Return same state to trigger re-render
                  });
                }, 100);

                // Additional verification after 500ms
                setTimeout(() => {
                  console.log('Customer Display: Final QR payment verification after 500ms');
                }, 500);
              } else {
                console.error('Customer Display: Invalid QR payment data received', {
                  hasQrCodeUrl: !!data.qrCodeUrl,
                  hasAmount: !!data.amount,
                  hasTransactionUuid: !!data.transactionUuid
                });
              }
            } else if (data.type === 'qr_payment_cancelled') {
              console.log('Customer Display: QR payment cancelled');
              setQrPayment(null);
            } else if (data.type === 'restore_cart_display') {
              console.log('Customer Display: Restoring cart display');
              setQrPayment(null);
            }
          } catch (error) {
            console.error('Customer Display: Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('Customer Display: WebSocket disconnected, attempting reconnect...');
          setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = (error) => {
          console.error('Customer Display: WebSocket error:', error);
        };

        return ws;
      } catch (error) {
        console.error('Customer Display: Failed to connect WebSocket:', error);
        setTimeout(connectWebSocket, 2000);
        return null;
      }
    };

    const ws = connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
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