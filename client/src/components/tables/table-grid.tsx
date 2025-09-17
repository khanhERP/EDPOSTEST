import { useState, useEffect, useCallback, useRef } from "react";
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [mixedPaymentOpen, setMixedPaymentOpen] = useState(false);
  const [mixedPaymentData, setMixedPaymentData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [orderForEInvoice, setOrderForEInvoice] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const [orderForPayment, setOrderForPayment] = useState<any>(null);
  const { toast } = useToast();
  const { t, currentLanguage } = useTranslation();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null); // Ref for WebSocket connection

  // Listen for print completion event
  useEffect(() => {
    const handlePrintCompleted = (event: CustomEvent) => {
      console.log(
        "🍽️ Table Grid: Print completed, closing all modals and refreshing",
      );

      // Close all table-related modals
      setSelectedTable(null);
      setOrderDetailsOpen(false);
      setPaymentMethodsOpen(false);
      setShowPaymentMethodModal(false);
      setShowEInvoiceModal(false);
      setShowReceiptModal(false);
      setShowReceiptPreview(false);
      setPreviewReceipt(null);
      setSelectedOrder(null);
      setOrderForPayment(null);
      setSelectedReceipt(null);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    };

    window.addEventListener(
      "printCompleted",
      handlePrintCompleted as EventListener,
    );

    return () => {
      window.removeEventListener(
        "printCompleted",
        handlePrintCompleted as EventListener,
      );
    };
  }, [queryClient]);

  // Helper function to get product name - defined early to avoid hoisting issues
  const getProductName = (productId: number) => {
    const product = Array.isArray(products)
      ? products.find((p: any) => p.id === productId)
      : null;
    return product?.name || `Product #${productId}`;
  };

  const {
    data: tables,
    isLoading,
    refetch: refetchTables,
  } = useQuery({
    queryKey: ["/api/tables"],
    staleTime: 60 * 1000, // Cache 1 phút
    gcTime: 5 * 60 * 1000, // Giữ cache 5 phút
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 2,
  });

  const { data: orders, refetch: refetchOrders } = useQuery({
    queryKey: ["/api/orders"],
    staleTime: 30 * 1000, // Cache 30 giây cho orders
    gcTime: 2 * 60 * 1000, // Giữ cache 2 phút
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: 2,
  });

  const {
    data: orderItems,
    isLoading: orderItemsLoading,
    refetch: refetchOrderItems,
  } = useQuery({
    queryKey: ["/api/order-items", selectedOrder?.id],
    enabled: !!selectedOrder?.id && orderDetailsOpen,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 60 * 1000, // Cache 1 phút
    gcTime: 5 * 60 * 1000, // Giữ cache 5 phút
    retry: 2,
    queryFn: async () => {
      const orderId = selectedOrder.id;
      if (!orderId) {
        return [];
      }

      try {
        const response = await apiRequest("GET", `/api/order-items/${orderId}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching order items:", error);
        return [];
      }
    },
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    staleTime: 60 * 60 * 1000, // Cache for 1 hour (products don't change often)
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["/api/store-settings"],
    staleTime: 2 * 60 * 60 * 1000, // Cache for 2 hours (settings rarely change)
    gcTime: 4 * 60 * 60 * 1000, // Keep in cache for 4 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: pointsPaymentOpen,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
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

  // Extract active orders, subtotal, tax, and total from the `orders` data
  const activeOrders = Array.isArray(orders)
    ? orders.filter(
        (order: Order) => !["paid", "cancelled"].includes(order.status),
      )
    : [];

  // Calculate subtotal, tax, and total from active orders for broadcasting
  let subtotal = 0;
  let totalTax = 0;
  let grandTotal = 0;

  if (Array.isArray(activeOrders) && activeOrders.length > 0) {
    activeOrders.forEach((order) => {
      subtotal += parseFloat(order.subtotal || "0");
      totalTax += parseFloat(order.tax || "0");
      grandTotal += parseFloat(order.total || "0");
    });
  }

  // Only refetch order items when dialog opens and no cached data exists
  useEffect(() => {
    if (orderDetailsOpen && selectedOrder?.id) {
      const cachedData = queryClient.getQueryData([
        "/api/order-items",
        selectedOrder.id,
      ]);
      if (!cachedData) {
        console.log(
          `🔍 Table Grid: Loading order items for order ${selectedOrder.id} (no cached data)`,
        );
        refetchOrderItems();
      }
    }
  }, [orderDetailsOpen, selectedOrder?.id]);

  // Handle events but only refresh when absolutely necessary
  useEffect(() => {
    const handlePaymentCompleted = (event: CustomEvent) => {
      console.log("🛡️ Table Grid: Payment completed event received");

      // Only invalidate - don't force refetch, let cache handle it
      if (!event.detail?.skipAllRefetch) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      }
    };

    const handleOrderUpdate = (event: CustomEvent) => {
      console.log("🛡️ Table Grid: Order update event received");

      // Only invalidate specific data that changed
      if (!event.detail?.skipAllRefetch && event.detail?.orderId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/order-items", event.detail.orderId],
        });
      }
    };

    window.addEventListener("paymentCompleted", handlePaymentCompleted);
    window.addEventListener("orderTotalsUpdated", handleOrderUpdate);

    return () => {
      window.removeEventListener("paymentCompleted", handlePaymentCompleted);
      window.removeEventListener("orderTotalsUpdated", handleOrderUpdate);
    };
  }, []);

  // Enhanced WebSocket connection for AGGRESSIVE real-time updates
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let shouldReconnect = true;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("🔌 TableGrid: WebSocket connected successfully");
          wsRef.current = ws;

          // Register as table grid client
          ws.send(
            JSON.stringify({
              type: "register_table_grid",
              timestamp: new Date().toISOString(),
            }),
          );

          // Send initial cart state if there are active orders
          if (activeOrders.length > 0) {
            setTimeout(() => {
              broadcastCartUpdate();
            }, 500);
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);

            // Expanded list of events that trigger aggressive refresh for table grid
            if (
              data.type === "popup_close" ||
              data.type === "payment_success" ||
              data.type === "order_status_update" ||
              data.type === "force_refresh" ||
              data.type === "einvoice_published" ||
              data.type === "einvoice_saved_for_later" ||
              data.type === "payment_completed" ||
              data.type === "modal_closed" ||
              data.type === "refresh_data_after_print" ||
              data.type === "invoice_modal_closed" ||
              data.type === "print_completed" ||
              data.force_refresh === true
            ) {
              console.log(
                "🔄 TableGrid: IMMEDIATE data refresh triggered by:",
                data.type,
              );
              console.log("📊 TableGrid: Event details:", data);

              // IMMEDIATE MULTI-STRATEGY REFRESH
              try {
                // Strategy 1: Complete cache clearing
                queryClient.clear();
                queryClient.removeQueries();

                // Strategy 2: Force immediate fresh data fetch with multiple cache busting techniques
                const timestamp = Date.now().toString();
                const cacheBuster = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

                console.log(
                  "📡 TableGrid: Fetching fresh data with cache buster:",
                  cacheBuster,
                );

                const [freshTables, freshOrders] = await Promise.all([
                  fetch(
                    `/api/tables?_ws_refresh=${cacheBuster}&_force=true&_timestamp=${timestamp}`,
                    {
                      cache: "no-store",
                      headers: {
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                        Expires: "0",
                        "X-Requested-With": "XMLHttpRequest",
                      },
                    },
                  ).then((r) => {
                    if (!r.ok)
                      throw new Error(`Tables fetch failed: ${r.status}`);
                    return r.json();
                  }),
                  fetch(
                    `/api/orders?_ws_refresh=${cacheBuster}&_force=true&_timestamp=${timestamp}`,
                    {
                      cache: "no-store",
                      headers: {
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                        Expires: "0",
                        "X-Requested-With": "XMLHttpRequest",
                      },
                    },
                  ).then((r) => {
                    if (!r.ok)
                      throw new Error(`Orders fetch failed: ${r.status}`);
                    return r.json();
                  }),
                ]);

                console.log("✅ TableGrid: Fresh data fetched successfully:", {
                  tables: freshTables?.length || 0,
                  orders: freshOrders?.length || 0,
                });

                // Strategy 3: Set fresh data immediately with forced update
                queryClient.setQueryData(["/api/tables"], freshTables);
                queryClient.setQueryData(["/api/orders"], freshOrders);

                // Strategy 4: Multiple timed invalidations with force refetch
                setTimeout(() => {
                  console.log("🔄 TableGrid: First invalidation wave");
                  queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                }, 50);

                setTimeout(() => {
                  console.log("🔄 TableGrid: Second refetch wave");
                  queryClient.refetchQueries({ queryKey: ["/api/tables"] });
                  queryClient.refetchQueries({ queryKey: ["/api/orders"] });
                }, 200);

                setTimeout(() => {
                  console.log("🔄 TableGrid: Final force refresh wave");
                  queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                  refetchTables();
                  refetchOrders();
                }, 500);

                console.log(
                  "🎉 TableGrid: All refresh strategies completed successfully",
                );
              } catch (refreshError) {
                console.error(
                  "❌ TableGrid: WebSocket refresh failed, using fallback:",
                  refreshError,
                );

                // Enhanced fallback strategy
                queryClient.clear();
                queryClient.removeQueries();

                try {
                  await Promise.all([refetchTables(), refetchOrders()]);
                  console.log("✅ TableGrid: Fallback refresh completed");
                } catch (fallbackError) {
                  console.error(
                    "❌ TableGrid: Even fallback failed:",
                    fallbackError,
                  );

                  // Last resort: force page reload for critical data
                  setTimeout(() => {
                    if (
                      data.type === "payment_success" ||
                      data.type === "einvoice_published"
                    ) {
                      console.warn(
                        "⚠️ TableGrid: Critical refresh failed, considering page reload...",
                      );
                      // Don't auto-reload, just log the issue
                    }
                  }, 1000);
                }
              }

              // Strategy 5: Dispatch custom events for cross-component coordination
              window.dispatchEvent(
                new CustomEvent("refreshTableData", {
                  detail: {
                    source: "table_grid_websocket_enhanced",
                    reason: data.type,
                    action: data.action || "aggressive_refresh",
                    invoiceId: data.invoiceId || null,
                    orderId: data.orderId || null,
                    forceRefresh: true,
                    timestamp: new Date().toISOString(),
                    success: true,
                  },
                }),
              );

              // Also dispatch to window for other components
              window.dispatchEvent(
                new CustomEvent("dataRefreshCompleted", {
                  detail: {
                    component: "table_grid",
                    reason: data.type,
                    timestamp: new Date().toISOString(),
                  },
                }),
              );
            }
          } catch (error) {
            console.error(
              "❌ TableGrid: Error processing WebSocket message:",
              error,
            );
          }
        };

        ws.onerror = (error) => {
          console.error("❌ TableGrid: WebSocket error:", error);
        };

        ws.onclose = (event) => {
          console.log(
            "🔌 TableGrid: WebSocket connection closed:",
            event.code,
            event.reason,
          );

          // Attempt reconnection if still needed
          if (shouldReconnect) {
            console.log(
              "🔄 TableGrid: Attempting WebSocket reconnection in 2 seconds...",
            );
            reconnectTimeout = setTimeout(connectWebSocket, 2000);
          }
        };
      } catch (error) {
        console.error(
          "❌ TableGrid: Failed to create WebSocket connection:",
          error,
        );

        // Retry connection after delay
        if (shouldReconnect) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    // Initialize connection
    connectWebSocket();

    // Cleanup function
    return () => {
      console.log("🧹 TableGrid: Cleaning up WebSocket connection");
      shouldReconnect = false;

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounting");
      }
    };
  }, [queryClient, refetchTables, refetchOrders]);

  // Broadcast cart updates to customer display - only for selected table
  const broadcastCartUpdate = useCallback(
    async (specificTableId?: number) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        let cartItems = [];
        let orderSubtotal = 0;
        let orderTax = 0;
        let orderTotal = 0;

        // If specific table ID is provided, get detailed order items for that table
        if (specificTableId) {
          const tableOrders = activeOrders.filter(
            (order) => order.tableId === specificTableId,
          );

          // If table has orders, get detailed items
          if (tableOrders.length > 0) {
            console.log(
              "📡 Table Grid: Getting detailed items for table",
              specificTableId,
              "with",
              tableOrders.length,
              "orders",
            );

            try {
              // Get detailed order items for all orders of this table
              for (const order of tableOrders) {
                console.log(
                  "📡 Table Grid: Fetching items for order",
                  order.id,
                );

                // Fetch order items for this order
                const response = await apiRequest(
                  "GET",
                  `/api/order-items/${order.id}`,
                );
                const orderItemsData = await response.json();

                if (
                  Array.isArray(orderItemsData) &&
                  orderItemsData.length > 0
                ) {
                  console.log(
                    "📡 Table Grid: Found",
                    orderItemsData.length,
                    "items for order",
                    order.id,
                  );

                  // Convert order items to cart format with full product details
                  const orderCartItems = orderItemsData.map((item: any) => {
                    const basePrice = Number(item.unitPrice || 0);
                    const quantity = Number(item.quantity || 0);
                    const product = Array.isArray(products)
                      ? products.find((p: any) => p.id === item.productId)
                      : null;

                    // Calculate subtotal for this item
                    const itemSubtotal = basePrice * quantity;
                    orderSubtotal += itemSubtotal;

                    // Calculate tax for this item using same logic as order details
                    let itemTax = 0;
                    if (
                      product?.afterTaxPrice &&
                      product.afterTaxPrice !== null &&
                      product.afterTaxPrice !== ""
                    ) {
                      const afterTaxPrice = parseFloat(product.afterTaxPrice);
                      const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
                      itemTax = Math.floor(taxPerUnit * quantity);
                      orderTax += itemTax;
                    }

                    const itemTotal = itemSubtotal + itemTax;
                    orderTotal += itemTotal;

                    return {
                      id: item.id,
                      productId: item.productId,
                      name: item.productName || getProductName(item.productId),
                      productName:
                        item.productName || getProductName(item.productId),
                      price: basePrice.toString(),
                      quantity: quantity,
                      total: itemTotal.toString(),
                      taxRate: product?.taxRate || "0",
                      afterTaxPrice: product?.afterTaxPrice || null,
                      unitPrice: item.unitPrice,
                      notes: item.notes,
                      orderNumber: order.orderNumber,
                      product: {
                        id: item.productId,
                        name:
                          item.productName || getProductName(item.productId),
                        price: basePrice.toString(),
                        afterTaxPrice: product?.afterTaxPrice || null,
                        taxRate: product?.taxRate || "0",
                      },
                    };
                  });

                  cartItems.push(...orderCartItems);
                }
              }

              console.log(
                "📡 Table Grid: Total cart items for table",
                specificTableId,
                ":",
                cartItems.length,
              );
              console.log("📡 Table Grid: Calculated totals:", {
                subtotal: orderSubtotal,
                tax: orderTax,
                total: orderTotal,
              });
            } catch (error) {
              console.error(
                "📡 Table Grid: Error fetching detailed order items:",
                error,
              );

              // Fallback to basic order data if detailed fetch fails
              cartItems = tableOrders.map((order) => ({
                id: order.id,
                productId: order.productId || order.id,
                name: order.name || `Đơn hàng ${order.orderNumber}`,
                productName: order.name || `Đơn hàng ${order.orderNumber}`,
                price: order.price || "0",
                quantity: order.quantity || 1,
                total: order.total || "0",
                taxRate: order.taxRate || "0",
                afterTaxPrice: order.afterTaxPrice,
                orderNumber: order.orderNumber,
                product: {
                  id: order.productId || order.id,
                  name: order.name || `Đơn hàng ${order.orderNumber}`,
                  price: order.price || "0",
                  afterTaxPrice: order.afterTaxPrice,
                  taxRate: order.taxRate || "0",
                },
              }));

              // Use stored totals as fallback
              tableOrders.forEach((order) => {
                orderSubtotal += parseFloat(order.subtotal || "0");
                orderTax += parseFloat(order.tax || "0");
                orderTotal += parseFloat(order.total || "0");
              });
            }
          }
        } else {
          // If no specific table, clear the display
          cartItems = [];
          orderSubtotal = 0;
          orderTax = 0;
          orderTotal = 0;
        }

        const cartData = {
          type: "cart_update",
          cart: cartItems,
          subtotal: Math.floor(orderSubtotal),
          tax: Math.floor(orderTax),
          total: Math.floor(orderTotal),
          tableId: specificTableId || null,
          orderNumber: cartItems.length > 0 ? cartItems[0]?.orderNumber : null,
          timestamp: new Date().toISOString(),
        };

        console.log(
          "📡 Table Grid: Broadcasting detailed cart update for table:",
          {
            tableId: specificTableId,
            cartItemsCount: cartItems.length,
            subtotal: Math.floor(orderSubtotal),
            tax: Math.floor(orderTax),
            total: Math.floor(orderTotal),
            orderNumber: cartData.orderNumber,
            sampleItems: cartItems.slice(0, 3).map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
            })),
          },
        );

        try {
          wsRef.current.send(JSON.stringify(cartData));
        } catch (error) {
          console.error(
            "📡 Table Grid: Error broadcasting cart update:",
            error,
          );
        }
      } else {
        console.log("📡 Table Grid: WebSocket not available for broadcasting");
      }
    },
    [activeOrders, products, getProductName],
  );

  // Clear customer display when no order details are open
  useEffect(() => {
    if (!orderDetailsOpen && !selectedOrder) {
      // Clear customer display when no order is being viewed
      broadcastCartUpdate(null);
    }
  }, [orderDetailsOpen, selectedOrder, broadcastCartUpdate]);

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ tableId, status }: { tableId: number; status: string }) =>
      apiRequest("PUT", `/api/tables/${tableId}/status`, { status }),
    onSuccess: async (data, variables) => {
      console.log(
        `🔄 Table Grid: Table ${variables.tableId} status updated to ${variables.status}`,
      );

      // Clear cache and force immediate refresh for immediate UI update
      queryClient.removeQueries({ queryKey: ["/api/tables"] });
      queryClient.removeQueries({ queryKey: ["/api/orders"] });

      // Force immediate fresh fetch
      try {
        await Promise.all([refetchTables(), refetchOrders()]);
        console.log("✅ Table status update refresh completed");
      } catch (error) {
        console.error("❌ Table status update refresh failed:", error);
      }

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

      // Find the order to get its table ID for status update
      const completedOrder = Array.isArray(orders)
        ? orders.find((o: any) => o.id === variables.orderId)
        : null;

      console.log("🔍 Completed order details:", {
        orderId: variables.orderId,
        tableId: completedOrder?.tableId,
        orderNumber: completedOrder?.orderNumber,
      });

      // If order has a table, check if we need to update table status
      if (completedOrder?.tableId) {
        try {
          // Check if there are any other unpaid orders on this table
          const otherActiveOrders = Array.isArray(orders)
            ? orders.filter(
                (o: any) =>
                  o.tableId === completedOrder.tableId &&
                  o.id !== variables.orderId &&
                  !["paid", "cancelled"].includes(o.status),
              )
            : [];

          console.log("🔍 Other active orders on table:", {
            tableId: completedOrder.tableId,
            otherOrdersCount: otherActiveOrders.length,
            otherOrders: otherActiveOrders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              status: o.status,
            })),
          });

          // If no other unpaid orders, update table to available
          if (otherActiveOrders.length === 0) {
            console.log(
              `🔄 Updating table ${completedOrder.tableId} to available status`,
            );

            try {
              await apiRequest(
                "PUT",
                `/api/tables/${completedOrder.tableId}/status`,
                {
                  status: "available",
                },
              );
              console.log(
                `✅ Table ${completedOrder.tableId} updated to available`,
              );
            } catch (tableError) {
              console.error(
                `❌ Error updating table ${completedOrder.tableId}:`,
                tableError,
              );
            }
          } else {
            console.log(
              `⏳ Table ${completedOrder.tableId} still has ${otherActiveOrders.length} active orders, keeping occupied status`,
            );
          }
        } catch (error) {
          console.error("❌ Error checking table status update:", error);
        }
      }

      // IMMEDIATE: Clear all cache before any other operation
      queryClient.clear();
      queryClient.removeQueries();

      console.log(
        "🔄 Table: Starting aggressive data refresh after payment success",
      );

      // IMMEDIATE: Force fresh API calls with no-cache headers
      try {
        // Use fetch directly with no-cache to bypass React Query entirely for immediate update
        const [freshTables, freshOrders] = await Promise.all([
          fetch("/api/tables", {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }).then((r) => r.json()),
          fetch("/api/orders", {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }).then((r) => r.json()),
        ]);

        // Set fresh data immediately in cache
        queryClient.setQueryData(["/api/tables"], freshTables);
        queryClient.setQueryData(["/api/orders"], freshOrders);

        console.log("✅ Table: Fresh data fetched and set in cache");

        // Force component re-render by invalidating after setting fresh data
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        }, 50);
      } catch (fetchError) {
        console.error(
          "❌ Table: Error during immediate fresh fetch:",
          fetchError,
        );

        // Fallback to normal refetch
        await Promise.all([refetchTables(), refetchOrders()]);
      }

      // Strategy 5: Dispatch custom events for cross-component coordination
      if (typeof window !== "undefined") {
        const events = [
          new CustomEvent("paymentCompleted", {
            detail: {
              orderId: variables.orderId,
              paymentMethod: variables.paymentMethod,
              timestamp: new Date().toISOString(),
            },
          }),
          new CustomEvent("orderStatusUpdated", {
            detail: {
              orderId: variables.orderId,
              status: "paid",
              timestamp: new Date().toISOString(),
            },
          }),
          new CustomEvent("forceRefresh", {
            detail: {
              reason: "payment_completed",
              orderId: variables.orderId,
              source: "table-grid",
            },
          }),
        ];

        events.forEach((event) => {
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
          console.log(
            "✅ Table payment completed - preparing receipt data with EXACT database values",
          );

          // Map order items WITHOUT recalculation - use database values directly
          const processedItems = Array.isArray(orderItemsData)
            ? orderItemsData.map((item: any) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName || getProductName(item.productId),
                quantity: item.quantity,
                price: item.unitPrice,
                total: item.total,
                unitPrice: item.unitPrice,
                discount: item.discount || "0", // Use exact database discount
                sku: item.productSku || `SP${item.productId}`,
                taxRate: 0, // Will be calculated from afterTaxPrice if available
              }))
            : [];

          // Use EXACT database values from completed order - NO RECALCULATION
          const receiptData = {
            ...completedOrder,
            transactionId: `TXN-${Date.now()}`,
            createdAt: new Date().toISOString(),
            cashierName: "Table Service",
            paymentMethod: variables.paymentMethod || "cash",
            amountReceived: completedOrder.total,
            change: "0.00",
            items: processedItems,
            // Use EXACT database values without any calculation
            subtotal: completedOrder.subtotal,
            tax: completedOrder.tax,
            discount: completedOrder.discount || "0",
            total: completedOrder.total,
            exactSubtotal: Math.floor(Number(completedOrder.subtotal || 0)),
            exactTax: Math.floor(Number(completedOrder.tax || 0)),
            exactDiscount: Math.floor(Number(completedOrder.discount || 0)),
            exactTotal: Math.floor(Number(completedOrder.total || 0)),
            tableNumber:
              getTableInfo(completedOrder.tableId)?.tableNumber || "N/A",
          };

          console.log(
            "📄 Table receipt data prepared with EXACT database values:",
            {
              subtotal: receiptData.subtotal,
              tax: receiptData.tax,
              discount: receiptData.discount,
              total: receiptData.total,
              exactTotal: receiptData.exactTotal,
              source: "database_direct_no_calculation",
            },
          );

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
          description: "Thanh toán thành công nhưng không thể hiển thị hóa đõn",
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
    onSuccess: async (data, variables) => {
      // Find the order to get its table ID for status update
      const completedOrder = Array.isArray(orders)
        ? orders.find((o: any) => o.id === variables.orderId)
        : null;

      console.log("🔍 Points payment completed for order:", {
        orderId: variables.orderId,
        tableId: completedOrder?.tableId,
        orderNumber: completedOrder?.orderNumber,
      });

      // If order has a table, check if we need to update table status
      if (completedOrder?.tableId) {
        try {
          // Check if there are any other unpaid orders on this table
          const otherActiveOrders = Array.isArray(orders)
            ? orders.filter(
                (o: any) =>
                  o.tableId === completedOrder.tableId &&
                  o.id !== variables.orderId &&
                  !["paid", "cancelled"].includes(o.status),
              )
            : [];

          console.log("🔍 Other active orders on table after points payment:", {
            tableId: completedOrder.tableId,
            otherOrdersCount: otherActiveOrders.length,
          });

          // If no other unpaid orders, update table to available
          if (otherActiveOrders.length === 0) {
            console.log(
              `🔄 Updating table ${completedOrder.tableId} to available after points payment`,
            );

            try {
              await apiRequest(
                "PUT",
                `/api/tables/${completedOrder.tableId}/status`,
                {
                  status: "available",
                },
              );
              console.log(
                `✅ Table ${completedOrder.tableId} updated to available after points payment`,
              );
            } catch (tableError) {
              console.error(
                `❌ Error updating table ${completedOrder.tableId} after points payment:`,
                tableError,
              );
            }
          }
        } catch (error) {
          console.error(
            "❌ Error checking table status update after points payment:",
            error,
          );
        }
      }

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
        .then(async (completedOrder) => {
          if (completedOrder) {
            console.log(
              "Points payment completed - preparing receipt with exact database values:",
              completedOrder,
            );

            // Also fetch order items for complete receipt
            try {
              const orderItemsResponse = await apiRequest(
                "GET",
                `/api/order-items/${variables.orderId}`,
              );
              const orderItemsData = await orderItemsResponse.json();

              const processedItems = Array.isArray(orderItemsData)
                ? orderItemsData.map((item: any) => ({
                    id: item.id,
                    productId: item.productId,
                    productName:
                      item.productName || getProductName(item.productId),
                    quantity: item.quantity,
                    price: item.unitPrice,
                    total: item.total,
                    unitPrice: item.unitPrice,
                    discount: item.discount || "0",
                    sku: item.productSku || `SP${item.productId}`,
                  }))
                : [];

              const receiptData = {
                ...completedOrder,
                transactionId: `TXN-${Date.now()}`,
                createdAt: new Date().toISOString(),
                cashierName: "Table Service",
                paymentMethod: "points",
                amountReceived: completedOrder.total,
                change: "0.00",
                items: processedItems,
                // Use exact database values - no recalculation
                subtotal: completedOrder.subtotal,
                tax: completedOrder.tax,
                discount: completedOrder.discount || "0",
                total: completedOrder.total,
                exactSubtotal: Math.floor(Number(completedOrder.subtotal || 0)),
                exactTax: Math.floor(Number(completedOrder.tax || 0)),
                exactDiscount: Math.floor(Number(completedOrder.discount || 0)),
                exactTotal: Math.floor(Number(completedOrder.total || 0)),
                tableNumber:
                  getTableInfo(completedOrder.tableId)?.tableNumber || "N/A",
              };

              setSelectedReceipt(receiptData);
              setShowReceiptModal(true);
            } catch (error) {
              console.error(
                "Error fetching order items for points payment receipt:",
                error,
              );
              // Fallback to basic receipt data
              setSelectedReceipt({
                ...completedOrder,
                transactionId: `TXN-${Date.now()}`,
                paymentMethod: "points",
                tableNumber:
                  getTableInfo(completedOrder.tableId)?.tableNumber || "N/A",
              });
              setShowReceiptModal(true);
            }
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

    // Calculate correct order total from order items
    let calculatedTotal = 0;
    if (
      Array.isArray(orderItems) &&
      orderItems.length > 0 &&
      Array.isArray(products)
    ) {
      let subtotal = 0;
      let totalTax = 0;

      orderItems.forEach((item: any) => {
        const basePrice = Number(item.unitPrice || 0);
        const quantity = Number(item.quantity || 0);
        const product = products.find((p: any) => p.id === item.productId);

        // Calculate subtotal (base price without tax)
        subtotal += basePrice * quantity;

        // Calculate tax using same logic as order details
        if (
          product?.afterTaxPrice &&
          product.afterTaxPrice !== null &&
          product.afterTaxPrice !== ""
        ) {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
          totalTax += Math.floor(taxPerUnit * quantity);
        }
      });

      calculatedTotal = Math.floor(subtotal + totalTax);
    } else {
      // Fallback to stored total if calculation not possible
      calculatedTotal = Number(selectedOrder.total || 0);
    }

    // Final total is the calculated total (subtotal + tax)
    // Discount is applied separately in payment processing
    const finalTotal = calculatedTotal;

    const pointsValue = customerPoints * 1000; // 1 point = 1000 VND

    if (customerPoints === 0) {
      toast({
        title: "Lỗi",
        description: "Khách hàng không có điểm",
        variant: "destructive",
      });
      return;
    }

    if (pointsValue >= finalTotal) {
      // Full points payment
      const pointsToUse = Math.ceil(finalTotal / 1000);
      pointsPaymentMutation.mutate({
        customerId: selectedCustomer.id,
        points: pointsToUse,
        orderId: selectedOrder.id,
      });
    } else {
      // Mixed payment - use all available points + other payment method
      const remainingAmount = finalTotal - pointsValue;
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
    onSuccess: async (data, variables) => {
      // Find the order to get its table ID for status update
      const completedOrder = Array.isArray(orders)
        ? orders.find((o: any) => o.id === variables.orderId)
        : null;

      console.log("🔍 Mixed payment completed for order:", {
        orderId: variables.orderId,
        tableId: completedOrder?.tableId,
        orderNumber: completedOrder?.orderNumber,
      });

      // If order has a table, check if we need to update table status
      if (completedOrder?.tableId) {
        try {
          // Check if there are any other unpaid orders on this table
          const otherActiveOrders = Array.isArray(orders)
            ? orders.filter(
                (o: any) =>
                  o.tableId === completedOrder.tableId &&
                  o.id !== variables.orderId &&
                  !["paid", "cancelled"].includes(o.status),
              )
            : [];

          console.log("🔍 Other active orders on table after mixed payment:", {
            tableId: completedOrder.tableId,
            otherOrdersCount: otherActiveOrders.length,
          });

          // If no other unpaid orders, update table to available
          if (otherActiveOrders.length === 0) {
            console.log(
              `🔄 Updating table ${completedOrder.tableId} to available after mixed payment`,
            );

            try {
              await apiRequest(
                "PUT",
                `/api/tables/${completedOrder.tableId}/status`,
                {
                  status: "available",
                },
              );
              console.log(
                `✅ Table ${completedOrder.tableId} updated to available after mixed payment`,
              );
            } catch (tableError) {
              console.error(
                `❌ Error updating table ${completedOrder.tableId} after mixed payment:`,
                tableError,
              );
            }
          }
        } catch (error) {
          console.error(
            "❌ Error checking table status update after mixed payment:",
            error,
          );
        }
      }

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
        .then(async (completedOrder) => {
          if (completedOrder) {
            console.log(
              "Mixed payment completed - preparing receipt with exact database values:",
              completedOrder,
            );

            // Also fetch order items for complete receipt
            try {
              const orderItemsResponse = await apiRequest(
                "GET",
                `/api/order-items/${variables.orderId}`,
              );
              const orderItemsData = await orderItemsResponse.json();

              const processedItems = Array.isArray(orderItemsData)
                ? orderItemsData.map((item: any) => ({
                    id: item.id,
                    productId: item.productId,
                    productName:
                      item.productName || getProductName(item.productId),
                    quantity: item.quantity,
                    price: item.unitPrice,
                    total: item.total,
                    unitPrice: item.unitPrice,
                    discount: item.discount || "0",
                    sku: item.productSku || `SP${item.productId}`,
                  }))
                : [];

              const receiptData = {
                ...completedOrder,
                transactionId: `TXN-${Date.now()}`,
                createdAt: new Date().toISOString(),
                cashierName: "Table Service",
                paymentMethod: `points + ${variables.paymentMethod}`,
                amountReceived: completedOrder.total,
                change: "0.00",
                items: processedItems,
                // Use exact database values - no recalculation
                subtotal: completedOrder.subtotal,
                tax: completedOrder.tax,
                discount: completedOrder.discount || "0",
                total: completedOrder.total,
                exactSubtotal: Math.floor(Number(completedOrder.subtotal || 0)),
                exactTax: Math.floor(Number(completedOrder.tax || 0)),
                exactDiscount: Math.floor(Number(completedOrder.discount || 0)),
                exactTotal: Math.floor(Number(completedOrder.total || 0)),
                tableNumber:
                  getTableInfo(completedOrder.tableId)?.tableNumber || "N/A",
              };

              setSelectedReceipt(receiptData);
              setShowReceiptModal(true);
            } catch (error) {
              console.error(
                "Error fetching order items for mixed payment receipt:",
                error,
              );
              // Fallback to basic receipt data
              setSelectedReceipt({
                ...completedOrder,
                transactionId: `TXN-${Date.now()}`,
                paymentMethod: `points + ${variables.paymentMethod}`,
                tableNumber:
                  getTableInfo(completedOrder.tableId)?.tableNumber || "N/A",
              });
              setShowReceiptModal(true);
            }
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

    // Broadcast cart update for this specific table to customer display
    if (order.tableId) {
      broadcastCartUpdate(order.tableId);
    }

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

  // Define handlePaymentMethodSelect here - ENHANCED for immediate data refresh with proper discount handling
  const handlePaymentMethodSelect = async (
    method: string,
    paymentData?: any,
  ) => {
    console.log("💳 Table Grid: Payment method selected:", method, paymentData);

    if (method === "paymentCompleted" && paymentData?.success) {
      console.log("✅ Table Grid: Payment completed successfully", paymentData);

      try {
        // STEP 1: Clear ALL cache aggressively
        console.log("🔄 Table Grid: AGGRESSIVE cache clearing starting...");
        queryClient.clear();
        queryClient.removeQueries();

        // STEP 2: Force immediate fresh data fetch with multiple strategies
        console.log("🔄 Table Grid: Force fetching fresh data...");

        // Strategy A: Direct fetch with no-cache headers
        const [freshTables, freshOrders] = await Promise.all([
          fetch(
            "/api/tables?" +
              new URLSearchParams({
                _t: Date.now().toString(),
                _force: "true",
              }),
            {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            },
          ).then((r) => r.json()),
          fetch(
            "/api/orders?" +
              new URLSearchParams({
                _t: Date.now().toString(),
                _force: "true",
              }),
            {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            },
          ).then((r) => r.json()),
        ]);

        // STEP 3: Set fresh data immediately in cache
        queryClient.setQueryData(["/api/tables"], freshTables);
        queryClient.setQueryData(["/api/orders"], freshOrders);
        console.log("✅ Table Grid: Fresh data loaded and cached");

        // STEP 4: Force multiple re-renders with different timings
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        }, 50);

        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ["/api/tables"] });
          queryClient.refetchQueries({ queryKey: ["/api/orders"] });
        }, 200);

        // STEP 5: Close all modals and clear states
        setShowPaymentMethodModal(false);
        setOrderForPayment(null);
        setOrderDetailsOpen(false);
        setSelectedOrder(null);
        setOrderForEInvoice(null);

        // Show success message
        toast({
          title: "Thành công",
          description: paymentData.publishLater
            ? "Đơn hàng đã được thanh toán và lưu để phát hành hóa đơn sau"
            : "Đơn hàng đã được thanh toán thành công",
        });

        // Show receipt if provided
        if (paymentData.receipt && paymentData.shouldShowReceipt !== false) {
          console.log("📄 Table Grid: Showing final receipt modal");
          setSelectedReceipt(paymentData.receipt);
          setShowReceiptModal(true);
        }

        console.log(
          "🎉 Table Grid: Payment flow completed and data refreshed successfully",
        );
      } catch (error) {
        console.error(
          "❌ Table Grid: Error refreshing data after payment:",
          error,
        );

        // Fallback refresh with forced refetch
        try {
          await Promise.all([refetchTables(), refetchOrders()]);
          console.log("✅ Fallback refresh completed");
        } catch (fallbackError) {
          console.error(
            "❌ Table Grid: Fallback refresh also failed:",
            fallbackError,
          );
        }
      }

      return;
    }

    if (method === "paymentError" && paymentData) {
      console.error("❌ Table Grid: Payment failed", paymentData);

      toast({
        title: "Lỗi",
        description:
          paymentData.error ||
          "Không thể hoàn tất thanh toán. Vui lòng thử lại.",
        variant: "destructive",
      });

      // Close modal and clear states
      setShowPaymentMethodModal(false);
      setOrderForPayment(null);
      return;
    }

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
      if (method === "einvoice") {
        console.log("📧 Opening E-invoice modal for table payment");
        setShowPaymentMethodModal(false);
        setShowEInvoiceModal(true);
        // Pass the relevant order details to the EInvoiceModal
        setOrderForEInvoice({
          ...orderForPayment,
          orderItems: orderItems || orderForPayment.orderItems, // Ensure orderItems are available
          exactSubtotal:
            orderForPayment.exactSubtotal ||
            parseFloat(orderForPayment.subtotal || "0"),
          exactTax:
            orderForPayment.exactTax || parseFloat(orderForPayment.tax || "0"),
          exactTotal:
            orderForPayment.exactTotal ||
            parseFloat(orderForPayment.total || "0"),
        });
        return;
      }

      // Store payment method for receipt display
      setSelectedPaymentMethod(method);

      // Close payment method modal and show receipt preview
      setShowPaymentMethodModal(false);

      // Calculate proper totals from order items with exact discount handling
      let calculatedSubtotal = 0;
      let calculatedTax = 0;
      let orderDiscount = 0;

      console.log("💰 Table Grid: Calculating receipt data from order items", {
        orderForPayment: orderForPayment,
        orderItems: orderItems?.length || 0,
      });

      // Get discount from orderForPayment first, then from selectedOrder
      if (
        orderForPayment.exactDiscount !== undefined &&
        orderForPayment.exactDiscount !== null
      ) {
        orderDiscount = Math.floor(Number(orderForPayment.exactDiscount));
      } else if (
        orderForPayment.discount !== undefined &&
        orderForPayment.discount !== null
      ) {
        orderDiscount = Math.floor(Number(orderForPayment.discount));
      } else if (selectedOrder?.discount) {
        orderDiscount = Math.floor(Number(selectedOrder.discount));
      }

      // Process order items to calculate subtotal and tax
      const processedItems =
        Array.isArray(orderItems) && orderItems.length > 0
          ? orderItems.map((item: any) => {
              const basePrice = Number(item.unitPrice || 0);
              const quantity = Number(item.quantity || 0);
              const product = Array.isArray(products)
                ? products.find((p: any) => p.id === item.productId)
                : null;

              // Calculate subtotal (base price without tax)
              calculatedSubtotal += basePrice * quantity;

              // Calculate tax using same logic as Order Details
              if (
                product?.afterTaxPrice &&
                product.afterTaxPrice !== null &&
                product.afterTaxPrice !== ""
              ) {
                const afterTaxPrice = parseFloat(product.afterTaxPrice);
                const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
                calculatedTax += Math.floor(taxPerUnit * quantity);
              }

              return {
                id: item.id,
                productId: item.productId,
                productName: item.productName || getProductName(item.productId),
                quantity: quantity,
                price: item.unitPrice,
                unitPrice: item.unitPrice,
                total: item.total,
                sku:
                  item.productSku ||
                  `FOOD${String(item.productId).padStart(6, "0")}`,
                taxRate: product?.taxRate ? parseFloat(product.taxRate) : 10,
              };
            })
          : [];

      // Final total calculation: subtotal + tax (discount applied during payment)
      const finalTotal = Math.floor(calculatedSubtotal + calculatedTax);

      console.log("💰 Table Grid: Calculated receipt totals", {
        calculatedSubtotal: calculatedSubtotal,
        calculatedTax: calculatedTax,
        orderDiscount: orderDiscount,
        finalTotal: finalTotal,
        itemsProcessed: processedItems.length,
      });

      // Create receipt preview data with proper format
      const receiptPreview = {
        ...orderForPayment,
        transactionId: `PREVIEW-${Date.now()}`,
        createdAt: new Date().toISOString(),
        cashierName: "Table Service",
        paymentMethod: method,
        amountReceived:
          paymentData?.amountReceived?.toString() || finalTotal.toString(),
        change: paymentData?.change?.toString() || "0.00",
        customerName: orderForPayment.customerName,
        tableNumber:
          getTableInfo(orderForPayment.tableId)?.tableNumber || "N/A",
        items: processedItems,
        subtotal: Math.floor(calculatedSubtotal).toString(),
        tax: Math.floor(calculatedTax).toString(),
        total: finalTotal.toString(),
        discount: orderDiscount.toString(),
        exactTotal: Math.floor(finalTotal),
        exactSubtotal: Math.floor(calculatedSubtotal),
        exactTax: Math.floor(calculatedTax),
        exactDiscount: orderDiscount,
      };

      console.log("📄 Table Grid: Receipt preview created with proper format", {
        receiptPreview: receiptPreview,
        hasItems: receiptPreview.items?.length > 0,
      });

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

      // Force immediate data refresh
      console.log("🔄 Table: Force refreshing data after payment completion");

      // Clear cache completely
      queryClient.clear();
      queryClient.removeQueries({ queryKey: ["/api/tables"] });
      queryClient.removeQueries({ queryKey: ["/api/orders"] });

      // Force fresh fetch immediately
      try {
        await Promise.all([refetchTables(), refetchOrders()]);
        console.log("✅ Table: Data refreshed successfully after payment");
      } catch (refreshError) {
        console.error("❌ Table: Error during data refresh:", refreshError);
      }

      // Send WebSocket signal for data refresh
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: "popup_close",
              success: true,
              source: "table_grid_receipt_confirm",
              timestamp: new Date().toISOString(),
            }),
          );

          setTimeout(() => ws.close(), 100);
        };
      } catch (error) {
        console.warn("⚠️ Table Grid: Could not send WebSocket signal:", error);
      }

      // Dispatch custom event as backup
      window.dispatchEvent(
        new CustomEvent("forceDataRefresh", {
          detail: {
            source: "table_grid_receipt_confirm",
            reason: "payment_completed",
            timestamp: new Date().toISOString(),
          },
        }),
      );

      toast({
        title: "Thành công",
        description:
          "Thanh toán đã được hoàn thành và dữ liệu đã được cập nhật",
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

          // Calculate subtotal
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
        tableNumber:
          getTableInfo(orderForPayment.tableId)?.tableNumber || "N/A",
      };

      console.log(
        "📄 Table: Showing receipt modal after E-invoice with proper data",
      );
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
                        className={`min-w-12 min-h-12 max-w-20 rounded-full ${statusConfig.color} flex items-center justify-center text-white font-bold p-2`}
                        style={{
                          fontSize:
                            table.tableNumber.length > 8
                              ? "0.6rem"
                              : table.tableNumber.length > 5
                                ? "0.75rem"
                                : "0.875rem",
                        }}
                      >
                        <span className="text-center leading-tight break-all">
                          {table.tableNumber}
                        </span>
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
                        <div className="font-medium text-gray-900">
                          {(() => {
                            const total = Math.floor(
                              Number(activeOrder.total || 0),
                            );

                            // Show original total without applying discount
                            console.log(
                              `💰 Table order ${activeOrder.orderNumber} - showing original total: ${total}`,
                            );
                            return total.toLocaleString("vi-VN");
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
      <Dialog
        open={orderDetailsOpen}
        onOpenChange={(open) => {
          setOrderDetailsOpen(open);
          // Clear customer display when closing order details
          if (!open) {
            setSelectedOrder(null);
            broadcastCartUpdate(null);
          }
        }}
      >
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
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 mb-3">
                  {t("orders.itemsOrdered")}:
                </h4>
                {orderItemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : orderItems &&
                  Array.isArray(orderItems) &&
                  orderItems.length > 0 ? (
                  <>
                    <div className="text-sm text-green-600 font-medium mb-2">
                      ✅ {t("orders.showing")} {orderItems.length}{" "}
                      {t("orders.items")} - {t("orders.quantity")}{" "}
                      {orderItems.reduce(
                        (sum, item) => sum + Number(item.quantity || 0),
                        0,
                      )}{" "}
                      - {t("orders.orderNumber")} {selectedOrder.orderNumber}
                    </div>
                    {orderItems.map((item: any) => {
                      const unitPrice = Number(item.unitPrice || 0);
                      const quantity = Number(item.quantity || 0);
                      const itemDiscount = Number(item.discount || 0); // Lấy giảm giá từ database
                      const itemTotal = Number(item.total || 0); // Lấy tổng tiền từ database

                      console.log(
                        `📊 Table Grid Order Details: Using database values for item ${item.id}:`,
                        {
                          productId: item.productId,
                          productName: item.productName,
                          unitPrice,
                          quantity,
                          itemDiscount,
                          itemTotal,
                        },
                      );

                      // Calculate price after discount for each item
                      const priceAfterDiscount =
                        itemDiscount > 0 ? itemTotal / quantity : unitPrice;

                      return (
                        <div
                          key={item.id}
                          className="bg-gray-50 p-3 rounded-lg"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {item.productName ||
                                  getProductName(item.productId)}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {t("orders.quantity")}: {item.quantity}
                              </div>
                              {itemDiscount > 0 && (
                                <div className="text-sm text-red-600 mt-1">
                                  {t("orders.discount")}: -
                                  {Math.floor(itemDiscount).toLocaleString(
                                    "vi-VN",
                                  )}{" "}
                                  ₫
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900">
                                {Math.floor(itemTotal).toLocaleString("vi-VN")}{" "}
                                ₫
                              </div>
                              <div className="text-sm text-gray-600">
                                {Math.floor(priceAfterDiscount).toLocaleString(
                                  "vi-VN",
                                )}{" "}
                                ₫/{t("orders.item")}
                              </div>
                            </div>
                          </div>
                          {item.notes && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              {t("orders.notes")}: {item.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t("orders.noItems")}
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Order Summary - Use data from database */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("tables.subtotal")}:</span>
                  <span className="font-medium">
                    {Math.floor(
                      Number(selectedOrder.subtotal || 0),
                    ).toLocaleString("vi-VN")}{" "}
                    ₫
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("orders.tax")}:</span>
                  <span className="font-medium">
                    {Math.floor(Number(selectedOrder.tax || 0)).toLocaleString(
                      "vi-VN",
                    )}{" "}
                    ₫
                  </span>
                </div>
                {selectedOrder.discount &&
                  parseFloat(selectedOrder.discount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {t("orders.discount")}:
                      </span>
                      <span className="font-medium text-red-600">
                        -
                        {Math.floor(
                          parseFloat(selectedOrder.discount),
                        ).toLocaleString("vi-VN")}{" "}
                        ₫
                      </span>
                    </div>
                  )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    {t("tables.total")}:
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {Math.floor(
                      Number(selectedOrder.total || 0),
                    ).toLocaleString("vi-VN")}{" "}
                    ₫
                  </span>
                </div>
              </div>

              {/* Payment Buttons */}
              {selectedOrder.status !== "paid" && (
                <div className="pt-4 space-y-3">
                  <Button
                    onClick={() => {
                      console.log(
                        "🎯 Table: Starting receipt preview flow like POS",
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
                          orderDetailsTax += Math.floor(taxPerUnit * quantity);
                        }

                        return {
                          id: item.id,
                          productId: item.productId,
                          productName:
                            item.productName || getProductName(item.productId),
                          price: parseFloat(item.price || item.unitPrice),
                          quantity: item.quantity,
                          sku:
                            item.productSku ||
                            `FOOD${String(item.productId).padStart(5, "0")}`,
                          taxRate: parseFloat(product?.taxRate || "0"),
                          afterTaxPrice: product?.afterTaxPrice || null,
                          discount: item.discount || "0",
                          discountAmount: item.discount,
                        };
                      });

                      // Apply discount from selected order
                      const discountAmount = selectedOrder
                        ? Number(selectedOrder.discount || 0)
                        : 0;
                      const finalTotal = Math.max(
                        0,
                        orderDetailsSubtotal + orderDetailsTax - discountAmount,
                      );

                      // Create preview receipt data using EXACT values from Order Details - like POS
                      const previewData = {
                        ...selectedOrder,
                        transactionId: `PREVIEW-${Date.now()}`,
                        createdAt: new Date().toISOString(),
                        cashierName: "Table Service",
                        paymentMethod: "preview", // Placeholder method
                        items: processedItems,
                        subtotal: selectedOrder.subtotal,
                        tax: selectedOrder.tax,
                        total: selectedOrder.total,
                        discount: selectedOrder.discount,
                        exactTotal: selectedOrder.total,
                        exactSubtotal: selectedOrder.subtotal,
                        exactTax: selectedOrder.tax,
                        exactDiscount: selectedOrder.discount,
                        orderItems: orderItems, // Keep original order items for payment flow
                      };

                      console.log(
                        "📄 Table: Showing receipt preview like POS with exact Order Details values",
                      );
                      console.log("💰 Exact values passed:", {
                        subtotal: orderDetailsSubtotal,
                        tax: orderDetailsTax,
                        discount: discountAmount,
                        total: finalTotal,
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

                      try {
                        // Use exact same calculation logic as Order Details
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

                        // Get discount amount from selected order
                        const discountAmount = selectedOrder
                          ? Number(selectedOrder.discount || 0)
                          : 0;
                        const finalTotal = Math.max(
                          0,
                          grandTotal - discountAmount,
                        );

                        // Create receipt data using EXACT same values as Order Details
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
                            return product?.taxRate
                              ? parseFloat(product.taxRate)
                              : 10;
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
                          subtotal: subtotal.toString(),
                          tax: totalTax.toString(),
                          discount: discountAmount.toString(),
                          exactDiscount: discountAmount,
                          total: finalTotal.toString(),
                          exactTotal: finalTotal,
                          exactSubtotal: subtotal,
                          exactTax: totalTax,
                          paymentMethod: "unpaid",
                          amountReceived: "0",
                          change: "0",
                          cashierName: "Table Service",
                          createdAt:
                            selectedOrder.orderedAt || new Date().toISOString(),
                          customerName: selectedOrder.customerName,
                          customerTaxCode: null,
                          invoiceNumber: null,
                          tableNumber:
                            getTableInfo(selectedOrder.tableId)?.tableNumber ||
                            "N/A",
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

      {/* Receipt Preview Modal - Step 1: "Xem trước hóa đơn" - Exactly like POS */}
      <ReceiptModal
        isOpen={showReceiptPreview}
        onClose={() => {
          console.log("🔴 Table: Closing receipt preview modal");
          setShowReceiptPreview(false);
          setPreviewReceipt(null);
        }}
        onConfirm={() => {
          console.log(
            "📄 Table: Receipt preview confirmed, starting payment flow like POS",
          );

          if (!previewReceipt) {
            console.error("❌ No preview receipt data available");
            return;
          }

          // Prepare complete order data for payment flow - exactly like POS
          const completeOrderData = {
            ...selectedOrder,
            orderItems: previewReceipt.orderItems || orderItems || [],
            exactSubtotal: previewReceipt.exactSubtotal,
            exactTax: previewReceipt.exactTax,
            exactTotal: previewReceipt.exactTotal,
            exactDiscount: previewReceipt.exactDiscount,
            discount: previewReceipt.discount || selectedOrder?.discount || 0,
          };

          console.log(
            "💾 Table: Setting order for payment with complete data like POS:",
            completeOrderData,
          );
          setOrderForPayment(completeOrderData);

          // Close preview and show payment method modal - exactly like POS
          setShowReceiptPreview(false);
          setShowPaymentMethodModal(true);
        }}
        isPreview={true}
        receipt={previewReceipt}
        cartItems={
          previewReceipt?.items?.map((item: any) => ({
            id: item.productId || item.id,
            name: item.productName || item.name,
            price: parseFloat(item.price || item.unitPrice || "0"),
            quantity: item.quantity,
            sku: item.sku || `SP${item.productId}`,
            taxRate: parseFloat(item.taxRate || "0"),
            afterTaxPrice: item.afterTaxPrice,
            discount: item.discount || "0",
            total: item.total,
          })) || []
        }
        total={
          previewReceipt
            ? previewReceipt.exactTotal || parseFloat(previewReceipt.total)
            : 0
        }
      />

      {/* Payment Method Modal - Step 2: Chọn phương thức thanh toán */}
      {showPaymentMethodModal && orderForPayment && (
        <PaymentMethodModal
          isOpen={showPaymentMethodModal}
          onClose={() => {
            setShowPaymentMethodModal(false);
            setOrderForPayment(null);
          }}
          onSelectMethod={handlePaymentMethodSelect}
          total={(() => {
            // Use exact total with proper priority and discount consideration
            const baseTotal =
              orderForPayment?.exactTotal !== undefined &&
              orderForPayment.exactTotal !== null
                ? Number(orderForPayment.exactTotal)
                : Number(orderForPayment?.total || 0);

            const discountAmount = Number(
              orderForPayment?.exactDiscount || orderForPayment?.discount || 0,
            );
            const finalTotal = Math.max(0, baseTotal - discountAmount);

            console.log("💰 Payment Modal Total Calculation:", {
              baseTotal,
              discountAmount,
              finalTotal,
              source: "table_grid_payment",
            });

            return Math.floor(finalTotal);
          })()}
          cartItems={(() => {
            // Map order items to cart format for payment modal with full product details
            const itemsToMap =
              orderForPayment?.items || orderForPayment?.orderItems || [];
            console.log("🛒 Mapping items for payment modal:", {
              itemCount: itemsToMap.length,
              hasProducts: Array.isArray(products),
              productCount: products?.length || 0,
            });

            return itemsToMap.map((item: any) => {
              const product = Array.isArray(products)
                ? products.find((p: any) => p.id === item.productId)
                : null;

              const mappedItem = {
                id: item.productId || item.id,
                productId: item.productId,
                name:
                  item.productName ||
                  item.name ||
                  getProductName(item.productId),
                productName:
                  item.productName ||
                  item.name ||
                  getProductName(item.productId),
                price:
                  typeof item.price === "string"
                    ? parseFloat(item.price)
                    : item.price || parseFloat(item.unitPrice || "0"),
                quantity:
                  typeof item.quantity === "string"
                    ? parseInt(item.quantity)
                    : item.quantity || 1,
                unitPrice: item.unitPrice,
                total: item.total,
                sku: item.sku || `SP${item.productId}`,
                taxRate: parseFloat(item.taxRate || product?.taxRate || "0"),
                afterTaxPrice: item.afterTaxPrice || product?.afterTaxPrice,
                discount: item.discount || "0",
                notes: item.notes,
                product: product
                  ? {
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      afterTaxPrice: product.afterTaxPrice,
                      taxRate: product.taxRate,
                    }
                  : null,
              };

              console.log(`📦 Mapped item ${item.productId}:`, {
                name: mappedItem.name,
                price: mappedItem.price,
                quantity: mappedItem.quantity,
                taxRate: mappedItem.taxRate,
                hasProduct: !!product,
              });

              return mappedItem;
            });
          })()}
          orderForPayment={orderForPayment}
          products={products}
          getProductName={getProductName}
          receipt={{
            ...orderForPayment,
            exactTotal: orderForPayment?.exactTotal,
            exactSubtotal: orderForPayment?.exactSubtotal,
            exactTax: orderForPayment?.exactTax,
            exactDiscount: orderForPayment?.exactDiscount,
            discount:
              orderForPayment?.discount ||
              orderForPayment?.exactDiscount?.toString() ||
              "0",
            orderItems:
              orderForPayment?.items || orderForPayment?.orderItems || [],
          }}
          onShowEInvoice={() => {
            setShowPaymentMethodModal(false);
            setShowEInvoiceModal(true);
          }}
        />
      )}

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

            const finalTotal =
              calculatedTotal || exactTotal || storedTotal || 0;

            console.log("🔍 Table Grid E-Invoice Modal: Total calculation:", {
              calculatedTotal,
              exactTotal,
              storedTotal,
              finalTotal,
              orderForEInvoiceId: orderForEInvoice?.id,
            });

            return Math.floor(finalTotal);
          })()}
          cartItems={
            orderForEInvoice?.orderItems?.map((item: any) => ({
              id: item.productId,
              name: item.productName,
              price: parseFloat(item.unitPrice || "0"),
              quantity: item.quantity,
              sku: item.productSku || `SP${item.productId}`,
              taxRate: (() => {
                const product = Array.isArray(products)
                  ? products.find((p: any) => p.id === item.productId)
                  : null;
                return product?.taxRate ? parseFloat(product.taxRate) : 10;
              })(),
              afterTaxPrice: (() => {
                const product = Array.isArray(products)
                  ? products.find((p: any) => p.id === item.productId)
                  : null;
                return product?.afterTaxPrice || null;
              })(),
            })) || []
          }
          source="table"
          orderId={orderForEInvoice?.id}
        />
      )}

      {/* Receipt Modal - Final receipt after payment - ENHANCED with aggressive refresh */}
      {showReceiptModal && selectedReceipt && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={async () => {
            console.log(
              "🔴 Table: Receipt modal closing - AGGRESSIVE data refresh starting",
            );

            // IMMEDIATE: Clear all modal states first
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

            // AGGRESSIVE DATA REFRESH - Multiple strategies
            console.log(
              "🔄 Table: Starting MULTI-STRATEGY data refresh after receipt modal close",
            );

            try {
              // Strategy 1: Complete cache clearing
              queryClient.clear();
              queryClient.removeQueries();

              // Strategy 2: Force immediate fresh data fetch with timestamp to bypass any cache
              const timestamp = Date.now().toString();
              const [freshTables, freshOrders] = await Promise.all([
                fetch(`/api/tables?_t=${timestamp}&_force=refresh`, {
                  cache: "no-store",
                  headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                  },
                }).then((r) => r.json()),
                fetch(`/api/orders?_t=${timestamp}&_force=refresh`, {
                  cache: "no-store",
                  headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                  },
                }).then((r) => r.json()),
              ]);

              // Strategy 3: Set fresh data immediately in cache
              queryClient.setQueryData(["/api/tables"], freshTables);
              queryClient.setQueryData(["/api/orders"], freshOrders);

              console.log(
                "✅ Table: Fresh data loaded and cached after receipt modal close",
              );

              // Strategy 4: Multiple timed invalidations to force re-renders
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
                queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
              }, 50);

              setTimeout(() => {
                queryClient.refetchQueries({ queryKey: ["/api/tables"] });
                queryClient.refetchQueries({ queryKey: ["/api/orders"] });
              }, 150);

              setTimeout(() => {
                // Force one more invalidation to ensure UI updates
                queryClient.invalidateQueries();
              }, 300);
            } catch (fetchError) {
              console.error(
                "❌ Table: Error during aggressive fetch, falling back:",
                fetchError,
              );

              // Strategy 5: Fallback with forced refetch
              try {
                await Promise.all([refetchTables(), refetchOrders()]);
                console.log("✅ Table: Fallback refresh completed");
              } catch (fallbackError) {
                console.error(
                  "❌ Table: Fallback refresh also failed:",
                  fallbackError,
                );
              }
            }

            // Strategy 6: Send WebSocket signal for cross-page coordination
            try {
              const protocol =
                window.location.protocol === "https:" ? "wss:" : "ws:";
              const wsUrl = `${protocol}//${window.location.host}/ws`;
              const ws = new WebSocket(wsUrl);

              ws.onopen = () => {
                const refreshSignal = {
                  type: "force_refresh",
                  success: true,
                  source: "table-grid-receipt-close",
                  reason: "receipt_modal_closed_with_payment",
                  force_refresh: true,
                  timestamp: new Date().toISOString(),
                };

                console.log(
                  "📡 Table: Sending AGGRESSIVE WebSocket refresh signal:",
                  refreshSignal,
                );
                ws.send(JSON.stringify(refreshSignal));

                setTimeout(() => ws.close(), 100);
              };
            } catch (wsError) {
              console.warn(
                "⚠️ Table: WebSocket signal failed (non-critical):",
                wsError,
              );
            }

            // Strategy 7: Dispatch multiple refresh events
            const refreshEvents = [
              new CustomEvent("forceDataRefresh", {
                detail: {
                  reason: "receipt_modal_closed_aggressive",
                  source: "table-grid",
                  forceRefresh: true,
                  aggressive: true,
                  timestamp: new Date().toISOString(),
                },
              }),
              new CustomEvent("paymentCompleted", {
                detail: {
                  action: "modal_closed_force_refresh",
                  source: "table-grid",
                  forceRefresh: true,
                  timestamp: new Date().toISOString(),
                },
              }),
              new CustomEvent("refreshTableData", {
                detail: {
                  reason: "receipt_modal_closed",
                  source: "table-grid",
                  forceRefresh: true,
                  timestamp: new Date().toISOString(),
                },
              }),
            ];

            refreshEvents.forEach((event) => {
              console.log(`📡 Table: Dispatching ${event.type} event`);
              window.dispatchEvent(event);
            });

            toast({
              title: "Thành công",
              description: "Thanh toán hoàn tất và dữ liệu đã được cập nhật",
            });

            console.log(
              "✅ Table: AGGRESSIVE receipt modal close and data refresh completed",
            );
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
        <DialogContent className="max-w-2md">
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
                  <span>Tổng gốc:</span>
                  <span className="font-medium">
                    {(() => {
                      // Calculate correct total from order items for payment calculation
                      if (
                        Array.isArray(orderItems) &&
                        orderItems.length > 0 &&
                        Array.isArray(products)
                      ) {
                        let subtotal = 0;
                        let totalTax = 0;

                        orderItems.forEach((item: any) => {
                          const basePrice = Number(item.unitPrice || 0);
                          const quantity = Number(item.quantity || 0);
                          const product = products.find(
                            (p: any) => p.id === item.productId,
                          );

                          // Calculate subtotal (base price without tax)
                          subtotal += basePrice * quantity;

                          // Calculate tax using same logic as order details
                          if (
                            product?.afterTaxPrice &&
                            product.afterTaxPrice !== null &&
                            product.afterTaxPrice !== ""
                          ) {
                            const afterTaxPrice = parseFloat(
                              product.afterTaxPrice,
                            );
                            const taxPerUnit = Math.max(
                              0,
                              afterTaxPrice - basePrice,
                            );
                            totalTax += Math.floor(taxPerUnit * quantity);
                          }
                        });

                        const grandTotal = subtotal + totalTax;
                        return Math.floor(grandTotal).toLocaleString();
                      }

                      // Fallback to stored total if calculation not possible
                      return Math.floor(
                        Number(selectedOrder.total),
                      ).toLocaleString();
                    })()}{" "}
                    ₫
                  </span>
                </div>
                {selectedOrder.discount &&
                  Number(selectedOrder.discount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Giảm giá:</span>
                      <span className="font-medium text-red-600">
                        -
                        {Math.floor(
                          Number(selectedOrder.discount),
                        ).toLocaleString()}{" "}
                        ₫
                      </span>
                    </div>
                  )}
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                  <span>{t("orders.pointsPaymentDialog.totalAmount")}</span>
                  <span className="font-bold text-green-600">
                    {(() => {
                      // Calculate correct total from order items for payment calculation
                      let calculatedTotal = 0;
                      if (
                        Array.isArray(orderItems) &&
                        orderItems.length > 0 &&
                        Array.isArray(products)
                      ) {
                        let subtotal = 0;
                        let totalTax = 0;

                        orderItems.forEach((item: any) => {
                          const basePrice = Number(item.unitPrice || 0);
                          const quantity = Number(item.quantity || 0);
                          const product = products.find(
                            (p: any) => p.id === item.productId,
                          );

                          // Calculate subtotal (base price without tax)
                          subtotal += basePrice * quantity;

                          // Calculate tax using same logic as order details
                          if (
                            product?.afterTaxPrice &&
                            product.afterTaxPrice !== null &&
                            product.afterTaxPrice !== ""
                          ) {
                            const afterTaxPrice = parseFloat(
                              product.afterTaxPrice,
                            );
                            const taxPerUnit = Math.max(
                              0,
                              afterTaxPrice - basePrice,
                            );
                            totalTax += Math.floor(taxPerUnit * quantity);
                          }
                        });

                        calculatedTotal = subtotal + totalTax;
                      } else {
                        calculatedTotal = Number(selectedOrder.total);
                      }

                      // Apply discount
                      const discount = Number(selectedOrder.discount || 0);
                      const finalTotal = Math.max(
                        0,
                        calculatedTotal - discount,
                      );

                      return Math.floor(finalTotal).toLocaleString();
                    })()}{" "}
                    ₫
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
                      {(() => {
                        // Calculate correct total from order items for payment calculation
                        let calculatedTotal = 0;
                        if (
                          Array.isArray(orderItems) &&
                          orderItems.length > 0 &&
                          Array.isArray(products)
                        ) {
                          let subtotal = 0;
                          let totalTax = 0;

                          orderItems.forEach((item: any) => {
                            const basePrice = Number(item.unitPrice || 0);
                            const quantity = Number(item.quantity || 0);
                            const product = products.find(
                              (p: any) => p.id === item.productId,
                            );

                            // Calculate subtotal (base price without tax)
                            subtotal += basePrice * quantity;

                            // Calculate tax using same logic as order details
                            if (
                              product?.afterTaxPrice &&
                              product.afterTaxPrice !== null &&
                              product.afterTaxPrice !== ""
                            ) {
                              const afterTaxPrice = parseFloat(
                                product.afterTaxPrice,
                              );
                              const taxPerUnit = Math.max(
                                0,
                                afterTaxPrice - basePrice,
                              );
                              totalTax += Math.floor(taxPerUnit * quantity);
                            }
                          });

                          calculatedTotal = subtotal + totalTax;
                        } else {
                          calculatedTotal = Number(selectedOrder.total);
                        }

                        // Apply discount
                        const discount = Number(selectedOrder.discount || 0);
                        const finalTotal = Math.max(
                          0,
                          calculatedTotal - discount,
                        );

                        return Math.floor(finalTotal).toLocaleString();
                      })()}{" "}
                      ₫
                    </span>
                  </div>
                  {(() => {
                    // Calculate total for comparison with discount applied
                    let calculatedTotal = 0;
                    if (
                      Array.isArray(orderItems) &&
                      orderItems.length > 0 &&
                      Array.isArray(products)
                    ) {
                      let subtotal = 0;
                      let totalTax = 0;

                      orderItems.forEach((item: any) => {
                        const basePrice = Number(item.unitPrice || 0);
                        const quantity = Number(item.quantity || 0);
                        const product = products.find(
                          (p: any) => p.id === item.productId,
                        );

                        subtotal += basePrice * quantity;

                        if (
                          product?.afterTaxPrice &&
                          product.afterTaxPrice !== null &&
                          product.afterTaxPrice !== ""
                        ) {
                          const afterTaxPrice = parseFloat(
                            product.afterTaxPrice,
                          );
                          const taxPerUnit = Math.max(
                            0,
                            afterTaxPrice - basePrice,
                          );
                          totalTax += Math.floor(taxPerUnit * quantity);
                        }
                      });

                      calculatedTotal = subtotal + totalTax;
                    } else {
                      calculatedTotal = Number(selectedOrder.total);
                    }

                    // Apply discount
                    const discount = Number(selectedOrder.discount || 0);
                    const finalTotal = Math.max(0, calculatedTotal - discount);
                    const customerPointsValue =
                      (selectedCustomer.points || 0) * 1000;

                    return customerPointsValue >= finalTotal ? (
                      <div className="text-green-600 text-sm">
                        ✓ Đủ điểm để thanh toán toàn bộ
                      </div>
                    ) : (
                      <div className="text-orange-600 text-sm">
                        ⚠ Cần thanh toán thêm:{" "}
                        {(finalTotal - customerPointsValue).toLocaleString()} ₫
                      </div>
                    );
                  })()}
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
                      {(
                        mixedPaymentData.pointsToUse * 1000
                      ).toLocaleString()}{" "}
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
                        {(
                          mixedPaymentData.pointsToUse * 1000
                        ).toLocaleString()}{" "}
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
