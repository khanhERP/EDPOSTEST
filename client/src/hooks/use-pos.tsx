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
        paymentMethod: paymentData.paymentMethod,
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

    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    setActiveOrderId(orders[0].id);
  };

  // Mock productsQuery for the sake of the example, as it's not provided in the original code.
  // In a real scenario, this would come from a data fetching hook like useQuery.
  const productsQuery = {
    data: [
      { id: 1, name: "Product A", price: "10.00", stock: 5, taxRate: "0.10" },
      { id: 2, name: "Product B", price: "20.00", stock: 10, taxRate: "0.05" },
    ],
  };

  const addToCart = (productId: number) => {
    const product = productsQuery.data?.find(p => p.id === productId);
    if (!product) return;

    setOrders(prev => prev.map(order => {
      if (order.id !== activeOrderId) return order;

      const existingItem = order.cart.find(item => item.id === productId);
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        const unitPrice = parseFloat(existingItem.price);
        const newTotal = (unitPrice * newQuantity).toFixed(2);

        return {
          ...order,
          cart: order.cart.map(item =>
            item.id === productId
              ? { 
                  ...item, 
                  quantity: newQuantity,
                  total: newTotal
                }
              : item
          )
        };
      } else {
        const unitPrice = parseFloat(product.price);
        const newItem: CartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
          taxRate: product.taxRate || "0",
          total: unitPrice.toFixed(2)
        };
        return {
          ...order,
          cart: [...order.cart, newItem]
        };
      }
    }));
    toast({
      title: "Đã thêm vào giỏ",
      description: `${product.name} đã được thêm vào đơn hàng`,
    });
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

    setOrders(prev => prev.map(order => {
      if (order.id !== activeOrderId) return order;

      return {
        ...order,
        cart: order.cart.map(item =>
          item.id === productId
            ? { 
                ...item, 
                quantity: newQuantity,
                total: (parseFloat(item.price) * newQuantity).toFixed(2)
              }
            : item
        )
      };
    }));
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