import { useState, useEffect } from "react";
import {
  ShoppingCart as CartIcon,
  Minus,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { PaymentMethodModal } from "./payment-method-modal";
import { ReceiptModal } from "./receipt-modal";
import type { CartItem } from "@shared/schema";
import { toast } from "@/hooks/use-toast";

interface ShoppingCartProps {
  cart: CartItem[];
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemoveItem: (id: number) => void;
  onClearCart: () => void;
  onCheckout: (paymentData: any) => void;
  isProcessing: boolean;
  orders?: Array<{ id: string; name: string; cart: CartItem[] }>;
  activeOrderId?: string;
  onCreateNewOrder?: () => void;
  onSwitchOrder?: (orderId: string) => void;
  onRemoveOrder?: (orderId: string) => void;
}

export function ShoppingCart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isProcessing,
  orders = [],
  activeOrderId,
  onCreateNewOrder,
  onSwitchOrder,
  onRemoveOrder,
}: ShoppingCartProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("bankTransfer");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedCardMethod, setSelectedCardMethod] = useState<string>("");
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const { t } = useTranslation();

  // State for E-invoice modal (assuming it exists in your project)
  const [showEInvoice, setShowEInvoice] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(""); // To store the selected payment method for E-invoice
  const [onClose, setOnClose] = useState(() => () => {}); // Placeholder for the close function of the E-invoice modal
  const [onSelectMethod, setOnSelectMethod] = useState(() => () => {}); // Placeholder for the selection function
  const [onShowEInvoice, setOnShowEInvoice] = useState(() => () => {}); // Placeholder for triggering the receipt modal after E-invoice

  // New states for Receipt Modal management
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const tax = cart.reduce((sum, item) => {
    if (item.taxRate && parseFloat(item.taxRate) > 0) {
      return (
        sum +
        ((parseFloat(item.price) * parseFloat(item.taxRate)) / 100) *
          item.quantity
      );
    }
    return sum;
  }, 0);
  const total = subtotal + tax;
  const change =
    paymentMethod === "cash"
      ? Math.max(0, parseFloat(amountReceived || "0") - total)
      : 0;

  // WebSocket connection for broadcasting cart updates to customer display
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log(
            "Shopping Cart: WebSocket connected for customer display broadcasting",
          );
        };

        ws.onerror = (error) => {
          console.error("Shopping Cart: WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("Shopping Cart: WebSocket disconnected");
        };
      } catch (error) {
        console.error("Shopping Cart: Failed to create WebSocket:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Broadcast cart updates to customer display
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Broadcasting cart update to customer display:", cart);
        ws.send(
          JSON.stringify({
            type: "cart_update",
            cart: cart,
            subtotal,
            tax,
            total,
            timestamp: new Date().toISOString(),
          }),
        );
      };

      // Clean up
      setTimeout(() => ws.close(), 1000);
    } catch (error) {
      console.error("Failed to broadcast cart update:", error);
    }
  }, [cart, subtotal, tax, total]);

  const getPaymentMethods = () => {
    // Only return cash and bank transfer payment methods
    const paymentMethods = [
      {
        id: 1,
        name: "Tiền mặt",
        nameKey: "cash",
        type: "cash",
        enabled: true,
        icon: "💵",
      },
      {
        id: 2,
        name: "Chuyển khoản",
        nameKey: "bankTransfer",
        type: "transfer",
        enabled: true,
        icon: "🏦",
      },
    ];

    return paymentMethods;
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    console.log("=== SHOPPING CART CHECKOUT DEBUG ===");
    console.log("Cart items before checkout:", cart);
    console.log("Cart items count:", cart.length);
    console.log("Cart items details:", JSON.stringify(cart, null, 2));

    // Always use bank transfer payment
    {
      // Show receipt preview first for non-cash payments
      const receipt = {
        transactionId: `TXN-${Date.now()}`,
        items: cart.map((item) => ({
          id: item.id,
          productId: item.id,
          productName: item.name,
          price: parseFloat(item.price).toFixed(2),
          quantity: item.quantity,
          total: parseFloat(item.total).toFixed(2),
          sku: `ITEM${String(item.id).padStart(3, "0")}`,
          taxRate: parseFloat(item.taxRate || "10"),
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: "preview", // Sử dụng "preview" thay vì "bankTransfer" để phân biệt
        amountReceived: total.toFixed(2),
        change: "0.00",
        cashierName: "John Smith",
        createdAt: new Date().toISOString(),
      };

      // Create cartItems in the format expected by receipt modal with detailed logging
      console.log("🛒 Processing cart items for receipt:", cart);
      console.log("🛒 Cart items count:", cart.length);

      const cartItemsForReceipt = cart.map((item) => {
        console.log(`🔍 Processing cart item ${item.id}:`, {
          id: item.id,
          name: item.name,
          price: item.price,
          priceType: typeof item.price,
          quantity: item.quantity,
          quantityType: typeof item.quantity,
          taxRate: item.taxRate,
          total: item.total,
          sku: item.id,
        });

        const processedItem = {
          id: item.id,
          name: item.name,
          price:
            typeof item.price === "string"
              ? parseFloat(item.price)
              : item.price,
          quantity:
            typeof item.quantity === "string"
              ? parseInt(item.quantity)
              : item.quantity,
          sku: item.id, // Use more descriptive SKU format
          taxRate:
            typeof item.taxRate === "string"
              ? parseFloat(item.taxRate || "10")
              : item.taxRate || 10,
          total: parseFloat(item.total),
        };
        console.log(`📦 Processed item ${item.id}:`, processedItem);
        return processedItem;
      });

      console.log("✅ Final cartItemsForReceipt:", cartItemsForReceipt);
      console.log("✅ CartItemsForReceipt count:", cartItemsForReceipt.length);

      console.log("Receipt created with items:", receipt.items);
      console.log("Cart items for receipt:", cartItemsForReceipt);
      console.log("Setting preview receipt:", receipt);

      setPreviewReceipt(receipt);
      setShowReceiptPreview(true);
    }
  };

  const handleReceiptConfirm = () => {
    setShowReceiptPreview(false);
    setShowPaymentMethodModal(true);
  };

  const handlePaymentMethodSelect = (method: string) => {
    console.log("🎯 Payment method selected:", method);
    setShowPaymentMethodModal(false);

    // Complete the payment with the selected method
    const paymentData = {
      paymentMethod: method,
      amountReceived: total,
      change: 0,
    };

    console.log("✅ Completing checkout with payment data:", paymentData);
    onCheckout(paymentData);
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

  const handleEInvoiceConfirm = async (eInvoiceData: any) => {
    console.log("📧 E-invoice confirmed:", eInvoiceData);

    try {
      // Kiểm tra nếu là "phát hành sau" (publishLater)
      if (eInvoiceData.publishLater) {
        console.log(
          "📝 E-invoice saved for later publishing, processing receipt display",
        );

        // Kiểm tra nếu có receipt data từ e-invoice modal
        if (eInvoiceData.receipt) {
          console.log(
            "📄 Displaying receipt for later publishing:",
            eInvoiceData.receipt,
          );

          // Clear cart trước khi hiển thị receipt modal
          onClearCart();

          // Hiển thị receipt modal với data thực sự, isPreview = false để có thể in ngay
          setCurrentReceipt(eInvoiceData.receipt);
          setShowReceiptModal(true);

          toast({
            title: "Thành công",
            description:
              "Thông tin hóa đơn điện tử đã được lưu để phát hành sau.",
          });
        } else {
          console.log("⚠️ No receipt data found for later publishing");
          // Clear cart
          onClearCart();

          toast({
            title: "Thành công",
            description:
              "Thông tin hóa đơn điện tử đã được lưu để phát hành sau.",
          });
        }

        console.log("✅ E-invoice later processing completed");
        return;
      }

      // Nếu phát hành thành công (có showReceipt flag)
      if (eInvoiceData.showReceipt) {
        console.log(
          "✅ E-invoice published successfully, creating transaction and showing receipt",
        );

        // Tạo transaction với payment method là einvoice
        const transactionData = {
          transaction: {
            transactionId: `TXN-${Date.now()}`,
            total: total.toFixed(2),
            subtotal: subtotal.toFixed(2),
            tax: tax.toFixed(2),
            paymentMethod: "einvoice",
            amountReceived: total.toFixed(2),
            change: "0.00",
            cashierName: "John Smith",
          },
          items: cart.map((item) => ({
            productId: item.id,
            productName: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            total: parseFloat(item.total),
            sku: item.id,
            taxRate: parseFloat(item.taxRate || "10"),
          })),
        };

        console.log(
          "Creating transaction for published e-invoice:",
          transactionData,
        );

        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const receipt = await response.json();
        console.log("Receipt created for published e-invoice:", receipt);

        // Update product stock
        for (const item of cart) {
          try {
            const stockResponse = await fetch("/api/inventory/update-stock", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                productId: item.id,
                quantity: item.quantity,
                type: "subtract",
                notes: `E-invoice sale - Transaction ${receipt.transactionId} - Invoice ${eInvoiceData.invoiceData?.invoiceNo || "N/A"}`,
              }),
            });

            if (stockResponse.ok) {
              console.log(`✅ Stock updated for product ${item.id}`);
            }
          } catch (stockError) {
            console.error(
              `Stock update error for product ${item.id}:`,
              stockError,
            );
          }
        }

        // Show receipt modal
        setShowReceiptModal(true);
        setCurrentReceipt(receipt);

        // Clear cart
        onClearCart();
        //setSelectedPaymentMethod(null);

        toast({
          title: "Thành công",
          description: `Hóa đơn điện tử đã được phát hành thành công!\nSố hóa đơn: ${eInvoiceData.invoiceData?.invoiceNo || "N/A"}`,
        });
      }
    } catch (error) {
      console.error("Error processing e-invoice:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Có lỗi xảy ra khi xử lý hóa đơn điện tử",
      });
    }
  };

  const canCheckout = cart.length > 0;

  return (
    <aside className="w-96 bg-white shadow-material border-l pos-border flex flex-col">
      <div className="p-4 border-b pos-border mt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl pos-text-primary font-semibold">
            {t("pos.purchaseHistory")}
          </h2>
          {onCreateNewOrder && (
            <Button
              onClick={onCreateNewOrder}
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1"
            >
              + {t("pos.newOrder")}
            </Button>
          )}
        </div>

        {/* Order Tabs */}
        {orders.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 max-h-20 overflow-y-auto">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                  activeOrderId === order.id
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => onSwitchOrder?.(order.id)}
              >
                <span className="truncate max-w-16">{order.name}</span>
                <span className="ml-1 text-xs">({order.cart.length})</span>
                {orders.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveOrder?.(order.id);
                    }}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm pos-text-secondary">
          <span>
            {cart.length} {t("common.items")}
          </span>
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              {t("pos.clearCart")}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <CartIcon className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium pos-text-secondary mb-2">
              {t("pos.emptyCart")}
            </h3>
            <p className="pos-text-tertiary">{t("pos.addProductsToStart")}</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-medium pos-text-primary text-sm truncate">
                    {item.name}
                  </h4>
                  <div className="space-y-1">
                    <p className="text-xs pos-text-secondary">
                      {parseFloat(item.price).toLocaleString("vi-VN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ₫ {t("pos.each")}
                    </p>
                    {item.taxRate && parseFloat(item.taxRate) > 0 && (
                      <p className="text-xs text-orange-600">
                        Thuế:{" "}
                        {(
                          ((parseFloat(item.price) * parseFloat(item.taxRate)) /
                            100) *
                          item.quantity
                        ).toLocaleString("vi-VN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ₫ ({item.taxRate}%)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity - 1)
                      }
                      className="w-6 h-6 p-0"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={10} />
                    </Button>
                    <span className="w-6 text-center font-medium text-xs">
                      {item.quantity}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity + 1)
                      }
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
                  <div className="font-bold pos-text-primary text-sm">
                    {parseFloat(item.total).toLocaleString("vi-VN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ₫
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
              <span className="pos-text-secondary">
                {t("tables.subtotal")}:
              </span>
              <span className="font-medium">
                {subtotal.toLocaleString("vi-VN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₫
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="pos-text-secondary">{t("tables.tax")}:</span>
              <span className="font-medium">
                {tax.toLocaleString("vi-VN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₫
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold pos-text-primary">
                  {t("tables.total")}:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {total.toLocaleString("vi-VN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ₫
                </span>
              </div>
            </div>
          </div>

          {/* Cash Payment */}
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium pos-text-primary">
                {t("tables.amountReceived")}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
              <div className="flex justify-between text-sm">
                <span className="pos-text-secondary">
                  {t("tables.change")}:
                </span>
                <span className="font-bold text-green-600">
                  {change.toLocaleString("vi-VN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ₫
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={!canCheckout || isProcessing}
            className="w-full btn-success flex items-center justify-center"
          >
            <CartIcon className="mr-2" size={16} />
            {isProcessing ? "Processing..." : t("pos.checkout")}
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
        cartItems={cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: `ITEM${String(item.id).padStart(3, "0")}`,
          taxRate: parseFloat(item.taxRate || "10"),
        }))}
      />

      {/* Payment Method Selection Modal */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => setShowPaymentMethodModal(false)}
        onSelectMethod={handlePaymentMethodSelect}
        total={total}
        cartItems={cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: String(item.id),
          taxRate: parseFloat(item.taxRate || "10"),
        }))}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={currentReceipt}
        onConfirm={() => setShowReceiptModal(false)}
        isPreview={false} // Không phải preview, có thể in ngay
        autoShowPrint={true} // Tự động hiển thị dialog in
        cartItems={
          currentReceipt
            ? (currentReceipt.items || []).map((item: any) => ({
                id: item.productId || item.id,
                name: item.productName || item.name,
                price: parseFloat(item.price),
                quantity: item.quantity,
                sku: `FOOD${String(item.productId || item.id).padStart(5, "0")}`,
                taxRate: parseFloat(item.taxRate || "10"),
              }))
            : cart.map((item) => ({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price),
                quantity: item.quantity,
                sku: `FOOD${String(item.id).padStart(5, "0")}`,
                taxRate: parseFloat(item.taxRate || "10"),
              }))
        }
      />

      {/* E-Invoice Modal (Assuming you have this component) */}
      {/* You would need to pass the correct props like onClose, onSelectMethod, onShowEInvoice, etc. */}
      {/* Example: */}
      {/* <EInvoiceModal
        isOpen={showEInvoice}
        onClose={onClose} // Use the stored onClose function
        onConfirm={handleEInvoiceConfirm}
        selectedPaymentMethod={selectedPaymentMethod} // Pass the currently selected method
        cartItems={cart.map(item => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: item.sku || `FOOD${String(item.id).padStart(5, '0')}`,
          taxRate: parseFloat(item.taxRate || "10")
        }))}
        total={total}
      /> */}
    </aside>
  );
}
