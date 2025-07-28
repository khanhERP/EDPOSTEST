
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

  const paymentMethods = [
    {
      id: "credit_card",
      name: "Thẻ tín dụng",
      icon: CreditCard,
      description: "Visa, Mastercard"
    },
    {
      id: "debit_card", 
      name: "Thẻ ghi nợ",
      icon: CreditCard,
      description: "ATM Card"
    },
    {
      id: "mobile_payment",
      name: "Ví điện tử",
      icon: Smartphone,
      description: "MoMo, ZaloPay, ViettelPay"
    },
    {
      id: "bank_transfer",
      name: "Chuyển khoản",
      icon: Wallet,
      description: "QR Banking"
    }
  ];

  const handleSelect = async (method: string) => {
    if (method === "bank_transfer") {
      // Generate QR code for bank transfer
      try {
        const qrData = `Bank Transfer Payment\nAmount: ${total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nTime: ${new Date().toLocaleString('vi-VN')}`;
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
    onSelectMethod("bank_transfer");
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
