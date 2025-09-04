import React, { useState, useEffect } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { CategorySidebar } from "@/components/pos/category-sidebar";
import { ProductGrid } from "@/components/pos/product-grid";
import { ShoppingCart } from "@/components/pos/shopping-cart";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { ProductManagerModal } from "@/components/pos/product-manager-modal";
import { usePOS } from "@/hooks/use-pos";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

interface POSPageProps {
  onLogout?: () => void;
}

export default function POS({ onLogout }: POSPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCartItems, setLastCartItems] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [cartCustomer, setCartCustomer] = useState<Customer | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [shouldClearCartAfterReceipt, setShouldClearCartAfterReceipt] = useState(false);
  const queryClient = useQueryClient();

  const {
    cart,
    orders,
    activeOrderId,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    createNewOrder,
    switchOrder,
    removeOrder,
    lastReceipt,
    isProcessingCheckout,
    processCheckout,
    cartItems, // Assuming cartItems is available from usePOS hook
    setCartItems, // Assuming setCartItems is available from usePOS hook
  } = usePOS();

  const { t } = useTranslation();

  // Initialize cart from localStorage on mount
  useEffect(() => {
    // This effect might need to load cart and customer from localStorage if they exist
    // For now, it's empty as the core logic is handled in other parts.
  }, []);


  // Add WebSocket listener for refresh signals
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('📡 POS: WebSocket connected for refresh signals');
          // Register as POS client
          ws?.send(JSON.stringify({
            type: 'register_pos_client',
            timestamp: new Date().toISOString()
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📩 POS: Received WebSocket message:', data);

            if (data.type === 'popup_close' || 
                data.type === 'payment_success' || 
                data.type === 'force_refresh' ||
                data.type === 'einvoice_published' ||
                data.type === 'einvoice_saved_for_later') {
              console.log('🔄 POS: Refreshing data due to WebSocket signal:', data.type);

              // Clear cache and force refresh
              queryClient.clear();
              queryClient.invalidateQueries({ queryKey: ["/api/products"] });
              queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
              queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });

              // Dispatch custom events for components
              window.dispatchEvent(new CustomEvent('forceDataRefresh', {
                detail: {
                  source: 'pos_websocket',
                  reason: data.type,
                  timestamp: new Date().toISOString()
                }
              }));
            }
          } catch (error) {
            console.error('❌ POS: Error processing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('📡 POS: WebSocket disconnected, attempting reconnect...');
          setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = (error) => {
          console.error('❌ POS: WebSocket error:', error);
        };
      } catch (error) {
        console.error('❌ POS: Failed to connect WebSocket:', error);
        setTimeout(connectWebSocket, 2000);
      }
    };

    // Add custom event listeners for e-invoice events
    const handleEInvoiceEvents = (event: CustomEvent) => {
      console.log('📧 POS: E-invoice event received:', event.type, event.detail);

      // Force data refresh for any e-invoice related events
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });

      // Dispatch refresh event for components
      window.dispatchEvent(new CustomEvent('forceDataRefresh', {
        detail: {
          source: 'pos_einvoice_event',
          reason: event.type,
          timestamp: new Date().toISOString()
        }
      }));
    };

    // Listen for e-invoice related events
    window.addEventListener('einvoicePublished', handleEInvoiceEvents);
    window.addEventListener('einvoiceSavedForLater', handleEInvoiceEvents);
    window.addEventListener('forceDataRefresh', handleEInvoiceEvents);

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      // Clean up event listeners
      window.removeEventListener('einvoicePublished', handleEInvoiceEvents);
      window.removeEventListener('einvoiceSavedForLater', handleEInvoiceEvents);
      window.removeEventListener('forceDataRefresh', handleEInvoiceEvents);
    };
  }, [queryClient]);

  // Expose clear active order function globally for WebSocket refresh
  useEffect(() => {
    (window as any).clearActiveOrder = () => {
      console.log('🔄 POS: Clearing active order via global function');
      clearCart();
      // Switch to first order if multiple orders exist
      if (orders.length > 1) {
        switchOrder(orders[0].id);
      }
    };

    return () => {
      delete (window as any).clearActiveOrder;
    };
  }, [clearCart, orders, switchOrder]);

  const handleCheckout = async (checkoutData: any) => {
    console.log("🛒 POS: Checkout initiated with data:", checkoutData);

    try {
      if (checkoutData.showReceiptModal && checkoutData.receiptData) {
        console.log("📄 POS: Showing receipt modal with data:", checkoutData.receiptData);

        // Set receipt data and show modal
        setReceiptData(checkoutData.receiptData);
        setShowReceiptModal(true);
        setShouldClearCartAfterReceipt(checkoutData.shouldClearCartAfterReceipt || false);

        console.log("📄 POS: Receipt modal opened with data:", {
          transactionId: checkoutData.receiptData.transactionId,
          invoiceNumber: checkoutData.receiptData.invoiceNumber,
          total: checkoutData.receiptData.total,
          paymentMethod: checkoutData.receiptData.paymentMethod
        });

        toast({
          title: "Thanh toán thành công",
          description: `Hóa đơn: ${checkoutData.receiptData.invoiceNumber || checkoutData.receiptData.transactionId}`,
        });

        return;
      }

      // Regular checkout logic for other payment methods
      console.log("💳 POS: Processing regular checkout");

      const orderData = {
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
          notes: item.notes || null,
        })),
        total: calculateCartTotal(),
        subtotal: calculateCartSubtotal(),
        tax: calculateCartTax(),
        paymentMethod: checkoutData.paymentMethod,
        customerName: cartCustomer?.name || null,
        customerPhone: cartCustomer?.phone || null,
        customerEmail: cartCustomer?.email || null,
        notes: checkoutData.notes || null,
        amountReceived: checkoutData.amountReceived,
        changeAmount: checkoutData.changeAmount || 0,
      };

      console.log("📦 POS: Submitting order:", orderData);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ POS: Order created successfully:", result);

        toast({
          title: t("pos.orderSuccess"),
          description: `${t("pos.orderNumber")}: ${result.orderNumber}`,
        });

        // Clear cart after successful order
        clearCartAndRefresh();
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("❌ POS: Checkout error:", error);
      toast({
        title: t("pos.orderError"),
        description: t("pos.tryAgain"),
        variant: "destructive",
      });
    }
  };

  // Function to clear cart and refresh POS
  const clearCartAndRefresh = () => {
    console.log("🧹 POS: Clearing cart and refreshing");

    setCartItems([]);
    setCartCustomer(null);
    setSelectedPaymentMethod("");
    localStorage.removeItem("pos-cart");
    localStorage.removeItem("pos-cart-customer");

    // Force refresh of products and other data
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });

    console.log("✅ POS: Cart cleared and data refreshed");
  };

  // Handle receipt modal close
  const handleReceiptModalClose = () => {
    console.log("🔒 POS: Receipt modal closing");
    setShowReceiptModal(false);
    setReceiptData(null);

    if (shouldClearCartAfterReceipt) {
      console.log("🧹 POS: Clearing cart after receipt modal closed");
      clearCartAndRefresh();
      setShouldClearCartAfterReceipt(false);
    }
  };

  // Helper functions to calculate totals (assuming these exist within usePOS or are defined here)
  const calculateCartTotal = () => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateCartSubtotal = () => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateCartTax = () => 0; // Placeholder for tax calculation

  const [wsConnected, setWsConnected] = useState(false); // Assuming wsConnected state is needed elsewhere

  try {
    return (
      <div className="min-h-screen bg-green-50 grocery-bg">
      {/* Header */}
      <POSHeader onLogout={onLogout} />

      {/* Right Sidebar */}
      <RightSidebar />

      <div className="main-content flex h-screen pt-16">
        {/* Category Sidebar */}
        <CategorySidebar
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenProductManager={() => setShowProductManagerModal(true)}
          onAddToCart={(product) => addToCart(product)}
        />

        {/* Product Grid */}
        <ProductGrid
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onAddToCart={(product) => addToCart(product)}
        />

        {/* Shopping Cart */}
        <ShoppingCart
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          isProcessing={isProcessingCheckout}
          orders={orders}
          activeOrderId={activeOrderId}
          onCreateNewOrder={createNewOrder}
          onSwitchOrder={switchOrder}
          onRemoveOrder={removeOrder}
        />
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={handleReceiptModalClose}
          receiptData={receiptData}
        />
      )}

      {/* Product Manager Modal */}
      <ProductManagerModal
        isOpen={showProductManagerModal}
        onClose={() => setShowProductManagerModal(false)}
      />

      {/* Global WebSocket refresh listener */}
      {wsConnected && (
        <div className="hidden">WebSocket Connected</div>
      )}
    </div>
  );
} catch (error) {
    console.error("❌ POS Page Error:", error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Có lỗi xảy ra</h1>
          <p className="text-gray-600 mb-4">Vui lòng tải lại trang</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }
}