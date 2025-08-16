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

  // Helper functions for receipt generation (used in handlePaymentMethodSelect)
  const calculateSubtotal = () =>
    cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const calculateTax = () =>
    cart.reduce((sum, item) => {
      if (item.taxRate && parseFloat(item.taxRate) > 0) {
        return (
          sum +
          ((parseFloat(item.price) * parseFloat(item.taxRate)) / 100) *
            item.quantity
        );
      }
      return sum;
    }, 0);
  const calculateTotal = () => calculateSubtotal() + calculateTax();

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
    console.log("📄 Receipt confirmed, checking payment method");
    setShowReceiptPreview(false);

    // Chỉ hiển thị payment method modal nếu chưa có thanh toán nào được xử lý
    // Tránh hiển thị lại sau khi e-invoice đã xử lý xong
    if (
      !previewReceipt?.paymentMethod ||
      previewReceipt?.paymentMethod === "preview"
    ) {
      console.log("💳 Showing payment method modal for new transaction");
      setShowPaymentMethodModal(true);
    } else {
      console.log(
        "✅ Payment already processed, not showing payment method modal",
      );
    }
  };

  const handlePaymentMethodSelect = (method: string, eInvoiceData?: any) => {
    console.log("💳 Payment method selected:", method);
    console.log("📧 E-invoice data received:", eInvoiceData);

    // Đóng payment modal NGAY LẬP TỨC cho tất cả trường hợp
    console.log("🔒 Closing payment modal immediately");
    setShowPaymentMethodModal(false);

    if (method === "einvoice" && eInvoiceData) {
      console.log("📧 Processing e-invoice data in shopping cart");
      console.log("🔍 E-invoice data type check:", {
        publishLater: eInvoiceData.publishLater,
        publishedImmediately: eInvoiceData.publishedImmediately,
        showReceiptModal: eInvoiceData.showReceiptModal,
        autoShowPrint: eInvoiceData.autoShowPrint,
      });

      // Xử lý "Phát hành sau" trước (priority cao hơn)
      if (eInvoiceData.publishLater || eInvoiceData.showReceiptModal) {
        console.log("📧 Processing publish later case with receipt modal");
        console.log("📄 E-invoice data for later:", eInvoiceData);

        // Đóng tất cả modal trước khi hiển thị receipt
        setShowPaymentMethodModal(false);

        // Hiển thị receipt modal ngay lập tức
        if (eInvoiceData.receipt) {
          console.log("📄 Displaying receipt modal for saved draft invoice");
          setPreviewReceipt(eInvoiceData.receipt);
          setShowReceiptPreview(true);

          // Clear cart sau khi hiển thị receipt modal
          setTimeout(() => {
            onClearCart();
          }, 100);

          console.log("✅ Receipt modal displayed for draft invoice");
        } else {
          // Fallback nếu không có receipt data từ e-invoice
          console.log(
            "⚠️ No receipt data from e-invoice, creating fallback receipt",
          );

          // Tạo fallback receipt từ cart data
          const fallbackReceipt = {
            transactionId: `TXN-${Date.now()}`,
            items: cart.map((item) => ({
              id: item.id,
              productId: item.id,
              productName: item.name,
              price: parseFloat(item.price).toFixed(2),
              quantity: item.quantity,
              total: (parseFloat(item.price) * item.quantity).toFixed(2),
              sku: `FOOD${String(item.id).padStart(5, "0")}`,
              taxRate: parseFloat(item.taxRate || "10"),
            })),
            subtotal: (total / 1.1).toFixed(2),
            tax: (total - total / 1.1).toFixed(2),
            total: total.toFixed(2),
            paymentMethod: "einvoice",
            amountReceived: total.toFixed(2),
            change: "0.00",
            cashierName: "System User",
            createdAt: new Date().toISOString(),
            customerName: eInvoiceData.customerName,
            customerTaxCode: eInvoiceData.taxCode,
          };

          console.log("📄 Created fallback receipt:", fallbackReceipt);

          setPreviewReceipt(fallbackReceipt);
          setShowReceiptPreview(true);

          // Clear cart sau khi hiển thị receipt modal
          setTimeout(() => {
            onClearCart();
          }, 100);

          toast({
            title: "Thành công",
            description:
              "Thông tin hóa đơn điện tử đã được lưu để phát hành sau.",
          });
        }
        }, 200); // Đợi payment modal đóng hoàn toàn

        console.log("✅ E-invoice later processing scheduled");
        return;
      }

      // Xử lý phát hành ngay lập tức
      if (eInvoiceData.publishedImmediately || eInvoiceData.showReceiptModal) {
        console.log(
          "📄 Processing published immediately or show receipt modal case",
        );

        // Đóng tất cả modal trước khi hiển thị receipt
        setShowPaymentMethodModal(false);

        setTimeout(() => {
          if (eInvoiceData.receipt) {
            setPreviewReceipt(eInvoiceData.receipt);
            setShowReceiptPreview(true);

            // Clear cart sau khi hiển thị receipt modal
            setTimeout(() => {
              onClearCart();
            }, 100);

            toast({
              title: "Thành công",
              description: eInvoiceData.publishedImmediately
                ? `Hóa đơn điện tử đã được phát hành thành công! Số hóa đơn: ${eInvoiceData.invoiceNumber || "N/A"}`
                : "Hóa đơn điện tử đã được lưu để phát hành sau.",
            });
          }
        }, 200); // Đợi payment modal đóng hoàn toàn

        console.log("✅ E-invoice processing completed");
        return;
      }

      // Không hiển thị lại payment method modal cho bất kỳ trường hợp e-invoice nào
      // vì tất cả đều đã được xử lý và chuyển sang receipt modal
      console.log(
        "✅ E-invoice processing completed, payment method modal remains closed",
      );
    }

    // Existing payment method logic for non-e-invoice methods
    console.log("💰 Processing regular payment method:", method);
    if (method === "cash") {
      // Cash payment logic
      const paymentData = {
        paymentMethod: method,
        amountReceived: parseFloat(amountReceived || "0"),
        change: change,
      };
      onCheckout(paymentData);
    } else if (method === "bankTransfer") {
      // Bank transfer logic
      const paymentData = {
        paymentMethod: method,
        amountReceived: total, // Assume full amount is received for bank transfer
        change: 0,
      };
      onCheckout(paymentData);
    } else if (method === "creditCard") {
      // Placeholder for credit card payment, you might need more specific data
      const paymentData = {
        paymentMethod: method,
        cardType: selectedCardMethod, // Use the selected card method
        amountReceived: total,
        change: 0,
      };
      onCheckout(paymentData);
    }
    // Add other payment methods here
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
    console.log("📧 E-invoice confirmed:", eInvoiceData);

    try {
      // Đảm bảo payment method modal được đóng
      setShowPaymentMethodModal(false);

      // Đơn giản hóa logic: chỉ cần kiểm tra có receipt data không
      if (eInvoiceData.receipt) {
        console.log("📄 E-invoice has receipt data, showing receipt modal");

        setPreviewReceipt(eInvoiceData.receipt);
        setShowReceiptPreview(true);

        // Clear cart sau khi hiển thị receipt modal
        setTimeout(() => {
          onClearCart();
        }, 100);

        // Show appropriate success message
        const successMessage = eInvoiceData.publishLater
          ? "Thông tin hóa đơn điện tử đã được lưu để phát hành sau."
          : eInvoiceData.publishedImmediately
            ? `Hóa đơn điện tử đã được phát hành thành công! Số HĐ: ${eInvoiceData.invoiceNumber || "N/A"}`
            : "Giao dịch đã hoàn tất";

        toast({
          title: "Thành công",
          description: successMessage,
        });

        console.log("✅ E-invoice processing completed, receipt modal shown");
        return;
      } else {
        console.log("⚠️ No receipt data found, creating fallback receipt");

        // Tạo fallback receipt từ cart data
        const fallbackReceipt = {
          transactionId: `TXN-${Date.now()}`,
          items: cart.map((item) => ({
            id: item.id,
            productId: item.id,
            productName: item.name,
            price: parseFloat(item.price).toFixed(2),
            quantity: item.quantity,
            total: parseFloat(item.total).toFixed(2),
            sku: `FOOD${String(item.id).padStart(5, "0")}`,
            taxRate: parseFloat(item.taxRate || "10"),
          })),
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          paymentMethod: "einvoice",
          amountReceived: total.toFixed(2),
          change: "0.00",
          cashierName: "System User",
          createdAt: new Date().toISOString(),
          customerName: eInvoiceData.customerName || "Khách hàng lẻ",
          customerTaxCode: eInvoiceData.taxCode,
        };

        console.log("📄 Created fallback receipt:", fallbackReceipt);

        setPreviewReceipt(fallbackReceipt);
        setShowReceiptPreview(true);

        // Clear cart sau khi hiển thị receipt modal
        setTimeout(() => {
          onClearCart();
        }, 100);

        toast({
          title: "Thành công",
          description: "Thông tin hóa đơn điện tử đã được xử lý.",
        });

        console.log("✅ Fallback receipt processing completed");
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

      {/* Receipt Modal - handles both preview and final receipt */}
      <ReceiptModal
        isOpen={showReceiptPreview}
        onClose={() => {
          console.log("🔴 Closing receipt modal from shopping cart");
          setShowReceiptPreview(false);
          setPreviewReceipt(null);
        }}
        receipt={previewReceipt}
        onConfirm={handleReceiptConfirm}
        isPreview={previewReceipt?.paymentMethod === "preview"} // Only preview mode for preview receipts
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
        onSelectMethod={(method) => {
          // Check if eInvoiceData needs to be passed
          // This logic would depend on how your EInvoiceModal is structured and triggered
          // For now, we pass null as a placeholder if no eInvoice data is available
          const eInvoiceData = null; // Replace with actual eInvoice data if available
          handlePaymentMethodSelect(method, eInvoiceData);
        }}
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