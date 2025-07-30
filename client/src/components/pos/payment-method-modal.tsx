import { useState, useEffect } from "react";
import { CreditCard, Banknote, Smartphone, Wallet, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCodeLib from "qrcode";
import { createQRPosAsync, type CreateQRPosRequest } from "@/lib/api";

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: string) => void;
  total: number;
}

export function PaymentMethodModal({ 
  isOpen, 
  onClose, 
  onSelectMethod,
  total 
}: PaymentMethodModalProps) {
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Load payment methods from settings
  const getPaymentMethods = () => {
    const savedPaymentMethods = localStorage.getItem('paymentMethods');
    
    const defaultPaymentMethods = [
      { id: 1, name: "Tiền mặt", nameKey: "cash", type: "cash", enabled: true, icon: "💵" },
      { id: 2, name: "Thẻ tín dụng", nameKey: "creditCard", type: "card", enabled: true, icon: "💳" },
      { id: 3, name: "Thẻ ghi nợ", nameKey: "debitCard", type: "debit", enabled: true, icon: "💳" },
      { id: 4, name: "MoMo", nameKey: "momo", type: "digital", enabled: true, icon: "📱" },
      { id: 5, name: "ZaloPay", nameKey: "zalopay", type: "digital", enabled: true, icon: "📱" },
      { id: 6, name: "VNPay", nameKey: "vnpay", type: "digital", enabled: true, icon: "💳" },
      { id: 7, name: "QR Code", nameKey: "qrCode", type: "qr", enabled: true, icon: "📱" },
      { id: 8, name: "ShopeePay", nameKey: "shopeepay", type: "digital", enabled: false, icon: "🛒" },
      { id: 9, name: "GrabPay", nameKey: "grabpay", type: "digital", enabled: false, icon: "🚗" },
    ];

    const paymentMethods = savedPaymentMethods 
      ? JSON.parse(savedPaymentMethods) 
      : defaultPaymentMethods;

    // Filter to only return enabled payment methods and map to modal format
    return paymentMethods
      .filter(method => method.enabled)
      .map(method => ({
        id: method.nameKey,
        name: method.name,
        icon: getIconComponent(method.type),
        description: getMethodDescription(method.nameKey)
      }));
  };

  const getIconComponent = (type: string) => {
    switch (type) {
      case 'cash': return Banknote;
      case 'card':
      case 'debit': 
      case 'digital': return CreditCard;
      case 'qr': return QrCode;
      default: return Wallet;
    }
  };

  const getMethodDescription = (nameKey: string) => {
    const descriptions = {
      cash: "Tiền mặt",
      creditCard: "Visa, Mastercard",
      debitCard: "ATM Card", 
      momo: "Ví điện tử MoMo",
      zalopay: "Ví điện tử ZaloPay",
      vnpay: "Ví điện tử VNPay",
      qrCode: "QR Banking",
      shopeepay: "Ví điện tử ShopeePay",
      grabpay: "Ví điện tử GrabPay"
    };
    return descriptions[nameKey as keyof typeof descriptions] || "Phương thức thanh toán";
  };

  const paymentMethods = getPaymentMethods();

  const handleSelect = async (method: string) => {
    if (method === "qrCode") {
      // Call CreateQRPos API for QR payment
      try {
        const transactionUuid = `TXN-${Date.now()}`;
        const depositAmt = total;
        
        const qrRequest: CreateQRPosRequest = {
          transactionUuid,
          depositAmt: depositAmt.toString(),
          posUniqueId: "POS003",
          accntNo: "700033348984",
          posfranchiseeName: "DOOKI-HANOI",
          posCompanyName: "HYOJUNG",
          posBillNo: `BILL-${Date.now()}`
        };

        const bankCode = "79616001";
        const clientID = "91a3a3668724e631e1baf4f8526524f3";

        console.log('Calling CreateQRPos API with:', { qrRequest, bankCode, clientID });

        const qrResponse = await createQRPosAsync(qrRequest, bankCode, clientID);
        
        console.log('CreateQRPos API response:', qrResponse);

        // Generate QR code from the received QR data
        if (qrResponse.qrDataDecode) {
          const qrUrl = await QRCodeLib.toDataURL(qrResponse.qrDataDecode, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);
        } else {
          console.error('No QR data received from API');
          // Fallback to mock QR code
          const fallbackData = `Payment via QR\nAmount: ${total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nTime: ${new Date().toLocaleString('vi-VN')}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);
        }
      } catch (error) {
        console.error('Error calling CreateQRPos API:', error);
        // Fallback to mock QR code on error
        try {
          const fallbackData = `Payment via QR\nAmount: ${total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nTime: ${new Date().toLocaleString('vi-VN')}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);
        } catch (fallbackError) {
          console.error('Error generating fallback QR code:', fallbackError);
        }
      }
    } else if (method === "vnpay") {
      // Generate QR code for VNPay
      try {
        const qrData = `Payment via ${method}\nAmount: ${total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nTime: ${new Date().toLocaleString('vi-VN')}`;
        const qrUrl = await QRCodeLib.toDataURL(qrData, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrUrl);
        setShowQRCode(true);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    } else {
      onSelectMethod(method);
      onClose();
    }
  };

  const handleQRComplete = () => {
    onSelectMethod("qrCode");
    setShowQRCode(false);
    setQrCodeUrl("");
    onClose();
  };

  const handleBack = () => {
    setShowQRCode(false);
    setQrCodeUrl("");
  };

  // Reset QR state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowQRCode(false);
      setQrCodeUrl("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn phương thức thanh toán</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 p-4">
          {!showQRCode ? (
            <>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Tổng tiền</p>
                <p className="text-2xl font-bold text-blue-600">
                  {total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫
                </p>
              </div>

              <div className="grid gap-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <Button
                      key={method.id}
                      variant="outline"
                      className="flex items-center justify-start p-4 h-auto"
                      onClick={() => handleSelect(method.id)}
                    >
                      <IconComponent className="mr-3" size={24} />
                      <div className="text-left">
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-gray-500">{method.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>

              <Button variant="outline" onClick={onClose} className="w-full">
                Hủy
              </Button>
            </>
          ) : (
            <>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <QrCode className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">Quét mã QR để thanh toán</h3>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Số tiền cần thanh toán</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫
                  </p>
                </div>

                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-lg">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code for Bank Transfer" 
                        className="w-64 h-64"
                      />
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-gray-600">
                  Sử dụng ứng dụng ngân hàng để quét mã QR và thực hiện thanh toán
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Quay lại
                </Button>
                <Button 
                  onClick={handleQRComplete} 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
                >
                  Hoàn thành
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}