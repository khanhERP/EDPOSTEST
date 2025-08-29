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
  const [isProcessed, setIsProcessed] = useState(false); // New state to track if processing has started
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
  const { data: eInvoiceConnections = [], isLoading: connectionsLoading } = useQuery<any[]>({
    queryKey: ["/api/einvoice-connections"],
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch active invoice templates for dropdown
  const { data: allInvoiceTemplates = [], isLoading: templatesLoading } = useQuery<any[]>({
    queryKey: ["/api/invoice-templates/active"],
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch products for SKU lookup
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Filter templates to only show ones that are in use (useCK: true)
  const invoiceTemplates = allInvoiceTemplates.filter(
    (template) => template && template.useCK === true,
  );

  // Reset form only when modal first opens with fresh data, not when already processed
  useEffect(() => {
    if (isOpen && !templatesLoading && !connectionsLoading && invoiceTemplates.length > 0 && !isProcessed) {
      console.log("🔥 E-INVOICE MODAL OPENING WITH FRESH DATA");
      console.log("🔥 cartItems when modal opens:", cartItems);
      console.log("🔥 cartItems length when modal opens:", cartItems?.length || 0);
      console.log("🔥 cartItems is array when modal opens:", Array.isArray(cartItems));
      console.log("🔥 total when modal opens:", total);
      console.log("🔥 Available templates:", invoiceTemplates.length);

      // Only reset form if it's truly a fresh open (not after processing)
      if (formData.customerName === "" || formData.customerName === "Khách hàng lẻ") {
        // Set default template if available
        const defaultTemplateId = invoiceTemplates.length > 0 ? invoiceTemplates[0].id.toString() : "";

        setFormData({
          invoiceProvider: "EasyInvoice", // Default provider
          invoiceTemplate: "1C25TYY", // Default template
          selectedTemplateId: defaultTemplateId,
          taxCode: "0123456789", // Default tax code
          customerName: "Khách hàng lẻ", // Default customer name
          address: "",
          phoneNumber: "",
          email: "",
        });
      }
    }
  }, [isOpen, templatesLoading, connectionsLoading, invoiceTemplates.length, isProcessed]); // Add isProcessed to deps

  // Separate effect for debugging cartItems changes without resetting form
  useEffect(() => {
    if (isOpen && cartItems && Array.isArray(cartItems)) {
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
    console.log("🟡 handlePublishLater called");
    console.log("🟡 Form data:", formData);
    console.log("🟡 Cart items:", cartItems);
    console.log("🟡 Total:", total);

    setIsProcessed(true); // Mark processing as started

    try {
      console.log(
        "🟡 PHÁT HÀNH SAU - Lưu thông tin hóa đơn vào bảng invoices và invoice_items",
      );
      console.log("🟡 Source:", source, "OrderId:", orderId);

      // Debug log current cart items
      console.log("=== PHÁT HÀNH SAU - KIỂM TRA DỮ LIỆU ===");
      console.log("cartItems received:", cartItems);
      console.log("cartItems length:", cartItems?.length || 0);
      console.log("cartItems detailed:", JSON.stringify(cartItems, null, 2));
      console.log("total amount:", total);

      // Validate cart items first
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        console.error("❌ No valid cart items found for later publishing");
        toast({
          title: "Cảnh báo",
          description: "Không có sản phẩm trong giỏ hàng để phát hành sau.",
          variant: "destructive",
        });
        return;
      }

      // Calculate subtotal and tax with proper type conversion using afterTaxPrice logic
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

        // Use afterTaxPrice if available for exact tax calculation
        if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
          const afterTax = typeof item.afterTaxPrice === 'string'
            ? parseFloat(item.afterTaxPrice)
            : item.afterTaxPrice;
          const itemTax = (afterTax - itemPrice) * itemQuantity;
          console.log(
            `💰 Tax calculation (afterTaxPrice): ${item.name} - Base: ${item.price}, After tax: ${afterTax}, Tax per unit: ${afterTax - itemPrice}, Total tax: ${itemTax}`,
          );
          return sum + itemTax;
        } else {
          // Fallback to taxRate calculation
          const itemTaxRate =
            typeof item.taxRate === "string"
              ? parseFloat(item.taxRate || "10")
              : item.taxRate || 10;
          const itemTax = (itemPrice * itemQuantity * itemTaxRate) / 100;
          console.log(
            `💰 Tax calculation (taxRate): ${item.name} - Tax rate: ${itemTaxRate}%, Tax: ${itemTax}`,
          );
          return sum + itemTax;
        }
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
              ? parseFloat(item.taxRate || "10")
              : item.taxRate || 10;
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

      // Save invoice data to database for later publishing
      const invoiceResponse = await apiRequest("POST", "/api/invoices", invoicePayload);

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json();
        console.error("❌ Failed to save invoice:", errorData);
        throw new Error(`Failed to save invoice: ${errorData.message || 'Unknown error'}`);
      }

      const invoiceResult = await invoiceResponse.json();
      console.log("✅ Hóa đơn đã được lưu vào bảng invoices và invoice_items:", invoiceResult);

      // Create transaction to deduct inventory for "Phát hành sau"
      try {
        const transactionData = {
          transaction: {
            transactionId: `EINV-DRAFT-${Date.now()}`,
            subtotal: calculatedSubtotal.toFixed(2),
            tax: calculatedTax.toFixed(2),
            total: total.toFixed(2),
            paymentMethod: "einvoice",
            amountReceived: total.toFixed(2),
            change: "0.00",
            cashierName: "E-Invoice System",
            notes: `E-Invoice Draft - Trừ tồn kho: ${invoiceResult?.invoice?.tradeNumber || 'N/A'}`,
            invoiceId: invoiceResult?.invoice?.id || null,
            createdAt: new Date().toISOString()
          },
          items: cartItems.map((item) => {
            const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
            const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
            const itemTotal = itemPrice * itemQuantity;

            console.log(`📦 Preparing transaction item: ${item.name} - Price: ${itemPrice}, Qty: ${itemQuantity}, Total: ${itemTotal}`);

            return {
              productId: item.id,
              quantity: itemQuantity,
              price: itemPrice.toFixed(2),
              total: itemTotal.toFixed(2),
              productName: item.name
            };
          })
        };

        console.log("💾 Creating transaction to deduct inventory for 'Phát hành sau':", JSON.stringify(transactionData, null, 2));

        const transactionResponse = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transactionData),
        });

        if (transactionResponse.ok) {
          const transactionResult = await transactionResponse.json();
          console.log("✅ Transaction created successfully - inventory deducted:", transactionResult);
        } else {
          const transactionError = await transactionResponse.text();
          console.error("❌ Error creating transaction for inventory:", transactionError);
        }
      } catch (transactionError) {
        console.error("❌ Error creating transaction for inventory:", transactionError);
      }

      // Create receipt data for "Phát hành sau"
      const receiptData = {
        transactionId: invoiceResult?.invoice?.tradeNumber || `TXN-${Date.now()}`,
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

          // Use afterTaxPrice for exact tax calculation if available
          let itemTax;
          if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
            const afterTax = typeof item.afterTaxPrice === 'string'
              ? parseFloat(item.afterTaxPrice)
              : item.afterTaxPrice;
            itemTax = (afterTax - itemPrice) * itemQuantity;
          } else {
            itemTax = (itemSubtotal * itemTaxRate) / 100;
          }

          return {
            id: item.id,
            productId: item.id,
            productName: item.name,
            price: itemPrice.toFixed(2),
            quantity: itemQuantity,
            total: (itemSubtotal + itemTax).toFixed(2),
            sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
            taxRate: itemTaxRate,
            afterTaxPrice: item.afterTaxPrice,
          };
        }),
        subtotal: calculatedSubtotal.toFixed(2),
        tax: calculatedTax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: "einvoice",
        originalPaymentMethod: selectedPaymentMethod,
        amountReceived: total.toFixed(2),
        change: "0.00",
        cashierName: "System User",
        createdAt: new Date().toISOString(),
        invoiceNumber: invoiceResult?.invoice?.tradeNumber || null,
        customerName: formData.customerName,
        customerTaxCode: formData.taxCode,
      };

      console.log("📄 Receipt data created with", cartItems.length, "items:", receiptData);

      // Prepare complete invoice data with receipt for immediate display
      const completeInvoiceData = {
        ...formData,
        cartItems: cartItems,
        total: total || 0,
        paymentMethod: selectedPaymentMethod,
        originalPaymentMethod: selectedPaymentMethod,
        source: source || "pos",
        invoiceId: invoiceResult?.invoice?.id || null,
        publishLater: true,
        savedInvoice: invoiceResult?.invoice || null,
        receipt: receiptData,
        showReceiptModal: true,
      };

      console.log("✅ Calling onConfirm with publishLater data and receipt");
      console.log("📄 Complete invoice data:", completeInvoiceData);
      console.log("📄 Receipt data to display:", receiptData);

      // Call onConfirm with the complete data including receipt
      onConfirm(completeInvoiceData);

      // Close e-invoice modal after triggering the receipt display
        // Don't reset isProcessed here to prevent form reset on next open
        setTimeout(() => {
          onClose();
          console.log("🔴 E-Invoice modal closed after publishLater processing");
        }, 100);

      toast({
        title: "Thành công",
        description: "Hóa đơn đã được lưu để phát hành sau và đang hiển thị để in.",
      });

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
      setIsProcessed(false); // Reset processing state
      setIsPublishing(false);
    }
  };

  const handleConfirm = async () => {
    console.log("🟢 handleConfirm called");
    console.log("🟢 Form data:", formData);
    console.log("🟢 Cart items:", cartItems);
    console.log("🟢 Invoice templates:", invoiceTemplates);

    // Validate required fields
    if (!formData.invoiceProvider || !formData.customerName) {
      console.error("❌ Missing required fields:", {
        invoiceProvider: formData.invoiceProvider,
        customerName: formData.customerName
      });
      toast({
        title: "Lỗi validation",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc: Đơn vị HĐĐT và Tên đơn vị",
        variant: "destructive"
      });
      return;
    }

    if (!formData.selectedTemplateId && invoiceTemplates.length > 0) {
      console.error("❌ No template selected");
      toast({
        title: "Lỗi validation", 
        description: "Vui lòng chọn mẫu số hóa đơn",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true); // Set publishing to true
    setIsProcessed(true); // Mark processing as started

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
        let taxAmount = 0;

        // Use afterTaxPrice if available for exact tax calculation
        if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
          const afterTax = typeof item.afterTaxPrice === 'string'
            ? parseFloat(item.afterTaxPrice)
            : item.afterTaxPrice;
          taxAmount = (afterTax - item.price) * item.quantity;
          console.log(`💰 Tax calculation (afterTaxPrice): ${item.name} - Base: ${item.price}, After tax: ${afterTax}, Tax per unit: ${afterTax - item.price}, Total tax: ${taxAmount}`);
        } else {
          // Fallback to taxRate calculation
          taxAmount = (itemSubtotal * (item.taxRate || 0)) / 100;
          console.log(`💰 Tax calculation (taxRate): ${item.name} - Tax rate: ${item.taxRate || 0}%, Tax: ${taxAmount}`);
        }

        const itemTotal = itemSubtotal + taxAmount;

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
          setIsProcessed(false); // Reset processed state on error
          return;
        }

        const publishResult = await publishResponse.json();
        console.log("✅ E-invoice published successfully:", publishResult);

        // Create transaction to deduct inventory for immediate publishing
        try {
          const transactionData = {
            transaction: {
              transactionId: `EINV-PUB-${Date.now()}`,
              subtotal: cartSubtotal.toFixed(2),
              tax: cartTaxAmount.toFixed(2),
              total: cartTotal.toFixed(2),
              paymentMethod: "einvoice",
              amountReceived: cartTotal.toFixed(2),
              change: "0.00",
              cashierName: "E-Invoice System",
              notes: `E-Invoice Published - Trừ tồn kho: ${publishResult.data?.invoiceNo || 'Published'}`,
              invoiceNumber: publishResult.data?.invoiceNo,
              createdAt: new Date().toISOString()
            },
            items: cartItems.map((item) => {
              const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
              const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
              const itemTotal = itemPrice * itemQuantity;

              console.log(`📦 Preparing published transaction item: ${item.name} - Price: ${itemPrice}, Qty: ${itemQuantity}, Total: ${itemTotal}`);

              return {
                productId: item.id,
                quantity: item.quantity,
                price: itemPrice.toFixed(2),
                total: itemTotal.toFixed(2),
                productName: item.name
              };
            })
          };

          console.log("🔄 Creating transaction to deduct inventory for published invoice:", JSON.stringify(transactionData, null, 2));

          const transactionResponse = await fetch("/api/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(transactionData),
          });

          if (transactionResponse.ok) {
            const transactionResult = await transactionResponse.json();
            console.log("✅ Transaction created successfully for published invoice:", transactionResult);
          } else {
            const transactionError = await transactionResponse.text();
            console.error("❌ Failed to create transaction for published invoice:", transactionError);
          }
        } catch (transactionError) {
          console.error("❌ Error creating transaction for published invoice:", transactionError);
        }

        console.log(
          "✅ E-invoice published successfully, now saving invoice and order to database",
        );

        // Lưu thông tin hóa đơn vào bảng invoices với mapping phương thức thanh toán
        try {
          // Map phương thức thanh toán theo yêu cầu
          const paymentMethodCode = getPaymentMethodCode(selectedPaymentMethod);

          const invoicePayload = {
            invoiceNumber: publishResult.data?.invoiceNo || null, // Số hóa đơn từ API response
            templateNumber: selectedTemplate.templateNumber || null, // Mẫu số hóa đơn từ selectedTemplate
            symbol: selectedTemplate.symbol || null, // Ký hiệu hóa đơn từ selectedTemplate
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
            notes: `E-Invoice published - Symbol: ${selectedTemplate.symbol || "N/A"}, Template: ${selectedTemplate.templateNumber || "N/A"}, Transaction ID: ${publishRequest.transactionID}, Invoice No: ${publishResult.data?.invoiceNo || "N/A"}`,
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
            "Saving published invoice to database:",
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
            const errorText = await invoiceResponse.text();
            console.error("❌ Failed to save invoice to database:", errorText);
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

          // Create order data với thông tin template từ selectedTemplate
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
            templateNumber: selectedTemplate.templateNumber || null, // Lưu templateNumber từ selectedTemplate
            symbol: selectedTemplate.symbol || null, // Lưu symbol từ selectedTemplate
            invoiceNumber: publishResult.data?.invoiceNo || null, // Lưu invoiceNumber từ API response
            notes: `E-Invoice published - Tax Code: ${formData.taxCode || "N/A"}, Address: ${formData.address || "N/A"}, Template: ${selectedTemplate.templateNumber || "N/A"}, Symbol: ${selectedTemplate.symbol || "N/A"}, Invoice No: ${publishResult.data?.invoiceNo || "N/A"}`,
            orderedAt: new Date(),
            employeeId: null, // Can be set if employee info is available
            salesChannel: "pos",
          };

          console.log("Saving published order to database:", orderData);

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
          originalPaymentMethod: selectedPaymentMethod,
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

        // Prepare comprehensive invoice data with all necessary flags
        const invoiceResultForConfirm = {
          ...formData,
          invoiceData: publishResult.data,
          cartItems: cartItems,
          total: total,
          paymentMethod: selectedPaymentMethod, // Use original payment method
          originalPaymentMethod: selectedPaymentMethod,
          source: source || "pos",
          orderId: orderId,
          publishedImmediately: true, // Flag để phân biệt với phát hành sau
          receipt: receiptData, // Truyền receipt data đã tạo
          customerName: formData.customerName,
          taxCode: formData.taxCode,
          invoiceNumber: publishResult.data?.invoiceNo || null,
        };

        console.log("✅ Prepared comprehensive invoice result:", invoiceResultForConfirm);

        console.log("✅ Prepared comprehensive invoice result with receipt:", invoiceResultForConfirm);

        // Close e-invoice modal and return data with receipt for printing
        onClose();
        onConfirm(invoiceResultForConfirm);
      } catch (error) {
        console.error("Error publishing invoice:", error);
        alert(`Có lỗi xảy ra khi phát hành hóa đơn: ${error}`);
      }
    } catch (error) {
      console.error("Error publishing invoice:", error);
      alert(`Có lỗi xảy ra khi phát hành hóa đơn: ${error}`);
    } finally {
      setIsPublishing(false); // Reset publishing state
      // isProcessed is reset at the start of the next modal open
    }
  };

  const handleCancel = () => {
    setIsProcessed(false); // Reset processed state when closing
    onClose();
  };

  // Reset processed state when modal closes
  useEffect(() => {
    if (!isOpen && isProcessed) {
      console.log("🔄 Resetting processed state as modal closed");
      setIsProcessed(false);
    }
  }, [isOpen, isProcessed]);

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => { if (isOpen) { onClose(); } else { onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-blue-700 bg-blue-100 p-3 rounded-t-lg">
            {t("einvoice.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Loading indicator */}
          {(templatesLoading || connectionsLoading) && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Đang tải dữ liệu...</span>
            </div>
          )}

          {/* Data availability warning */}
          {isOpen && !templatesLoading && !connectionsLoading && 
           (!cartItems || cartItems.length === 0) && (!total || total === 0) && (
            <div className="flex items-center justify-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-sm text-yellow-700">⚠️ Chưa có dữ liệu giỏ hàng. Vui lòng thử lại.</span>
            </div>
          )}

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
                  disabled={templatesLoading || invoiceTemplates.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        templatesLoading 
                          ? "Đang tải mẫu số..." 
                          : invoiceTemplates.length === 0
                          ? "Không có mẫu số nào"
                          : t("einvoice.selectTemplate")
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceTemplates.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id.toString()}
                      >
                        {template.name} ({template.templateNumber})
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
              <span className="font-medium">{t("einvoice.totalAmount") || "Tổng tiền hóa đơn"}</span>
              <span className="text-lg font-bold text-blue-600">
                {(() => {
                  console.log('💰 EInvoice Modal - Total display calculation:', { 
                    total, 
                    totalType: typeof total,
                    cartItems: cartItems?.length,
                    isOpen,
                    cartItemsData: cartItems
                  });

                  // Always prioritize cartItems calculation for accuracy
                  let displayTotal = 0;

                  // Calculate from cartItems first (most reliable)
                  if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
                    displayTotal = cartItems.reduce((sum, item) => {
                      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
                      
                      // Use afterTaxPrice if available for exact calculation
                      if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "" && item.afterTaxPrice !== "0") {
                        const afterTaxPrice = typeof item.afterTaxPrice === 'string' ? parseFloat(item.afterTaxPrice) : item.afterTaxPrice;
                        if (!isNaN(afterTaxPrice) && afterTaxPrice > 0) {
                          const itemTotal = afterTaxPrice * quantity;
                          console.log(`💰 Item ${item.name}: afterTaxPrice=${afterTaxPrice}, qty=${quantity}, total=${itemTotal}`);
                          return sum + itemTotal;
                        }
                      } else {
                        // Calculate with tax rate
                        const taxRate = typeof item.taxRate === 'string' ? parseFloat(item.taxRate || '0') : item.taxRate || 0;
                        const subtotal = price * quantity;
                        const tax = (subtotal * taxRate) / 100;
                        const itemTotal = subtotal + tax;
                        console.log(`💰 Item ${item.name}: price=${price}, qty=${quantity}, taxRate=${taxRate}%, total=${itemTotal}`);
                        return sum + itemTotal;
                      }
                    }, 0);
                    console.log('💰 EInvoice Modal - Calculated from cartItems:', displayTotal);
                  }
                  // Only use total prop if no cartItems available
                  else if (total && typeof total === 'number' && total > 0) {
                    displayTotal = total;
                    console.log('💰 EInvoice Modal - Using total prop (no cartItems):', displayTotal);
                  }
                  // Show loading if no data
                  else {
                    console.log('💰 EInvoice Modal - No data available, showing loading');
                    return "Đang tải...";
                  }

                  console.log('💰 EInvoice Modal - Final display total:', displayTotal);
                  return Math.floor(displayTotal).toLocaleString("vi-VN");
                })()}
                {" "}₫
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
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (!isProcessed && !isPublishing) {
                  console.log("🟢 Phát hành button clicked");
                  handleConfirm();
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isPublishing || isProcessed}
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  {t("einvoice.publishing") || "Đang phát hành..."}
                </>
              ) : (
                <>
                  <span className="mr-2">✅</span>
                  {t("einvoice.publish") || "Phát hành"}
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log("🟡 Phát hành sau button clicked");
                if (!isProcessed && !isPublishing) {
                  handlePublishLater();
                }
              }}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              disabled={isPublishing || isProcessed}
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
            <Button 
              type="button"
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                console.log("❌ Cancel button clicked");
                if (!isProcessed && !isPublishing) {
                  handleCancel();
                }
              }} 
              className="flex-1"
              disabled={isPublishing || isProcessed}
            >
              <span className="mr-2">❌</span>
              {t("einvoice.cancel") || "Hủy bỏ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}