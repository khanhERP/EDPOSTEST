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
    // Debug logging
    console.log("=== E-INVOICE MODAL DEBUG ===");
    console.log("📦 Cart items received from shopping cart:", cartItems);
    console.log("📊 Number of cart items:", cartItems?.length || 0);
    console.log("🛒 Shopping cart details:", JSON.stringify(cartItems, null, 2));
    console.log("📝 Cart items type:", typeof cartItems);
    console.log("✅ Is cartItems an array?", Array.isArray(cartItems));
    
    // Hiển thị thông tin chi tiết từng sản phẩm trong giỏ hàng
    if (cartItems && cartItems.length > 0) {
      console.log("🔍 THÔNG TIN CHI TIẾT GIỎ HÀNG:");
      cartItems.forEach((item, index) => {
        console.log(`   Sản phẩm ${index + 1}:`, {
          tên: item.name,
          mã: item.sku || item.id,
          giá: item.price,
          sốLượng: item.quantity,
          thànhTiền: (parseFloat(item.price) * item.quantity).toLocaleString('vi-VN') + ' ₫'
        });
      });
    }

    // Additional debug for each cart item
    if (cartItems && cartItems.length > 0) {
      cartItems.forEach((item, index) => {
        console.log(`Cart item ${index + 1}:`, {
          id: item.id,
          name: item.name,
          price: item.price,
          priceType: typeof item.price,
          quantity: item.quantity,
          quantityType: typeof item.quantity,
          sku: item.sku,
          taxRate: item.taxRate,
          isValid: (item.price && item.price > 0 && item.quantity && item.quantity > 0)
        });
      });
    }

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
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      console.error("❌ No cart items available for invoice creation");
      console.error("cartItems:", cartItems);
      console.error("cartItems is array:", Array.isArray(cartItems));
      console.error("cartItems length:", cartItems?.length);
      alert("Không có sản phẩm nào để tạo hóa đơn. Vui lòng kiểm tra giỏ hàng.");
      return;
    }

    try {
      // Debug cartItems before filtering
      console.log("🔍 Raw cartItems before filtering:", JSON.stringify(cartItems, null, 2));
      
      // Filter out invalid cart items (e.g., missing price or quantity)
      const validItems = cartItems.filter(item => {
        if (!item) {
          console.log("❌ Item is null/undefined:", item);
          return false;
        }
        
        const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
        const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : (item.quantity || 1);
        
        console.log(`🔍 Checking item: ${item.name}`, {
          originalPrice: item.price,
          processedPrice: itemPrice,
          originalQuantity: item.quantity,
          processedQuantity: itemQuantity,
          isValid: itemPrice > 0 && itemQuantity > 0
        });
        
        return itemPrice > 0 && itemQuantity > 0;
      });

      console.log("✅ Valid items after filtering:", validItems.length);
      console.log("✅ Valid items details:", JSON.stringify(validItems, null, 2));

      if (validItems.length === 0) {
        console.error("❌ No valid cart items available for invoice creation");
        alert("Không có sản phẩm hợp lệ để tạo hóa đơn");
        return;
      }

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
        invVatAmount: validItems.reduce((totalVat, item) => {
          const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
          const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : (item.quantity || 1);
          const itemTotal = itemPrice * itemQuantity;
          const taxRate = typeof item.taxRate === 'string' ? parseFloat(item.taxRate) : (item.taxRate || 10);
          return totalVat + (itemTotal * taxRate) / 100;
        }, 0),
        invDiscAmount: 0,
        invTotalAmount: total + validItems.reduce((totalVat, item) => {
          const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
          const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : (item.quantity || 1);
          const itemTotal = itemPrice * itemQuantity;
          const taxRate = typeof item.taxRate === 'string' ? parseFloat(item.taxRate) : (item.taxRate || 10);
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
        products: validItems.map((item, index) => {
          console.log(`🔄 Processing cart item ${index + 1}:`, {
            id: item.id,
            name: item.name,
            originalPrice: item.price,
            originalQuantity: item.quantity,
            sku: item.sku,
            taxRate: item.taxRate
          });

          // Xử lý giá và số lượng từ dữ liệu giỏ hàng
          const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
          const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : (item.quantity || 1);
          const itemTotal = itemPrice * itemQuantity;
          const taxRate = typeof item.taxRate === 'string' ? parseFloat(item.taxRate) : (item.taxRate || 10);
          const vatAmount = (itemTotal * taxRate) / 100;
          const totalWithVat = itemTotal + vatAmount;

          // Tạo object sản phẩm cho API hóa đơn điện tử
          const productItem = {
            itmCd: item.sku || `ITEM${String(item.id || index + 1).padStart(3, '0')}`, // Mã sản phẩm
            itmName: item.name || `Sản phẩm ${index + 1}`, // Tên sản phẩm từ giỏ hàng
            itmKnd: 1, // Loại sản phẩm (1 = hàng hóa)
            unitNm: "Cái", // Đơn vị tính
            qty: itemQuantity, // Số lượng từ giỏ hàng
            unprc: itemPrice, // Đơn giá từ giỏ hàng
            amt: Math.round(itemTotal), // Thành tiền chưa thuế
            discRate: 0, // Tỷ lệ chiết khấu
            discAmt: 0, // Tiền chiết khấu
            vatRt: taxRate.toString(), // Thuế suất
            vatAmt: Math.round(vatAmount), // Tiền thuế
            totalAmt: Math.round(totalWithVat), // Tổng tiền có thuế
          };

          console.log(`✅ Mapped cart product ${index + 1} for e-invoice:`, {
            productName: productItem.itmName,
            quantity: productItem.qty,
            unitPrice: productItem.unprc,
            total: productItem.totalAmt
          });
          
          return productItem;
        }),
      };

      console.log("=== FINAL PUBLISH REQUEST ===");
      console.log("Products array length:", publishRequest.products.length);
      console.log("Products array:", JSON.stringify(publishRequest.products, null, 2));
      console.log("Publishing invoice with data:", JSON.stringify(publishRequest, null, 2));

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
                <Label htmlFor="phoneNumber">Số ĐTNNYCCCĐ</Label>
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