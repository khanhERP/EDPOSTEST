
import { useState } from "react";
import { CreditCard, Banknote, Smartphone, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

  const handleSelect = (method: string) => {
    onSelectMethod(method);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn phương thức thanh toán</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 p-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
