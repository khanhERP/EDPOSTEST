import { useState } from "react";
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
    mutationFn: ({ orderId, paymentMethod }: { orderId: number; paymentMethod: string }) =>
      apiRequest('POST', `/api/orders/${orderId}/payment`, { paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setPaymentModalOpen(false);
      setOrderForPayment(null);
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
      minute: '2-digit',
      hour12: false
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
                        {Number(order.total).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫
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
                                {Number(item.unitPrice || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫/món
                              </div>
                              {product?.taxRate && parseFloat(product.taxRate) > 0 && (
                                <div className="text-xs text-orange-600 mt-1">
                                  Thuế: {(Number(item.unitPrice || 0) * parseFloat(product.taxRate) / 100 * item.quantity).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫ ({product.taxRate}%)
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-xs text-blue-600 italic mt-1">
                                  Ghi chú: {item.notes}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                {Number(item.total || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫
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
                      // Calculate total tax from all items
                      let totalItemTax = 0;
                      let totalItemSubtotal = 0;

                      if (Array.isArray(orderItems) && Array.isArray(products)) {
                        orderItems.forEach((item: any) => {
                          const product = products.find((p: any) => p.id === item.productId);
                          const taxRate = product?.taxRate ? parseFloat(product.taxRate) : 0;
                          const itemSubtotal = Number(item.unitPrice || 0) * item.quantity;
                          const itemTax = (itemSubtotal * taxRate) / 100;

                          totalItemSubtotal += itemSubtotal;
                          totalItemTax += itemTax;
                        });
                      }

                      return (
                        <>
                          <div className="flex justify-between">
                            <span>{t('orders.subtotal')}:</span>
                            <span>{totalItemSubtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('orders.tax')}:</span>
                            <span>{totalItemTax.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-medium">
                            <span>{t('orders.totalAmount')}:</span>
                            <span>{(totalItemSubtotal + totalItemTax).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫</span>
                          </div>
                        </>
                      );
                    })()}
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
                      <>
                        <Button
                          onClick={() => setPaymentMethodsOpen(true)}
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
                      </>
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
                    `${mixedPaymentData.remainingAmount.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫` :
                    `${Number(selectedOrder.total).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫`
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
                  {Number(selectedOrder.total).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫
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
        <DialogContent className="max-w-md">
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
                        const { createQRPosAsync } = await import("@/lib/api");
                        const { CreateQRPosRequest } = await import("@/lib/api");

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
    </div>
  );
}