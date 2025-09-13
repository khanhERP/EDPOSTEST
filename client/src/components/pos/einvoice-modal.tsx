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
    afterTaxPrice?: string | number; // Add afterTaxPrice for detailed tax calculation
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
  const [isPublishing, setIsPublishing] = useState(false); // State for general publishing process
  const [isProcessingPublish, setIsProcessingPublish] = useState(false); // State for "Phát hành" button
  const [isProcessingPublishLater, setIsProcessingPublishLater] =
    useState(false); // State for "Phát hành sau" button
  const [lastActionTime, setLastActionTime] = useState(0); // Debounce timestamp
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

  // Helper function to get payment method name for transaction notes
  const getPaymentMethodName = (paymentMethod: string): string => {
    switch (paymentMethod) {
      case "cash":
        return "Tiền mặt";
      case "qrCode":
        return "QR Code";
      case "creditCard":
        return "Thẻ tín dụng";
      case "debitCard":
        return "Thẻ ghi nợ";
      case "momo":
        return "Momo";
      case "zalopay":
        return "ZaloPay";
      case "vnpay":
        return "VNPay";
      default:
        return "Khác";
    }
  };

  // Log the pre-selected payment method for debugging
  console.log(
    "💳 E-invoice modal received payment method:",
    selectedPaymentMethod,
  );

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
      // Pass the paymentMethod to the PUT request for status update
      return apiRequest("PUT", `/api/orders/${orderId}/status`, {
        status: "paid",
        paymentMethod, // Ensure paymentMethod is passed here
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

  const handlePublishLater = async (event?: React.MouseEvent) => {
    // Prevent event propagation and default behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Add debouncing to prevent rapid clicks
    const now = Date.now();
    if (now - lastActionTime < 1000) {
      console.log("⚠️ Debouncing: Action too soon, ignoring duplicate call");
      return;
    }
    setLastActionTime(now);

    // Prevent duplicate calls
    if (isProcessingPublishLater || isPublishing) {
      console.log(
        "⚠️ Already processing publish later, skipping duplicate call",
      );
      return;
    }

    setIsProcessingPublishLater(true); // Set processing state for this button

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
        setIsProcessingPublishLater(false);
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
        setIsProcessingPublishLater(false);
        return;
      }

      // Calculate subtotal and tax with proper type conversion
      const calculatedSubtotal = cartItems.reduce((sum, item) => {
        const itemPrice =
          typeof item.price === "string" ? parseFloat(item.price) : item.price;
        const itemQuantity =
          typeof item.quantity === "string"
            ? parseInt(item.quantity)
            : item.quantity;
        console.log(
          `💰 Item calculation: ${item.name} - Price: ${itemPrice}, Qty: ${itemQuantity}, Subtotal: ${itemPrice * itemQuantity}`,
        );
        return sum + itemPrice * itemQuantity;
      }, 0);

      const calculatedTax = cartItems.reduce((sum, item) => {
        const itemPrice =
          typeof item.price === "string" ? parseFloat(item.price) : item.price;
        const itemQuantity =
          typeof item.quantity === "string"
            ? parseInt(item.quantity)
            : item.quantity;
        const itemTaxRate =
          typeof item.taxRate === "string"
            ? parseFloat(item.taxRate || "0")
            : item.taxRate || 0;
        const itemTax = (itemPrice * itemQuantity * itemTaxRate) / 100;
        console.log(
          `💰 Tax calculation: ${item.name} - Tax rate: ${itemTaxRate}%, Tax: ${itemTax}`,
        );
        return sum + itemTax;
      }, 0);

      console.log(
        `💰 Total calculations: Subtotal: ${calculatedSubtotal}, Tax: ${calculatedTax}, Total: ${total}`,
      );

      // Lấy thông tin mẫu số hóa đơn được chọn
      const selectedTemplate = invoiceTemplates.find(
        (template) => template.id.toString() === formData.selectedTemplateId,
      );

      // Map phương thức thanh toán từ selectedPaymentMethod sang mã số
      const paymentMethodCode = getPaymentMethodCode(selectedPaymentMethod);

      // Chuẩn bị thông tin hóa đơn để lưu vào bảng invoices và invoice_items
      const invoicePayload = {
        invoiceNumber: null, // Chưa có số hóa đơn vì chưa phát hành
        templateNumber: selectedTemplate?.templateNumber || null, // Mẫu số hóa đơn
        symbol: selectedTemplate?.symbol || null, // Ký hiệu hóa đơn
        customerName: formData.customerName || "Khách hàng",
        customerTaxCode: formData.taxCode || null,
        customerAddress: formData.address || null,
        customerPhone: formData.phoneNumber || null,
        customerEmail: formData.email || null,
        subtotal: calculatedSubtotal.toFixed(2),
        tax: calculatedTax.toFixed(2),
        total: (typeof total === "number" && !isNaN(total)
          ? total
          : calculatedSubtotal + calculatedTax
        ).toFixed(2),
        paymentMethod: paymentMethodCode, // Sử dụng mã phương thức thanh toán thực tế
        invoiceDate: new Date(),
        status: "draft",
        einvoiceStatus: 0, // 0 = Chưa phát hành
        notes: `E-Invoice draft - MST: ${formData.taxCode || "N/A"}, Template: ${selectedTemplate?.name || "N/A"}, Đợi phát hành sau`,
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
        "💾 Lưu hóa đơn vào bảng invoices và invoice_items:",
        JSON.stringify(invoicePayload, null, 2),
      );

      // Lưu hóa đơn vào bảng invoices và invoice_items
      const invoiceResponse = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoicePayload),
      });

      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        console.error(
          "❌ Invoice save failed with status:",
          invoiceResponse.status,
        );
        console.error("❌ Error response:", errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        throw new Error(
          `Lưu hóa đơn thất bại: ${errorData.error || errorData.details || errorText}`,
        );
      }

      const savedInvoice = await invoiceResponse.json();
      console.log(
        "✅ Hóa đơn đã được lưu vào bảng invoices và invoice_items:",
        savedInvoice,
      );

      // Create receipt data for receipt modal
      console.log("formData_trường GGGGG", formData);
      const receiptData = {
        transactionId:
          savedInvoice.invoice?.invoiceNumber || `TXN-${Date.now()}`,
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
        subtotal: calculatedSubtotal.toFixed(2),
        tax: calculatedTax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: "einvoice",
        originalPaymentMethod: selectedPaymentMethod, // Add original payment method
        amountReceived: total.toFixed(2),
        change: "0.00",
        cashierName: "System User",
        createdAt: new Date().toISOString(),
        customerName: formData.customerName,
        customerTaxCode: formData.taxCode,
        invoiceId: savedInvoice.invoice?.id,
        invoiceNumber: savedInvoice.invoice?.invoiceNumber,
      };

      console.log("📄 Receipt data created for publish later:", receiptData);

      // Show success message
      toast({
        title: "Thành công",
        description:
          "Thông tin hóa đơn điện tử đã được lưu. Đang hiển thị màn hình in hóa đơn...",
      });

      // Prepare comprehensive invoice data with receipt to display receipt modal
      const completeInvoiceData = {
        success: true, // Add success flag
        paymentMethod: selectedPaymentMethod, // Use original payment method
        originalPaymentMethod: selectedPaymentMethod,
        publishLater: true,
        receipt: receiptData, // Receipt data to display receipt modal
        customerName: formData.customerName,
        taxCode: formData.taxCode,
        showReceiptModal: true, // Flag for parent component to show receipt modal
        shouldShowReceipt: true, // Additional flag for receipt display
        einvoiceStatus: 0, // 0 = Not issued yet (for publish later)
        status: "draft", // Draft status for publish later
        cartItems: cartItems, // Include cart items for receipt
        total: total, // Include total
        subtotal: total - calculatedTax, // Calculate from total - tax
        tax: calculatedTax,
        invoiceId: savedInvoice.invoice?.id,
        source: source || "pos",
        orderId: orderId,
      };

      console.log("✅ PUBLISH LATER: Prepared data for onConfirm");
      console.log("📄 PUBLISH LATER: Receipt data to pass:", receiptData);
      console.log(
        "📦 PUBLISH LATER: Complete invoice data:",
        completeInvoiceData,
      );

      // Call onConfirm to trigger receipt modal display
      onConfirm(completeInvoiceData);
      console.log(
        "✅ PUBLISH LATER: onConfirm called - parent will handle modal states",
      );

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
    } finally {
      setIsProcessingPublishLater(false); // Always reset processing state for this button
    }
  };

  const handleConfirm = async () => {
    // Removed event parameter as it's not used here in the new logic
    // Extracting relevant data from formData and props for clarity
    const { customerName, taxCode, address, email, selectedTemplateId } =
      formData;

    // Validate required fields
    if (!customerName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên khách hàng",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplateId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn mẫu số hóa đơn",
        variant: "destructive",
      });
      return;
    }

    // Determine if it's "publish now" or "publish later" based on some state or prop
    // For this example, let's assume there's a `selectedOption` state like in the original snippet
    // If not, this logic needs to be adapted to the actual component state management.
    // Assuming `selectedOption` is managed elsewhere or derived.
    // If `selectedOption` isn't available, default to "now" or handle the logic differently.
    const selectedOption = "now"; // Placeholder, replace with actual state if available

    setIsProcessingPublish(true); // Set processing state for the main publish button

    try {
      if (selectedOption === "now") {
        // Phát hành ngay - call API
        console.log("📧 E-Invoice: Phát hành ngay");

        // Fetch the selected template details to get templateNumber and symbol
        const selectedTemplate = invoiceTemplates.find(
          (template) => template.id.toString() === selectedTemplateId,
        );

        if (!selectedTemplate) {
          console.error("❌ Selected template not found");
          toast({
            title: "Lỗi",
            description: "Không tìm thấy thông tin mẫu hóa đơn được chọn.",
            variant: "destructive",
          });
          setIsProcessingPublish(false);
          return;
        }

        const { templateNumber, symbol } = selectedTemplate;

        const invoiceData = {
          customerName: customerName.trim(),
          taxCode: taxCode.trim() || null,
          address: address.trim() || null,
          email: email.trim() || null,
          total: total,
          items: cartItems.map((item) => ({
            productName: item.name,
            quantity:
              typeof item.quantity === "string"
                ? parseInt(item.quantity)
                : item.quantity,
            unitPrice:
              typeof item.price === "string"
                ? parseFloat(item.price)
                : item.price,
            total: (
              (typeof item.price === "string"
                ? parseFloat(item.price)
                : item.price) *
              (typeof item.quantity === "string"
                ? parseInt(item.quantity)
                : item.quantity)
            ).toFixed(2),
            taxRate: item.taxRate || 0,
            // Include afterTaxPrice if available for accurate tax calculation on receipt
            afterTaxPrice:
              item.afterTaxPrice !== undefined
                ? parseFloat(item.afterTaxPrice.toString())
                : undefined,
          })),
          templateNumber: templateNumber || "01GTKT0/001", // Fallback template number
          symbol: symbol || "AA/25E", // Fallback symbol
        };

        // Proceed with the API call to publish the invoice
        const response = await fetch("/api/einvoice/publish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(invoiceData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Attempt to parse error details
          throw new Error(
            errorData.message ||
              `Phát hành hóa đơn thất bại (Status: ${response.status})`,
          );
        }

        const result = await response.json();
        console.log("Invoice publish result:", result);

        if (!result.success) {
          throw new Error(
            result.message || "Phát hành hóa đơn không thành công.",
          );
        }

        toast({
          title: "Thành công",
          description: `Hóa đơn điện tử đã được phát hành. Số HĐ: ${result.data?.invoiceNo || "N/A"}`,
        });

        // Calculate subtotal and tax from cart items for the receipt
        let calculatedSubtotal = 0;
        let calculatedTax = 0;
        let discountAmount = 0; // Assuming discount is not handled here, set to 0

        cartItems.forEach((item) => {
          const price =
            typeof item.price === "string"
              ? parseFloat(item.price)
              : item.price;
          const quantity =
            typeof item.quantity === "string"
              ? parseInt(item.quantity)
              : item.quantity;
          const taxRate =
            typeof item.taxRate === "string"
              ? parseFloat(item.taxRate || "0")
              : item.taxRate || 0;

          const itemSubtotal = price * quantity;
          const itemTax = (itemSubtotal * taxRate) / 100;

          calculatedSubtotal += itemSubtotal;
          calculatedTax += itemTax;

          // If afterTaxPrice is provided, it can be used for more precise tax calculation
          if (
            item.afterTaxPrice !== undefined &&
            item.afterTaxPrice !== null &&
            item.afterTaxPrice !== ""
          ) {
            const afterTaxPrice = parseFloat(item.afterTaxPrice.toString());
            if (!isNaN(afterTaxPrice)) {
              const taxPerUnit = afterTaxPrice - price;
              calculatedTax += taxPerUnit * quantity; // Add tax calculated from afterTaxPrice
            }
          }
        });

        // Return the complete invoice data with all financial details for receipt display
        onConfirm({
          ...invoiceData,
          invoiceNumber: result.data?.invoiceNo || null,
          status: "issued", // Status after successful publishing
          transactionId: `INV-${Date.now()}`, // Generate a transaction ID
          einvoiceStatus: 1, // 1 = đã phát hành
          paymentMethod: selectedPaymentMethod || "cash", // Use provided or default
          amountReceived: total, // Total amount paid
          change: 0, // No change for e-invoice transactions typically
          subtotal: calculatedSubtotal, // Calculated subtotal from items
          tax: calculatedTax, // Calculated tax from items
          discount: discountAmount, // Discount amount
          customerName: customerName.trim(), // Customer name from form
          taxCode: taxCode.trim() || null, // Tax code from form
          address: address.trim() || null, // Address from form
          email: email.trim() || null, // Email from form
          customerTaxCode: taxCode.trim() || null, // For receipt data structure
          receipt: {
            // Construct receipt object
            transactionId: result.data?.invoiceNo || `INV-${Date.now()}`,
            items: invoiceData.items.map((item) => ({
              // Use processed items
              productId:
                cartItems.find((ci) => ci.name === item.productName)?.id ||
                Math.random(), // Placeholder ID if not found
              productName: item.productName,
              price: item.unitPrice.toFixed(2),
              quantity: item.quantity,
              total: item.total,
              sku:
                cartItems.find((ci) => ci.name === item.productName)?.sku ||
                `SKU-${Math.random()}`, // Placeholder SKU
              taxRate: item.taxRate,
            })),
            subtotal: calculatedSubtotal.toFixed(2),
            tax: calculatedTax.toFixed(2),
            total: total.toFixed(2),
            paymentMethod: selectedPaymentMethod || "cash",
            amountReceived: total.toFixed(2),
            change: "0.00",
            cashierName: "POS User",
            createdAt: new Date().toISOString(),
            invoiceNumber: result.data?.invoiceNo || null,
            customerName: customerName.trim(),
            customerTaxCode: taxCode.trim() || null,
          },
        });
      } else {
        // Phát hành sau - chỉ lưu thông tin
        console.log("📧 E-Invoice: Phát hành sau");

        // Fetch the selected template details for "publish later" data
        const selectedTemplate = invoiceTemplates.find(
          (template) => template.id.toString() === selectedTemplateId,
        );

        if (!selectedTemplate) {
          console.error("❌ Selected template not found for publish later");
          toast({
            title: "Lỗi",
            description: "Không tìm thấy thông tin mẫu hóa đơn được chọn.",
            variant: "destructive",
          });
          setIsProcessingPublish(false);
          return;
        }

        const { templateNumber, symbol } = selectedTemplate;

        // Calculate subtotal and tax from cart items for the receipt
        let calculatedSubtotal = 0;
        let calculatedTax = 0;
        let discountAmount = 0; // Assuming discount is not handled here, set to 0

        cartItems.forEach((item) => {
          const price =
            typeof item.price === "string"
              ? parseFloat(item.price)
              : item.price;
          const quantity =
            typeof item.quantity === "string"
              ? parseInt(item.quantity)
              : item.quantity;
          const taxRate =
            typeof item.taxRate === "string"
              ? parseFloat(item.taxRate || "0")
              : item.taxRate || 0;

          const itemSubtotal = price * quantity;
          const itemTax = (itemSubtotal * taxRate) / 100;

          calculatedSubtotal += itemSubtotal;
          calculatedTax += itemTax;

          // If afterTaxPrice is provided, it can be used for more precise tax calculation
          if (
            item.afterTaxPrice !== undefined &&
            item.afterTaxPrice !== null &&
            item.afterTaxPrice !== ""
          ) {
            const afterTaxPrice = parseFloat(item.afterTaxPrice.toString());
            if (!isNaN(afterTaxPrice)) {
              const taxPerUnit = afterTaxPrice - price;
              calculatedTax += taxPerUnit * quantity; // Add tax calculated from afterTaxPrice
            }
          }
        });

        const invoiceData = {
          customerName: customerName.trim(),
          taxCode: taxCode.trim() || null,
          address: address.trim() || null,
          email: email.trim() || null,
          total: total,
          items: cartItems.map((item) => ({
            // Process items for consistency
            productName: item.name,
            quantity:
              typeof item.quantity === "string"
                ? parseInt(item.quantity)
                : item.quantity,
            unitPrice:
              typeof item.price === "string"
                ? parseFloat(item.price)
                : item.price,
            total: (
              (typeof item.price === "string"
                ? parseFloat(item.price)
                : item.price) *
              (typeof item.quantity === "string"
                ? parseInt(item.quantity)
                : item.quantity)
            ).toFixed(2),
            taxRate: item.taxRate || 0,
            afterTaxPrice:
              item.afterTaxPrice !== undefined
                ? parseFloat(item.afterTaxPrice.toString())
                : undefined,
          })),
          templateNumber: templateNumber || "01GTKT0/001", // Fallback template number
          symbol: symbol || "AA/25E", // Fallback symbol
          status: "pending", // Status for pending invoice
          transactionId: `TXN-${Date.now()}`, // Transaction ID for pending invoices
          einvoiceStatus: 0, // 0 = chờ phát hành
          paymentMethod: selectedPaymentMethod || "cash", // Payment method
          amountReceived: total, // Total amount paid
          change: 0, // No change
          subtotal: calculatedSubtotal, // Calculated subtotal
          tax: calculatedTax, // Calculated tax
          discount: discountAmount, // Discount amount
          customerName: customerName.trim(), // Customer name
          taxCode: taxCode.trim() || null, // Tax code
          address: address.trim() || null, // Address
          email: email.trim() || null, // Email
          customerTaxCode: taxCode.trim() || null, // For receipt data structure
          receipt: {
            // Construct receipt object
            transactionId: `TXN-${Date.now()}`,
            items: invoiceData.items.map((item) => ({
              productId:
                cartItems.find((ci) => ci.name === item.productName)?.id ||
                Math.random(),
              productName: item.productName,
              price: item.unitPrice.toFixed(2),
              quantity: item.quantity,
              total: item.total,
              sku:
                cartItems.find((ci) => ci.name === item.productName)?.sku ||
                `SKU-${Math.random()}`,
              taxRate: item.taxRate,
            })),
            subtotal: calculatedSubtotal.toFixed(2),
            tax: calculatedTax.toFixed(2),
            total: total.toFixed(2),
            paymentMethod: selectedPaymentMethod || "cash",
            amountReceived: total.toFixed(2),
            change: "0.00",
            cashierName: "POS User",
            createdAt: new Date().toISOString(),
            invoiceNumber: null, // No invoice number yet
            customerName: customerName.trim(),
            customerTaxCode: taxCode.trim() || null,
          },
        };

        toast({
          title: "Thành công",
          description: "Thông tin hóa đơn đã được lưu để phát hành sau",
        });

        onConfirm(invoiceData);
      }
    } catch (error) {
      console.error("❌ E-Invoice error:", error);
      toast({
        title: "Lỗi",
        description:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi xử lý hóa đơn",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPublish(false); // Ensure processing state is reset
    }
  };

  const handleCancel = () => {
    setIsPublishing(false); // Reset general publishing state
    setIsProcessingPublish(false); // Reset specific publish button state
    setIsProcessingPublishLater(false); // Reset specific publish later button state
    setLastActionTime(0); // Reset debounce timer
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
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
                    placeholder="0123456789"
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
                <Label htmlFor="phoneNumber">
                  {t("einvoice.idCardNumber")}
                </Label>
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
              {showVirtualKeyboard
                ? "Ẩn bàn phím"
                : t("einvoice.virtualKeyboard")}
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
              type="button"
              onClick={handleConfirm} // Changed to call handleConfirm directly
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={
                isProcessingPublish || isPublishing || isProcessingPublishLater
              } // Disable if ANY processing is happening
            >
              {isProcessingPublish || isPublishing ? (
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
              type="button"
              onClick={(e) => handlePublishLater(e)}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              disabled={
                isProcessingPublishLater || isPublishing || isProcessingPublish
              } // Disable if ANY processing is happening
            >
              {isProcessingPublishLater || isPublishing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  {t("einvoice.publishing")}
                </>
              ) : (
                <>
                  <span className="mr-2">⏳</span>
                  {t("einvoice.publishLater")}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLastActionTime(0); // Reset debounce timer
                handleCancel();
              }}
              className="flex-1"
              disabled={
                isProcessingPublish || isProcessingPublishLater || isPublishing
              } // Disable if ANY processing is happening
            >
              <span className="mr-2">❌</span>
              {t("einvoice.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
