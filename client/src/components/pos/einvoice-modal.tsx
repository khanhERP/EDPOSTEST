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
    afterTaxPrice?: string | null; // Added for potential after-tax price calculation
  }>;
  source?: "pos" | "table"; // Thêm prop để phân biệt nguồn gọi
  orderId?: number; // Thêm orderId để tự xử lý cập nhật trạng thái
  selectedPaymentMethod?: string; // Thêm prop để nhận phương thức thanh toán
}

export function EInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  cartItems = [],
  source = "pos", // Default là 'pos' để tương thích ngược
  orderId, // Thêm orderId prop
  selectedPaymentMethod = "", // Thêm selectedPaymentMethod prop
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

  // Mutation để hoàn tất thanh toán và cập nhật trạng thái
  const completePaymentMutation = useMutation({
    mutationFn: ({
      orderId,
      paymentMethod,
    }: {
      orderId: number;
      paymentMethod: string;
    }) => {
      console.log(
        "🔄 E-invoice modal: Starting payment completion mutation for order:",
        orderId,
      );
      return apiRequest("PUT", `/api/orders/${orderId}/status`, {
        status: "paid",
        paymentMethod,
      });
    },
    onSuccess: (data, variables) => {
      console.log(
        "🎯 E-invoice modal completed payment successfully for order:",
        variables.orderId,
      );
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });

      toast({
        title: "Thanh toán thành công",
        description:
          "Hóa đơn điện tử đã được phát hành và đơn hàng đã được thanh toán",
      });

      console.log("✅ E-invoice modal: Payment completed, queries invalidated");
    },
    onError: (error, variables) => {
      console.error(
        "❌ Error completing payment from e-invoice modal for order:",
        variables.orderId,
        error,
      );
      toast({
        title: "Lỗi",
        description:
          "Hóa đơn điện tử đã phát hành nhưng không thể hoàn tất thanh toán",
        variant: "destructive",
      });

      console.log(
        "❌ E-invoice modal: Payment failed for order:",
        variables.orderId,
      );
    },
  });

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

      // Set default template based on available templates
      const defaultTemplate = invoiceTemplates.length > 0 ? invoiceTemplates[0].id.toString() : "";

      setFormData({
        invoiceProvider: eInvoiceConnections.length > 0 ? eInvoiceConnections[0].softwareName : "EasyInvoice", // Use first available provider
        invoiceTemplate: "1C25TYY", // Default template
        selectedTemplateId: defaultTemplate,
        taxCode: "0123456789", // Default tax code
        customerName: "Khách hàng lẻ", // Default customer name
        address: "",
        phoneNumber: "",
        email: "",
      });

      // Only show warnings after a slight delay to avoid initial render issues
      setTimeout(() => {
        if (isOpen) { // Double check modal is still open
          if (eInvoiceConnections.length === 0) {
            toast({
              title: "Cảnh báo",
              description: "Chưa có kết nối hóa đơn điện tử nào được cấu hình. Vui lòng kiểm tra Settings.",
              variant: "destructive",
            });
          }
          
          if (invoiceTemplates.length === 0) {
            toast({
              title: "Cảnh báo", 
              description: "Chưa có mẫu hóa đơn nào được kích hoạt. Vui lòng kiểm tra Settings.",
              variant: "destructive",
            });
          }
        }
      }, 500);
    }
  }, [isOpen, eInvoiceConnections, invoiceTemplates]); // Add dependencies

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
    // Prevent duplicate calls
    if (isPublishing) {
      console.log("⚠️ Already processing publish later, skipping duplicate call");
      return;
    }

    setIsPublishing(true);

    // Validate required fields before proceeding
    if (!formData.invoiceProvider || !formData.customerName) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc: Đơn vị HĐĐT và Tên đơn vị",
        variant: "destructive",
      });
      setIsPublishing(false);
      return;
    }

    // For publish later, template selection is optional
    // Template can be selected when actually publishing the invoice

    try {
      console.log(
        "🟡 PHÁT HÀNH SAU - Lưu thông tin hóa đơn vào bảng invoices và invoice_items",
      );
      console.log("🟡 Source:", source, "OrderId:", orderId);

      // Debug log current cart items BEFORE any processing
      console.log("=== PHÁT HÀNH SAU - KIỂM TRA DỮ LIỆU ===");
      console.log("cartItems received:", cartItems);
      console.log("cartItems length:", cartItems?.length || 0);
      console.log("cartItems detailed:", JSON.stringify(cartItems, null, 2));
      console.log("total amount:", total);

      // Validate cart items first
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        console.error("❌ No valid cart items found for later publishing");
        toast({
          title: "Lỗi",
          description: "Không có sản phẩm nào trong giỏ hàng để lưu thông tin.",
          variant: "destructive",
        });
        setIsPublishing(false);
        return;
      }

      // Validate total amount
      if (!total || total <= 0) {
        console.error("❌ Invalid total amount for later publishing:", total);
        toast({
          title: "Lỗi", 
          description: "Tổng tiền không hợp lệ để lưu hóa đơn.",
          variant: "destructive",
        });
        setIsPublishing(false);
        return;
      }

      // Validate required customer information
      if (!formData.customerName || formData.customerName.trim() === "") {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập tên khách hàng.",
          variant: "destructive",
        });
        setIsPublishing(false);
        return;
      }

      // Lấy thông tin mẫu số hóa đơn được chọn (optional cho phát hành sau)
      const selectedTemplate = formData.selectedTemplateId
        ? invoiceTemplates.find(
            (template) => template.id.toString() === formData.selectedTemplateId,
          )
        : null;

      // Calculate subtotal and tax with proper type conversion and handling afterTaxPrice
      let calculatedSubtotal = 0;
      let calculatedTax = 0;

      cartItems.forEach((item) => {
        const itemPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
        const itemQuantity = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity;
        const itemTaxRate = typeof item.taxRate === "string" ? parseFloat(item.taxRate || "0") : (item.taxRate || 0);

        const itemSubtotal = itemPrice * itemQuantity;
        calculatedSubtotal += itemSubtotal;

        // Calculate tax based on afterTaxPrice if available, otherwise use taxRate
        if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(item.afterTaxPrice);
          const taxPerUnit = afterTaxPrice - itemPrice;
          calculatedTax += Math.floor(taxPerUnit * itemQuantity);
        } else if (itemTaxRate > 0) {
          calculatedTax += (itemSubtotal * itemTaxRate) / 100;
        }
      });

      const grandTotal = calculatedSubtotal + calculatedTax;

      console.log(
        `💰 Total calculations: Subtotal: ${calculatedSubtotal}, Tax: ${calculatedTax}, Total: ${grandTotal}`,
      );


      // Lưu hóa đơn vào database với trạng thái "chưa phát hành"
        try {
          console.log("💾 Saving unpublished invoice to database");

          const invoicePayload = {
            invoiceNumber: `INV-${Date.now()}`, // Placeholder, will be updated later
            templateNumber: selectedTemplate?.templateNumber || null,
            symbol: selectedTemplate?.symbol || null,
            customerName: formData.customerName,
            customerTaxCode: formData.taxCode || null,
            customerAddress: formData.address || null,
            customerPhone: formData.phoneNumber || null, // Use phoneNumber from formData
            customerEmail: formData.email || null,
            subtotal: calculatedSubtotal.toFixed(2),
            tax: calculatedTax.toFixed(2),
            total: grandTotal.toFixed(2),
            paymentMethod: getPaymentMethodCode(selectedPaymentMethod), // Use numeric code
            invoiceDate: new Date(),
            status: "draft",
            einvoiceStatus: 0, // 0 = chưa phát hành
            notes: `E-Invoice saved for later publishing - Template: ${selectedTemplate?.templateNumber || "Not selected"}`,
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
                  ? parseFloat(item.taxRate || "0")
                  : item.taxRate || 0;
              const itemSubtotal = itemPrice * itemQuantity;
              const itemTax = (itemSubtotal * itemTaxRate) / 100;

              return {
                productId: item.id,
                productName: item.name,
                quantity: itemQuantity,
                unitPrice: itemPrice.toFixed(2),
                total: (itemSubtotal + itemTax).toFixed(2),
                taxRate: itemTaxRate.toFixed(2),
              };
            }),
            orderId: orderId // Link to the order if available
          };

          console.log(
            "💾 Saving unpublished invoice to database:",
            invoicePayload,
          );

          const invoiceResponse = await fetch("/api/invoices", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(invoicePayload),
          });

          if (invoiceResponse.ok) {
            const savedInvoice = await invoiceResponse.json();
            console.log(
              "✅ Unpublished invoice saved to database successfully:",
              savedInvoice,
            );
          } else {
            const errorText = await invoiceResponse.text();
            console.error(
              "❌ Failed to save unpublished invoice to database:",
              errorText,
            );
            toast({
              title: "Lỗi",
              description: "Không thể lưu hóa đơn chưa phát hành. " + errorText,
              variant: "destructive",
            });
          }
        } catch (invoiceSaveError) {
          console.error(
            "❌ Error saving unpublished invoice to database:",
            invoiceSaveError,
          );
          toast({
            title: "Lỗi",
            description: `Lỗi khi lưu hóa đơn chưa phát hành: ${invoiceSaveError}`,
            variant: "destructive",
          });
        }

      // Create enhanced receipt data for publish later
      const receiptData = {
        transactionId: `TXN-${Date.now()}`,
        invoiceNumber: null, // No invoice number for publish later
        createdAt: new Date().toISOString(),
        cashierName: "POS Cashier",
        paymentMethod: selectedPaymentMethod,
        customerName: formData.customerName,
        customerTaxCode: formData.taxCode,
        items: cartItems.map((item) => {
          const itemPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
          const itemQuantity = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity;
          const itemTaxRate = typeof item.taxRate === "string" ? parseFloat(item.taxRate || "0") : item.taxRate || 0;
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
        subtotal: calculatedSubtotal.toFixed(2),
        tax: calculatedTax.toFixed(2),
        total: grandTotal.toFixed(2),
        amountReceived: grandTotal.toFixed(2),
        change: "0.00",
        orderId: orderId || `temp-${Date.now()}`
      };

      // Prepare comprehensive invoice data for onConfirm - ALWAYS VALID
      const completeInvoiceData = {
        success: true,
        publishLater: true,
        einvoiceStatus: 0, // 0 = chưa phát hành
        status: 'draft',
        paymentMethod: selectedPaymentMethod,
        originalPaymentMethod: selectedPaymentMethod,
        customerName: formData.customerName,
        taxCode: formData.taxCode,
        cartItems: cartItems,
        total: grandTotal,
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        orderId: orderId,
        source: source || "pos",
        receipt: receiptData
      };

      console.log("✅ PUBLISH LATER: Data prepared for receipt modal:", completeInvoiceData);

      // ALWAYS call onConfirm to show receipt modal - NO CONDITIONS
      console.log("📄 PUBLISH LATER: Calling onConfirm to show receipt modal");
      onConfirm(completeInvoiceData);
      console.log("✅ PUBLISH LATER: onConfirm called - receipt modal should show");

      // Close the E-Invoice modal immediately
      onClose();

      console.log("--------------------------------------------------");

    } catch (error) {
      console.error("❌ Error in handlePublishLater:", error);

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

      // Don't call onConfirm on error to prevent white screen
      console.log("❌ PUBLISH LATER: Not calling onConfirm due to error");
    } finally {
      setIsPublishing(false); // Always reset loading state
    }
  };

  const handleConfirm = async () => {
    // Prevent duplicate calls
    if (isPublishing) {
      console.log("⚠️ Already processing publish, skipping duplicate call");
      return;
    }

    setIsPublishing(true);

    // Validate required fields
    if (!formData.invoiceProvider || !formData.customerName) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc: Đơn vị HĐĐT và Tên đơn vị",
        variant: "destructive",
      });
      setIsPublishing(false);
      return;
    }

    if (!formData.selectedTemplateId) {
      toast({
        title: "Lỗi", 
        description: "Vui lòng chọn mẫu số hóa đơn",
        variant: "destructive",
      });
      setIsPublishing(false);
      return;
    }

    setIsPublishing(true);

    console.log("🚀 Starting E-Invoice publishing process...");
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
        toast({
          title: "Lỗi kết nối",
          description: `Không tìm thấy thông tin kết nối cho ${formData.invoiceProvider}. Vui lòng kiểm tra cấu hình trong Settings.`,
          variant: "destructive",
        });
        setIsPublishing(false);
        return;
      }

      // Validate connection info completeness
      if (!connectionInfo.taxCode || !connectionInfo.loginId || !connectionInfo.password) {
        toast({
          title: "Lỗi cấu hình",
          description: `Thông tin kết nối cho ${formData.invoiceProvider} không đầy đủ. Vui lòng kiểm tra Mã số thuế, Login ID và Password trong Settings.`,
          variant: "destructive",
        });
        setIsPublishing(false);
        return;
      }

      // Validate cart items with detailed logging
      console.log("🔍 VALIDATING CART ITEMS FOR E-INVOICE");
      console.log("Raw cartItems:", JSON.stringify(cartItems, null, 2));
      console.log("CartItems type:", typeof cartItems);
      console.log("CartItems is array:", Array.isArray(cartItems));
      console.log("CartItems length:", cartItems?.length);

      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        console.error("❌ No valid cart items found:", {
          cartItems,
          isArray: Array.isArray(cartItems),
          length: cartItems?.length,
          total: total,
        });
        toast({
          title: "Lỗi dữ liệu",
          description: `Không có sản phẩm nào trong giỏ hàng để tạo hóa đơn điện tử. Số sản phẩm: ${cartItems?.length || 0}, Tổng tiền: ${total.toLocaleString("vi-VN")} ₫`,
          variant: "destructive",
        });
        setIsPublishing(false);
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
          console.log("❌ Invalid item found:", item);
        }
        return !isValid;
      });

      if (invalidItems.length > 0) {
        console.error("❌ Invalid cart items found:", invalidItems);
        toast({
          title: "Lỗi dữ liệu sản phẩm",
          description: `Có ${invalidItems.length} sản phẩm trong giỏ hàng thiếu thông tin. Vui lòng kiểm tra lại giỏ hàng.`,
          variant: "destructive",
        });
        setIsPublishing(false);
        return;
      }

      console.log("✅ All cart items are valid for e-invoice generation");

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

      // Convert cart items to invoice products with real data from shopping cart
      const invoiceProducts = cartItems.map((item, index) => {
        console.log(
          `📦 Processing cart item ${index + 1} for e-invoice:`,
          item,
        );

        // Ensure proper data types with robust parsing
        const itemPrice = (() => {
          if (typeof item.price === "string") {
            const parsed = parseFloat(item.price);
            return isNaN(parsed) ? 0 : parsed;
          }
          return typeof item.price === "number" ? item.price : 0;
        })();

        const itemQuantity = (() => {
          if (typeof item.quantity === "string") {
            const parsed = parseInt(item.quantity);
            return isNaN(parsed) ? 1 : Math.max(1, parsed);
          }
          return typeof item.quantity === "number"
            ? Math.max(1, item.quantity)
            : 1;
        })();

        const itemTaxRate = (() => {
          if (typeof item.taxRate === "string") {
            const parsed = parseFloat(item.taxRate);
            return isNaN(parsed) ? 0 : parsed;
          }
          return typeof item.taxRate === "number" ? item.taxRate : 0;
        })();

        // Calculate amounts
        const itemSubtotal = itemPrice * itemQuantity;
        const itemTax = (itemSubtotal * itemTaxRate) / 100;
        const itemTotal = itemSubtotal + itemTax;

        cartSubtotal += itemSubtotal;
        cartTaxAmount += itemTax;

        console.log(`💰 Item ${index + 1} calculations:`, {
          name: item.name,
          price: itemPrice,
          quantity: itemQuantity,
          taxRate: itemTaxRate,
          subtotal: itemSubtotal,
          tax: itemTax,
          total: itemTotal,
        });

        return {
          itmCd:
            item.sku || `SP${String(item.id || index + 1).padStart(3, "0")}`, // Sử dụng SKU thực tế từ cart
          itmName: item.name, // Sử dụng tên sản phẩm thực tế từ cart
          itmKnd: 1, // Loại sản phẩm (1 = hàng hóa)
          unitNm: "Cái", // Đơn vị tính
          qty: itemQuantity, // Số lượng thực tế từ cart
          unprc: itemPrice, // Đơn giá thực tế từ cart
          amt: Math.round(itemSubtotal), // Thành tiền chưa thuế
          discRate: 0, // Tỷ lệ chiết khấu
          discAmt: 0, // Tiền chiết khấu
          vatRt: itemTaxRate.toString(), // Thuế suất thực tế từ cart
          vatAmt: Math.round(itemTax), // Tiền thuế tính từ dữ liệu thực tế
          totalAmt: Math.round(itemTotal), // Tổng tiền có thuế tính từ dữ liệu thực tế
        };
      });

      const cartTotal = cartSubtotal + cartTaxAmount;

      console.log("💰 E-Invoice totals calculated from real cart data:", {
        subtotal: cartSubtotal,
        tax: cartTaxAmount,
        total: cartTotal,
        itemsCount: invoiceProducts.length,
      });

      // Get selected template data for API mapping
      const selectedTemplate = invoiceTemplates.find(
        (template) => template.id.toString() === formData.selectedTemplateId,
      );

      if (!selectedTemplate) {
        toast({
          title: "Lỗi mẫu hóa đơn",
          description: "Không tìm thấy thông tin mẫu số hóa đơn được chọn",
          variant: "destructive",
        });
        setIsPublishing(false);
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
        products: invoiceProducts,
      };

      console.log(
        "Publishing invoice with data:",
        JSON.stringify(publishRequest, null, 2),
      );

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
          errorData.message ||
            `API call failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log("Invoice published successfully:", result);

      if (result.success) {
        console.log(
          "✅ E-invoice published successfully, now saving invoice and order to database",
        );

        // Lưu thông tin hóa đơn vào bảng invoices với mapping phương thức thanh toán
        try {
          // Map phương thức thanh toán theo yêu cầu
          const paymentMethodCode = getPaymentMethodCode(selectedPaymentMethod);

          const invoicePayload = {
            invoiceNumber: result.data?.invoiceNo || null, // Số hóa đơn từ API response
            templateNumber: selectedTemplate.templateNumber || null, // Mẫu số hóa đơn
            symbol: selectedTemplate.symbol || null, // Ký hiệu hóa đơn
            customerName: formData.customerName || "Khách hàng",
            customerTaxCode: formData.taxCode || null,
            customerAddress: formData.address || null,
            customerPhone: formData.phoneNumber || null,
            customerEmail: formData.email || null,
            subtotal: cartSubtotal.toFixed(2),
            tax: cartTaxAmount.toFixed(2),
            total: cartTotal.toFixed(2),
            paymentMethod: paymentMethodCode, // Sử dụng mã số thay vì text
            invoiceDate: new Date(),
            status: "published",
            einvoiceStatus: 1, // 1 = Đã phát hành
            notes: `E-Invoice published - Symbol: ${selectedTemplate.symbol || "N/A"}, Template: ${selectedTemplate.templateNumber || "N/A"}, Transaction ID: ${publishRequest.transactionID}, Invoice No: ${result.data?.invoiceNo || "N/A"}`,
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
                  ? parseFloat(item.taxRate || "0")
                  : item.taxRate || 0;
              const itemSubtotal = itemPrice * itemQuantity;
              const itemTax = (itemSubtotal * itemTaxRate) / 100;

              return {
                productId: item.id,
                productName: item.name,
                quantity: itemQuantity,
                unitPrice: itemPrice.toFixed(2),
                total: (itemSubtotal + itemTax).toFixed(2),
                taxRate: itemTaxRate.toFixed(2),
              };
            }),
          };

          console.log(
            "💾 Saving published invoice to database:",
            invoicePayload,
          );

          const invoiceResponse = await fetch("/api/invoices", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(invoicePayload),
          });

          if (invoiceResponse.ok) {
            const savedInvoice = await invoiceResponse.json();
            console.log(
              "✅ Invoice saved to database successfully:",
              savedInvoice,
            );
          } else {
            console.error(
              "❌ Failed to save invoice to database:",
              await invoiceResponse.text(),
            );
          }
        } catch (invoiceSaveError) {
          console.error(
            "❌ Error saving invoice to database:",
            invoiceSaveError,
          );
        }

        // Lưu đơn hàng vào bảng orders với trạng thái "đã phát hành"
        try {
          const orderStatus = "paid";
          const publishType = "publish"; // Indicate that this is a direct publish
          const einvoiceStatus = 1; // 1 = Đã phát hành

          // Create order data
          const orderData = {
            orderNumber: `ORD-${Date.now()}`,
            tableId: null, // No table for POS orders
            customerName: formData.customerName,
            customerPhone: formData.phoneNumber || null,
            customerEmail: formData.email || null,
            subtotal: cartSubtotal.toFixed(2),
            tax: cartTaxAmount.toFixed(2),
            total: cartTotal.toFixed(2),
            status: orderStatus,
            paymentMethod: publishType === "publish" ? "cash" : null, // Use 'cash' for published, null for draft
            paymentStatus: publishType === "publish" ? "paid" : "pending",
            einvoiceStatus: einvoiceStatus,
            notes: `E-Invoice published - Tax Code: ${formData.taxCode || "N/A"}, Address: ${formData.address || "N/A"}`,
            orderedAt: new Date(),
            employeeId: null, // Can be set if employee info is available
            salesChannel: "pos",
          };

          console.log("💾 Saving published order to database:", orderData);

          const saveResponse = await fetch("/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(orderData),
          });

          if (saveResponse.ok) {
            const savedOrder = await saveResponse.json();
            console.log("✅ Order saved to database successfully:", savedOrder);
          } else {
            console.error(
              "❌ Failed to save order to database:",
              await saveResponse.text(),
            );
          }
        } catch (saveError) {
          console.error("❌ Error saving order to database:", saveError);
        }

        toast({
          title: "Thành công",
          description: `Hóa đơn điện tử đã được phát hành thành công!\nSố hóa đơn: ${result.data?.invoiceNo || "N/A"}`,
        });

        // Create receipt data immediately after successful publication
        const receiptData = {
          transactionId: publishRequest.transactionID || `TXN-${Date.now()}`,
          invoiceNumber: result.data?.invoiceNo || null,
          createdAt: new Date().toISOString(),
          cashierName: "POS Cashier",
          paymentMethod: selectedPaymentMethod || "einvoice",
          customerName: formData.customerName,
          customerTaxCode: formData.taxCode,
          customerAddress: formData.address || null,
          customerPhone: formData.phoneNumber || null,
          customerEmail: formData.email || null,
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
                ? parseFloat(item.taxRate || "0")
                : item.taxRate || 0;
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
          amountReceived: cartTotal.toFixed(2),
          change: "0.00",
          orderId: orderId || `temp-${Date.now()}`
        };

        console.log(
          "📄 Created receipt data for published e-invoice:",
          receiptData,
        );

        // Create the final result object for onConfirm - ALWAYS VALID
        const publishResult = {
          success: true,
          publishedImmediately: true,
          invoiceNumber: result.data?.invoiceNo || null,
          symbol: selectedTemplate.symbol || null,
          templateNumber: selectedTemplate.templateNumber || null,
          einvoiceStatus: 1, // Đã phát hành
          invoiceStatus: 1, // Hoàn thành
          status: 'published',
          paymentMethod: selectedPaymentMethod,
          originalPaymentMethod: selectedPaymentMethod,
          cartItems: cartItems,
          total: cartTotal,
          subtotal: cartSubtotal,
          tax: cartTaxAmount,
          customerName: formData.customerName,
          taxCode: formData.taxCode,
          orderId: orderId,
          source: source || "pos",
          receipt: receiptData
        };

        console.log("📄 IMMEDIATE PUBLISH: Data prepared for receipt modal:", publishResult);

        // ALWAYS call onConfirm to show receipt modal - NO CONDITIONS
        console.log("📄 IMMEDIATE PUBLISH: Calling onConfirm to show receipt modal");
        onConfirm(publishResult);
        console.log("✅ IMMEDIATE PUBLISH: onConfirm called - receipt modal should show");

        // Close the E-Invoice modal immediately
        onClose();

        // Force data refresh on all pages after successful publishing
        try {
          // Send WebSocket signal for immediate refresh
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${protocol}//${window.location.host}/ws`;
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            const refreshSignal = {
              type: 'einvoice_published',
              success: true,
              source: 'einvoice_modal',
              reason: 'invoice_published',
              orderId: orderId,
              invoiceNumber: publishResult.invoiceNumber,
              timestamp: new Date().toISOString()
            };

            console.log("📡 E-Invoice: Sending WebSocket refresh signal:", refreshSignal);
            ws.send(JSON.stringify(refreshSignal));

            setTimeout(() => ws.close(), 100);
          };

          ws.onerror = (error) => {
            console.warn("⚠️ E-Invoice: WebSocket error (non-critical):", error);
          };
        } catch (wsError) {
          console.warn("⚠️ E-Invoice: WebSocket signal failed (non-critical):", wsError);
        }

        // Dispatch custom events for cross-page coordination
        const refreshEvents = [
          new CustomEvent('einvoicePublished', {
            detail: {
              success: true,
              invoiceNumber: publishResult.invoiceNumber,
              orderId: orderId,
              source: 'einvoice_modal',
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('forceDataRefresh', {
            detail: {
              reason: 'einvoice_published',
              source: 'einvoice_modal',
              orderId: orderId,
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('paymentCompleted', {
            detail: {
              orderId: orderId,
              paymentMethod: 'einvoice',
              invoiceNumber: publishResult.invoiceNumber,
              timestamp: new Date().toISOString()
            }
          })
        ];

        refreshEvents.forEach(event => {
          console.log("📡 E-Invoice: Dispatching refresh event:", event.type);
          window.dispatchEvent(event);
        });

      } else {
        throw new Error(
          result.message || "Có lỗi xảy ra khi phát hành hóa đơn",
        );
      }
    } catch (error) {
      console.error("Error publishing invoice:", error);
      let errorMessage = "Có lỗi xảy ra khi phát hành hóa đơn";
      
      if (error instanceof Error) {
        errorMessage = `Lỗi phát hành hóa đơn: ${error.message}`;
      } else if (typeof error === "string") {
        errorMessage = `Lỗi phát hành hóa đơn: ${error}`;
      }
      
      toast({
        title: "Lỗi phát hành",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
    setIsPublishing(false); // Reset loading state
    onClose();
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-700 bg-blue-100 p-3 rounded-t-lg">
            Thông tin nhà cung cấp hóa đơn điện tử
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
                  Đơn vị HĐĐT
                </Label>
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
              </div>
              <div>
                <Label htmlFor="invoiceTemplate">
                  Mẫu số Hóa đơn GTGT
                </Label>
                <Select
                  value={formData.selectedTemplateId}
                  onValueChange={(value) =>
                    handleInputChange("selectedTemplateId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mẫu số hóa đơn" />
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
              Thông tin khách hàng
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxCode">Mã số thuế</Label>
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
                      "Lấy thông tin"
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="customerName">
                  Tên đơn vị
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
                <Label htmlFor="address">Địa chỉ</Label>
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
                <Label htmlFor="phoneNumber">Số CMND/CCCD</Label>
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
                <Label htmlFor="email">Email</Label>
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
              <span className="font-medium">Tổng tiền hóa đơn:</span>
              <span className="text-lg font-bold text-blue-600">
                {Math.floor(total).toLocaleString("vi-VN")} ₫
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
              type="button"
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Đang phát hành...
                </>
              ) : (
                <>
                  <span className="mr-2">✅</span>
                  Phát hành
                </>
              )}
            </Button>
            <Button
              onClick={handlePublishLater}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <span className="mr-2">⏳</span>
                  Phát hành sau
                </>
              )}
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