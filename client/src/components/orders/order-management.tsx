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

  // Trigger allOrderItems refetch when orders data changes
  useEffect(() => {
    if (orders && Array.isArray(orders)) {
      console.log("📦 Order Management: Orders data changed, checking if need to refetch order items");
      const currentActiveOrders = orders.filter(
        (order: any) => !["paid", "cancelled"].includes(order.status)
      );

      if (currentActiveOrders.length > 0) {
        console.log(`📦 Order Management: Found ${currentActiveOrders.length} active orders, triggering order items refetch`);
        // Force refetch allOrderItems
        queryClient.invalidateQueries({
          queryKey: ["/api/all-order-items"]
        });
      }
    }
  }, [orders, queryClient]);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders'],
    refetchInterval: 2000, // Faster polling - every 2 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchIntervalInBackground: true, // Continue refetching in background
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

  // Get all active orders for preloading items
  const activeOrders = Array.isArray(orders) ? orders.filter(
    (order: any) => !["paid", "cancelled"].includes(order.status)
  ) : [];

  // Preload all order items for fast total calculation
  const { data: allOrderItems } = useQuery({
    queryKey: ["/api/all-order-items", activeOrders.map(o => o.id).join(",")],
    enabled: true, // Always enabled to preload data
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      const itemsMap = new Map();

      // Only fetch if we have active orders
      if (activeOrders.length === 0) {
        console.log("📦 Order Management: No active orders to fetch items for");
        return itemsMap;
      }

      console.log("📦 Order Management: Preloading order items for", activeOrders.length, "active orders");

      for (const order of activeOrders) {
        try {
          const response = await apiRequest("GET", `/api/order-items/${order.id}`);
          const items = await response.json();
          itemsMap.set(order.id, Array.isArray(items) ? items : []);
          console.log(`✅ Order Management: Loaded ${Array.isArray(items) ? items.length : 0} items for order ${order.id}`);
        } catch (error) {
          console.error(`❌ Error fetching items for order ${order.id}:`, error);
          itemsMap.set(order.id, []);
        }
      }

      console.log("📦 Order Management: Preloading completed for", itemsMap.size, "orders");
      return itemsMap;
    },
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

      // Force immediate refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
        queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
        queryClient.refetchQueries({ queryKey: ['/api/tables'] })
      ]);

      // Close all modals immediately
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
        description: 'Đơn hàng đã được thanh toán thành công',
      });

      // Dispatch UI refresh events
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
          })
        ];

        events.forEach(event => {
          window.dispatchEvent(event);
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

      // Close e-invoice modal first
      setShowEInvoiceModal(false);

      // Always create and show receipt modal after e-invoice processing
      let receiptData = invoiceData.receipt;

      // If no receipt data provided, create it from current order data
      if (!receiptData && orderForPayment) {
        console.log('📄 Creating receipt data from order payment data');

        // Calculate totals using same logic as payment flow
        let calculatedSubtotal = 0;
        let calculatedTax = 0;

        const currentOrderItems = orderForPayment?.processedItems || orderForPayment?.orderItems || [];

        if (Array.isArray(currentOrderItems) && Array.isArray(products)) {
          currentOrderItems.forEach((item: any) => {
            const basePrice = Number(item.unitPrice || item.price || 0);
            const quantity = Number(item.quantity || 0);
            const product = products.find((p: any) => p.id === item.productId);

            // Calculate subtotal exactly as Order Details
            calculatedSubtotal += basePrice * quantity;

            // Use EXACT same tax calculation logic
            if (
              product?.afterTaxPrice &&
              product.afterTaxPrice !== null &&
              product.afterTaxPrice !== ""
            ) {
              const afterTaxPrice = parseFloat(product.afterTaxPrice);
              const taxPerUnit = afterTaxPrice - basePrice;
              calculatedTax += taxPerUnit * quantity;
            }
          });
        }

        const finalTotal = calculatedSubtotal + calculatedTax;

        receiptData = {
          transactionId: invoiceData.invoiceNumber || `TXN-${Date.now()}`,
          items: currentOrderItems.map((item: any) => ({
            id: item.id,
            productId: item.productId || item.id,
            productName: item.productName || item.name,
            quantity: item.quantity,
            price: item.unitPrice || item.price,
            total: item.total,
            sku: item.productSku || item.sku || `SP${item.productId}`,
            taxRate: (() => {
              const product = Array.isArray(products)
                ? products.find((p: any) => p.id === item.productId)
                : null;
              return product?.taxRate ? parseFloat(product.taxRate) : 10;
            })(),
          })),
          subtotal: calculatedSubtotal.toString(),
          tax: calculatedTax.toString(),
          total: finalTotal.toString(),
          paymentMethod: "einvoice",
          originalPaymentMethod: invoiceData.originalPaymentMethod,
          amountReceived: finalTotal.toString(),
          change: "0.00",
          cashierName: "Order Management",
          createdAt: new Date().toISOString(),
          customerName: invoiceData.customerName || orderForPayment.customerName,
          customerTaxCode: invoiceData.taxCode,
          invoiceNumber: invoiceData.invoiceNumber,
        };
      }

      console.log('📄 Order Management: Showing receipt modal with data:', {
        hasReceipt: !!receiptData,
        receiptTotal: receiptData?.total,
        invoiceNumber: receiptData?.invoiceNumber
      });

      // Show receipt modal for printing
      setSelectedReceipt(receiptData);
      setShowReceiptModal(true);

      // Clear order states
      setOrderForPayment(null);
      setOrderDetailsOpen(false);
      setSelectedOrder(null);

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

  const handlePaymentClick = async (order: Order) => {
    console.log('🎯 Payment button clicked for order:', order.id, order.orderNumber);

    try {
      // Step 1: Fetch order items for calculation
      console.log('📦 Fetching order items for order:', order.id);
      const orderItemsResponse = await apiRequest('GET', `/api/order-items/${order.id}`);

      if (!orderItemsResponse.ok) {
        throw new Error('Failed to fetch order items');
      }

      const orderItemsData = await orderItemsResponse.json();
      console.log('📦 Order items fetched:', orderItemsData.length, 'items');

      if (!Array.isArray(orderItemsData) || orderItemsData.length === 0) {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy món ăn trong đơn hàng này',
          variant: 'destructive',
        });
        return;
      }

      // Step 2: Calculate totals using EXACT same logic as Order Details display
      let calculatedSubtotal = 0;
      let calculatedTax = 0;

      console.log('💰 Calculating totals for', orderItemsData.length, 'items');
      console.log('📦 Products available:', Array.isArray(products) ? products.length : 0);

      const processedItems = orderItemsData.map((item: any) => {
        const unitPrice = Number(item.unitPrice || 0);
        const quantity = Number(item.quantity || 0);
        const product = Array.isArray(products) ? products.find((p: any) => p.id === item.productId) : null;

        console.log(`📊 Processing item ${item.id}:`, {
          productId: item.productId,
          productName: item.productName,
          unitPrice,
          quantity,
          productFound: !!product
        });

        // Subtotal = unitPrice * quantity
        const itemSubtotal = unitPrice * quantity;
        calculatedSubtotal += itemSubtotal;

        // Tax calculation from afterTaxPrice if available
        let itemTax = 0;
        if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const originalPrice = parseFloat(product.price || unitPrice);
          const taxPerUnit = Math.max(0, afterTaxPrice - originalPrice);
          itemTax = taxPerUnit * quantity;
          calculatedTax += itemTax;
          console.log(`💸 Tax calculated for ${item.productName}:`, {
            afterTaxPrice,
            originalPrice,
            taxPerUnit,
            quantity,
            itemTax
          });
        }

        return {
          id: item.id,
          productId: item.productId,
          productName: item.productName || 'Unknown Product',
          quantity: quantity,
          unitPrice: unitPrice,
          price: unitPrice,
          total: itemSubtotal,
          sku: item.productSku || product?.sku || `SP${item.productId}`,
          taxRate: product?.taxRate ? parseFloat(product.taxRate) : 0,
          afterTaxPrice: product?.afterTaxPrice || null
        };
      });

      const finalTotal = calculatedSubtotal + Math.abs(calculatedTax);

      console.log('💰 Final calculation results:', {
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        finalTotal: finalTotal,
        itemsProcessed: processedItems.length
      });

      // Validate calculated total
      if (finalTotal <= 0 || isNaN(finalTotal)) {
        console.error('❌ Invalid calculated total:', finalTotal);
        toast({
          title: 'Lỗi',
          description: 'Không thể tính toán tổng tiền đơn hàng. Vui lòng kiểm tra lại.',
          variant: 'destructive',
        });
        return;
      }

      // Step 3: Create comprehensive order data for payment
      const orderForPaymentData = {
        ...order,
        id: order.id,
        orderItems: processedItems,
        processedItems: processedItems,
        calculatedSubtotal: calculatedSubtotal,
        calculatedTax: calculatedTax,
        calculatedTotal: finalTotal,
        total: finalTotal
      };

      // Step 4: Create receipt preview data with validation
      // Kiểm tra tổng tiền hợp lệ trước khi tạo receipt
      if (finalTotal <= 0 || isNaN(finalTotal)) {
        console.error('❌ Tổng tiền không hợp lệ:', finalTotal);
        toast({
          title: 'Lỗi',
          description: 'Tổng tiền đơn hàng không hợp lệ. Vui lòng kiểm tra lại.',
          variant: 'destructive',
        });
        return;
      }

      // Kiểm tra items hợp lệ
      if (!processedItems || processedItems.length === 0) {
        console.error('❌ Không có items để tạo receipt preview');
        toast({
          title: 'Lỗi',
          description: 'Không có món ăn trong đơn hàng để thanh toán.',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Creating receiptPreview with:', {
        itemsCount: processedItems.length,
        calculatedSubtotal,
        calculatedTax: Math.abs(calculatedTax),
        finalTotal,
        firstItem: processedItems[0]
      });

      // Tạo receipt preview data với định dạng đúng và validation
      const receiptPreview = {
        id: selectedOrder.id,
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber || `ORD-${selectedOrder.id}`,
        tableId: selectedOrder.tableId,
        customerCount: selectedOrder.customerCount || 1,
        customerName: selectedOrder.customerName || 'Khách hàng',
        items: processedItems,
        orderItems: processedItems,
        subtotal: calculatedSubtotal.toString(),
        tax: Math.abs(calculatedTax).toString(),
        total: finalTotal.toString(),
        exactSubtotal: calculatedSubtotal,
        exactTax: Math.abs(calculatedTax),
        exactTotal: finalTotal,
        paymentMethod: 'preview',
        amountReceived: finalTotal.toString(),
        change: '0.00',
        cashierName: 'Order Management',
        createdAt: new Date().toISOString(),
        transactionId: `TXN-PREVIEW-${Date.now()}`,
        calculatedSubtotal: calculatedSubtotal,
        calculatedTax: Math.abs(calculatedTax),
        calculatedTotal: finalTotal
      };

      // Validate receipt preview data thoroughly
      if (!receiptPreview.items || !Array.isArray(receiptPreview.items) || receiptPreview.items.length === 0) {
        console.error('❌ Receipt preview validation failed - invalid items:', {
          hasItems: !!receiptPreview.items,
          isArray: Array.isArray(receiptPreview.items),
          length: receiptPreview.items?.length || 0
        });
        toast({
          title: 'Lỗi',
          description: 'Không thể tạo xem trước hóa đơn - dữ liệu món ăn không hợp lệ',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Receipt preview validation passed:', {
        itemsCount: receiptPreview.items.length,
        total: receiptPreview.total,
        exactTotal: receiptPreview.exactTotal
      });

      // Step 5: Close order details modal and show receipt preview
      try {
        setOrderDetailsOpen(false);
        setSelectedOrder(order);
        setOrderForPayment(orderForPaymentData);
        setPreviewReceipt(receiptPreview);

        // Use setTimeout to ensure state is set before showing modal
        setTimeout(() => {
          setShowReceiptPreview(true);
          console.log('🚀 Order Management: Receipt preview modal should now be visible');
        }, 100);

      } catch (stateError) {
        console.error('❌ Error setting modal states:', stateError);
        toast({
          title: 'Lỗi',
          description: 'Không thể hiển thị xem trước hóa đơn',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('❌ Error preparing payment data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể chuẩn bị dữ liệu thanh toán. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentMethodSelect = async (method: any, data?: any) => {
    console.log("🎯 Order Management payment method selected:", method, data);

    if (method === "paymentCompleted" && data?.success) {
      console.log('✅ Order Management: Payment completed successfully', data);

      try {
        // Force immediate refresh
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
          queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
          queryClient.refetchQueries({ queryKey: ['/api/tables'] })
        ]);

        // Close all modals immediately
        setShowPaymentMethodModal(false);
        setOrderForPayment(null);
        setOrderDetailsOpen(false);
        setSelectedOrder(null);

        toast({
          title: 'Thành công',
          description: 'Đơn hàng đã được thanh toán thành công',
        });

        // Show receipt ONLY if explicitly requested and no receipt is currently showing
        if (data.receipt && data.shouldShowReceipt && !showReceiptModal) {
          console.log('📄 Order Management: Showing final receipt modal');
          setSelectedReceipt(data.receipt);
          setShowReceiptModal(true);
        }

      } catch (error) {
        console.error('❌ Error refreshing data after payment:', error);
      }

      return;
    }

    if (method === "paymentError" && data) {
      console.error("❌ Order Management: Payment failed", data);

      toast({
        title: 'Lỗi',
        description: data.error || 'Không thể hoàn tất thanh toán',
        variant: 'destructive',
      });

      setShowPaymentMethodModal(false);
      return;
    }

    // For direct payment methods (cash, card, etc.) - handle immediately
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

      // Close all modals immediately
      setShowPaymentMethodModal(false);
      setOrderForPayment(null);
      setOrderDetailsOpen(false);
      setSelectedOrder(null);

      toast({
        title: 'Thành công',
        description: 'Đơn hàng đã được thanh toán thành công',
      });

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

  // Function to refresh data, including invalidating and refetching queries
  const refreshData = React.useCallback(async () => {
    console.log('🔄 refreshing data...');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] }),
      queryClient.refetchQueries({ queryKey: ['/api/orders'] }),
      queryClient.refetchQueries({ queryKey: ['/api/tables'] })
    ]);
    console.log('✅ data refreshed');
  }, [queryClient]);

  // Refresh data when tab becomes active or component mounts
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Set up periodic refresh
  useEffect(() => {
    const interval = setInterval(refreshData, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [refreshData]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔗 Order Management: WebSocket connected');
          // Send registration message
          ws?.send(JSON.stringify({
            type: 'register_order_management',
            timestamp: new Date().toISOString()
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Order Management: WebSocket message received:', data);

            if (data.type === 'order_created' ||
                data.type === 'order_updated' ||
                data.type === 'table_status_changed') {
              console.log('🔄 Order Management: Refreshing orders due to WebSocket update');
              refreshData();
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔗 Order Management: WebSocket disconnected, attempting reconnect...');
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error('❌ Order Management: WebSocket error:', error);
        };
      } catch (error) {
        console.error('❌ Error creating WebSocket connection:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [refreshData]);

  // Listen for payment completion events from payment modal
  useEffect(() => {
    const handleOrderStatusUpdate = (event: CustomEvent) => {
      console.log("🔄 Order Management: Received order status update event:", event.detail);
      // Force immediate refresh when order status is updated
      setTimeout(() => {
        refreshData();
      }, 100);
    };

    const handlePaymentCompleted = (event: CustomEvent) => {
      console.log("💳 Order Management: Received payment completed event:", event.detail);
      // Force immediate refresh when payment is completed
      setTimeout(() => {
        refreshData();
      }, 100);
    };

    const handleRefreshOrders = (event: CustomEvent) => {
      console.log("🔄 Order Management: Received refresh orders event:", event.detail);
      if (event.detail?.immediate) {
        refreshData();
      }
    };

    const handleNewOrderFromTable = (event: CustomEvent) => {
      console.log("🆕 Order Management: New order created from table:", event.detail);
      // Immediate refresh for new orders
      refreshData();
    };

    // Add event listeners
    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate as EventListener);
    window.addEventListener('paymentCompleted', handlePaymentCompleted as EventListener);
    window.addEventListener('refreshOrders', handleRefreshOrders as EventListener);
    window.addEventListener('newOrderCreated', handleNewOrderFromTable as EventListener);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate as EventListener);
      window.removeEventListener('paymentCompleted', handlePaymentCompleted as EventListener);
      window.removeEventListener('refreshOrders', handleRefreshOrders as EventListener);
      window.removeEventListener('newOrderCreated', handleNewOrderFromTable as EventListener);
    };
  }, [refreshData]);


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
                        {(() => {
                          // Use preloaded order items for fast calculation
                          let calculatedTotal = 0;
                          if (allOrderItems && allOrderItems.has(order.id)) {
                            const orderItems = allOrderItems.get(order.id) || [];

                            calculatedTotal = orderItems.reduce((total: number, item: any) => {
                              const quantity = item.quantity || 0;
                              const unitPrice = parseFloat(item.unitPrice || "0");
                              let itemTotal = unitPrice * quantity;

                              // Apply tax if afterTaxPrice is available
                              const product = products?.find(p => p.id === item.productId);
                              if (product &&
                                  product.afterTaxPrice &&
                                  product.afterTaxPrice !== "" &&
                                  product.afterTaxPrice !== null) {
                                const afterTaxPrice = parseFloat(product.afterTaxPrice);
                                const taxPerUnit = Math.max(0, afterTaxPrice - unitPrice);
                                itemTotal = (unitPrice + taxPerUnit) * quantity;
                              }

                              return total + itemTotal;
                            }, 0);

                            console.log(
                              `💰 Order Management ${order.orderNumber} calculated total from preloaded items:`,
                              {
                                orderId: order.id,
                                itemsCount: orderItems.length,
                                calculatedTotal: calculatedTotal,
                                orderNumber: order.orderNumber
                              }
                            );
                          }

                          if (calculatedTotal <= 0) {
                            // Fallback to stored total if no calculated total
                            calculatedTotal = Number(order.total || 0);
                          }

                          return formatCurrency(calculatedTotal);
                        })()}
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
                                  const price = parseFloat(product.price || item.unitPrice); // Use unitPrice if product.price is missing
                                  const itemTax = (afterTaxPrice - price) * Number(item.quantity || 0);
                                  return (
                                    <div className="text-xs text-green-600">
                                      Thuế: {formatCurrency(itemTax)}
                                    </div>
                                  );
                                } else {
                                  // Handle cases where afterTaxPrice is not available
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

                      console.log('🔍 Order Summary Calculation:', {
                        orderItems: orderItems?.length || 0,
                        products: products?.length || 0,
                        selectedOrderId: selectedOrder?.id
                      });

                      if (Array.isArray(orderItems) && Array.isArray(products)) {
                        orderItems.forEach((item: any) => {
                          const basePrice = Number(item.unitPrice || 0);
                          const quantity = Number(item.quantity || 0);
                          const product = products.find((p: any) => p.id === item.productId);

                          console.log(`📊 Processing item ${item.id}:`, {
                            productId: item.productId,
                            basePrice,
                            quantity,
                            productFound: !!product,
                            productAfterTaxPrice: product?.afterTaxPrice
                          });

                          // Calculate subtotal exactly as Order Details display
                          const itemSubtotal = basePrice * quantity;
                          orderDetailsSubtotal += itemSubtotal;

                          // Tax calculation with proper validation
                          if (product?.afterTaxPrice &&
                              product.afterTaxPrice !== null &&
                              product.afterTaxPrice !== "" &&
                              product.afterTaxPrice !== "0.00") {
                            const afterTaxPrice = parseFloat(product.afterTaxPrice);
                            const originalPrice = parseFloat(product.price || basePrice); // Use basePrice if product.price is missing
                            const taxPerUnit = Math.max(0, afterTaxPrice - originalPrice);
                            const itemTax = taxPerUnit * quantity;
                            orderDetailsTax += itemTax;

                            console.log(`💸 Tax calculated for ${item.productName}:`, {
                              afterTaxPrice,
                              originalPrice,
                              taxPerUnit,
                              quantity,
                              itemTax
                            });
                          }
                        });
                      }

                      const finalTotal = orderDetailsSubtotal + Math.abs(orderDetailsTax);

                      console.log('💰 Order Summary Final Calculation:', {
                        subtotal: orderDetailsSubtotal,
                        tax: orderDetailsTax,
                        finalTotal: finalTotal
                      });

                      return (
                        <>
                          <div className="flex justify-between">
                            <span>{t('common.subtotalLabel')}</span>
                            <span>{formatCurrency(orderDetailsSubtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('orders.tax')}</span>
                            <span>{formatCurrency(Math.abs(orderDetailsTax))}</span>
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
                            const originalPrice = parseFloat(product.price || unitPrice);
                            const taxPerUnit = Math.max(0, afterTaxPrice - originalPrice);
                            itemTax = taxPerUnit * quantity;
                            calculatedTax += itemTax;
                            console.log(`💸 Tax calculated for ${item.productName}:`, {
                              afterTaxPrice,
                              originalPrice,
                              taxPerUnit,
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

                        const finalTotal = calculatedSubtotal + Math.abs(calculatedTax);

                        console.log('💰 Kết quả tính toán cuối:', {
                          subtotal: calculatedSubtotal,
                          tax: calculatedTax,
                          finalTotal: finalTotal,
                          itemsProcessed: processedItems.length
                        });

                        // Kiểm tra tổng tiền hợp lệ
                        if (finalTotal <= 0 || isNaN(finalTotal)) {
                          console.error('❌ Tổng tiền không hợp lệ:', finalTotal);
                          toast({
                            title: 'Lỗi',
                            description: 'Tổng tiền đơn hàng không hợp lệ. Vui lòng kiểm tra lại.',
                            variant: 'destructive',
                          });
                          return;
                        }

                        // Kiểm tra items hợp lệ
                        if (!processedItems || processedItems.length === 0) {
                          console.error('❌ Không có items để tạo receipt preview');
                          toast({
                            title: 'Lỗi',
                            description: 'Không có món ăn trong đơn hàng để thanh toán.',
                            variant: 'destructive',
                          });
                          return;
                        }

                        console.log('✅ Creating receiptPreview with:', {
                          itemsCount: processedItems.length,
                          calculatedSubtotal,
                          calculatedTax: Math.abs(calculatedTax),
                          finalTotal,
                          firstItem: processedItems[0]
                        });

                        // Tạo receipt preview data với định dạng đúng và validation
                        const receiptPreview = {
                          id: selectedOrder.id,
                          orderId: selectedOrder.id,
                          orderNumber: selectedOrder.orderNumber || `ORD-${selectedOrder.id}`,
                          tableId: selectedOrder.tableId,
                          customerCount: selectedOrder.customerCount || 1,
                          customerName: selectedOrder.customerName || 'Khách hàng',
                          items: processedItems,
                          orderItems: processedItems,
                          subtotal: calculatedSubtotal.toString(),
                          tax: Math.abs(calculatedTax).toString(),
                          total: finalTotal.toString(),
                          exactSubtotal: calculatedSubtotal,
                          exactTax: Math.abs(calculatedTax),
                          exactTotal: finalTotal,
                          paymentMethod: 'preview',
                          amountReceived: finalTotal.toString(),
                          change: '0.00',
                          cashierName: 'Order Management',
                          createdAt: new Date().toISOString(),
                          transactionId: `TXN-PREVIEW-${Date.now()}`,
                          calculatedSubtotal: calculatedSubtotal,
                          calculatedTax: Math.abs(calculatedTax),
                          calculatedTotal: finalTotal
                        };

                        // Validate receipt preview data thoroughly
                        if (!receiptPreview.items || !Array.isArray(receiptPreview.items) || receiptPreview.items.length === 0) {
                          console.error('❌ Receipt preview validation failed - invalid items:', {
                            hasItems: !!receiptPreview.items,
                            isArray: Array.isArray(receiptPreview.items),
                            length: receiptPreview.items?.length || 0
                          });
                          toast({
                            title: 'Lỗi',
                            description: 'Không thể tạo xem trước hóa đơn - dữ liệu món ăn không hợp lệ',
                            variant: 'destructive',
                          });
                          return;
                        }

                        console.log('✅ Receipt preview validation passed:', {
                          itemsCount: receiptPreview.items.length,
                          total: receiptPreview.total,
                          exactTotal: receiptPreview.exactTotal
                        });

                        console.log('✅ Thiết lập dữ liệu để hiển thị preview:', {
                          receiptTotal: receiptPreview.total,
                          receiptExactTotal: receiptPreview.exactTotal,
                          orderTotal: finalTotal,
                          orderId: selectedOrder.id
                        });

                        // Step 5: Create payment order data and show receipt preview
                        const paymentOrderData = {
                          ...selectedOrder,
                          id: selectedOrder.id,
                          orderItems: processedItems,
                          processedItems: processedItems,
                          calculatedSubtotal: calculatedSubtotal,
                          calculatedTax: calculatedTax,
                          calculatedTotal: finalTotal,
                          total: finalTotal
                        };

                        // Close order details modal and show receipt preview
                        try {
                          setOrderDetailsOpen(false);
                          setSelectedOrder(selectedOrder);
                          setOrderForPayment(paymentOrderData);
                          setPreviewReceipt(receiptPreview);

                          // Use setTimeout to ensure state is set before showing modal
                          setTimeout(() => {
                            setShowReceiptPreview(true);
                            console.log('🚀 Order Management: Receipt preview modal should now be visible');
                          }, 100);

                        } catch (stateError) {
                          console.error('❌ Error setting modal states:', stateError);
                          toast({
                            title: 'Lỗi',
                            description: 'Không thể hiển thị xem trước hóa đơn',
                            variant: 'destructive',
                          });
                        }
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
                  onClick={() => setMixedPaymentOpen(true)} // This should probably trigger the payment directly
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
          setPreviewReceipt(null);
        }}
        onSelectMethod={(method, data) => {
          console.log('🎯 Order Management payment method selected:', method, data);
          console.log('🔍 Current orderForPayment state:', {
            orderForPayment: !!orderForPayment,
            orderForPaymentId: orderForPayment?.id,
            calculatedTotal: orderForPayment?.calculatedTotal,
            itemsCount: orderForPayment?.processedItems?.length || 0
          });

          setShowPaymentMethodModal(false);

          // Handle different payment completion scenarios
          if (method === "paymentCompleted" && data?.success) {
            console.log('✅ Payment completed successfully from payment modal');

            // Close all modals
            setOrderForPayment(null);
            setOrderDetailsOpen(false);
            setSelectedOrder(null);
            setPreviewReceipt(null);

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
            setPreviewReceipt(null);
          } else {
            // For other payment methods, proceed with payment completion
            console.log('💳 Processing payment for order:', {
              orderId: orderForPayment?.id,
              paymentMethod: method.nameKey || method,
              calculatedTotal: orderForPayment?.calculatedTotal
            });

            if (orderForPayment?.id && orderForPayment?.calculatedTotal > 0) {
              completePaymentMutation.mutate({
                orderId: orderForPayment.id,
                paymentMethod: method.nameKey || method,
              });
            } else {
              console.error('❌ Invalid order data for payment:', {
                orderId: orderForPayment?.id,
                calculatedTotal: orderForPayment?.calculatedTotal
              });
              toast({
                title: 'Lỗi',
                description: 'Dữ liệu đơn hàng không hợp lệ để thanh toán',
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
          taxRate: item.taxRate,
          afterTaxPrice: item.afterTaxPrice
        })) || []}
        orderForPayment={orderForPayment}
        products={products}
        receipt={previewReceipt}
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
          total={orderForPayment?.calculatedTotal ? Math.round(orderForPayment.calculatedTotal) : 0}
          cartItems={orderForPayment?.processedItems?.map((item: any) => ({
            id: item.productId,
            name: item.productName,
            price: item.price,
            quantity: item.quantity,
            sku: item.sku,
            taxRate: item.taxRate,
            afterTaxPrice: item.afterTaxPrice
          })) || []}
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