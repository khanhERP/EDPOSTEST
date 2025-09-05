import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { CartItem, Receipt } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

interface Order {
  id: string;
  cart: CartItem[];
}

export function usePOS() {
  const [orders, setOrders] = useState<Order[]>([{ id: uuidv4(), cart: [] }]);
  const [activeOrderId, setActiveOrderId] = useState<string>(orders[0].id);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const { toast } = useToast();

  const cart = orders.find(order => order.id === activeOrderId)?.cart || [];

  const checkoutMutation = useMutation({
    mutationFn: async ({ paymentData }: { paymentData: any }) => {
      const orderNumber = `ORD-${Date.now()}`;
      const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
      
      // Calculate tax from products with afterTaxPrice
      let tax = 0;
      cart.forEach(item => {
        if (item.afterTaxPrice) {
          const afterTaxPrice = parseFloat(item.afterTaxPrice);
          const price = parseFloat(item.price);
          const taxPerUnit = afterTaxPrice - price;
          tax += taxPerUnit * item.quantity;
        }
      });
      
      const total = subtotal + tax;

      const orderData = {
        orderNumber,
        tableId: null, // POS orders don't have tables
        employeeId: null,
        status: paymentData.paymentMethod === 'einvoice' ? 'served' : 'paid', // E-invoice orders start as served
        customerName: "Khách hàng",
        customerCount: 1,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: paymentData.paymentMethod === 'einvoice' ? paymentData.originalPaymentMethod || 'cash' : paymentData.paymentMethod,
        paymentStatus: paymentData.paymentMethod === 'einvoice' ? 'pending' : 'paid',
        salesChannel: 'pos', // Mark as POS order - ALWAYS pos for POS transactions
        einvoiceStatus: paymentData.einvoiceStatus || 0,
        templateNumber: paymentData.templateNumber || null,
        symbol: paymentData.symbol || null,
        invoiceNumber: paymentData.invoiceNumber || null,
        notes: `POS Order - ${paymentData.cashierName || 'System'}`,
        paidAt: paymentData.paymentMethod !== 'einvoice' ? new Date() : null,
      };

      const items = cart.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.total,
        notes: null,
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderData, items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process order");
      }

      return response.json();
    },
    onSuccess: (order) => {
      // Convert order to receipt format for compatibility
      const receipt = {
        id: order.id,
        transactionId: order.orderNumber,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        paymentMethod: order.paymentMethod,
        cashierName: "POS System",
        notes: order.notes,
        createdAt: order.orderedAt,
        items: cart.map((item, index) => ({
          id: index + 1,
          transactionId: order.id,
          productId: item.id,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
        })),
      };
      
      setLastReceipt(receipt);
      updateActiveOrderCart([]);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // Dispatch events for real-time updates
      if (typeof window !== 'undefined') {
        const events = [
          new CustomEvent('newOrderCreated', {
            detail: { orderId: order.id, salesChannel: 'pos' }
          }),
          new CustomEvent('refreshOrders', {
            detail: { immediate: true }
          })
        ];
        events.forEach(event => window.dispatchEvent(event));
      }
      
      toast({
        title: "Đơn hàng hoàn tất",
        description: `Đơn hàng ${order.orderNumber} đã được xử lý thành công`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Đơn hàng thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateActiveOrderCart = (newCart: CartItem[]) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === activeOrderId ? { ...order, cart: newCart } : order
      )
    );
  };


  const createNewOrder = () => {
    const newOrderId = uuidv4();
    setOrders([...orders, { id: newOrderId, cart: [] }]);
    setActiveOrderId(newOrderId);
  };

  const switchOrder = (orderId: string) => {
    setActiveOrderId(orderId);
  };

  const removeOrder = (orderId: string) => {
    if (orders.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "Must have at least one order.",
        variant: "destructive",
      });
      return;
    }

    const filteredOrders = orders.filter(order => order.id !== orderId);
    setOrders(filteredOrders);

    // If removing active order, switch to first remaining order
    if (orderId === activeOrderId) {
      setActiveOrderId(filteredOrders[0].id);
    }
  };

  const addToCart = async (productId: number) => {
    // Ensure we have a valid active order
    const activeOrder = orders.find(order => order.id === activeOrderId);
    if (!activeOrder) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy đơn hàng hiện tại",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch product data by ID
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error('Product not found');
      const product = await response.json();

      console.log("Fetched product for cart:", product);

      const currentCart = activeOrder.cart || [];
      const existingItem = currentCart.find(item => item.id === product.id);

      // Check if product has stock tracking enabled and if so, check stock
      if (product.trackInventory !== false && product.stock <= 0) {
        toast({
          title: "Không thể thêm",
          description: "Sản phẩm đã hết hàng",
          variant: "destructive",
        });
        return;
      }

      let newCart;
      if (existingItem) {
        if (product.trackInventory !== false && existingItem.quantity >= product.stock) {
          toast({
            title: "Không thể thêm",
            description: "Đã đạt số lượng tối đa trong kho",
            variant: "destructive",
          });
          return;
        }
        newCart = currentCart.map(item =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (parseFloat(item.price) * (item.quantity + 1)).toFixed(2)
              }
            : item
        );
      } else {
        const cartItem = {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price).toFixed(2),
          quantity: 1,
          total: parseFloat(product.price).toFixed(2),
          stock: product.stock,
          taxRate: product.taxRate || "0",
          afterTaxPrice: product.afterTaxPrice || undefined
        };

        console.log("Creating cart item:", cartItem);
        newCart = [...currentCart, cartItem];
      }

      updateActiveOrderCart(newCart);
      toast({
        title: "Đã thêm vào giỏ",
        description: `${product.name} đã được thêm vào đơn hàng`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm sản phẩm vào giỏ hàng",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = (productId: number) => {
    const currentCart = orders.find(order => order.id === activeOrderId)?.cart || [];
    const newCart = currentCart.filter(item => item.id !== productId);
    updateActiveOrderCart(newCart);
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const currentCart = orders.find(order => order.id === activeOrderId)?.cart || [];
    const newCart = currentCart.map(item =>
      item.id === productId
        ? {
            ...item,
            quantity: newQuantity,
            total: (parseFloat(item.price) * newQuantity).toFixed(2)
          }
        : item
    );
    updateActiveOrderCart(newCart);
  };

  const clearCart = () => {
    console.log("🗑️ POS: Clearing cart");
    setOrders((prevOrders) => {
      const updatedOrders = prevOrders.map((order) => {
        if (order.id === activeOrderId) {
          return { ...order, cart: [] };
        }
        return order;
      });

      console.log("🗑️ POS: Cart cleared for active order:", activeOrderId);
      return updatedOrders;
    });
  };

  // Expose clearCart globally for other components to use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clearActiveOrder = clearCart;
      (window as any).posGlobalClearCart = clearCart;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).clearActiveOrder;
        delete (window as any).posGlobalClearCart;
      }
    };
  }, [clearCart]);

  const processCheckout = async (paymentData: any): Promise<Receipt | null> => {
    if (cart.length === 0) {
      toast({
        title: "Giỏ hàng trống",
        description: "Không thể thanh toán với giỏ hàng trống",
        variant: "destructive",
      });
      return null;
    }

    try {
      const result = await checkoutMutation.mutateAsync({ paymentData });
      // Convert order to receipt format
      const receipt = {
        id: result.id,
        transactionId: result.orderNumber,
        subtotal: result.subtotal,
        tax: result.tax,
        total: result.total,
        paymentMethod: result.paymentMethod,
        cashierName: "POS System",
        notes: result.notes,
        createdAt: result.orderedAt,
        items: cart.map((item, index) => ({
          id: index + 1,
          transactionId: result.id,
          productId: item.id,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
        })),
      };
      return receipt;
    } catch (error) {
      return null;
    }
  };

  return {
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
    isProcessingCheckout: checkoutMutation.isPending,
    processCheckout
  };
}