
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Search, FileText, Package, Printer, Mail, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Invoice {
  id: number;
  invoiceNumber: string;
  tradeNumber: string;
  templateNumber: string;
  symbol: string;
  customerName: string;
  customerTaxCode: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  subtotal: string;
  tax: string;
  total: string;
  paymentMethod: number;
  invoiceDate: string;
  status: string;
  einvoiceStatus: number;
  invoiceStatus: number;
  notes: string;
  createdAt: string;
}

interface InvoiceItem {
  id: number;
  invoiceId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
  taxRate: string;
}

interface Order {
  id: number;
  orderNumber: string;
  tableId: number;
  employeeId?: number;
  status: string;
  customerName?: string;
  customerCount: number;
  subtotal: string;
  tax: string;
  total: string;
  paymentMethod?: string;
  paymentStatus: string;
  einvoiceStatus: number;
  notes?: string;
  orderedAt: string;
}

export default function SalesOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableInvoice, setEditableInvoice] = useState<Invoice | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Query invoices
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/invoices");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Query orders
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/orders");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  const isLoading = invoicesLoading || ordersLoading;
  const hasError = invoicesError || ordersError;

  // Query invoice items for selected invoice
  const { data: invoiceItems = [] } = useQuery({
    queryKey: ["/api/invoice-items", selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice?.id) return [];
      try {
        const response = await apiRequest("GET", `/api/invoice-items/${selectedInvoice.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching invoice items:', error);
        return [];
      }
    },
    enabled: !!selectedInvoice?.id && selectedInvoice?.type === 'invoice',
    retry: 2,
  });

  // Query order items for selected order
  const { data: orderItems = [] } = useQuery({
    queryKey: ["/api/order-items", selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice?.id) return [];
      try {
        const response = await apiRequest("GET", `/api/order-items/${selectedInvoice.id}`);
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
    enabled: !!selectedInvoice?.id && selectedInvoice?.type === 'order',
    retry: 2,
  });

  // Mutation for updating invoice
  const updateInvoiceMutation = useMutation({
    mutationFn: async (updatedInvoice: Invoice) => {
      const response = await apiRequest("PUT", `/api/invoices/${updatedInvoice.id}`, updatedInvoice);
      return response.json();
    },
    onSuccess: () => {
      // Refresh invoices list
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsEditing(false);
      setEditableInvoice(null);
      // Update selected invoice with new data
      if (editableInvoice) {
        setSelectedInvoice(editableInvoice);
      }
    },
  });

  // Mutation for canceling invoice or order
  const cancelInvoiceMutation = useMutation({
    mutationFn: async (item: { id: number, type: string }) => {
      try {
        let response;
        
        if (item.type === 'order') {
          // For orders, update status to 'cancelled'
          response = await apiRequest("PUT", `/api/orders/${item.id}/status`, { 
            status: "cancelled"
          });
        } else {
          // For invoices, update both invoiceStatus and invoice_status to 3 (Đã hủy)
          response = await apiRequest("PUT", `/api/invoices/${item.id}`, { 
            invoiceStatus: 3, // 3 = Đã hủy
            invoice_status: 3 // 3 = Đã hủy (database column)
          });
        }
        
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
        
        // Try to parse JSON response, but don't fail if it's not JSON
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
      } catch (error) {
        console.error('Cancel order/invoice error:', error);
        throw error;
      }
    },
    onSuccess: (data, item) => {
      console.log('Order/Invoice cancelled successfully:', item);
      
      // 1. Đóng dialog xác nhận
      setShowCancelDialog(false);
      
      // 2. Refresh danh sách hóa đơn và đơn hàng
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // 3. Cập nhật trạng thái của selectedInvoice nếu đang hiển thị
      if (selectedInvoice && selectedInvoice.id === item.id && selectedInvoice.type === item.type) {
        setSelectedInvoice({
          ...selectedInvoice,
          invoiceStatus: 3, // Đã hủy
          invoice_status: 3, // Đã hủy (database column)
          displayStatus: 3,
          status: item.type === 'order' ? 'cancelled' : selectedInvoice.status
        });
        
        // Reset editing states
        setIsEditing(false);
        setEditableInvoice(null);
      }
      
      console.log('Order/Invoice cancelled and status updated');
    },
    onError: (error) => {
      console.error('Error canceling invoice:', error);
      setShowCancelDialog(false);
      // Could add toast notification here
      alert(`Lỗi hủy đơn hàng: ${error.message}`);
    },
  });

  const getPaymentMethodName = (method: number) => {
    switch (method) {
      case 1:
        return "Tiền mặt";
      case 2:
        return "Chuyển khoản";
      case 3:
        return "TM/CK";
      case 4:
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
    };
    
    const statusLabels = {
      draft: "Nháp",
      published: "Đã xuất",
      cancelled: "Đã hủy",
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
        {statusLabels[status as keyof typeof statusLabels] || "Không xác định"}
      </Badge>
    );
  };

  const getInvoiceStatusBadge = (status: number) => {
    const statusLabels = {
      1: "Hoàn thành",
      2: "Đang phục vụ", 
      3: "Đã hủy",
    };

    const statusColors = {
      1: "bg-green-100 text-green-800",
      2: "bg-blue-100 text-blue-800",
      3: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors[1]}>
        {statusLabels[status as keyof typeof statusLabels] || "Hoàn thành"}
      </Badge>
    );
  };

  // Combine invoices and orders data with safe array checks
  const combinedData = [
    ...(Array.isArray(invoices) ? invoices.map((invoice: Invoice) => ({
      ...invoice,
      type: 'invoice',
      date: invoice.invoiceDate,
      displayNumber: invoice.tradeNumber || invoice.invoiceNumber || `INV-${String(invoice.id).padStart(13, '0')}`,
      displayStatus: invoice.invoiceStatus || 1
    })) : []),
    ...(Array.isArray(orders) ? orders.map((order: Order) => ({
      ...order,
      type: 'order',
      date: order.orderedAt,
      displayNumber: order.orderNumber || `ORD-${String(order.id).padStart(13, '0')}`,
      displayStatus: order.status === 'paid' ? 1 : order.status === 'pending' ? 2 : 3,
      customerName: order.customerName || 'Khách hàng lẻ',
      invoiceStatus: order.status === 'paid' ? 1 : order.status === 'pending' ? 2 : 3
    })) : [])
  ];

  const filteredInvoices = Array.isArray(combinedData) ? combinedData.filter((item: any) => {
    try {
      if (!item || !item.date) return false;
      
      const itemDate = new Date(item.date);
      if (isNaN(itemDate.getTime())) return false;
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = itemDate >= start && itemDate <= end;
      const customerMatch = !customerSearch || 
        (item.customerName && item.customerName.toLowerCase().includes(customerSearch.toLowerCase()));
      const orderMatch = !orderNumberSearch || 
        (item.displayNumber && item.displayNumber.toLowerCase().includes(orderNumberSearch.toLowerCase()));
      const customerCodeMatch = !customerCodeSearch || 
        (item.customerTaxCode && item.customerTaxCode.toLowerCase().includes(customerCodeSearch.toLowerCase()));

      return dateMatch && customerMatch && orderMatch && customerCodeMatch;
    } catch (error) {
      console.error('Error filtering item:', item, error);
      return false;
    }
  }) : [];

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEditInvoice = () => {
    if (selectedInvoice) {
      setEditableInvoice({ ...selectedInvoice });
      setIsEditing(true);
    }
  };

  const handleSaveInvoice = () => {
    if (editableInvoice) {
      updateInvoiceMutation.mutate(editableInvoice);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditableInvoice(null);
  };

  const updateEditableInvoiceField = (field: keyof Invoice, value: string) => {
    if (editableInvoice) {
      setEditableInvoice({
        ...editableInvoice,
        [field]: value
      });
    }
  };

  

  const calculateTotals = () => {
    const totals = filteredInvoices.reduce((acc, item) => {
      acc.subtotal += parseFloat(item.subtotal || '0');
      acc.tax += parseFloat(item.tax || '0');
      acc.total += parseFloat(item.total || '0');
      return acc;
    }, { subtotal: 0, tax: 0, total: 0 });

    return totals;
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-green-50">
      <RightSidebar />
      
      <div className="main-content p-6">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-6 h-6 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-800">Danh sách đơn hàng bán</h1>
            </div>
          </div>

          {/* Filters */}
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
                  <label className="block text-sm font-medium mb-2">Khách viên</label>
                  <Input
                    placeholder="Tìm theo số hóa đơn"
                    value={orderNumberSearch}
                    onChange={(e) => setOrderNumberSearch(e.target.value)}
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
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            {/* Invoices List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Danh sách đơn hàng</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        // Handle bulk cancel orders
                        console.log('Bulk cancel orders');
                      }}
                    >
                      <X className="w-4 h-4" />
                      Hủy đơn
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => {
                        // Handle export to excel
                        console.log('Export to excel');
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      Xuất excel
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
                      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                    }}>
                      Thử lại
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Fixed Header */}
                    <div className="grid grid-cols-10 gap-2 text-xs font-medium text-gray-700 bg-gray-50 p-2 rounded sticky top-0 z-10">
                      <div className="col-span-2">Số đơn bán</div>
                      <div className="col-span-2">Ngày đơn bán</div>
                      <div className="col-span-3">Khách hàng</div>
                      <div className="col-span-2">Thành tiền</div>
                      <div className="col-span-1">Trạng thái</div>
                    </div>
                    {/* Scrollable Content */}
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {filteredInvoices.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className={`grid grid-cols-10 gap-2 text-xs p-2 rounded cursor-pointer hover:bg-blue-50 ${
                            selectedInvoice?.id === item.id && selectedInvoice?.type === item.type ? 'bg-blue-100 border border-blue-300' : 'border border-gray-200'
                          }`}
                          onClick={() => setSelectedInvoice(item)}
                        >
                          <div className="col-span-2 font-medium">
                            {item.displayNumber}
                          </div>
                          <div className="col-span-2">{formatDate(item.date)}</div>
                          <div className="col-span-3 truncate">{item.customerName || 'Khách hàng lẻ'}</div>
                          <div className="col-span-2 text-right font-medium">
                            {formatCurrency(item.total)}
                          </div>
                          <div className="col-span-1">
                            {getInvoiceStatusBadge(item.displayStatus)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Totals */}
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

            {/* Invoice Details - Only show when an invoice is selected */}
            {selectedInvoice && (
              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết đơn hàng</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedInvoice ? (
                  <div className="space-y-4">
                    {/* Invoice Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Số đơn bán:</span>
                          {isEditing && editableInvoice ? (
                            <Input 
                              value={editableInvoice.tradeNumber || editableInvoice.invoiceNumber || editableInvoice.orderNumber || ''}
                              onChange={(e) => updateEditableInvoiceField(selectedInvoice.type === 'order' ? 'orderNumber' : 'tradeNumber', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <div>{selectedInvoice.displayNumber}</div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Ngày:</span>
                          {isEditing && editableInvoice ? (
                            <Input 
                              type="date"
                              value={(editableInvoice.invoiceDate || editableInvoice.orderedAt)?.split('T')[0]}
                              onChange={(e) => updateEditableInvoiceField(selectedInvoice.type === 'order' ? 'orderedAt' : 'invoiceDate', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <div>{formatDate(selectedInvoice.date)}</div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Khách hàng:</span>
                          {isEditing && editableInvoice ? (
                            <Input 
                              value={editableInvoice.customerName}
                              onChange={(e) => updateEditableInvoiceField('customerName', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <div>{selectedInvoice.customerName}</div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Điện thoại:</span>
                          {isEditing && editableInvoice ? (
                            <Input 
                              value={editableInvoice.customerPhone || ''}
                              onChange={(e) => updateEditableInvoiceField('customerPhone', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <div>{selectedInvoice.customerPhone || '-'}</div>
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Địa chỉ:</span>
                          {isEditing && editableInvoice ? (
                            <Input 
                              value={editableInvoice.customerAddress || ''}
                              onChange={(e) => updateEditableInvoiceField('customerAddress', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <div>{selectedInvoice.customerAddress || '-'}</div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Hình thức bán:</span>
                          <div>Bán tại cửa hàng</div>
                        </div>
                        <div>
                          <span className="font-medium">Ký hiệu hóa đơn:</span>
                          {isEditing && editableInvoice ? (
                            <Input 
                              value={editableInvoice.symbol || ''}
                              onChange={(e) => updateEditableInvoiceField('symbol', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <div>{selectedInvoice.symbol || '1C21DTD'}</div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Số hóa đơn:</span>
                          {isEditing && editableInvoice ? (
                            <Input 
                              value={editableInvoice.invoiceNumber || ''}
                              onChange={(e) => updateEditableInvoiceField('invoiceNumber', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <div>{selectedInvoice.invoiceNumber || String(selectedInvoice.id).padStart(8, '0')}</div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Trạng thái HĐ:</span>
                          <div>{getEInvoiceStatusBadge(selectedInvoice.einvoiceStatus || 0)}</div>
                        </div>
                        <div>
                          <span className="font-medium">Trạng thái đơn:</span>
                          <div>{getInvoiceStatusBadge(selectedInvoice.displayStatus)}</div>
                        </div>
                        {selectedInvoice.type === 'order' && (
                          <div>
                            <span className="font-medium">Loại:</span>
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              Đơn hàng
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Invoice/Order Items */}
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
                          // Use appropriate items based on selected invoice type
                          const items = selectedInvoice?.type === 'order' ? orderItems : invoiceItems;
                          
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

                    {/* Summary */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Tổng tiền thanh toán:</span>
                            <span className="font-bold">{formatCurrency(selectedInvoice.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Thành tiền:</span>
                            <span className="font-bold">{formatCurrency(selectedInvoice.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Giảm giá %:</span>
                            <span>0</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Thuế suất (10%) Thuế GTGT:</span>
                            <span className="font-bold">{formatCurrency(selectedInvoice.tax)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Khách hàng trả:</span>
                            <span className="font-bold">{formatCurrency(selectedInvoice.total)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tiền mặt:</span>
                            <span className="font-bold">{formatCurrency(selectedInvoice.total)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Chuyển khoản:</span>
                            <span>0</span>
                          </div>
                          <div className="flex justify-between">
                            <span>QR Code InfoCAMS:</span>
                            <span className="font-bold">{formatCurrency(selectedInvoice.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Ghi chú</label>
                      {isEditing && editableInvoice ? (
                        <textarea
                          value={editableInvoice.notes || ''}
                          onChange={(e) => updateEditableInvoiceField('notes', e.target.value)}
                          className="w-full p-3 border rounded min-h-[80px] resize-none"
                          placeholder="Nhập ghi chú..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded border min-h-[80px]">
                          {selectedInvoice.notes || 'Không có ghi chú'}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        size="sm" 
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          if (selectedInvoice && selectedInvoice.invoiceStatus !== 3) {
                            setShowCancelDialog(true);
                          }
                        }}
                        disabled={selectedInvoice?.invoiceStatus === 3 || cancelInvoiceMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                        {cancelInvoiceMutation.isPending ? 'Đang hủy...' : 'Hủy đơn'}
                      </Button>
                      {!isEditing ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                          onClick={handleEditInvoice}
                        >
                          <FileText className="w-4 h-4" />
                          Sửa đơn
                        </Button>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex items-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={handleSaveInvoice}
                            disabled={updateInvoiceMutation.isPending}
                          >
                            <Package className="w-4 h-4" />
                            {updateInvoiceMutation.isPending ? 'Đang lưu...' : 'Lưu'}
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
                          setSelectedInvoice(null);
                          setIsEditing(false);
                          setEditableInvoice(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                        Đóng
                      </Button>
                    </div>
                  </div>
                ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy đơn hàng bán</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy đơn hàng {selectedInvoice?.tradeNumber || selectedInvoice?.invoiceNumber || `DH${String(selectedInvoice?.id).padStart(8, '0')}`} này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bỏ qua</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedInvoice) {
                  console.log('Cancelling order/invoice:', selectedInvoice.id, selectedInvoice.type);
                  cancelInvoiceMutation.mutate({ 
                    id: selectedInvoice.id, 
                    type: selectedInvoice.type || 'invoice' 
                  });
                }
              }}
              disabled={cancelInvoiceMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelInvoiceMutation.isPending ? 'Đang hủy...' : 'Đồng ý'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
