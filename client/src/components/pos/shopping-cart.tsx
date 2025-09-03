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
import { EInvoiceModal } from "./einvoice-modal";
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [currentOrderForPayment, setCurrentOrderForPayment] = useState<any>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedCardMethod, setSelectedCardMethod] = useState<string>("");
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const { t } = useTranslation();

  // State for Receipt Modal and E-Invoice Modal integration
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false); // Added state for PaymentMethodModal
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Flag to prevent duplicate processing

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const tax = cart.reduce((sum, item) => {
      if (item.taxRate && parseFloat(item.taxRate) > 0) {
        const basePrice = parseFloat(item.price);

        // Debug log to check afterTaxPrice
        console.log("=== SHOPPING CART TAX CALCULATION DEBUG ===");
        console.log("Product:", item.name);
        console.log("Base Price:", basePrice);
        console.log("Tax Rate:", item.taxRate + "%");
        console.log("After Tax Price (from DB):", item.afterTaxPrice);
        console.log("After Tax Price Type:", typeof item.afterTaxPrice);

        // Tax = (after_tax_price - price) * quantity
        if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(item.afterTaxPrice);
          const totalItemTax = Math.floor((afterTaxPrice - basePrice) * item.quantity);
          console.log("✅ Using tax formula: Math.floor((after_tax_price - price) * quantity)");
          console.log("  After Tax Price:", afterTaxPrice, "₫");
          console.log("  Base Price:", basePrice, "₫");
          console.log("  Quantity:", item.quantity);
          console.log("  Tax calculation: Math.floor((" + afterTaxPrice + " - " + basePrice + ") * " + item.quantity + ") = " + totalItemTax + "₫");
          return sum + totalItemTax;
        }
      }
      return sum;
    }, 0);
  const total = Math.round(subtotal + tax);
  const change =
    paymentMethod === "cash"
      ? Math.max(0, parseFloat(amountReceived || "0") - total)
      : 0;

  // Helper functions for receipt generation (used in handlePaymentMethodSelect)
  const calculateSubtotal = () =>
    cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const calculateTax = () =>
      cart.reduce((sum, item) => {
        if (item.taxRate && parseFloat(item.taxRate) > 0) {
          const basePrice = parseFloat(item.price);

          // Always use afterTaxPrice - basePrice formula if afterTaxPrice exists
          if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
            const afterTaxPrice = parseFloat(item.afterTaxPrice);
            // Tax = Math.floor((afterTaxPrice - basePrice) * quantity)
            const taxPerItem = afterTaxPrice - basePrice;
            return sum + Math.floor(taxPerItem * item.quantity);
          }
        }
        return sum;
      }, 0);
  const calculateTotal = () => Math.round(calculateSubtotal() + calculateTax());

  // WebSocket connection for broadcasting cart updates to customer display
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    let isConnected = false;
    let reconnectTimer: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log(
            "Shopping Cart: WebSocket connected for customer display broadcasting",
          );
          isConnected = true;
        };

        ws.onerror = (error) => {
          console.error("Shopping Cart: WebSocket error:", error);
          isConnected = false;
        };

        ws.onclose = (event) => {
          console.log("Shopping Cart: WebSocket disconnected");
          isConnected = false;
          // Auto-reconnect if not manually closed
          if (event.code !== 1000) {
            reconnectTimer = setTimeout(connectWebSocket, 1000);
          }
        };
      } catch (error) {
        console.error("Shopping Cart: Failed to create WebSocket:", error);
        reconnectTimer = setTimeout(connectWebSocket, 1000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws && isConnected) {
        ws.close(1000, "Component unmounting");
      }
    };
  }, []);

  // Broadcast cart updates to customer display using existing connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    // Use a more efficient approach - create connection only when needed
    const broadcastCartUpdate = () => {
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Broadcasting cart update to customer display:", cart);
          const message = JSON.stringify({
            type: "cart_update",
            cart: cart,
            subtotal,
            tax,
            total,
            timestamp: new Date().toISOString(),
          });

          ws.send(message);

          // Close connection immediately after sending
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, "Broadcast complete");
            }
          }, 100);
        };

        ws.onerror = (error) => {
          console.error("Failed to broadcast cart update:", error);
        };
      } catch (error) {
        console.error("Failed to create broadcast WebSocket:", error);
      }
    };

    // Debounce rapid cart updates to prevent too many WebSocket connections
    const timeoutId = setTimeout(broadcastCartUpdate, 50);

    return () => {
      clearTimeout(timeoutId);
    };
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: t("common.error"),
        description: t("pos.emptyCart"),
        variant: "destructive",
      });
      return;
    }

    console.log("🔄 Step 1: Creating receipt preview...");

    try {
      // Step 1: Create receipt preview data first
      const receiptPreviewData = {
        transactionId: `PREVIEW-${Date.now()}`,
        items: cart.map((item) => ({
          id: item.id,
          productId: item.id,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
          sku: item.sku || `ITEM${String(item.id).padStart(3, "0")}`,
          taxRate: parseFloat(item.taxRate || "0"),
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        exactSubtotal: subtotal,
        exactTax: tax,
        exactTotal: total,
        paymentMethod: "preview",
        cashierName: "System User",
        createdAt: new Date().toISOString(),
      };

      console.log("📄 Step 1: Created receipt preview data:", receiptPreviewData);

      // Step 1: Show receipt preview modal first
      setPreviewReceipt(receiptPreviewData);
      setShowReceiptPreview(true);

      console.log("🚀 Step 1: Opening receipt preview modal (Xem trước hóa đơn)");

    } catch (error) {
      console.error("❌ Failed to create receipt preview:", error);
      toast({
        title: t("common.error"),
        description: "Không thể tạo xem trước hóa đơn. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleReceiptPreviewConfirm = async () => {
    console.log("📄 Step 1 → Step 2: Receipt preview confirmed, creating order...");

    try {
      // Step 2: Create order after receipt preview is confirmed
      const orderData = {
        orderNumber: `POS-${Date.now()}`,
        tableId: null, // POS orders don't need table
        customerName: "Walk-in Customer",
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: "pending",
        paymentMethod: null,
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price.toString(),
          total: item.total.toString(),
          productSku: item.sku
        })),
        orderedAt: new Date(), // Server will override with server time
      };

      console.log("📤 Step 2: Creating order with data:", orderData);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const createdOrder = await response.json();
      console.log("✅ Step 2: Order created successfully:", createdOrder);

      // Store created order for payment with validation
      if (!createdOrder || !createdOrder.id) {
        console.error("❌ Created order is invalid:", createdOrder);
        throw new Error("Created order doesn't have a valid ID");
      }

      // Calculate exact totals for the order
      const exactSubtotal = subtotal;
      const exactTax = tax; 
      const exactTotal = total;

      // Add exact calculations to created order
      const orderWithExactTotals = {
        ...createdOrder,
        exactSubtotal,
        exactTax,
        exactTotal
      };

      console.log("💾 Step 2: Setting currentOrderForPayment with exact totals:", {
        orderId: orderWithExactTotals.id,
        exactSubtotal,
        exactTax,
        exactTotal,
        originalTotal: createdOrder.total
      });

      setCurrentOrderForPayment(orderWithExactTotals);

      // Step 2 → Step 3: Close receipt preview and open payment modal
      setShowReceiptPreview(false);
      setPreviewReceipt(null);

      setTimeout(() => {
        console.log("🚀 Step 2 → Step 3: Opening payment modal with order:", orderWithExactTotals.id);
        setShowPaymentModal(true);
      }, 100);

    } catch (error) {
      console.error("❌ Step 2 failed: Failed to create order:", error);
      toast({
        title: t("common.error"),
        description: "Không thể tạo đơn hàng. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleReceiptConfirm = () => {
    console.log("📄 Receipt confirmed - closing modal (cart already cleared)");

    // Close receipt modal
    setShowReceiptPreview(false);
    setPreviewReceipt(null);
    setShowReceiptModal(false);
    setSelectedReceipt(null);

    console.log("✅ Receipt modal closed");
  };

  const handlePaymentMethodSelect = (method: string, data?: any) => {
    console.log(
      "🎯 Shopping cart: Payment method selected:",
      method,
      data,
    );

    // Close payment modal and handle the payment completion
    setShowPaymentModal(false);

    if (data?.success && data?.completed) {
      console.log("✅ Payment completed successfully:", data);

      // Clear cart after successful payment
      onClearCart();

      // Show receipt if available
      if (data.receipt) {
        setSelectedReceipt(data.receipt);
        setShowReceiptModal(true);
      }

      // Reset current order
      setCurrentOrderForPayment(null);
    } else if (data?.error) {
      console.error("❌ Payment failed:", data.error);
      toast({
        title: "Lỗi thanh toán",
        description: data.error,
        variant: "destructive",
      });
    }
  };

  // This function is called from PaymentMethodModal
  const processPaymentAndShowEInvoice = async (selectedMethod: string) => {
    if (!currentOrderForPayment) {
      console.error("❌ No order found for payment processing.");
      toast({
        title: "Lỗi",
        description: "Không tìm thấy đơn hàng để xử lý thanh toán.",
        variant: "destructive",
      });
      return;
    }

    // Prevent duplicate processing
    if (isProcessingPayment) {
      console.log("⚠️ Payment already being processed, skipping duplicate call");
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log(`💳 Step 3: Processing ${selectedMethod} payment`);

      // Update order status to paid first
      const response = await fetch(`/api/orders/${currentOrderForPayment.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'paid'
        }),
      });

      console.log(`🔍 Step 3: Order status update response:`, {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      // Continue to E-Invoice even if status update fails for temporary orders
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`⚠️ Step 3: Order status update failed, but continuing to E-Invoice:`, errorData);

        // For temporary orders, this is expected - continue the flow
        if (currentOrderForPayment.id.toString().startsWith('temp-')) {
          console.log(`🟡 Step 3: Temporary order detected - continuing to E-Invoice despite status update failure`);
        } else {
          throw new Error(`Failed to update order status: ${errorData.message || 'Unknown error'}`);
        }
      } else {
        console.log(`✅ Step 3: Order status updated successfully`);
      }

      console.log(`🔄 Step 3: Opening E-Invoice modal`);

      // Close payment modal and open E-Invoice modal
      setShowPaymentMethodModal(false);
      setSelectedPaymentMethod(selectedMethod);
      setShowEInvoiceModal(true);
    } catch (error) {
      console.error(`❌ Step 3: Payment method processing failed:`, error);
      toast({
        title: "Lỗi thanh toán",
        description: "Không thể xử lý thanh toán. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false); // Always reset flag
    }
  };

  const handleCardPaymentMethodSelect = (method: string) => {
    setSelectedCardMethod(method);
    const paymentData = {
      paymentMethod: "creditCard", // Explicitly set to creditCard
      cardType: method,
      amountReceived: total,
      change: 0,
    };
    onCheckout(paymentData);
  };

  const handleEInvoiceConfirm = async (eInvoiceData: any) => {
    console.log("🎯 Step 5: E-invoice confirmed, processing final steps");
    console.log("📄 E-invoice data received:", eInvoiceData);

    // Close E-Invoice modal immediately
    setShowEInvoiceModal(false);

    try {
      // Step 5: Handle cart clearing and receipt display
      // Auto clear cart after E-Invoice completion (both publish now and publish later)
      console.log(
        "🧹 Shopping cart: Auto clearing cart after E-Invoice completion",
      );
      onClearCart();

      // Step 5: Show final receipt modal if receipt data exists
      if (eInvoiceData.receipt) {
        console.log(
          "📄 Shopping cart: Step 5: Showing final receipt modal (not preview)",
        );
        setSelectedReceipt(eInvoiceData.receipt);
        setShowReceiptModal(true);
      } else {
        console.log(
          "✅ Shopping cart: E-invoice completed successfully, cart cleared",
        );
        toast({
          title: "Thành công",
          description: "Hóa đơn đã được xử lý thành công",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("❌ Step 5: Error during final E-invoice confirmation:", error);
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi xác nhận hóa đơn điện tử.",
        variant: "destructive",
      });
    } finally {
      // Reset state after processing is complete
      setCurrentOrderForPayment(null);
      setSelectedPaymentMethod("");
      // We don't reset isProcessingPayment here as it's handled by the calling modal
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
                      {Math.round(parseFloat(item.price)).toLocaleString("vi-VN")} ₫ {t("pos.each")}
                    </p>
                    {item.taxRate && parseFloat(item.taxRate) > 0 && (
                      <p className="text-xs text-orange-600">
                        Thuế:{" "}
                        {(() => {
                            const basePrice = parseFloat(item.price);

                            // Always use afterTaxPrice - basePrice formula if afterTaxPrice exists
                            if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
                              const afterTaxPrice = parseFloat(item.afterTaxPrice);
                              // Tax = Math.floor((afterTaxPrice - basePrice) * quantity)
                              const taxPerItem = afterTaxPrice - basePrice;
                              return Math.floor(taxPerItem * item.quantity);
                            }
                            return 0;
                          })().toLocaleString("vi-VN")} ₫ ({item.taxRate}%)
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
                {Math.round(subtotal).toLocaleString("vi-VN")} ₫
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="pos-text-secondary">{t("tables.tax")}:</span>
              <span className="font-medium">
                {Math.round(tax).toLocaleString("vi-VN")} ₫
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold pos-text-primary">
                  {t("tables.total")}:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {Math.round(total).toLocaleString("vi-VN")} ₫
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

      {/* Step 1: Receipt Preview Modal - "Xem trước hóa đơn" */}
      <ReceiptModal
        isOpen={showReceiptPreview}
        onClose={() => {
          console.log(
            "🔴 Step 1: Closing receipt preview modal (Xem trước hóa đơn)",
          );
          setShowReceiptPreview(false);
          setPreviewReceipt(null);
        }}
        receipt={previewReceipt}
        onConfirm={handleReceiptPreviewConfirm}
        isPreview={true} // This is the preview modal - "Xem trước hóa đơn"
        cartItems={cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: `ITEM${String(item.id).padStart(3, "0")}`,
          taxRate: parseFloat(item.taxRate || "0"),
        }))}
      />

      {/* Step 5: Final Receipt Modal - "Receipt" after all processing complete */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          console.log(
            "🔴 Step 5: Closing final receipt modal (Receipt) from shopping cart",
          );
          setShowReceiptModal(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
        onConfirm={handleReceiptConfirm}
        isPreview={false} // This is the final receipt - "Receipt"
        cartItems={cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: `ITEM${String(item.id).padStart(3, "0")}`,
          taxRate: parseFloat(item.taxRate || "0"),
        }))}
      />

      {/* Step 2: Payment Method Selection Modal */}
      {showPaymentModal && (
        <PaymentMethodModal
          isOpen={showPaymentModal}
          onClose={() => {
            console.log("🔴 Step 2: Closing payment method modal");
            setShowPaymentModal(false);
            setCurrentOrderForPayment(null); // Reset order when closing
            setIsProcessingPayment(false); // Reset processing flag
          }}
          onSelectMethod={processPaymentAndShowEInvoice} // Use the new combined handler
          total={total}
          cartItems={cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            sku: String(item.id),
            taxRate: parseFloat(item.taxRate || "0"),
          }))}
          orderForPayment={currentOrderForPayment} // ✅ Pass created order directly
          products={[]} // Pass empty products array for now
        />
      )}

      {/* Step 4: E-Invoice Modal for invoice processing */}
      {showEInvoiceModal && (
        <EInvoiceModal
          isOpen={showEInvoiceModal}
          onClose={() => {
            console.log("🔴 Step 4: Closing E-invoice modal");
            setShowEInvoiceModal(false);
            setIsProcessingPayment(false); // Reset processing flag
          }}
          onConfirm={handleEInvoiceConfirm}
          total={total}
          selectedPaymentMethod={selectedPaymentMethod}
          cartItems={cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
            taxRate: parseFloat(item.taxRate || "0"),
          }))}
        />
      )}
    </aside>
  );
}