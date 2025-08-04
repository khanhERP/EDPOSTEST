import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eInvoiceData?: any) => void;
  total: number;
  cartItems?: any[];
}

export function EInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  cartItems = []
}: EInvoiceModalProps) {
  const [formData, setFormData] = useState({
    invoiceProvider: "",
    invoiceTemplate: "",
    taxCode: "",
    customerName: "",
    address: "",
    phoneNumber: "",
    email: "",
    recipientName: ""
  });

  // Fetch E-invoice connections
  const { data: eInvoiceConnections = [] } = useQuery<any[]>({
    queryKey: ["/api/einvoice-connections"],
    enabled: isOpen
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        invoiceProvider: "",
        invoiceTemplate: "",
        taxCode: "",
        customerName: "",
        address: "",
        phoneNumber: "",
        email: "",
        recipientName: ""
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfirm = () => {
    // Validate required fields
    if (!formData.invoiceProvider || !formData.taxCode || !formData.customerName) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    onConfirm(formData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-700 bg-blue-100 p-3 rounded-t-lg">
            Phát hành hóa đơn điện tử
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* E-invoice Provider Information */}
          <div>
            <h3 className="text-base font-medium mb-4">Thông tin nhà cung cấp hóa đơn điện tử</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceProvider">Đơn vị HĐĐT</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.invoiceProvider}
                    onValueChange={(value) => handleInputChange("invoiceProvider", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đơn vị HĐĐT" />
                    </SelectTrigger>
                    <SelectContent>
                      {eInvoiceConnections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.softwareName}>
                          {connection.softwareName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="invoiceTemplate">Mẫu số Hóa đơn GTGT</Label>
                <div className="flex gap-2">
                  <Input
                    id="invoiceTemplate"
                    value={formData.invoiceTemplate}
                    onChange={(e) => handleInputChange("invoiceTemplate", e.target.value)}
                    placeholder="1C25TYY"
                  />
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="text-base font-medium mb-4">Thông tin khách hàng</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxCode">Mã số thuế</Label>
                <Input
                  id="taxCode"
                  value={formData.taxCode}
                  onChange={(e) => handleInputChange("taxCode", e.target.value)}
                  placeholder="0102222333-001"
                />
              </div>
              <div>
                <Label htmlFor="customerName">Tên đơn vị</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange("customerName", e.target.value)}
                  placeholder="Công ty TNHH ABC"
                />
              </div>
              <div>
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Cầu Giấy, Hà Nội"
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Số CMND/CCCD</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  placeholder="0123456789"
                />
              </div>
              <div>
                <Label htmlFor="recipientName">Người nhận HĐ</Label>
                <Input
                  id="recipientName"
                  value={formData.recipientName}
                  onChange={(e) => handleInputChange("recipientName", e.target.value)}
                  placeholder="Nguyễn Văn Ngọc"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="ngocnv@gmail.com"
                />
              </div>
            </div>
          </div>

          {/* Total Amount Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Tổng tiền hóa đơn:</span>
              <span className="text-lg font-bold text-blue-600">
                {total.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <span className="mr-2">✅</span>
              Phát hành
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              <span className="mr-2">❌</span>
              Hủy bỏ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}