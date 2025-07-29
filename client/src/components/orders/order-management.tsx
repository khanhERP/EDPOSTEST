import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, Clock, CheckCircle2, DollarSign, Users, CreditCard, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { PaymentMethodModal } from "@/components/pos/payment-method-modal";
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
    mutationFn: ({ orderId, paymentMethod }: { orderId: number; paymentMethod: string }) =>
      apiRequest('POST', `/api/orders/${orderId}/payment`, { paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setPaymentModalOpen(false);
      setOrderForPayment(null);
      toast({
        title: 'Thành công',
        description: 'Đơn hàng đã được thanh toán thành công',
      });
    },
    onError: () => {
      toast({
        title: 'Lỗi',
        description: 'Không thể hoàn thành thanh toán',
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
    return `${amount.toLocaleString()} ₫`;
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

  const handlePaymentClick = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  const handlePaymentMethodSelect = (paymentMethod: string) => {
    if (orderForPayment) {
      completePaymentMutation.mutate({ 
        orderId: orderForPayment.id, 
        paymentMethod 
      });
    }
  };

  const getPaymentMethods = () => {
    // Get payment methods from localStorage (saved from settings)
    const savedPaymentMethods = localStorage.getItem('paymentMethods');
    
    // Default payment methods if none saved
    const defaultPaymentMethods = [
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

    // For non-cash payments, show QR code
    try {
      const qrData = `${method.name} Payment\nAmount: ${selectedOrder.total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nOrder: ${selectedOrder.orderNumber}\nTime: ${new Date().toLocaleString('vi-VN')}`;
      const qrUrl = await QRCodeLib.toDataURL(qrData, {
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
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo mã QR',
        variant: 'destructive',
      });
    }
  };

  const handleQRPaymentConfirm = () => {
    if (selectedOrder && selectedPaymentMethod) {
      completePaymentMutation.mutate({ 
        orderId: selectedOrder.id, 
        paymentMethod: selectedPaymentMethod.key 
      });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('orders.orderManagement')}</h2>
          <p className="text-gray-600">{t('orders.realTimeOrderStatus')}</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {allOrders.length} đơn hàng
        </Badge>
      </div>

      {/* Orders Grid */}
      {allOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
            <p className="text-gray-600">Các đơn hàng sẽ hiển thị ở đây khi có khách đặt hàng</p>
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
                        {Number(order.total).toLocaleString()} ₫
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
                          Thanh toán
                        </Button>
                      )}

                      {(order.status === 'paid' || order.status === 'cancelled') && (
                        <Badge variant="outline" className="flex-1 justify-center">
                          {order.status === 'paid' ? 'Đã hoàn thành' : 'Đã hủy'}
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
                        Đang tải danh sách món...
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
                                ₩{Number(item.unitPrice || 0).toLocaleString()}/món
                              </div>
                              {item.notes && (
                                <div className="text-xs text-blue-600 italic mt-1">
                                  Ghi chú: {item.notes}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                ₩{Number(item.total || 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        Không có món nào trong đơn hàng này
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">{t('orders.totalAmount')}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{Number(selectedOrder.subtotal).toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{Number(selectedOrder.tax).toLocaleString()} ₫</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>{t('orders.totalAmount')}:</span>
                      <span>{Number(selectedOrder.total).toLocaleString()} ₫</span>
                    </div>
                  </div>
                </div>

                {/* Status Update Actions */}
                {selectedOrder.status !== 'paid' && selectedOrder.status !== 'cancelled' && (
                  <div className="flex gap-2 pt-4">
                    {selectedOrder.status === 'pending' && (
                      <Button
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'confirmed')}
                        disabled={updateOrderStatusMutation.isPending}
                        className="flex-1"
                      >
                        {t('orders.confirm')}
                      </Button>
                    )}
                    {selectedOrder.status === 'confirmed' && (
                      <Button
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'preparing')}
                        disabled={updateOrderStatusMutation.isPending}
                        className="flex-1"
                      >
                        {t('orders.startCooking')}
                      </Button>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <Button
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'ready')}
                        disabled={updateOrderStatusMutation.isPending}
                        className="flex-1"
                      >
                        {t('orders.ready')}
                      </Button>
                    )}
                    {selectedOrder.status === 'ready' && (
                      <Button
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'served')}
                        disabled={updateOrderStatusMutation.isPending}
                        className="flex-1"
                      >
                        {t('orders.served')}
                      </Button>
                    )}
                    {selectedOrder.status === 'served' && (
                      <Button
                        onClick={() => setPaymentMethodsOpen(true)}
                        disabled={completePaymentMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Thanh toán
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setOrderForPayment(null);
        }}
        onSelectMethod={handlePaymentMethodSelect}
        total={orderForPayment?.total || 0}
      />

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
            {/* Order Summary */}
            {selectedOrder && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Đơn hàng: {selectedOrder.orderNumber}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Number(selectedOrder.total).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫
                </p>
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
    </div>
  );
}