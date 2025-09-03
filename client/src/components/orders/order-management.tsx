import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, Clock, CheckCircle2, DollarSign, Users, CreditCard, QrCode, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { PaymentMethodModal } from "@/components/pos/payment-method-modal";
import { EInvoiceModal } from "@/components/pos/einvoice-modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import QRCodeLib from "qrcode";
import type { Order, Table, Product, OrderItem } from "@shared/schema";

export function OrderManagement() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [orderForPayment, setOrderForPayment] = useState<Order | null>(null);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [pointsPaymentOpen, setPointsPaymentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [pointsAmount, setPointsAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mixedPaymentOpen, setMixedPaymentOpen] = useState(false);
  const [mixedPaymentData, setMixedPaymentData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const [shouldOpenReceiptPreview, setShouldOpenReceiptPreview] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Effect to handle opening the receipt preview modal
  useEffect(() => {
    if (shouldOpenReceiptPreview && previewReceipt && orderForPayment) {
      console.log('🚀 Receipt preview modal should now be open');
      setShowReceiptPreview(true);
      setShouldOpenReceiptPreview(false); // Reset the flag
    }
  }, [shouldOpenReceiptPreview, previewReceipt, orderForPayment]);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders'],
    refetchInterval: 5000, // Refetch every 5 seconds for faster updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Always consider data fresh to force immediate updates
    onSuccess: (data) => {
      console.log(`🔍 DEBUG: Orders query onSuccess called:`, {
        ordersCount: data?.length || 0,
        timestamp: new Date().toISOString(),
        firstFewOrders: data?.slice(0, 3)?.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          tableId: o.tableId
        }))
      });
    },
    onError: (error) => {
      console.error(`❌ DEBUG: Orders query onError:`, error);
    }
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/tables'],
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
    enabled: pointsPaymentOpen,
  });

  const { data: orderItems, isLoading: orderItemsLoading } = useQuery({
    queryKey: ['/api/order-items', selectedOrder?.id],
    enabled: !!selectedOrder?.id && orderDetailsOpen,
    queryFn: async () => {
      if (!selectedOrder?.id) return [];
      const response = await apiRequest('GET', `/api/order-items/${selectedOrder.id}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      apiRequest('PUT', `/api/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: t('common.success'),
        description: t('orders.orderStatusUpdated'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('orders.orderStatusUpdateFailed'),
        variant: "destructive",
      });
    },
  });

  const completePaymentMutation = useMutation({
    mutationFn: async ({ orderId, paymentMethod }: { orderId: number; paymentMethod: string }) => {
      console.log('🎯 completePaymentMutation called - using centralized payment completion');
      console.log('📋 Order Management: Starting payment completion for order:', orderId);
      return await completeOrderPayment(orderId, { paymentMethod });
    },
    onSuccess: async (result, variables) => {
      console.log('🎯 Order Management completePaymentMutation.onSuccess called');

      // Force immediate refresh first
      for (let i = 0; i < 3; i++) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
          queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
          queryClient.refetchQueries({ queryKey: ['/api/tables'] })
        ]);

        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      toast({
        title: 'Thanh toán thành công',
        description: 'Đơn hàng đã được thanh toán',
      });

      // Dispatch immediate UI refresh events
      if (typeof window !== 'undefined') {
        const events = [
          new CustomEvent('orderStatusUpdated', {
            detail: {
              orderId: variables.orderId,
              status: 'paid',
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('paymentCompleted', {
            detail: {
              orderId: variables.orderId,
              paymentMethod: variables.paymentMethod,
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('forceRefresh', {
            detail: {
              reason: 'payment_completed',
              orderId: variables.orderId,
              immediate: true
            }
          })
        ];

        events.forEach(event => {
          console.log("📡 Dispatching immediate UI refresh event:", event.type, event.detail);
          window.dispatchEvent(event);
        });
      }

      // Fetch the completed order and its items for receipt
      try {
        const [completedOrder, orderItemsData] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ['/api/orders', variables.orderId],
            queryFn: async () => {
              const response = await apiRequest('GET', `/api/orders/${variables.orderId}`);
              return response.json();
            }
          }),
          queryClient.fetchQuery({
            queryKey: ['/api/order-items', variables.orderId],
            queryFn: async () => {
              const response = await apiRequest('GET', `/api/order-items/${variables.orderId}`);
              return response.json();
            }
          })
        ]);

        if (completedOrder && orderItemsData) {
          console.log('✅ Order Management payment completed - preparing receipt data');

          // Use EXACT same calculation logic as Order Details display
          let subtotal = 0;
          let totalTax = 0;

          const processedItems = Array.isArray(orderItemsData) ? orderItemsData.map((item: any) => {
            const basePrice = Number(item.unitPrice || 0);
            const quantity = Number(item.quantity || 0);
            const product = Array.isArray(products) ? products.find((p: any) => p.id === item.productId) : null;

            // Calculate subtotal exactly as Order Details display
            const itemSubtotal = basePrice * quantity;
            subtotal += itemSubtotal;

            // Tax = (after_tax_price - price) * quantity
            let itemTax = 0;
            if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
              const afterTaxPrice = parseFloat(product.afterTaxPrice);
              const price = parseFloat(product.price);
              itemTax = (afterTaxPrice - price) * quantity;
              totalTax += itemTax;
            }

            return {
              id: item.id,
              productId: item.productId,
              productName: item.productName || getProductInfo(item.productId)?.name || 'Unknown Product',
              quantity: item.quantity,
              price: item.unitPrice,
              total: item.total,
              sku: item.productSku || `SP${item.productId}`,
              taxRate: product?.taxRate ? parseFloat(product.taxRate) : 10
            };
          }) : [];

          const finalTotal = subtotal + totalTax;

          // Create comprehensive receipt object
          const receiptData = {
            ...completedOrder,
            orderId: variables.orderId, // Include orderId for status tracking
            transactionId: `TXN-${Date.now()}`,
            items: processedItems,
            subtotal: subtotal.toFixed(2),
            tax: totalTax.toFixed(2),
            total: finalTotal.toFixed(2),
            paymentMethod: variables.paymentMethod || 'cash',
            amountReceived: finalTotal.toFixed(2),
            change: '0.00',
            cashierName: 'Order Management',
            createdAt: new Date().toISOString()
          };

          console.log('📄 Order Management receipt data prepared:', receiptData);

          // Close all dialogs first
          setOrderDetailsOpen(false);
          setPaymentMethodsOpen(false);
          setShowPaymentMethodModal(false);
          setShowEInvoiceModal(false);
          setShowReceiptPreview(false);
          setPreviewReceipt(null);
          setSelectedOrder(null);
          setOrderForPayment(null);

          // Show receipt modal - this will handle auto-print and auto-close
          setSelectedReceipt(receiptData);
          setShowReceiptModal(true);
        }
      } catch (error) {
        console.error('Error fetching order details for receipt:', error);
        // Still close all modals even if receipt fails
        setOrderDetailsOpen(false);
        setPaymentMethodsOpen(false);
        setShowPaymentMethodModal(false);
        setShowEInvoiceModal(false);
        setShowReceiptPreview(false);
        setPreviewReceipt(null);
        setSelectedOrder(null);
        setOrderForPayment(null);

        toast({
          title: 'Thanh toán thành công',
          description: 'Đơn hàng đã được thanh toán. Hóa đơn sẽ được in tự động.',
        });
      }
    },
    onError: (error) => {
      console.log('❌ Order Management completePaymentMutation.onError called:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể hoàn tất thanh toán',
        variant: "destructive",
      });
      setOrderForPayment(null);
    },
  });

  const pointsPaymentMutation = useMutation({
    mutationFn: async ({ customerId, points, orderId, paymentMethod, remainingAmount }: {
      customerId: number;
      points: number;
      orderId: number;
      paymentMethod?: string;
      remainingAmount?: number;
    }) => {
      // First redeem points
      await apiRequest('POST', '/api/customers/redeem-points', {
        customerId,
        points
      });

      // Then mark order as paid
      await apiRequest('PUT', `/api/orders/${orderId}/status`, {
        status: 'paid',
        paymentMethod: paymentMethod || 'points',
        customerId,
        remainingAmount: remainingAmount || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setOrderDetailsOpen(false);
      setPointsPaymentOpen(false);
      setSelectedCustomer(null);
      setPointsAmount("");
      setSearchTerm("");
      toast({
        title: t('common.success'),
        description: t('orders.pointsPaymentTitle'),
      });
    },
    onError: () => {
      toast({
        title: 'Lỗi',
        description: 'Không thể hoàn tất thanh toán bằng điểm',
        variant: "destructive",
      });
    },
  });

  const mixedPaymentMutation = useMutation({
    mutationFn: async ({ customerId, points, orderId, paymentMethod }: {
      customerId: number;
      points: number;
      orderId: number;
      paymentMethod: string;
    }) => {
      // First redeem all available points
      await apiRequest('POST', '/api/customers/redeem-points', {
        customerId,
        points
      });

      // Then mark order as paid with mixed payment
      await apiRequest('PUT', `/api/orders/${orderId}/status`, {
        status: 'paid',
        paymentMethod: `points + ${paymentMethod}`,
        customerId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setOrderDetailsOpen(false);
      setMixedPaymentOpen(false);
      setMixedPaymentData(null);
      setSelectedCustomer(null);
      setPointsAmount("");
      setSearchTerm("");
      toast({
        title: 'Thanh toán thành công',
        description: 'Đơn hàng đã được thanh toán bằng điểm + tiền mặt/chuyển khoản',
      });
    },
    onError: () => {
      toast({
        title: 'Lỗi',
        description: 'Không thể hoàn tất thanh toán hỗn hợp',
        variant: 'destructive',
      });
    },
  });

  const getOrderStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: t('orders.status.pending'), variant: "secondary" as const, color: "bg-yellow-500" },
      confirmed: { label: t('orders.status.confirmed'), variant: "default" as const, color: "bg-blue-500" },
      preparing: { label: t('orders.status.preparing'), variant: "destructive" as const, color: "bg-orange-500" },
      ready: { label: t('orders.status.ready'), variant: "outline" as const, color: "bg-green-500" },
      served: { label: t('orders.status.served'), variant: "outline" as const, color: "bg-green-600" },
      paid: { label: t('orders.status.paid'), variant: "outline" as const, color: "bg-gray-500" },
      cancelled: { label: t('orders.status.cancelled'), variant: "destructive" as const, color: "bg-red-500" },
    };

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const getTableInfo = (tableId: number) => {
    if (!tables) return null;
    return (tables as Table[]).find((table: Table) => table.id === tableId);
  };

  const getProductInfo = (productId: number) => {
    if (!products) return null;
    return (products as Product[]).find((product: Product) => product.id === productId);
  };

  // CENTRALIZED payment completion function - all payment flows go through here
  const completeOrderPayment = async (orderId: number, paymentData: any) => {
    console.log('🎯 CENTRALIZED Payment Completion - Order ID:', orderId, 'Payment Data:', paymentData);

    try {
      // Step 1: Update order status to 'paid' - THIS IS THE CRITICAL STEP
      console.log('📋 Step 1: Updating order status to PAID for order:', orderId);

      console.log('🔍 API Call Details:', {
        url: `/api/orders/${orderId}/status`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      });

      const statusResponse = await apiRequest('PUT', `/api/orders/${orderId}/status`, { status: 'paid' });

      console.log('🔍 API Response Status:', statusResponse.status, statusResponse.statusText);

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('❌ API Response Error:', errorText);
        throw new Error(`Failed to update order status: ${errorText}`);
      }

      const updatedOrder = await statusResponse.json();
      console.log('✅ Step 1 COMPLETED: Order status updated to PAID:', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        tableId: updatedOrder.tableId,
        status: updatedOrder.status,
        paidAt: updatedOrder.paidAt,
        updated: updatedOrder.updated,
        previousStatus: updatedOrder.previousStatus
      });

      // Step 2: Update additional payment details
      console.log('📋 Step 2: Updating payment details for order:', orderId);

      const paymentDetailsResponse = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: paymentData.paymentMethod || 'cash',
          einvoiceStatus: paymentData.einvoiceStatus || 0,
          paidAt: new Date().toISOString(),
          invoiceNumber: paymentData.invoiceNumber || null,
          symbol: paymentData.symbol || null,
          templateNumber: paymentData.templateNumber || null
        })
      });

      if (!paymentDetailsResponse.ok) {
        console.warn('⚠️ Step 2 FAILED: Could not update payment details, but order is already PAID');
      } else {
        console.log('✅ Step 2 COMPLETED: Payment details updated');
      }

      // Step 3: Refresh UI and trigger events
      console.log('📋 Step 3: Refreshing UI and triggering events');

      // Force immediate refresh with multiple attempts (5 times)
      for (let i = 0; i < 5; i++) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
          queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
          queryClient.refetchQueries({ queryKey: ['/api/tables'] })
        ]);

        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between attempts
        }
      }

      // Force additional refreshes with different intervals
      const intervals = [300, 600, 1000, 1500, 2000];
      intervals.forEach((delay, index) => {
        setTimeout(async () => {
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
            queryClient.refetchQueries({ queryKey: ['/api/tables'] })
          ]);
          console.log(`🔄 Delayed refresh ${index + 1} completed after ${delay}ms`);
        }, delay);
      });

      // Dispatch events for real-time updates
      if (typeof window !== 'undefined') {
        const events = [
          new CustomEvent('orderStatusUpdated', {
            detail: {
              orderId,
              status: 'paid',
              previousStatus: updatedOrder.previousStatus || 'served',
              tableId: updatedOrder.tableId,
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('refreshOrders', {
            detail: { immediate: true, orderId, newStatus: 'paid' }
          }),
          new CustomEvent('refreshTables', {
            detail: { immediate: true, tableId: updatedOrder.tableId }
          }),
          new CustomEvent('paymentCompleted', {
            detail: { orderId, tableId: updatedOrder.tableId }
          }),
          new CustomEvent('tableStatusUpdate', {
            detail: { tableId: updatedOrder.tableId, checkForRelease: true }
          }),
          new CustomEvent('forceRefresh', {
            detail: { reason: 'payment_completed', orderId }
          })
        ];

        events.forEach(event => {
          console.log("📡 Dispatching event:", event.type, event.detail);
          window.dispatchEvent(event);
        });
      }

      console.log('✅ Step 3 COMPLETED: UI refreshed and events dispatched');
      console.log('🎉 PAYMENT COMPLETION SUCCESS - Order', orderId, 'is now PAID');

      return { success: true, order: updatedOrder };

    } catch (error) {
      console.error('❌ PAYMENT COMPLETION FAILED for order', orderId, ':', error);
      throw error;
    }
  };

  // Handle E-invoice confirmation and complete payment
  const handleEInvoiceConfirm = async (invoiceData: any) => {
    console.log('🎯 Order Management handleEInvoiceConfirm called with data:', invoiceData);

    if (!orderForPayment) {
      console.error('❌ No order for payment found');
      toast({
        title: 'Lỗi',
        description: 'Không tìm thấy đơn hàng để thanh toán',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Use centralized payment completion function
      await completeOrderPayment(orderForPayment.id, {
        paymentMethod: invoiceData.originalPaymentMethod || 'einvoice',
        einvoiceStatus: invoiceData.publishLater ? 0 : 1,
        invoiceNumber: invoiceData.invoiceNumber,
        symbol: invoiceData.symbol,
        templateNumber: invoiceData.templateNumber
      });

      toast({
        title: 'Thành công',
        description: invoiceData.publishLater
          ? 'Đơn hàng đã được thanh toán và lưu để phát hành hóa đơn sau'
          : 'Đơn hàng đã được thanh toán và hóa đơn điện tử đã được phát hành',
      });

      // Close all modals first
      setShowEInvoiceModal(false);
      setOrderForPayment(null);
      setOrderDetailsOpen(false);
      setSelectedOrder(null);

      // Show receipt if available - this will auto-close after printing
      if (invoiceData.receipt) {
        console.log('📄 Showing receipt modal after successful payment');
        setSelectedReceipt(invoiceData.receipt);
        setShowReceiptModal(true);
      }

    } catch (error) {
      console.error('❌ Error during payment completion:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể hoàn tất thanh toán. Vui lòng thử lại.',
        variant: 'destructive',
      });

      // Reset states
      setOrderForPayment(null);
      setShowEInvoiceModal(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0 ₫';
    }
    // Always round to integer and format without decimals
    return `${Math.floor(amount).toLocaleString('vi-VN')} ₫`;
  };

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const currentLanguage = localStorage.getItem('language') || 'ko';

    const localeMap = {
      ko: 'ko-KR',
      en: 'en-US',
      vi: 'vi-VN'
    };

    return date.toLocaleTimeString(localeMap[currentLanguage as keyof typeof localeMap] || 'ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      console.log(`🔄 Order Management: Updating order ${orderId} status to ${newStatus}`);
      console.log(`🔍 DEBUG: Frontend status update details:`, {
        orderId: orderId,
        orderIdType: typeof orderId,
        orderIdValid: !isNaN(orderId) && orderId > 0,
        newStatus: newStatus,
        statusType: typeof newStatus,
        statusValid: newStatus && newStatus.trim().length > 0,
        timestamp: new Date().toISOString()
      });

      console.log(`🔍 DEBUG: Current orders state before update:`, {
        ordersCount: orders?.length || 0,
        currentOrderInState: orders?.find((o: any) => o.id === orderId),
        timestamp: new Date().toISOString()
      });

      console.log(`🚀 STARTING API CALL: updateOrderStatus for order ${orderId} to status ${newStatus}`);
      console.log(`🔍 DEBUG: About to call API endpoint: PUT /api/orders/${orderId}/status`);
      console.log(`🔍 DEBUG: Request payload:`, { status: newStatus });
      console.log(`🔍 DEBUG: Making API request to update order status...`);

      const startTime = Date.now();
      const response = await apiRequest('PUT', `/api/orders/${orderId}/status`, { status: newStatus });
      const endTime = Date.now();

      console.log(`⏱️ API CALL COMPLETED in ${endTime - startTime}ms for order ${orderId}`);

      console.log(`🔍 DEBUG: API Response details:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        console.log(`✅ Order Management: Status updated successfully:`, updatedOrder);
        console.log(`🔍 DEBUG: Updated order details:`, {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          previousStatus: updatedOrder.previousStatus,
          newStatus: updatedOrder.status,
          tableId: updatedOrder.tableId,
          paidAt: updatedOrder.paidAt,
          updateTimestamp: updatedOrder.updateTimestamp
        });

        // CRITICAL: Force immediate query refresh and UI update
        console.log(`🔄 FORCING immediate UI refresh after status update...`);

        // Invalidate and refetch queries immediately
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
          queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
          queryClient.refetchQueries({ queryKey: ['/api/tables'] })
        ]);

        console.log(`✅ Queries refreshed after status update`);

        // Force component re-render by checking if state was actually updated
        setTimeout(() => {
          console.log(`🔍 POST-UPDATE: Checking if orders state was updated:`, {
            ordersCount: orders?.length || 0,
            updatedOrderInState: orders?.find((o: any) => o.id === orderId),
            expectedStatus: newStatus,
            timestamp: new Date().toISOString()
          });
        }, 1000);

        toast({
          title: "Thành công",
          description: `Trạng thái đơn hàng đã được cập nhật thành ${newStatus}`,
        });
      } else {
        const errorText = await response.text();
        console.error(`❌ Order Management: Failed to update status:`, errorText);
        console.log(`🔍 DEBUG: API Error details:`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          orderId: orderId,
          requestedStatus: newStatus
        });

        toast({
          title: "Lỗi",
          description: "Không thể cập nhật trạng thái đơn hàng: " + errorText,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Order Management: Error updating order status:', error);
      console.log(`🔍 DEBUG: Exception details:`, {
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
        orderId: orderId,
        requestedStatus: newStatus,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng",
        variant: "destructive",
      });
    }
  };

  const handlePaymentClick = (order: Order) => {
    console.log('🎯 Payment button clicked for order:', order.id, order.orderNumber);
    setSelectedOrder(order);
    setOrderForPayment(order);
    setOrderDetailsOpen(true);
  };

  const handlePaymentMethodSelect = async (method: string, data?: any) => {
    console.log("🎯 Order Management payment method selected:", method, data);

    if (method === "paymentCompleted" && data?.success) {
      console.log('✅ Order Management: Payment completed successfully', data);

      try {
        // Refresh data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
          queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
          queryClient.refetchQueries({ queryKey: ['/api/tables'] })
        ]);

        console.log('✅ Order Management: Data refreshed after payment');

        toast({
          title: 'Thành công',
          description: data.publishLater
            ? 'Đơn hàng đã được thanh toán và lưu để phát hành hóa đơn sau'
            : 'Đơn hàng đã được thanh toán và hóa đơn điện tử đã được phát hành',
        });

        // Show receipt if available  
        if (data.receipt && data.shouldShowReceipt) {
          console.log('📄 Order Management: Showing receipt modal after successful payment');
          setSelectedReceipt(data.receipt);
          setShowReceiptModal(true);
        }

      } catch (error) {
        console.error('❌ Error refreshing data after payment:', error);
      }

      // Close order details if open
      setOrderDetailsOpen(false);
      setSelectedOrder(null);
      setShowPaymentMethodModal(false);
      setOrderForPayment(null);

      return;
    }

    if (method === "paymentError" && data) {
      console.error("❌ Order Management: Payment failed", data);

      toast({
        title: 'Lỗi',
        description: data.error || 'Không thể hoàn tất thanh toán',
        variant: 'destructive',
      });

      // Close payment modal but keep order details open for retry
      setShowPaymentMethodModal(false);

      return;
    }

    // For E-Invoice method
    if (method === "einvoice") {
      console.log('📄 Order Management: Opening E-Invoice modal');
      setShowPaymentMethodModal(false);
      setShowEInvoiceModal(true);
      return;
    }

    // For direct payment methods (cash, card, etc.)
    if (!orderForPayment?.id) {
      console.error('❌ No order for payment found');
      toast({
        title: 'Lỗi',
        description: 'Không tìm thấy đơn hàng để thanh toán',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('💳 Order Management: Processing direct payment for order:', orderForPayment.id);

      // Use centralized payment completion
      await completeOrderPayment(orderForPayment.id, {
        paymentMethod: typeof method === 'string' ? method : method.nameKey,
      });

      // Force immediate UI refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
        queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
        queryClient.refetchQueries({ queryKey: ['/api/tables'] })
      ]);

      toast({
        title: 'Thành công',
        description: 'Đơn hàng đã được thanh toán thành công',
      });

      // Close all modals
      setShowPaymentMethodModal(false);
      setOrderForPayment(null);
      setOrderDetailsOpen(false);
      setSelectedOrder(null);

    } catch (error) {
      console.error('❌ Payment failed:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể hoàn tất thanh toán. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  const getPaymentMethods = () => {
    // Get payment methods from localStorage (saved from settings)
    const savedPaymentMethods = localStorage.getItem('paymentMethods');

    // Default payment methods if none saved
    const defaultPaymentMethods = [
      { id: 1, nameKey: "cash", type: "cash", enabled: true, icon: "💵" },
      { id: 2, nameKey: "creditCard", type: "card", enabled: true, icon: "💳" },
      { id: 3, nameKey: "debitCard", type: "debit", enabled: true, icon: "💳" },
      { id: 4, nameKey: "momo", type: "digital", enabled: true, icon: "📱" },
      { id: 5, nameKey: "zalopay", type: "digital", enabled: true, icon: "📱" },
      { id: 6, nameKey: "vnpay", type: "digital", enabled: true, icon: "💳" },
      { id: 7, nameKey: "qrCode", type: "qr", enabled: true, icon: "📱" },
      { id: 8, nameKey: "shopeepay", type: "digital", enabled: false, icon: "🛒" },
      { id: 9, nameKey: "grabpay", type: "digital", enabled: false, icon: "🚗" },
    ];

    const paymentMethods = savedPaymentMethods
      ? JSON.parse(savedPaymentMethods)
      : defaultPaymentMethods;

    // Filter to only return enabled payment methods
    return paymentMethods.filter(method => method.enabled);
  };

  const handlePayment = async (paymentMethodKey: string) => {
    if (!selectedOrder) return;

    const method = getPaymentMethods().find(m => m.nameKey === paymentMethodKey);
    if (!method) return;

    // If cash payment, proceed directly
    if (paymentMethodKey === "cash") {
      completePaymentMutation.mutate({ orderId: selectedOrder.id, paymentMethod: paymentMethodKey });
      return;
    }

    // For QR Code payment, use CreateQRPos API
    if (paymentMethodKey === "qrCode") {
      try {
        setQrLoading(true);
        const { createQRPosAsync, CreateQRPosRequest } = await import("@/lib/api");

        const transactionUuid = `TXN-${Date.now()}`;
        const depositAmt = Number(selectedOrder.total);

        const qrRequest: CreateQRPosRequest = {
          transactionUuid,
          depositAmt: depositAmt,
          posUniqueId: "ER002",
          accntNo: "0900993023",
          posfranchiseeName: "DOOKI-HANOI",
          posCompanyName: "HYOJUNG",
          posBillNo: `BILL-${Date.now()}`
        };

        const bankCode = "79616001";
        const clientID = "91a3a3668724e631e1baf4f8526524f3";

        console.log('Calling CreateQRPos API with:', { qrRequest, bankCode, clientID });

        const qrResponse = await createQRPosAsync(qrRequest, bankCode, clientID);

        console.log('CreateQRPos API response:', qrResponse);

        // Generate QR code from the received QR data
        if (qrResponse.qrData) {
          // Use qrData directly for QR code generation
          let qrContent = qrResponse.qrData;
          try {
            // Try to decode if it's base64 encoded
            qrContent = atob(qrResponse.qrData);
          } catch (e) {
            // If decode fails, use the raw qrData
            console.log('Using raw qrData as it is not base64 encoded');
          }

          const qrUrl = await QRCodeLib.toDataURL(qrContent, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
          setSelectedPaymentMethod({ key: paymentMethodKey, method });
          setShowQRPayment(true);
          setPaymentMethodsOpen(false);
        } else {
          console.error('No QR data received from API');
          // Fallback to mock QR code
          const fallbackData = `Payment via QR\nAmount: ${selectedOrder.total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nOrder: ${selectedOrder.orderNumber}\nTime: ${new Date().toLocaleString('vi-VN')}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
          setSelectedPaymentMethod({ key: paymentMethodKey, method });
          setShowQRPayment(true);
          setPaymentMethodsOpen(false);
        }
      } catch (error) {
        console.error('Error calling CreateQRPos API:', error);
        // Fallback to mock QR code on error
        try {
          const fallbackData = `Payment via QR\nAmount: ${selectedOrder.total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nOrder: ${selectedOrder.orderNumber}\nTime: ${new Date().toLocaleString('vi-VN')}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
          setSelectedPaymentMethod({ key: paymentMethodKey, method });
          setShowQRPayment(true);
          setPaymentMethodsOpen(false);
        } catch (fallbackError) {
          console.error('Error generating fallback QR code:', fallbackError);
          toast({
            title: 'Lỗi',
            description: 'Không thể tạo mã QR',
            variant: 'destructive',
          });
        }
      } finally {
        setQrLoading(false);
      }
      return;
    }
  };

  const handleQRPaymentConfirm = () => {
    if (selectedOrder && selectedPaymentMethod) {
      // Check if this is a mixed payment (points + transfer/qr)
      if (mixedPaymentData) {
        // Use mixed payment mutation to handle both points deduction and payment
        mixedPaymentMutation.mutate({
          customerId: mixedPaymentData.customerId,
          points: mixedPaymentData.pointsToUse,
          orderId: mixedPaymentData.orderId,
          paymentMethod: selectedPaymentMethod.key === 'transfer' ? 'transfer' : selectedPaymentMethod.key
        });
      } else {
        // Regular payment without points
        completePaymentMutation.mutate({
          orderId: selectedOrder.id,
          paymentMethod: selectedPaymentMethod.key
        });
      }
      setShowQRPayment(false);
      setQrCodeUrl("");
      setSelectedPaymentMethod(null);
    }
  };

  const handleQRPaymentClose = () => {
    setShowQRPayment(false);
    setQrCodeUrl("");
    setSelectedPaymentMethod(null);
    setPaymentMethodsOpen(true);
  };

  const handlePointsPayment = () => {
    if (!selectedCustomer || !selectedOrder) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn khách hàng',
        variant: 'destructive',
      });
      return;
    }

    const currentPoints = selectedCustomer.points || 0;
    const orderTotal = Number(selectedOrder.total);
    const pointsValue = currentPoints * 1000; // 1 điểm = 1000đ

    if (pointsValue >= orderTotal) {
      // Đủ điểm để thanh toán toàn bộ
      const pointsNeeded = Math.ceil(orderTotal / 1000);
      pointsPaymentMutation.mutate({
        customerId: selectedCustomer.id,
        points: pointsNeeded,
        orderId: selectedOrder.id,
        paymentMethod: 'points',
        remainingAmount: 0
      });
    } else {
      // Không đủ điểm, cần thanh toán hỗn hợp
      const remainingAmount = orderTotal - pointsValue;
      setMixedPaymentData({
        customerId: selectedCustomer.id,
        pointsToUse: currentPoints,
        remainingAmount: remainingAmount,
        orderId: selectedOrder.id
      });
      setPointsPaymentOpen(false);
      setMixedPaymentOpen(true);
    }
  };

  const filteredCustomers = customers?.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return customer.name?.toLowerCase().includes(searchLower) ||
           customer.customerId?.toLowerCase().includes(searchLower) ||
           customer.phone?.toLowerCase().includes(searchLower);
  }) || [];

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const allOrders = orders ? (orders as Order[]).sort((a: Order, b: Order) =>
    new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
  ) : [];

  // Add event listeners for auto-refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      // Force refetch every 3 seconds for immediate updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
        queryClient.refetchQueries({ queryKey: ['/api/tables'] })
      ]);
    }, 3000); // Reduced to 3 seconds for faster updates

    // Listen for manual refresh events
    const handleOrderStatusUpdate = async (event: CustomEvent) => {
      console.log(`🔄 Order Management: Received orderStatusUpdated event:`, event.detail);

      // Force immediate refresh with refetch multiple times to ensure update
      for (let i = 0; i < 3; i++) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
          queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
          queryClient.refetchQueries({ queryKey: ['/api/tables'] })
        ]);

        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between retries
        }
      }

      console.log(`✅ Order Management: Immediate refresh completed after status update`);
    };

    const handlePaymentComplete = async (event: CustomEvent) => {
      console.log(`💳 Order Management: Received paymentCompleted event:`, event.detail);

      // Force immediate refresh with refetch multiple times to ensure update
      for (let i = 0; i < 3; i++) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
          queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
          queryClient.refetchQueries({ queryKey: ['/api/tables'] })
        ]);

        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between retries
        }
      }

      console.log(`✅ Order Management: Immediate refresh completed after payment`);
    };

    const handleRefreshOrders = async (event?: CustomEvent) => {
      console.log(`🔄 Order Management: Manual refresh orders triggered`, event?.detail);

      if (event?.detail?.immediate) {
        // Force immediate refetch multiple times for immediate updates
        for (let i = 0; i < 2; i++) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
            queryClient.refetchQueries({ queryKey: ['/api/orders'] })
          ]);

          if (i < 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } else {
        await queryClient.refetchQueries({ queryKey: ['/api/orders'] });
      }
    };

    const handleRefreshTables = async (event?: CustomEvent) => {
      console.log(`🔄 Order Management: Manual refresh tables triggered`, event?.detail);

      if (event?.detail?.immediate) {
        // Force immediate refetch multiple times for immediate updates
        for (let i = 0; i < 2; i++) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
            queryClient.refetchQueries({ queryKey: ['/api/tables'] })
          ]);

          if (i < 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } else {
        await queryClient.refetchQueries({ queryKey: ['/api/tables'] });
      }
    };

    const handleForceRefresh = async (event: CustomEvent) => {
      console.log(`🔄 Order Management: Force refresh triggered:`, event.detail);

      // Force complete UI refresh with multiple attempts
      for (let i = 0; i < 3; i++) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
          queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
          queryClient.refetchQueries({ queryKey: ['/api/tables'] })
        ]);

        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 300)); // Wait 300ms between retries
        }
      }

      console.log(`✅ Order Management: Force refresh completed`);
    };

    // Add event listeners
    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate as EventListener);
    window.addEventListener('paymentCompleted', handlePaymentComplete as EventListener);
    window.addEventListener('refreshOrders', handleRefreshOrders as EventListener);
    window.addEventListener('refreshTables', handleRefreshTables as EventListener);
    window.addEventListener('forceRefresh', handleForceRefresh as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate as EventListener);
      window.removeEventListener('paymentCompleted', handlePaymentComplete as EventListener);
      window.removeEventListener('refreshOrders', handleRefreshOrders as EventListener);
      window.removeEventListener('refreshTables', handleRefreshTables as EventListener);
      window.removeEventListener('forceRefresh', handleForceRefresh as EventListener);
    };
  }, [queryClient]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('orders.orderManagement')}</h2>
          <p className="text-gray-600">{t('orders.realTimeOrderStatus')}</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {allOrders.length} {t('orders.ordersInProgress')}
        </Badge>
      </div>

      {/* Orders Grid */}
      {allOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('orders.noActiveOrders')}</h3>
            <p className="text-gray-600">{t('orders.newOrdersWillAppearHere')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allOrders.map((order: Order) => {
            const statusConfig = getOrderStatusBadge(order.status);
            const tableInfo = getTableInfo(order.tableId);

            return (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {order.orderNumber}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {tableInfo?.tableNumber || t('orders.noTableInfo')}
                      </p>
                    </div>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Order Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {order.customerCount || 1} {t('orders.people')}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatTime(order.orderedAt)}
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('orders.totalAmount')}:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(Number(order.total))}
                      </span>
                    </div>

                    {/* Customer Info */}
                    {order.customerName && (
                      <div className="text-sm">
                        <span className="text-gray-600">{t('orders.customer')}: </span>
                        <span className="font-medium">{order.customerName}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {t('orders.viewDetails')}
                      </Button>

                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                          className="flex-1"
                        >
                          {t('orders.confirm')}
                        </Button>
                      )}

                      {order.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'preparing')}
                          className="flex-1"
                        >
                          {t('orders.startCooking')}
                        </Button>
                      )}

                      {order.status === 'preparing' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'ready')}
                          className="flex-1"
                        >
                          {t('orders.ready')}
                        </Button>
                      )}

                      {order.status === 'ready' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'served')}
                          className="flex-1"
                        >
                          {t('orders.served')}
                        </Button>
                      )}

                      {order.status === 'served' && (
                        <Button
                          size="sm"
                          onClick={() => handlePaymentClick(order)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          {t('orders.payment')}
                        </Button>
                      )}

                      {(order.status === 'paid' || order.status === 'cancelled') && (
                        <Badge variant="outline" className="flex-1 justify-center">
                          {order.status === 'paid' ? t('orders.status.completed') : t('orders.status.cancelled')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('orders.orderDetails')}</DialogTitle>
            <DialogDescription>
              {selectedOrder && `${t('orders.orderNumber')}: ${selectedOrder.orderNumber}`}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">{t('orders.orderInfo')}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>{t('orders.orderNumber')}:</span>
                        <span className="font-medium">{selectedOrder.orderNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('orders.table')}:</span>
                        <span className="font-medium">
                          {getTableInfo(selectedOrder.tableId)?.tableNumber || t('orders.unknownTable')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('orders.customer')}:</span>
                        <span className="font-medium">
                          {selectedOrder.customerName || t('orders.noCustomerName')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('orders.customerCount')}:</span>
                        <span className="font-medium">{selectedOrder.customerCount || 1} {t('orders.people')}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">{t('orders.statusAndTime')}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between items-center">
                        <span>{t('orders.orderStatus')}:</span>
                        <Badge variant={getOrderStatusBadge(selectedOrder.status).variant}>
                          {getOrderStatusBadge(selectedOrder.status).label}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>{t('common.einvoiceStatus')}</span>
                        <Badge variant={
                          selectedOrder.einvoiceStatus === 1 ? "default" :
                          selectedOrder.einvoiceStatus === 2 ? "destructive" :
                          "secondary"
                        }>
                          {(() => {
                            console.log('🔍 Order Management: E-invoice status for order', selectedOrder.id, ':', {
                              einvoiceStatus: selectedOrder.einvoiceStatus,
                              type: typeof selectedOrder.einvoiceStatus
                            });

                            if (selectedOrder.einvoiceStatus === 1) return "Đã phát hành";
                            if (selectedOrder.einvoiceStatus === 2) return "Lỗi phát hành";
                            return "Chưa phát hành";
                          })()}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('orders.orderTime')}:</span>
                        <span className="font-medium">
                          {formatTime(selectedOrder.orderedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                  <h4 className="font-medium mb-3">{t('orders.orderItems')}</h4>
                  <div className="space-y-2">
                    {orderItemsLoading ? (
                      <div className="text-center py-4 text-gray-500">
                        {t('common.loading')}...
                      </div>
                    ) : orderItems && orderItems.length > 0 ? (
                      orderItems.map((item: any, index: number) => {
                        const product = getProductInfo(item.productId);
                        return (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {product?.name || 'Unknown Product'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  x{item.quantity}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {formatCurrency(Number(item.unitPrice || 0))}/món
                              </div>
                              {(() => {
                                // Calculate tax based on afterTaxPrice if available, otherwise use taxRate
                                if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
                                  const afterTaxPrice = parseFloat(product.afterTaxPrice);
                                  const price = parseFloat(product.price);
                                  const itemTax = (afterTaxPrice - price) * Number(item.quantity || 0);
                                  return (
                                    <div className="text-xs text-green-600">
                                      Thuế: {formatCurrency(itemTax)}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="text-xs text-gray-500">
                                      Thuế: {formatCurrency(0)}
                                    </div>
                                  );
                                }
                              })()}
                              {item.notes && (
                                <div className="text-xs text-blue-600 italic mt-1">
                                  Ghi chú: {item.notes}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                {formatCurrency(Number(item.total || 0))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        {t('orders.noActiveOrders')}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">{t('orders.totalAmount')}</h4>
                  <div className="space-y-1 text-sm">
                    {(() => {
                      // Use EXACT same calculation logic as displayed in Order Details
                      let orderDetailsSubtotal = 0;
                      let orderDetailsTax = 0;

                      if (Array.isArray(orderItems) && Array.isArray(products)) {
                        orderItems.forEach((item: any) => {
                          const basePrice = Number(item.unitPrice || 0);
                          const quantity = Number(item.quantity || 0);
                          const product = products.find((p: any) => p.id === item.productId);

                          // Calculate subtotal exactly as Order Details display
                          orderDetailsSubtotal += basePrice * quantity;

                          // Tax = (after_tax_price - price) * quantity
                          if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
                            const afterTaxPrice = parseFloat(product.afterTaxPrice);
                            const price = parseFloat(product.price);
                            orderDetailsTax += (afterTaxPrice - price) * quantity;
                          }
                        });
                      }

                      const finalTotal = orderDetailsSubtotal + orderDetailsTax;

                      return (
                        <>
                          <div className="flex justify-between">
                            <span>{t('common.subtotalLabel')}</span>
                            <span>{formatCurrency(orderDetailsSubtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('orders.tax')}</span>
                            <span>{formatCurrency(orderDetailsTax)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-medium">
                            <span>{t('orders.totalAmount')}:</span>
                            <span>{formatCurrency(finalTotal)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Status Update Actions */}
                {selectedOrder.status !== 'paid' && selectedOrder.status !== 'cancelled' && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => {
                        console.log('🎯 Order Management: Bắt đầu thanh toán - kiểm tra dữ liệu');

                        if (!selectedOrder || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
                          console.error('❌ Thiếu dữ liệu đơn hàng:', {
                            selectedOrder: !!selectedOrder,
                            orderItems: orderItems?.length || 0,
                            orderItemsArray: Array.isArray(orderItems)
                          });
                          toast({
                            title: 'Lỗi',
                            description: 'Không thể tải dữ liệu đơn hàng. Vui lòng thử lại.',
                            variant: 'destructive',
                          });
                          return;
                        }

                        // Tính toán chính xác giống như hiển thị Order Details
                        let calculatedSubtotal = 0;
                        let calculatedTax = 0;

                        console.log('💰 Tính toán từ orderItems:', orderItems.length, 'items');
                        console.log('📦 Products available:', Array.isArray(products) ? products.length : 0);

                        const processedItems = orderItems.map((item: any) => {
                          const unitPrice = Number(item.unitPrice || 0);
                          const quantity = Number(item.quantity || 0);
                          const product = Array.isArray(products) ? products.find((p: any) => p.id === item.productId) : null;

                          console.log(`📊 Processing item ${item.id}:`, {
                            productId: item.productId,
                            unitPrice,
                            quantity,
                            productFound: !!product
                          });

                          // Subtotal = unitPrice * quantity
                          const itemSubtotal = unitPrice * quantity;
                          calculatedSubtotal += itemSubtotal;

                          // Tính thuế từ afterTaxPrice nếu có
                          let itemTax = 0;
                          if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
                            const afterTaxPrice = parseFloat(product.afterTaxPrice);
                            const originalPrice = parseFloat(product.price);
                            itemTax = (afterTaxPrice - originalPrice) * quantity;
                            calculatedTax += itemTax;
                            console.log(`💸 Tax calculated for ${item.productName}:`, {
                              afterTaxPrice,
                              originalPrice,
                              taxPerUnit: afterTaxPrice - originalPrice,
                              quantity,
                              itemTax
                            });
                          }

                          return {
                            id: item.id,
                            productId: item.productId,
                            productName: item.productName || product?.name || 'Unknown Product',
                            quantity: quantity,
                            unitPrice: unitPrice,
                            price: unitPrice,
                            total: itemSubtotal,
                            sku: item.productSku || product?.sku || `SP${item.productId}`,
                            taxRate: product?.taxRate ? parseFloat(product.taxRate) : 0,
                            afterTaxPrice: product?.afterTaxPrice || null
                          };
                        });

                        const finalTotal = calculatedSubtotal + calculatedTax;

                        console.log('💰 Kết quả tính toán cuối:', {
                          subtotal: calculatedSubtotal,
                          tax: calculatedTax,
                          finalTotal: finalTotal,
                          itemsProcessed: processedItems.length
                        });

                        // Kiểm tra tổng tiền hợp lệ
                        if (finalTotal <= 0) {
                          console.error('❌ Tổng tiền không hợp lệ:', finalTotal);
                          toast({
                            title: 'Lỗi',
                            description: 'Tổng tiền đơn hàng không hợp lệ. Vui lòng kiểm tra lại.',
                            variant: 'destructive',
                          });
                          return;
                        }

                        // Tạo receipt preview data
                        const receiptPreview = {
                          id: selectedOrder.id,
                          orderId: selectedOrder.id,
                          orderNumber: selectedOrder.orderNumber,
                          tableId: selectedOrder.tableId,
                          customerCount: selectedOrder.customerCount,
                          customerName: selectedOrder.customerName,
                          items: processedItems,
                          orderItems: processedItems,
                          subtotal: calculatedSubtotal.toFixed(2),
                          tax: calculatedTax.toFixed(2),
                          total: finalTotal.toFixed(2),
                          paymentMethod: 'pending',
                          amountReceived: finalTotal.toFixed(2),
                          change: '0.00',
                          cashierName: 'Order Management',
                          createdAt: new Date().toISOString(),
                          transactionId: `TXN-PREVIEW-${Date.now()}`,
                          calculatedSubtotal: calculatedSubtotal,
                          calculatedTax: calculatedTax,
                          calculatedTotal: finalTotal
                        };

                        // Tạo order data đầy đủ cho payment flow
                        const orderForPaymentData = {
                          ...selectedOrder,
                          id: selectedOrder.id, // Đảm bảo có ID
                          orderItems: processedItems,
                          processedItems: processedItems,
                          calculatedSubtotal: calculatedSubtotal,
                          calculatedTax: calculatedTax,
                          calculatedTotal: finalTotal,
                          total: finalTotal // Override total với calculated value
                        };

                        console.log('✅ Thiết lập dữ liệu để hiển thị preview:', {
                          receiptTotal: receiptPreview.total,
                          orderTotal: orderForPaymentData.calculatedTotal,
                          orderId: orderForPaymentData.id
                        });

                        // Set states và hiển thị preview
                        setPreviewReceipt(receiptPreview);
                        setOrderForPayment(orderForPaymentData);
                        setShouldOpenReceiptPreview(true);
                      }}
                      disabled={completePaymentMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t('orders.payment')}
                    </Button>
                    <Button
                      onClick={() => setPointsPaymentOpen(true)}
                      disabled={completePaymentMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t('customers.pointManagement')}
                    </Button>
                  </div>
                )}

                {/* Final Status Display */}
                {(selectedOrder.status === 'paid' || selectedOrder.status === 'cancelled') && (
                  <div className="flex justify-center pt-4">
                    {selectedOrder.status === 'paid' && (
                      <Badge variant="outline" className="px-4 py-2 bg-green-100 text-green-800 border-green-300">
                        ✅ {t('orders.status.completed')}
                      </Badge>
                    )}
                    {selectedOrder.status === 'cancelled' && (
                      <Badge variant="destructive" className="px-4 py-2">
                        ❌ {t('orders.status.cancelled')}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Methods Dialog */}
      <Dialog open={paymentMethodsOpen} onOpenChange={setPaymentMethodsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orders.selectPaymentMethod')}</DialogTitle>
            <DialogDescription>
              {t('orders.selectPaymentMethodDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3">
            {getPaymentMethods().map((method) => (
              <Button
                key={method.id}
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handlePayment(method.nameKey)}
                disabled={completePaymentMutation.isPending || (qrLoading && method.nameKey === 'qrCode')}
              >
                <span className="text-2xl mr-3">{method.icon}</span>
                <div className="text-left">
                  <p className="font-medium">
                    {qrLoading && method.nameKey === 'qrCode' ? t('common.generatingQr') : t(`orders.paymentMethods.${method.nameKey}`)}
                  </p>
                </div>
                {qrLoading && method.nameKey === 'qrCode' && (
                  <div className="ml-auto">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                )}
              </Button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPaymentMethodsOpen(false)}>
              {t('orders.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Payment Dialog */}
      <Dialog open={showQRPayment} onOpenChange={setShowQRPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <QrCode className="w-5 h-5" />
              Thanh toán {selectedPaymentMethod?.method?.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleQRPaymentClose}
              className="absolute right-0 top-0 h-6 w-6 p-0"
            >
              ✕
            </Button>
            <DialogDescription className="text-center">
              Quét mã QR để hoàn tất thanh toán
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {/* Order Summary */}
            {selectedOrder && (
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">{t('orders.orderNumber')}: {selectedOrder.orderNumber}</p>
                <p className="text-sm text-gray-600">Số tiền cần thanh toán:</p>
                <p className="text-3xl font-bold text-green-600">
                  {mixedPaymentData ?
                    formatCurrency(mixedPaymentData.remainingAmount) :
                    formatCurrency(Number(selectedOrder.total))
                  }
                </p>
                {mixedPaymentData && (
                  <p className="text-sm text-blue-600">
                    Đã sử dụng {mixedPaymentData.pointsToUse.toLocaleString()}P (-{(mixedPaymentData.pointsToUse * 1000).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫)
                  </p>
                )}
              </div>
            )}

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-lg">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code for Payment"
                    className="w-64 h-64"
                  />
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600 text-center">
              Sử dụng ứng dụng {selectedPaymentMethod?.method?.name} để quét mã QR và thực hiện thanh toán
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleQRPaymentClose}
                className="flex-1"
              >
                Quay lại
              </Button>
              <Button
                onClick={handleQRPaymentConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
              >
                Xác nhận thanh toán
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Points Payment Dialog */}
      <Dialog open={pointsPaymentOpen} onOpenChange={setPointsPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              {t('orders.pointsPaymentTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('orders.pointsPaymentDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Summary */}
            {selectedOrder && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">{t('orders.orderNumber')}: {selectedOrder.orderNumber}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(Number(selectedOrder.total))}
                </p>
                {selectedCustomer && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-sm text-gray-600">
                      Điểm có sẵn: {(selectedCustomer.points || 0).toLocaleString()}P
                      <span className="ml-2 text-green-600">
                        (≈ {((selectedCustomer.points || 0) * 1000).toLocaleString()} ₫)
                      </span>
                    </p>
                    {((selectedCustomer.points || 0) * 1000) < Number(selectedOrder.total) && (
                      <p className="text-sm text-orange-600 mt-1">
                        Cần thanh toán thêm: {(Number(selectedOrder.total) - (selectedCustomer.points || 0) * 1000).toLocaleString()} ₫
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Customer Search */}
            <div className="space-y-3">
              <Label>{t('orders.searchCustomers')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('customers.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Customer List */}
              <div className="max-h-64 overflow-y-auto border rounded-md">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                      selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.customerId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          {(customer.points || 0).toLocaleString()}P
                        </p>
                        <p className="text-xs text-gray-500">{t('orders.availablePoints')}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    Không tìm thấy khách hàng
                  </div>
                )}
              </div>
            </div>

            {/* Payment Explanation */}
            {selectedCustomer && selectedOrder && (
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Chi tiết thanh toán</h4>
                  {((selectedCustomer.points || 0) * 1000) >= Number(selectedOrder.total) ? (
                    <div className="text-green-600">
                      <p className="text-sm">✓ Đủ điểm để thanh toán toàn bộ đơn hàng</p>
                      <p className="text-sm">
                        Sử dụng: {Math.ceil(Number(selectedOrder.total) / 1000).toLocaleString()}P
                      </p>
                      <p className="text-sm">
                        Còn lại: {((selectedCustomer.points || 0) - Math.ceil(Number(selectedOrder.total) / 1000)).toLocaleString()}P
                      </p>
                    </div>
                  ) : (
                    <div className="text-orange-600">
                      <p className="text-sm">⚠ Không đủ điểm, cần thanh toán hỗn hợp</p>
                      <p className="text-sm">
                        Sử dụng tất cả: {(selectedCustomer.points || 0).toLocaleString()}P
                        (≈ {((selectedCustomer.points || 0) * 1000).toLocaleString()} ₫)
                      </p>
                      <p className="text-sm">
                        Cần thanh toán thêm: {(Number(selectedOrder.total) - (selectedCustomer.points || 0) * 1000).toLocaleString()} ₫
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPointsPaymentOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handlePointsPayment}
              disabled={
                !selectedCustomer ||
                pointsPaymentMutation.isPending ||
                (selectedCustomer.points || 0) === 0
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {pointsPaymentMutation.isPending ? 'Đang xử lý...' :
               ((selectedCustomer?.points || 0) * 1000) >= Number(selectedOrder?.total || 0) ?
               'Thanh toán bằng điểm' : 'Thanh toán hỗn hợp'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mixed Payment Dialog */}
      <Dialog open={mixedPaymentOpen} onOpenChange={setMixedPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              {t('orders.mixedPaymentTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('orders.mixedPaymentDesc')}
            </DialogDescription>
          </DialogHeader>

          {mixedPaymentData && (
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Tóm tắt thanh toán</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tổng đơn hàng:</span>
                    <span className="font-medium">{Number(selectedOrder?.total || 0).toLocaleString()} ₫</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Thanh toán bằng điểm:</span>
                    <span className="font-medium">
                      {mixedPaymentData.pointsToUse.toLocaleString()}P
                      <span className="ml-1">(-{(mixedPaymentData.pointsToUse * 1000).toLocaleString()} ₫)</span>
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium text-orange-600">
                    <span>Cần thanh toán thêm:</span>
                    <span>{mixedPaymentData.remainingAmount.toLocaleString()} ₫</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <h4 className="font-medium">Chọn phương thức thanh toán cho phần còn lại:</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => mixedPaymentMutation.mutate({
                      customerId: mixedPaymentData.customerId,
                      points: mixedPaymentData.pointsToUse,
                      orderId: mixedPaymentData.orderId,
                      paymentMethod: 'cash'
                    })}
                    disabled={mixedPaymentMutation.isPending}
                  >
                    <span className="text-2xl mr-3">💵</span>
                    <div className="text-left">
                      <p className="font-medium">{t('common.cash')}</p>
                      <p className="text-sm text-gray-500">{mixedPaymentData.remainingAmount.toLocaleString()} ₫</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={async () => {
                      // Use CreateQRPos API for transfer payment like QR Code
                      try {
                        setQrLoading(true);
                        const { createQRPosAsync, CreateQRPosRequest } = await import("@/lib/api");

                        const transactionUuid = `TXN-TRANSFER-${Date.now()}`;
                        const depositAmt = Number(mixedPaymentData.remainingAmount);

                        const qrRequest: CreateQRPosRequest = {
                          transactionUuid,
                          depositAmt: depositAmt,
                          posUniqueId: "ER002",
                          accntNo: "0900993023",
                          posfranchiseeName: "DOOKI-HANOI",
                          posCompanyName: "HYOJUNG",
                          posBillNo: `TRANSFER-${Date.now()}`
                        };

                        const bankCode = "79616001";
                        const clientID = "91a3a3668724e631e1baf4f8526524f3";

                        console.log('Calling CreateQRPos API for transfer payment:', { qrRequest, bankCode, clientID });

                        const qrResponse = await createQRPosAsync(qrRequest, bankCode, clientID);

                        console.log('CreateQRPos API response for transfer:', qrResponse);

                        // Generate QR code from the received QR data and show QR modal
                        if (qrResponse.qrData) {
                          let qrContent = qrResponse.qrData;
                          try {
                            // Try to decode if it's base64 encoded
                            qrContent = atob(qrResponse.qrData);
                          } catch (e) {
                            // If decode fails, use the raw qrData
                            console.log('Using raw qrData for transfer as it is not base64 encoded');
                          }

                          const qrUrl = await QRCodeLib.toDataURL(qrContent, {
                            width: 256,
                            margin: 2,
                            color: {
                              dark: '#000000',
                              light: '#FFFFFF'
                            }
                          });

                          // Set QR code data and show QR payment modal
                          setQrCodeUrl(qrUrl);
                          setSelectedPaymentMethod({
                            key: 'transfer',
                            method: { name: 'Chuyển khoản', icon: '💳' }
                          });
                          setShowQRPayment(true);
                          setMixedPaymentOpen(false);
                        } else {
                          console.error('No QR data received from API for transfer');
                          // Fallback to direct payment
                          mixedPaymentMutation.mutate({
                            customerId: mixedPaymentData.customerId,
                            points: mixedPaymentData.pointsToUse,
                            orderId: mixedPaymentData.orderId,
                            paymentMethod: 'transfer'
                          });
                        }
                      } catch (error) {
                        console.error('Error calling CreateQRPos API for transfer:', error);
                        // Fallback to direct payment on error
                        mixedPaymentMutation.mutate({
                          customerId: mixedPaymentData.customerId,
                          points: mixedPaymentData.pointsToUse,
                          orderId: mixedPaymentData.orderId,
                          paymentMethod: 'transfer'
                        });
                      } finally {
                        setQrLoading(false);
                      }
                    }}
                    disabled={mixedPaymentMutation.isPending || qrLoading}
                  >
                    <span className="text-2xl mr-3">💳</span>
                    <div className="text-left">
                      <p className="font-medium">
                        {qrLoading ? 'Đang tạo QR...' : t('orders.paymentMethods.vnpay')}
                      </p>
                      <p className="text-sm text-gray-500">{mixedPaymentData.remainingAmount.toLocaleString()} ₫</p>
                    </div>
                    {qrLoading && (
                      <div className="ml-auto">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setMixedPaymentOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => setMixedPaymentOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {t('orders.mixedPaymentTitle')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Modal - Step 1: "Xem trước hóa đơn" */}
      <ReceiptModal
        isOpen={showReceiptPreview && !!previewReceipt}
        onClose={() => {
          console.log("🔴 Order Management: Closing receipt preview modal");
          setShowReceiptPreview(false);
          setPreviewReceipt(null);
        }}
        onConfirm={() => {
          console.log("📄 Order Management: Receipt preview confirmed, starting payment flow");

          if (!previewReceipt || !orderForPayment) {
            console.error('❌ Missing preview data for payment flow');
            toast({
              title: 'Lỗi',
              description: 'Không thể tiếp tục thanh toán. Vui lòng thử lại.',
              variant: 'destructive',
            });
            return;
          }

          console.log('💳 Opening payment method modal with order:', {
            orderId: orderForPayment.id,
            calculatedTotal: orderForPayment.calculatedTotal
          });

          // Close preview and show payment method modal
          setShowReceiptPreview(false);
          setShowPaymentMethodModal(true);
        }}
        isPreview={true}
        cartItems={previewReceipt?.items?.map((item: any) => ({
          id: item.productId || item.id,
          name: item.productName || item.name,
          price: parseFloat(item.price || item.unitPrice || '0'),
          quantity: item.quantity,
          sku: item.sku || `SP${item.productId}`,
          taxRate: parseFloat(item.taxRate || '0')
        })) || []}
        total={previewReceipt ? parseFloat(previewReceipt.total || '0') : 0}
      />

      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => {
          console.log('🔴 Payment Method Modal closed');
          setShowPaymentMethodModal(false);
          setOrderForPayment(null);
        }}
        onSelectMethod={(method, data) => {
          console.log('🎯 Order Management payment method selected:', method, data);
          console.log('🔍 Current orderForPayment state:', {
            orderForPayment: !!orderForPayment,
            orderForPaymentId: orderForPayment?.id,
            selectedOrder: !!selectedOrder,
            selectedOrderId: selectedOrder?.id
          });

          setShowPaymentMethodModal(false);

          // Handle different payment completion scenarios
          if (method === "paymentCompleted" && data?.success) {
            console.log('✅ Payment completed successfully from payment modal');

            // Close all modals
            setOrderForPayment(null);
            setOrderDetailsOpen(false);
            setSelectedOrder(null);

            // Show receipt if provided
            if (data.receipt) {
              setSelectedReceipt(data.receipt);
              setShowReceiptModal(true);
            }

            // Force UI refresh
            queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
            queryClient.invalidateQueries({ queryKey: ['/api/tables'] });

            toast({
              title: 'Thành công',
              description: 'Đơn hàng đã được thanh toán thành công',
            });

            return;
          }

          if (method === "paymentError" && data?.error) {
            console.error('❌ Payment failed from payment modal:', data.error);

            // Close modals but don't clear order data in case user wants to retry
            setShowPaymentMethodModal(false);

            toast({
              title: 'Lỗi thanh toán',
              description: data.error || 'Không thể hoàn tất thanh toán',
              variant: 'destructive',
            });

            return;
          }

          // If payment method returns e-invoice data (like from "phát hành sau"), handle it
          if (data && data.receipt) {
            console.log('📄 Order Management: Payment method returned receipt data, showing receipt');
            setSelectedReceipt(data.receipt);
            setShowReceiptModal(true);
            setOrderForPayment(null);
          } else {
            // For other payment methods, proceed with payment completion
            console.log('💳 Processing payment for order:', {
              orderId: orderForPayment?.id,
              paymentMethod: method.nameKey || method
            });

            if (orderForPayment?.id) {
              completePaymentMutation.mutate({
                orderId: orderForPayment.id,
                paymentMethod: method.nameKey || method,
              });
            } else {
              console.error('❌ No valid order ID found for payment');
              toast({
                title: 'Lỗi',
                description: 'Không tìm thấy ID đơn hàng để thanh toán',
                variant: 'destructive',
              });
            }
          }
        }}
        total={orderForPayment?.calculatedTotal ? Math.round(orderForPayment.calculatedTotal) : 0}
        onShowEInvoice={() => setShowEInvoiceModal(true)}
        cartItems={orderForPayment?.processedItems?.map((item: any) => ({
          id: item.productId,
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
          sku: item.sku,
          taxRate: item.taxRate || 0,
          afterTaxPrice: item.afterTaxPrice
        })) || []}
      />

      {/* E-Invoice Modal */}
      {showEInvoiceModal && orderForPayment && (
        <EInvoiceModal
          isOpen={showEInvoiceModal}
          onClose={() => {
            setShowEInvoiceModal(false);
            setOrderForPayment(null);
          }}
          onConfirm={handleEInvoiceConfirm}
          total={(() => {
            if (!orderForPayment) return 0;

            // Use pre-calculated total if available
            if (orderForPayment.calculatedTotal) {
              console.log('💰 E-invoice using pre-calculated total:', orderForPayment.calculatedTotal);
              return Math.round(orderForPayment.calculatedTotal);
            }

            // Fallback calculation using EXACT same logic as Order Details display
            const itemsToCalculate = orderForPayment.orderItems || orderItems || [];
            console.log("💰 E-invoice fallback calculation from items:", itemsToCalculate.length);

            if (!Array.isArray(itemsToCalculate) || itemsToCalculate.length === 0) {
              return Math.round(Number(orderForPayment.total || 0));
            }

            let itemsSubtotal = 0;
            let itemsTax = 0;

            if (Array.isArray(products)) {
              itemsToCalculate.forEach((item: any) => {
                const product = products.find((p: any) => p.id === item.productId);
                const basePrice = Number(item.unitPrice || 0);
                const quantity = item.quantity;

                // Calculate subtotal exactly as Order Details display
                itemsSubtotal += basePrice * quantity;

                // Tax = (after_tax_price - price) * quantity
                if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
                  const afterTaxPrice = parseFloat(product.afterTaxPrice);
                  const price = parseFloat(product.price);
                  itemsTax += (afterTaxPrice - price) * quantity;
                }
              });
            }

            const calculatedTotal = Math.round(itemsSubtotal + itemsTax);
            console.log("💰 E-invoice fallback calculation result:", {
              itemsSubtotal,
              itemsTax,
              calculatedTotal
            });

            return calculatedTotal > 0 ? calculatedTotal : Math.round(Number(orderForPayment.total || 0));
          })()}
          cartItems={(() => {
            // Use processed items if available
            if (orderForPayment?.processedItems) {
              console.log('📦 Using processed items for E-invoice modal:', orderForPayment.processedItems.length);
              return orderForPayment.processedItems.map((item: any) => ({
                id: item.productId,
                name: item.productName,
                price: item.price,
                quantity: item.quantity,
                sku: item.sku,
                taxRate: item.taxRate,
                afterTaxPrice: item.afterTaxPrice
              }));
            }

            // Fallback to orderItems
            const itemsToMap = orderForPayment?.orderItems || orderItems || [];
            console.log("📦 Mapping cart items for E-invoice modal:", itemsToMap.length);

            return itemsToMap.map((item: any) => {
              const product = Array.isArray(products) ? products.find((p: any) => p.id === item.productId) : null;
              return {
                id: item.productId,
                name: item.productName || getProductInfo(item.productId)?.name || 'Unknown Product',
                price: parseFloat(item.unitPrice || '0'),
                quantity: item.quantity,
                sku: item.productSku || `SP${item.productId}`,
                taxRate: product?.taxRate ? parseFloat(product.taxRate) : 0,
                afterTaxPrice: product?.afterTaxPrice || null
              };
            });
          })()}
          source="order-management"
          orderId={orderForPayment.id}
        />
      )}

      {/* Receipt Modal - Final receipt after payment */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          console.log('🔴 Order Management: Closing final receipt modal and clearing all states');
          setShowReceiptModal(false);
          setSelectedReceipt(null);
          setOrderForPayment(null);
          setShowPaymentMethodModal(false);
          setShowEInvoiceModal(false);
          setShowReceiptPreview(false);
          setPreviewReceipt(null);
          setOrderDetailsOpen(false);
          setSelectedOrder(null);
          setPaymentMethodsOpen(false);
          setShowQRPayment(false);
          setPointsPaymentOpen(false);
          setMixedPaymentOpen(false);

          // Force refresh orders after successful payment
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] });

          console.log('✅ Order Management: All states cleared and queries refreshed');
        }}
        receipt={selectedReceipt}
        cartItems={selectedReceipt?.items?.map((item: any) => ({
          id: item.productId || item.id,
          name: item.productName || item.name,
          price: parseFloat(item.price || item.unitPrice || '0'),
          quantity: item.quantity,
          sku: item.sku || `SP${item.productId}`,
          taxRate: (() => {
            const product = Array.isArray(products) ? products.find((p: any) => p.id === item.productId) : null;
            return product?.taxRate ? parseFloat(product.taxRate) : 10;
          })()
        })) || []}
        autoClose={true}
      />
    </div>
  );
}