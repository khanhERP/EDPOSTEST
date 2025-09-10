import { useState, useEffect, useCallback, useRef } from "react";
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

  // WebSocket setup for receiving refresh signals and broadcasting cart updates
  useEffect(() => {
    console.log('📡 Shopping Cart: Initializing WebSocket connection for refresh signals and cart updates');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let shouldReconnect = true;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('📡 Shopping Cart: Max reconnection attempts reached, giving up');
        return;
      }

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('📡 Shopping Cart: WebSocket connected for refresh signals');
          reconnectAttempts = 0; // Reset attempts on successful connection

          // Register as shopping cart client
          ws.send(JSON.stringify({
            type: 'register_shopping_cart',
            timestamp: new Date().toISOString()
          }));

          // Send initial cart state to customer display
          if (cart.length > 0) {
            console.log("📡 Shopping Cart: Sending initial cart state to customer display");
            ws.send(JSON.stringify({
              type: 'cart_update',
              cart: cart,
              subtotal: subtotal,
              tax: tax,
              total: total,
              timestamp: new Date().toISOString()
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📩 Shopping Cart: Received WebSocket message:', data);

            if (data.type === 'payment_success' || data.type === 'popup_close' || data.type === 'force_refresh' || data.type === 'einvoice_published') {
              console.log('🔄 Shopping Cart: Refreshing data due to WebSocket signal');

              // Clear cart if payment was successful or other refresh signals
              if ((data.type === 'popup_close' && data.success) || data.type === 'payment_success' || data.type === 'einvoice_published' || data.type === 'force_refresh') {
                console.log('🧹 Shopping Cart: Clearing cart due to signal');

                // Multiple attempts to ensure cart is cleared
                onClearCart();
                setTimeout(() => onClearCart(), 100);
                setTimeout(() => onClearCart(), 300);

                // Clear any active orders
                if (typeof window !== 'undefined' && (window as any).clearActiveOrder) {
                  (window as any).clearActiveOrder();
                }
              }
            }
          } catch (error) {
            console.error('❌ Shopping Cart: Error processing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('📡 Shopping Cart: WebSocket disconnected, attempting reconnect...');
          if (shouldReconnect && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(2000 * reconnectAttempts, 10000); // Exponential backoff
            reconnectTimer = setTimeout(connectWebSocket, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ Shopping Cart: WebSocket error:', error);
        };
      } catch (error) {
        console.error('❌ Shopping Cart: Failed to connect WebSocket:', error);
        if (shouldReconnect && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(2000 * reconnectAttempts, 10000);
          reconnectTimer = setTimeout(connectWebSocket, delay);
        }
      }
    };

    connectWebSocket();

    return () => {
      console.log('🔗 Shopping Cart: Cleaning up WebSocket connection');
      shouldReconnect = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [onClearCart, cart, subtotal, tax, total]);

  // Store WebSocket reference for broadcasting cart updates
  const wsRef = useRef<WebSocket | null>(null);

  // Update WebSocket reference when connection is established
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("📡 Shopping Cart: WebSocket connected for cart broadcasting");
      wsRef.current = ws;
      ws.send(JSON.stringify({
        type: 'register_pos',
        timestamp: new Date().toISOString()
      }));
    };

    ws.onclose = () => {
      console.log("📡 Shopping Cart: Cart broadcast WebSocket disconnected");
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("📡 Shopping Cart: Cart broadcast WebSocket error:", error);
      wsRef.current = null;
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, []);

  // Function to broadcast cart updates to customer display
  const broadcastCartUpdate = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Ensure cart items have proper names before broadcasting
      const validatedCart = cart.map(item => ({
        ...item,
        name: item.name || item.productName || `Sản phẩm ${item.id}`,
        price: item.price || '0',
        quantity: item.quantity || 1,
        total: item.total || '0'
      }));

      const cartData = {
        type: 'cart_update',
        cart: validatedCart,
        subtotal: subtotal,
        tax: tax,
        total: total,
        timestamp: new Date().toISOString()
      };

      console.log("📡 Shopping Cart: Broadcasting cart update to customer display:", {
        cartItems: validatedCart.length,
        subtotal: subtotal,
        tax: tax,
        total: total,
        sampleItem: validatedCart[0]
      });

      try {
        wsRef.current.send(JSON.stringify(cartData));
      } catch (error) {
        console.error("📡 Shopping Cart: Error broadcasting cart update:", error);
      }
    } else {
      console.log("📡 Shopping Cart: WebSocket not available for broadcasting");
    }
  }, [cart, subtotal, tax, total]);

  // Helper to call broadcastCartUpdate after state changes
  const triggerBroadcastUpdate = useCallback(() => {
    // Use setTimeout to ensure state updates have been processed before broadcasting
    setTimeout(() => broadcastCartUpdate(), 100);
  }, [broadcastCartUpdate]);


  const addToCart = useCallback((product: Product) => {
    console.log("🛒 Adding product to cart:", product.name, "Price:", product.afterTaxPrice || product.price);

    const effectivePrice = parseFloat(product.afterTaxPrice || product.price);
    const taxRate = parseFloat(product.taxRate || '0');

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);

      let updatedCart;
      if (existingItem) {
        updatedCart = prevCart.map(item =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: ((item.quantity + 1) * effectivePrice).toString()
              }
            : item
        );
        console.log("🛒 Updated existing item in cart");
      } else {
        const newItem: CartItem = {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: effectivePrice.toString(),
          quantity: 1,
          total: effectivePrice.toString(),
          taxRate: taxRate.toString(),
          product: product
        };
        updatedCart = [...prevCart, newItem];
        console.log("🛒 Added new item to cart");
      }

      // Broadcast cart update after state change
      setTimeout(() => broadcastCartUpdate(), 100);

      return updatedCart;
    });
  }, [broadcastCartUpdate]);

  const removeFromCart = useCallback((id: string) => {
    console.log("🗑️ Removing item from cart:", id);
    setCart(prevCart => {
      const updatedCart = prevCart.filter(item => item.id !== id);

      // Broadcast cart update after state change
      setTimeout(() => broadcastCartUpdate(), 100);

      return updatedCart;
    });
  }, [broadcastCartUpdate]);

  const updateQuantity = useCallback((id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    console.log("📝 Updating quantity for item:", id, "New quantity:", newQuantity);

    setCart(prevCart => {
      const updatedCart = prevCart.map(item => {
        if (item.id === id) {
          const effectivePrice = parseFloat(item.price);
          const newTotal = (effectivePrice * newQuantity).toString();
          console.log("📝 Updated item total:", newTotal);
          return {
            ...item,
            quantity: newQuantity,
            total: newTotal
          };
        }
        return item;
      });

      // Broadcast cart update after state change
      setTimeout(() => broadcastCartUpdate(), 100);

      return updatedCart;
    });
  }, [broadcastCartUpdate]);

  const clearCart = useCallback(() => {
    console.log("🧹 Clearing cart");
    setCart([]);

    // Broadcast empty cart update
    setTimeout(() => broadcastCartUpdate(), 100);
  }, [broadcastCartUpdate]);


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

      // CRITICAL: Clear cart immediately after successful payment
      console.log("🧹 POS: Clearing cart after successful payment");
      onClearCart();

      // Clear any active orders
      if (typeof window !== 'undefined' && (window as any).clearActiveOrder) {
        (window as any).clearActiveOrder();
      }

      // Reset states
      setPreviewReceipt(null);
      setOrderForPayment(null);
      setLastCartItems([]);

      // Show final receipt if needed
      if (data.shouldShowReceipt !== false) {
        console.log("📋 POS: Showing final receipt modal");
        setSelectedReceipt(data.receipt || null);
        setShowReceiptModal(true);
      }

      // Send WebSocket signal for refresh
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'payment_success',
            success: true,
            source: 'shopping-cart',
            timestamp: new Date().toISOString()
          }));
          setTimeout(() => ws.close(), 100);
        };
      } catch (error) {
        console.warn("⚠️ WebSocket signal failed (non-critical):", error);
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

  const handleEInvoiceConfirm = (invoiceData: any) => {
    console.log("🎯 POS: E-Invoice confirmed in shopping cart:", invoiceData);

    if (!invoiceData) {
      console.error("❌ No invoice data received");
      toast({
        title: "Lỗi",
        description: "Không nhận được dữ liệu hóa đơn",
        variant: "destructive",
      });
      return;
    }

    // Close E-Invoice modal immediately
    setShowEInvoiceModal(false);
    setIsProcessingPayment(false);

    // Show success message based on action type
    if (invoiceData.publishLater) {
      toast({
        title: "Thành công",
        description: "Hóa đơn đã được lưu để phát hành sau",
      });
    } else {
      toast({
        title: "Thành công",
        description: "Hóa đơn điện tử đã được phát hành thành công",
      });
    }

    // Prepare receipt data exactly like table grid
    let subtotal = 0;
    let totalTax = 0;

    const currentOrderItems = lastCartItems.length > 0 ? lastCartItems :
                             orderForPayment?.items || cart;

    if (Array.isArray(currentOrderItems) && Array.isArray(products)) {
      currentOrderItems.forEach((item: any) => {
        const basePrice = Number(item.price || 0);
        const quantity = Number(item.quantity || 0);
        const product = products.find((p: any) => p.id === item.id);

        // Calculate subtotal (base price without tax)
        subtotal += basePrice * quantity;

        // Use EXACT same tax calculation logic as table grid
        if (
          product?.afterTaxPrice &&
          product.afterTaxPrice !== null &&
          product.afterTaxPrice !== ""
        ) {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const taxPerUnit = afterTaxPrice - basePrice;
          totalTax += taxPerUnit * quantity;
        }
      });
    }

    const finalTotal = subtotal + totalTax;

    // Create proper receipt data with calculated values
    const receiptData = {
      transactionId: invoiceData.transactionId || `TXN-${Date.now()}`,
      invoiceNumber: invoiceData.invoiceNumber,
      createdAt: new Date().toISOString(),
      cashierName: "Nhân viên",
      customerName: invoiceData.customerName || "Khách hàng lẻ",
      customerTaxCode: invoiceData.taxCode,
      paymentMethod: "einvoice",
      originalPaymentMethod: selectedPaymentMethod || "cash",
      amountReceived: Math.floor(finalTotal).toString(),
      change: "0.00",
      items: currentOrderItems.map((item: any) => ({
        id: item.id,
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price.toString(),
        total: (parseFloat(item.price) * item.quantity).toString(),
        sku: item.sku || `ITEM${String(item.id).padStart(3, "0")}`,
        taxRate: item.taxRate || 0,
      })),
      subtotal: Math.floor(subtotal).toString(),
      tax: Math.floor(totalTax).toString(),
      total: Math.floor(finalTotal).toString(),
    };

    console.log("📄 POS: Showing receipt modal after E-invoice with proper data");
    console.log("💰 Receipt data:", {
      itemsCount: receiptData.items.length,
      subtotal: receiptData.subtotal,
      tax: receiptData.tax,
      total: receiptData.total,
    });

    // Set receipt data and show modal immediately
    setSelectedReceipt(receiptData);
    setShowReceiptModal(true);

    // Close other modals
    setShowPaymentModal(false);
    setShowReceiptPreview(false);
    setShowPaymentMethodModal(false);

    console.log("✅ POS: Receipt modal displayed immediately after E-invoice");

    // Clear cart after receipt modal is shown
    setTimeout(() => {
      console.log("🧹 POS: Clearing cart after receipt modal is displayed");
      onClearCart();

      // Clear any active orders
      if (typeof window !== 'undefined' && (window as any).clearActiveOrder) {
        (window as any).clearActiveOrder();
      }
    }, 100);
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
                        {t("pos.tax")}:{" "}
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
                        updateQuantity(item.id, item.quantity - 1)
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
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="w-6 h-6 p-0"
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus size={10} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFromCart(item.id)}
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
              <span className="pos-text-secondary">{t("pos.tax")}:</span>
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
            {isProcessing ? t("tables.placing") : t("pos.checkout")}
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
                taxRate: item.taxRate || 0,
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
      {(showReceiptModal || selectedReceipt) && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            console.log('🔄 Shopping Cart: Receipt modal closing, clearing cart and sending refresh signal');

            // Close modal and clear states
            setShowReceiptModal(false);
            setSelectedReceipt(null);
            setLastCartItems([]);
            setOrderForPayment(null);
            setPreviewReceipt(null);
            setIsProcessingPayment(false);

            // Clear cart
            onClearCart();

            // Clear any active orders
            if (typeof window !== 'undefined' && (window as any).clearActiveOrder) {
              (window as any).clearActiveOrder();
            }

            // Broadcast empty cart
            broadcastCartUpdate();

            // Send popup close signal to refresh other components
            try {
              const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
              const wsUrl = `${protocol}//${window.location.host}/ws`;
              const ws = new WebSocket(wsUrl);

              ws.onopen = () => {
                ws.send(JSON.stringify({
                  type: 'popup_close',
                  success: true,
                  source: 'shopping-cart',
                  timestamp: new Date().toISOString()
                }));
                ws.close();
              };
            } catch (error) {
              console.error('❌ Shopping Cart: Failed to send refresh signal:', error);
            }

            console.log('✅ Shopping Cart: Receipt modal closed and refresh signal sent');
          }}
          receipt={selectedReceipt}
          cartItems={selectedReceipt?.items || lastCartItems.map((item) => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            sku: item.sku || `ITEM${String(item.id).padStart(3, "0")}`,
            taxRate: parseFloat(item.taxRate || "0"),
          })) || cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            sku: `ITEM${String(item.id).padStart(3, "0")}`,
            taxRate: parseFloat(item.taxRate || "0"),
          }))}
        />
      )}

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

            return Math.floor(totalToUse || 0);
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