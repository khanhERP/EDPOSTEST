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
  }, [cart, subtotal, tax, total]);


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
    const ws = new WebSocket('ws://localhost:3001'); // Assuming your WebSocket server runs on port 3001

    ws.onopen = () => {
      console.log('✅ Customer Display: Connected to WebSocket server');
    };

    ws.onclose = () => {
      console.log('❌ Customer Display: Disconnected from WebSocket server');
      // Optional: Implement reconnection logic here
    };

    ws.onerror = (error) => {
      console.error('💥 Customer Display: WebSocket error:', error);
    };

    ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('📩 Customer Display: Received WebSocket message:', data);

          if (data.type === 'cart_update') {
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
          } else if (data.type === 'order_created') {
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
          } else if (data.type === 'payment_completed') {
            console.log('💳 Customer Display: Payment completed for order:', data.orderId);
            // Clear display after payment
            setTimeout(() => {
              setCartItems([]);
              setCurrentSubtotal(0);
              setCurrentTax(0);
              setCurrentTotal(0);
              setCurrentOrder(null);
              setOrderNumber('');
            }, 3000); // Show success for 3 seconds before clearing
          }
        };

    return () => {
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
          {qrPayment ? (
            // QR Payment Display - Optimized for no scrolling
            <div className="flex flex-col items-center justify-center h-full py-4">
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
                    {qrPayment.amount.toLocaleString('vi-VN')} ₫
                  </p>
                </div>

                <div className="flex justify-center mb-4 flex-1 flex items-center">
                  <div className="bg-white p-4 rounded-2xl border-4 border-green-200 shadow-xl">
                    <img
                      src={qrPayment.qrCodeUrl}
                      alt="QR Code thanh toán"
                      className="w-56 h-56 max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    Mã giao dịch: {qrPayment.transactionUuid}
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