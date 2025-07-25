import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { OrderDialog } from "@/components/orders/order-dialog";
import { Users, Clock, CheckCircle2, Eye, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
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
  const { toast } = useToast();
  const { t, currentLanguage } = useTranslation();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['/api/tables'],
  });

  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: orderItems, isLoading: orderItemsLoading, refetch: refetchOrderItems } = useQuery({
    queryKey: ['/api/order-items', selectedOrder?.id],
    enabled: !!selectedOrder?.id && orderDetailsOpen,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      const orderId = selectedOrder?.id;
      if (!orderId) {
        console.log('No order ID available for fetching items');
        return [];
      }
      
      console.log('=== FETCHING ORDER ITEMS ===');
      console.log('Fetching order items for order ID:', orderId);
      console.log('API URL will be:', `/api/order-items/${orderId}`);
      console.log('Query enabled conditions:', {
        hasOrderId: !!selectedOrder?.id,
        dialogOpen: orderDetailsOpen,
        bothTrue: !!selectedOrder?.id && orderDetailsOpen
      });
      
      const response = await apiRequest('GET', `/api/order-items/${orderId}`);
      const data = await response.json();
      
      console.log('Raw order items response for order', orderId, ':', data);
      console.log('Response type:', typeof data, 'Length:', data?.length);
      console.log('Is array?', Array.isArray(data));
      
      // Log each item in detail
      if (Array.isArray(data) && data.length > 0) {
        console.log('Order items details:');
        data.forEach((item, index) => {
          console.log(`  Item ${index + 1}:`, {
            id: item.id,
            orderId: item.orderId,
            productId: item.productId, 
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          });
        });
      } else {
        console.log('No items found or response is not an array');
      }

      // Ensure we return an array
      const items = Array.isArray(data) ? data : [];
      console.log('Final processed items count:', items.length);
      console.log('About to return items:', items);
      console.log('=== END FETCHING ORDER ITEMS ===');

      return items;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: storeSettings } = useQuery({
    queryKey: ['/api/store-settings'],
  });

  // Force refetch order items when dialog opens
  useEffect(() => {
    if (orderDetailsOpen && selectedOrder?.id) {
      console.log('Dialog opened, refetching order items for order:', selectedOrder.id);
      refetchOrderItems();
    }
  }, [orderDetailsOpen, selectedOrder?.id, refetchOrderItems]);

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ tableId, status }: { tableId: number; status: string }) =>
      apiRequest('PUT', `/api/tables/${tableId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: t('tables.title'),
        description: t('common.success'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('common.error'),
        variant: "destructive",
      });
    },
  });

  const completePaymentMutation = useMutation({
    mutationFn: ({ orderId, paymentMethod }: { orderId: number; paymentMethod: string }) =>
      apiRequest('PUT', `/api/orders/${orderId}/status`, { status: 'paid', paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setOrderDetailsOpen(false);
      setPaymentMethodsOpen(false);
      toast({
        title: 'Thanh toán thành công',
        description: 'Đơn hàng đã được thanh toán',
      });
    },
    onError: () => {
      toast({
        title: 'Lỗi',
        description: 'Không thể hoàn tất thanh toán',
        variant: "destructive",
      });
    },
  });

  const getTableStatus = (status: string) => {
    const statusConfig = {
      available: { label: t('tables.available'), variant: "default" as const, color: "bg-green-500" },
      occupied: { label: t('tables.occupied'), variant: "destructive" as const, color: "bg-red-500" },
      reserved: { label: t('tables.reserved'), variant: "secondary" as const, color: "bg-yellow-500" },
      maintenance: { label: t('tables.outOfService'), variant: "outline" as const, color: "bg-gray-500" },
    };

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  };

  const getActiveOrder = (tableId: number) => {
    if (!orders || !Array.isArray(orders)) return null;
    
    // Get all active orders for this table and sort by orderedAt descending to get the latest
    const activeOrders = orders.filter((order: Order) => 
      order.tableId === tableId && !["paid", "cancelled"].includes(order.status)
    );
    
    console.log(`Active orders for table ${tableId}:`, activeOrders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderedAt: o.orderedAt,
      status: o.status
    })));
    
    if (activeOrders.length === 0) return null;
    
    // Sort by orderedAt descending and return the most recent order
    const latestOrder = activeOrders.sort((a: Order, b: Order) => 
      new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
    )[0];
    
    console.log(`Latest order for table ${tableId}:`, {
      id: latestOrder.id,
      orderNumber: latestOrder.orderNumber,
      orderedAt: latestOrder.orderedAt
    });
    
    return latestOrder;
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
    console.log('=== VIEWING ORDER DETAILS ===');
    console.log('Selected order for details:', order);
    console.log('Order ID:', order.id, 'Table ID:', order.tableId, 'Ordered at:', order.orderedAt);
    console.log('Order status:', order.status, 'Order number:', order.orderNumber);
    console.log('=== END ORDER DETAILS ===');
    
    // Set the selected order first
    setSelectedOrder(order);
    
    // Then open the dialog - this ensures selectedOrder is set when the query runs
    setTimeout(() => {
      setOrderDetailsOpen(true);
    }, 0);
  };

  const handlePayment = (paymentMethod: string) => {
    if (selectedOrder) {
      completePaymentMutation.mutate({ orderId: selectedOrder.id, paymentMethod });
    }
  };

  const getProductName = (productId: number) => {
    if (!products || !Array.isArray(products)) return 'Unknown Product';
    const product = products.find((p: any) => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const getPaymentMethods = () => {
    // Payment methods from settings - matches the structure in settings.tsx
    const settingsPaymentMethods = [
      { id: 1, name: "Tiền mặt", nameKey: "cash", type: "cash", enabled: true, icon: "💵" },
      { id: 2, name: "Thẻ tín dụng", nameKey: "creditCard", type: "card", enabled: true, icon: "💳" },
      { id: 3, name: "Thẻ ghi nợ", nameKey: "debitCard", type: "debit", enabled: true, icon: "💳" },
      { id: 4, name: "MoMo", nameKey: "momo", type: "digital", enabled: true, icon: "📱" },
      { id: 5, name: "ZaloPay", nameKey: "zalopay", type: "digital", enabled: true, icon: "📱" },
      { id: 6, name: "VNPay", nameKey: "vnpay", type: "digital", enabled: true, icon: "💳" },
      { id: 7, name: "QR Code", nameKey: "qrCode", type: "qr", enabled: true, icon: "📱" },
      { id: 8, name: "ShopeePay", nameKey: "shopeepay", type: "digital", enabled: false, icon: "🛒" },
      { id: 9, name: "GrabPay", nameKey: "grabpay", type: "digital", enabled: false, icon: "🚗" },
    ];

    // Filter to only return enabled payment methods
    return settingsPaymentMethods.filter(method => method.enabled);
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
        {Array.isArray(tables) && tables.map((table: Table) => {
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
                    <div className={`w-12 h-12 rounded-full ${statusConfig.color} flex items-center justify-center text-white font-bold text-lg`}>
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
                          {activeOrder.customerCount || 1}/{table.capacity}{t('orders.people')}
                        </span>
                      ) : (
                        <span>{table.capacity} {t('tables.people')}</span>
                      )}
                    </div>
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Order Info */}
                  {activeOrder && (
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center justify-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(activeOrder.orderedAt).toLocaleTimeString(
                          currentLanguage === 'ko' ? 'ko-KR' :
                          currentLanguage === 'en' ? 'en-US' :
                          'vi-VN',
                          {
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )}
                      </div>
                      <div className="font-medium">
                        ₩{Number(activeOrder.total).toLocaleString()}
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
                        Xem chi tiết
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
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Mã đơn: ${selectedOrder.orderNumber}`}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Bàn số:</p>
                  <p className="font-medium">T{selectedOrder.tableId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Số khách:</p>
                  <p className="font-medium">{selectedOrder.customerCount} người</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Thời gian:</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.orderedAt).toLocaleTimeString(
                      currentLanguage === 'ko' ? 'ko-KR' :
                      currentLanguage === 'en' ? 'en-US' :
                      'vi-VN',
                      {
                        hour: '2-digit',
                        minute: '2-digit'
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Trạng thái:</p>
                  <Badge variant={selectedOrder.status === 'paid' ? 'default' : 'secondary'}>
                    {selectedOrder.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </Badge>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">Món đã gọi:</h4>
                <div className="space-y-2">
                  {orderItemsLoading ? (
                    <p className="text-gray-500 text-center py-4">Đang tải dữ liệu...</p>
                  ) : (
                    <>
                      {(() => {
                        console.log('=== RENDER CHECK ULTRA DETAILED ===');
                        console.log('Raw orderItems data:', orderItems);
                        console.log('orderItems type:', typeof orderItems);
                        console.log('orderItems is array:', Array.isArray(orderItems));
                        console.log('orderItems length:', orderItems?.length);
                        console.log('orderItemsLoading:', orderItemsLoading);
                        console.log('selectedOrder?.id:', selectedOrder?.id);
                        console.log('orderDetailsOpen:', orderDetailsOpen);
                        
                        // Try JSON stringify to see raw structure
                        try {
                          console.log('orderItems JSON:', JSON.stringify(orderItems, null, 2));
                        } catch (e) {
                          console.log('Cannot stringify orderItems:', e);
                        }

                        // Try different ways to access the data
                        if (orderItems) {
                          console.log('Object.keys(orderItems):', Object.keys(orderItems));
                          console.log('orderItems.data:', (orderItems as any).data);
                          console.log('orderItems.items:', (orderItems as any).items);
                          console.log('orderItems[0]:', orderItems[0]);
                        }
                        
                        // Force array conversion and check different possible structures
                        let itemsToRender = [];
                        
                        if (Array.isArray(orderItems)) {
                          itemsToRender = orderItems;
                          console.log('✅ orderItems is already an array with length:', itemsToRender.length);
                        } else if (orderItems && (orderItems as any).data && Array.isArray((orderItems as any).data)) {
                          itemsToRender = (orderItems as any).data;
                          console.log('✅ Found items in orderItems.data with length:', itemsToRender.length);
                        } else if (orderItems && (orderItems as any).items && Array.isArray((orderItems as any).items)) {
                          itemsToRender = (orderItems as any).items;
                          console.log('✅ Found items in orderItems.items with length:', itemsToRender.length);
                        } else if (orderItems && typeof orderItems === 'object') {
                          // Try to convert object to array if it has numeric keys
                          try {
                            itemsToRender = Object.values(orderItems).filter(item => item && typeof item === 'object');
                            console.log('✅ Converted object to array with length:', itemsToRender.length);
                          } catch (e) {
                            console.log('❌ Failed to convert object to array:', e);
                          }
                        }
                        
                        console.log('Final itemsToRender:', itemsToRender);
                        console.log('itemsToRender length:', itemsToRender.length);
                        console.log('=== END RENDER CHECK ULTRA DETAILED ===');
                        
                        if (itemsToRender && itemsToRender.length > 0) {
                          console.log('🎉 SUCCESS! Rendering', itemsToRender.length, 'items');
                          return (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-green-600 mb-3">
                                ✅ Hiển thị {itemsToRender.length} món ăn cho đơn hàng {selectedOrder?.orderNumber}
                              </p>
                              {itemsToRender.map((item: any, index: number) => {
                                console.log(`🍽️ Rendering item ${index + 1}:`, {
                                  id: item.id,
                                  productId: item.productId,
                                  productName: item.productName,
                                  quantity: item.quantity,
                                  unitPrice: item.unitPrice,
                                  total: item.total
                                });
                                
                                return (
                                  <div key={`item-${item.id || index}`} className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">
                                        {item.productName || getProductName(item.productId) || `Sản phẩm #${item.productId}`}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Số lượng: <span className="font-medium">{item.quantity}</span>
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        ID: {item.id} | ProductID: {item.productId}
                                      </p>
                                      {item.notes && (
                                        <p className="text-xs text-blue-600 italic mt-1">
                                          Ghi chú: {item.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="font-bold text-lg text-green-600">
                                        ₩{Number(item.total || 0).toLocaleString()}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        ₩{Number(item.unitPrice || 0).toLocaleString()}/món
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        } else {
                          console.log('💔 NO ITEMS TO RENDER - Complete debug info:');
                          const completeDebug = {
                            orderItemsExists: !!orderItems,
                            orderItemsType: typeof orderItems,
                            isArray: Array.isArray(orderItems),
                            rawLength: orderItems?.length,
                            processedLength: itemsToRender?.length,
                            loading: orderItemsLoading,
                            orderId: selectedOrder?.id,
                            dialogOpen: orderDetailsOpen,
                            rawData: orderItems,
                            queryEnabled: !!selectedOrder?.id && orderDetailsOpen
                          };
                          console.log('Complete debug:', completeDebug);
                          
                          return (
                            <div className="text-center py-6 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-red-600 font-medium mb-3">
                                ❌ Không có món ăn nào cho đơn hàng {selectedOrder?.orderNumber}
                              </p>
                              <div className="text-xs text-gray-500 space-y-1 bg-white p-3 rounded border max-h-40 overflow-y-auto">
                                <p><strong>Complete Debug Info:</strong></p>
                                <p>Loading: {orderItemsLoading ? 'Có' : 'Không'}</p>
                                <p>Data exists: {orderItems ? 'Có' : 'Không'}</p>
                                <p>Is array: {Array.isArray(orderItems) ? 'Có' : 'Không'}</p>
                                <p>Raw length: {orderItems?.length || 0}</p>
                                <p>Processed length: {itemsToRender?.length || 0}</p>
                                <p>Type: {typeof orderItems}</p>
                                <p>Order ID: {selectedOrder?.id}</p>
                                <p>Dialog open: {orderDetailsOpen ? 'Có' : 'Không'}</p>
                                <p>Query enabled: {(!!selectedOrder?.id && orderDetailsOpen) ? 'Có' : 'Không'}</p>
                                <p>Raw data: {JSON.stringify(orderItems)?.substring(0, 100)}...</p>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Tổng cần thanh toán:</span>
                  <span className="text-green-600">₩{Number(selectedOrder.total).toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Button */}
              {selectedOrder.status !== 'paid' && (
                <div className="pt-4">
                  <Button
                    onClick={() => setPaymentMethodsOpen(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Thanh toán
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Methods Dialog */}
      <Dialog open={paymentMethodsOpen} onOpenChange={setPaymentMethodsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chọn phương thức thanh toán</DialogTitle>
            <DialogDescription>
              Chọn phương thức thanh toán cho đơn hàng
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3">
            {getPaymentMethods().map((method) => (
              <Button
                key={method.id}
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handlePayment(method.nameKey)}
                disabled={completePaymentMutation.isPending}
              >
                <span className="text-2xl mr-3">{method.icon}</span>
                <div className="text-left">
                  <p className="font-medium">{method.name}</p>
                </div>
              </Button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPaymentMethodsOpen(false)}>
              Hủy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}