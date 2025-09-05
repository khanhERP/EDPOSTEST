
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Search, FileText, Package, Printer, Mail, X, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/lib/i18n";
import * as XLSX from 'xlsx';
import { EInvoiceModal } from "@/components/pos/einvoice-modal";
import { PrintDialog } from "@/components/pos/print-dialog";

interface Order {
  id: number;
  orderNumber: string;
  tableId?: number;
  employeeId?: number;
  status: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxCode?: string;
  customerEmail?: string;
  customerCount: number;
  subtotal: string;
  tax: string;
  total: string;
  paymentMethod?: string;
  paymentStatus: string;
  einvoiceStatus: number;
  salesChannel: string;
  templateNumber?: string;
  symbol?: string;
  invoiceNumber?: string;
  notes?: string;
  orderedAt: string;
  servedAt?: string;
  paidAt?: string;
}

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
  taxRate?: string;
  notes?: string;
}

export default function SalesOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Auto-refresh when new orders are created
  useEffect(() => {
    const handleNewOrder = () => {
      console.log('📱 Sales Orders: New order detected, refreshing data...');
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });
    };

    const handleOrderUpdate = () => {
      console.log('🔄 Sales Orders: Order updated, refreshing data...');
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });
    };

    const handleRefreshOrders = () => {
      console.log('🔄 Sales Orders: Manual refresh triggered...');
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });
    };

    window.addEventListener('newOrderCreated', handleNewOrder);
    window.addEventListener('orderStatusUpdated', handleOrderUpdate);
    window.addEventListener('paymentCompleted', handleOrderUpdate);
    window.addEventListener('refreshOrders', handleRefreshOrders);
    window.addEventListener('invoiceCreated', handleNewOrder);
    window.addEventListener('receiptCreated', handleNewOrder);

    return () => {
      window.removeEventListener('newOrderCreated', handleNewOrder);
      window.removeEventListener('orderStatusUpdated', handleOrderUpdate);
      window.removeEventListener('paymentCompleted', handleOrderUpdate);
      window.removeEventListener('refreshOrders', handleRefreshOrders);
      window.removeEventListener('invoiceCreated', handleNewOrder);
      window.removeEventListener('receiptCreated', handleNewOrder);
    };
  }, [queryClient]);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [orderNumberSearch, setOrderNumberSearch] = useState("");
  const [customerCodeSearch, setCustomerCodeSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableOrder, setEditableOrder] = useState<Order | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkCancelDialog, setShowBulkCancelDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printReceiptData, setPrintReceiptData] = useState<any>(null);

  // Query orders with filtering - chỉ load từ bảng orders
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate, currentPage, itemsPerPage, customerSearch, orderNumberSearch, customerCodeSearch],
    queryFn: async () => {
      try {
        console.log('🔍 Loading orders with filters:', {
          startDate,
          endDate,
          customerSearch,
          orderNumberSearch,
          customerCodeSearch,
          page: currentPage,
          limit: itemsPerPage
        });

        const response = await apiRequest("GET", `/api/orders/date-range/${startDate}/${endDate}?page=${currentPage}&limit=${itemsPerPage}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        console.log('✅ Orders loaded successfully:', {
          total: data?.length || 0,
          tableOrders: data?.filter((o: any) => o.salesChannel === 'table').length || 0,
          posOrders: data?.filter((o: any) => o.salesChannel === 'pos').length || 0,
          onlineOrders: data?.filter((o: any) => o.salesChannel === 'online').length || 0,
          deliveryOrders: data?.filter((o: any) => o.salesChannel === 'delivery').length || 0,
        });

        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('❌ Error fetching orders by date:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const isLoading = ordersLoading;
  const hasError = ordersError;

  // Query order items for selected order
  const { data: orderItems = [] } = useQuery({
    queryKey: ["/api/order-items", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return [];
      try {
        const response = await apiRequest("GET", `/api/order-items/${selectedOrder.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching order items:', error);
        return [];
      }
    },
    enabled: !!selectedOrder?.id,
    retry: 2,
  });

  // Mutation for updating an order
  const updateOrderMutation = useMutation({
    mutationFn: async (updatedOrder: Order) => {
      const response = await apiRequest("PUT", `/api/orders/${updatedOrder.id}`, updatedOrder);
      return response.json();
    },
    onSuccess: (data, updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });
      setIsEditing(false);
      setEditableOrder(null);

      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, ...updatedOrder });
      }
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      alert(`Lỗi khi cập nhật đơn hàng: ${error.message}`);
    }
  });

  // Mutation for bulk canceling orders
  const bulkCancelOrdersMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const results = [];
      for (const orderId of orderIds) {
        try {
          const response = await apiRequest("PUT", `/api/orders/${orderId}/status`, {
            status: "cancelled"
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to cancel order ${orderId}: ${errorText}`);
          }

          results.push({ orderId, success: true });
        } catch (error) {
          console.error(`Error canceling order ${orderId}:`, error);
          results.push({ orderId, success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      console.log('Bulk cancel results:', results);

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      setShowBulkCancelDialog(false);
      setSelectedOrderIds(new Set());

      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });

      if (selectedOrder) {
        const wasCancelled = results.find(r => r.orderId === String(selectedOrder.id) && r.success);
        if (wasCancelled) {
          setSelectedOrder({
            ...selectedOrder,
            status: 'cancelled'
          });
          setIsEditing(false);
          setEditableOrder(null);
        }
      }

      if (successCount > 0) {
        alert(`Đã hủy thành công ${successCount} đơn hàng${failCount > 0 ? `, ${failCount} đơn thất bại` : ''}`);
      } else {
        alert(`Không thể hủy đơn hàng nào`);
      }
    },
    onError: (error) => {
      console.error('Bulk cancel error:', error);
      setShowBulkCancelDialog(false);
      alert(`Lỗi hủy đơn hàng: ${error.message}`);
    },
  });

  // Mutation for publishing invoice
  const publishRequestMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/einvoice/publish", orderData);
      return response.json();
    },
    onSuccess: async (result, variables) => {
      console.log('✅ E-invoice published successfully:', result);

      if (result.success && selectedOrder) {
        try {
          const invoiceNo = result.data?.invoiceNo || result.invoiceNumber || null;
          const symbol = result.data?.symbol || result.symbol || 'AA/25E';
          const templateNumber = result.data?.templateNumber || result.templateNumber || '1C25TYY';

          const updateData = {
            einvoiceStatus: 1,
            status: 'published',
            invoiceNumber: invoiceNo,
            symbol: symbol,
            templateNumber: templateNumber,
            notes: `E-Invoice published - Invoice No: ${invoiceNo || 'N/A'}`
          };

          console.log(`Updating order with data:`, updateData);

          const updateResponse = await apiRequest("PUT", `/api/orders/${selectedOrder.id}`, updateData);
          console.log('✅ Order updated successfully after publish:', updateResponse);

          const items = orderItems;
          const receiptData = {
            transactionId: invoiceNo || selectedOrder.orderNumber || `TXN-${Date.now()}`,
            orderId: selectedOrder.id,
            items: items.map(item => ({
              id: item.id || item.productId,
              productName: item.productName,
              price: item.unitPrice || '0',
              quantity: item.quantity || 1,
              total: item.total || '0',
              sku: item.sku || `SKU${item.productId || item.id}`,
              taxRate: parseFloat(item.taxRate || '0'),
            })),
            subtotal: selectedOrder.subtotal || '0',
            tax: selectedOrder.tax || '0',
            total: selectedOrder.total || '0',
            paymentMethod: 'einvoice',
            amountReceived: selectedOrder.total || '0',
            change: '0',
            cashierName: 'System User',
            createdAt: new Date().toISOString(),
            invoiceNumber: invoiceNo,
            customerName: selectedOrder.customerName || 'Khách hàng',
            customerTaxCode: selectedOrder.customerTaxCode || null,
          };

          setPrintReceiptData(receiptData);
          setShowPrintDialog(true);

          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });

          setShowPublishDialog(false);
          setSelectedOrder(null);

          alert(`Hóa đơn đã phát hành thành công!\nSố hóa đơn: ${invoiceNo || 'N/A'}\n\nMàn hình in hóa đơn sẽ hiển thị.`);
        } catch (updateError) {
          console.error('❌ Error updating order after publish:', updateError);
          const errorMessage = updateError?.message || updateError?.toString() || 'Lỗi không xác định';
          alert(`Hóa đơn đã phát hành nhưng không thể cập nhật trạng thái: ${errorMessage}`);
        }
      } else {
        alert(`Lỗi phát hành hóa đơn: ${result.message || 'Không xác định'}`);
      }
    },
    onError: (error) => {
      console.error('❌ Error publishing invoice:', error);
      alert(`Lỗi phát hành hóa đơn: ${error.message}`);
    }
  });

  // Mutation for canceling a single order
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}/status`, {
        status: "cancelled"
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.text();
          errorMessage = errorData || errorMessage;
        } catch (textError) {
          console.error('Could not parse error response:', textError);
        }
        throw new Error(`Không thể hủy đơn hàng: ${errorMessage}`);
      }

      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return { success: true, message: 'Order cancelled successfully' };
        }
      } catch (jsonError) {
        console.warn('Response is not valid JSON, but request was successful:', jsonError);
        return { success: true, message: 'Order cancelled successfully' };
      }
    },
    onSuccess: (data, orderId) => {
      console.log('Order cancelled successfully:', orderId);

      setShowCancelDialog(false);

      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: 'cancelled'
        });

        setIsEditing(false);
        setEditableOrder(null);
      }

      console.log('Order cancelled and status updated');
    },
    onError: (error) => {
      console.error('Error canceling order:', error);
      setShowCancelDialog(false);
      alert(`Lỗi hủy đơn hàng: ${error.message}`);
    },
  });

  const getPaymentMethodName = (method: number | string) => {
    switch (method) {
      case 1:
      case 'cash':
        return "Tiền mặt";
      case 2:
      case 'creditCard':
      case 'debitCard':
        return "Chuyển khoản";
      case 3:
        return "TM/CK";
      case 4:
      case 'qrCode':
      case 'momo':
      case 'zalopay':
      case 'vnpay':
      case 'grabpay':
        return "QR Code InfoCAMS";
      case 'Đối trừ công nợ':
        return "Đối trừ công nợ";
      default:
        return "Tiền mặt";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
    };

    const statusLabels = {
      draft: "Nháp",
      published: "Đã xuất",
      cancelled: "Đã hủy",
      pending: "Chờ xử lý",
      paid: "Đã thanh toán",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.draft}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const getEInvoiceStatusBadge = (status: number) => {
    const statusLabels = {
      0: "Chưa phát hành",
      1: "Đã phát hành",
      2: "Tạo nháp",
      3: "Đã duyệt",
      4: "Đã bị thay thế (hủy)",
      5: "Thay thế tạm",
      6: "Thay thế",
      7: "Đã bị điều chỉnh",
      8: "Điều chỉnh tạm",
      9: "Điều chỉnh",
      10: "Đã hủy",
    };

    const statusColors = {
      0: "bg-gray-100 text-gray-800",
      1: "bg-green-100 text-green-800",
      2: "bg-blue-100 text-blue-800",
      3: "bg-green-100 text-green-800",
      4: "bg-red-100 text-red-800",
      5: "bg-yellow-100 text-yellow-800",
      6: "bg-green-100 text-green-800",
      7: "bg-orange-100 text-orange-800",
      8: "bg-yellow-100 text-yellow-800",
      9: "bg-orange-100 text-orange-800",
      10: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors[0]}>
        {statusLabels[status as keyof typeof statusColors] || "Không xác định"}
      </Badge>
    );
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Hoàn thành", variant: "default" as const },
      pending: { label: "Đang phục vụ", variant: "secondary" as const },
      cancelled: { label: "Đã hủy", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.paid;
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  // Apply client-side filtering to orders
  const filteredOrders = Array.isArray(orders) ? orders.filter((order: Order) => {
    try {
      if (!order) return false;

      const customerMatch = !customerSearch ||
        (order.customerName && order.customerName.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (order.customerEmail && order.customerEmail.toLowerCase().includes(customerSearch.toLowerCase()));

      const orderMatch = !orderNumberSearch ||
        (order.orderNumber && order.orderNumber.toLowerCase().includes(orderNumberSearch.toLowerCase())) ||
        (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(orderNumberSearch.toLowerCase()));

      const customerCodeMatch = !customerCodeSearch ||
        (order.customerTaxCode && order.customerTaxCode.toLowerCase().includes(customerCodeSearch.toLowerCase()));

      return customerMatch && orderMatch && customerCodeMatch;
    } catch (error) {
      console.error('Error filtering order:', order, error);
      return false;
    }
  }).sort((a: Order, b: Order) => {
    const dateA = new Date(a.orderedAt || a.createdAt);
    const dateB = new Date(b.orderedAt || b.createdAt);
    return dateB.getTime() - dateA.getTime();
  }) : [];

  const formatCurrency = (amount: string | number | undefined | null): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }
    return Math.floor(num).toLocaleString('vi-VN');
  };

  const formatDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return '';
    }
  };

  const handleEditOrder = () => {
    if (selectedOrder) {
      setEditableOrder({ ...selectedOrder });
      setIsEditing(true);
    }
  };

  const handleSaveOrder = () => {
    if (editableOrder) {
      updateOrderMutation.mutate(editableOrder);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditableOrder(null);
  };

  const updateEditableOrderField = (field: keyof Order, value: any) => {
    if (editableOrder) {
      setEditableOrder({
        ...editableOrder,
        [field]: value
      });
    }
  };

  const calculateTotals = () => {
    const totals = filteredOrders.reduce((acc, order) => {
      acc.subtotal += parseFloat(order.subtotal || '0');
      acc.tax += parseFloat(order.tax || '0');
      acc.total += parseFloat(order.total || '0');
      return acc;
    }, { subtotal: 0, tax: 0, total: 0 });

    return totals;
  };

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    const orderKey = `order-${orderId}`;
    const newSelectedIds = new Set(selectedOrderIds);

    if (checked) {
      newSelectedIds.add(orderKey);
    } else {
      newSelectedIds.delete(orderKey);
    }

    setSelectedOrderIds(newSelectedIds);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allOrderKeys = filteredOrders.map(order => `order-${order.id}`);
      setSelectedOrderIds(new Set(allOrderKeys));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const isOrderSelected = (orderId: number) => {
    return selectedOrderIds.has(`order-${orderId}`);
  };

  const isAllSelected = filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length;
  const isIndeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < filteredOrders.length;

  const exportSelectedOrdersToExcel = () => {
    if (selectedOrderIds.size === 0) {
      alert('Vui lòng chọn ít nhất một đơn hàng để xuất Excel');
      return;
    }

    const selectedOrders = filteredOrders.filter(order =>
      selectedOrderIds.has(`order-${order.id}`)
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    XLSX.utils.sheet_add_aoa(ws, [['DANH SÁCH ĐƠN HÀNG BÁN']], { origin: 'A1' });
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } });

    XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 'A2' });

    const headers = [
      'Số đơn bán', 'Ngày đơn bán', 'Bàn', 'Mã khách hàng', 'Tên khách hàng',
      'Thành tiền', 'Giảm giá', 'Tiền thuế', 'Đã thanh toán',
      'Mã nhân viên', 'Tên nhân viên', 'Ký hiệu hóa đơn', 'Số hóa đơn', 'Ghi chú', 'Trạng thái'
    ];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A3' });

    const dataRows = selectedOrders.map((order, index) => {
      const orderNumber = order.orderNumber || `DB${new Date().getFullYear()}${String(order.id).padStart(6, '0')}`;
      const orderDate = formatDate(order.orderedAt);
      const table = order.salesChannel === 'table' && order.tableId ? `Bàn ${order.tableId}` : '';
      const customerCode = order.customerTaxCode || `KH000${String(index + 1).padStart(3, '0')}`;
      const customerName = order.customerName || 'Khách lẻ';
      const subtotal = parseFloat(order.subtotal || '0');
      const discount = 0;
      const tax = parseFloat(order.tax || '0');
      const total = parseFloat(order.total || '0');
      const paid = total;
      const employeeCode = order.employeeId || 'NV0001';
      const employeeName = 'Phạm Vân Duy';
      const symbol = order.symbol || '';
      const invoiceNumber = order.invoiceNumber || String(order.id).padStart(8, '0');
      const status = order.status === 'paid' ? 'Đã hoàn thành' :
                   order.status === 'pending' ? 'Đang phục vụ' : 'Đã hủy';

      return [
        orderNumber, orderDate, table, customerCode, customerName,
        subtotal, discount, tax, paid,
        employeeCode, employeeName, symbol, invoiceNumber, order.notes || '', status
      ];
    });

    XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A4' });

    ws['!cols'] = [
      { wch: 15 }, { wch: 13 }, { wch: 8 }, { wch: 12 }, { wch: 15 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách đơn hàng');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const defaultFilename = `danh-sach-don-hang-ban_${timestamp}.xlsx`;

    try {
      XLSX.writeFile(wb, defaultFilename, {
        bookType: 'xlsx',
        cellStyles: true,
        sheetStubs: false,
        compression: true
      });

      console.log('✅ Excel file exported successfully');
      alert('File Excel đã được xuất thành công!');
    } catch (error) {
      console.error('❌ Error exporting Excel file:', error);
      XLSX.writeFile(wb, defaultFilename, { bookType: 'xlsx' });
      alert('File Excel đã được xuất nhưng có thể thiếu một số định dạng.');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-green-50">
      <RightSidebar />

      <div className="main-content p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-6 h-6 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-800">Quản lý đơn hàng</h1>
            </div>
            <p className="text-gray-600 mb-4">Quản lý tất cả đơn hàng từ mọi nguồn: bàn, POS, online và giao hàng</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Bộ lọc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Từ ngày</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Đến ngày</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Khách hàng</label>
                  <Input
                    placeholder="Tìm theo tên khách hàng"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Mã khách hàng</label>
                  <Input
                    placeholder="Tìm theo mã khách hàng"
                    value={customerCodeSearch}
                    onChange={(e) => setCustomerCodeSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Số đơn bán</label>
                  <Input
                    placeholder="Tìm theo số đơn bán"
                    value={orderNumberSearch}
                    onChange={(e) => setOrderNumberSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Danh sách đơn hàng</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50"
                      disabled={selectedOrderIds.size === 0}
                      onClick={() => setShowBulkCancelDialog(true)}
                    >
                      <X className="w-4 h-4" />
                      Hủy đơn ({selectedOrderIds.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                      disabled={selectedOrderIds.size === 0}
                      onClick={exportSelectedOrdersToExcel}
                    >
                      <Download className="w-4 h-4" />
                      Xuất excel ({selectedOrderIds.size})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Đang tải...</p>
                  </div>
                ) : hasError ? (
                  <div className="text-center py-8">
                    <div className="text-red-500 mb-4">
                      <X className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-medium">Lỗi kết nối cơ sở dữ liệu</p>
                    </div>
                    <p className="text-gray-500 mb-4">Không thể tải dữ liệu đơn hàng. Vui lòng thử lại.</p>
                    <Button onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });
                    }}>
                      Thử lại
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="w-full overflow-x-auto border rounded-md bg-white">
                    <table className="w-full min-w-[1600px] table-fixed">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="w-[50px] px-3 py-3 text-center font-medium text-sm text-gray-600">
                            <Checkbox
                              checked={isAllSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isIndeterminate;
                              }}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                          <th className="w-[120px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Số đơn bán</div>
                          </th>
                          <th className="w-[100px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Ngày đơn bán</div>
                          </th>
                          <th className="w-[80px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Nguồn đơn</div>
                          </th>
                          <th className="w-[120px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Mã khách hàng</div>
                          </th>
                          <th className="w-[150px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Tên khách hàng</div>
                          </th>
                          <th className="w-[100px] px-3 py-3 text-right font-medium text-sm text-gray-600">
                            <div className="leading-tight">Thành tiền</div>
                          </th>
                          <th className="w-[80px] px-3 py-3 text-right font-medium text-sm text-gray-600">
                            <div className="leading-tight">Giảm giá</div>
                          </th>
                          <th className="w-[90px] px-3 py-3 text-right font-medium text-sm text-gray-600">
                            <div className="leading-tight">Tiền thuế</div>
                          </th>
                          <th className="w-[110px] px-3 py-3 text-right font-medium text-sm text-gray-600">
                            <div className="leading-tight">Đã thanh toán</div>
                          </th>
                          <th className="w-[110px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Mã nhân viên</div>
                          </th>
                          <th className="w-[120px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Tên nhân viên</div>
                          </th>
                          <th className="w-[120px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Ký hiệu hóa đơn</div>
                          </th>
                          <th className="w-[110px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Số hóa đơn</div>
                          </th>
                          <th className="w-[200px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Ghi chú</div>
                          </th>
                          <th className="w-[100px] px-3 py-3 text-center font-medium text-sm text-gray-600">
                            <div className="leading-tight">Trạng thái</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={16} className="p-8 text-center text-sm text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <FileText className="w-8 h-8 text-gray-400" />
                                <p>Không có đơn hàng nào</p>
                                <p className="text-xs">Thử thay đổi bộ lọc để xem kết quả khác</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                        filteredOrders.map((order, index) => {
                            const customerCode = order.customerTaxCode || `KH000${String(index + 1).padStart(3, '0')}`;
                            const discount = 0;
                            const tax = parseFloat(order.tax || '0');
                            const subtotal = parseFloat(order.subtotal || '0');
                            const total = parseFloat(order.total || '0');
                            const paid = total;
                            const employeeCode = order.employeeId || 'NV0001';
                            const employeeName = 'Phạm Vân Duy';
                            const symbol = order.symbol || '';
                            const invoiceNumber = order.invoiceNumber || String(order.id).padStart(8, '0');
                            const notes = order.notes || '';

                            return (
                              <>
                                <tr
                                  key={`order-${order.id}`}
                                  className={`hover:bg-gray-50 ${
                                    selectedOrder?.id === order.id ? 'bg-blue-100' : ''
                                  }`}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                  }}
                                >
                                  <td className="px-3 py-3 text-center">
                                    <Checkbox
                                      checked={isOrderSelected(order.id)}
                                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="font-medium truncate" title={order.orderNumber}>
                                      {order.orderNumber}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm truncate">
                                      {formatDate(order.orderedAt)}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm">
                                      {(() => {
                                        if (order.salesChannel === 'table') {
                                          return order.tableId ? `Bàn ${order.tableId}` : 'Bàn';
                                        } else if (order.salesChannel === 'pos') {
                                          return 'POS';
                                        } else if (order.salesChannel === 'online') {
                                          return 'Online';
                                        } else if (order.salesChannel === 'delivery') {
                                          return 'Giao hàng';
                                        }
                                        return 'POS';
                                      })()}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm font-mono truncate" title={customerCode}>
                                      {customerCode}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm truncate" title={order.customerName || 'Khách hàng lẻ'}>
                                      {order.customerName || 'Khách hàng lẻ'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-right">
                                    <div className="text-sm font-medium">
                                      {formatCurrency(subtotal)}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-right">
                                    <div className="text-sm">
                                      {formatCurrency(discount)}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-right">
                                    <div className="text-sm">
                                      {formatCurrency(tax)}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-right">
                                    <div className="text-sm font-medium">
                                      {formatCurrency(paid)}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm font-mono">
                                      {employeeCode}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm truncate" title={employeeName}>
                                      {employeeName}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm">
                                      {symbol || '-'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm font-mono">
                                      {invoiceNumber}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm truncate" title={notes || '-'}>
                                      {notes || '-'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {getInvoiceStatusBadge(order.status)}
                                  </td>
                                </tr>
                                {selectedOrder && selectedOrder.id === order.id && (
                                  <tr>
                                    <td colSpan={16} className="p-0">
                                      <div className="p-4 border-l-4 border-blue-500 bg-gray-50">
                                        <Card className="shadow-lg">
                                          <CardHeader className="pb-3">
                                            <CardTitle className="text-lg text-blue-700">Chi tiết đơn hàng</CardTitle>
                                          </CardHeader>
                                          <CardContent className="space-y-4">
                                            <div className="bg-white p-4 rounded-lg overflow-x-auto">
                                              <div className="min-w-[1200px]">
                                                <table className="w-full text-sm border-collapse">
                                                  <tbody>
                                                    <tr>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Số đơn bán:</td>
                                                      <td className="py-1 pr-6 text-blue-600 font-medium">
                                                        {isEditing && editableOrder ? (
                                                          <Input
                                                            value={editableOrder.orderNumber || ''}
                                                            onChange={(e) => updateEditableOrderField('orderNumber', e.target.value)}
                                                            className="w-32"
                                                          />
                                                        ) : (
                                                          selectedOrder.orderNumber
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Ngày:</td>
                                                      <td className="py-1 pr-6">
                                                        {isEditing && editableOrder ? (
                                                          <Input
                                                            type="date"
                                                            value={editableOrder.orderedAt?.split('T')[0]}
                                                            onChange={(e) => updateEditableOrderField('orderedAt', e.target.value)}
                                                            className="w-32"
                                                          />
                                                        ) : (
                                                          formatDate(selectedOrder.orderedAt)
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Khách hàng:</td>
                                                      <td className="py-1 pr-6 text-blue-600 font-medium">
                                                        {isEditing && editableOrder ? (
                                                          <Input
                                                            value={editableOrder.customerName || ''}
                                                            onChange={(e) => updateEditableOrderField('customerName', e.target.value)}
                                                            className="w-40"
                                                          />
                                                        ) : (
                                                          selectedOrder.customerName
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Điện thoại:</td>
                                                      <td className="py-1 pr-6">
                                                        {isEditing && editableOrder ? (
                                                          <Input
                                                            value={editableOrder.customerPhone || ''}
                                                            onChange={(e) => updateEditableOrderField('customerPhone', e.target.value)}
                                                            className="w-32"
                                                          />
                                                        ) : (
                                                          selectedOrder.customerPhone || '-'
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Trạng thái:</td>
                                                      <td className="py-1">{getInvoiceStatusBadge(selectedOrder.status)}</td>
                                                    </tr>
                                                    <tr>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Thu ngân:</td>
                                                      <td className="py-1 pr-6">Nguyễn Văn A</td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Hình thức bán:</td>
                                                      <td className="py-1 pr-6">
                                                        {(() => {
                                                          const salesChannel = selectedOrder.salesChannel;
                                                          if (salesChannel === 'table') return 'Bán tại bàn';
                                                          if (salesChannel === 'pos') return 'Bán tại quầy';
                                                          if (salesChannel === 'online') return 'Bán online';
                                                          if (salesChannel === 'delivery') return 'Giao hàng';
                                                          return 'Bán tại quầy';
                                                        })()}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Bàn:</td>
                                                      <td className="py-1 pr-6">
                                                        {selectedOrder.salesChannel === 'table' && selectedOrder.tableId ? 
                                                          `Bàn ${selectedOrder.tableId}` : 
                                                          selectedOrder.salesChannel === 'table' ? 'Bàn' : '-'
                                                        }
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Ký hiệu hóa đơn:</td>
                                                      <td className="py-1 pr-6">
                                                        {isEditing && editableOrder ? (
                                                          <Input
                                                            value={editableOrder.symbol || ''}
                                                            onChange={(e) => updateEditableOrderField('symbol', e.target.value)}
                                                            className="w-24"
                                                          />
                                                        ) : (
                                                          selectedOrder.einvoiceStatus !== 0 ? (selectedOrder.symbol || '') : '-'
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Số hóa đơn:</td>
                                                      <td className="py-1 pr-6">
                                                        {isEditing && editableOrder ? (
                                                          <Input
                                                            value={editableOrder.invoiceNumber || ''}
                                                            onChange={(e) => updateEditableOrderField('invoiceNumber', e.target.value)}
                                                            className="w-32"
                                                          />
                                                        ) : (
                                                          selectedOrder.invoiceNumber || String(selectedOrder.id).padStart(8, '0')
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Trạng thái HĐ:</td>
                                                      <td className="py-1">{getEInvoiceStatusBadge(selectedOrder.einvoiceStatus || 0)}</td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>

                                            <div>
                                              <h4 className="font-medium mb-3">Danh sách hàng hóa</h4>
                                              <div className="border rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-700 bg-gray-50 p-2">
                                                  <div className="col-span-1">STT</div>
                                                  <div className="col-span-3">Mã hàng</div>
                                                  <div className="col-span-3">Tên hàng</div>
                                                  <div className="col-span-1">ĐVT</div>
                                                  <div className="col-span-1">SL</div>
                                                  <div className="col-span-1">Đơn giá</div>
                                                  <div className="col-span-1">Thành tiền</div>
                                                  <div className="col-span-1">Thuế GTGT</div>
                                                </div>
                                                {(() => {
                                                  const items = orderItems;
                                                  if (!items || items.length === 0) {
                                                    return (
                                                      <div className="text-center py-4 text-gray-500 border-t">
                                                        Không có sản phẩm nào
                                                      </div>
                                                    );
                                                  }
                                                  return items.map((item: any, index: number) => (
                                                    <div key={item.id} className="grid grid-cols-12 gap-2 text-xs p-2 border-t">
                                                      <div className="col-span-1">{index + 1}</div>
                                                      <div className="col-span-3">SP{String(item.productId).padStart(3, '0')}</div>
                                                      <div className="col-span-3">{item.productName}</div>
                                                      <div className="col-span-1">Cái</div>
                                                      <div className="col-span-1 text-center">{item.quantity}</div>
                                                      <div className="col-span-1 text-right">{formatCurrency(item.unitPrice)}</div>
                                                      <div className="col-span-1 text-right">{formatCurrency(item.total)}</div>
                                                      <div className="col-span-1 text-center">{item.taxRate || 0}%</div>
                                                    </div>
                                                  ));
                                                })()}
                                              </div>
                                            </div>

                                            <div className="bg-blue-50 p-4 rounded-lg">
                                              <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="space-y-2">
                                                  {(() => {
                                                    const subtotal = parseFloat(selectedOrder.subtotal || '0');
                                                    const tax = parseFloat(selectedOrder.tax || '0');
                                                    const discount = 0;
                                                    const totalPayment = subtotal + tax - discount;
                                                    return (
                                                      <>
                                                        <div className="flex justify-between">
                                                          <span>Tổng tiền thanh toán:</span>
                                                          <span className="font-bold">{formatCurrency(totalPayment)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span>Thành tiền:</span>
                                                          <span className="font-bold">{formatCurrency(subtotal)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-red-600">
                                                          <span>Giảm giá:</span>
                                                          <span>{formatCurrency(discount)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span>Thuế GTGT:</span>
                                                          <span className="font-bold">{formatCurrency(tax)}</span>
                                                        </div>
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                                <div className="space-y-2">
                                                  {(() => {
                                                    const isPaid = selectedOrder.status === 'paid' ||
                                                                  selectedOrder.paymentStatus === 'paid';
                                                    const paidAmount = isPaid ? parseFloat(selectedOrder.total || '0') : 0;
                                                    const paymentMethod = selectedOrder.paymentMethod;

                                                    return (
                                                      <>
                                                        <div className="flex justify-between">
                                                          <span>Khách hàng trả:</span>
                                                          <span className="font-bold">{formatCurrency(paidAmount)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span>Tiền mặt:</span>
                                                          <span className="font-bold">
                                                            {isPaid && (paymentMethod === 1 || paymentMethod === 'cash') ? formatCurrency(paidAmount) : '0'}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span>Chuyển khoản:</span>
                                                          <span className="font-bold">
                                                            {isPaid && (paymentMethod === 2 || paymentMethod === 'debitCard') ? formatCurrency(paidAmount) : '0'}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span>QR Code InfoCAMS:</span>
                                                          <span className="font-bold">
                                                            {isPaid && (paymentMethod === 4 || paymentMethod === 'qrCode') ? formatCurrency(paidAmount) : '0'}
                                                          </span>
                                                        </div>
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              </div>
                                            </div>

                                            <div>
                                              <label className="block text-sm font-medium mb-2">Ghi chú</label>
                                              {isEditing && editableOrder ? (
                                                <textarea
                                                  value={editableOrder.notes || ''}
                                                  onChange={(e) => updateEditableOrderField('notes', e.target.value)}
                                                  className="w-full p-3 border rounded min-h-[80px] resize-none"
                                                  placeholder="Nhập ghi chú..."
                                                />
                                              ) : (
                                                <div className="p-3 bg-gray-50 rounded border min-h-[80px]">
                                                  {selectedOrder.notes || 'Không có ghi chú'}
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex gap-2 pt-4 border-t">
                                              <Button
                                                size="sm"
                                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                                                onClick={() => {
                                                  if (selectedOrder && selectedOrder.status !== 'cancelled') {
                                                    setShowCancelDialog(true);
                                                  }
                                                }}
                                                disabled={selectedOrder?.status === 'cancelled' || cancelOrderMutation.isPending}
                                              >
                                                <X className="w-4 h-4" />
                                                {cancelOrderMutation.isPending ? 'Đang hủy...' : 'Hủy đơn'}
                                              </Button>
                                              {!isEditing ? (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                                                    onClick={handleEditOrder}
                                                  >
                                                    <FileText className="w-4 h-4" />
                                                    Sửa đơn
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex items-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => {
                                                      if (selectedOrder && selectedOrder.einvoiceStatus === 0) {
                                                        setShowPublishDialog(true);
                                                      }
                                                    }}
                                                    disabled={selectedOrder?.einvoiceStatus !== 0}
                                                  >
                                                    <Mail className="w-4 h-4" />
                                                    {selectedOrder?.einvoiceStatus === 0 ? 'Phát hành HĐ điện tử' : 'Đã phát hành'}
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                                                    onClick={() => {
                                                      if (selectedOrder) {
                                                        const printContent = `
                                                          <!DOCTYPE html>
                                                          <html>
                                                            <head>
                                                              <title>Hóa đơn ${selectedOrder.orderNumber}</title>
                                                              <style>
                                                                body { font-family: Arial, sans-serif; margin: 20px; }
                                                                .header { text-align: center; margin-bottom: 20px; }
                                                                .invoice-details { margin-bottom: 20px; }
                                                                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                                                                .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                                                .items-table th { background-color: #f2f2f2; }
                                                                .total-section { text-align: right; margin-top: 20px; }
                                                              </style>
                                                            </head>
                                                            <body>
                                                              <div class="header">
                                                                <h1>HÓA ĐƠN BÁN HÀNG</h1>
                                                                <p>Số: ${selectedOrder.orderNumber}</p>
                                                                <p>Ngày: ${formatDate(selectedOrder.orderedAt)}</p>
                                                              </div>
                                                              <div class="invoice-details">
                                                                <p><strong>Khách hàng:</strong> ${selectedOrder.customerName}</p>
                                                                <p><strong>Điện thoại:</strong> ${selectedOrder.customerPhone || '-'}</p>
                                                                <p><strong>Địa chỉ:</strong> ${selectedOrder.customerAddress || '-'}</p>
                                                              </div>
                                                              <table class="items-table">
                                                                <thead>
                                                                  <tr>
                                                                    <th>STT</th>
                                                                    <th>Tên hàng hóa</th>
                                                                    <th>Đơn vị tính</th>
                                                                    <th>Số lượng</th>
                                                                    <th>Đơn giá</th>
                                                                    <th>Thành tiền</th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody>
                                                                  ${(() => {
                                                                    const items = orderItems;
                                                                    if (!items || items.length === 0) return '<tr><td colspan="6">Không có sản phẩm</td></tr>';
                                                                    return items.map((item: any, index: number) => `
                                                                      <tr>
                                                                        <td>${index + 1}</td>
                                                                        <td>${item.productName}</td>
                                                                        <td>Cái</td>
                                                                        <td>${item.quantity}</td>
                                                                        <td>${formatCurrency(item.unitPrice)}</td>
                                                                        <td>${formatCurrency(item.total)}</td>
                                                                      </tr>
                                                                    `).join('');
                                                                  })()}
                                                                </tbody>
                                                              </table>
                                                              <div class="total-section">
                                                                <p><strong>Thành tiền:</strong> ${formatCurrency(selectedOrder.subtotal)} ₫</p>
                                                                <p><strong>Thuế GTGT:</strong> ${formatCurrency(selectedOrder.tax)} ₫</p>
                                                                <p><strong>Tổng cộng:</strong> ${formatCurrency(selectedOrder.total)} ₫</p>
                                                              </div>
                                                            </body>
                                                          </html>
                                                        `;

                                                        const printWindow = window.open('', '_blank');
                                                        if (printWindow) {
                                                          printWindow.document.write(printContent);
                                                          printWindow.document.close();
                                                          printWindow.focus();
                                                          printWindow.print();
                                                          printWindow.close();
                                                        } else {
                                                          alert('Không thể mở cửa sổ in. Vui lòng kiểm tra popup blocker.');
                                                        }
                                                      }
                                                    }}
                                                  >
                                                    <Printer className="w-4 h-4" />
                                                    In hóa đơn
                                                  </Button>
                                                </>
                                              ) : (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                                                    onClick={handleSaveOrder}
                                                    disabled={updateOrderMutation.isPending}
                                                  >
                                                    <FileText className="w-4 h-4" />
                                                    {updateOrderMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex items-center gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                                    onClick={handleCancelEdit}
                                                  >
                                                    <X className="w-4 h-4" />
                                                    Hủy sửa
                                                  </Button>
                                                </>
                                              )}
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50"
                                                onClick={() => {
                                                  setSelectedOrder(null);
                                                  setIsEditing(false);
                                                  setEditableOrder(null);
                                                }}
                                              >
                                                <X className="w-4 h-4" />
                                                Đóng
                                              </Button>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                            })
                        )}
                      </tbody>
                    </table>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Số hàng mỗi trang:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(parseInt(e.target.value, 10));
                            setCurrentPage(1);
                          }}
                          className="border rounded p-1 text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t bg-blue-50 p-3 rounded">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Tổng tiền hàng:</span>
                      <div className="font-bold text-blue-600">{formatCurrency(totals.subtotal)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Tổng thuế:</span>
                      <div className="font-bold text-orange-600">{formatCurrency(totals.tax)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Tổng cộng:</span>
                      <div className="font-bold text-green-600">{formatCurrency(totals.total)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showBulkCancelDialog} onOpenChange={setShowBulkCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy đơn hàng bán</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy {selectedOrderIds.size} đơn hàng đã chọn không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bỏ qua</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedOrderIds.size > 0) {
                  bulkCancelOrdersMutation.mutate(Array.from(selectedOrderIds).map(id => id.split('-')[1]));
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkCancelOrdersMutation.isPending ? 'Đang hủy...' : `Hủy ${selectedOrderIds.size} đơn`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedOrder && (
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hủy đơn hàng</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc muốn hủy đơn hàng {selectedOrder.orderNumber} không? Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Bỏ qua</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedOrder) {
                    cancelOrderMutation.mutate(selectedOrder.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelOrderMutation.isPending ? 'Đang hủy...' : 'Hủy đơn'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {showPrintDialog && printReceiptData && (
        <PrintDialog
          isOpen={showPrintDialog}
          onClose={() => setShowPrintDialog(false)}
          receiptData={printReceiptData}
        />
      )}
    </div>
  );
}
