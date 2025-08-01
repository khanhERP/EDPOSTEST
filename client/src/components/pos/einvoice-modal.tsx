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

  // Reset form only when modal opens, not when cartItems/total changes
  useEffect(() => {
    if (isOpen) {
      console.log("🔥 E-INVOICE MODAL OPENING");
      console.log("🔥 cartItems when modal opens:", cartItems);
      console.log("🔥 cartItems length when modal opens:", cartItems?.length || 0);
      console.log("🔥 cartItems is array when modal opens:", Array.isArray(cartItems));
      console.log("🔥 total when modal opens:", total);

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
  }, [isOpen]); // Only reset when modal opens/closes

  // Separate effect for debugging cartItems changes without resetting form
  useEffect(() => {
    if (isOpen) {
      console.log("🔄 Cart items or total changed:", {
        cartItems: cartItems?.length || 0,
        total,
        timestamp: new Date().toISOString()
      });
    }
  }, [cartItems, total, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConfirm = async () => {
    // Validate required fields
    if (
      !formData.invoiceProvider ||
      !formData.taxCode ||
      !formData.customerName
    ) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc: Đơn vị HĐĐT, Mã số thuế, và Tên đơn vị");
      return;
    }

    if (!formData.invoiceTemplate.trim()) {
      alert("Vui lòng nhập Mẫu số Hóa đơn GTGT");
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

      // Validate cart items
      if (!cartItems || cartItems.length === 0) {
        alert("Không có sản phẩm nào trong giỏ hàng để tạo hóa đơn điện tử");
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

      // Calculate totals from actual cart items
      let cartSubtotal = 0;
      let cartTaxAmount = 0;

      // Convert cart items to invoice products with real data
      const invoiceProducts = cartItems.map((item, index) => {
        const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        const itemQuantity = item.quantity;
        const itemTaxRate = item.taxRate || 10;
        
        const itemSubtotal = itemPrice * itemQuantity;
        const itemTax = (itemSubtotal * itemTaxRate) / 100;
        const itemTotal = itemSubtotal + itemTax;

        cartSubtotal += itemSubtotal;
        cartTaxAmount += itemTax;

        return {
          itmCd: item.sku || `SP${String(item.id).padStart(3, '0')}`,
          itmName: item.name,
          itmKnd: 1, // Loại sản phẩm (1 = hàng hóa)
          unitNm: "Cái", // Đơn vị tính
          qty: itemQuantity,
          unprc: itemPrice,
          amt: Math.round(itemSubtotal), // Thành tiền chưa thuế
          discRate: 0, // Tỷ lệ chiết khấu
          discAmt: 0, // Tiền chiết khấu
          vatRt: itemTaxRate.toString(),
          vatAmt: Math.round(itemTax), // Tiền thuế
          totalAmt: Math.round(itemTotal), // Tổng tiền có thuế
        };
      });

      const cartTotal = cartSubtotal + cartTaxAmount;

      // Prepare the PublishInvoiceRequest with real cart data
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
        invRef: `INV-${Date.now()}`,
        invSubTotal: Math.round(cartSubtotal),
        invVatRate: 10, // Default VAT rate
        invVatAmount: Math.round(cartTaxAmount),
        invDiscAmount: 0, // Chiết khấu
        invTotalAmount: Math.round(cartTotal),
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
        products: invoiceProducts,
      };

      console.log("Publishing invoice with data:", JSON.stringify(publishRequest, null, 2));

      // Call the proxy API
      const response = await fetch("/api/einvoice/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(publishRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `API call failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log("Invoice published successfully:", result);

      if (result.success) {
        alert(`Hóa đơn điện tử đã được phát hành thành công!\nSố hóa đơn: ${result.data?.invoiceNo || 'N/A'}`);
        onConfirm(formData);
        onClose();
      } else {
        throw new Error(result.message || "Có lỗi xảy ra khi phát hành hóa đơn");
      }
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
                    disabled={false}
                    readOnly={false}
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
                  disabled={false}
                  readOnly={false}
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
                  disabled={false}
                  readOnly={false}
                />
              </div>
              <div>
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Cầu Giấy, Hà Nội"
                  disabled={false}
                  readOnly={false}
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Số CMND/CCCD</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  placeholder="0123456789"
                  disabled={false}
                  readOnly={false}
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
                  disabled={false}
                  readOnly={false}
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
                  disabled={false}
                  readOnly={false}
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