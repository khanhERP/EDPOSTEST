import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, Clock, CheckCircle2, DollarSign, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import type { Order, Table, Product, OrderItem } from "@shared/schema";

export function OrderManagement() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/tables'],
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: newStatus });
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeOrders = orders ? (orders as Order[]).filter((order: Order) => 
    !["paid", "cancelled"].includes(order.status)
  ) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('tables.orderManagement')}</h2>
          <p className="text-gray-600">실시간 주문 현황을 확인하고 관리하세요</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {activeOrders.length}개 진행중
        </Badge>
      </div>

      {/* Orders Grid */}
      {activeOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-xl text-gray-500">진행중인 주문이 없습니다</p>
            <p className="text-gray-400 mt-2">새로운 주문이 들어오면 여기에 표시됩니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeOrders.map((order: Order) => {
            const tableInfo = getTableInfo(order.tableId);
            const statusConfig = getOrderStatusBadge(order.status);
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {order.orderNumber}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {tableInfo ? `${tableInfo.tableNumber} (${tableInfo.capacity}명)` : '테이블 정보 없음'}
                      </p>
                    </div>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">고객:</span>
                    <span className="font-medium">{order.customerName || '미입력'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">인원:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {order.customerCount}명
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">주문시간:</span>
                    <span className="font-medium">{formatTime(order.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">총액:</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {t('orders.viewDetails')}
                    </Button>
                    
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                        disabled={updateOrderStatusMutation.isPending}
                      >
                        {t('orders.confirm')}
                      </Button>
                    )}
                    
                    {order.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                        disabled={updateOrderStatusMutation.isPending}
                      >
                        {t('orders.startCooking')}
                      </Button>
                    )}
                    
                    {order.status === 'preparing' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                        disabled={updateOrderStatusMutation.isPending}
                      >
                        {t('orders.ready')}
                      </Button>
                    )}
                    
                    {order.status === 'ready' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'served')}
                        disabled={updateOrderStatusMutation.isPending}
                      >
                        {t('orders.served')}
                      </Button>
                    )}
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
                        <span className="font-medium">{selectedOrder.customerName || t('orders.noCustomerName')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('orders.customerCount')}:</span>
                        <span className="font-medium">{selectedOrder.customerCount} {t('orders.people')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">{t('orders.statusAndTime')}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>{t('orders.orderStatus')}:</span>
                        <Badge variant={getOrderStatusBadge(selectedOrder.status).variant}>
                          {getOrderStatusBadge(selectedOrder.status).label}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('orders.orderTime')}:</span>
                        <span className="font-medium">{formatTime(selectedOrder.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                  <h4 className="font-medium mb-3">{t('orders.orderItems')}</h4>
                  <div className="space-y-3">
                    {selectedOrder.items && (selectedOrder.items as OrderItem[]).map((item: OrderItem, index: number) => {
                      const productInfo = getProductInfo(item.productId);
                      return (
                        <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h5 className="font-medium">{productInfo?.name || t('orders.unknownProduct')}</h5>
                            {item.notes && (
                              <p className="text-sm text-gray-600 mt-1">{t('orders.memo')}: {item.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {item.quantity}개 × {formatCurrency(item.price)}
                            </div>
                            <div className="text-sm text-gray-600">
                              = {formatCurrency(item.quantity * item.price)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Order Total */}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>{t('orders.totalAmount')}:</span>
                  <span className="text-green-600">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}