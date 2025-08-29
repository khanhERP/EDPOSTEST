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
import { InvoiceManagementModal } from "./invoice-management-modal";
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
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedCardMethod, setSelectedCardMethod] = useState<string>("");
  const { t } = useTranslation();

  // State for Receipt Modal and E-Invoice Modal integration
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [showInvoiceManagementModal, setShowInvoiceManagementModal] = useState(false);
  
  // Additional states for new ordered flow
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

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
        console.log("🔍 KIỂM TRA: After Tax Price có phải 20000 không?", item.afterTaxPrice === "20000" || item.afterTaxPrice === 20000);

        // So sánh chi tiết
        if (item.afterTaxPrice) {
          const afterTaxPrice = parseFloat(item.afterTaxPrice);
          console.log("🆚 SHOPPING CART CHI TIẾT:");
          console.log("  Shopping Cart afterTaxPrice parsed:", afterTaxPrice);
          console.log("  Có bằng 20000 không?", afterTaxPrice === 20000);
          console.log("  Base price:", basePrice);
          console.log("  Tax per item (Shopping Cart):", afterTaxPrice - basePrice);
          console.log("  Tax for", item.quantity, "items:", (afterTaxPrice - basePrice) * item.quantity);
        }

        // Only calculate tax if afterTaxPrice exists in database
        if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(item.afterTaxPrice);
          const taxPerItem = afterTaxPrice - basePrice;
          const totalItemTax = taxPerItem * item.quantity;
          console.log("✅ Using afterTaxPrice from database:");
          console.log("  After Tax Price:", afterTaxPrice, "₫");
          console.log("  Tax per item:", taxPerItem, "₫");
          console.log("  Quantity:", item.quantity);
          console.log("  Total tax for this item:", totalItemTax, "₫");
          return sum + totalItemTax;
        }
        // No tax calculation if afterTaxPrice in database
        console.log("⚠️ No afterTaxPrice in database - no tax applied");
        return sum;
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

          // Only calculate tax if afterTaxPrice exists in database
          if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
            const afterTaxPrice = parseFloat(item.afterTaxPrice);
            // Tax = afterTaxPrice - basePrice
            const taxPerItem = afterTaxPrice - basePrice;
            return sum + (taxPerItem * item.quantity);
          }
          // Fallback: calculate afterTaxPrice from basePrice and tax rate, then subtract basePrice
          const calculatedAfterTaxPrice = basePrice * (1 + parseFloat(item.taxRate) / 100);
          const taxPerItem = calculatedAfterTaxPrice - basePrice;
          return sum + (taxPerItem * item.quantity);
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

  const handleCheckout = () => {
    if (cart.length === 0) return;

    console.log("📄 BƯỚC 1: Hiển thị preview receipt trước tiên");
    console.log("Cart items:", cart.length);

    // Validate cart data before proceeding
    if (!cart || cart.length === 0) {
      console.error("❌ No cart data available for processing");
      toast({
        title: "Lỗi",
        description: "Không có dữ liệu giỏ hàng để xử lý hóa đơn",
        variant: "destructive"
      });
      return;
    }

    // BƯỚC 1: Tạo preview receipt data
    const previewReceiptData = {
      transactionId: `PREVIEW-${Date.now()}`,
      items: cart.map((item) => ({
        id: item.id,
        productId: item.id,
        productName: item.name,
        price: parseFloat(item.price.toString()).toFixed(2),
        quantity: item.quantity,
        total: parseFloat(item.total.toString()).toFixed(2),
        sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
        taxRate: parseFloat(item.taxRate || "0"),
      })),
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      paymentMethod: "preview",
      cashierName: "System User",
      createdAt: new Date().toISOString(),
      // Add exact values for precise calculations
      exactSubtotal: subtotal,
      exactTax: tax,
      exactTotal: total,
    };

    console.log("📄 BƯỚC 1: Hiển thị preview receipt với dữ liệu:", previewReceiptData);
    
    // Set preview receipt và hiển thị modal
    setPreviewReceipt(previewReceiptData);
    setShowReceiptModal(true); // This will show as preview mode
  };

  const handleReceiptConfirm = () => {
    console.log("📄 Final receipt confirmed - closing all modals and resetting state");

    // Close all modals and reset state
    setShowReceiptModal(false);
    setSelectedReceipt(null);
    setShowEInvoiceModal(false);
    setSelectedPaymentMethod("");

    console.log("✅ All modals closed and state reset");
  };

  // This function is no longer needed since we skip payment method selection

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

  // Function to clear the cart, used in handleEInvoiceConfirm
  const clearCart = () => {
    onClearCart();
    setAmountReceived(""); // Also clear amount received for cash
    setPaymentMethod("bankTransfer"); // Reset to default payment method
  };

  const handleEInvoiceConfirm = (eInvoiceData: any) => {
    console.log('✅ BƯỚC 4: E-Invoice processing completed:', eInvoiceData);

    // BƯỚC 4: Đóng E-Invoice modal
    setShowEInvoiceModal(false);
    setSelectedPaymentMethod("");

    // Validate that e-invoice data contains required information
    if (!eInvoiceData) {
      console.error("❌ No e-invoice data received");
      toast({
        title: "Lỗi",
        description: "Không nhận được dữ liệu hóa đơn điện tử",
        variant: "destructive"
      });
      return;
    }

    console.log('📄 BƯỚC 4: Processing receipt data for final display');

    let receiptToShow: any = null;

    // Priority 1: Use receipt from eInvoiceData if available and valid
    if (eInvoiceData.receipt && eInvoiceData.receipt.items && eInvoiceData.receipt.items.length > 0) {
      console.log('✅ BƯỚC 4: Using receipt from E-Invoice data');
      receiptToShow = {
        ...eInvoiceData.receipt,
        einvoiceData: {
          status: eInvoiceData.publishLater ? "draft" : "published",
          invoiceId: eInvoiceData.invoiceId || eInvoiceData.receipt.invoiceId || null,
          invoiceNumber: eInvoiceData.receipt.invoiceNumber || null,
          customerName: eInvoiceData.customerName || eInvoiceData.receipt.customerName || "Khách hàng",
          customerTaxCode: eInvoiceData.taxCode || eInvoiceData.receipt.customerTaxCode || "",
        },
        originalPaymentMethod: eInvoiceData.originalPaymentMethod || selectedPaymentMethod || "cash",
        displayPaymentMethod: eInvoiceData.originalPaymentMethod || selectedPaymentMethod || "cash",
        isEInvoice: true,
        publishLater: eInvoiceData.publishLater || false,
      };
    }
    // Priority 2: Create receipt from current cart data
    else if (cart && cart.length > 0) {
      console.log('⚠️ BƯỚC 4: Creating receipt from current cart data');
      receiptToShow = {
        transactionId: eInvoiceData.savedInvoice?.tradeNumber || `TXN-${Date.now()}`,
        items: cart.map((item) => ({
          id: item.id,
          productId: item.id,
          productName: item.name,
          price: parseFloat(item.price.toString()).toFixed(2),
          quantity: item.quantity,
          total: parseFloat(item.total.toString()).toFixed(2),
          sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
          taxRate: parseFloat(item.taxRate || "0"),
          afterTaxPrice: item.afterTaxPrice,
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: "einvoice",
        originalPaymentMethod: eInvoiceData.originalPaymentMethod || selectedPaymentMethod || "cash",
        displayPaymentMethod: eInvoiceData.originalPaymentMethod || selectedPaymentMethod || "cash",
        amountReceived: total.toFixed(2),
        change: "0.00",
        cashierName: "System User",
        createdAt: new Date().toISOString(),
        invoiceNumber: eInvoiceData.invoiceNumber || null,
        customerName: eInvoiceData.customerName || "Khách hàng",
        customerTaxCode: eInvoiceData.taxCode || "",
        isEInvoice: true,
        publishLater: eInvoiceData.publishLater || false,
      };
    }

    // Final validation of receipt data
    if (!receiptToShow || !receiptToShow.items || receiptToShow.items.length === 0) {
      console.error("❌ BƯỚC 4: No valid receipt data could be created");
      toast({
        title: "Lỗi",
        description: "Không thể tạo dữ liệu hóa đơn để hiển thị",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ BƯỚC 4→5: Final receipt data ready for display');

    // BƯỚC 5: Show final receipt modal
    setSelectedReceipt(receiptToShow);
    setShowReceiptModal(true);

    // Clear cart after a brief delay
    setTimeout(() => {
      console.log('🧹 BƯỚC 5: Auto clearing cart after final receipt modal shown');
      clearCart();
    }, 500);
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
                    {item.taxRate && parseFloat(item.taxRate || "0") > 0 && (
                        <p className="text-xs text-orange-600">
                          Thuế:{" "}
                          {(() => {
                            // Calculate tax using afterTaxPrice if available, otherwise use taxRate
                            const basePrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
                            const itemTaxRate = parseFloat(item.taxRate || "0");

                            if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
                              const afterTaxPrice = typeof item.afterTaxPrice === 'string' 
                                ? parseFloat(item.afterTaxPrice) 
                                : item.afterTaxPrice;

                              if (!isNaN(afterTaxPrice) && afterTaxPrice > basePrice) {
                                const taxAmount = afterTaxPrice - basePrice;
                                return `${Math.floor(taxAmount * item.quantity).toLocaleString("vi-VN")}₫`;
                              }
                            }

                            // Fallback calculation with tax rate
                            const taxAmount = (basePrice * itemTaxRate / 100) * item.quantity;
                            return `${Math.floor(taxAmount).toLocaleString("vi-VN")}₫`;
                          })()}
                          ({item.taxRate || "0"}%)
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

      {/* BƯỚC 1: Preview Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal && !selectedReceipt} // Preview mode when no selectedReceipt
        onClose={() => {
          console.log("🔴 BƯỚC 1: Đóng preview receipt modal");
          setShowReceiptModal(false);
          setPreviewReceipt(null);
        }}
        receipt={previewReceipt}
        onConfirm={() => {
          console.log("✅ BƯỚC 1→2: Preview confirmed, chuyển sang chọn phương thức thanh toán");
          
          // Đóng preview receipt modal
          setShowReceiptModal(false);
          
          // BƯỚC 2: Hiển thị payment method modal
          setShowPaymentMethodModal(true);
        }}
        isPreview={true} // This is preview mode
        cartItems={cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
          taxRate: parseFloat(item.taxRate || "0"),
          afterTaxPrice: item.afterTaxPrice,
        }))}
        total={total}
      />

      {/* BƯỚC 2: Payment Method Modal */}
      {showPaymentMethodModal && (
        <PaymentMethodModal
          isOpen={showPaymentMethodModal}
          onClose={() => {
            console.log("🔴 BƯỚC 2: Đóng payment method modal");
            setShowPaymentMethodModal(false);
          }}
          onSelectMethod={(method, data) => {
            console.log("✅ BƯỚC 2→3: Payment method selected:", method);
            
            // Đóng payment method modal
            setShowPaymentMethodModal(false);
            
            // Lưu phương thức thanh toán đã chọn
            setSelectedPaymentMethod(method);
            
            // BƯỚC 3: Hiển thị E-Invoice modal
            setShowEInvoiceModal(true);
          }}
          total={total}
          cartItems={cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
            taxRate: parseFloat(item.taxRate || "0"),
            afterTaxPrice: item.afterTaxPrice,
          }))}
        />
      )}

      {/* BƯỚC 3-4: E-Invoice Modal */}
      {showEInvoiceModal && (
        <EInvoiceModal
          isOpen={showEInvoiceModal}
          onClose={() => {
            console.log("🔴 BƯỚC 3: Đóng E-invoice modal");
            setShowEInvoiceModal(false);
            setSelectedPaymentMethod("");
          }}
          onConfirm={handleEInvoiceConfirm}
          total={total}
          selectedPaymentMethod={selectedPaymentMethod}
          cartItems={cart.map((item) => {
            return {
              id: item.id,
              name: item.name,
              price: parseFloat(item.price.toString()),
              quantity: item.quantity,
              sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
              taxRate: parseFloat(item.taxRate || "0"),
              afterTaxPrice: item.afterTaxPrice,
            };
          })}
        />
      )}

      {/* BƯỚC 5: Final Receipt Modal - "In hóa đơn" for printing */}
      <ReceiptModal
        isOpen={showReceiptModal && !!selectedReceipt} // Final mode when selectedReceipt exists
        onClose={() => {
          console.log("🔴 BƯỚC 5: Đóng final receipt modal");
          setShowReceiptModal(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
        onConfirm={handleReceiptConfirm}
        isPreview={false} // This is the final receipt for printing
        cartItems={cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
          taxRate: parseFloat(item.taxRate || "0"),
          afterTaxPrice: item.afterTaxPrice,
        }))}
      />

      {/* Invoice Management Modal */}
      <InvoiceManagementModal
        isOpen={showInvoiceManagementModal}
        onClose={() => {
          console.log('🔴 Closing invoice management modal from shopping cart');
          setShowInvoiceManagementModal(false);
        }}
      />
    </aside>
  );
}