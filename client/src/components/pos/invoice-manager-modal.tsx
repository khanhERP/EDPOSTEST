
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, Trash2, Calendar, User, DollarSign, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Invoice {
  id: number;
  invoiceNumber: string;
  transactionNumber?: string;
  cashierName?: string;
  customerId?: number;
  customerName: string;
  customerTaxCode?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;</old_str>
  subtotal: string;
  tax: string;
  total: string;
  paymentMethod: string;
  invoiceDate: string;
  status: string;
  einvoiceStatus: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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

interface InvoiceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceManagerModal({ isOpen, onClose }: InvoiceManagerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: isOpen,
  });

  // Fetch invoice items for selected invoice
  const { data: invoiceItems = [], isLoading: isLoadingItems } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoice-items", selectedInvoice?.id],
    enabled: !!selectedInvoice?.id,
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Hóa đơn đã được xóa thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setShowInvoiceDetails(false);
      setSelectedInvoice(null);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa hóa đơn",
        variant: "destructive",
      });
    },
  });

  // Filter invoices based on search query
  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (invoice.customerTaxCode && invoice.customerTaxCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get status badge color and text
  const getStatusBadge = (status: string, einvoiceStatus: number) => {
    if (status === "draft") {
      return <Badge variant="secondary">Nháp</Badge>;
    }
    
    switch (einvoiceStatus) {
      case 0: return <Badge variant="outline">Chưa phát hành</Badge>;
      case 1: return <Badge variant="default" className="bg-green-500">Đã phát hành</Badge>;
      case 2: return <Badge variant="secondary">Tạo nháp</Badge>;
      case 3: return <Badge variant="default" className="bg-blue-500">Đã duyệt</Badge>;
      case 4: return <Badge variant="destructive">Đã bị thay thế (hủy)</Badge>;
      case 10: return <Badge variant="destructive">Đã hủy</Badge>;
      default: return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (confirm(`Bạn có chắc chắn muốn xóa hóa đơn ${invoice.invoiceNumber}?`)) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showInvoiceDetails} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Quản lý hóa đơn
            </DialogTitle>
            <DialogDescription>
              Quản lý tất cả hóa đơn điện tử đã tạo trong hệ thống
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Tìm kiếm theo số hóa đơn, tên khách hàng hoặc mã số thuế..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Invoice Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tổng hóa đơn</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{invoices.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Đã phát hành</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {invoices.filter(inv => inv.einvoiceStatus === 1).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Chưa phát hành</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {invoices.filter(inv => inv.einvoiceStatus === 0).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tổng giá trị</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('vi-VN').format(
                      invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
                    )} ₫
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoices Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Số hóa đơn</TableHead>
                    <TableHead>Số giao dịch</TableHead>
                    <TableHead>Thu ngân</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Mã số thuế</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Phương thức TT</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader></old_str>
                <TableBody>
                  {isLoadingInvoices ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        Đang tải...
                      </TableCell>
                    </TableRow></old_str>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        {searchQuery ? "Không tìm thấy hóa đơn nào" : "Chưa có hóa đơn nào"}
                      </TableCell>
                    </TableRow>
                  ) : (</old_str>
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {invoice.transactionNumber || "N/A"}
                        </TableCell>
                        <TableCell>
                          {invoice.cashierName || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.customerName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {invoice.customerTaxCode || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-[200px] truncate" title={invoice.customerAddress || "N/A"}>
                            {invoice.customerAddress || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.createdAt), "dd/MM/yyyy HH:mm")}
                        </TableCell></old_str>
                        <TableCell>
                          {new Intl.NumberFormat('vi-VN').format(parseFloat(invoice.total))} ₫
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status, invoice.einvoiceStatus)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {invoice.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(invoice)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Modal */}
      <Dialog open={showInvoiceDetails} onOpenChange={() => setShowInvoiceDetails(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hóa đơn {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Thông tin khách hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tên khách hàng</label>
                    <p className="font-medium">{selectedInvoice.customerName}</p>
                  </div>
                  {selectedInvoice.customerTaxCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã số thuế</label>
                      <p className="font-medium">{selectedInvoice.customerTaxCode}</p>
                    </div>
                  )}
                  {selectedInvoice.customerPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Số điện thoại</label>
                      <p className="font-medium">{selectedInvoice.customerPhone}</p>
                    </div>
                  )}
                  {selectedInvoice.customerEmail && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="font-medium">{selectedInvoice.customerEmail}</p>
                    </div>
                  )}
                  {selectedInvoice.customerAddress && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Địa chỉ</label>
                      <p className="font-medium">{selectedInvoice.customerAddress}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoice Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Thông tin hóa đơn
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Số hóa đơn</label>
                    <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ngày tạo</label>
                    <p className="font-medium">
                      {format(new Date(selectedInvoice.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedInvoice.status, selectedInvoice.einvoiceStatus)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phương thức thanh toán</label>
                    <p className="font-medium capitalize">{selectedInvoice.paymentMethod}</p>
                  </div>
                  {selectedInvoice.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Ghi chú</label>
                      <p className="font-medium">{selectedInvoice.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoice Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Chi tiết sản phẩm
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead className="text-center">Số lượng</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-center">Thuế suất</TableHead>
                        <TableHead className="text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingItems ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Đang tải...
                          </TableCell>
                        </TableRow>
                      ) : invoiceItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Không có sản phẩm nào
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoiceItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('vi-VN').format(parseFloat(item.unitPrice))} ₫
                            </TableCell>
                            <TableCell className="text-center">{item.taxRate}%</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('vi-VN').format(parseFloat(item.total))} ₫
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Tạm tính:</span>
                      <span>{new Intl.NumberFormat('vi-VN').format(parseFloat(selectedInvoice.subtotal))} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thuế:</span>
                      <span>{new Intl.NumberFormat('vi-VN').format(parseFloat(selectedInvoice.tax))} ₫</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Tổng cộng:</span>
                      <span>{new Intl.NumberFormat('vi-VN').format(parseFloat(selectedInvoice.total))} ₫</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInvoiceDetails(false)}>
                  Đóng
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteInvoice(selectedInvoice)}
                  disabled={deleteInvoiceMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteInvoiceMutation.isPending ? "Đang xóa..." : "Xóa hóa đơn"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
