import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import logoPath from "@assets/EDPOS_1753091767028.png";
import type { CartItem } from "@shared/schema";

interface CustomerDisplayProps {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  storeInfo?: {
    name: string;
    address?: string;
  };
  qrPayment?: {
    qrCodeUrl: string;
    amount: number;
    paymentMethod: string;
    transactionUuid: string;
  } | null;
}

export function CustomerDisplay({
  cart,
  subtotal,
  tax,
  total,
  storeInfo,
  qrPayment
}: CustomerDisplayProps) {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [cartItems, setCartItems] = useState<CartItem[]>(cart);
  const [currentSubtotal, setCurrentSubtotal] = useState(subtotal);
  const [currentTax, setCurrentTax] = useState(tax);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');
  // State to hold the QR payment details, initially null or undefined
  const [qrPaymentState, setQrPayment] = useState<CustomerDisplayProps['qrPayment'] | null | undefined>(qrPayment);


  // Calculate correct subtotal from cart items (pre-tax price * quantity)
  const calculateCorrectSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      // Use the base price (before tax) for subtotal calculation
      const basePrice = parseFloat(item.price || '0');
      const quantity = item.quantity || 0;
      return sum + (basePrice * quantity);
    }, 0);
  };

  // Calculate correct tax from cart items  
  const calculateCorrectTax = () => {
    return cartItems.reduce((sum, item) => {
      const basePrice = parseFloat(item.price || '0');
      const quantity = item.quantity || 0;
      const afterTaxPrice = item.afterTaxPrice ? parseFloat(item.afterTaxPrice) : null;

      if (afterTaxPrice && afterTaxPrice > basePrice) {
        const taxPerUnit = afterTaxPrice - basePrice;
        return sum + (taxPerUnit * quantity);
      }
      return sum;
    }, 0);
  };

  // Get the correct pre-tax subtotal and tax
  const correctSubtotal = calculateCorrectSubtotal();
  const correctTax = calculateCorrectTax();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Update local state if props change
    setCartItems(cart);
    setCurrentSubtotal(subtotal);
    setCurrentTax(tax);
    setCurrentTotal(total);
    // Also update qrPaymentState if qrPayment prop changes
    console.log("🔄 Customer Display: Props changed, updating QR payment state:", {
      qrPayment,
      hasQrCodeUrl: !!qrPayment?.qrCodeUrl,
      amount: qrPayment?.amount
    });
    setQrPayment(qrPayment);
  }, [cart, subtotal, tax, total, qrPayment]);

  // Debug log whenever qrPaymentState changes
  useEffect(() => {
    console.log("🎯 Customer Display: QR Payment State Changed:", {
      qrPaymentState,
      hasQrCodeUrl: !!qrPaymentState?.qrCodeUrl,
      amount: qrPaymentState?.amount,
      paymentMethod: qrPaymentState?.paymentMethod,
      shouldShowQR: !!(qrPaymentState?.qrCodeUrl),
      cartLength: cartItems.length,
      timestamp: new Date().toISOString()
    });
    
    // Force a re-render check
    if (qrPaymentState?.qrCodeUrl) {
      console.log("🔥 Customer Display: QR Code URL is available, should display QR payment UI");
    } else {
      console.log("❌ Customer Display: No QR Code URL available");
    }
  }, [qrPaymentState, cartItems.length]);


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to format currency, ensuring it handles potential NaN or undefined values
  const formatCurrency = (amount: number | string | undefined | null): string => {
    const num = parseFloat(amount as string);
    if (isNaN(num)) {
      return '0 ₫'; // Default to '0 ₫' if parsing fails
    }
    return num.toLocaleString('vi-VN') + ' ₫';
  };

  // WebSocket connection setup
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log('Customer Display: Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Customer Display: Connected to WebSocket server');
      // Send registration message to identify as customer display
      try {
        const registrationMessage = {
          type: 'customer_display_connected',
          clientType: 'customer_display',
          timestamp: new Date().toISOString()
        };
        console.log('📤 Customer Display: Sending registration message:', registrationMessage);
        ws.send(JSON.stringify(registrationMessage));
        console.log('✅ Customer Display: Registration message sent successfully');
        
        // Send a ping to ensure connection is stable
        setTimeout(() => {
          try {
            ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
            console.log('🏓 Customer Display: Ping sent to verify connection');
          } catch (error) {
            console.error('❌ Customer Display: Failed to send ping:', error);
          }
        }, 500);
      } catch (error) {
        console.error('❌ Customer Display: Failed to send registration message:', error);
      }
    };

    ws.onclose = () => {
      console.log('❌ Customer Display: Disconnected from WebSocket server');
      // Optional: Implement reconnection logic here
    };

    ws.onerror = (error) => {
      console.error('💥 Customer Display: WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 Customer Display: Received WebSocket message:', {
          type: data.type,
          hasQrCodeUrl: !!data.qrCodeUrl,
          timestamp: data.timestamp,
          rawData: data
        });

        switch (data.type) {
          case 'connection_established':
            console.log('✅ Customer Display: Connection confirmed');
            break;
            
          case 'cart_update':
            console.log('📦 Customer Display: Processing cart update');
            setCartItems(data.cart || []);

            // Always use calculated values to ensure accuracy
            const calculatedSubtotal = calculateCorrectSubtotal();
            const calculatedTax = calculateCorrectTax();
            const calculatedTotal = calculatedSubtotal + calculatedTax;

            // Use calculated values instead of potentially incorrect WebSocket data
            setCurrentSubtotal(calculatedSubtotal);
            setCurrentTax(calculatedTax); 
            setCurrentTotal(calculatedTotal);
            // Update order number if available in cart update
            if (data.orderNumber) {
              setOrderNumber(data.orderNumber);
            }
            console.log('📦 Customer Display: Received order number:', data.orderNumber);
            console.log('💰 Customer Display: Received correct subtotal (pre-tax):', data.subtotal);
            break;
            
          case 'order_created':
            console.log('🆕 Customer Display: New order created:', data.order);
            setCurrentOrder(data.order);
            if (data.order?.orderNumber) {
              setOrderNumber(data.order.orderNumber);
            }
            // Clear cart when new order is created
            if (data.clearCart) {
              setCartItems([]);
              setCurrentSubtotal(0);
              setCurrentTax(0);
              setCurrentTotal(0);
            }
            break;
            
          case 'payment_completed':
          case 'payment_success':
            console.log('💳 Customer Display: Payment completed for order:', data.orderId);
            // Clear display after payment
            setTimeout(() => {
              setCartItems([]);
              setCurrentSubtotal(0);
              setCurrentTax(0);
              setCurrentTotal(0);
              setCurrentOrder(null);
              setOrderNumber('');
              setQrPayment(null); // Clear QR payment state as well
            }, 3000); // Show success for 3 seconds before clearing
            break;
            
          case 'qr_payment':
            console.log("🔥🔥🔥 Customer Display: QR PAYMENT MESSAGE RECEIVED!", {
              hasQrCodeUrl: !!data.qrCodeUrl,
              amount: data.amount,
              paymentMethod: data.paymentMethod,
              transactionUuid: data.transactionUuid,
              qrCodeUrlLength: data.qrCodeUrl?.length || 0,
              qrCodeStart: data.qrCodeUrl ? data.qrCodeUrl.substring(0, 50) + '...' : 'null',
              currentCartLength: cartItems.length,
              currentQrState: qrPaymentState,
              timestamp: new Date().toISOString()
            });

            // Validate QR data first
            if (data.qrCodeUrl && data.amount) {
              console.log("🎯 Customer Display: Valid QR data received, setting payment state");
              
              const qrPaymentData = {
                qrCodeUrl: data.qrCodeUrl,
                amount: Number(data.amount) || 0,
                paymentMethod: data.paymentMethod || 'QR Code',
                transactionUuid: data.transactionUuid || `QR-${Date.now()}`
              };
              
              console.log("🔄 Customer Display: About to clear cart and set QR payment:", qrPaymentData);
              
              // Clear cart and set QR payment state
              setCartItems([]);
              setCurrentSubtotal(0);
              setCurrentTax(0);
              setCurrentTotal(0);
              
              // Set QR payment state immediately with force update
              setQrPayment(qrPaymentData);
              
              console.log("✅ Customer Display: QR payment state set successfully:", {
                hasQrCodeUrl: !!qrPaymentData.qrCodeUrl,
                amount: qrPaymentData.amount,
                qrCodeStart: qrPaymentData.qrCodeUrl.substring(0, 50) + '...'
              });
              
              // Multiple verification attempts
              setTimeout(() => {
                console.log("🔍 Customer Display: First verification after 100ms:", {
                  qrPaymentStateExists: !!qrPaymentState,
                  hasQrCodeUrl: !!qrPaymentState?.qrCodeUrl,
                  shouldShowQr: !!(qrPaymentState?.qrCodeUrl),
                  currentCartLength: cartItems.length
                });
              }, 100);
              
              setTimeout(() => {
                console.log("🔍 Customer Display: Second verification after 500ms:", {
                  qrPaymentStateExists: !!qrPaymentState,
                  hasQrCodeUrl: !!qrPaymentState?.qrCodeUrl,
                  shouldShowQr: !!(qrPaymentState?.qrCodeUrl),
                  currentCartLength: cartItems.length
                });
                
                // Force re-render if still not showing
                if (!qrPaymentState?.qrCodeUrl) {
                  console.log("🚨 Customer Display: QR state not set, forcing update again");
                  setQrPayment(qrPaymentData);
                }
              }, 500);
              
            } else {
              console.error("❌ Customer Display: Invalid QR payment data received", {
                hasQrCodeUrl: !!data.qrCodeUrl,
                hasAmount: !!data.amount,
                data: data
              });
            }
            break;
            
          case 'qr_payment_cancelled':
            console.log("🚫 Customer Display: QR payment cancelled, clearing QR state");
            setQrPayment(null);
            break;
            
          case 'restore_cart_display':
            console.log("🔄 Customer Display: Restoring cart display, clearing QR payment");
            setQrPayment(null);
            break;
            
          default:
            console.log("❓ Customer Display: Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("💥 Customer Display: Error parsing WebSocket message:", error);
      }
    };

    return () => {
      console.log('🔌 Customer Display: Closing WebSocket connection');
      ws.close();
    };
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-green-500 p-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <img src={logoPath} alt="Logo" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {storeInfo?.name || "IDMC Store"}
              </h1>
              <p className="text-sm text-gray-600">
                {storeInfo?.address || "Chào mừng quý khách"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-800">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-gray-600">
              {formatDate(currentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="max-w-6xl mx-auto flex-1 flex flex-col">
          {qrPaymentState?.qrCodeUrl ? (
            // QR Payment Display - Optimized for no scrolling
            <div className="flex flex-col items-center justify-center h-full py-4">
              {console.log("🔍 Rendering QR Payment Display:", {
                qrPaymentState,
                hasQrCodeUrl: !!qrPaymentState.qrCodeUrl,
                amount: qrPaymentState.amount,
                paymentMethod: qrPaymentState.paymentMethod,
                timestamp: new Date().toISOString()
              })}
              <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg mx-auto w-full max-h-[calc(100vh-200px)] flex flex-col">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">📱</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Quét mã QR để thanh toán
                  </h2>
                  <p className="text-base text-gray-600">
                    Sử dụng ứng dụng ngân hàng để quét mã QR
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Số tiền cần thanh toán</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Number(qrPaymentState.amount || 0).toLocaleString('vi-VN')} ₫
                  </p>
                </div>

                <div className="flex justify-center mb-4 flex-1 flex items-center">
                  <div className="bg-white p-4 rounded-2xl border-4 border-green-200 shadow-xl">
                    {qrPaymentState.qrCodeUrl ? (
                      <img
                        src={qrPaymentState.qrCodeUrl}
                        alt="QR Code thanh toán"
                        className="w-56 h-56 max-w-full max-h-full object-contain"
                        onError={(e) => {
                          console.error("QR Code image failed to load:", qrPaymentState.qrCodeUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log("✅ QR Code image loaded successfully");
                        }}
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <div className="text-4xl mb-2">⏳</div>
                          <p className="text-sm">Đang tạo mã QR...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    Mã giao dịch: {qrPaymentState.transactionUuid}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">
                    Vui lòng quét mã QR để hoàn tất thanh toán
                  </p>
                </div>
              </div>
            </div>
          ) : cartItems.length === 0 ? (
            // Empty Cart Display
            <div className="text-center py-20">
              <div className="mb-8">
                <div className="text-8xl mb-4">🛒</div>
                <h2 className="text-4xl font-bold text-gray-700 mb-4">
                  Chào mừng quý khách!
                </h2>
                <p className="text-xl text-gray-500">
                  Vui lòng chờ thu ngân xử lý đơn hàng của bạn
                </p>
              </div>
            </div>
          ) : (
            // Cart Display
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Items List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <span className="bg-green-100 p-2 rounded-lg mr-3">🛍️</span>
                    Đơn hàng của bạn
                  </h2>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {cartItems.map((item, index) => (
                      <div key={`${item.id}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-l-4 border-green-400">
                        <div className="flex items-center space-x-4">
                          <div className="bg-green-100 text-green-800 rounded-full min-w-[32px] h-8 flex items-center justify-center text-xs font-medium px-2">
                            {orderNumber || currentOrder?.orderNumber || `#${index + 1}`}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-800">
                              {item.name || item.productName || item.product?.name || (orderNumber ? `${orderNumber}` : `Sản phẩm ${item.id || item.productId}`)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(item.price)} × {item.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <span className="bg-blue-100 p-2 rounded-lg mr-3">📋</span>
                    Tổng thanh toán
                  </h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">Tạm tính:</span>
                      <span className="font-medium">
                        {formatCurrency(correctSubtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">Thuế:</span>
                      <span className="font-medium">
                        {formatCurrency(correctTax)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-4 border-t-2 border-green-200">
                      <span className="text-xl font-bold text-gray-800">
                        Tổng cộng:
                      </span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(correctSubtotal + correctTax)}
                      </span>
                    </div>

                    {/* Item Count */}
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-sm text-green-700 mb-1">
                        Tổng số sản phẩm
                      </div>
                      <div className="text-2xl font-bold text-green-800">
                        {cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            Cảm ơn bạn đã mua sắm tại {storeInfo?.name || "IDMC Store"}
          </p>
          {/* Hidden refresh button - double click to refresh */}
          <button
            onClick={() => window.location.reload()}
            onDoubleClick={() => window.location.reload()}
            className="invisible hover:visible absolute bottom-2 right-2 text-xs text-gray-300 hover:text-gray-600 bg-transparent border-none cursor-pointer"
            title="Double click to refresh display"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  );
}