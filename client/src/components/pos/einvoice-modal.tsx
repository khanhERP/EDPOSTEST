import { useState, useEffect, useRef } from "react";
import { X, Search, Keyboard } from "lucide-react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import VirtualKeyboard from "@/components/ui/virtual-keyboard";

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
  selectedPaymentMethod?: string;
}

export function EInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  cartItems = [],
  selectedPaymentMethod = "",
}: EInvoiceModalProps) {
  // Debug log to track cart items data flow
  console.log("🔍 EInvoiceModal Props Analysis:");
  console.log("- isOpen:", isOpen);
  console.log("- total:", total);
  console.log("- cartItems received:", cartItems);
  console.log("- cartItems type:", typeof cartItems);
  console.log("- cartItems is array:", Array.isArray(cartItems));
  console.log("- cartItems length:", cartItems?.length || 0);
  const [formData, setFormData] = useState({
    invoiceProvider: "",
    invoiceTemplate: "",
    selectedTemplateId: "",
    taxCode: "",
    customerName: "",
    address: "",
    phoneNumber: "",
    email: "",
  });

  const [isTaxCodeLoading, setIsTaxCodeLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [activeInputField, setActiveInputField] = useState<string | null>(null);
  const [selectedInternalPaymentMethod, setSelectedInternalPaymentMethod] = useState<string>(selectedPaymentMethod);


  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Helper function để map phương thức thanh toán
  const getPaymentMethodCode = (paymentMethod: string): number => {
    switch (paymentMethod) {
      case "cash":
        return 1; // Tiền mặt
      case "qrCode":
        return 3; // QR Code (vẫn hiển thị là Chuyển khoản)
      case "creditCard":
      case "debitCard":
      case "momo":
      case "zalopay":
      case "vnpay":
        return 2; // Chuyển khoản
      default:
        return 2; // Default: Chuyển khoản
    }
  };

  // Log the pre-selected payment method for debugging
  console.log("💳 E-Invoice modal received payment method:", selectedPaymentMethod);

  

  // Fetch E-invoice connections
  const { data: eInvoiceConnections = [] } = useQuery<any[]>({
    queryKey: ["/api/einvoice-connections"],
    enabled: isOpen,
  });

  // Fetch active invoice templates for dropdown
  const { data: allInvoiceTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/invoice-templates/active"],
    enabled: isOpen,
  });

  // Fetch products for SKU lookup
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  // Filter templates to only show ones that are in use (useCK: true)
  const invoiceTemplates = allInvoiceTemplates.filter(
    (template) => template.useCK === true,
  );

  // Reset form only when modal opens, not when cartItems/total changes
  useEffect(() => {
    if (isOpen) {
      console.log("🔥 E-INVOICE MODAL OPENING");
      console.log("🔥 cartItems when modal opens:", cartItems);
      console.log(
        "🔥 cartItems length when modal opens:",
        cartItems?.length || 0,
      );
      console.log(
        "🔥 cartItems is array when modal opens:",
        Array.isArray(cartItems),
      );
      console.log("🔥 total when modal opens:", total);

      setFormData({
        invoiceProvider: "EasyInvoice", // Default provider
        invoiceTemplate: "1C25TYY", // Default template
        selectedTemplateId: "",
        taxCode: "0123456789", // Default tax code
        customerName: "Khách hàng lẻ", // Default customer name
        address: "",
        phoneNumber: "",
        email: "",
      });
      setSelectedInternalPaymentMethod(selectedPaymentMethod);
    }
  }, [isOpen]); // Only reset when modal opens/closes

  // Separate effect for debugging cartItems changes without resetting form
  useEffect(() => {
    if (isOpen) {
      console.log("🔄 Cart items or total changed:", {
        cartItems: cartItems?.length || 0,
        total,
        timestamp: new Date().toISOString(),
      });
    }
  }, [cartItems, total, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVirtualKeyPress = (key: string) => {
    if (!activeInputField) return;

    const currentValue =
      formData[activeInputField as keyof typeof formData] || "";
    const newValue = currentValue + key;
    handleInputChange(activeInputField, newValue);

    // Focus the input to show cursor position
    const inputRef = inputRefs.current[activeInputField];
    if (inputRef) {
      inputRef.focus();
      // Set cursor to end
      setTimeout(() => {
        inputRef.setSelectionRange(newValue.length, newValue.length);
      }, 0);
    }
  };

  const handleVirtualBackspace = () => {
    if (!activeInputField) return;

    const currentValue =
      formData[activeInputField as keyof typeof formData] || "";
    const newValue = currentValue.slice(0, -1);
    handleInputChange(activeInputField, newValue);

    // Focus the input to show cursor position
    const inputRef = inputRefs.current[activeInputField];
    if (inputRef) {
      inputRef.focus();
      setTimeout(() => {
        inputRef.setSelectionRange(newValue.length, newValue.length);
      }, 0);
    }
  };

  const handleVirtualEnter = () => {
    // Hide keyboard on enter
    setShowVirtualKeyboard(false);
    setActiveInputField(null);
  };

  const handleInputFocus = (fieldName: string) => {
    setActiveInputField(fieldName);
    if (showVirtualKeyboard) {
      // If keyboard is already shown, just switch focus
      const inputRef = inputRefs.current[fieldName];
      if (inputRef) {
        inputRef.focus();
      }
    }
  };

  const toggleVirtualKeyboard = () => {
    setShowVirtualKeyboard(!showVirtualKeyboard);
    if (!showVirtualKeyboard) {
      // If opening keyboard, focus on first input field
      setActiveInputField("taxCode");
      setTimeout(() => {
        const inputRef = inputRefs.current["taxCode"];
        if (inputRef) {
          inputRef.focus();
        }
      }, 100);
    } else {
      setActiveInputField(null);
    }
  };

  const handleGetTaxInfo = async () => {
    if (!formData.taxCode.trim()) {
      alert("Vui lòng nhập mã số thuế trước khi lấy thông tin");
      return;
    }

    setIsTaxCodeLoading(true);
    try {
      // Use a proxy endpoint through our server to avoid CORS issues
      const response = await fetch("/api/tax-code-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taxCode: formData.taxCode }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Tax code API response:", result);

      if (
        result.success &&
        result.data &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        // Lấy phần tử đầu tiên từ mảng kết quả vì chỉ truyền 1 mã số thuế
        const taxInfo = result.data[0];

        if (taxInfo) {
          // Kiểm tra trạng thái
          if (taxInfo.tthai === "00") {
            // Trạng thái hợp lệ - cập nhật thông tin
            setFormData((prev) => ({
              ...prev,
              customerName: taxInfo.tenCty || prev.customerName,
              address: taxInfo.diaChi || prev.address,
            }));

            alert(
              `Đã lấy thông tin thành công!\nTên công ty: ${taxInfo.tenCty}\nĐịa chỉ: ${taxInfo.diaChi}`,
            );
          } else {
            // Trạng thái không hợp lệ - hiển thị thông tin trạng thái
            alert(
              `Mã số thuế không hợp lệ!\nTrạng thái: ${taxInfo.trangThaiHoatDong || "Không xác định"}\nMã trạng thái: ${taxInfo.tthai}`,
            );
          }
        } else {
          alert(
            "Không tìm thấy thông tin cho mã số thuế này trong kết quả trả về",
          );
        }
      } else {
        alert(result.message || "Không tìm thấy thông tin cho mã số thuế này");
      }
    } catch (error) {
      console.error("Error fetching tax code info:", error);
      if (error === "TypeError" && error.includes("fetch")) {
        alert(
          "Không thể kết nối đến dịch vụ tra cứu mã số thuế. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.",
        );
      } else {
        alert(`Có lỗi xảy ra khi lấy thông tin mã số thuế: ${error}`);
      }
    } finally {
      setIsTaxCodeLoading(false);
    }
  };

  const handlePublishLater = async () => {
    // Placeholder for subtotal, tax, total calculation if needed within this scope
    let subtotal = 0;
    let tax = 0;

    try {
      // Close e-invoice modal first
      onClose();
      
      // Simply call onConfirm with the form data for "publish later" functionality
      onConfirm({
        ...formData,
        cartItems: cartItems,
        total: total,
        paymentMethod: "einvoice",
        originalPaymentMethod: selectedInternalPaymentMethod,
        publishLater: true
      });
    } catch (error) {
      console.error("Error in handlePublishLater:", error);

      let errorMessage = "Có lỗi xảy ra khi lưu hóa đơn";
      if (error instanceof Error) {
        errorMessage = `Có lỗi xảy ra khi lưu hóa đơn: ${error.message}`;
      } else if (typeof error === "string") {
        errorMessage = `Có lỗi xảy ra khi lưu hóa đơn: ${error}`;
      } else {
        errorMessage = `Có lỗi xảy ra khi lưu hóa đơn: ${JSON.stringify(error)}`;
      }

      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage,
      });
      return;
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirm = async () => {
    // Validate required fields
    if (!formData.invoiceProvider || !formData.customerName) {
      alert(
        "Vui lòng điền đầy đủ thông tin bắt buộc: Đơn vị HĐĐT và Tên đơn vị",
      );
      return;
    }

    if (!formData.selectedTemplateId) {
      alert("Vui lòng chọn mẫu số hóa đơn");
      return;
    }

    setIsPublishing(true);
    try {
      // Debug log current cart items
      console.log("=== PHÁT HÀNH HÓA ĐƠN - KIỂM TRA DỮ LIỆU ===");
      console.log("cartItems received:", cartItems);
      console.log("cartItems length:", cartItems?.length || 0);
      console.log("cartItems detailed:", JSON.stringify(cartItems, null, 2));
      console.log("total amount:", total);

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

      // Validate cart items with detailed logging
      console.log("🔍 VALIDATING CART ITEMS FOR E-INVOICE");
      console.log("Raw cartItems:", JSON.stringify(cartItems, null, 2));
      console.log("CartItems type:", typeof cartItems);
      console.log("CartItems is array:", Array.isArray(cartItems));
      console.log("CartItems length:", cartItems?.length);

      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        console.error("No valid cart items found:", {
          cartItems,
          isArray: Array.isArray(cartItems),
          length: cartItems?.length,
          total: total,
        });
        alert(
          "Không có sản phẩm nào trong giỏ hàng để tạo hóa đơn điện tử.\n\nDữ liệu nhận được:\n- Số sản phẩm: " +
            (cartItems?.length || 0) +
            "\n- Tổng tiền: " +
            total.toLocaleString("vi-VN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) +
            " ₫\n\nVui lòng thử lại từ màn hình bán hàng.",
        );
        return;
      }

      // Validate each cart item has required data
      const invalidItems = cartItems.filter((item) => {
        const isValid =
          item &&
          (item.id || item.sku) &&
          item.name &&
          item.price !== undefined &&
          item.price !== null &&
          item.quantity !== undefined &&
          item.quantity !== null &&
          item.quantity > 0;

        if (!isValid) {
          console.log("Invalid item found:", item);
        }
        return !isValid;
      });

      if (invalidItems.length > 0) {
        console.error("Invalid cart items found:", invalidItems);
        alert(
          `Có ${invalidItems.length} sản phẩm trong giỏ hàng thiếu thông tin:\n${invalidItems.map((item) => `- ${item?.name || "Không có tên"}`).join("\n")}\n\nVui lòng kiểm tra lại giỏ hàng.`,
        );
        return;
      }

      console.log("All cart items are valid for e-invoice generation");

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

      // Calculate totals from real cart items
      let cartSubtotal = 0;
      let cartTaxAmount = 0;

      // Tìm sản phẩm theo SKU thay vì ID
      const findProductBySku = (sku: string) => {
        return products?.find((p: any) => p.sku === sku);
      };

      // Tạo invoice items từ cartItems với tìm kiếm theo SKU
      const invoiceItems = cartItems.map((item: any) => {
        console.log(`💰 Item calculation: ${item.name} - Price: ${item.price}, Qty: ${item.quantity}, SKU: ${item.sku}`);

        // Tìm sản phẩm theo SKU
        const product = findProductBySku(item.sku);
        if (!product) {
          console.error(`❌ Product not found with SKU: ${item.sku}`);
        }

        const itemSubtotal = item.price * item.quantity;
        const taxAmount = (itemSubtotal * (item.taxRate || 0)) / 100;
        const itemTotal = itemSubtotal + taxAmount;

        console.log(`💰 Tax calculation: ${item.name} - Tax rate: ${item.taxRate || 0}%, Tax: ${taxAmount}`);

        cartSubtotal += itemSubtotal;
        cartTaxAmount += taxAmount;

        return {
          productId: product?.id || item.id, // Sử dụng product ID từ database hoặc fallback
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price.toFixed(2),
          total: itemTotal.toFixed(2),
          taxRate: (item.taxRate || 0).toFixed(2)
        };
      });

      const cartTotal = cartSubtotal + cartTaxAmount;

      console.log("E-Invoice totals calculated from real cart data:", {
        subtotal: cartSubtotal,
        tax: cartTaxAmount,
        total: cartTotal,
        itemsCount: invoiceItems.length,
      });

      // Get selected template data for API mapping
      const selectedTemplate = invoiceTemplates.find(
        (template) => template.id.toString() === formData.selectedTemplateId,
      );

      if (!selectedTemplate) {
        alert("Không tìm thấy thông tin mẫu số hóa đơn được chọn");
        return;
      }

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
        clsfNo: selectedTemplate.templateNumber, // Mẫu số
        spcfNo: selectedTemplate.name, // Tên
        templateCode: selectedTemplate.templateCode || "", // Mã mẫu
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
        products: invoiceItems,
      };

      console.log(
        "Publishing invoice with data:",
        JSON.stringify(publishRequest, null, 2),
      );

      // Handle immediate publishing (Phát hành)
      console.log("🟢 PHÁT HÀNH NGAY - Gọi API phát hành hóa đơn điện tử");

      try {
        const publishResponse = await apiRequest("POST", "/api/einvoice/publish", publishRequest);

        if (!publishResponse.ok) {
          const errorData = await publishResponse.json();
          console.error("❌ Failed to publish e-invoice:", errorData);
          setIsPublishing(false);
          return;
        }

        const publishResult = await publishResponse.json();
        console.log("✅ E-invoice published successfully:", publishResult);

        // Note: Transaction for inventory deduction will be handled by the main checkout flow
        console.log("✅ E-invoice published successfully - inventory will be handled by main transaction flow");

        console.log(
          "✅ E-invoice published successfully, now saving invoice and order to database",
        );

        

        toast({
          title: "Thành công",
          description: `Hóa đơn điện tử đã được phát hành thành công!\nSố hóa đơn: ${publishResult.data?.invoiceNo || "N/A"}`,
        });

        // Create receipt data ngay sau khi phát hành thành công
        const receiptData = {
          transactionId: publishResult.data?.invoiceNo || `TXN-${Date.now()}`,
          items: cartItems.map((item) => {
            const itemPrice =
              typeof item.price === "string"
                ? parseFloat(item.price)
                : item.price;
            const itemQuantity =
              typeof item.quantity === "string"
                ? parseInt(item.quantity)
                : item.quantity;
            const itemTaxRate =
              typeof item.taxRate === "string"
                ? parseFloat(item.taxRate || "10")
                : item.taxRate || 10;
            const itemSubtotal = itemPrice * itemQuantity;
            const itemTax = (itemSubtotal * itemTaxRate) / 100;

            return {
              id: item.id,
              productId: item.id,
              productName: item.name,
              price: itemPrice.toFixed(2),
              quantity: itemQuantity,
              total: (itemSubtotal + itemTax).toFixed(2),
              sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
              taxRate: itemTaxRate,
            };
          }),
          subtotal: cartSubtotal.toFixed(2),
          tax: cartTaxAmount.toFixed(2),
          total: cartTotal.toFixed(2),
          paymentMethod: "einvoice",
          originalPaymentMethod: selectedInternalPaymentMethod,
          amountReceived: cartTotal.toFixed(2),
          change: "0.00",
          cashierName: "System User",
          createdAt: new Date().toISOString(),
          invoiceNumber: publishResult.data?.invoiceNo || null,
          customerName: formData.customerName,
          customerTaxCode: formData.taxCode,
        };

        console.log(
          "📄 Created receipt data for published e-invoice:",
          receiptData,
        );

        // Close e-invoice modal and return data
        onClose();
        onConfirm({
          ...formData,
          invoiceData: publishResult.data,
          cartItems: cartItems,
          total: total,
          paymentMethod: "einvoice",
          originalPaymentMethod: selectedInternalPaymentMethod,
          receipt: receiptData,
          customerName: formData.customerName,
          taxCode: formData.taxCode,
          invoiceNumber: publishResult.data?.invoiceNo || null,
        });
      } catch (error) {
        console.error("Error publishing invoice:", error);
        alert(`Có lỗi xảy ra khi phát hành hóa đơn: ${error}`);
      }
    } catch (error) {
      console.error("Error publishing invoice:", error);
      alert(`Có lỗi xảy ra khi phát hành hóa đơn: ${error}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-blue-700 bg-blue-100 p-3 rounded-t-lg">
            {t("einvoice.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* E-invoice Provider Information */}
          <div>
            <h3 className="text-base font-medium mb-4">
              {t("einvoice.providerInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceProvider">
                  {t("einvoice.providerUnit")}
                </Label>
                <Select
                  value={formData.invoiceProvider}
                  onValueChange={(value) =>
                    handleInputChange("invoiceProvider", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("einvoice.selectProvider")} />
                  </SelectTrigger>
                  <SelectContent>
                    {EINVOICE_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.name}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoiceTemplate">
                  {t("einvoice.invoiceTemplate")}
                </Label>
                <Select
                  value={formData.selectedTemplateId}
                  onValueChange={(value) =>
                    handleInputChange("selectedTemplateId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("einvoice.selectTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceTemplates.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id.toString()}
                      >
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="text-base font-medium mb-4">
              {t("einvoice.customerInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxCode">{t("einvoice.taxCode")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="taxCode"
                    ref={(el) => {
                      inputRefs.current["taxCode"] = el;
                    }}
                    value={formData.taxCode}
                    onChange={(e) =>
                      handleInputChange("taxCode", e.target.value)
                    }
                    onFocus={() => handleInputFocus("taxCode")}
                    placeholder="0102222333-001"
                    disabled={false}
                    readOnly={false}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleGetTaxInfo}
                    disabled={isTaxCodeLoading}
                  >
                    {isTaxCodeLoading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                        Đang tải...
                      </>
                    ) : (
                      t("einvoice.getInfo")
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="customerName">
                  {t("einvoice.companyName")}
                </Label>
                <Input
                  id="customerName"
                  ref={(el) => {
                    inputRefs.current["customerName"] = el;
                  }}
                  value={formData.customerName}
                  onChange={(e) =>
                    handleInputChange("customerName", e.target.value)
                  }
                  onFocus={() => handleInputFocus("customerName")}
                  placeholder="Công ty TNHH ABC"
                  disabled={false}
                  readOnly={false}
                />
              </div>
              <div>
                <Label htmlFor="address">{t("einvoice.address")}</Label>
                <Input
                  id="address"
                  ref={(el) => {
                    inputRefs.current["address"] = el;
                  }}
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  onFocus={() => handleInputFocus("address")}
                  placeholder="Cầu Giấy, Hà Nội"
                  disabled={false}
                  readOnly={false}
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">{t("einvoice.idNumber")}</Label>
                <Input
                  id="phoneNumber"
                  ref={(el) => {
                    inputRefs.current["phoneNumber"] = el;
                  }}
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  onFocus={() => handleInputFocus("phoneNumber")}
                  placeholder="0123456789"
                  disabled={false}
                  readOnly={false}
                />
              </div>

              <div>
                <Label htmlFor="email">{t("einvoice.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  ref={(el) => {
                    inputRefs.current["email"] = el;
                  }}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onFocus={() => handleInputFocus("email")}
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
              <span className="font-medium">{t("einvoice.totalAmount")}</span>
              <span className="text-lg font-bold text-blue-600">
                {Math.floor(total).toLocaleString("vi-VN")}{" "}
                ₫
              </span>
            </div>
          </div>

          {/* Virtual Keyboard Toggle */}
          <div className="flex justify-center pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVirtualKeyboard}
              className={`${showVirtualKeyboard ? "bg-blue-100 border-blue-300" : ""}`}
            >
              <Keyboard className="w-4 h-4 mr-2" />
              {showVirtualKeyboard ? "Ẩn bàn phím" : "Hiện bàn phím ảo"}
            </Button>
          </div>

          {/* Virtual Keyboard */}
          {showVirtualKeyboard && (
            <div className="mt-4">
              <VirtualKeyboard
                onKeyPress={handleVirtualKeyPress}
                onBackspace={handleVirtualBackspace}
                onEnter={handleVirtualEnter}
                isVisible={showVirtualKeyboard}
                className="mx-auto"
              />
              {activeInputField && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  Đang nhập vào:{" "}
                  {activeInputField === "taxCode"
                    ? "Mã số thuế"
                    : activeInputField === "customerName"
                      ? "Tên đơn vị"
                      : activeInputField === "address"
                        ? "Địa chỉ"
                        : activeInputField === "phoneNumber"
                          ? "Số điện thoại"
                          : activeInputField === "email"
                            ? "Email"
                            : activeInputField}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  {t("einvoice.publishing")}
                </>
              ) : (
                <>
                  <span className="mr-2">✅</span>
                  {t("einvoice.publish")}
                </>
              )}
            </Button>
            <Button
              onClick={handlePublishLater}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              disabled={isPublishing}
            >
              <span className="mr-2">⏳</span>
              Phát hành sau
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              <span className="mr-2">❌</span>
              {t("einvoice.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}