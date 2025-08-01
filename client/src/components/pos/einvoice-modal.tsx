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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// E-invoice software providers mapping
const EINVOICE_PROVIDERS = [
  { name: "EasyInvoice", value: "1" },
  { name: "VnInvoice", value: "2" },
  { name: "FptInvoice", value: "3" },
  { name: "MifiInvoice", value: "4" },
  { name: "EHoaDon", value: "5" },
  { name: "BkavInvoice", value: "6" },
  { name: "MInvoice", value: "7" },
  { name: "SInvoice", value: "8" },
  { name: "WinInvoice", value: "9" },
];

interface EInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eInvoiceData: any) => void;
  total: number;
  cartItems?: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    taxRate?: number;
  }>;
}

export function EInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  cartItems = [],
}: EInvoiceModalProps) {
  const [formData, setFormData] = useState({
    invoiceProvider: "",
    invoiceTemplate: "",
    taxCode: "",
    customerName: "",
    address: "",
    phoneNumber: "",
    email: "",
    recipientName: "",
  });

  // Fetch E-invoice connections
  const { data: eInvoiceConnections = [] } = useQuery<any[]>({
    queryKey: ["/api/einvoice-connections"],
    enabled: isOpen,
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
        recipientName: "",
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConfirm = async () => {
    // Debug logging
    console.log("Cart items received in E-invoice modal:", cartItems);
    console.log("Number of cart items:", cartItems?.length || 0);
    
    // Validate required fields
    if (
      !formData.invoiceProvider ||
      !formData.taxCode ||
      !formData.customerName
    ) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    // Validate that we have products
    if (!cartItems || cartItems.length === 0) {
      alert("Không có sản phẩm nào để tạo hóa đơn");
      return;
    }

    try {
      // Find the provider value from the EINVOICE_PROVIDERS mapping
      const provider = EINVOICE_PROVIDERS.find(
        (p) => p.name === formData.invoiceProvider,
      );
      const providerId = provider ? parseInt(provider.value) : 1;

      // Get connection info from database based on selected provider
      const connectionInfo = eInvoiceConnections.find(
        (conn) =>
          conn.softwareName === formData.invoiceProvider && conn.isActive,
      );

      if (!connectionInfo) {
        alert(
          `Không tìm thấy thông tin kết nối cho ${formData.invoiceProvider}. Vui lòng kiểm tra cấu hình trong Settings.`,
        );
        return;
      }

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

      // Prepare the PublishInvoiceRequest with data from database
      const publishRequest = {
        login: {
          providerId: providerId,
          url: connectionInfo.loginUrl || "https://infoerpvn.com:9440",
          ma_dvcs: connectionInfo.taxCode,
          username: connectionInfo.loginId,
          password: connectionInfo.password,
          tenantId: "",
        },
        transactionID: generateGuid(),
        invRef: `K24TGT804`,
        invSubTotal: total,
        invVatRate: 10, // 10% VAT rate
        invVatAmount: cartItems.reduce((totalVat, item) => {
          const itemTotal = item.price * item.quantity;
          const taxRate = item.taxRate || 10;
          return totalVat + (itemTotal * taxRate) / 100;
        }, 0),
        invDiscAmount: 0,
        invTotalAmount: total + cartItems.reduce((totalVat, item) => {
          const itemTotal = item.price * item.quantity;
          const taxRate = item.taxRate || 10;
          return totalVat + (itemTotal * taxRate) / 100;
        }, 0),
        paidTp: "TM", // Cash payment
        note: "",
        hdNo: "",
        createdDate: new Date().toISOString(),
        clsfNo: "1",
        spcfNo: formData.invoiceTemplate,
        templateCode: "",
        buyerNotGetInvoice: 0,
        exchCd: "VND",
        exchRt: 1,
        bankAccount: "",
        bankName: "",
        customer: {
          custCd: formData.taxCode,
          custNm: formData.customerName,
          custCompany: formData.customerName,
          taxCode: formData.taxCode,
          custCity: "",
          custDistrictName: "",
          custAddrs: formData.address || "",
          custPhone: formData.phoneNumber || "",
          custBankAccount: "",
          custBankName: "",
          email: formData.email || "",
          emailCC: "",
        },
        products: cartItems && cartItems.length > 0 ? cartItems.map((item, index) => {
          const itemTotal = item.price * item.quantity;
          const taxRate = item.taxRate || 10; // Default to 10% if not specified
          const vatAmount = (itemTotal * taxRate) / 100;
          const totalWithVat = itemTotal + vatAmount;
          
          return {
            itmCd: item.sku || `ITEM${String(index + 1).padStart(3, '0')}`,
            itmName: item.name,
            itmKnd: 1,
            unitNm: "Cái",
            qty: item.quantity,
            unprc: item.price,
            amt: itemTotal,
            discRate: 0,
            discAmt: 0,
            vatRt: taxRate.toString(),
            vatAmt: Math.round(vatAmount),
            totalAmt: Math.round(totalWithVat),
          };
        }) : [],
      };

      console.log("Publishing invoice with data:", publishRequest);

      // Call the proxy API instead of direct external API
      const response = await fetch("/api/einvoice/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(publishRequest),
      });

      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log("Invoice published successfully:", result);

      alert("Hóa đơn điện tử đã được phát hành thành công!");
      onConfirm(formData);
    } catch (error) {
      console.error("Error publishing invoice:", error);
      alert(`Có lỗi xảy ra khi phát hành hóa đơn: ${error.message}`);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-700 bg-blue-100 p-3 rounded-t-lg flex items-center justify-between">
            Phát hành hóa đơn điện tử
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* E-invoice Provider Information */}
          <div>
            <h3 className="text-base font-medium mb-4">
              Thông tin nhà cung cấp hóa đơn điện tử
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceProvider">Đơn vị HĐĐT</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.invoiceProvider}
                    onValueChange={(value) =>
                      handleInputChange("invoiceProvider", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đơn vị HĐĐT" />
                    </SelectTrigger>
                    <SelectContent>
                      {EINVOICE_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.name}>
                          {provider.name}
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
                    onChange={(e) =>
                      handleInputChange("invoiceTemplate", e.target.value)
                    }
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
                  onChange={(e) =>
                    handleInputChange("customerName", e.target.value)
                  }
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
                <Label htmlFor="phoneNumber">Số ĐTNNYCCCĐ</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  placeholder="0123456789"
                />
              </div>
              <div>
                <Label htmlFor="recipientName">Người nhận HĐ</Label>
                <Input
                  id="recipientName"
                  value={formData.recipientName}
                  onChange={(e) =>
                    handleInputChange("recipientName", e.target.value)
                  }
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
                {total.toLocaleString("vi-VN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₫
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
