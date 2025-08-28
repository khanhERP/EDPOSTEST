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
  paymentMethod: number | string; // Allow string for new payment methods
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
  tableId?: number;
  employeeId?: number;
  status: string;
  customerName?: string;
  customerCount: number;
  subtotal: string;
  tax: string;
  total: string;
  paymentMethod?: string; // Allow string for new payment methods
  paymentStatus: string;
  einvoiceStatus: number;
  notes?: string;
  orderedAt: string;
}

// Helper function to safely determine item type
  const getItemType = (item: any): 'invoice' | 'order' => {
    if (item?.type) return item.type;
    if (item?.orderNumber) return 'order';
    if (item?.invoiceNumber || item?.tradeNumber) return 'invoice';
    return 'invoice'; // default fallback
  };

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
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkCancelDialog, setShowBulkCancelDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);



  // Query invoices
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ["/api/invoices", currentPage, itemsPerPage],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/invoices?page=${currentPage}&limit=${itemsPerPage}`);
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
    queryKey: ["/api/orders", currentPage, itemsPerPage],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/orders?page=${currentPage}&limit=${itemsPerPage}`);
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
    enabled: !!selectedInvoice?.id && (getItemType(selectedInvoice) === 'invoice' || !selectedInvoice?.type),
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
    enabled: !!selectedInvoice?.id && getItemType(selectedInvoice) === 'order',
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

  // Mutation for bulk canceling orders
  const bulkCancelOrdersMutation = useMutation({
    mutationFn: async (orderKeys: string[]) => {
      const results = [];
      for (const orderKey of orderKeys) {
        const [type, id] = orderKey.split('-');
        try {
          let response;

          if (type === 'order') {
            // For orders, update status to 'cancelled'
            response = await apiRequest("PUT", `/api/orders/${id}/status`, { 
              status: "cancelled"
            });
          } else {
            // For invoices, update both invoiceStatus and invoice_status to 3 (Đã hủy)
            response = await apiRequest("PUT", `/api/invoices/${id}`, { 
              invoiceStatus: 3, // 3 = Đã hủy
              invoice_status: 3, // 3 = Đã hủy (database column)
              status: 'cancelled' // Also update general status
            });
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to cancel ${type} ${id}: ${errorText}`);
          }

          results.push({ orderKey, success: true });
        } catch (error) {
          console.error(`Error canceling ${type} ${id}:`, error);
          results.push({ orderKey, success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      console.log('Bulk cancel results:', results);

      // Count successful cancellations
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      // Close dialog
      setShowBulkCancelDialog(false);

      // Clear selections
      setSelectedOrderIds(new Set());

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

      // Update selected invoice if it was cancelled
      if (selectedInvoice) {
        const selectedOrderKey = `${selectedInvoice.type}-${selectedInvoice.id}`;
        const wasCancelled = results.find(r => r.orderKey === selectedOrderKey && r.success);
        if (wasCancelled) {
          setSelectedInvoice({
            ...selectedInvoice,
            invoiceStatus: 3,
            invoice_status: 3,
            displayStatus: 3,
            status: selectedInvoice.type === 'order' ? 'cancelled' : selectedInvoice.status
          });
          setIsEditing(false);
          setEditableInvoice(null);
        }
      }

      // Show success message
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
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest("POST", "/api/einvoice/publish", invoiceData);
      return response.json();
    },
    onSuccess: async (result, variables) => {
      console.log('✅ E-invoice published successfully:', result);

      if (result.success && selectedInvoice) {
        try {
          // Determine the correct API endpoint based on item type
          const updateEndpoint = getItemType(selectedInvoice) === 'order' 
            ? `/api/orders/${selectedInvoice.id}`
            : `/api/invoices/${selectedInvoice.id}`;

          // Map API response data properly
          const invoiceNo = result.data?.invoiceNo || result.invoiceNumber || null;
          const symbol = result.data?.symbol || result.symbol || 'AA/25E';
          const templateNumber = result.data?.templateNumber || result.templateNumber || '1C25TYY';

          // Prepare update data with proper field mapping
          const updateData = {
            einvoiceStatus: 1, // Đã phát hành
            invoiceStatus: 1, // Hoàn thành
            status: 'published',
            invoiceNumber: invoiceNo,
            symbol: symbol,
            templateNumber: templateNumber,
            tradeNumber: invoiceNo || selectedInvoice.tradeNumber || selectedInvoice.displayNumber
          };

          console.log('🔄 API Response data:', {
            success: result.success,
            data: result.data,
            invoiceNo: result.data?.invoiceNo,
            symbol: result.data?.symbol,
            templateNumber: result.data?.templateNumber
          });

          console.log('🔄 Updating item with data:', updateData);

          // Update invoice/order with published status and invoice details
          const updateResponse = await apiRequest("PUT", updateEndpoint, updateData);

          if (updateResponse.ok) {
            const updatedItem = await updateResponse.json();
            console.log('✅ Update response:', updatedItem);

            // Update local state
            setSelectedInvoice({
              ...selectedInvoice,
              einvoiceStatus: 1,
              invoiceStatus: 1,
              status: 'published',
              invoiceNumber: invoiceNo || selectedInvoice.invoiceNumber,
              symbol: symbol,
              templateNumber: templateNumber,
              tradeNumber: invoiceNo || selectedInvoice.tradeNumber
            });

            // Refresh data to ensure consistency
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

            console.log('✅ Invoice/Order updated successfully with published status');

            alert(`Hóa đơn điện tử đã được phát hành thành công!\nSố hóa đơn: ${invoiceNo || 'N/A'}\nKý hiệu: ${symbol || 'N/A'}`);
          } else {
            const errorText = await updateResponse.text();
            console.error('❌ Failed to update invoice/order:', {
              status: updateResponse.status,
              statusText: updateResponse.statusText,
              error: errorText,
              updateData: updateData
            });

            // Try to parse error as JSON for more details
            try {
              const errorJson = JSON.parse(errorText);
              console.error('❌ Detailed error:', errorJson);
              alert(`Hóa đơn đã phát hành nhưng không thể cập nhật trạng thái: ${errorJson.error || errorJson.message || 'Lỗi không xác định'}`);
            } catch (parseError) {
              alert(`Hóa đơn đã phát hành nhưng không thể cập nhật trạng thái: ${errorText || 'Lỗi kết nối database'}`);
            }
          }
        } catch (error) {
          console.error('❌ Error updating invoice/order after publish:', {
            error: error,
            message: error?.message,
            stack: error?.stack
          });

          const errorMessage = error?.message || error?.toString() || 'Lỗi không xác định';
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
            invoice_status: 3, // 3 = Đã hủy (database column)
            status: 'cancelled' // Also update general status
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
      case 'Đối trừ công nợ': // Assuming this might come from order data
        return "Đối trừ công nợ";
      default:
        return "Tiền mặt"; // Default to cash if unknown
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
        {statusLabels[status as keyof typeof statusColors] || "Không xác định"}
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
        {statusLabels[status as keyof typeof statusColors] || "Hoàn thành"}
      </Badge>
    );
  };

  // Combine invoices and orders data with safe array checks
  const combinedData = [
    ...(Array.isArray(invoices) ? invoices.map((invoice: Invoice) => ({
      ...invoice,
      type: 'invoice' as const,
      date: invoice.invoiceDate,
      displayNumber: invoice.tradeNumber || invoice.invoiceNumber || `INV-${String(invoice.id).padStart(13, '0')}`,
      displayStatus: invoice.invoiceStatus || 1,
      // Ensure all required fields are present
      customerName: invoice.customerName || 'Khách hàng lẻ',
      customerPhone: invoice.customerPhone || '',
      customerAddress: invoice.customerAddress || '',
      customerTaxCode: invoice.customerTaxCode || '',
      symbol: invoice.symbol || invoice.templateNumber || '',
      einvoiceStatus: invoice.einvoiceStatus || 0
    })) : []),
    ...(Array.isArray(orders) ? orders.map((order: Order) => ({
      ...order,
      type: 'order' as const,
      date: order.orderedAt,
      displayNumber: order.orderNumber || `ORD-${String(order.id).padStart(13, '0')}`,
      displayStatus: order.status === 'paid' ? 1 : order.status === 'pending' ? 2 : order.status === 'cancelled' ? 3 : 2,
      customerName: order.customerName || 'Khách hàng lẻ',
      invoiceStatus: order.status === 'paid' ? 1 : order.status === 'pending' ? 2 : order.status === 'cancelled' ? 3 : 2,
      // Map order fields to invoice-like fields for consistency
      customerPhone: '',
      customerAddress: '',
      customerTaxCode: '',
      symbol: order.symbol || order.templateNumber || '',
      invoiceNumber: order.invoiceNumber || '',
      tradeNumber: order.orderNumber || '',
      invoiceDate: order.orderedAt,
      einvoiceStatus: order.einvoiceStatus || 0
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

  const formatCurrency = (amount: string | number | undefined | null): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }
    // Always round to integer and format without decimals
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

  const updateEditableInvoiceField = (field: keyof Invoice | 'orderedAt' | 'orderNumber' | 'customerName' | 'customerPhone' | 'customerAddress' | 'symbol' | 'invoiceNumber' | 'notes', value: any) => {
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

  // Helper functions for checkbox selection
  const handleSelectOrder = (orderId: number, orderType: string, checked: boolean) => {
    const orderKey = `${orderType}-${orderId}`;
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
      const allOrderKeys = filteredInvoices.map(item => `${item.type}-${item.id}`);
      setSelectedOrderIds(new Set(allOrderKeys));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const isOrderSelected = (orderId: number, orderType: string) => {
    return selectedOrderIds.has(`${orderType}-${orderId}`);
  };

  const isAllSelected = filteredInvoices.length > 0 && selectedOrderIds.size === filteredInvoices.length;
  const isIndeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < filteredInvoices.length;

  // Function to export selected orders to Excel
  const exportSelectedOrdersToExcel = () => {
    if (selectedOrderIds.size === 0) {
      alert('Vui lòng chọn ít nhất một đơn hàng để xuất Excel');
      return;
    }

    // Get selected orders
    const selectedOrders = filteredInvoices.filter(item => 
      selectedOrderIds.has(`${item.type}-${item.id}`)
    );

    // Create workbook first
    const wb = XLSX.utils.book_new();

    // Create worksheet with empty data first
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Set default font for entire sheet
    ws['!defaultFont'] = { name: 'Times New Roman', sz: 11 };

    // Add title row (A1)
    XLSX.utils.sheet_add_aoa(ws, [['DANH SÁCH ĐƠN HÀNG BÁN']], { origin: 'A1' });

    // Merge title cells A1:O1
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } });

    // Add empty row for spacing
    XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 'A2' });

    // Add header row at A3
    const headers = [
      'Số đơn bán', 'Ngày đơn bán', 'Bàn', 'Mã khách hàng', 'Tên khách hàng',
      'Thành tiền', 'Giảm giá', 'Tiền thuế', 'Đã thanh toán',
      'Mã nhân viên', 'Tên nhân viên', 'Ký hiệu hóa đơn', 'Số hóa đơn', 'Ghi chú', 'Trạng thái'
    ];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A3' });

    // Add data rows starting from A4
    const dataRows = selectedOrders.map((item, index) => {
      const orderNumber = item.tradeNumber || item.invoiceNumber || item.orderNumber || `DB${new Date().getFullYear()}${String(item.id).padStart(6, '0')}`;
      const orderDate = formatDate(item.date);
      // Only show table info for orders, leave empty for invoices
      const table = item.type === 'order' && item.tableId ? `Bàn ${item.tableId}` : '';
      const customerCode = item.customerTaxCode || `KH000${String(index + 1).padStart(3, '0')}`;
      const customerName = item.customerName || 'Khách lẻ';
      const subtotal = parseFloat(item.subtotal || '0');
      const discount = 0;
      const tax = parseFloat(item.tax || '0');
      const total = parseFloat(item.total || '0');
      const paid = total;
      const employeeCode = item.employeeId || 'NV0001';
      const employeeName = 'Phạm Vân Duy';
      const symbol = item.symbol || '';
      const invoiceNumber = item.invoiceNumber || String(item.id).padStart(8, '0');
      const status = item.displayStatus === 1 ? 'Đã hoàn thành' : 
                   item.displayStatus === 2 ? 'Đang phục vụ' : 'Đã hủy';

      return [
        orderNumber, orderDate, table, customerCode, customerName,
        subtotal, discount, tax, paid,
        employeeCode, employeeName, symbol, invoiceNumber, item.notes || '', status
      ];
    });

    XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A4' });

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 13 }, { wch: 8 }, { wch: 12 }, { wch: 15 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 }
    ];

    // Set row heights
    ws['!rows'] = [
      { hpt: 25 }, // Title row
      { hpt: 15 }, // Empty row  
      { hpt: 20 }, // Header row
      ...Array(selectedOrders.length).fill({ hpt: 18 }) // Data rows
    ];

    // Apply styles to all cells
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:O1');

    // Style title cell (A1)
    if (ws['A1']) {
      ws['A1'].s = {
        font: { name: 'Times New Roman', sz: 16, bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }
      };
    }

    // Style header row (row 3)
    for (let col = 0; col <= 14; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { patternType: 'solid', fgColor: { rgb: '92D050' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }

    // Style data rows (starting from row 4)
    for (let row = 3; row < 3 + selectedOrders.length; row++) {
      const isEven = (row - 3) % 2 === 0;
      const bgColor = isEven ? 'FFFFFF' : 'F2F2F2';

      for (let col = 0; col <= 14; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const isCurrency = [5, 6, 7, 8].includes(col); // Columns F, G, H, I

        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
            fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
            alignment: { 
              horizontal: isCurrency ? 'right' : 'center', 
              vertical: 'center' 
            },
            border: {
              top: { style: 'thin', color: { rgb: 'BFBFBF' } },
              bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
              left: { style: 'thin', color: { rgb: 'BFBFBF' } },
              right: { style: 'thin', color: { rgb: 'BFBFBF' } }
            }
          };

          // Apply number format for currency columns
          if (isCurrency && typeof ws[cellAddress].v === 'number') {
            ws[cellAddress].z = '#,##0';
          }
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách đơn hàng');

    // Set workbook properties
    wb.Props = {
      Title: "Danh sách đơn hàng bán",
      Subject: "Báo cáo đơn hàng", 
      Author: "EDPOS System",
      CreatedDate: new Date()
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const defaultFilename = `danh-sach-don-hang-ban_${timestamp}.xlsx`;

    // Write file with proper options for styling
    try {
      XLSX.writeFile(wb, defaultFilename, { 
        bookType: 'xlsx',
        cellStyles: true,
        sheetStubs: false,
        compression: true
      });

      console.log('✅ Excel file exported successfully with Times New Roman formatting');
      alert('File Excel đã được xuất thành công với định dạng Times New Roman!');
    } catch (error) {
      console.error('❌ Error exporting Excel file:', error);
      // Fallback export without advanced formatting
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
                      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                    }}>
                      Thử lại
                    </Button>
                  </div>
                ) : (
                  <div>
                    {/* Table with horizontal scroll similar to settings page */}
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
                          <th className="w-[60px] px-3 py-3 text-left font-medium text-sm text-gray-600">
                            <div className="leading-tight">Bàn</div>
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
                        {filteredInvoices.length === 0 ? (
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
                      filteredInvoices.map((item, index) => {
                            const customerCode = item.customerTaxCode || `KH000${String(index + 1).padStart(3, '0')}`;
                            const discount = 0; // Giảm giá mặc định là 0
                            const tax = parseFloat(item.tax || '0');
                            const subtotal = parseFloat(item.subtotal || '0');
                            const total = parseFloat(item.total || '0');
                            const paid = total; // Đã thanh toán = tổng tiền
                            const employeeCode = item.employeeId || 'NV0001';
                            const employeeName = 'Phạm Vân Duy';
                            const symbol = item.symbol || '';
                            const invoiceNumber = item.invoiceNumber || String(item.id).padStart(8, '0');
                            const notes = item.notes || '';

                            // Lấy symbol từ dữ liệu gốc của item
                            const itemSymbol = item.symbol || item.templateNumber || '';

                            return (
                              <>
                                <tr
                                  key={`${item.type}-${item.id}`}
                                  className={`hover:bg-gray-50 ${
                                    selectedInvoice?.id === item.id && selectedInvoice?.type === item.type ? 'bg-blue-100' : ''
                                  }`}
                                  onClick={() => {
                                    const itemWithType = {
                                      ...item,
                                      type: item.type || (item.orderNumber ? 'order' : 'invoice')
                                    };
                                    setSelectedInvoice(itemWithType);
                                  }}
                                >
                                  <td className="px-3 py-3 text-center">
                                    <Checkbox
                                      checked={isOrderSelected(item.id, item.type)}
                                      onCheckedChange={(checked) => handleSelectOrder(item.id, item.type, checked as boolean)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="font-medium truncate" title={item.displayNumber}>
                                      {item.displayNumber}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm truncate">
                                      {formatDate(item.date)}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm">
                                      {getItemType(item) === 'order' && item.tableId ? `Bàn ${item.tableId}` : ''}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm font-mono truncate" title={customerCode}>
                                      {customerCode}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm truncate" title={item.customerName || 'Khách hàng lẻ'}>
                                      {item.customerName || 'Khách hàng lẻ'}
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
                                      {itemSymbol || '-'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm font-mono">
                                      {/* Hiển thị invoice_number từ bảng orders nếu có, nếu không có thì để trống */}
                                      {item.type === 'order' 
                                        ? (item.invoiceNumber || '') 
                                        : invoiceNumber}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm truncate" title={notes || '-'}>
                                      {notes || '-'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {getInvoiceStatusBadge(item.displayStatus)}
                                  </td>
                                </tr>
                                {/* Detail row for selected invoice - shown inline under selected row */}
                                {selectedInvoice && selectedInvoice.id === item.id && selectedInvoice.type === item.type && (
                                  <tr>
                                    <td colSpan={16} className="p-0">
                                      <div className="p-4 border-l-4 border-blue-500 bg-gray-50">
                                        <Card className="shadow-lg">
                                          <CardHeader className="pb-3">
                                            <CardTitle className="text-lg text-blue-700">Chi tiết đơn hàng</CardTitle>
                                          </CardHeader>
                                          <CardContent className="space-y-4">
                                            {/* Invoice Info */}
                                            <div className="bg-white p-4 rounded-lg overflow-x-auto">
                                              <div className="min-w-[1200px]">
                                                <table className="w-full text-sm border-collapse">
                                                  <tbody>
                                                    <tr>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Số đơn bán:</td>
                                                      <td className="py-1 pr-6 text-blue-600 font-medium">
                                                        {isEditing && editableInvoice ? (
                                                          <Input 
                                                            value={editableInvoice.tradeNumber || editableInvoice.invoiceNumber || editableInvoice.orderNumber || ''}
                                                            onChange={(e) => updateEditableInvoiceField(getItemType(selectedInvoice) === 'order' ? 'orderNumber' : 'tradeNumber', e.target.value)}
                                                            className="w-32"
                                                          />
                                                        ) : (
                                                          selectedInvoice.displayNumber
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Ngày:</td>
                                                      <td className="py-1 pr-6">
                                                        {isEditing && editableInvoice ? (
                                                          <Input 
                                                            type="date"
                                                            value={(editableInvoice.invoiceDate || editableInvoice.orderedAt)?.split('T')[0]}
                                                            onChange={(e) => updateEditableInvoiceField(getItemType(selectedInvoice) === 'order' ? 'orderedAt' : 'invoiceDate', e.target.value)}
                                                            className="w-32"
                                                          />
                                                        ) : (
                                                          formatDate(selectedInvoice.date)
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Khách hàng:</td>
                                                      <td className="py-1 pr-6 text-blue-600 font-medium">
                                                        {isEditing && editableInvoice ? (
                                                          <Input 
                                                            value={editableInvoice.customerName}
                                                            onChange={(e) => updateEditableInvoiceField('customerName', e.target.value)}
                                                            className="w-40"
                                                          />
                                                        ) : (
                                                          selectedInvoice.customerName
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Điện thoại:</td>
                                                      <td className="py-1 pr-6">
                                                        {isEditing && editableInvoice ? (
                                                          <Input 
                                                            value={editableInvoice.customerPhone || ''}
                                                            onChange={(e) => updateEditableInvoiceField('customerPhone', e.target.value)}
                                                            className="w-32"
                                                          />
                                                        ) : (
                                                          selectedInvoice.customerPhone || '-'
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Trạng thái:</td>
                                                      <td className="py-1">{getInvoiceStatusBadge(selectedInvoice.displayStatus)}</td>
                                                    </tr>
                                                    <tr>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Thu ngân:</td>
                                                      <td className="py-1 pr-6">Nguyễn Văn A</td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Hình thức bán:</td>
                                                      <td className="py-1 pr-6">{getItemType(selectedInvoice) === 'order' ? 'Bán tại bàn' : 'Bán tại cửa hàng'}</td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Bàn:</td>
                                                      <td className="py-1 pr-6">{getItemType(selectedInvoice) === 'order' && selectedInvoice.tableId ? `Tầng 2 - Bàn ${selectedInvoice.tableId}` : '-'}</td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Ký hiệu hóa đơn:</td>
                                                      <td className="py-1 pr-6">
                                                        {isEditing && editableInvoice ? (
                                                          <Input 
                                                            value={editableInvoice.symbol || ''}
                                                            onChange={(e) => updateEditableInvoiceField('symbol', e.target.value)}
                                                            className="w-24"
                                                          />
                                                        ) : (
                                                          selectedInvoice.einvoiceStatus !== 0 ? (selectedInvoice.symbol || '') : '-'
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Số hóa đơn:</td>
                                                      <td className="py-1 pr-6">
                                                        {isEditing && editableInvoice ? (
                                                          <Input 
                                                            value={editableInvoice.invoiceNumber || ''}
                                                            onChange={(e) => updateEditableInvoiceField('invoiceNumber', e.target.value)}
                                                            className="w-32"
                                                          />
                                                        ) : (
                                                          selectedInvoice.invoiceNumber || String(selectedInvoice.id).padStart(8, '0')
                                                        )}
                                                      </td>
                                                      <td className="py-1 pr-4 font-medium whitespace-nowrap">Trạng thái HĐ:</td>
                                                      <td className="py-1">{getEInvoiceStatusBadge(selectedInvoice.einvoiceStatus || 0)}</td>
                                                    </tr>
                                                  </tbody>
                                                </table>
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
                                                  const items = getItemType(selectedInvoice) === 'order' ? orderItems : invoiceItems;
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
                                                  {(() => {
                                                    const subtotal = parseFloat(selectedInvoice.subtotal || '0');
                                                    const tax = parseFloat(selectedInvoice.tax || '0');
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
                                                          <span>Thuế suất (10%) Thuế GTGT:</span>
                                                          <span className="font-bold">{formatCurrency(tax)}</span>
                                                        </div>
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                                <div className="space-y-2">
                                                  {(() => {
                                                    const isPaid = selectedInvoice.displayStatus === 1 || 
                                                                  selectedInvoice.status === 'paid' || 
                                                                  selectedInvoice.paymentStatus === 'paid';
                                                    const paidAmount = isPaid ? parseFloat(selectedInvoice.total || '0') : 0;
                                                    const paymentMethod = selectedInvoice.paymentMethod;

                                                    return (
                                                      <>
                                                        <div className="flex justify-between">
                                                          <span>Khách hàng trả:</span>
                                                          <span className="font-bold">{formatCurrency(paidAmount)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span>Tiền mặt:</span>
                                                          <span className="font-bold">
                                                            {isPaid && paymentMethod === 1 ? formatCurrency(paidAmount) : '0'}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span>Chuyển khoản:</span>
                                                          <span className="font-bold">
                                                            {isPaid && paymentMethod === 2 ? formatCurrency(paidAmount) : '0'}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span>QR Code InfoCAMS:</span>
                                                          <span className="font-bold">
                                                            {isPaid && paymentMethod === 3 ? formatCurrency(paidAmount) : '0'}
                                                          </span>
                                                        </div>
                                                      </>
                                                    );
                                                  })()}
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
                                                <>
                                                  <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                                                    onClick={handleEditInvoice}
                                                  >
                                                    <FileText className="w-4 h-4" />
                                                    Sửa đơn
                                                  </Button>
                                                  <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="flex items-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => {
                                                      if (selectedInvoice) {
                                                        console.log('Opening E-invoice modal for invoice:', selectedInvoice?.id);
                                                        console.log('Selected invoice data:', selectedInvoice);
                                                        setShowEInvoiceModal(true);
                                                      }
                                                    }}
                                                    disabled={selectedInvoice?.einvoiceStatus !== 0}
                                                  >
                                                    <Mail className="w-4 h-4" />
                                                    Phát hành
                                                  </Button>
                                                </>
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
                    {/* Pagination controls */}
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Số hàng mỗi trang:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(parseInt(e.target.value, 10));
                            setCurrentPage(1); // Reset to first page on items per page change
                          }}
                          className="border rounded p-1 text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Trước
                        </Button>
                        <span className="text-sm text-gray-600">
                          Trang {currentPage} / {Math.ceil(filteredInvoices.length / itemsPerPage) || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredInvoices.length / itemsPerPage) || 1))}
                          disabled={currentPage >= (Math.ceil(filteredInvoices.length / itemsPerPage) || 1)}
                        >
                          Sau
                        </Button>
                      </div>
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
          </div>
        </div>
      </div>

      {/* Bulk Cancel Orders Confirmation Dialog */}
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
                const orderKeys = Array.from(selectedOrderIds);
                bulkCancelOrdersMutation.mutate(orderKeys);
              }}
              disabled={bulkCancelOrdersMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkCancelOrdersMutation.isPending ? 'Đang hủy...' : `Hủy ${selectedOrderIds.size} đơn`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* E-Invoice Modal */}
      {selectedInvoice && showEInvoiceModal && (
        <EInvoiceModal
          isOpen={showEInvoiceModal}
          onClose={() => setShowEInvoiceModal(false)}
          onConfirm={async (invoiceResult) => {
            console.log('E-invoice published successfully:', invoiceResult);

            if (invoiceResult.success && selectedInvoice) {
              try {
                // Determine the correct API endpoint based on item type
                const updateEndpoint = getItemType(selectedInvoice) === 'order' 
                  ? `/api/orders/${selectedInvoice.id}`
                  : `/api/invoices/${selectedInvoice.id}`;

                // Prepare update data with all required fields from API response
                const updateData = {
                  einvoiceStatus: invoiceResult.einvoiceStatus || 1, // Đã phát hành
                  invoiceStatus: invoiceResult.invoiceStatus || 1, // Hoàn thành
                  status: invoiceResult.status || 'published',
                  invoiceNumber: invoiceResult.invoiceNumber || null,
                  symbol: invoiceResult.symbol || selectedInvoice.symbol,
                  templateNumber: invoiceResult.templateNumber || selectedInvoice.templateNumber
                };

                // For orders, also update tradeNumber
                if (getItemType(selectedInvoice) === 'order') {
                  updateData.tradeNumber = invoiceResult.invoiceNumber || selectedInvoice.tradeNumber;
                } else {
                  // For invoices, update tradeNumber as well
                  updateData.tradeNumber = invoiceResult.invoiceNumber || selectedInvoice.tradeNumber;
                }

                console.log('🔄 Updating item with data:', updateData);

                // Update invoice/order with published status and invoice details
                const updateResponse = await apiRequest("PUT", updateEndpoint, updateData);

                if (updateResponse.ok) {
                  // Update local state (keep tradeNumber unchanged)
                  setSelectedInvoice({
                    ...selectedInvoice,
                    einvoiceStatus: 1,
                    invoiceStatus: 1,
                    status: 'published',
                    invoiceNumber: result.data?.invoiceNo || selectedInvoice.invoiceNumber
                    // tradeNumber giữ nguyên
                  });

                  // Refresh data to ensure consistency
                  queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

                  console.log('✅ Invoice/Order updated successfully with published status');

                  alert(`Hóa đơn điện tử đã được phát hành thành công!\nSố hóa đơn: ${result.data?.invoiceNo || 'N/A'}\nKý hiệu: ${updateData.symbol || 'N/A'}`);
                } else {
                  const errorText = await updateResponse.text();
                  console.error('❌ Failed to update invoice/order:', errorText);
                  alert('Hóa đơn đã phát hành nhưng không thể cập nhật trạng thái trong hệ thống');
                }
              } catch (error) {
                console.error('❌ Error updating invoice/order after publish:', error);
                alert('Hóa đơn đã phát hành nhưng không thể cập nhật trạng thái');
              }
            }

            setShowEInvoiceModal(false);
          }}
          total={(() => {
            if (!selectedInvoice) return 0;

            // Calculate total including tax
            const subtotal = parseFloat(selectedInvoice.subtotal || '0');
            const tax = parseFloat(selectedInvoice.tax || '0');
            return Math.round(subtotal + tax);
          })()}
          cartItems={(() => {
            // Get items for this invoice/order
            const items = getItemType(selectedInvoice) === 'order' ? orderItems : invoiceItems;

            if (!items || items.length === 0) {
              return [];
            }

            return items.map((item: any) => ({
              id: item.id,
              name: item.productName,
              price: parseFloat(item.unitPrice || '0'),
              quantity: item.quantity,
              sku: `SP${String(item.productId).padStart(3, '0')}`,
              taxRate: parseFloat(item.taxRate || '10')
            }));
          })()}
          selectedPaymentMethod="cash"
        />
      )}

      {/* Publish Invoice Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-blue-600">Phát hành hóa đơn điện tử</AlertDialogTitle>
            <div className="text-sm text-gray-600">
              Đơn hàng: {selectedInvoice?.displayNumber} - {selectedInvoice?.customerName}
            </div>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Thông tin nhà cung cấp hóa đơn điện tử</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn vị HĐĐT</label>
                  <div className="p-2 bg-white rounded border">EasyInvoice</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mẫu số Hóa đơn GTGT</label>
                  <div className="p-2 bg-white rounded border">1C25TYY</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Thông tin khách hàng</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mã số thuế</label>
                  <div className="p-2 bg-white rounded border">{selectedInvoice.customerTaxCode || '0123456789'}</div>
                </div>
                <div className="flex items-center">
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-500">
                    Lấy thông tin
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên đơn vị</label>
                  <div className="p-2 bg-white rounded border">{selectedInvoice.customerName || 'Khách hàng lẻ'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số CMND/CCCD</label>
                  <div className="p-2 bg-white rounded border">{selectedInvoice.customerPhone || selectedInvoice.customerTaxCode || '0123456789'}</div>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <div className="p-2 bg-white rounded border">{selectedInvoice.customerAddress || 'Cầu Giấy, Hà Nội'}</div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Email</label>
                <div className="p-2 bg-white rounded border">{selectedInvoice.customerEmail || 'ngocnv@gmail.com'}</div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium mb-3">Danh sách sản phẩm</h4>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Tên sản phẩm</th>
                      <th className="text-center p-2">SL</th>
                      <th className="text-right p-2">Đơn giá</th>
                      <th className="text-right p-2">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const items = getItemType(selectedInvoice) === 'order' ? orderItems : invoiceItems;
                      if (!items || items.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="text-center p-4 text-gray-500">
                              Không có sản phẩm nào
                            </td>
                          </tr>
                        );
                      }
                      return items.map((item: any, index: number) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2">{item.productName}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Thành tiền:</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.subtotal || 0)} ₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Thuế GTGT (10%):</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.tax || 0)} ₫</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Tổng tiền hóa đơn:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(selectedInvoice.total || 0)} ₫
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                Hiện bản phím ảo
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <div className="flex gap-2 w-full">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (selectedInvoice) {
                    // Generate a new GUID for transactionID
                    const generateGuid = () => {
                      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                        /[xy]/g,
                        function (c) {
                          const r = (Math.random() * 16) | 0;
                          const v = c === "x" ? r : (r & 0x3) | 0x8;
                          return v.toString(16);
                        },
                      );
                    };

                    // Get items for this invoice/order
                    const items = getItemType(selectedInvoice) === 'order' ? orderItems : invoiceItems;

                    if (!items || items.length === 0) {
                      alert('Không có sản phẩm nào để phát hành hóa đơn');
                      return;
                    }

                    // Calculate totals from items
                    const subtotal = parseFloat(selectedInvoice.subtotal || '0');
                    const tax = parseFloat(selectedInvoice.tax || '0');
                    const total = parseFloat(selectedInvoice.total || '0');

                    console.log('Publishing invoice with data:', {
                      invoiceId: selectedInvoice.id,
                      type: selectedInvoice.type,
                      subtotal,
                      tax,
                      total,
                      itemsCount: items.length
                    });

                    // Prepare publish request
                    const publishRequest = {
                      login: {
                        providerId: 1,
                        url: "https://infoerpvn.com:9440",
                        ma_dvcs: "0316578736",
                        username: "0316578736",
                        password: "123456a@",
                        tenantId: "",
                      },
                      transactionID: generateGuid(),
                      invRef: selectedInvoice.displayNumber || `INV-${Date.now()}`,
                      invSubTotal: Math.round(subtotal),
                      invVatRate: 10,
                      invVatAmount: Math.round(tax),
                      invDiscAmount: 0,
                      invTotalAmount: Math.round(total),
                      paidTp: "TM",
                      note: selectedInvoice.notes || "",
                      hdNo: "",
                      createdDate: new Date().toISOString(),
                      clsfNo: "01GTKT0/001",
                      spcfNo: "1C25TYY",
                      templateCode: "1C25TYY",
                      buyerNotGetInvoice: 0,
                      exchCd: "VND",
                      exchRt: 1,
                      bankAccount: "",
                      bankName: "",
                      customer: {
                        custCd: selectedInvoice.customerTaxCode || "",
                        custNm: selectedInvoice.customerName || "Khách hàng lẻ",
                        custCompany: selectedInvoice.customerName || "Khách hàng lẻ",
                        taxCode: selectedInvoice.customerTaxCode || "",
                        custCity: "",
                        custDistrictName: "",
                        custAddrs: selectedInvoice.customerAddress || "",
                        custPhone: selectedInvoice.customerPhone || "",
                        custBankAccount: "",
                        custBankName: "",
                        email: selectedInvoice.customerEmail || "",
                        emailCC: "",
                      },
                      products: items.map((item: any) => {
                        const itemPrice = parseFloat(item.unitPrice);
                        const itemQuantity = item.quantity;
                        const itemTaxRate = parseFloat(item.taxRate || "10");
                        const itemSubtotal = itemPrice * itemQuantity;
                        const itemTax = (itemSubtotal * itemTaxRate) / 100;
                        const itemTotal = itemSubtotal + itemTax;

                        return {
                          itmCd: `SP${String(item.productId).padStart(3, '0')}`,
                          itmName: item.productName,
                          itmKnd: 1,
                          unitNm: "Cái",
                          qty: itemQuantity,
                          unprc: itemPrice,
                          amt: Math.round(itemSubtotal),
                          discRate: 0,
                          discAmt: 0,
                          vatRt: itemTaxRate.toString(),
                          vatAmt: Math.round(itemTax),
                          totalAmt: Math.round(itemTotal),
                        };
                      }),
                    };

                    // Close dialog first
                    setShowPublishDialog(false);

                    // Call publish API
                    publishRequestMutation.mutate(publishRequest);
                  }
                }}
                disabled={publishRequestMutation.isPending}
              >
                <Mail className="w-4 h-4 mr-2" />
                {publishRequestMutation.isPending ? 'Đang phát hành...' : 'Phát hành'}
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-gray-500 text-gray-600"
                onClick={() => setShowPublishDialog(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Hủy bỏ
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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