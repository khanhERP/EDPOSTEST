import { useState } from "react";
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['/api/tables'],
  });

  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: orderItems, isLoading: orderItemsLoading } = useQuery({
    queryKey: ['/api/order-items', selectedOrder?.id],
    enabled: !!selectedOrder?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/order-items/${selectedOrder?.id}`);
      return response;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: storeSettings } = useQuery({
    queryKey: ['/api/store-settings'],
  });

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
    return orders.find((order: Order) => 
      order.tableId === tableId && !["paid", "cancelled"].includes(order.status)
    );
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
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
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
    // Default payment methods if not found in settings
    const defaultMethods = [
      { id: 1, name: "Tiền mặt", nameKey: "cash", enabled: true, icon: "💵" },
      { id: 2, name: "Thẻ tín dụng", nameKey: "creditCard", enabled: true, icon: "💳" },
      { id: 3, name: "MoMo", nameKey: "momo", enabled: true, icon: "📱" },
      { id: 4, name: "ZaloPay", nameKey: "zalopay", enabled: true, icon: "📱" },
      { id: 5, name: "VNPay", nameKey: "vnpay", enabled: true, icon: "💳" },
    ];

    // In a real implementation, this would come from store settings
    return defaultMethods.filter(method => method.enabled);
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
                          {activeOrder.customerCount || 1}/{table.capacity}{t('tables.people')}
                        </span>
                      ) : (
                        <span>{table.capacity}{t('tables.people')}</span>
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
                        {new Date(activeOrder.orderedAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(table.id, "available");
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {t('tables.cleanupComplete')}
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
                    {new Date(selectedOrder.orderedAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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
                  ) : orderItems && Array.isArray(orderItems) && orderItems.length > 0 ? (
                    orderItems.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                        <div>
                          <p className="font-medium">{item.productName || getProductName(item.productId)}</p>
                          <p className="text-sm text-gray-600">Số lượng: {item.quantity}</p>
                          {item.notes && (
                            <p className="text-xs text-gray-500 italic">Ghi chú: {item.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₩{Number(item.total).toLocaleString()}</p>
                          <p className="text-sm text-gray-600">₩{Number(item.unitPrice).toLocaleString()}/món</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">Không có món ăn nào trong đơn hàng</p>
                      {selectedOrder && (
                        <div className="text-xs text-gray-400 mt-2">
                          <p>Order ID: {selectedOrder.id}</p>
                          <p>Order Number: {selectedOrder.orderNumber}</p>
                        </div>
                      )}
                    </div>
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