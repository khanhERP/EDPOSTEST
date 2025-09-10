import React, { useState, useEffect } from "react";
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

  // Debug state changes
  useEffect(() => {
    console.log('🔄 Customer Display: QR Payment state changed:', {
      hasQrPayment: !!qrPayment,
      qrPaymentData: qrPayment,
      timestamp: new Date().toISOString()
    });
  }, [qrPayment]);

  useEffect(() => {
    console.log('🔄 Customer Display: Cart state changed:', {
      cartLength: cart.length,
      cartItems: cart,
      timestamp: new Date().toISOString()
    });
  }, [cart]);

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
          // Register as customer display
          ws.send(JSON.stringify({
            type: 'register_customer_display',
            timestamp: new Date().toISOString()
          }));
          // Also send the legacy message for backward compatibility
          ws.send(JSON.stringify({
            type: 'customer_display_connected',
            timestamp: new Date().toISOString()
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('🔄 Customer Display: Received WebSocket message:', {
              type: data.type,
              timestamp: data.timestamp,
              hasQrCodeUrl: data.type === 'qr_payment' ? !!data.qrCodeUrl : undefined,
              amount: data.type === 'qr_payment' ? data.amount : undefined,
              messageSize: event.data.length
            });

            if (data.type === 'cart_update') {
              console.log('Customer Display: Cart update received:', data);
              setCart(data.cart || []);
              // Clear QR payment when cart updates (unless it's from payment)
              if (!data.fromPayment) {
                setQrPayment(null);
              }
            } else if (data.type === 'qr_payment' || data.type === 'qr_payment_created') {
              console.log('✅ Customer Display: Received QR payment message:', data);

              // Validate QR payment data more strictly
              if (data.qrCodeUrl && data.amount && data.transactionUuid) {
                console.log('✅ Customer Display: Valid QR payment data - setting state');

                const qrPaymentData = {
                  qrCodeUrl: data.qrCodeUrl,
                  amount: Number(data.amount),
                  paymentMethod: data.paymentMethod || 'QR Code',
                  transactionUuid: data.transactionUuid
                };

                console.log('💾 Customer Display: Setting QR payment state with data:', qrPaymentData);

                // Clear cart first
                setCart([]);

                // Set QR payment data with forced update
                setQrPayment(qrPaymentData);

                console.log('✅ Customer Display: QR payment state set successfully');

                // Multiple attempts to ensure state updates
                setTimeout(() => {
                  console.log('🔍 Customer Display: First force re-render');
                  setQrPayment(prev => prev ? {...prev} : qrPaymentData);
                }, 100);

                setTimeout(() => {
                  console.log('🔍 Customer Display: Second force re-render');
                  setQrPayment(prev => prev ? {...prev} : qrPaymentData);
                }, 200);

                // Also trigger a window focus event to ensure component updates
                setTimeout(() => {
                  window.dispatchEvent(new Event('focus'));
                }, 300);
              } else {
                console.error('❌ Customer Display: Invalid QR payment data received', {
                  hasQrCodeUrl: !!data.qrCodeUrl,
                  qrCodeUrlValue: data.qrCodeUrl,
                  hasAmount: !!data.amount,
                  amountValue: data.amount,
                  hasTransactionUuid: !!data.transactionUuid,
                  transactionUuidValue: data.transactionUuid,
                  fullData: data
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