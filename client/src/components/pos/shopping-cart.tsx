import { useState } from "react";
import { ShoppingCart as CartIcon, Minus, Plus, Trash2, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { PaymentMethodModal } from "./payment-method-modal";
import { ReceiptModal } from "./receipt-modal";
import type { CartItem } from "@shared/schema";

interface ShoppingCartProps {
  cart: CartItem[];
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemoveItem: (id: number) => void;
  onClearCart: () => void;
  onCheckout: (paymentData: any) => void;
  isProcessing: boolean;
}

export function ShoppingCart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isProcessing
}: ShoppingCartProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedCardMethod, setSelectedCardMethod] = useState<string>("");
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const { t } = useTranslation();

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const taxRate = 0.0825; // 8.25%
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const change = paymentMethod === "cash" ? Math.max(0, parseFloat(amountReceived || "0") - total) : 0;

  const getPaymentMethods = () => {
    // Only return cash and bank transfer payment methods
    const paymentMethods = [
      { id: 1, name: "Tiền mặt", nameKey: "cash", type: "cash", enabled: true, icon: "💵" },
      { id: 2, name: "Chuyển khoản", nameKey: "bankTransfer", type: "transfer", enabled: true, icon: "🏦" },
    ];

    return paymentMethods;
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    if (paymentMethod === "cash") {
      const receivedAmount = parseFloat(amountReceived || "0");
      if (receivedAmount < total) {
        alert(`Số tiền nhận được không đủ. Cần: ${total.toLocaleString()} ₫`);
        return;
      }
      // Proceed with cash payment
      const paymentData = {
        paymentMethod: "cash",
        amountReceived: parseFloat(amountReceived || "0"),
        change: change,
      };
      onCheckout(paymentData);
    } else {
      // Show receipt preview first for non-cash payments
      const receipt = {
        transactionId: `TXN-${Date.now()}`,
        items: cart.map(item => ({
          id: item.id,
          productName: item.name,
          price: parseFloat(item.price).toFixed(2),
          quantity: item.quantity,
          total: parseFloat(item.total).toFixed(2)
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: paymentMethod,
        amountReceived: total.toFixed(2),
        change: "0.00",
        cashierName: "John Smith",
        createdAt: new Date().toISOString()
      };
      setPreviewReceipt(receipt);
      setShowReceiptPreview(true);
    }
  };

  const handleReceiptConfirm = () => {
    setShowReceiptPreview(false);
    setShowPaymentMethodModal(true);
  };

  const handleCardPaymentMethodSelect = (method: string) => {
    setSelectedCardMethod(method);
    const paymentData = {
      paymentMethod: method,
      cardType: method,
      amountReceived: total,
      change: 0,
    };
    onCheckout(paymentData);
  };

  const canCheckout = cart.length > 0 && 
    (paymentMethod !== "cash" || (paymentMethod === "cash" && parseFloat(amountReceived || "0") >= total));

  return (
    <aside className="w-96 bg-white shadow-material border-l pos-border flex flex-col">
      <div className="p-4 border-b pos-border">
        <h2 className="text-xl pos-text-primary font-semibold pt-[0px] pb-[0px] mt-[10px] mb-[10px]">{t('pos.purchaseHistory')}</h2>
        <div className="flex items-center justify-between text-sm pos-text-secondary">
          <span>{cart.length} {t('common.items')}</span>
          {cart.length > 0 && (
            <button 
              onClick={onClearCart}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              {t('pos.clearCart')}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <CartIcon className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium pos-text-secondary mb-2">{t('pos.emptyCart')}</h3>
            <p className="pos-text-tertiary">{t('pos.addProductsToStart')}</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-medium pos-text-primary text-sm truncate">{item.name}</h4>
                  <p className="text-xs pos-text-secondary">{parseFloat(item.price).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫ each</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 p-0"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={10} />
                    </Button>
                    <span className="w-6 text-center font-medium text-xs">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 p-0"
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus size={10} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemoveItem(item.id)}
                      className="w-6 h-6 p-0 text-red-500 hover:text-red-700 border-red-300 hover:border-red-500"
                    >
                      <Trash2 size={10} />
                    </Button>
                  </div>
                  <div className="font-bold pos-text-primary text-sm">{parseFloat(item.total).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="border-t pos-border p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="pos-text-secondary">{t('tables.subtotal')}:</span>
              <span className="font-medium">{subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="pos-text-secondary">{t('tables.tax')} (8.25%):</span>
              <span className="font-medium">{tax.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold pos-text-primary">{t('tables.total')}:</span>
                <span className="text-lg font-bold text-blue-600">{total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫</span>
              </div>
            </div>
          </div>
          
          {/* Payment Methods */}
          <div className="space-y-2">
            <Label className="text-sm font-medium pos-text-primary">{t('tables.paymentMethod')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {getPaymentMethods().slice(0, 4).map((method) => (
                <Button
                  key={method.id}
                  variant={paymentMethod === method.nameKey ? "default" : "outline"}
                  onClick={() => setPaymentMethod(method.nameKey)}
                  className="text-sm flex items-center justify-center"
                >
                  <span className="mr-1">{method.icon}</span>
                  {method.name}
                </Button>
              ))}
            </div>
            {getPaymentMethods().length > 4 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaymentMethodModal(true)}
                className="w-full mt-2"
              >
                Xem thêm phương thức thanh toán
              </Button>
            )}
          </div>
          
          {/* Cash Payment */}
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium pos-text-primary">{t('tables.amountReceived')}</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
              <div className="flex justify-between text-sm">
                <span className="pos-text-secondary">{t('tables.change')}:</span>
                <span className="font-bold text-green-600">{change.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫</span>
              </div>
            </div>
          )}
          
          <Button
            onClick={handleCheckout}
            disabled={!canCheckout || isProcessing}
            className="w-full btn-success flex items-center justify-center"
          >
            <CartIcon className="mr-2" size={16} />
            {isProcessing ? "Processing..." : t('tables.completeSale')}
          </Button>
        </div>
      )}

      {/* Receipt Preview Modal for Card Payments */}
      <ReceiptModal
        isOpen={showReceiptPreview}
        onClose={() => setShowReceiptPreview(false)}
        receipt={previewReceipt}
        onConfirm={handleReceiptConfirm}
        isPreview={true}
      />

      {/* Payment Method Selection Modal */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => setShowPaymentMethodModal(false)}
        onSelectMethod={handleCardPaymentMethodSelect}
        total={total}
      />
    </aside>
  );
}
