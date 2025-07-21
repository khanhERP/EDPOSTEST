import { useState } from "react";
import { ShoppingCart as CartIcon, Minus, Plus, Trash2, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const { t } = useTranslation();

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const taxRate = 0.0825; // 8.25%
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const change = paymentMethod === "cash" ? Math.max(0, parseFloat(amountReceived || "0") - total) : 0;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    if (paymentMethod === "cash" && parseFloat(amountReceived || "0") < total) {
      return;
    }

    const paymentData = {
      paymentMethod,
      amountReceived: paymentMethod === "cash" ? parseFloat(amountReceived) : total,
      change: paymentMethod === "cash" ? change : 0,
    };

    onCheckout(paymentData);
  };

  const canCheckout = cart.length > 0 && 
    (paymentMethod === "card" || (paymentMethod === "cash" && parseFloat(amountReceived || "0") >= total));

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
            <div key={item.id} className="bg-gray-50 rounded-lg p-3 flex items-start space-x-3">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                  <CartIcon className="text-gray-400" size={16} />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-medium pos-text-primary">{item.name}</h4>
                <p className="text-sm pos-text-secondary">${item.price} each</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 p-0"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={12} />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 p-0"
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus size={12} />
                    </Button>
                  </div>
                  <div className="text-right">
                    <div className="font-bold pos-text-primary">${item.total}</div>
                    <button 
                      onClick={() => onRemoveItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
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
              <span className="pos-text-secondary">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="pos-text-secondary">Tax (8.25%):</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold pos-text-primary">Total:</span>
                <span className="text-lg font-bold text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Payment Methods */}
          <div className="space-y-2">
            <Label className="text-sm font-medium pos-text-primary">Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                onClick={() => setPaymentMethod("cash")}
                className="text-sm"
              >
                <Banknote className="mr-1" size={16} />
                Cash
              </Button>
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                onClick={() => setPaymentMethod("card")}
                className="text-sm"
              >
                <CreditCard className="mr-1" size={16} />
                Card
              </Button>
            </div>
          </div>
          
          {/* Cash Payment */}
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium pos-text-primary">Amount Received</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
              <div className="flex justify-between text-sm">
                <span className="pos-text-secondary">Change:</span>
                <span className="font-bold text-green-600">${change.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <Button
            onClick={handleCheckout}
            disabled={!canCheckout || isProcessing}
            className="w-full btn-success flex items-center justify-center"
          >
            <CartIcon className="mr-2" size={16} />
            {isProcessing ? "Processing..." : "Complete Sale"}
          </Button>
        </div>
      )}
    </aside>
  );
}
