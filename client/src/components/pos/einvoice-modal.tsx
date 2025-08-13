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
  source?: 'pos' | 'table'; // Thêm prop để phân biệt nguồn gọi
  orderId?: number; // Thêm orderId để tự xử lý cập nhật trạng thái
}

export function EInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  cartItems = [],
  source = 'pos', // Default là 'pos' để tương thích ngược
  orderId, // Thêm orderId prop
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

  // Mutation để hoàn tất thanh toán và cập nhật trạng thái
  const completePaymentMutation = useMutation({
    mutationFn: ({ orderId, paymentMethod }: { orderId: number; paymentMethod: string }) => {
      console.log('🔄 E-invoice modal: Starting payment completion mutation for order:', orderId);
      return apiRequest('PUT', `/api/orders/${orderId}/status`, { status: 'paid', paymentMethod });
    },
    onSuccess: (data, variables) => {
      console.log('🎯 E-invoice modal completed payment successfully for order:', variables.orderId);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });

      toast({
        title: 'Thanh toán thành công',
        description: 'Hóa đơn điện tử đã được phát hành và đơn hàng đã được thanh toán',
      });

      console.log('✅ E-invoice modal: Payment completed, queries invalidated');
    },
    onError: (error, variables) => {
      console.error('❌ Error completing payment from e-invoice modal for order:', variables.orderId, error);
      toast({
        title: 'Lỗi',
        description: 'Hóa đơn điện tử đã phát hành nhưng không thể hoàn tất thanh toán',
        variant: 'destructive',
      });

      console.log('❌ E-invoice modal: Payment failed for order:', variables.orderId);
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
  const invoiceTemplates = allInvoiceTemplates.filter(template => template.useCK === true);

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

    const currentValue = formData[activeInputField as keyof typeof formData] || '';
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

    const currentValue = formData[activeInputField as keyof typeof formData] || '';
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
      setActiveInputField('taxCode');
      setTimeout(() => {
        const inputRef = inputRefs.current['taxCode'];
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
    try {
      console.log("🟡 PHÁT HÀNH SAU - Lưu thông tin đơn hàng không phát hành");
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
          title: 'Lỗi',
          description: 'Không có sản phẩm nào trong giỏ hàng để lưu thông tin.',
          variant: 'destructive',
        });
        return;
      }

      // Calculate subtotal and tax with proper type conversion
      const calculatedSubtotal = cartItems.reduce((sum, item) => {
        const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
        console.log(`💰 Item calculation: ${item.name} - Price: ${itemPrice}, Qty: ${itemQuantity}, Subtotal: ${itemPrice * itemQuantity}`);
        return sum + (itemPrice * itemQuantity);
      }, 0);

      const calculatedTax = cartItems.reduce((sum, item) => {
        const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
        const itemTaxRate = typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "10") : (item.taxRate || 10);
        const itemTax = (itemPrice * itemQuantity * itemTaxRate / 100);
        console.log(`💰 Tax calculation: ${item.name} - Tax rate: ${itemTaxRate}%, Tax: ${itemTax}`);
        return sum + itemTax;
      }, 0);

      console.log(`💰 Total calculations: Subtotal: ${calculatedSubtotal}, Tax: ${calculatedTax}, Total: ${total}`);

      // Lưu thông tin hóa đơn nháp vào bảng invoices trước
      const invoicePayload = {
        invoiceNumber: `DRAFT-${Date.now()}`,
        customerName: formData.customerName || "Khách hàng",
        customerTaxCode: formData.taxCode || null,
        customerAddress: formData.address || null,
        customerPhone: formData.phoneNumber || null,
        customerEmail: formData.email || null,
        subtotal: calculatedSubtotal.toFixed(2),
        tax: calculatedTax.toFixed(2),
        total: (typeof total === 'number' && !isNaN(total) ? total : calculatedSubtotal + calculatedTax).toFixed(2),
        paymentMethod: 'einvoice',
        invoiceDate: new Date(),
        status: 'draft',
        einvoiceStatus: 0, // 0 = Chưa phát hành
        notes: `E-Invoice draft - MST: ${formData.taxCode || 'N/A'}, Scheduled for later publishing`,
        items: cartItems.map(item => {
          const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
          const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
          const itemTaxRate = typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "10") : (item.taxRate || 10);
          const itemSubtotal = itemPrice * itemQuantity;
          const itemTax = (itemSubtotal * itemTaxRate) / 100;
          
          return {
            productId: item.id,
            productName: item.name,
            quantity: itemQuantity,
            unitPrice: itemPrice.toFixed(2),
            total: (itemSubtotal + itemTax).toFixed(2),
            taxRate: itemTaxRate.toFixed(2)
          };
        })
      };

      console.log("💾 Invoice payload:", JSON.stringify(invoicePayload, null, 2));

      // Save invoice to database
      const invoiceResponse = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload)
      });

      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        console.error("❌ Invoice save failed with status:", invoiceResponse.status);
        console.error("❌ Error response:", errorText);
        // Continue with order saving even if invoice save fails
      } else {
        const savedInvoice = await invoiceResponse.json();
        console.log("✅ Invoice draft saved to database:", savedInvoice);
      }

      // Prepare order payload
      const orderPayload = {
        order: {
          orderNumber: `ORD-${Date.now()}`,
          tableId: null, // No table for POS orders
          customerName: formData.customerName || "Khách hàng",
          subtotal: calculatedSubtotal.toFixed(2),
          tax: calculatedTax.toFixed(2),
          total: (typeof total === 'number' && !isNaN(total) ? total : calculatedSubtotal + calculatedTax).toFixed(2),
          status: 'pending',
          paymentMethod: 'einvoice',
          paymentStatus: 'pending',
          einvoiceStatus: 0, // Chưa phát hành
          notes: `E-Invoice Info - MST: ${formData.taxCode || 'N/A'}, Tên: ${formData.customerName}, Địa chỉ: ${formData.address || 'N/A'}`,
          orderedAt: new Date(),
          employeeId: null,
          salesChannel: 'pos'
        },
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity,
          unitPrice: (typeof item.price === 'string' ? parseFloat(item.price) : item.price).toFixed(2),
          total: ((typeof item.price === 'string' ? parseFloat(item.price) : item.price) * (typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity)).toFixed(2),
          notes: `Tax Rate: ${typeof item.taxRate === 'string' ? item.taxRate : (item.taxRate || 10)}%`
        }))
      };

      console.log("💾 Order payload:", JSON.stringify(orderPayload, null, 2));

      // Save order to database
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Order save failed with status:", response.status);
        console.error("❌ Error response:", errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        throw new Error(`HTTP ${response.status}: ${errorData.error || errorData.details || errorText}`);
      }

      const savedOrder = await response.json();
      console.log("✅ Order saved to database:", savedOrder);

      // Tạo receipt data thực sự cho receipt modal
      const receiptData = {
        transactionId: savedOrder.orderNumber || `TXN-${Date.now()}`,
        items: cartItems.map(item => ({
          id: item.id,
          productId: item.id,
          productName: item.name,
          price: (typeof item.price === 'string' ? item.price : item.price.toString()),
          quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity,
          total: ((typeof item.price === 'string' ? parseFloat(item.price) : item.price) * (typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity)).toFixed(2),
          sku: item.sku || `FOOD${String(item.id).padStart(5, '0')}`,
          taxRate: typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "10") : (item.taxRate || 10)
        })),
        subtotal: calculatedSubtotal.toFixed(2),
        tax: calculatedTax.toFixed(2),
        total: (typeof total === 'number' && !isNaN(total) ? total : calculatedSubtotal + calculatedTax).toFixed(2),
        paymentMethod: 'einvoice',
        amountReceived: (typeof total === 'number' && !isNaN(total) ? total : calculatedSubtotal + calculatedTax).toFixed(2),
        change: "0.00",
        cashierName: "John Smith",
        createdAt: new Date().toISOString()
      };

      // Prepare the invoice data to be returned
      const invoiceData = {
        ...formData,
        cartItems: cartItems,
        total: total,
        paymentMethod: 'einvoice',
        source: source || 'pos',
        orderId: savedOrder.id,
        publishLater: true, // Flag to indicate this is for later publishing
        receipt: receiptData // Truyền receipt data thực sự
      };

      console.log("🟡 Prepared invoice data for later publishing:", invoiceData);
      console.log("📄 Receipt data created:", receiptData);

      // Show success message
      toast({
        title: 'Thành công',
        description: 'Thông tin hóa đơn điện tử đã được lưu để phát hành sau.',
      });

      // Handle different sources
      if (source === 'table' && orderId) {
        // Logic cho Table: Hoàn tất thanh toán trước, sau đó hiển thị receipt
        console.log('🍽️ Table E-Invoice Later: Completing payment for order:', orderId);

        // Gọi mutation để hoàn tất thanh toán
        await completePaymentMutation.mutateAsync({
          orderId: orderId,
          paymentMethod: 'einvoice'
        });

        console.log('🍽️ Payment completed successfully for later publishing');

        // Gọi onConfirm để hiển thị receipt trước khi đóng modal
        console.log('🍽️ Calling onConfirm for receipt display');
        onConfirm(invoiceData);

        // Đóng modal e-invoice sau khi đã gọi onConfirm
        setTimeout(() => {
          onClose();
        }, 100);

      } else {
        // Logic cho POS hoặc fallback
        console.log('🏪 POS/Fallback E-Invoice Later: Processing payment completion');

        // Gọi onConfirm để hiển thị receipt modal trước
        console.log('✅ Calling onConfirm to show receipt modal');
        onConfirm(invoiceData);

        // Đóng modal e-invoice sau một khoảng thời gian ngắn để đảm bảo receipt modal được hiển thị
        setTimeout(() => {
          console.log('🔒 Closing e-invoice modal after receipt modal is shown');
          onClose();
        }, 100);
      }

    } catch (error) {
      console.error("❌ Error in handlePublishLater:", error);

      let errorMessage = "Có lỗi xảy ra khi lưu đơn hàng";
      if (error instanceof Error) {
        errorMessage = `Có lỗi xảy ra khi lưu đơn hàng: ${error.message}`;
      } else if (typeof error === 'string') {
        errorMessage = `Có lỗi xảy ra khi lưu đơn hàng: ${error}`;
      } else {
        errorMessage = `Có lỗi xảy ra khi lưu đơn hàng: ${JSON.stringify(error)}`;
      }

      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage
      });
      return;
    }
  };


  const handleConfirm = async () => {
    // Validate required fields
    if (
      !formData.invoiceProvider ||
      !formData.customerName
    ) {
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
        console.error("❌ No valid cart items found:", {
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
          console.log("❌ Invalid item found:", item);
        }
        return !isValid;
      });

      if (invalidItems.length > 0) {
        console.error("❌ Invalid cart items found:", invalidItems);
        alert(
          `Có ${invalidItems.length} sản phẩm trong giỏ hàng thiếu thông tin:\n${invalidItems.map((item) => `- ${item?.name || "Không có tên"}`).join("\n")}\n\nVui lòng kiểm tra lại giỏ hàng.`,
        );
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
            return isNaN(parsed) ? 10 : parsed;
          }
          return typeof item.taxRate === "number" ? item.taxRate : 10;
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
        (template) => template.id.toString() === formData.selectedTemplateId
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
        console.log('✅ E-invoice published successfully, now saving invoice and order to database');

        // Lưu thông tin hóa đơn vào bảng invoices
        try {
          const invoicePayload = {
            invoiceNumber: result.data?.invoiceNo || `INV-${Date.now()}`,
            customerName: formData.customerName || "Khách hàng",
            customerTaxCode: formData.taxCode || null,
            customerAddress: formData.address || null,
            customerPhone: formData.phoneNumber || null,
            customerEmail: formData.email || null,
            subtotal: cartSubtotal.toFixed(2),
            tax: cartTaxAmount.toFixed(2),
            total: cartTotal.toFixed(2),
            paymentMethod: 'einvoice',
            invoiceDate: new Date(),
            status: 'published',
            einvoiceStatus: 1, // 1 = Đã phát hành
            notes: `E-Invoice published - Transaction ID: ${publishRequest.transactionID}, Template: ${selectedTemplate.name}`,
            items: cartItems.map(item => {
              const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
              const itemQuantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
              const itemTaxRate = typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "10") : (item.taxRate || 10);
              const itemSubtotal = itemPrice * itemQuantity;
              const itemTax = (itemSubtotal * itemTaxRate) / 100;
              
              return {
                productId: item.id,
                productName: item.name,
                quantity: itemQuantity,
                unitPrice: itemPrice.toFixed(2),
                total: (itemSubtotal + itemTax).toFixed(2),
                taxRate: itemTaxRate.toFixed(2)
              };
            })
          };

          console.log('💾 Saving published invoice to database:', invoicePayload);

          const invoiceResponse = await fetch('/api/invoices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoicePayload)
          });

          if (invoiceResponse.ok) {
            const savedInvoice = await invoiceResponse.json();
            console.log('✅ Invoice saved to database successfully:', savedInvoice);
          } else {
            const errorText = await invoiceResponse.text();
            console.error('❌ Failed to save invoice to database:', errorText);
          }
        } catch (invoiceSaveError) {
          console.error('❌ Error saving invoice to database:', invoiceSaveError);
        }

        // Lưu đơn hàng vào bảng orders với trạng thái "đã phát hành"
        try {
          const orderPayload = {
            order: {
              orderNumber: `ORD-${Date.now()}`,
              tableId: null, // No table for POS orders
              customerName: formData.customerName || "Khách hàng",
              subtotal: cartSubtotal.toFixed(2),
              tax: cartTaxAmount.toFixed(2),
              total: cartTotal.toFixed(2),
              status: 'paid', // Trạng thái đã thanh toán
              paymentMethod: 'einvoice',
              paymentStatus: 'paid',
              einvoiceStatus: 1, // 1 = Đã phát hành
              notes: `E-Invoice: ${result.data?.invoiceNo || 'N/A'} - MST: ${formData.taxCode}, Tên: ${formData.customerName}, SĐT: ${formData.phoneNumber || 'N/A'}`,
              orderedAt: new Date(),
              employeeId: null,
              salesChannel: 'pos'
            },
            items: cartItems.map(item => ({
              productId: item.id,
              quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity,
              unitPrice: (typeof item.price === 'string' ? parseFloat(item.price) : item.price).toFixed(2),
              total: ((typeof item.price === 'string' ? parseFloat(item.price) : item.price) * (typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity)).toFixed(2),
              notes: `Tax Rate: ${typeof item.taxRate === 'string' ? item.taxRate : (item.taxRate || 10)}%`
            }))
          };

          console.log('💾 Saving published order to database:', orderPayload);

          const saveResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload)
          });

          if (saveResponse.ok) {
            const savedOrder = await saveResponse.json();
            console.log('✅ Order saved to database successfully:', savedOrder);
          } else {
            console.error('❌ Failed to save order to database:', await saveResponse.text());
          }
        } catch (saveError) {
          console.error('❌ Error saving order to database:', saveError);
        }

        toast({
          title: "Thành công",
          description: `Hóa đơn điện tử đã được phát hành thành công!\nSố hóa đơn: ${result.data?.invoiceNo || "N/A"}`,
        });

        // Đóng modal ngay lập tức trước khi xử lý logic
        onClose();

        // Xử lý logic khác nhau theo nguồn gọi
        if (source === 'pos') {
          // Logic cho POS: hiển thị receipt modal
          console.log('🏪 POS E-Invoice: Processing payment completion and showing receipt');
          onConfirm({
            ...formData,
            invoiceData: result.data,
            cartItems: cartItems,
            total: total,
            paymentMethod: 'einvoice',
            source: 'pos',
            showReceipt: true // Flag để hiển thị receipt modal
          });
        } else if (source === 'table' && orderId) {
          // Logic cho Table: Tự hoàn tất thanh toán luôn
          console.log('🍽️ Table E-Invoice: Completing payment directly for order:', orderId);
          console.log('🍽️ Invoice data received:', result.data);

          // Gọi onConfirm để parent component biết về việc phát hành thành công
          onConfirm({
            ...formData,
            invoiceData: result.data,
            cartItems: cartItems,
            total: total,
            paymentMethod: 'einvoice',
            source: 'table',
            orderId: orderId,
            showReceipt: true // Flag để hiển thị receipt modal
          });

          // Gọi mutation để hoàn tất thanh toán ngay lập tức
          console.log('🍽️ Executing payment completion for order:', orderId);
          completePaymentMutation.mutate({
            orderId: orderId,
            paymentMethod: 'einvoice'
          });
        } else {
          // Fallback: trả về data cho parent component xử lý
          console.log('🔄 Fallback: Returning data to parent');
          onConfirm({
            ...formData,
            invoiceData: result.data,
            cartItems: cartItems,
            total: total,
            paymentMethod: 'einvoice',
            source: source || 'pos',
            showReceipt: true // Flag để hiển thị receipt modal
          });
        }
      } else {
        throw new Error(
          result.message || "Có lỗi xảy ra khi phát hành hóa đơn",
        );
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
            {t('einvoice.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* E-invoice Provider Information */}
          <div>
            <h3 className="text-base font-medium mb-4">
              {t('einvoice.providerInfo')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceProvider">{t('einvoice.providerUnit')}</Label>
                <Select
                  value={formData.invoiceProvider}
                  onValueChange={(value) =>
                    handleInputChange("invoiceProvider", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('einvoice.selectProvider')} />
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
                <Label htmlFor="invoiceTemplate">{t('einvoice.invoiceTemplate')}</Label>
                <Select
                  value={formData.selectedTemplateId}
                  onValueChange={(value) =>
                    handleInputChange("selectedTemplateId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('einvoice.selectTemplate')} />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
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
            <h3 className="text-base font-medium mb-4">{t('einvoice.customerInfo')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxCode">{t('einvoice.taxCode')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="taxCode"
                    ref={(el) => {inputRefs.current['taxCode'] = el}}
                    value={formData.taxCode}
                    onChange={(e) =>
                      handleInputChange("taxCode", e.target.value)
                    }
                    onFocus={() => handleInputFocus('taxCode')}
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
                      t('einvoice.getInfo')
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="customerName">{t('einvoice.companyName')}</Label>
                <Input
                  id="customerName"
                  ref={(el) => {inputRefs.current['customerName'] = el}}
                  value={formData.customerName}
                  onChange={(e) =>
                    handleInputChange("customerName", e.target.value)
                  }
                  onFocus={() => handleInputFocus('customerName')}
                  placeholder="Công ty TNHH ABC"
                  disabled={false}
                  readOnly={false}
                />
              </div>
              <div>
                <Label htmlFor="address">{t('einvoice.address')}</Label>
                <Input
                  id="address"
                  ref={(el) => {inputRefs.current['address'] = el}}
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  onFocus={() => handleInputFocus('address')}
                  placeholder="Cầu Giấy, Hà Nội"
                  disabled={false}
                  readOnly={false}
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">{t('einvoice.idNumber')}</Label>
                <Input
                  id="phoneNumber"
                  ref={(el) => {inputRefs.current['phoneNumber'] = el}}
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  onFocus={() => handleInputFocus('phoneNumber')}
                  placeholder="0123456789"
                  disabled={false}
                  readOnly={false}
                />
              </div>

              <div>
                <Label htmlFor="email">{t('einvoice.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  ref={(el) => {inputRefs.current['email'] = el}}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onFocus={() => handleInputFocus('email')}
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
              <span className="font-medium">{t('einvoice.totalAmount')}</span>
              <span className="text-lg font-bold text-blue-600">
                {total.toLocaleString("vi-VN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
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
              className={`${showVirtualKeyboard ? 'bg-blue-100 border-blue-300' : ''}`}
            >
              <Keyboard className="w-4 h-4 mr-2" />
              {showVirtualKeyboard ? 'Ẩn bàn phím' : 'Hiện bàn phím ảo'}
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
                  Đang nhập vào: {
                    activeInputField === 'taxCode' ? 'Mã số thuế' :
                    activeInputField === 'customerName' ? 'Tên đơn vị' :
                    activeInputField === 'address' ? 'Địa chỉ' :
                    activeInputField === 'phoneNumber' ? 'Số điện thoại' :

                    activeInputField === 'email' ? 'Email' : activeInputField
                  }
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
                  {t('einvoice.publishing')}
                </>
              ) : (
                <>
                  <span className="mr-2">✅</span>
                  {t('einvoice.publish')}
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
              {t('einvoice.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}