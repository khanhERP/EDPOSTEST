import { useState } from "react";
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
      const transactionId = `TXN-${Date.now()}`;
      const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
      const taxRate = 0.0825;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      const transaction = {
        transactionId,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: paymentData.paymentMethod === 'einvoice' ? 'einvoice' : paymentData.paymentMethod,
        originalPaymentMethod: paymentData.originalPaymentMethod || paymentData.paymentMethod,
        amountReceived: paymentData.amountReceived?.toFixed(2) || null,
        change: paymentData.change?.toFixed(2) || null,
        cashierName: "John Smith",
      };

      const items = cart.map(item => ({
        productId: item.id,
        productName: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
      }));

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction, items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process transaction");
      }

      return response.json();
    },
    onSuccess: (receipt) => {
      setLastReceipt(receipt);
      updateActiveOrderCart([]);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Transaction Complete",
        description: `Transaction ${receipt.transactionId} processed successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transaction Failed",
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
    updateActiveOrderCart([]);
  };

  const processCheckout = async (paymentData: any): Promise<Receipt | null> => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Cannot process checkout with empty cart",
        variant: "destructive",
      });
      return null;
    }

    try {
      const result = await checkoutMutation.mutateAsync({ paymentData });
      return result;
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