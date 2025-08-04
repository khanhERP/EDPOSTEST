import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { CartItem, Receipt } from "@shared/schema";

export function usePOS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const { toast } = useToast();

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
      setCart([]);
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

  const addToCart = async (productId: number) => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error("Product not found");
      
      const product = await response.json();
      
      if (product.stock <= 0) {
        toast({
          title: "Out of Stock",
          description: `${product.name} is currently out of stock`,
          variant: "destructive",
        });
        return;
      }

      setCart(currentCart => {
        const existingItem = currentCart.find(item => item.id === productId);
        
        if (existingItem) {
          if (existingItem.quantity >= product.stock) {
            toast({
              title: "Stock Limit Reached",
              description: `Cannot add more ${product.name}. Only ${product.stock} available.`,
              variant: "destructive",
            });
            return currentCart;
          }
          
          const newQuantity = existingItem.quantity + 1;
          const newTotal = (parseFloat(product.price) * newQuantity).toFixed(2);
          
          return currentCart.map(item =>
            item.id === productId
              ? { ...item, quantity: newQuantity, total: newTotal }
              : item
          );
        } else {
          const newItem: CartItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            total: product.price,
            imageUrl: product.imageUrl,
            stock: product.stock,
          };
          return [...currentCart, newItem];
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product to cart",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(currentCart =>
      currentCart.map(item => {
        if (item.id === productId) {
          if (newQuantity > item.stock) {
            toast({
              title: "Stock Limit Reached",
              description: `Cannot set quantity to ${newQuantity}. Only ${item.stock} available.`,
              variant: "destructive",
            });
            return item;
          }
          
          const newTotal = (parseFloat(item.price) * newQuantity).toFixed(2);
          return { ...item, quantity: newQuantity, total: newTotal };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
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
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    lastReceipt,
    isProcessingCheckout: checkoutMutation.isPending,
    processCheckout,
  };
}
