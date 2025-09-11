
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
          try {
            ws.send(JSON.stringify({ 
              type: 'customer_display_connected',
              timestamp: new Date().toISOString()
            }));
            console.log("Customer Display: Identification message sent");
          } catch (error) {
            console.error("Customer Display: Failed to send identification:", error);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Customer Display: Received WebSocket message:", {
              type: data.type,
              hasCart: !!data.cart,
              cartItems: data.cart?.length || 0,
              subtotal: data.subtotal,
              total: data.total,
              timestamp: data.timestamp
            });

            switch (data.type) {
              case 'cart_update':
                console.log("Customer Display: Processing cart update - Items:", data.cart?.length || 0, "Force update:", data.forceUpdate, "Attempt:", data.attempt);

                // CRITICAL: Force immediate state update with enhanced validation
                const newCart = Array.isArray(data.cart) ? [...data.cart] : [];
                
                // IMMEDIATE: Set cart state with force update flag
                setCart(prevCart => {
                  console.log("Customer Display: FORCE Cart state changing from", prevCart.length, "to", newCart.length, "items");
                  
                  // Special handling for empty cart - ensure complete reset
                  if (newCart.length === 0) {
                    console.log("Customer Display: 🧹 FORCE CLEARING - Cart is now empty");
                    return [];
                  }
                  
                  // Log cart details for debugging
                  console.log("Customer Display: New cart contents:", newCart.map(item => ({
                    id: item.id,
                    name: item.product?.name || item.name || 'Unknown',
                    quantity: item.quantity,
                    price: item.price
                  })));

                  // Return completely new array reference to force re-render
                  return newCart.map(item => ({ ...item }));
                });

                // IMMEDIATE: Clear QR payment for empty cart
                if (newCart.length === 0) {
                  console.log("Customer Display: 🧹 FORCE CLEARING QR payment");
                  setQrPayment(null);
                }

                // CRITICAL: Multiple forced re-renders to ensure UI updates
                [10, 50, 100, 200].forEach((delay, index) => {
                  setTimeout(() => {
                    console.log(`Customer Display: Force refresh ${index + 1} after ${delay}ms`);
                    // Force a state update to trigger re-render
                    setCart(current => {
                      if (current.length === newCart.length) {
                        return [...newCart.map(item => ({ ...item }))];
                      }
                      return current;
                    });
                  }, delay);
                });
                break;
              case 'store_info':
                console.log("Customer Display: Updating store info:", data.storeInfo);
                setStoreInfo(data.storeInfo);
                break;
              case 'qr_payment':
                console.log("Customer Display: Received QR payment message:", {
                  hasQrCodeUrl: !!data.qrCodeUrl,
                  amount: data.amount,
                  paymentMethod: data.paymentMethod,
                  transactionUuid: data.transactionUuid,
                  qrCodeUrlLength: data.qrCodeUrl?.length || 0
                });
                if (data.qrCodeUrl && data.amount) {
                  console.log("Customer Display: Setting QR payment state");
                  setQrPayment({
                    qrCodeUrl: data.qrCodeUrl,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                    transactionUuid: data.transactionUuid
                  });
                  console.log("Customer Display: QR payment state set successfully");
                } else {
                  console.error("Customer Display: Invalid QR payment data received", data);
                }
                break;
              case 'payment_success':
                console.log("Customer Display: Payment completed, clearing QR");
                setQrPayment(null);
                setCart([]);
                break;
              case 'qr_payment_cancelled':
                console.log("Customer Display: QR payment cancelled, clearing QR and restoring cart");
                setQrPayment(prevQr => {
                  if (prevQr) {
                    console.log("Customer Display: Clearing QR payment state");
                    return null;
                  }
                  return prevQr;
                });
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
                // Force clear QR payment to show cart again
                setQrPayment(null);
                console.log("Customer Display: QR payment force cleared to restore cart view");
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

    return () => {
      console.log("Customer Display: Cleaning up WebSocket connection");
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws) {
        try {
          if (isConnected) {
            ws.close(1000, 'Component unmounting');
          }
        } catch (error) {
          console.error("Customer Display: Error closing WebSocket:", error);
        }
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
