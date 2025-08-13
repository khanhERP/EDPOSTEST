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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {qrPayment ? (
            // QR Payment Display
            <div className="text-center py-12">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl mx-auto">
                <div className="mb-8">
                  <div className="text-6xl mb-4">📱</div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    Quét mã QR để thanh toán
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Sử dụng ứng dụng ngân hàng để quét mã QR
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Số tiền cần thanh toán</p>
                  <p className="text-4xl font-bold text-green-600">
                    {qrPayment.amount.toLocaleString('vi-VN')} ₫
                  </p>
                </div>

                <div className="flex justify-center mb-6">
                  <div className="bg-white p-6 rounded-2xl border-4 border-green-200 shadow-xl">
                    <img
                      src={qrPayment.qrCodeUrl}
                      alt="QR Code thanh toán"
                      className="w-80 h-80"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Mã giao dịch: {qrPayment.transactionUuid}
                  </p>
                  <p className="text-base text-blue-600 font-medium">
                    Vui lòng quét mã QR để hoàn tất thanh toán
                  </p>
                </div>
              </div>
            </div>
          ) : cart.length === 0 ? (
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
                    {cart.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-l-4 border-green-400">
                        <div className="flex items-center space-x-4">
                          <div className="bg-green-100 text-green-800 font-bold text-sm px-3 py-1 rounded-full">
                            #{index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-800">
                              {item.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {parseFloat(item.price).toLocaleString('vi-VN')} ₫ × {item.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            {parseFloat(item.total).toLocaleString('vi-VN')} ₫
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
                        {subtotal.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">Thuế:</span>
                      <span className="font-medium">
                        {tax.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-4 border-t-2 border-green-200">
                      <span className="text-xl font-bold text-gray-800">
                        Tổng cộng:
                      </span>
                      <span className="text-2xl font-bold text-green-600">
                        {total.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>

                    {/* Item Count */}
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-sm text-green-700 mb-1">
                        Tổng số sản phẩm
                      </div>
                      <div className="text-2xl font-bold text-green-800">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
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
        </div>
      </div>
    </div>
  );
}