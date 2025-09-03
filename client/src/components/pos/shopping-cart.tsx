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
import { useQuery } from "@tanstack/react-query";

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

  // New state variables for order management flow
  const [lastCartItems, setLastCartItems] = useState<CartItem[]>([]);
  const [orderForPayment, setOrderForPayment] = useState(null);


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

  // Fetch products to calculate tax correctly based on afterTaxPrice
  const { data: products } = useQuery<any[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
  });

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

  // Handler for when receipt preview is confirmed - move to payment method selection
  const handleReceiptPreviewConfirm = () => {
    console.log("🎯 POS: Receipt preview confirmed, showing payment method modal");
    setShowReceiptPreview(false);
    setShowPaymentModal(true);
  };

  // Handler for when receipt preview is cancelled
  const handleReceiptPreviewCancel = () => {
    console.log("❌ POS: Receipt preview cancelled");
    setShowReceiptPreview(false);
    setPreviewReceipt(null);
    setOrderForPayment(null);
  };

  // Handler for payment method selection
  const handlePaymentMethodSelect = async (method: string, data?: any) => {
    console.log("🎯 POS: Payment method selected:", method, data);

    if (method === "paymentCompleted" && data?.success) {
      console.log('✅ POS: Payment completed successfully', data);

      // Close payment modal
      setShowPaymentModal(false);

      // Clear cart after successful payment
      onClearCart();

      // Reset states
      setPreviewReceipt(null);
      setOrderForPayment(null);

      // Show final receipt if needed
      if (data.shouldShowReceipt !== false) {
        console.log("📋 POS: Showing final receipt modal");
        setShowReceiptModal(true);
      }

      console.log('🎉 POS: Payment flow completed successfully');
    } else if (method === "paymentError") {
      console.error('❌ POS: Payment failed', data);

      // Close payment modal but keep cart
      setShowPaymentModal(false);

      // Reset states
      setPreviewReceipt(null);
      setOrderForPayment(null);
    } else {
      // For other method selections, close payment modal
      setShowPaymentModal(false);
    }
  };

  const handleCheckout = async () => {
    console.log("=== POS CHECKOUT STARTED - Following Order Management Flow ===");
    console.log("Cart before checkout:", cart);
    console.log("Cart length:", cart.length);

    if (cart.length === 0) {
      alert("Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.");
      return;
    }

    // Step 1: Prepare cart items with proper data types and validation
    const cartItemsBeforeCheckout = cart.map(item => {
      // Ensure price is a number
      let itemPrice = item.price;
      if (typeof itemPrice === 'string') {
        itemPrice = parseFloat(itemPrice);
      }
      if (isNaN(itemPrice) || itemPrice <= 0) {
        itemPrice = 0;
      }

      // Ensure quantity is a positive integer
      let itemQuantity = item.quantity;
      if (typeof itemQuantity === 'string') {
        itemQuantity = parseInt(itemQuantity);
      }
      if (isNaN(itemQuantity) || itemQuantity <= 0) {
        itemQuantity = 1;
      }

      // Ensure taxRate is a number
      let itemTaxRate = item.taxRate;
      if (typeof itemTaxRate === 'string') {
        itemTaxRate = parseFloat(itemTaxRate);
      }
      if (isNaN(itemTaxRate)) {
        itemTaxRate = 10; // Default 10%
      }

      return {
        id: item.id,
        name: item.name || `Product ${item.id}`,
        price: itemPrice,
        quantity: itemQuantity,
        sku: item.sku || `ITEM${String(item.id).padStart(3, '0')}`,
        taxRate: itemTaxRate
      };
    });

    console.log("✅ Processed cart items:", cartItemsBeforeCheckout);

    // Validate processed items
    const invalidItems = cartItemsBeforeCheckout.filter(item => 
      !item.id || !item.name || item.price <= 0 || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      console.error("❌ Invalid items found after processing:", invalidItems);
      alert("Có sản phẩm không hợp lệ trong giỏ hàng. Vui lòng kiểm tra lại.");
      return;
    }

    // Step 2: Calculate totals exactly like order management
    let calculatedSubtotal = 0;
    let calculatedTax = 0;

    cartItemsBeforeCheckout.forEach(item => {
      const itemSubtotal = item.price * item.quantity;
      calculatedSubtotal += itemSubtotal;

      // Calculate tax using afterTaxPrice if available from products data
      const product = products?.find(p => p.id === item.id);
      if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
        const afterTaxPrice = parseFloat(product.afterTaxPrice);
        const taxPerUnit = afterTaxPrice - item.price;
        calculatedTax += Math.floor(taxPerUnit * item.quantity);
      } else if (item.taxRate && item.taxRate > 0) {
        // Fallback to taxRate calculation
        const taxPerUnit = item.price * (item.taxRate / 100);
        calculatedTax += Math.floor(taxPerUnit * item.quantity);
      }
    });

    const calculatedTotal = calculatedSubtotal + calculatedTax;

    console.log("💰 POS: Calculated totals:", {
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      total: calculatedTotal
    });

    // Step 3: Create receipt preview data exactly like order management
    const receiptPreview = {
      id: `temp-${Date.now()}`,
      orderNumber: `POS-${Date.now()}`,
      customerName: "Khách hàng lẻ",
      tableId: null,
      items: cartItemsBeforeCheckout.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price.toString(),
        total: (item.price * item.quantity).toString(),
        productSku: item.sku
      })),
      subtotal: calculatedSubtotal.toString(),
      tax: calculatedTax.toString(),
      total: calculatedTotal.toString(),
      exactSubtotal: calculatedSubtotal,
      exactTax: calculatedTax,
      exactTotal: calculatedTotal,
      status: "pending",
      paymentStatus: "pending",
      orderedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    console.log("📋 POS: Receipt preview data prepared:", receiptPreview);

    // Step 4: Prepare order data for payment (temporary order for POS)
    const orderForPaymentData = {
      id: `temp-${Date.now()}`,
      orderNumber: `POS-${Date.now()}`,
      tableId: null,
      customerName: "Khách hàng lẻ",
      status: "pending",
      paymentStatus: "pending",
      items: cartItemsBeforeCheckout,
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      total: calculatedTotal,
      exactSubtotal: calculatedSubtotal,
      exactTax: calculatedTax,
      exactTotal: calculatedTotal,
      orderedAt: new Date().toISOString()
    };

    console.log("📦 POS: Order for payment prepared:", orderForPaymentData);

    // Step 5: Set all data and show receipt preview modal (following order management flow)
    setLastCartItems([...cartItemsBeforeCheckout]);
    setOrderForPayment(orderForPaymentData);
    setPreviewReceipt(receiptPreview);
    setShowReceiptPreview(true);

    console.log("🚀 POS: Showing receipt preview modal exactly like order management");
  };

  const handleClearCart = () => {
    onClearCart();
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
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 text-lg"
          >
            {isProcessing ? t("tables.placing") : "Thanh toán"}
          </Button>
        </div>
      )}

      {/* Receipt Preview Modal - Shows first like order management */}
      <ReceiptModal
        isOpen={showReceiptPreview}
        onClose={handleReceiptPreviewCancel}
        receipt={previewReceipt}
        cartItems={previewReceipt?.items || []}
        isPreview={true}
        onConfirm={handleReceiptPreviewConfirm}
        onCancel={handleReceiptPreviewCancel}
      />

      {/* Payment Method Modal - Shows after receipt preview confirmation */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPreviewReceipt(null);
          setOrderForPayment(null);
        }}
        onSelectMethod={handlePaymentMethodSelect}
        total={orderForPayment?.exactTotal || orderForPayment?.total || 0}
        orderForPayment={orderForPayment}
        products={products}
        receipt={previewReceipt}
        cartItems={previewReceipt?.items || []}
      />

      {/* Final Receipt Modal - Shows after successful payment */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
        cartItems={cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: `ITEM${String(item.id).padStart(3, "0")}`,
          taxRate: parseFloat(item.taxRate || "0"),
        }))}
      />

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