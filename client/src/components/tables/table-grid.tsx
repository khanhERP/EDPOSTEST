import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderDialog } from "@/components/orders/order-dialog";
import {
  Users,
  Clock,
  CheckCircle2,
  Eye,
  CreditCard,
  QrCode,
  Plus,
  Printer,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import QRCodeLib from "qrcode";
import { createQRPosAsync, type CreateQRPosRequest } from "@/lib/api";
import { PaymentMethodModal } from "@/components/pos/payment-method-modal";
import { EInvoiceModal } from "@/components/pos/einvoice-modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import type { Table, Order } from "@shared/schema";

interface TableGridProps {
  onTableSelect?: (tableId: number | null) => void;
  selectedTableId?: number | null;
}

export function TableGrid({ onTableSelect, selectedTableId }: TableGridProps) {
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const [pointsPaymentOpen, setPointsPaymentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pointsAmount, setPointsAmount] = useState("");
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [mixedPaymentOpen, setMixedPaymentOpen] = useState(false);
  const [mixedPaymentData, setMixedPaymentData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [orderForPayment, setOrderForPayment] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const { toast } = useToast();
  const { t, currentLanguage } = useTranslation();
  const queryClient = useQueryClient();
  const [orderForEInvoice, setOrderForEInvoice] = useState<any>(null);

  const { data: tables, isLoading, refetch: refetchTables } = useQuery({
    queryKey: ["/api/tables"],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 20 * 60 * 1000, // Keep in cache for 20 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    networkMode: 'online',
  });

  const { data: orders, refetch: refetchOrders } = useQuery({
    queryKey: ["/api/orders"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    networkMode: 'online',
  });

  // Pre-calculate active orders once and memoize
  const activeOrders = useMemo(() => {
    return Array.isArray(orders) ? orders.filter(
      (order: any) => !["paid", "cancelled"].includes(order.status)
    ) : [];
  }, [orders]);

  // Pre-calculate order totals map to avoid repeated calculations
  const orderTotalsMap = useMemo(() => {
    const totalsMap = new Map();
    
    if (Array.isArray(orders) && Array.isArray(products)) {
      orders.forEach((order: any) => {
        if (!["paid", "cancelled"].includes(order.status)) {
          // Use stored total from database as primary source
          const storedTotal = Number(order.total || 0);
          totalsMap.set(order.id, {
            orderId: order.id,
            storedTotal: storedTotal,
            orderNumber: order.orderNumber,
            tableId: order.tableId
          });
        }
      });
    }
    
    return totalsMap;
  }, [orders, products]);

  // Only fetch order items when specifically needed for order details
  const { data: allOrderItems } = useQuery({
    queryKey: ["/api/all-order-items", activeOrders.map(o => o.id).join(",")],
    enabled: false, // Disable automatic fetching
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const itemsMap = new Map();

      for (const order of activeOrders) {
        try {
          const response = await apiRequest("GET", `/api/order-items/${order.id}`);
          const items = await response.json();
          itemsMap.set(order.id, Array.isArray(items) ? items : []);
        } catch (error) {
          console.error(`Error fetching items for order ${order.id}:`, error);
          itemsMap.set(order.id, []);
        }
      }

      return itemsMap;
    },
  });

  const {
    data: orderItems,
    isLoading: orderItemsLoading,
    refetch: refetchOrderItems,
  } = useQuery({
    queryKey: ["/api/order-items", selectedOrder?.id],
    enabled: !!selectedOrder?.id && orderDetailsOpen,
    refetchOnWindowFocus: false,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    queryFn: async () => {
      const orderId = selectedOrder.id;
      if (!orderId) {
        console.log("No order ID available for fetching items");
        return [];
      }

      console.log("=== FETCHING ORDER ITEMS ===");
      console.log("Fetching order items for order ID:", orderId);
      console.log("API URL will be:", `/api/order-items/${orderId}`);
      console.log("Query enabled conditions:", {
        hasOrderId: !!selectedOrder?.id,
        dialogOpen: orderDetailsOpen,
        bothTrue: !!selectedOrder?.id && orderDetailsOpen,
      });

      const response = await apiRequest("GET", `/api/order-items/${orderId}`);
      const data = await response.json();

      console.log("Raw order items response for order", orderId, ":", data);
      console.log("Response type:", typeof data, "Length:", data?.length);
      console.log("Is array?", Array.isArray(data));

      // Log each item in detail
      if (Array.isArray(data) && data.length > 0) {
        console.log("Order items details:");
        data.forEach((item, index) => {
          console.log(`  Item ${index + 1}:`, {
            id: item.id,
            orderId: item.orderId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          });
        });
      } else {
        console.log("No items found or response is not an array");
      }

      // Ensure we return an array
      const items = Array.isArray(data) ? data : [];
      console.log("Final processed items count:", items.length);
      console.log("About to return items:", items);
      console.log("=== END FETCHING ORDER ITEMS ===");

      return items;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (products don't change often)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["/api/store-settings"],
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes (settings rarely change)
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: pointsPaymentOpen,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Filter customers based on search term
  const filteredCustomers = Array.isArray(customers)
    ? customers.filter((customer: any) => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
          customer.name?.toLowerCase().includes(searchLower) ||
          customer.customerId?.toLowerCase().includes(searchLower) ||
          customer.phone?.includes(searchTerm)
        );
      })
    : [];

  // Force refetch order items when dialog opens
  useEffect(() => {
    if (orderDetailsOpen && selectedOrder?.id) {
      console.log(
        "Dialog opened, refetching order items for order:",
        selectedOrder.id,
      );
      refetchOrderItems();
    }
  }, [orderDetailsOpen, selectedOrder?.id, refetchOrderItems]);

  // Listen for custom events to refresh data - only when really needed
  useEffect(() => {
    const handleRefreshData = (event: CustomEvent) => {
      console.log("🔄 Table Grid: Received refresh data event:", event.detail);

      // Only refresh if the event is critical or forced
      if (event.detail?.forceRefresh || event.detail?.reason === 'payment_completed') {
        // Clear cache and refetch fresh data
        queryClient.removeQueries({ queryKey: ["/api/tables"] });
        queryClient.removeQueries({ queryKey: ["/api/orders"] });

        // Refresh data
        refetchTables();
        refetchOrders();

        console.log("✅ Table Grid: Data refreshed successfully");
      } else {
        // Gentle invalidation - let cache handle it
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      }
    };

    const handleOrderUpdated = (event: CustomEvent) => {
      console.log("📋 Table Grid: Order updated event:", event.detail);
      // Only invalidate, don't force refetch
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    };

    // Add event listeners
    window.addEventListener('refreshTableData', handleRefreshData as EventListener);
    window.addEventListener('orderUpdated', handleOrderUpdated as EventListener);

    return () => {
      window.removeEventListener('refreshTableData', handleRefreshData as EventListener);
      window.removeEventListener('orderUpdated', handleOrderUpdated as EventListener);
    };
  }, [queryClient, refetchTables, refetchOrders]);

  // Add event listeners for payment completion
  useEffect(() => {
    const handlePaymentCompleted = (event: CustomEvent) => {
      console.log("💳 Table Grid: Payment completed event received:", event.detail);

      // Force immediate data refresh with multiple strategies
      const refreshData = async () => {
        console.log("🔄 Table Grid: Starting aggressive refresh after payment completion");

        try {
          // Clear all cached data completely
          queryClient.clear();
          queryClient.removeQueries();

          // Force fresh data fetch multiple times
          for (let i = 0; i < 3; i++) {
            await Promise.all([
              refetchTables(),
              refetchOrders()
            ]);

            if (i < 2) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          console.log("✅ Table Grid: Aggressive payment refresh completed");

          toast({
            title: "Đã cập nhật",
            description: "Trạng thái bàn đã được làm mới sau thanh toán",
          });

        } catch (error) {
          console.error("❌ Table Grid: Error refreshing after payment:", error);
          // Fallback: force page reload if refresh fails
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      };

      // Execute refresh immediately
      refreshData();
    };

    const handleOrderStatusUpdate = (event: CustomEvent) => {
      console.log("📋 Table Grid: Order status updated:", event.detail);

      if (event.detail?.status === "paid") {
        console.log("💳 Table Grid: Order marked as paid, refreshing table status");

        // Clear cache and refresh immediately for paid orders
        queryClient.removeQueries({ queryKey: ["/api/tables"] });
        queryClient.removeQueries({ queryKey: ["/api/orders"] });

        setTimeout(() => {
          refetchTables();
          refetchOrders();
        }, 50);
      }
    };

    const handleForceRefresh = (event: CustomEvent) => {
      console.log("🔄 Table Grid: Force refresh requested:", event.detail);

      if (event.detail?.reason === "payment_completed") {
        console.log("💰 Table Grid: Refreshing due to payment completion");

        // Clear all data and force fresh fetch
        queryClient.clear();

        Promise.all([
          refetchTables(),
          refetchOrders()
        ]).then(() => {
          console.log("✅ Table Grid: Force refresh completed");
        });
      }
    };

    // Add event listeners
    window.addEventListener('paymentCompleted', handlePaymentCompleted as EventListener);
    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate as EventListener);
    window.addEventListener('forceRefresh', handleForceRefresh as EventListener);

    return () => {
      window.removeEventListener('paymentCompleted', handlePaymentCompleted as EventListener);
      window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate as EventListener);
      window.removeEventListener('forceRefresh', handleForceRefresh as EventListener);
    };
  }, [queryClient, toast, refetchTables, refetchOrders]);

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ tableId, status }: { tableId: number; status: string }) =>
      apiRequest("PUT", `/api/tables/${tableId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); // Invalidate orders as table status might affect them
      toast({
        title: t("tables.title"),
        description: t("common.success"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      });
    },
  });

  const completePaymentMutation = useMutation({
    mutationFn: ({
      orderId,
      paymentMethod,
    }: {
      orderId: number;
      paymentMethod: string;
    }) =>
      apiRequest("PUT", `/api/orders/${orderId}/status`, {
        status: "paid",
        paymentMethod,
      }),
    onSuccess: async (data, variables) => {
      console.log("🎯 Table completePaymentMutation.onSuccess called");

      // Force immediate data refresh with multiple strategies
      console.log("🔄 Table: Starting comprehensive data refresh after payment success");

      // Strategy 1: Clear all cached data completely
      queryClient.clear();

      // Strategy 2: Invalidate specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/order-items", variables.orderId],
      });

      // Strategy 3: Force immediate fresh fetch
      try {
        await Promise.all([
          refetchTables(),
          refetchOrders()
        ]);
        console.log("✅ Table: Immediate refresh completed successfully");
      } catch (refreshError) {
        console.error("❌ Table: Error during immediate refresh:", refreshError);
      }

      // Strategy 4: Delayed refresh for consistency (backup)
      setTimeout(async () => {
        console.log("🔄 Table: Performing delayed backup refresh");
        try {
          await Promise.all([
            refetchTables(),
            refetchOrders()
          ]);
          console.log("✅ Table: Delayed backup refresh completed");
        } catch (error) {
          console.error("❌ Table: Error during delayed refresh:", error);
        }
      }, 500);

      // Strategy 5: Dispatch custom events for cross-component coordination
      if (typeof window !== 'undefined') {
        const events = [
          new CustomEvent('paymentCompleted', {
            detail: {
              orderId: variables.orderId,
              paymentMethod: variables.paymentMethod,
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('orderStatusUpdated', {
            detail: {
              orderId: variables.orderId,
              status: 'paid',
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('forceRefresh', {
            detail: {
              reason: 'payment_completed',
              orderId: variables.orderId,
              source: 'table-grid'
            }
          })
        ];

        events.forEach(event => {
          console.log("📡 Table: Dispatching refresh event:", event.type);
          window.dispatchEvent(event);
        });
      }

      toast({
        title: "Thanh toán thành công",
        description: "Đơn hàng đã được thanh toán và dữ liệu đã được làm mới",
      });

      // Fetch the completed order and its items for receipt
      try {
        const [completedOrder, orderItemsData] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ["/api/orders", variables.orderId],
            queryFn: async () => {
              const response = await apiRequest(
                "GET",
                `/api/orders/${variables.orderId}`,
              );
              return response.json();
            },
          }),
          queryClient.fetchQuery({
            queryKey: ["/api/order-items", variables.orderId],
            queryFn: async () => {
              const response = await apiRequest(
                "GET",
                `/api/order-items/${variables.orderId}`,
              );
              return response.json();
            },
          }),
        ]);

        if (completedOrder && orderItemsData) {
          console.log("✅ Table payment completed - preparing receipt data");

          // Use same calculation logic as Order Details display to get exact values
          let subtotal = 0;
          let totalTax = 0;

          const processedItems = Array.isArray(orderItemsData)
            ? orderItemsData.map((item: any) => {
                const basePrice = Number(item.unitPrice || 0);
                const quantity = Number(item.quantity || 0);
                const product = Array.isArray(products)
                  ? products.find((p: any) => p.id === item.productId)
                  : null;
                const itemTaxRate = product?.taxRate
                  ? parseFloat(product.taxRate)
                  : 10;

                // Calculate subtotal (base price without tax) - same as Order Details
                subtotal += basePrice * quantity;

                // Use same tax calculation logic as Order Details
                if (
                  product?.afterTaxPrice &&
                  product.afterTaxPrice !== null &&
                  product.afterTaxPrice !== ""
                ) {
                  const afterTaxPrice = parseFloat(product.afterTaxPrice);
                  // Tax = afterTaxPrice - basePrice (per unit), then multiply by quantity
                  const taxPerUnit = afterTaxPrice - basePrice;
                  totalTax += taxPerUnit * quantity;
                } else {
                  // No afterTaxPrice means no tax
                  totalTax += 0;
                }

                return {
                  id: item.id,
                  productId: item.productId,
                  productName:
                    item.productName || getProductName(item.productId),
                  quantity: item.quantity,
                  price: item.unitPrice,
                  total: item.total,
                  sku: item.productSku || `SP${item.productId}`,
                  taxRate: itemTaxRate,
                };
              })
            : [];

          // Use EXACT same calculation logic as Order Details display to ensure consistency
          let orderDetailsSubtotal = 0;
          let orderDetailsTax = 0;

          if (Array.isArray(orderItemsData) && Array.isArray(products)) {
            orderItemsData.forEach((item: any) => {
              const basePrice = Number(item.unitPrice || 0);
              const quantity = Number(item.quantity || 0);
              const product = products.find(
                (p: any) => p.id === item.productId,
              );

              // Calculate subtotal exactly as Order Details
              orderDetailsSubtotal += basePrice * quantity;

              // Use EXACT same tax calculation logic as Order Details
              if (
                product?.afterTaxPrice &&
                product.afterTaxPrice !== null &&
                product.afterTaxPrice !== ""
              ) {
                const afterTaxPrice = parseFloat(product.afterTaxPrice);
                // Tax = afterTaxPrice - basePrice (per unit), then multiply by quantity
                const taxPerUnit = afterTaxPrice - basePrice;
                orderDetailsTax += Math.floor(taxPerUnit * quantity);
              } else {
                // No afterTaxPrice means no tax
                orderDetailsTax += 0;
              }
            });
          }

          // Use exact calculated values from Order Details display
          const receiptData = {
            ...completedOrder,
            transactionId: `TXN-${Date.now()}`,
            items: processedItems,
            subtotal: orderDetailsSubtotal.toString(),
            tax: orderDetailsTax.toString(),
            total: (orderDetailsSubtotal + orderDetailsTax).toString(),
            paymentMethod: variables.paymentMethod || "cash",
            amountReceived: (orderDetailsSubtotal + orderDetailsTax).toString(),
            change: "0.00",
            cashierName: "Table Service",
            createdAt: new Date().toISOString(),
          };

          console.log("📄 Table receipt data prepared:", receiptData);

          // Close all dialogs first
          setOrderDetailsOpen(false);
          setPaymentMethodsOpen(false);
          setShowPaymentMethodModal(false);
          setShowEInvoiceModal(false);
          setOrderForPayment(null);

          // Show receipt modal
          setSelectedReceipt(receiptData);
          setShowReceiptModal(true);
        }
      } catch (error) {
        console.error("Error fetching order details for receipt:", error);
        toast({
          title: "Cảnh báo",
          description: "Thanh toán thành công nhưng không thể hiển thị hóa đơn",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      console.log("❌ Table completePaymentMutation.onError called");
      toast({
        title: "Lỗi",
        description: "Không thể hoàn tất thanh toán",
        variant: "destructive",
      });
      setOrderForPayment(null);
    },
  });

  const pointsPaymentMutation = useMutation({
    mutationFn: async ({
      customerId,
      points,
      orderId,
    }: {
      customerId: number;
      points: number;
      orderId: number;
    }) => {
      // First redeem points
      await apiRequest("POST", "/api/customers/redeem-points", {
        customerId,
        points,
      });

      // Then mark order as paid
      await apiRequest("PUT", `/api/orders/${orderId}/status`, {
        status: "paid",
        paymentMethod: "points",
        customerId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/order-items", variables.orderId],
      });
      setOrderDetailsOpen(false);
      setPointsPaymentOpen(false);
      setSelectedCustomer(null);
      setPointsAmount("");
      setSearchTerm("");
      toast({
        title: "Thanh toán thành công",
        description: "Đơn hàng đã được thanh toán bằng điểm",
      });

      // Fetch the completed order to get its details for receipt
      queryClient
        .fetchQuery({
          queryKey: ["/api/orders", variables.orderId],
          queryFn: async () => {
            const response = await apiRequest(
              "GET",
              `/api/orders/${variables.orderId}`,
            );
            return response.json();
          },
        })
        .then((completedOrder) => {
          if (completedOrder) {
            console.log("Completed order for receipt:", completedOrder);
            setSelectedReceipt(completedOrder); // Set the order for the receipt modal
            setShowReceiptModal(true); // Show the receipt modal
          }
        });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể hoàn tất thanh toán bằng điểm",
        variant: "destructive",
      });
    },
  });

  // Add the missing handlePointsPayment function
  const handlePointsPayment = () => {
    if (!selectedCustomer || !selectedOrder) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn khách hàng và đơn hàng",
        variant: "destructive",
      });
      return;
    }

    const customerPoints = selectedCustomer.points || 0;
    const orderTotal = Number(selectedOrder.total || 0);
    const pointsValue = customerPoints * 1000; // 1 point = 1000 VND

    if (customerPoints === 0) {
      toast({
        title: "Lỗi",
        description: "Khách hàng không có điểm",
        variant: "destructive",
      });
      return;
    }

    if (pointsValue >= orderTotal) {
      // Full points payment
      const pointsToUse = Math.ceil(orderTotal / 1000);
      pointsPaymentMutation.mutate({
        customerId: selectedCustomer.id,
        points: pointsToUse,
        orderId: selectedOrder.id,
      });
    } else {
      // Mixed payment - use all available points + other payment method
      const remainingAmount = orderTotal - pointsValue;
      setMixedPaymentData({
        customerId: selectedCustomer.id,
        pointsToUse: customerPoints,
        orderId: selectedOrder.id,
        remainingAmount,
      });
      setPointsPaymentOpen(false);
      setMixedPaymentOpen(true);
    }
  };

  const mixedPaymentMutation = useMutation({
    mutationFn: async ({
      customerId,
      points,
      orderId,
      paymentMethod,
    }: {
      customerId: number;
      points: number;
      orderId: number;
      paymentMethod: string;
    }) => {
      // First redeem all available points
      await apiRequest("POST", "/api/customers/redeem-points", {
        customerId,
        points,
      });

      // Then mark order as paid with mixed payment
      await apiRequest("PUT", `/api/orders/${orderId}/status`, {
        status: "paid",
        paymentMethod: `points + ${paymentMethod}`,
        customerId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/order-items", variables.orderId],
      });
      setOrderDetailsOpen(false);
      setMixedPaymentOpen(false);
      setMixedPaymentData(null);
      setSelectedCustomer(null);
      setPointsAmount("");
      setSearchTerm("");
      toast({
        title: "Thanh toán thành công",
        description:
          "Đơn hàng đã được thanh toán bằng điểm + tiền mặt/chuyển khoản",
      });

      // Fetch the completed order to get its details for receipt
      queryClient
        .fetchQuery({
          queryKey: ["/api/orders", variables.orderId],
          queryFn: async () => {
            const response = await apiRequest(
              "GET",
              `/api/orders/${variables.orderId}`,
            );
            return response.json();
          },
        })
        .then((completedOrder) => {
          if (completedOrder) {
            console.log("Completed order for receipt:", completedOrder);
            setSelectedReceipt(completedOrder); // Set the order for the receipt modal
            setShowReceiptModal(true); // Show the receipt modal
          }
        });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể hoàn tất thanh toán hỗn hợp",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      // First cancel the order
      const response = await apiRequest(
        "PUT",
        `/api/orders/${orderId}/status`,
        { status: "cancelled" },
      );

      // Find the order to get its table ID
      const order = orders?.find((o: any) => o.id === orderId);
      if (order?.tableId) {
        // Check if there are any other active orders on this table
        const otherActiveOrders = orders?.filter(
          (o: any) =>
            o.tableId === order.tableId &&
            o.id !== orderId &&
            !["paid", "cancelled"].includes(o.status),
        );

        // If no other active orders, update table status to available
        if (!otherActiveOrders || otherActiveOrders.length === 0) {
          await apiRequest("PUT", `/api/tables/${order.tableId}/status`, {
            status: "available",
          });
        }
      }

      return response;
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/order-items", orderId],
      }); // Invalidate items for the deleted order
      toast({
        title: "Xóa đơn hàng thành công",
        description: "Đơn hàng đã được hủy và bàn đã được cập nhật",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa đơn hàng",
        variant: "destructive",
      });
    },
  });

  // Add mutation to recalculate order totals
  const recalculateOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      console.log("🧮 Recalculating order total for order:", orderId);

      // Fetch current order items after deletion
      const response = await apiRequest("GET", `/api/order-items/${orderId}`);
      const remainingItems = await response.json();

      console.log(
        "📦 Remaining items after deletion:",
        remainingItems?.length || 0,
      );

      // Keep order even if no items remain - just recalculate totals to zero
      if (!remainingItems || remainingItems.length === 0) {
        console.log(
          "📝 No items left, setting order totals to zero but keeping order",
        );

        // Set totals to zero instead of deleting the order
        const updateResult = await apiRequest("PUT", `/api/orders/${orderId}`, {
          subtotal: "0",
          tax: "0",
          total: "0",
        });

        console.log("✅ Order totals reset to zero successfully");
        return updateResult;
      }

      // Calculate new totals based on remaining items
      let newSubtotal = 0;
      let newTax = 0;

      if (Array.isArray(remainingItems) && remainingItems.length > 0) {
        remainingItems.forEach((item: any) => {
          const basePrice = Number(item.unitPrice || 0);
          const quantity = Number(item.quantity || 0);
          const product = Array.isArray(products)
            ? products.find((p: any) => p.id === item.productId)
            : null;
          if (
            product?.afterTaxPrice &&
            product.afterTaxPrice !== null &&
            product.afterTaxPrice !== ""
          ) {
            const afterTaxPrice = parseFloat(product.afterTaxPrice);
            const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
            newTax += taxPerUnit * quantity;
          }
          // No tax calculation if no afterTaxPrice in database
        });
      }

      const newTotal = newSubtotal + newTax;

      console.log("💰 Calculated new totals:", {
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        hasItems: remainingItems?.length > 0,
      });

      // Update order with new totals
      const updateResult = await apiRequest("PUT", `/api/orders/${orderId}`, {
        subtotal: newSubtotal.toString(),
        tax: newTax.toString(),
        total: newTotal.toString(),
      });

      console.log("✅ Order totals updated successfully");
      return updateResult;
    },
    onSuccess: (data, orderId) => {
      console.log(
        "🔄 Refreshing UI after order total recalculation for order:",
        orderId,
      );

      // Clear all cache and force fresh data fetch
      queryClient.clear(); // Clear entire cache
      queryClient.removeQueries(); // Remove all queries

      // Force immediate fresh fetch without cache
      Promise.all([
        fetch("/api/orders", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/tables", { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/order-items/${orderId}`, { cache: "no-store" }).then((r) =>
          r.json(),
        ),
      ])
        .then(() => {
          console.log(
            "✅ All queries refetched successfully, UI should now show updated totals",
          );

          // Force component re-render by setting a timestamp
          queryClient.setQueryData(["/api/orders"], (oldData: any) => {
            if (!oldData || !Array.isArray(oldData)) return oldData;

            return oldData.map((order: any) => {
              if (order.id === orderId) {
                console.log(
                  `🔄 Forcing UI refresh for order ${orderId} with total: ${order.total}`,
                );
                return { ...order, _lastUpdated: Date.now() };
              }
              return order;
            });
          });
        })
        .catch((error) => {
          console.error("❌ Error during query refetch:", error);
        });
    },
    onError: (error) => {
      console.error("❌ Error recalculating order total:", error);
    },
  });

  const getTableStatus = (status: string) => {
    const statusConfig = {
      available: {
        label: t("tables.available"),
        variant: "default" as const,
        color: "bg-green-500",
      },
      occupied: {
        label: t("tables.occupied"),
        variant: "destructive" as const,
        color: "bg-red-500",
      },
      reserved: {
        label: t("tables.reserved"),
        variant: "secondary" as const,
        color: "bg-yellow-500",
      },
      maintenance: {
        label: t("tables.outOfService"),
        variant: "outline" as const,
        color: "bg-gray-500",
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.available
    );
  };

  // Mutation to recalculate order total after item changes
  const recalculateOrderTotalMutation = useMutation({
    mutationFn: async (orderId: number) => {
      // Fetch current order items
      const response = await apiRequest("GET", `/api/order-items/${orderId}`);
      const items = await response.json();

      // Calculate new total based on remaining items
      let newSubtotal = 0;
      let newTax = 0;

      if (Array.isArray(items) && Array.isArray(products)) {
        items.forEach((item: any) => {
          const basePrice = Number(item.unitPrice || 0);
          const quantity = Number(item.quantity || 0);
          const product = products.find((p: any) => p.id === item.productId);

          // Calculate subtotal
          newSubtotal += basePrice * quantity;

          // Calculate tax using same logic as order details
          if (
            product?.afterTaxPrice &&
            product.afterTaxPrice !== null &&
            product.afterTaxPrice !== ""
          ) {
            const afterTaxPrice = parseFloat(product.afterTaxPrice);
            const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
            newTax += taxPerUnit * quantity;
          }
        });
      }

      const newTotal = newSubtotal + newTax;

      // Update order with new totals
      return apiRequest("PUT", `/api/orders/${orderId}`, {
        subtotal: newSubtotal.toString(),
        tax: newTax.toString(),
        total: newTotal.toString(),
      });
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/order-items", orderId],
      });
    },
  });

  const getActiveOrder = (tableId: number) => {
    if (!orders || !Array.isArray(orders)) return null;

    // Get all active orders for this table and sort by orderedAt descending to get the latest
    const activeOrders = orders.filter(
      (order: Order) =>
        order.tableId === tableId &&
        !["paid", "cancelled"].includes(order.status),
    );

    console.log(
      `Active orders for table ${tableId}:`,
      activeOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderedAt: o.orderedAt,
        status: o.status,
        total: o.total,
      })),
    );

    if (activeOrders.length === 0) return null;

    // Sort by orderedAt descending and return the most recent order
    const latestOrder = activeOrders.sort(
      (a: Order, b: Order) =>
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )[0];

    console.log(`Latest order for table ${tableId}:`, {
      id: latestOrder.id,
      orderNumber: latestOrder.orderNumber,
      orderedAt: latestOrder.orderedAt,
      total: latestOrder.total,
    });

    return latestOrder;
  };

  // Helper function to get product name
  const getProductName = (productId: number) => {
    const product = Array.isArray(products)
      ? products.find((p: any) => p.id === productId)
      : null;
    return product?.name || `Product #${productId}`;
  };

  // Helper function to get table info
  const getTableInfo = (tableId: number) => {
    const table = Array.isArray(tables)
      ? tables.find((t: any) => t.id === tableId)
      : null;
    return table;
  };

  // Helper function to handle edit order
  const handleEditOrder = (order: Order, table: Table) => {
    setEditingOrder(order);
    setEditingTable(table);
    setEditOrderOpen(true);
  };

  // Helper function to handle delete order
  const handleDeleteOrder = (order: Order) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) {
      deleteOrderMutation.mutate(order.id);
    }
  };

  // Helper function to handle QR payment close
  const handleQRPaymentClose = () => {
    setShowQRPayment(false);
    setQrCodeUrl("");
    setSelectedPaymentMethod("");
    setMixedPaymentOpen(false);
  };

  // Helper function to handle QR payment confirm
  const handleQRPaymentConfirm = () => {
    if (!selectedOrder) return;

    if (mixedPaymentData) {
      // Mixed payment completion
      mixedPaymentMutation.mutate({
        customerId: mixedPaymentData.customerId,
        points: mixedPaymentData.pointsToUse,
        orderId: mixedPaymentData.orderId,
        paymentMethod: selectedPaymentMethod?.method?.name || "transfer",
      });
    } else {
      // Regular payment completion
      completePaymentMutation.mutate({
        orderId: selectedOrder.id,
        paymentMethod: selectedPaymentMethod?.key || "qrCode",
      });
    }

    setShowQRPayment(false);
    setQrCodeUrl("");
    setSelectedPaymentMethod("");
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    onTableSelect?.(table.id);

    if (table.status === "available") {
      setOrderDialogOpen(true);
    }
  };

  const handleStatusChange = (tableId: number, newStatus: string) => {
    updateTableStatusMutation.mutate({ tableId, status: newStatus });
  };

  const handleViewOrderDetails = (order: Order) => {
    console.log("=== VIEWING ORDER DETAILS ===");
    console.log("Selected order for details:", order);
    console.log(
      "Order ID:",
      order.id,
      "Table ID:",
      order.tableId,
      "Ordered at:",
      order.orderedAt,
    );
    console.log(
      "Order status:",
      order.status,
      "Order number:",
      order.orderNumber,
    );
    console.log("=== END ORDER DETAILS ===");

    // Set the selected order first
    setSelectedOrder(order);

    // Then open the dialog - this ensures selectedOrder is set when the query runs
    setTimeout(() => {
      setOrderDetailsOpen(true);
    }, 0);
  };

  const handlePayment = async (paymentMethodKey: string) => {
    if (!selectedOrder) return;

    const method = getPaymentMethods().find(
      (m) => m.nameKey === paymentMethodKey,
    );
    if (!method) return;

    // If cash payment, proceed directly
    if (paymentMethodKey === "cash") {
      completePaymentMutation.mutate({
        orderId: selectedOrder.id,
        paymentMethod: paymentMethodKey,
      });
      return;
    }

    // For QR Code payment, use CreateQRPos API
    if (paymentMethodKey === "qrCode") {
      try {
        setQrLoading(true);
        const { createQRPosAsync, CreateQRPosRequest } = await import(
          "@/lib/api"
        );

        const transactionUuid = `TXN-${Date.now()}`;
        const depositAmt = Number(selectedOrder.total);

        const qrRequest: CreateQRPosRequest = {
          transactionUuid,
          depositAmt: depositAmt,
          posUniqueId: "ER002",
          accntNo: "0900993023",
          posfranchiseeName: "DOOKI-HANOI",
          posCompanyName: "HYOJUNG",
          posBillNo: `BILL-${Date.now()}`,
        };

        const bankCode = "79616001";
        const clientID = "91a3a3668724e631e1baf4f8526524f3";

        console.log("Calling CreateQRPos API with:", {
          qrRequest,
          bankCode,
          clientID,
        });

        const qrResponse = await createQRPosAsync(
          qrRequest,
          bankCode,
          clientID,
        );

        console.log("CreateQRPos API response:", qrResponse);

        // Generate QR code from the received QR data
        if (qrResponse.qrData) {
          // Use qrData directly for QR code generation
          let qrContent = qrResponse.qrData;
          try {
            // Try to decode if it's base64 encoded
            qrContent = atob(qrResponse.qrData);
          } catch (e) {
            // If decode fails, use the raw qrData
            console.log("Using raw qrData as it is not base64 encoded");
          }

          const qrUrl = await QRCodeLib.toDataURL(qrContent, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setSelectedPaymentMethod({ key: paymentMethodKey, method });
          setShowQRPayment(true);
          setPaymentMethodsOpen(false);
        } else {
          console.error("No QR data received from API");
          // Fallback to mock QR code
          const fallbackData = `Payment via QR\nAmount: ${selectedOrder.total.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nOrder: ${selectedOrder.orderNumber}\nTime: ${new Date().toLocaleString("vi-VN")}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setSelectedPaymentMethod({ key: paymentMethodKey, method });
          setShowQRPayment(true);
          setPaymentMethodsOpen(false);
        }
      } catch (error) {
        console.error("Error calling CreateQRPos API:", error);
        // Fallback to mock QR code on error
        try {
          const fallbackData = `Payment via QR\nAmount: ${selectedOrder.total.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nOrder: ${selectedOrder.orderNumber}\nTime: ${new Date().toLocaleString("vi-VN")}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setSelectedPaymentMethod({ key: paymentMethodKey, method });
          setShowQRPayment(true);
          setPaymentMethodsOpen(false);
        } catch (fallbackError) {
          console.error("Error generating fallback QR code:", fallbackError);
          toast({
            title: "Lỗi",
            description: "Không thể tạo mã QR",
            variant: "destructive",
          });
        }
      } finally {
        setQrLoading(false);
      }
      return;
    }

    // For other non-cash payments, show mock QR code
    try {
      const qrData = `${method.name} Payment\nAmount: ${selectedOrder.total.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nOrder: ${selectedOrder.orderNumber}\nTime: ${new Date().toLocaleString("vi-VN")}`;
      const qrUrl = await QRCodeLib.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(qrUrl);
      setSelectedPaymentMethod({ key: paymentMethodKey, method });
      setShowQRPayment(true);
      setPaymentMethodsOpen(false);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo mã QR",
        variant: "destructive",
      });
    }
  };

  // Define handlePaymentMethodSelect here
  const handlePaymentMethodSelect = async (
    method: string,
    paymentData?: any,
  ) => {
    console.log("💳 Payment method selected:", method, paymentData);

    if (!orderForPayment) {
      console.error("❌ No order found for payment");
      toast({
        title: "Lỗi",
        description: "Không tìm thấy đơn hàng để thanh toán",
        variant: "destructive",
      });
      return;
    }

    try {
      if (method === "einvoice") {
        console.log("📧 Opening E-invoice modal for table payment");
        setShowPaymentMethodModal(false);
        setShowEInvoiceModal(true);
        return;
      }

      // Store payment method for receipt display
      setSelectedPaymentMethod(method);

      // Close payment method modal and show receipt preview
      setShowPaymentMethodModal(false);

      // Create receipt preview data
      const receiptPreview = {
        transactionId: `TXN-${Date.now()}`,
        createdAt: new Date().toISOString(),
        cashierName: "Nhân viên",
        paymentMethod: method,
        amountReceived: paymentData?.amountReceived?.toString(),
        change: paymentData?.change?.toString(),
        items: orderItems?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.total,
        })) || [],
        subtotal: (orderForPayment.exactSubtotal || parseFloat(orderForPayment.subtotal || "0")).toString(),
        tax: (orderForPayment.exactTax || parseFloat(orderForPayment.tax || "0")).toString(),
        total: (orderForPayment.exactTotal || parseFloat(orderForPayment.total || "0")).toString(),
        exactTotal: orderForPayment.exactTotal || parseFloat(orderForPayment.total || "0"),
        exactSubtotal: orderForPayment.exactSubtotal || parseFloat(orderForPayment.subtotal || "0"),
        exactTax: orderForPayment.exactTax || parseFloat(orderForPayment.tax || "0"),
      };

      setSelectedReceipt(receiptPreview);
      setShowReceiptModal(true);

      console.log("📄 Showing receipt preview for table payment confirmation");
    } catch (error) {
      console.error("❌ Error preparing receipt preview:", error);
      toast({
        title: "Lỗi",
        description: "Không thể chuẩn bị hóa đơn",
        variant: "destructive",
      });
    }
  };

  // Handle receipt confirmation and complete payment
  const handleReceiptConfirm = async () => {
    if (!orderForPayment) {
      console.error("❌ No order for payment found");
      return;
    }

    try {
      console.log("🔄 Completing payment for order:", orderForPayment.id);

      // Complete payment with the selected method
      await completePaymentMutation.mutateAsync({
        orderId: orderForPayment.id,
        paymentMethod: selectedPaymentMethod,
      });

      console.log("✅ Table payment completed successfully");

      // Close receipt modal and clear state
      setShowReceiptModal(false);
      setOrderForPayment(null);
      setSelectedPaymentMethod("");
      setSelectedReceipt(null);

      // Send WebSocket signal for data refresh
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'popup_close',
            success: true,
            source: 'table_grid_receipt_confirm',
            timestamp: new Date().toISOString()
          }));

          setTimeout(() => ws.close(), 100);
        };
      } catch (error) {
        console.warn("⚠️ Table Grid: Could not send WebSocket signal:", error);
      }

      // Dispatch custom event as backup
      window.dispatchEvent(new CustomEvent('forceDataRefresh', {
        detail: {
          source: 'table_grid_receipt_confirm',
          reason: 'payment_completed',
          timestamp: new Date().toISOString()
        }
      }));

      toast({
        title: "Thành công",
        description: "Thanh toán đã được hoàn thành",
      });

    } catch (error) {
      console.error("❌ Error completing payment from table:", error);
      toast({
        title: "Lỗi",
        description: "Không thể hoàn thành thanh toán",
        variant: "destructive",
      });
    }
  };

  // Handle E-invoice confirmation and complete payment
  const handleEInvoiceConfirm = async (invoiceData: any) => {
    if (!orderForPayment) {
      console.error("❌ No order for payment found");
      toast({
        title: "Lỗi",
        description: "Không tìm thấy đơn hàng để thanh toán",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(
        "🔄 Starting payment completion for order:",
        orderForPayment.id,
      );

      // Complete payment after e-invoice is created
      await completePaymentMutation.mutateAsync({
        orderId: orderForPayment.id,
        paymentMethod: "einvoice",
      });

      console.log("✅ Table payment completed successfully");

      // Close E-invoice modal first
      setShowEInvoiceModal(false);

      // Prepare proper receipt data using exact same calculation as Order Details
      let subtotal = 0;
      let totalTax = 0;

      const currentOrderItems = orderForPayment?.orderItems || orderItems || [];

      if (Array.isArray(currentOrderItems) && Array.isArray(products)) {
        currentOrderItems.forEach((item: any) => {
          const basePrice = Number(item.unitPrice || 0);
          const quantity = Number(item.quantity || 0);
          const product = products.find((p: any) => p.id === item.productId);

          // Calculate subtotal (base price without tax)
          subtotal += basePrice * quantity;

          // Use EXACT same tax calculation logic as Order Details
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
        ...orderForPayment,
        transactionId: `TXN-${Date.now()}`,
        items: currentOrderItems.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName || getProductName(item.productId),
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.total,
          sku: item.productSku || `SP${item.productId}`,
          taxRate: (() => {
            const product = Array.isArray(products)
              ? products.find((p: any) => p.id === item.productId)
              : null;
            return product?.taxRate ? parseFloat(product.taxRate) : 10;
          })(),
        })),
        subtotal: subtotal.toString(),
        tax: totalTax.toString(),
        total: finalTotal.toString(),
        paymentMethod: "einvoice",
        amountReceived: finalTotal.toString(),
        change: "0.00",
        cashierName: "Table Service",
        createdAt: new Date().toISOString(),
        customerName: invoiceData.customerName || orderForPayment.customerName,
        customerTaxCode: invoiceData.taxCode,
        invoiceNumber: invoiceData.invoiceNumber,
        tableNumber: getTableInfo(orderForPayment.tableId)?.tableNumber || "N/A",
      };

      console.log("📄 Table: Showing receipt modal after E-invoice with proper data");
      console.log("💰 Receipt data:", {
        itemsCount: receiptData.items.length,
        subtotal: receiptData.subtotal,
        tax: receiptData.tax,
        total: receiptData.total,
      });

      // Clear order for payment and show receipt
      setOrderForPayment(null);
      setSelectedReceipt(receiptData);
      setShowReceiptModal(true);
    } catch (error) {
      console.error("❌ Error completing payment from table:", error);
      toast({
        title: "Lỗi",
        description: "Không thể hoàn thành thanh toán",
        variant: "destructive",
      });
    }
  };

  const getPaymentMethods = () => {
    // Get payment methods from localStorage (saved from settings)
    const savedPaymentMethods = localStorage.getItem("paymentMethods");

    // Default payment methods if none saved
    const defaultPaymentMethods = [
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
        name: "Thẻ tín dụng",
        nameKey: "creditCard",
        type: "card",
        enabled: true,
        icon: "💳",
      },
      {
        id: 3,
        name: "Thẻ ghi nợ",
        nameKey: "debitCard",
        type: "debit",
        enabled: true,
        icon: "💳",
      },
      {
        id: 4,
        name: "MoMo",
        nameKey: "momo",
        type: "digital",
        enabled: true,
        icon: "📱",
      },
      {
        id: 5,
        name: "ZaloPay",
        nameKey: "zalopay",
        type: "digital",
        enabled: true,
        icon: "📱",
      },
      {
        id: 6,
        name: "VNPay",
        nameKey: "vnpay",
        type: "digital",
        enabled: true,
        icon: "💳",
      },
      {
        id: 7,
        name: "QR Code",
        nameKey: "qrCode",
        type: "qr",
        enabled: true,
        icon: "📱",
      },
      {
        id: 8,
        name: "ShopeePay",
        nameKey: "shopeepay",
        type: "digital",
        enabled: false,
        icon: "🛒",
      },
      {
        id: 9,
        name: "GrabPay",
        nameKey: "grabpay",
        type: "digital",
        enabled: false,
        icon: "🚗",
      },
      {
        id: 10,
        name: "Hóa đơn điện tử",
        nameKey: "einvoice",
        type: "invoice",
        enabled: true,
        icon: "📄",
      },
    ];

    const paymentMethods = savedPaymentMethods
      ? JSON.parse(savedPaymentMethods)
      : defaultPaymentMethods;

    // Filter to only return enabled payment methods
    return paymentMethods.filter((method) => method.enabled);
  };

  const getOrderStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: t("orders.status.pending"),
        variant: "secondary" as const,
      },
      confirmed: {
        label: t("orders.status.confirmed"),
        variant: "default" as const,
      },
      preparing: {
        label: t("orders.status.preparing"),
        variant: "secondary" as const,
      },
      ready: { label: t("orders.status.ready"), variant: "outline" as const },
      served: { label: t("orders.status.served"), variant: "outline" as const },
      delivering: {
        label: t("orders.status.delivering"),
        variant: "secondary" as const,
      },
      completed: {
        label: t("orders.status.completed"),
        variant: "default" as const,
      },
      paid: { label: t("orders.status.paid"), variant: "default" as const },
      cancelled: {
        label: t("orders.status.cancelled"),
        variant: "destructive" as const,
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    );
  };

  // Function to handle auto-print for orders
  const handlePrintOrder = async (order: any) => {
    console.log("🖨️ Starting auto-print for table order:", order.id);

    try {
      const orderItems = await queryClient.fetchQuery({
        queryKey: [`/api/order-items/${order.id}`],
        queryFn: async () => {
          const response = await apiRequest(
            "GET",
            `/api/order-items/${order.id}`,
          );
          return response.json();
        },
      });

      // Create receipt data
      const receiptData = {
        transactionId: order.orderNumber || `ORD-${order.id}`,
        items: order.items.map((item: any) => ({
          // Assuming order.items is available and structured
          id: item.id,
          productId: item.productId,
          productName: item.productName || getProductName(item.productId),
          price: item.unitPrice,
          quantity: item.quantity,
          total: item.total,
          sku: item.productSku || `SP${item.productId}`,
          taxRate: (() => {
            const product = Array.isArray(products)
              ? products.find((p: any) => p.id === item.productId)
              : null;
            return product?.taxRate ? parseFloat(product.taxRate) : 10;
          })(),
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        paymentMethod: order.paymentMethod || "cash",
        amountReceived: order.total,
        change: "0.00",
        cashierName: order.employeeName || "System User",
        createdAt: order.orderedAt || new Date().toISOString(),
        tableNumber: getTableInfo(order.tableId)?.tableNumber || "N/A",
      };

      // Call auto-print API for both employee and kitchen printers
      const response = await fetch("/api/auto-print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiptData,
          printerType: "both", // Print to both employee and kitchen printers
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Auto-print successful:", result.message);
        toast({
          title: "In hóa đơn thành công",
          description: `${result.message}`,
        });

        // Show detailed results for each printer
        const successfulPrints = result.results.filter(
          (r) => r.status === "success",
        );
        const failedPrints = result.results.filter((r) => r.status === "error");

        if (successfulPrints.length > 0) {
          console.log(
            `✅ Printed successfully on ${successfulPrints.length} printers:`,
            successfulPrints.map((p) => p.printerName),
          );
        }

        if (failedPrints.length > 0) {
          toast({
            title: "Một số máy in gặp lỗi",
            description: failedPrints
              .map((r) => `• ${r.printerName}: ${r.message}`)
              .join("\n"),
            variant: "destructive",
          });
        }
      } else {
        console.log("⚠️ Auto-print failed, falling back to receipt modal");
        // Fallback to showing receipt modal for manual print
        setSelectedReceipt(receiptData);
        setShowReceiptModal(true);

        toast({
          title: "Không tìm thấy máy in",
          description:
            "Không tìm thấy máy in hoặc không có cấu hình máy in. Sử dụng chức năng in thủ công.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Auto-print error:", error);

      toast({
        title: "Lỗi in tự động",
        description:
          "Có lỗi xảy ra khi in tự động. Sử dụng chức năng in thủ công.",
        variant: "destructive",
      });

      // Fallback to manual print - try to show receipt modal
      try {
        const orderItems = await queryClient.fetchQuery({
          queryKey: [`/api/order-items/${order.id}`],
          queryFn: async () => {
            const response = await apiRequest(
              "GET",
              `/api/order-items/${order.id}`,
            );
            return response.json();
          },
        });

        const receiptData = {
          transactionId: order.orderNumber || `ORD-${order.id}`,
          items: orderItems.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName || getProductName(item.productId),
            price: item.unitPrice,
            quantity: item.quantity,
            total: item.total,
            sku: item.productSku || `SP${item.productId}`,
            taxRate: (() => {
              const product = Array.isArray(products)
                ? products.find((p: any) => p.id === item.productId)
                : null;
              return product?.taxRate ? parseFloat(product.taxRate) : 10;
            })(),
          })),
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          paymentMethod: order.paymentMethod || "cash",
          amountReceived: order.total,
          change: "0.00",
          cashierName: order.employeeName || "System User",
          createdAt: order.orderedAt || new Date().toISOString(),
          tableNumber: getTableInfo(order.tableId)?.tableNumber || "N/A",
        };

        setSelectedReceipt(receiptData);
        setShowReceiptModal(true);
      } catch (fallbackError) {
        console.error("Error preparing fallback receipt:", fallbackError);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-32"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.isArray(tables) &&
          tables.map((table: Table) => {
            const statusConfig = getTableStatus(table.status);
            const activeOrder = getActiveOrder(table.id);
            const isSelected = selectedTableId === table.id;

            return (
              <Card
                key={table.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                } ${table.status === "occupied" ? "bg-red-50" : "bg-white"}`}
                onClick={() => handleTableClick(table)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {/* Table Number */}
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-full ${statusConfig.color} flex items-center justify-center text-white font-bold text-lg`}
                      >
                        {table.tableNumber}
                      </div>
                      {activeOrder && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
                      )}
                    </div>

                    {/* Table Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-center text-sm text-gray-600">
                        <Users className="w-3 h-3 mr-1" />
                        {activeOrder ? (
                          <span>
                            {activeOrder.customerCount || 1}/{table.capacity}{" "}
                            {t("orders.people")}
                          </span>
                        ) : (
                          <span>
                            {table.capacity} {t("orders.people")}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={
                          table.status === "occupied" && activeOrder
                            ? getOrderStatusBadge(activeOrder.status).variant
                            : statusConfig.variant
                        }
                        className="text-xs"
                      >
                        {table.status === "occupied" && activeOrder
                          ? getOrderStatusBadge(activeOrder.status).label
                          : statusConfig.label}
                      </Badge>
                    </div>

                    {/* Order Info */}
                    {activeOrder && (
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(activeOrder.orderedAt).toLocaleTimeString(
                            currentLanguage === "ko"
                              ? "ko-KR"
                              : currentLanguage === "en"
                                ? "en-US"
                                : "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                        <div
                          className={`font-medium ${Number(activeOrder.total) <= 0 ? "text-gray-400" : "text-gray-900"}`}
                        >
                          {(() => {
                            // Use pre-calculated total from orderTotalsMap
                            const orderTotal = orderTotalsMap.get(activeOrder.id);
                            
                            if (orderTotal && orderTotal.storedTotal > 0) {
                              return Math.floor(orderTotal.storedTotal).toLocaleString("vi-VN");
                            }

                            // Fallback to stored total directly
                            const storedTotal = Number(activeOrder.total || 0);
                            if (storedTotal > 0) {
                              return Math.floor(storedTotal).toLocaleString("vi-VN");
                            }

                            return "0";
                          })()}{" "}
                          ₫
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    {table.status === "occupied" && (
                      <div className="space-y-1 w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeOrder) {
                              handleViewOrderDetails(activeOrder);
                            }
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          {t("orders.viewDetails")}
                        </Button>

                        <Button
                          size="sm"
                          variant="default"
                          className="w-full text-xs bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeOrder) {
                              handleEditOrder(activeOrder, table);
                            }
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {t("orders.addMore")}
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeOrder) {
                              handleDeleteOrder(activeOrder);
                            }
                          }}
                        >
                          <X className="w-3 h-3 mr-1" />
                          {t("tables.deleteOrder")}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Order Dialog */}
      <OrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        table={selectedTable}
      />

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("orders.orderDetails")}</DialogTitle>
            <DialogDescription>
              {selectedOrder &&
                `${t("orders.orderNumber")}: ${selectedOrder.orderNumber}`}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("orders.table")} {t("orders.orderNumber").toLowerCase()}:
                  </p>
                  <p className="font-medium">T{selectedTable?.tableNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {t("orders.customerCount")}:
                  </p>
                  <p className="font-medium">
                    {selectedOrder.customerCount} {t("orders.people")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {t("orders.orderTime")}:
                  </p>
                  <p className="font-medium">
                    {new Date(selectedOrder.orderedAt).toLocaleTimeString(
                      currentLanguage === "ko"
                        ? "ko-KR"
                        : currentLanguage === "en"
                          ? "en-US"
                          : "vi-VN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {t("orders.orderStatus")}:
                  </p>
                  <Badge
                    variant={
                      selectedOrder.status === "paid" ? "default" : "secondary"
                    }
                  >
                    {selectedOrder.status === "paid"
                      ? t("orders.status.paid")
                      : t("orders.status.pending")}
                  </Badge>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">{t("orders.orderItems")}:</h4>
                <div className="space-y-2">
                  {orderItemsLoading ? (
                    <p className="text-gray-500 text-center py-4">
                      {t("common.loading")}
                    </p>
                  ) : (
                    <>
                      {(() => {
                        // Process orderItems data consistently
                        let itemsToRender = [];

                        if (Array.isArray(orderItems)) {
                          itemsToRender = orderItems;
                        } else if (
                          orderItems &&
                          (orderItems as any).data &&
                          Array.isArray((orderItems as any).data)
                        ) {
                          itemsToRender = (orderItems as any).data;
                        } else if (
                          orderItems &&
                          (orderItems as any).items &&
                          Array.isArray((orderItems as any).items)
                        ) {
                          itemsToRender = (orderItems as any).items;
                        } else if (
                          orderItems &&
                          typeof orderItems === "object"
                        ) {
                          try {
                            itemsToRender = Object.values(orderItems).filter(
                              (item) => item && typeof item === "object",
                            );
                          } catch (e) {
                            itemsToRender = [];
                          }
                        }

                        if (itemsToRender && itemsToRender.length > 0) {
                          return (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-green-600 mb-3">
                                ✅ Hiển thị {itemsToRender.length} món trong đơn
                                hàng {selectedOrder?.orderNumber}
                              </p>
                              {itemsToRender.map((item: any, index: number) => (
                                <div
                                  key={`item-${item.id || index}`}
                                  className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                      {item.productName ||
                                        getProductName(item.productId) ||
                                        `Sản phẩm #${item.productId}`}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Số lượng:{" "}
                                      <span className="font-medium">
                                        {item.quantity}
                                      </span>
                                    </p>
                                    {item.notes && (
                                      <p className="text-xs text-blue-600 italic mt-1">
                                        Ghi chú: {item.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="font-bold text-lg text-green-600">
                                      {Math.floor(
                                        Number(item.total || 0),
                                      ).toLocaleString("vi-VN")}{" "}
                                      ₫
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {Math.floor(
                                        Number(item.unitPrice || 0),
                                      ).toLocaleString("vi-VN")}{" "}
                                      ₫/món
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border">
                              <p className="text-gray-600">
                                Không có món nào trong đơn hàng{" "}
                                {selectedOrder?.orderNumber}
                              </p>
                              {orderItemsLoading && (
                                <p className="text-sm text-gray-500 mt-2">
                                  Đang tải...
                                </p>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Tax and Total Summary */}
              <div className="space-y-2">
                {(() => {
                  // Use same tax calculation logic as shopping cart and other components
                  let subtotal = 0;
                  let totalTax = 0;

                  if (
                    Array.isArray(orderItems) &&
                    orderItems.length > 0 &&
                    Array.isArray(products)
                  ) {
                    orderItems.forEach((item: any) => {
                      const basePrice = Number(item.unitPrice || 0);
                      const quantity = Number(item.quantity || 0);
                      const product = products.find(
                        (p: any) => p.id === item.productId,
                      );

                      console.log(`🔍 Table Grid - Tax calculation for item ${item.id}:`, {
                        productId: item.productId,
                        productName: item.productName,
                        basePrice,
                        quantity,
                        productFound: !!product,
                        afterTaxPrice: product?.afterTaxPrice,
                        taxRate: product?.taxRate
                      });

                      // Calculate subtotal (base price without tax)
                      subtotal += basePrice * quantity;

                      // Only calculate tax if afterTaxPrice exists in database
                      if (
                        product?.afterTaxPrice &&
                        product.afterTaxPrice !== null &&
                        product.afterTaxPrice !== ""
                      ) {
                        const afterTaxPrice = parseFloat(
                          product.afterTaxPrice,
                        );
                        // Tax per unit = afterTaxPrice - basePrice
                        const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
                        const itemTax = Math.floor(taxPerUnit * quantity);
                        totalTax += itemTax;

                        console.log(`💰 Table Grid - Tax calculated:`, {
                          afterTaxPrice,
                          basePrice,
                          taxPerUnit,
                          quantity,
                          itemTax,
                          runningTotalTax: totalTax
                        });
                      } else {
                        console.log(`⚪ Table Grid - No tax (no afterTaxPrice):`, {
                          productName: item.productName,
                          afterTaxPrice: product?.afterTaxPrice
                        });
                      }
                      // No tax calculation if no afterTaxPrice in database
                    });
                  }

                  const grandTotal = subtotal + totalTax;

                  console.log(`📊 Table Grid - Final totals:`, {
                    subtotal,
                    totalTax,
                    grandTotal,
                    itemsCount: orderItems?.length
                  });

                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {t("pos.subtotal")}:
                        </span>
                        <span className="font-medium">
                          {Math.floor(subtotal).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Thuế:</span>
                        <span className="font-medium">
                          {Math.abs(Math.floor(totalTax)).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>{t("orders.totalAmount")}:</span>
                        <span className="text-green-600">
                          {Math.floor(subtotal + Math.abs(totalTax)).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Payment Buttons */}
              {selectedOrder.status !== "paid" && (
                <div className="pt-4 space-y-3">
                  <Button
                    onClick={() => {
                      console.log(
                        "🎯 Table: Starting payment flow - using exact Order Details values",
                      );

                      if (
                        !selectedOrder ||
                        !orderItems ||
                        !Array.isArray(orderItems)
                      ) {
                        console.error("❌ Missing order data for preview");
                        toast({
                          title: "Lỗi",
                          description:
                            "Không thể tạo xem trước hóa đơn. Vui lòng thử lại.",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Use EXACT SAME calculation logic as displayed in Order Details
                      let orderDetailsSubtotal = 0;
                      let orderDetailsTax = 0;

                      const processedItems = orderItems.map((item: any) => {
                        const basePrice = Number(item.unitPrice || 0);
                        const quantity = Number(item.quantity || 0);
                        const product = Array.isArray(products)
                          ? products.find((p: any) => p.id === item.productId)
                          : null;

                        // Calculate subtotal exactly as Order Details display
                        orderDetailsSubtotal += basePrice * quantity;

                        // Use EXACT same tax calculation logic as Order Details
                        if (
                          product?.afterTaxPrice &&
                          product.afterTaxPrice !== null &&
                          product.afterTaxPrice !== ""
                        ) {
                          const afterTaxPrice = parseFloat(
                            product.afterTaxPrice,
                          );
                          const taxPerUnit = afterTaxPrice - basePrice;
                          orderDetailsTax += Math.floor(taxPerUnit * quantity);
                        }

                        return {
                          id: item.id,
                          productId: item.productId,
                          productName:
                            item.productName || getProductName(item.productId),
                          quantity: item.quantity,
                          price: item.unitPrice,
                          total: item.total,
                          sku: item.productSku || `SP${item.productId}`,
                          taxRate: product?.taxRate
                            ? parseFloat(product.taxRate)
                            : 10,
                        };
                      });

                      // Create preview receipt data using EXACT values from Order Details
                      const previewData = {
                        ...selectedOrder,
                        transactionId: `PREVIEW-${Date.now()}`,
                        createdAt: new Date().toISOString(),
                        cashierName: "Table Service",
                        paymentMethod: "preview", // Placeholder method
                        items: processedItems,
                        subtotal: Math.floor(orderDetailsSubtotal).toString(),
                        tax: Math.floor(orderDetailsTax).toString(),
                        total: Math.floor(
                          orderDetailsSubtotal + orderDetailsTax
                        ).toString(),
                        exactTotal: Math.floor(orderDetailsSubtotal + orderDetailsTax),
                        exactSubtotal: Math.floor(orderDetailsSubtotal),
                        exactTax: Math.floor(orderDetailsTax),
                        orderItems: orderItems, // Keep original order items for payment flow
                      };

                      console.log(
                        "📄 Table: Showing receipt preview with exact Order Details values",
                      );
                      console.log("💰 Exact values passed:", {
                        subtotal: orderDetailsSubtotal,
                        tax: orderDetailsTax,
                        total: orderDetailsSubtotal + orderDetailsTax,
                      });
                      setPreviewReceipt(previewData);
                      setOrderDetailsOpen(false);
                      setShowReceiptPreview(true);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t("orders.payment")}
                  </Button>
                  <Button
                    onClick={() => setPointsPaymentOpen(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                    size="lg"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {t("orders.pointsPaymentTitle")}
                  </Button>
                  <Button
                    onClick={async () => {
                      console.log(
                        "🖨️ Print bill button clicked for order:",
                        selectedOrder?.orderNumber,
                      );

                      if (
                        !selectedOrder ||
                        !orderItems ||
                        !Array.isArray(orderItems)
                      ) {
                        console.error("❌ Missing order data for print bill");
                        toast({
                          title: "Lỗi",
                          description:
                            "Không thể tạo hóa đơn. Vui lòng thử lại.",
                          variant: "destructive",
                        });
                        return;
                      }

                      try {
                        // Use exact same calculation logic as Order Details display
                        let subtotal = 0;
                        let totalTax = 0;

                        if (
                          Array.isArray(orderItems) &&
                          Array.isArray(products)
                        ) {
                          orderItems.forEach((item: any) => {
                            const basePrice = Number(item.unitPrice || 0);
                            const quantity = Number(item.quantity || 0);
                            const product = products.find(
                              (p: any) => p.id === item.productId,
                            );

                            // Calculate subtotal exactly as Order Details
                            subtotal += basePrice * quantity;

                            // Use EXACT same tax calculation logic as Order Details
                            if (
                              product?.afterTaxPrice &&
                              product.afterTaxPrice !== null &&
                              product.afterTaxPrice !== ""
                            ) {
                              const afterTaxPrice = parseFloat(
                                product.afterTaxPrice,
                              );
                              const taxPerUnit = afterTaxPrice - basePrice;
                              totalTax += taxPerUnit * quantity;
                            }
                          });
                        }

                        const grandTotal = subtotal + totalTax;

                        // Create receipt data using EXACT same values as Order Details display
                        const processedItems = orderItems.map((item: any) => ({
                          id: item.id,
                          productId: item.productId,
                          productName:
                            item.productName || getProductName(item.productId),
                          price: item.unitPrice,
                          quantity: item.quantity,
                          total: item.total,
                          sku: item.productSku || `SP${item.productId}`,
                          taxRate: (() => {
                            const product = Array.isArray(products)
                              ? products.find(
                                  (p: any) => p.id === item.productId,
                                )
                              : null;
                            return product?.taxRate ? parseFloat(product.taxRate) : 10;
                          })(),
                        }));

                        // Use exact same calculation values as displayed in Order Details
                        let orderDetailsSubtotal = 0;
                        let orderDetailsTax = 0;

                        if (
                          Array.isArray(orderItems) &&
                          Array.isArray(products)
                        ) {
                          orderItems.forEach((item: any) => {
                            const basePrice = Number(item.unitPrice || 0);
                            const quantity = Number(item.quantity || 0);
                            const product = products.find(
                              (p: any) => p.id === item.productId,
                            );

                            // Calculate subtotal exactly as Order Details
                            orderDetailsSubtotal += basePrice * quantity;

                            // Use EXACT same tax calculation logic as Order Details
                            if (
                              product?.afterTaxPrice &&
                              product.afterTaxPrice !== null &&
                              product.afterTaxPrice !== ""
                            ) {
                              const afterTaxPrice = parseFloat(
                                product.afterTaxPrice,
                              );
                              const taxPerUnit = afterTaxPrice - basePrice;
                              orderDetailsTax += taxPerUnit * quantity;
                            }
                          });
                        }

                        const billData = {
                          ...selectedOrder,
                          transactionId:
                            selectedOrder.orderNumber ||
                            `BILL-${selectedOrder.id}`,
                          items: processedItems,
                          subtotal: orderDetailsSubtotal.toString(),
                          tax: orderDetailsTax.toString(),
                          total: (
                            orderDetailsSubtotal + orderDetailsTax
                          ).toString(),
                          paymentMethod: "unpaid",
                          amountReceived: "0",
                          change: "0",
                          cashierName: "Table Service",
                          createdAt:
                            selectedOrder.orderedAt || new Date().toISOString(),
                          customerName: selectedOrder.customerName,
                          customerTaxCode: null,
                          invoiceNumber: null,
                        };

                        console.log(
                          "📄 Table: Showing receipt modal for bill printing",
                        );
                        console.log("📊 Bill data:", billData);

                        // Show receipt modal without auto-printing
                        setSelectedReceipt(billData);
                        setOrderDetailsOpen(false);
                        setShowReceiptModal(true);
                      } catch (error) {
                        console.error("❌ Error preparing bill:", error);
                        toast({
                          title: "Lỗi",
                          description:
                            "Không thể tạo hóa đơn. Vui lòng thử lại.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                    size="lg"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {t("orders.printBill")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Modal - Step 1: "Xem trước hóa đơn" */}
      <ReceiptModal
        isOpen={showReceiptPreview}
        onClose={() => {
          console.log("🔴 Table: Closing receipt preview modal");
          setShowReceiptPreview(false);
          setPreviewReceipt(null);
        }}
        onConfirm={() => {
          console.log(
            "📄 Table: Receipt preview confirmed, starting payment flow",
          );

          if (!previewReceipt) {
            console.error("❌ No preview receipt data available");
            return;
          }

          // Prepare complete order data for payment flow
          const completeOrderData = {
            ...selectedOrder,
            orderItems: previewReceipt.orderItems || orderItems || [],
            exactSubtotal: previewReceipt.exactSubtotal,
            exactTax: previewReceipt.exactTax,
            exactTotal: previewReceipt.exactTotal,
          };

          console.log(
            "💾 Table: Setting order for payment with complete data:",
            completeOrderData,
          );
          setOrderForPayment(completeOrderData);

          // Close preview and show payment method modal
          setShowReceiptPreview(false);
          setShowPaymentMethodModal(true);
        }}
        isPreview={true}
        cartItems={
          previewReceipt?.items?.map((item: any) => ({
            id: item.productId || item.id,
            name: item.productName || item.name,
            price: parseFloat(item.price || item.unitPrice || "0"),
            quantity: item.quantity,
            sku: item.sku || `SP${item.productId}`,
            taxRate: item.taxRate || 10,
          })) || []
        }
        total={previewReceipt ? parseFloat(previewReceipt.total) : 0}
      />

      {/* Payment Method Modal - Step 2: Chọn phương thức thanh toán */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => {
          console.log("🔴 Table: Closing payment method modal");
          setShowPaymentMethodModal(false);
          setOrderForPayment(null);
        }}
        onSelectMethod={async (method: string, data?: any) => {
          console.log("🎯 Table: Payment method selected:", method, data);

          if (method === "paymentCompleted" && data?.success) {
            console.log("✅ Table: Payment completed successfully", data);

            try {
              // Refresh data
              await Promise.all([
                refetchTables(),
                refetchOrders()
              ]);

              console.log('✅ Table: Data refreshed after payment');

              toast({
                title: 'Thành công',
                description: data.publishLater
                  ? 'Đơn hàng đã được thanh toán và lưu để phát hành hóa đơn sau'
                  : 'Đơn hàng đã được thanh toán và hóa đơn điện tử đã được phát hành',
              });

              // Always show receipt modal after successful payment - prioritize receipt display
              if (data.receipt) {
                console.log('📄 Table: Showing receipt modal after successful payment');
                setSelectedReceipt(data.receipt);
                setShowReceiptModal(true);
              } else {
                console.warn('⚠️ Table: No receipt data found after payment completion');
              }

            } catch (error) {
              console.error('❌ Error refreshing data after payment:', error);
            }

            // Close order details if open
            setOrderDetailsOpen(false);
            setSelectedOrder(null);
          }

          if (method === "paymentError" && data) {
            console.error("❌ Table: Payment failed", data);

            toast({
              title: 'Lỗi',
              description: data.error || 'Không thể hoàn tất thanh toán. Vui lòng thử lại.',
              variant: 'destructive',
            });
          }

          // Always close payment modal
          setShowPaymentMethodModal(false);
          setOrderForPayment(null);
        }}
        total={(() => {
          const orderTotal =
            orderForPayment?.exactTotal ??
            orderForPayment?.total ??
            selectedOrder?.total ??
            0;
          return Math.floor(parseFloat(orderTotal.toString()) || 0);
        })()}
        orderForPayment={orderForPayment}
        products={products}
        getProductName={getProductName}
        receipt={previewReceipt}
      />

      {/* E-Invoice Modal */}
      {showEInvoiceModal && orderForEInvoice && (
        <EInvoiceModal
          isOpen={showEInvoiceModal}
          onClose={() => {
            setShowEInvoiceModal(false);
            setOrderForEInvoice(null);
          }}
          onConfirm={handleEInvoiceConfirm}
          total={(() => {
            // Use calculated total first, then fallback to stored total
            const calculatedTotal = orderForEInvoice?.calculatedTotal;
            const exactTotal = orderForEInvoice?.exactTotal;
            const storedTotal = orderForEInvoice?.total;

            const finalTotal = calculatedTotal || exactTotal || storedTotal || 0;

            console.log('🔍 Table Grid E-Invoice Modal: Total calculation:', {
              calculatedTotal,
              exactTotal,
              storedTotal,
              finalTotal,
              orderForEInvoiceId: orderForEInvoice?.id
            });

            return Math.floor(finalTotal);
          })()}
          cartItems={orderForEInvoice?.orderItems?.map((item: any) => ({
            id: item.productId,
            name: item.productName,
            price: parseFloat(item.unitPrice || '0'),
            quantity: item.quantity,
            sku: item.productSku || `SP${item.productId}`,
            taxRate: (() => {
              const product = Array.isArray(products) ? products.find((p: any) => p.id === item.productId) : null;
              return product?.taxRate ? parseFloat(product.taxRate) : 10;
            })(),
            afterTaxPrice: (() => {
              const product = Array.isArray(products) ? products.find((p: any) => p.id === item.productId) : null;
              return product?.afterTaxPrice || null;
            })()
          })) || []}
          source="table"
          orderId={orderForEInvoice?.id}
        />
      )}

      {/* Receipt Modal - Final receipt after payment */}
      {showReceiptModal && selectedReceipt && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={async () => {
            console.log("🔴 Table: Receipt modal closing, clearing states and forcing complete data refresh");

            // Clear all modal states immediately
            setShowReceiptModal(false);
            setSelectedReceipt(null);
            setOrderForPayment(null);
            setShowPaymentMethodModal(false);
            setShowEInvoiceModal(false);
            setShowReceiptPreview(false);
            setPreviewReceipt(null);
            setOrderDetailsOpen(false);
            setSelectedOrder(null);
            setSelectedPaymentMethod("");

            // Force aggressive data refresh - multiple strategies for reliability
            try {
              console.log("🔄 Table: Starting comprehensive data refresh after receipt modal close");

              // Strategy 1: Clear ALL cache completely
              queryClient.clear();
              queryClient.removeQueries();

              // Strategy 2: Force multiple fresh fetches with delays for reliability
              const refreshAttempts = 5; // Increased attempts
              for (let i = 0; i < refreshAttempts; i++) {
                console.log(`🔄 Table: Refresh attempt ${i + 1}/${refreshAttempts}`);

                try {
                  await Promise.all([
                    queryClient.refetchQueries({ queryKey: ["/api/tables"], type: 'active' }),
                    queryClient.refetchQueries({ queryKey: ["/api/orders"], type: 'active' }),
                    refetchTables(),
                    refetchOrders()
                  ]);
                  console.log(`✅ Table: Refresh attempt ${i + 1} completed successfully`);
                } catch (refreshError) {
                  console.error(`❌ Table: Refresh attempt ${i + 1} failed:`, refreshError);
                }

                // Add delay between attempts except the last one
                if (i < refreshAttempts - 1) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              }

              console.log("✅ Table: All refresh attempts completed");

              // Strategy 3: Force invalidate and refetch with no cache
              queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

              // Strategy 4: Set query data to force re-render
              queryClient.setQueryData(["/api/tables"], undefined);
              queryClient.setQueryData(["/api/orders"], undefined);

              // Strategy 5: Dispatch global refresh events for cross-component coordination
              const refreshEvents = [
                new CustomEvent('refreshTableData', {
                  detail: {
                    reason: 'receipt_modal_closed',
                    source: 'table-grid',
                    timestamp: new Date().toISOString(),
                    forceRefresh: true
                  }
                }),
                new CustomEvent('forceRefresh', {
                  detail: {
                    reason: 'receipt_modal_closed',
                    source: 'table-grid',
                    timestamp: new Date().toISOString(),
                    forceRefresh: true
                  }
                }),
                new CustomEvent('orderStatusUpdated', {
                  detail: {
                    action: 'data_refresh',
                    source: 'table-grid',
                    timestamp: new Date().toISOString(),
                    forceRefresh: true
                  }
                }),
                new CustomEvent('paymentCompleted', {
                  detail: {
                    action: 'modal_closed',
                    source: 'table-grid',
                    timestamp: new Date().toISOString(),
                    forceRefresh: true
                  }
                })
              ];

              refreshEvents.forEach(event => {
                console.log(`📡 Table: Dispatching ${event.type} event`);
                window.dispatchEvent(event);
              });

              // Strategy 6: WebSocket signal to other components/tabs
              try {
                const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                const wsUrl = `${protocol}//${window.location.host}/ws`;
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                  const refreshSignal = {
                    type: "popup_close",
                    success: true,
                    source: "table-grid-receipt",
                    reason: "receipt_modal_closed",
                    refresh_needed: true,
                    force_refresh: true,
                    timestamp: new Date().toISOString()
                  };

                  console.log("📡 Table: Sending WebSocket refresh signal:", refreshSignal);
                  ws.send(JSON.stringify(refreshSignal));

                  setTimeout(() => ws.close(), 100);
                };

                ws.onerror = (error) => {
                  console.warn("⚠️ Table: WebSocket error (non-critical):", error);
                };
              } catch (wsError) {
                console.warn("⚠️ Table: WebSocket signal failed (non-critical):", wsError);
              }

              // Strategy 7: Multiple delayed verification refreshes
              const delayedRefreshes = [500, 1000, 2000];
              delayedRefreshes.forEach((delay, index) => {
                setTimeout(async () => {
                  console.log(`🔄 Table: Delayed verification refresh ${index + 1} (${delay}ms)`);
                  try {
                    queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

                    await Promise.all([
                      refetchTables(),
                      refetchOrders()
                    ]);
                    console.log(`✅ Table: Delayed verification refresh ${index + 1} completed`);
                  } catch (error) {
                    console.error(`❌ Table: Delayed verification refresh ${index + 1} failed:`, error);

                    // If all delayed refreshes fail, try page reload as last resort
                    if (index === delayedRefreshes.length - 1) {
                      console.log("🔄 Table: All refreshes failed, attempting page reload as last resort");
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    }
                  }
                }, delay);
              });

              toast({
                title: "Đã làm mới",
                description: "Dữ liệu trạng thái bàn đã được cập nhật hoàn toàn",
              });

              console.log("✅ Table: Receipt modal closed and comprehensive refresh initiated");

            } catch (error) {
              console.error("❌ Table: Critical error during data refresh:", error);

              // Final fallback: force page reload
              toast({
                title: "Đang làm mới",
                description: "Làm mới trang để cập nhật dữ liệu mới nhất...",
              });

              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }
          }}
          receipt={selectedReceipt}
          cartItems={
            selectedReceipt?.items?.map((item: any) => ({
              id: item.productId || item.id,
              name: item.productName || item.name,
              price: parseFloat(item.price || item.unitPrice || "0"),
              quantity: item.quantity,
              sku: item.sku || `SP${item.productId}`,
              taxRate: (() => {
                const product = Array.isArray(products)
                  ? products.find((p: any) => p.id === item.productId)
                  : null;
                return product?.taxRate ? parseFloat(product.taxRate) : 10;
              })(),
            })) || []
          }
          isPreview={!!orderForPayment} // Show as preview if there's an order waiting for payment
          onConfirm={orderForPayment ? handleReceiptConfirm : undefined}
        />
      )}

      {/* Points Payment Dialog */}
      <Dialog open={pointsPaymentOpen} onOpenChange={setPointsPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("orders.pointsPaymentDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("orders.pointsPaymentDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Summary */}
            {selectedOrder && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">
                  {t("orders.pointsPaymentDialog.orderInfo")}
                </h4>
                <div className="flex justify-between text-sm">
                  <span>{t("orders.pointsPaymentDialog.orderCode")}</span>
                  <span className="font-medium">
                    {selectedOrder.orderNumber}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("orders.pointsPaymentDialog.totalAmount")}</span>
                  <span className="font-medium">
                    {Math.floor(Number(selectedOrder.total)).toLocaleString()} ₫
                  </span>
                </div>
              </div>
            )}

            {/* Customer Selection */}
            <div className="space-y-3">
              <Label>{t("orders.pointsPaymentDialog.searchCustomer")}</Label>
              <Input
                placeholder={t("orders.pointsPaymentDialog.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="max-h-64 overflow-y-auto border rounded-md">
                {filteredCustomers.map((customer: any) => (
                  <div
                    key={customer.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                      selectedCustomer?.id === customer.id
                        ? "bg-blue-50 border-blue-200"
                        : ""
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-600">
                          {customer.customerId}
                        </p>
                        {customer.phone && (
                          <p className="text-sm text-gray-600">
                            {customer.phone}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          {(customer.points || 0).toLocaleString()}P
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("orders.pointsPaymentDialog.accumulatedPoints")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && searchTerm && (
                  <div className="p-4 text-center text-gray-500">
                    {t("common.noData")}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Customer Info */}
            {selectedCustomer && selectedOrder && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium mb-2">Khách hàng đã chọn</h4>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-sm text-gray-600">
                      {selectedCustomer.customerId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">
                      {(selectedCustomer.points || 0).toLocaleString()}P
                    </p>
                    <p className="text-xs text-gray-500">
                      ≈{" "}
                      {((selectedCustomer.points || 0) * 1000).toLocaleString()}{" "}
                      ₫
                    </p>
                  </div>
                </div>

                {/* Payment calculation */}
                <div className="pt-2 border-t border-green-200">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tổng đơn hàng:</span>
                    <span className="font-medium">
                      {Number(selectedOrder.total).toLocaleString()} ₫
                    </span>
                  </div>
                  {(selectedCustomer.points || 0) * 1000 >=
                  Number(selectedOrder.total) ? (
                    <div className="text-green-600 text-sm">
                      ✓ Đủ điểm để thanh toán toàn bộ
                    </div>
                  ) : (
                    <div className="text-orange-600 text-sm">
                      ⚠ Cần thanh toán thêm:{" "}
                      {(
                        Number(selectedOrder.total) -
                        (selectedCustomer.points || 0) * 1000
                      ).toLocaleString()}{" "}
                      ₫
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setPointsPaymentOpen(false)}
            >
              {t("orders.cancel")}
            </Button>
            <Button
              onClick={handlePointsPayment}
              disabled={
                !selectedCustomer ||
                (selectedCustomer.points || 0) === 0 ||
                pointsPaymentMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {pointsPaymentMutation.isPending
                ? "Đang xử lý..."
                : selectedCustomer &&
                    selectedOrder &&
                    (selectedCustomer.points || 0) * 1000 >=
                      Number(selectedOrder.total)
                  ? t("orders.pointsPaymentTitle")
                  : t("orders.mixedPaymentButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Payment Dialog */}
      <Dialog open={showQRPayment} onOpenChange={setShowQRPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Thanh toán {selectedPaymentMethod?.method?.name}
            </DialogTitle>
            <DialogDescription>
              Quét mã QR để hoàn tất thanh toán
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {/* Payment Amount Summary */}
            {selectedOrder && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Đơn hàng: {selectedOrder.orderNumber}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Số tiền cần thanh toán:
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {mixedPaymentData
                    ? Math.floor(
                        mixedPaymentData.remainingAmount,
                      ).toLocaleString("vi-VN")
                    : Math.floor(
                        Number(selectedOrder?.total || 0),
                      ).toLocaleString("vi-VN")}{" "}
                  ₫
                </p>
                {mixedPaymentData && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <p className="text-xs text-blue-600">
                      Đã sử dụng {mixedPaymentData.pointsToUse.toLocaleString()}
                      P (-
                      {(mixedPaymentData.pointsToUse * 1000).toLocaleString()}{" "}
                      ₫)
                    </p>
                  </div>
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
              Sử dụng ứng dụng {selectedPaymentMethod?.method?.name} để quét mã
              QR và thực hiện thanh toán
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

      {/* Mixed Payment Dialog */}
      <Dialog open={mixedPaymentOpen} onOpenChange={setMixedPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              Thanh toán hỗn hợp
            </DialogTitle>
            <DialogDescription>
              Không đủ điểm, cần thanh toán thêm bằng tiền mặt hoặc chuyển khoản
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
                    <span className="font-medium">
                      {Number(selectedOrder?.total || 0).toLocaleString()} ₫
                    </span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Thanh toán bằng điểm:</span>
                    <span className="font-medium">
                      {mixedPaymentData.pointsToUse.toLocaleString()}P
                      <span className="ml-1">
                        (-
                        {(mixedPaymentData.pointsToUse * 1000).toLocaleString()}{" "}
                        ₫)
                      </span>
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium text-orange-600">
                    <span>Cần thanh toán thêm:</span>
                    <p className="text-sm text-gray-500">
                      {Math.floor(
                        mixedPaymentData.remainingAmount,
                      ).toLocaleString()}{" "}
                      ₫
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <h4 className="font-medium">
                  Chọn phương thức thanh toán cho phần còn lại:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() =>
                      mixedPaymentMutation.mutate({
                        customerId: mixedPaymentData.customerId,
                        points: mixedPaymentData.pointsToUse,
                        orderId: mixedPaymentData.orderId,
                        paymentMethod: "cash",
                      })
                    }
                    disabled={mixedPaymentMutation.isPending}
                  >
                    <span className="text-2xl mr-3">💵</span>
                    <div className="text-left">
                      <p className="font-medium">Tiền mặt</p>
                      <p className="text-sm text-gray-500">
                        {Math.floor(
                          mixedPaymentData.remainingAmount,
                        ).toLocaleString()}{" "}
                        ₫
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={async () => {
                      // Use CreateQRPos API for transfer payment like QR Code
                      try {
                        setQrLoading(true);
                        const transactionUuid = `TXN-TRANSFER-${Date.now()}`;
                        const depositAmt = Number(
                          mixedPaymentData.remainingAmount,
                        );

                        const qrRequest: CreateQRPosRequest = {
                          transactionUuid,
                          depositAmt: depositAmt,
                          posUniqueId: "ER002",
                          accntNo: "0900993023",
                          posfranchiseeName: "DOOKI-HANOI",
                          posCompanyName: "HYOJUNG",
                          posBillNo: `TRANSFER-${Date.now()}`,
                        };

                        const bankCode = "79616001";
                        const clientID = "91a3a3668724e631e1baf4f8526524f3";

                        console.log(
                          "Calling CreateQRPos API for transfer payment:",
                          { qrRequest, bankCode, clientID },
                        );

                        const qrResponse = await createQRPosAsync(
                          qrRequest,
                          bankCode,
                          clientID,
                        );

                        console.log(
                          "CreateQRPos API response for transfer:",
                          qrResponse,
                        );

                        // Generate QR code from the received QR data and show QR modal
                        if (qrResponse.qrData) {
                          let qrContent = qrResponse.qrData;
                          try {
                            // Try to decode if it's base64 encoded
                            qrContent = atob(qrResponse.qrData);
                          } catch (e) {
                            // If decode fails, use the raw qrData
                            console.log(
                              "Using raw qrData for transfer as it is not base64 encoded",
                            );
                          }

                          const qrUrl = await QRCodeLib.toDataURL(qrContent, {
                            width: 256,
                            margin: 2,
                            color: {
                              dark: "#000000",
                              light: "#FFFFFF",
                            },
                          });

                          // Set QR code data and show QR payment modal
                          setQrCodeUrl(qrUrl);
                          setSelectedPaymentMethod({
                            key: "transfer",
                            method: { name: "Chuyển khoản", icon: "💳" },
                          });
                          setShowQRPayment(true);
                          setMixedPaymentOpen(false);
                        } else {
                          console.error(
                            "No QR data received from API for transfer",
                          );
                          // Fallback to direct payment
                          mixedPaymentMutation.mutate({
                            customerId: mixedPaymentData.customerId,
                            points: mixedPaymentData.pointsToUse,
                            orderId: mixedPaymentData.orderId,
                            paymentMethod: "transfer",
                          });
                        }
                      } catch (error) {
                        console.error(
                          "Error calling CreateQRPos API for transfer:",
                          error,
                        );
                        // Fallback to direct payment on error
                        mixedPaymentMutation.mutate({
                          customerId: mixedPaymentData.customerId,
                          points: mixedPaymentData.pointsToUse,
                          orderId: mixedPaymentData.orderId,
                          paymentMethod: "transfer",
                        });
                      } finally {
                        setQrLoading(false);
                      }
                    }}
                    disabled={mixedPaymentMutation.isPending || qrLoading}
                  >
                    <span className="text-2xl mr-3">💳</span>
                    <div className="text-left">
                      <p className="font-medium">Chuyển khoản</p>
                      <p className="text-sm text-gray-500">
                        {Math.floor(
                          mixedPaymentData.remainingAmount,
                        ).toLocaleString()}{" "}
                        ₫
                      </p>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setMixedPaymentOpen(false)}
                >
                  {t("orders.cancel")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <OrderDialog
        open={editOrderOpen}
        onOpenChange={(open) => {
          setEditOrderOpen(open);
          // When dialog closes after editing, refresh all data
          if (!open && editingOrder) {
            console.log(
              "🔄 Edit dialog closed, triggering recalculation for order:",
              editingOrder.id,
            );

            // Add a small delay to ensure any pending API calls complete
            setTimeout(() => {
              // Recalculate order total first - this will also handle the data refresh
              recalculateOrderMutation.mutate(editingOrder.id);
            }, 100);

            // Clear editing states
            setEditingOrder(null);
            setEditingTable(null);
          }
        }}
        table={editingTable}
        existingOrder={editingOrder}
        mode="edit"
      />
    </>
  );
}