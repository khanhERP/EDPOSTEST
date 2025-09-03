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
  // This useEffect is responsible for establishing and managing the WebSocket connection.
  // It also handles broadcasting cart updates and listening for specific messages.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Shopping Cart: WebSocket connected for customer display broadcasting');
          // Send initial cart state when connected
          broadcastCartUpdate(cart);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Shopping Cart: Received WebSocket message:', data);

            // Handle cart update request
            if (data.type === 'cart_update_request') {
              broadcastCartUpdate(cart);
            }

            // Handle popup close signal (when receipt modal is closed)
            if (data.type === 'popup_close' && data.success) {
              console.log('🧹 Shopping Cart: Receipt modal closed via popup_close, FORCE CLEARING CART');
              
              // Immediate force clear - multiple synchronous calls
              onClearCart();
              setLastCartItems([]);
              setSelectedReceipt(null);
              setPreviewReceipt(null);
              setOrderForPayment(null);
              broadcastCartUpdate([]);
              
              // Aggressive clearing with shorter intervals
              const clearIntervals = [25, 50, 75, 100, 150, 200, 300];
              clearIntervals.forEach((delay, index) => {
                setTimeout(() => {
                  console.log(`🧹 Shopping Cart: Aggressive clear attempt ${index + 1} (${delay}ms)`);
                  onClearCart();
                  setLastCartItems([]);
                  setSelectedReceipt(null);
                  setPreviewReceipt(null);
                  setOrderForPayment(null);
                  broadcastCartUpdate([]);
                  
                  // Also clear any selected orders in POS
                  if (typeof window !== 'undefined' && (window as any).clearActiveOrder) {
                    (window as any).clearActiveOrder();
                  }
                }, delay);
              });
            }

            // Handle refresh signal after print to clear cart
            if (data.type === 'refresh_data_after_print' && data.action === 'refresh_tables_and_clear_cart') {
              console.log('🧹 Shopping Cart: Clearing cart after print receipt');
              
              // Immediate cart clear - multiple calls
              onClearCart();
              setLastCartItems([]);
              setSelectedReceipt(null);
              setPreviewReceipt(null);
              setOrderForPayment(null);
              
              // Also clear any selected orders in POS
              if (typeof window !== 'undefined' && (window as any).clearActiveOrder) {
                (window as any).clearActiveOrder();
              }
              
              // Force broadcast empty cart immediately with multiple delays
              setTimeout(() => {
                onClearCart();
                setLastCartItems([]);
                broadcastCartUpdate([]);
              }, 50);
              
              setTimeout(() => {
                onClearCart();
                setLastCartItems([]);
                broadcastCartUpdate([]);
              }, 100);
            }

            // Handle receipt modal closed signal specifically for cart clearing
            if (data.type === 'receipt_modal_closed' || (data.action && data.action === 'receipt_modal_closed')) {
              console.log('🧹 Shopping Cart: Receipt modal closed signal received, FORCE CLEARING CART');
              
              // Immediate cart clear - multiple calls
              onClearCart();
              setLastCartItems([]);
              setSelectedReceipt(null);
              setPreviewReceipt(null);
              setOrderForPayment(null);
              
              // Force broadcast empty cart with multiple delays
              setTimeout(() => {
                onClearCart();
                setLastCartItems([]);
                broadcastCartUpdate([]);
              }, 50);
              
              setTimeout(() => {
                onClearCart();
                setLastCartItems([]);
                broadcastCartUpdate([]);
              }, 100);
            }

            // Handle any force cart clear signal
            if (data.type === 'force_cart_clear') {
              console.log('🧹 Shopping Cart: Force cart clear signal received');
              
              // Immediate cart clear - multiple calls
              onClearCart();
              setLastCartItems([]);
              setSelectedReceipt(null);
              setPreviewReceipt(null);
              setOrderForPayment(null);
              
              // Force broadcast empty cart
              setTimeout(() => {
                onClearCart();
                setLastCartItems([]);
                broadcastCartUpdate([]);
              }, 50);
            }
          } catch (error) {
            console.error('Shopping Cart: Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('Shopping Cart: WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('Shopping Cart: WebSocket disconnected');
        };

        // Store the WebSocket reference for cleanup
        (window as any).shoppingCartWS = ws;

        return () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (error) {
        console.error('Shopping Cart: Failed to establish WebSocket connection:', error);
      }
    }
  }, [onClearCart]); // Remove cart dependency to avoid reconnection on every cart change

  // Broadcast cart updates to customer display using existing connection
  // This useEffect is responsible for debouncing and broadcasting cart updates.
  const broadcastCartUpdate = (currentCart: CartItem[]) => {
    if (!window.shoppingCartWS || window.shoppingCartWS.readyState !== WebSocket.OPEN) {
      console.warn("Shopping Cart: WebSocket not connected, cannot broadcast cart update.");
      // Optionally try to reconnect or queue the message
      return;
    }

    const subtotal = currentCart.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const tax = currentCart.reduce((sum, item) => {
      if (item.taxRate && parseFloat(item.taxRate) > 0) {
        const basePrice = parseFloat(item.price);
        if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(item.afterTaxPrice);
          return sum + Math.floor((afterTaxPrice - basePrice) * item.quantity);
        }
      }
      return sum;
    }, 0);
    const total = Math.round(subtotal + tax);

    console.log("Broadcasting cart update to customer display:", currentCart);
    const message = JSON.stringify({
      type: "cart_update",
      cart: currentCart,
      subtotal,
      tax,
      total,
      timestamp: new Date().toISOString(),
    });

    window.shoppingCartWS.send(message);
  };

  // Function to clear the cart, used by the WebSocket handler
  const clearCart = () => {
    onClearCart(); // Call the prop function passed from the parent
  };


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

      // CRITICAL: Clear cart immediately after successful payment - multiple calls
      onClearCart();
      setLastCartItems([]);
      setSelectedReceipt(null);
      setPreviewReceipt(null);
      setOrderForPayment(null);

      // Force immediate cart clearing with multiple delays
      setTimeout(() => {
        console.log('🧹 Payment Complete: First delayed clear (50ms)');
        onClearCart();
        setLastCartItems([]);
        broadcastCartUpdate([]);
      }, 50);

      setTimeout(() => {
        console.log('🧹 Payment Complete: Second delayed clear (100ms)');
        onClearCart();
        setLastCartItems([]);
        broadcastCartUpdate([]);
      }, 100);

      // Show final receipt if needed AFTER clearing cart
      if (data.shouldShowReceipt !== false) {
        console.log("📋 POS: Showing final receipt modal");
        setTimeout(() => {
          setShowReceiptModal(true);
        }, 150); // Show receipt after cart is cleared
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
    console.log("=== POS CHECKOUT STARTED ===");
    console.log("Cart before checkout:", cart);
    console.log("Cart length:", cart.length);
    console.log("Current totals:", { subtotal, tax, total });

    if (cart.length === 0) {
      alert("Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.");
      return;
    }

    // CRITICAL FIX: Recalculate totals from cart to ensure they are correct
    const recalculatedSubtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const recalculatedTax = cart.reduce((sum, item) => {
      if (item.taxRate && parseFloat(item.taxRate) > 0) {
        const basePrice = parseFloat(item.price);
        if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(item.afterTaxPrice);
          const taxPerItem = afterTaxPrice - basePrice;
          return sum + Math.floor(taxPerItem * item.quantity);
        }
      }
      return sum;
    }, 0);
    const recalculatedTotal = Math.round(recalculatedSubtotal + recalculatedTax);

    console.log("🔍 CRITICAL DEBUG - Recalculated totals:");
    console.log("Original totals:", { subtotal, tax, total });
    console.log("Recalculated totals:", {
      subtotal: recalculatedSubtotal,
      tax: recalculatedTax,
      total: recalculatedTotal
    });

    // Use recalculated values if they differ significantly
    const finalSubtotal = Math.abs(recalculatedSubtotal - subtotal) > 1 ? recalculatedSubtotal : subtotal;
    const finalTax = Math.abs(recalculatedTax - tax) > 1 ? recalculatedTax : tax;
    const finalTotal = Math.abs(recalculatedTotal - total) > 1 ? recalculatedTotal : total;

    console.log("Final totals to use:", {
      finalSubtotal,
      finalTax,
      finalTotal
    });

    if (finalSubtotal === 0 || finalTotal === 0) {
      console.error("❌ CRITICAL ERROR: Final totals are still 0, cannot proceed with checkout");
      alert("Lỗi: Tổng tiền không hợp lệ. Vui lòng kiểm tra lại giỏ hàng.");
      return;
    }

    // Step 1: Use current cart items with proper structure for E-invoice
    const cartItemsForEInvoice = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      quantity: item.quantity,
      sku: item.sku || `FOOD${String(item.id).padStart(5, '0')}`,
      taxRate: typeof item.taxRate === 'string' ? parseFloat(item.taxRate) : (item.taxRate || 0),
      afterTaxPrice: item.afterTaxPrice
    }));

    console.log("✅ Cart items prepared for E-invoice:", cartItemsForEInvoice);
    console.log("✅ Cart items count for E-invoice:", cartItemsForEInvoice.length);

    // Validate cart items have valid prices
    const hasValidItems = cartItemsForEInvoice.every(item => item.price > 0 && item.quantity > 0);
    if (!hasValidItems) {
      console.error("❌ CRITICAL ERROR: Some cart items have invalid price or quantity");
      alert("Lỗi: Có sản phẩm trong giỏ hàng có giá hoặc số lượng không hợp lệ.");
      return;
    }

    // Step 2: Create receipt preview data with CORRECTED calculated totals
    const receiptPreview = {
      id: `temp-${Date.now()}`,
      orderNumber: `POS-${Date.now()}`,
      customerName: "Khách hàng lẻ",
      tableId: null,
      items: cartItemsForEInvoice.map(item => ({
        id: item.id,
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price.toString(),
        total: (item.price * item.quantity).toString(),
        productSku: item.sku,
        price: item.price.toString(),
        sku: item.sku,
        taxRate: item.taxRate,
        afterTaxPrice: item.afterTaxPrice
      })),
      subtotal: finalSubtotal.toString(),
      tax: finalTax.toString(),
      total: finalTotal.toString(),
      exactSubtotal: finalSubtotal,
      exactTax: finalTax,
      exactTotal: finalTotal,
      status: "pending",
      paymentStatus: "pending",
      orderedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    console.log("📋 POS: Receipt preview data prepared:", receiptPreview);
    console.log("📋 POS: Receipt preview items count:", receiptPreview.items.length);
    console.log("📋 POS: Receipt preview total verification:", {
      exactTotal: receiptPreview.exactTotal,
      stringTotal: receiptPreview.total,
      calculatedTotal: finalTotal
    });

    // Step 3: Prepare order data for payment with CORRECTED totals
    const orderForPaymentData = {
      id: `temp-${Date.now()}`,
      orderNumber: `POS-${Date.now()}`,
      tableId: null,
      customerName: "Khách hàng lẻ",
      status: "pending",
      paymentStatus: "pending",
      items: cartItemsForEInvoice.map(item => ({
        id: item.id,
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price.toString(),
        total: (item.price * item.quantity).toString(),
        productSku: item.sku,
        price: item.price.toString(),
        sku: item.sku,
        taxRate: item.taxRate,
        afterTaxPrice: item.afterTaxPrice
      })),
      subtotal: finalSubtotal,
      tax: finalTax,
      total: finalTotal,
      exactSubtotal: finalSubtotal,
      exactTax: finalTax,
      exactTotal: finalTotal,
      orderedAt: new Date().toISOString()
    };

    console.log("📦 POS: Order for payment prepared:", orderForPaymentData);
    console.log("📦 POS: Order for payment items count:", orderForPaymentData.items.length);
    console.log("📦 POS: Order for payment total verification:", {
      exactTotal: orderForPaymentData.exactTotal,
      total: orderForPaymentData.total,
      calculatedTotal: finalTotal
    });

    // Step 4: Set all data and show receipt preview modal
    setLastCartItems([...cartItemsForEInvoice]);
    setOrderForPayment(orderForPaymentData);
    setPreviewReceipt(receiptPreview);
    setShowReceiptPreview(true);

    console.log("🚀 POS: Showing receipt preview modal with VALIDATED data");
    console.log("📦 POS: orderForPayment FINAL verification:", {
      id: orderForPaymentData.id,
      total: orderForPaymentData.total,
      exactTotal: orderForPaymentData.exactTotal,
      itemsCount: orderForPaymentData.items.length,
      hasValidItems: orderForPaymentData.items.length > 0,
      items: orderForPaymentData.items,
      subtotal: orderForPaymentData.subtotal,
      tax: orderForPaymentData.tax
    });
    console.log("📄 POS: previewReceipt FINAL verification:", {
      id: receiptPreview.id,
      total: receiptPreview.total,
      exactTotal: receiptPreview.exactTotal,
      itemsCount: receiptPreview.items.length,
      hasValidItems: receiptPreview.items.length > 0,
      items: receiptPreview.items,
      subtotal: receiptPreview.subtotal,
      tax: receiptPreview.tax
    });
  };

  // Handler for E-Invoice confirmation
  const handleEInvoiceConfirm = (invoiceData: any) => {
    console.log("🎯 POS: E-Invoice confirmed:", invoiceData);

    // Close E-Invoice modal
    setShowEInvoiceModal(false);

    if (invoiceData.success || invoiceData.publishedImmediately || invoiceData.publishLater) {
      console.log("✅ POS: E-Invoice processed successfully");

      // Clear cart after successful E-invoice processing
      onClearCart();

      // Reset states
      setPreviewReceipt(null);
      setOrderForPayment(null);
      setIsProcessingPayment(false);

      // Show receipt modal with invoice data if available
      if (invoiceData.receipt || invoiceData.shouldShowReceipt) {
        console.log("📄 POS: Showing receipt modal after E-invoice");
        setSelectedReceipt(invoiceData.receipt || invoiceData);
        setShowReceiptModal(true);
      }

      // Show success message
      toast({
        title: "Thành công",
        description: invoiceData.publishLater ?
          "Hóa đơn điện tử đã được lưu để phát hành sau" :
          "Hóa đơn điện tử đã được phát hành thành công"
      });

      console.log("🎉 POS: E-Invoice flow completed successfully");
    } else {
      console.error("❌ POS: E-Invoice processing failed:", invoiceData);
      setIsProcessingPayment(false);

      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi xử lý hóa đơn điện tử",
        variant: "destructive"
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
      {showPaymentModal && orderForPayment && previewReceipt && (
        <PaymentMethodModal
          isOpen={showPaymentModal}
          onClose={() => {
            console.log("🔄 Closing Payment Method Modal");
            setShowPaymentModal(false);
            setPreviewReceipt(null);
            setOrderForPayment(null);
          }}
          onSelectMethod={handlePaymentMethodSelect}
          total={(() => {
            console.log("🔍 Shopping Cart: Payment Modal Total Debug (VALIDATED):", {
              showPaymentModal: showPaymentModal,
              orderForPayment: orderForPayment,
              previewReceipt: previewReceipt,
              orderExactTotal: orderForPayment?.exactTotal,
              orderTotal: orderForPayment?.total,
              previewTotal: previewReceipt?.exactTotal,
              fallbackTotal: total,
              cartItemsCount: cart.length,
              hasValidOrderData: !!(orderForPayment && previewReceipt)
            });

            // If we have valid order data, use it, otherwise use current cart calculation
            if (orderForPayment && previewReceipt) {
              const finalTotal = orderForPayment?.exactTotal ||
                                orderForPayment?.total ||
                                previewReceipt?.exactTotal ||
                                previewReceipt?.total || 0;

              console.log("💰 Shopping Cart: Using order/receipt total:", finalTotal);
              return finalTotal;
            } else {
              // Fallback: Calculate from current cart
              const cartTotal = cart.reduce((sum, item) => {
                const itemTotal = parseFloat(item.total);
                return sum + itemTotal;
              }, 0);

              const cartTax = cart.reduce((sum, item) => {
                if (item.taxRate && parseFloat(item.taxRate) > 0) {
                  const basePrice = parseFloat(item.price);
                  if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
                    const afterTaxPrice = parseFloat(item.afterTaxPrice);
                    const taxPerItem = afterTaxPrice - basePrice;
                    return sum + Math.floor(taxPerItem * item.quantity);
                  }
                }
                return sum;
              }, 0);

              const finalTotal = Math.round(cartTotal + cartTax);
              console.log("💰 Shopping Cart: Using calculated cart total:", finalTotal);
              return finalTotal;
            }
          })()}
          orderForPayment={orderForPayment}
          products={products}
          receipt={previewReceipt}
          cartItems={(() => {
            console.log("📦 Shopping Cart: Cart Items Debug for Payment Modal (VALIDATED):", {
              orderForPaymentItems: orderForPayment?.items?.length || 0,
              previewReceiptItems: previewReceipt?.items?.length || 0,
              currentCartItems: cart?.length || 0,
              lastCartItems: lastCartItems?.length || 0,
              hasValidOrderData: !!(orderForPayment && previewReceipt)
            });

            // If we have stored cart items from checkout process, use them first
            if (lastCartItems && lastCartItems.length > 0) {
              console.log("📦 Shopping Cart: Using lastCartItems (most accurate):", lastCartItems);
              return lastCartItems;
            }

            // If we have valid order data, use it
            if (orderForPayment?.items && orderForPayment.items.length > 0) {
              const mappedItems = orderForPayment.items.map(item => ({
                id: item.id || item.productId,
                name: item.name || item.productName,
                price: typeof (item.price || item.unitPrice) === 'string' ? parseFloat(item.price || item.unitPrice) : (item.price || item.unitPrice),
                quantity: item.quantity,
                sku: item.sku || `FOOD${String(item.id || item.productId).padStart(5, '0')}`,
                taxRate: typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "0") : (item.taxRate || 0),
                afterTaxPrice: item.afterTaxPrice
              }));
              console.log("📦 Shopping Cart: Using orderForPayment items:", mappedItems);
              return mappedItems;
            }

            // Fallback to current cart
            if (cart && cart.length > 0) {
              const mappedItems = cart.map(item => ({
                id: item.id,
                name: item.name,
                price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                quantity: item.quantity,
                sku: item.sku || `FOOD${String(item.id).padStart(5, '0')}`,
                taxRate: typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "0") : (item.taxRate || 0),
                afterTaxPrice: item.afterTaxPrice
              }));
              console.log("📦 Shopping Cart: Using current cart as fallback:", mappedItems);
              return mappedItems;
            }

            console.error("❌ CRITICAL ERROR: No valid items found for Payment Modal");
            return [];
          })()}
        />
      )}

      {/* Final Receipt Modal - Shows after successful payment */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          console.log('🔴 Shopping Cart: Receipt modal closed - EXECUTING ULTIMATE CART RESET');
          
          // Step 1: Close modal immediately
          setShowReceiptModal(false);
          
          // Step 2: ULTIMATE FORCE CLEAR - clear everything immediately
          console.log('🧹 Shopping Cart: ULTIMATE CLEAR - Clearing all states immediately');
          onClearCart();
          setSelectedReceipt(null);
          setPreviewReceipt(null);
          setOrderForPayment(null);
          setLastCartItems([]);
          
          // Step 3: Multiple delayed clears with increasing delays to ensure success
          const delays = [25, 50, 100, 150, 200, 300, 500];
          delays.forEach((delay, index) => {
            setTimeout(() => {
              console.log(`🧹 Shopping Cart: Ultimate clear attempt ${index + 1} (${delay}ms)`);
              onClearCart();
              setLastCartItems([]);
              setSelectedReceipt(null);
              setPreviewReceipt(null);
              setOrderForPayment(null);
              broadcastCartUpdate([]);
              
              // Also trigger global clear
              if (typeof window !== 'undefined' && (window as any).clearActiveOrder) {
                (window as any).clearActiveOrder();
              }
            }, delay);
          });
          
          // Step 4: Send comprehensive WebSocket signals
          setTimeout(() => {
            console.log('📡 Shopping Cart: Sending ULTIMATE WebSocket clear signals');
            try {
              const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
              const wsUrl = `${protocol}//${window.location.host}/ws`;
              const ws = new WebSocket(wsUrl);

              ws.onopen = () => {
                // Send ALL possible clear signals
                const clearSignals = [
                  { type: "receipt_modal_closed", success: true, action: 'receipt_modal_closed' },
                  { type: "popup_close", success: true, action: 'receipt_modal_closed' },
                  { type: "force_cart_clear", success: true },
                  { type: "cart_update", cart: [], subtotal: 0, tax: 0, total: 0 },
                  { type: "refresh_data_after_print", action: 'refresh_tables_and_clear_cart' }
                ];
                
                clearSignals.forEach((signal, index) => {
                  setTimeout(() => {
                    ws.send(JSON.stringify({
                      ...signal,
                      timestamp: new Date().toISOString(),
                      attempt: index + 1
                    }));
                  }, index * 50);
                });
                
                setTimeout(() => ws.close(), 500);
              };
            } catch (error) {
              console.error("Failed to send WebSocket clear signals:", error);
            }
          }, 100);
          
          // Step 5: Final safety net - force page refresh if cart still not cleared
          setTimeout(() => {
            // Check if cart is still not empty after all attempts
            if (cart && cart.length > 0) {
              console.warn('⚠️ Shopping Cart: Cart still not empty after all clear attempts, forcing reload');
              window.location.reload();
            }
          }, 1000);
        }}
        receipt={selectedReceipt}
        cartItems={lastCartItems.length > 0 ? lastCartItems : cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          sku: `ITEM${String(item.id).padStart(3, "0")}`,
          taxRate: parseFloat(item.taxRate || "0"),
        }))}
      />

      {/* E-Invoice Modal for invoice processing */}
      {showEInvoiceModal && (
        <EInvoiceModal
          isOpen={showEInvoiceModal}
          onClose={() => {
            console.log("🔴 POS: Closing E-invoice modal");
            setShowEInvoiceModal(false);
            setIsProcessingPayment(false);
          }}
          onConfirm={handleEInvoiceConfirm}
          total={(() => {
            // Use the most accurate total available
            const totalToUse = orderForPayment?.exactTotal ||
                              orderForPayment?.total ||
                              previewReceipt?.exactTotal ||
                              previewReceipt?.total ||
                              total;

            console.log("🔍 POS E-Invoice Modal - Total calculation debug:", {
              orderForPaymentExactTotal: orderForPayment?.exactTotal,
              orderForPaymentTotal: orderForPayment?.total,
              previewReceiptExactTotal: previewReceipt?.exactTotal,
              previewReceiptTotal: previewReceipt?.total,
              fallbackTotal: total,
              finalTotalToUse: totalToUse
            });

            return totalToUse;
          })()}
          selectedPaymentMethod={selectedPaymentMethod}
          cartItems={(() => {
            // Use the most accurate cart items available
            const itemsToUse = lastCartItems.length > 0 ? lastCartItems :
                              orderForPayment?.items?.length > 0 ? orderForPayment.items.map((item) => ({
                                id: item.id || item.productId,
                                name: item.name || item.productName,
                                price: typeof (item.price || item.unitPrice) === 'string' ? parseFloat(item.price || item.unitPrice) : (item.price || item.unitPrice),
                                quantity: item.quantity,
                                sku: item.sku || `FOOD${String(item.id || item.productId).padStart(5, "0")}`,
                                taxRate: typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "0") : (item.taxRate || 0),
                                afterTaxPrice: item.afterTaxPrice
                              })) :
                              cart.map((item) => ({
                                id: item.id,
                                name: item.name,
                                price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                                quantity: item.quantity,
                                sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
                                taxRate: typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "0") : (item.taxRate || 0),
                                afterTaxPrice: item.afterTaxPrice
                              }));

            console.log("🔍 POS E-Invoice Modal - Cart items calculation debug:", {
              lastCartItemsLength: lastCartItems.length,
              orderForPaymentItemsLength: orderForPayment?.items?.length || 0,
              currentCartLength: cart.length,
              finalItemsToUseLength: itemsToUse.length,
              finalItemsToUse: itemsToUse
            });

            return itemsToUse;
          })()}
          source="pos"
        />
      )}
    </aside>
  );
}