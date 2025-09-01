import { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  QrCode,
  Keyboard,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCodeLib from "qrcode";
import { createQRPosAsync, type CreateQRPosRequest } from "@/lib/api";
import { EInvoiceModal } from "./einvoice-modal";
import { usePopupSignal } from "@/hooks/use-popup-signal";
import VirtualKeyboard from "@/components/ui/virtual-keyboard";

// Helper function for API requests (assuming it exists and handles headers, etc.)
// If not, you'll need to implement it or use fetch directly like in the original code.
// For demonstration, let's assume a simple fetch wrapper.
async function apiRequest(method: string, url: string, body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
  };
  return fetch(url, options);
}

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: string, data?: any) => void;
  total: number;
  onShowEInvoice?: () => void;
  cartItems?: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    taxRate?: number;
    afterTaxPrice?: number | string | null | "";
  }>;
  orderForPayment?: any; // Add orderForPayment prop for exact values
  products?: any[]; // Add products prop for tax rate and afterTaxPrice lookup
  getProductName?: (productId: number | string) => string; // Add getProductName function
  receipt?: any; // Add receipt prop to receive exact total from receipt modal
}

export function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectMethod,
  total,
  onShowEInvoice,
  cartItems = [],
  orderForPayment, // Receive orderForPayment prop
  products, // Receive products prop
  getProductName, // Receive getProductName function
  receipt, // Receive receipt prop
}: PaymentMethodModalProps) {
  const { t } = useTranslation();
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showEInvoice, setShowEInvoice] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");
  const [showCashPayment, setShowCashPayment] = useState(false);
  const [currentTransactionUuid, setCurrentTransactionUuid] = useState<
    string | null
  >(null);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);

  // Separate state for cash payment to avoid sharing with other screens
  const [cashAmountInput, setCashAmountInput] = useState("");

  const amountInputRef = useRef<HTMLInputElement>(null);
  const { listenForPaymentSuccess, removePaymentListener } = usePopupSignal();

  // Load payment methods from settings
  const getPaymentMethods = () => {
    const savedPaymentMethods = localStorage.getItem("paymentMethods");

    const defaultPaymentMethods = [
      {
        id: 1,
        nameKey: "cash",
        type: "cash",
        enabled: true,
        icon: "💵",
      },
      {
        id: 2,
        nameKey: "creditCard",
        type: "card",
        enabled: false,
        icon: "💳",
      },
      {
        id: 3,
        nameKey: "debitCard",
        type: "debit",
        enabled: false,
        icon: "💳",
      },
      {
        id: 4,
        nameKey: "momo",
        type: "digital",
        enabled: false,
        icon: "📱",
      },
      {
        id: 5,
        nameKey: "zalopay",
        type: "digital",
        enabled: false,
        icon: "📱",
      },
      {
        id: 6,
        nameKey: "vnpay",
        type: "digital",
        enabled: false,
        icon: "💳",
      },
      {
        id: 7,
        nameKey: "qrCode",
        type: "qr",
        enabled: true,
        icon: "📱",
      },
      {
        id: 8,
        nameKey: "shopeepay",
        type: "digital",
        enabled: false,
        icon: "🛒",
      },
      {
        id: 9,
        nameKey: "grabpay",
        type: "digital",
        enabled: false,
        icon: "🚗",
      },
    ];

    const paymentMethods = savedPaymentMethods
      ? JSON.parse(savedPaymentMethods)
      : defaultPaymentMethods;

    console.log("All payment methods:", paymentMethods);

    // Ensure cash payment is always available
    const cashMethodExists = paymentMethods.find(
      (method) => method.nameKey === "cash" && method.enabled,
    );
    if (!cashMethodExists) {
      const cashMethod = paymentMethods.find(
        (method) => method.nameKey === "cash",
      );
      if (cashMethod) {
        cashMethod.enabled = true;
      } else {
        paymentMethods.unshift({
          id: 1,
          nameKey: "cash",
          type: "cash",
          enabled: true,
          icon: "💵",
        });
      }
    }

    // Filter to only return enabled payment methods and map to modal format
    const enabledMethods = paymentMethods
      .filter((method) => method.enabled === true)
      .map((method) => ({
        id: method.nameKey,
        name: getPaymentMethodName(method.nameKey),
        icon: getIconComponent(method.type),
        description: getMethodDescription(method.nameKey),
      }));

    console.log("Enabled payment methods:", enabledMethods);
    return enabledMethods;
  };

  const getIconComponent = (type: string) => {
    switch (type) {
      case "cash":
        return Banknote;
      case "card":
      case "debit":
      case "digital":
        return CreditCard;
      case "qr":
        return QrCode;
      default:
        return Wallet;
    }
  };

  const getPaymentMethodName = (nameKey: string) => {
    const names = {
      cash: t("common.cash"),
      creditCard: t("common.creditCard"),
      debitCard: t("common.debitCard"),
      momo: t("common.momo"),
      zalopay: t("common.zalopay"),
      vnpay: t("common.vnpay"),
      qrCode: t("common.qrCode"),
      shopeepay: t("common.shopeepay"),
      grabpay: t("common.grabpay"),
    };
    return (
      names[nameKey as keyof typeof names] || t("common.paymentMethodGeneric")
    );
  };

  const getMethodDescription = (nameKey: string) => {
    const descriptions = {
      cash: t("common.cash"),
      creditCard: t("common.visaMastercard"),
      debitCard: t("common.atmCard"),
      momo: t("common.momoWallet"),
      zalopay: t("common.zalopayWallet"),
      vnpay: t("common.vnpayWallet"),
      qrCode: t("common.qrBanking"),
      shopeepay: t("common.shopeepayWallet"),
      grabpay: t("common.grabpayWallet"),
    };
    return (
      descriptions[nameKey as keyof typeof descriptions] ||
      t("common.paymentMethodGeneric")
    );
  };

  const paymentMethods = getPaymentMethods();

  const handleSelect = async (method: string) => {
    setSelectedPaymentMethod(method);
    
    console.log(`🔄 Payment method selected: ${method} for order ${orderForPayment?.id}`);
    
    // CRITICAL: Update order status to 'paid' immediately when payment method is selected
    if (orderForPayment?.id) {
      try {
        console.log(`🔄 Calling updateOrderStatus for order ${orderForPayment.id} with payment method: ${method}`);
        console.log(`📋 Order details before updateOrderStatus call:`, {
          orderId: orderForPayment.id,
          currentStatus: orderForPayment.status,
          paymentMethod: method,
          timestamp: new Date().toISOString()
        });
        
        const statusResponse = await apiRequest('PUT', `/api/orders/${orderForPayment.id}/status`, {
          status: 'paid'
        });
        
        console.log(`🔍 API Response received:`, {
          status: statusResponse.status,
          statusText: statusResponse.statusText,
          ok: statusResponse.ok
        });
        
        if (statusResponse.ok) {
          const updatedOrder = await statusResponse.json();
          console.log(`✅ updateOrderStatus completed successfully for order ${orderForPayment.id}`);
          console.log(`🎯 Order status changed: ${updatedOrder.previousStatus} → 'paid'`);
          console.log(`📊 Updated order details:`, {
            orderId: updatedOrder.id,
            newStatus: updatedOrder.status,
            paidAt: updatedOrder.paidAt,
            updateTimestamp: updatedOrder.updatedAt
          });
        } else {
          const errorText = await statusResponse.text();
          console.error(`❌ updateOrderStatus failed for order ${orderForPayment.id}:`, errorText);
        }
      } catch (error) {
        console.error(`❌ Error calling updateOrderStatus for order ${orderForPayment.id}:`, error);
        console.error(`🔍 Error details:`, {
          errorType: error?.constructor?.name,
          errorMessage: error?.message,
          errorStack: error?.stack
        });
      }
    }

    if (method === "cash") {
      // Reset cash amount input when showing cash payment
      setCashAmountInput("");
      setAmountReceived("");
      // Show cash payment input form
      setShowCashPayment(true);
    } else if (method === "qrCode") {
      // Call CreateQRPos API for QR payment
      try {
        setQrLoading(true);
        const transactionUuid = `TXN-${Date.now()}`;

        // Use exact total with proper priority
        const orderTotal =
          receipt?.exactTotal ??
          orderForPayment?.exactTotal ??
          orderForPayment?.total ??
          total ??
          0;

        const qrRequest: CreateQRPosRequest = {
          transactionUuid,
          depositAmt: orderTotal,
          posUniqueId: "HAN01",
          accntNo: "0900993023",
          posfranchiseeName: "DOOKI-HANOI",
          posCompanyName: "HYOJUNG",
          posBillNo: `BILL-${Date.now()}`,
        };

        const bankCode = "79616001";
        const clientID = "91a3a3668724e631e1baf4f8526524f3";

        console.log("Calling CreateQRPos API with:", {
          qrRequest,
          bankCode,
          clientID,
        });

        const qrResponse = await createQRPosAsync(
          qrRequest,
          bankCode,
          clientID,
        );

        console.log("CreateQRPos API response:", qrResponse);

        // Store transaction UUID for payment tracking
        setCurrentTransactionUuid(transactionUuid);

        // Listen for payment success notification
        listenForPaymentSuccess(transactionUuid, (success) => {
          if (success) {
            console.log(
              "Payment confirmed via WebSocket for transaction:",
              transactionUuid,
            );
            // Auto-complete the payment when notification is received
            handleQRComplete();
          }
        });

        // Generate QR code from the received QR data
        if (qrResponse.qrData) {
          // Decode base64 qrData to get the actual QR content
          let qrContent = qrResponse.qrData;
          try {
            // Try to decode if it's base64 encoded
            qrContent = atob(qrResponse.qrData);
          } catch (e) {
            // If decode fails, use the raw qrData
            console.log("Using raw qrData as it is not base64 encoded");
          }

          const qrUrl = await QRCodeLib.toDataURL(qrContent, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);

          // Send QR payment info to customer display via WebSocket
          try {
            const protocol =
              window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
              ws.send(
                JSON.stringify({
                  type: "qr_payment",
                  qrCodeUrl: qrUrl,
                  amount: orderTotal,
                  transactionUuid: transactionUuid,
                  paymentMethod: "QR Code",
                  timestamp: new Date().toISOString(),
                }),
              );
              ws.close();
            };
          } catch (error) {
            console.error(
              "Failed to send QR payment info to customer display:",
              error,
            );
          }
        } else {
          console.error("No QR data received from API");
          // Fallback to mock QR code
          const fallbackData = `Payment via QR\nAmount: ${Math.floor(orderTotal).toLocaleString("vi-VN")} ₫\nTime: ${new Date().toLocaleString("vi-VN")}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);
        }
      } catch (error) {
        console.error("Error calling CreateQRPos API:", error);
        // Fallback to mock QR code on error
        try {
          const orderTotal =
            receipt?.exactTotal ??
            orderForPayment?.exactTotal ??
            orderForPayment?.total ??
            total ??
            0;
          const fallbackData = `Payment via QR\nAmount: ${Math.floor(orderTotal).toLocaleString("vi-VN")} ₫\nTime: ${new Date().toLocaleString("vi-VN")}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);
        } catch (fallbackError) {
          console.error("Error generating fallback QR code:", fallbackError);
        }
      } finally {
        setQrLoading(false);
      }
    } else if (method === "vnpay") {
      // Generate QR code for VNPay
      try {
        setQrLoading(true);
        // Use exact total with proper priority for QR payment
        const orderTotal =
          receipt?.exactTotal ??
          orderForPayment?.exactTotal ??
          orderForPayment?.total ??
          total ??
          0;
        const qrData = `Payment via ${method}\nAmount: ${Math.floor(orderTotal).toLocaleString("vi-VN")} ₫\nTime: ${new Date().toLocaleString("vi-VN")}`;
        const qrUrl = await QRCodeLib.toDataURL(qrData, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(qrUrl);
        setShowQRCode(true);
      } catch (error) {
        console.error("Error generating QR code:", error);
      } finally {
        setQrLoading(false);
      }
    } else {
      // Lưu phương thức thanh toán và hiển thị E-Invoice modal
      setSelectedPaymentMethod(method);
      setShowEInvoice(true);
    }
  };

  const handleQRComplete = async () => {
    setShowQRCode(false);
    setQrCodeUrl("");

    // Set payment method and show E-Invoice modal directly
    setSelectedPaymentMethod("qrCode");
    setShowEInvoice(true);
  };

  const handleBack = () => {
    setShowQRCode(false);
    setQrCodeUrl("");
    setShowCashPayment(false);
    // Reset toàn bộ trạng thái thanh toán tiền mặt
    setAmountReceived("");
    setCashAmountInput("");
    setSelectedPaymentMethod("");
    setShowVirtualKeyboard(false);

    // Remove payment listener if exists when going back from QR
    if (currentTransactionUuid) {
      removePaymentListener(currentTransactionUuid);
      setCurrentTransactionUuid(null);
    }

    // Send message to customer display to clear QR payment
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "qr_payment_cancelled",
            timestamp: new Date().toISOString(),
          }),
        );
        ws.close();
      };
    } catch (error) {
      console.error(
        "Failed to send QR payment cancellation to customer display:",
        error,
      );
    }
  };

  const handleCashPaymentComplete = async () => {
    const receivedAmount = parseFloat(cashAmountInput || "0");

    // Sử dụng exact total with proper priority
    const orderTotal = receipt?.exactTotal ??
                      orderForPayment?.exactTotal ??
                      orderForPayment?.total ??
                      total ??
                      0;

    // Tính tiền thối: Tiền khách đưa - Tiền cần thanh toán
    const changeAmount = receivedAmount - orderTotal;
    const finalChange = changeAmount >= 0 ? changeAmount : 0;

    console.log("💰 Hoàn thành thanh toán tiền mặt:", {
      "Số tiền nhập": amountReceived,
      "Số tiền khách đưa": receivedAmount,
      "Tổng cần thanh toán": orderTotal,
      "Tiền thối": finalChange,
      "Đủ tiền": receivedAmount >= orderTotal
    });

    if (receivedAmount < orderTotal) {
      console.warn("❌ Số tiền chưa đủ");
      return; // Không thực hiện nếu chưa đủ tiền
    }

    // Reset trạng thái và đóng form tiền mặt
    setShowCashPayment(false);
    setAmountReceived("");
    setCashAmountInput("");

    // Lưu phương thức thanh toán và hiển thị E-Invoice modal
    setSelectedPaymentMethod("cash");
    setShowEInvoice(true);
  };

  const handleEInvoiceConfirm = async (eInvoiceData: any) => {
    console.log("📧 E-Invoice confirmed from payment modal:", eInvoiceData);

    if (!orderForPayment?.id) {
      console.error("❌ No order ID found for payment update");
      return;
    }

    try {
      console.log("🔄 Step 1: Starting payment process for order:", orderForPayment.id);

      // STEP 1: Update order status to 'paid' using the dedicated status endpoint
      console.log("📤 Step 1: Updating order status to 'paid'");
      console.log(`🔍 Order details before update:`, {
        orderId: orderForPayment.id,
        currentStatus: orderForPayment.status,
        tableId: orderForPayment.tableId,
        total: orderForPayment.total,
        paymentMethod: selectedPaymentMethod
      });

      const statusResponse = await fetch(`/api/orders/${orderForPayment.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'paid'
        }),
      });

      console.log(`🔍 API Response status: ${statusResponse.status} ${statusResponse.statusText}`);

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error("❌ Step 1 FAILED: Order status update failed:", errorText);
        throw new Error(`Failed to update order status to paid: ${errorText}`);
      }

      const statusResult = await statusResponse.json();
      console.log("✅ Step 1 SUCCESS: Order status updated to paid:", statusResult);
      console.log(`🎯 Order status changed: ${orderForPayment.status} → 'paid'`);

      // STEP 2: Update order with payment details
      console.log("📤 Step 2: Adding payment details to order");
      const paymentData: any = {
        paymentMethod: selectedPaymentMethod,
        paidAt: new Date().toISOString(),
        einvoiceStatus: eInvoiceData.publishLater ? 0 : 1,
      };

      // Add cash payment specific data if applicable
      if (selectedPaymentMethod === "cash" && cashAmountInput) {
        const orderTotal = receipt?.exactTotal ?? orderForPayment?.exactTotal ?? orderForPayment?.total ?? total ?? 0;
        paymentData.amountReceived = parseFloat(cashAmountInput).toFixed(2);
        paymentData.change = (parseFloat(cashAmountInput) - orderTotal).toFixed(2);
      }

      const paymentResponse = await fetch(`/api/orders/${orderForPayment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error("❌ Step 2 FAILED: Payment details update failed:", errorText);
        // Don't throw here as the status was already updated successfully
      } else {
        const paymentResult = await paymentResponse.json();
        console.log("✅ Step 2 SUCCESS: Payment details added:", paymentResult);
      }

      // STEP 3: Create receipt data for printing
      console.log("🔄 Step 3: Creating receipt data for printing");
      const receiptData = {
        ...orderForPayment,
        transactionId: `ORDER-${orderForPayment.id}`,
        items: orderForPayment.orderItems || [],
        subtotal: orderForPayment.subtotal || "0",
        tax: orderForPayment.tax || "0", 
        total: orderForPayment.total || "0",
        exactSubtotal: orderForPayment.exactSubtotal || 0,
        exactTax: orderForPayment.exactTax || 0,
        exactTotal: orderForPayment.exactTotal || 0,
        paymentMethod: selectedPaymentMethod,
        cashierName: eInvoiceData.cashierName || "System User",
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        einvoiceStatus: eInvoiceData.publishLater ? 0 : 1,
        amountReceived: selectedPaymentMethod === "cash" && cashAmountInput ? parseFloat(cashAmountInput) : null,
        change: selectedPaymentMethod === "cash" && cashAmountInput ? 
          parseFloat(cashAmountInput) - (orderForPayment.exactTotal || orderForPayment.total || 0) : null
      };

      // STEP 4: Force immediate UI refresh after successful status update
      console.log("🔄 Step 4: Dispatching UI refresh events");

      // Force immediate query refresh
      if (typeof window !== 'undefined') {
        // Dispatch immediate UI refresh events
        const events = [
          new CustomEvent('orderStatusUpdated', {
            detail: {
              orderId: orderForPayment.id,
              status: 'paid',
              previousStatus: orderForPayment.status,
              tableId: orderForPayment.tableId,
              paymentMethod: selectedPaymentMethod,
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('refreshOrders', {
            detail: { 
              immediate: true,
              orderId: orderForPayment.id,
              newStatus: 'paid'
            }
          }),
          new CustomEvent('refreshTables', {
            detail: { 
              immediate: true,
              tableId: orderForPayment.tableId,
              orderId: orderForPayment.id
            }
          }),
          new CustomEvent('paymentCompleted', {
            detail: { 
              orderId: orderForPayment.id, 
              tableId: orderForPayment.tableId,
              paymentMethod: selectedPaymentMethod,
              timestamp: new Date().toISOString()
            }
          }),
          new CustomEvent('tableStatusUpdate', {
            detail: { 
              tableId: orderForPayment.tableId, 
              checkForRelease: true,
              orderId: orderForPayment.id,
              immediate: true
            }
          })
        ];

        events.forEach(event => {
          console.log("📡 Dispatching immediate UI refresh event:", event.type, event.detail);
          window.dispatchEvent(event);
        });

        // Also trigger a manual page refresh after a short delay if needed
        setTimeout(() => {
          console.log("🔄 Manual UI refresh trigger");
          window.dispatchEvent(new CustomEvent('forceRefresh', {
            detail: { 
              reason: 'payment_completed',
              orderId: orderForPayment.id,
              tableId: orderForPayment.tableId
            }
          }));
        }, 500);
      }

      // STEP 5: Close all modals and complete payment flow
      console.log("🔄 Step 5: Closing all modals and completing payment flow");
      setShowEInvoice(false);
      setSelectedPaymentMethod("");
      onClose();

      // STEP 6: Pass complete success data to parent component with receipt
      console.log("✅ Step 6: Payment process completed successfully");
      onSelectMethod("paymentCompleted", {
        ...eInvoiceData,
        originalPaymentMethod: selectedPaymentMethod,
        orderId: orderForPayment.id,
        tableId: orderForPayment.tableId,
        success: true,
        completed: true,
        receipt: receiptData,
        shouldShowReceipt: true,
        paymentData: selectedPaymentMethod === "cash" ? {
          amountReceived: parseFloat(cashAmountInput || "0"),
          change: parseFloat(cashAmountInput || "0") - (receipt?.exactTotal ?? orderForPayment?.exactTotal ?? orderForPayment?.total ?? total ?? 0)
        } : null
      });

    } catch (error) {
      console.error("❌ ERROR in payment process:", error);

      // Close modals to prevent getting stuck
      setShowEInvoice(false);
      setSelectedPaymentMethod("");
      onClose();

      // Pass error data to parent component
      onSelectMethod("paymentError", {
        ...eInvoiceData,
        originalPaymentMethod: selectedPaymentMethod,
        orderId: orderForPayment?.id,
        tableId: orderForPayment?.tableId,
        success: false,
        error: error.message,
        paymentData: selectedPaymentMethod === "cash" ? {
          amountReceived: parseFloat(cashAmountInput || "0"),
          change: parseFloat(cashAmountInput || "0") - (receipt?.exactTotal ?? orderForPayment?.exactTotal ?? orderForPayment?.total ?? total ?? 0)
        } : null
      });
    }
  };

  const handleEInvoiceClose = () => {
    console.log("🔙 E-invoice modal closed - closing entire payment flow");

    setShowEInvoice(false);
    setSelectedPaymentMethod("");
    onClose(); // Always close the entire payment modal when E-invoice is closed
  };

  // Virtual keyboard handlers
  const handleVirtualKeyPress = (key: string) => {
    const currentValue = cashAmountInput || "";
    // Only allow numbers and prevent multiple decimal points
    if (!/^[0-9]$/.test(key)) return;

    const newValue = currentValue + key;
    console.log("🔢 Virtual keyboard input:", { currentValue, key, newValue });
    setCashAmountInput(newValue);
    setAmountReceived(newValue); // Sync for calculation

    // Focus the input to show cursor position
    const inputRef = amountInputRef.current;
    if (inputRef) {
      inputRef.focus();
      // Set cursor to end
      setTimeout(() => {
        inputRef.setSelectionRange(newValue.length, newValue.length);
      }, 0);
    }
  };

  const handleVirtualBackspace = () => {
    const currentValue = cashAmountInput;
    const newValue = currentValue.slice(0, -1);
    setCashAmountInput(newValue);
    setAmountReceived(newValue); // Sync for calculation

    // Focus the input to show cursor position
    const inputRef = amountInputRef.current;
    if (inputRef) {
      inputRef.focus();
      setTimeout(() => {
        inputRef.setSelectionRange(newValue.length, newValue.length);
      }, 0);
    }
  };

  const handleVirtualEnter = () => {
    // Hide keyboard on enter and try to complete payment if amount is sufficient
    setShowVirtualKeyboard(false);
    const orderTotal =
      receipt?.exactTotal ??
      parseFloat(receipt?.total || "0") ??
      orderForPayment?.exactTotal ??
      orderForPayment?.total ??
      total;
    if (parseFloat(cashAmountInput) >= orderTotal) {
      handleCashPaymentComplete();
    }
  };

  const toggleVirtualKeyboard = () => {
    setShowVirtualKeyboard(!showVirtualKeyboard);
    if (!showVirtualKeyboard) {
      // If opening keyboard, focus on amount input
      setTimeout(() => {
        const inputRef = amountInputRef.current;
        if (inputRef) {
          inputRef.focus();
        }
      }, 100);
    }
  };

  // Track previous QR state to handle cancellation
  const [wasShowingQRCode, setWasShowingQRCode] = useState(false);

  // Track when QR code is showing
  useEffect(() => {
    if (showQRCode) {
      setWasShowingQRCode(true);
    }
  }, [showQRCode]);

  // Reset all states when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Always send message to customer display when modal closes
      const sendCloseMessage = () => {
        try {
          const protocol =
            window.location.protocol === "https:" ? "wss:" : "ws:";
          const wsUrl = `${protocol}//${window.location.host}/ws`;
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log("Payment Modal: WebSocket connected for close message");

            // If QR code was showing, send cancellation and restore cart
            if (wasShowingQRCode || showQRCode || qrCodeUrl) {
              console.log("Payment Modal: Sending QR cancellation message");
              ws.send(
                JSON.stringify({
                  type: "qr_payment_cancelled",
                  timestamp: new Date().toISOString(),
                }),
              );

              // Wait a bit then send cart restore message
              setTimeout(() => {
                console.log("Payment Modal: Sending cart restore message");
                ws.send(
                  JSON.stringify({
                    type: "restore_cart_display",
                    timestamp: new Date().toISOString(),
                    reason: "payment_dialog_closed",
                  }),
                );
                ws.close();
              }, 100);
            } else {
              // Just send cart restore message if no QR code
              console.log(
                "Payment Modal: Sending cart restore message (no QR)",
              );
              ws.send(
                JSON.stringify({
                  type: "restore_cart_display",
                  timestamp: new Date().toISOString(),
                  reason: "payment_dialog_closed",
                }),
              );
              ws.close();
            }
          };

          ws.onerror = (error) => {
            console.error("Payment Modal: WebSocket error:", error);
          };

          ws.onclose = () => {
            console.log(
              "Payment Modal: WebSocket closed after sending close message",
            );
          };
        } catch (error) {
          console.error(
            "Payment Modal: Failed to send close message when modal closes:",
            error,
          );
        }
      };

      // Send close message after a small delay to ensure modal is fully closed
      setTimeout(sendCloseMessage, 50);

      // Reset all states when modal completely closes
      console.log("🔄 Payment Modal: Resetting all states on modal close");
      setShowQRCode(false);
      setQrCodeUrl("");
      setShowEInvoice(false);
      setSelectedPaymentMethod("");
      setQrLoading(false);
      setShowCashPayment(false);
      setAmountReceived("");
      setCashAmountInput("");
      setShowVirtualKeyboard(false);
      setWasShowingQRCode(false);

      // Remove payment listener if exists
      if (currentTransactionUuid) {
        removePaymentListener(currentTransactionUuid);
        setCurrentTransactionUuid(null);
      }
    }
  }, [
    isOpen,
    currentTransactionUuid,
    removePaymentListener,
    showQRCode,
    qrCodeUrl,
    wasShowingQRCode,
  ]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // When dialog is closed via X button or outside click
          try {
            const protocol =
              window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
              console.log(
                "Payment Modal: Sending clear message from X button close",
              );
              // If QR code was showing, send cancellation and restore cart
              if (showQRCode || qrCodeUrl) {
                ws.send(
                  JSON.stringify({
                    type: "qr_payment_cancelled",
                    timestamp: new Date().toISOString(),
                  }),
                );
                // Wait a bit then send cart restore message
                setTimeout(() => {
                  ws.send(
                    JSON.stringify({
                      type: "restore_cart_display",
                      timestamp: new Date().toISOString(),
                      reason: "payment_dialog_x_button",
                    }),
                  );
                  ws.close();
                }, 100);
              } else {
                // Just send cart restore message if no QR code
                ws.send(
                  JSON.stringify({
                    type: "restore_cart_display",
                    timestamp: new Date().toISOString(),
                    reason: "payment_dialog_x_button",
                  }),
                );
                ws.close();
              }
            };
          } catch (error) {
            console.error(
              "Failed to send clear message when X button clicked:",
              error,
            );
          }
        }
        onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("common.selectPaymentMethod")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          {!showQRCode && !showCashPayment ? (
            <>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  {t("common.totalAmount")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {/* Use exact total with proper priority for QR payment */}
                  {Math.floor(
                    receipt?.exactTotal ??
                      orderForPayment?.exactTotal ??
                      orderForPayment?.total ??
                      total ??
                      0,
                  ).toLocaleString("vi-VN")}{" "}
                  ₫
                </p>
              </div>

              <div className="grid gap-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  const isQRMethod =
                    method.id === "qrCode" || method.id === "vnpay";
                  const isLoading = qrLoading && isQRMethod;

                  return (
                    <Button
                      key={method.id}
                      variant="outline"
                      className="flex items-center justify-start p-4 h-auto"
                      onClick={() => handleSelect(method.id)}
                      disabled={isLoading}
                    >
                      <IconComponent className="mr-3" size={24} />
                      <div className="text-left flex-1">
                        <div className="font-medium">
                          {isLoading ? t("common.generatingQr") : method.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {method.description}
                        </div>
                      </div>
                      {isLoading && (
                        <div className="ml-auto">
                          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  // Send clear message to customer display before closing
                  try {
                    const protocol =
                      window.location.protocol === "https:" ? "wss:" : "ws:";
                    const wsUrl = `${protocol}//${window.location.host}/ws`;
                    const ws = new WebSocket(wsUrl);

                    ws.onopen = () => {
                      console.log(
                        "Payment Modal: Sending clear message from cancel button",
                      );
                      ws.send(
                        JSON.stringify({
                          type: "restore_cart_display",
                          timestamp: new Date().toISOString(),
                          reason: "payment_cancel_button",
                        }),
                      );
                      ws.close();
                    };
                  } catch (error) {
                    console.error(
                      "Failed to send clear message to customer display:",
                      error,
                    );
                  }

                  onClose();
                }}
                className="w-full"
              >
                {t("common.cancel")}
              </Button>
            </>
          ) : showQRCode ? (
            <>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <QrCode className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">
                    {t("common.scanQrPayment")}
                  </h3>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {t("common.amountToPay")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {/* Use exact total with proper priority for QR payment */}
                    {Math.floor(
                      receipt?.exactTotal ??
                        orderForPayment?.exactTotal ??
                        orderForPayment?.total ??
                        total ??
                        0,
                    ).toLocaleString("vi-VN")}{" "}
                    ₫
                  </p>
                </div>

                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-lg">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code for Bank Transfer"
                        className="w-64 h-64"
                      />
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  {t("common.useBankingApp")}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Send clear message to customer display before going back
                    try {
                      const protocol =
                        window.location.protocol === "https:" ? "wss:" : "ws:";
                      const wsUrl = `${protocol}//${window.location.host}/ws`;
                      const ws = new WebSocket(wsUrl);

                      ws.onopen = () => {
                        console.log(
                          "Payment Modal: Sending clear message from back button",
                        );
                        ws.send(
                          JSON.stringify({
                            type: "qr_payment_cancelled",
                            timestamp: new Date().toISOString(),
                          }),
                        );
                        // Wait a bit then send cart restore message
                        setTimeout(() => {
                          ws.send(
                            JSON.stringify({
                              type: "restore_cart_display",
                              timestamp: new Date().toISOString(),
                              reason: "payment_back_button",
                            }),
                          );
                          ws.close();
                        }, 100);
                      };
                    } catch (error) {
                      console.error(
                        "Failed to send clear message from back button:",
                        error,
                      );
                    }

                    handleBack();
                  }}
                  className="flex-1"
                >
                  {t("common.goBack")}
                </Button>
                <Button
                  onClick={() => {
                    // Send clear message to customer display before completing
                    try {
                      const protocol =
                        window.location.protocol === "https:" ? "wss:" : "ws:";
                      const wsUrl = `${protocol}//${window.location.host}/ws`;
                      const ws = new WebSocket(wsUrl);

                      ws.onopen = () => {
                        console.log(
                          "Payment Modal: Sending clear message from complete button",
                        );
                        ws.send(
                          JSON.stringify({
                            type: "qr_payment_cancelled",
                            timestamp: new Date().toISOString(),
                          }),
                        );
                        // Wait a bit then send cart restore message
                        setTimeout(() => {
                          ws.send(
                            JSON.stringify({
                              type: "restore_cart_display",
                              timestamp: new Date().toISOString(),
                              reason: "payment_complete_button",
                            }),
                          );
                          ws.close();
                        }, 100);
                      };
                    } catch (error) {
                      console.error(
                        "Failed to send clear message from complete button:",
                        error,
                      );
                    }

                    handleQRComplete();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
                >
                  {t("common.complete")}
                </Button>
              </div>
            </>
          ) : showCashPayment ? (
            <>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Banknote className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">
                    {t("common.cashPayment")}
                  </h3>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {t("common.amountToPay")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {/* Use exact total with proper priority for cash payment */}
                    {Math.floor(
                      receipt?.exactTotal ??
                        orderForPayment?.exactTotal ??
                        orderForPayment?.total ??
                        total ??
                        0,
                    ).toLocaleString("vi-VN")}{" "}
                    ₫
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("common.customerAmount")}
                    </label>
                    <input
                      ref={amountInputRef}
                      type="number"
                      step="1000"
                      min="0"
                      placeholder={t("common.enterCustomerAmount")}
                      value={cashAmountInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log("💰 Cash input changed to:", value);
                        setCashAmountInput(value);
                        setAmountReceived(value); // Sync for calculation
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-center"
                      autoFocus
                    />
                  </div>

                  {/* Virtual Keyboard Toggle */}
                  <div className="flex justify-center">
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

                  {amountReceived && parseFloat(amountReceived || "0") > 0 && (
                    <div className={`p-3 border rounded-lg ${
                      (() => {
                        const receivedAmount = parseFloat(cashAmountInput || "0");
                        // Sử dụng exact priority order giống như table payment
                        const orderTotal = receipt?.exactTotal ??
                                         orderForPayment?.exactTotal ??
                                         orderForPayment?.total ??
                                         total;
                        const changeAmount = receivedAmount - orderTotal;
                        return changeAmount >= 0
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200";
                      })()
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${
                          (() => {
                            const receivedAmount = parseFloat(cashAmountInput || "0");
                            const orderTotal = receipt?.exactTotal ??
                                             orderForPayment?.exactTotal ??
                                             orderForPayment?.total ??
                                             total;
                            const changeAmount = receivedAmount - orderTotal;
                            return changeAmount >= 0 ? "text-green-800" : "text-red-800";
                          })()
                        }`}>
                          {(() => {
                            const receivedAmount = parseFloat(cashAmountInput || "0");
                            const orderTotal = receipt?.exactTotal ??
                                             orderForPayment?.exactTotal ??
                                             orderForPayment?.total ??
                                             total;
                            const changeAmount = receivedAmount - orderTotal;
                            return changeAmount >= 0 ? "Tiền thối:" : "Còn thiếu:";
                          })()}
                        </span>
                        <span className={`text-lg font-bold ${
                          (() => {
                            const receivedAmount = parseFloat(cashAmountInput || "0");
                            const orderTotal = receipt?.exactTotal ??
                                             orderForPayment?.exactTotal ??
                                             orderForPayment?.total ??
                                             total;
                            const changeAmount = receivedAmount - orderTotal;
                            return changeAmount >= 0 ? "text-green-600" : "text-red-600";
                          })()
                        }`}>
                          {(() => {
                            // Sử dụng cashAmountInput thay vì amountReceived để tính toán chính xác
                            const receivedAmount = parseFloat(cashAmountInput || "0");

                            // Sử dụng exact priority order giống như table payment
                            const orderTotal = receipt?.exactTotal ??
                                             orderForPayment?.exactTotal ??
                                             orderForPayment?.total ??
                                             total;

                            // Tính tiền thối: Tiền khách đưa - Tổng tiền cần thanh toán
                            const changeAmount = receivedAmount - orderTotal;
                            const displayAmount = changeAmount >= 0 ? changeAmount : Math.abs(changeAmount);

                            return Math.floor(displayAmount).toLocaleString("vi-VN");
                          })()}{" "}
                          ₫
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Virtual Keyboard */}
                {showVirtualKeyboard && (
                  <div className="mt-4">
                    <VirtualKeyboard
                      onKeyPress={handleVirtualKeyPress}
                      onBackspace={handleVirtualBackspace}
                      onEnter={handleVirtualEnter}
                      isVisible={showVirtualKeyboard}
                      className="border border-gray-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Send clear message to customer display before going back from cash payment
                    try {
                      const protocol =
                        window.location.protocol === "https:" ? "wss:" : "ws:";
                      const wsUrl = `${protocol}//${window.location.host}/ws`;
                      const ws = new WebSocket(wsUrl);

                      ws.onopen = () => {
                        console.log(
                          "Payment Modal: Sending clear message from cash payment back button",
                        );
                        ws.send(
                          JSON.stringify({
                            type: "restore_cart_display",
                            timestamp: new Date().toISOString(),
                            reason: "cash_payment_back_button",
                          }),
                        );
                        ws.close();
                      };
                    } catch (error) {
                      console.error(
                        "Failed to send clear message from cash payment back button:",
                        error,
                      );
                    }

                    handleBack();
                  }}
                  className="flex-1"
                >
                  {t("common.goBack")}
                </Button>
                <Button
                  onClick={() => {
                    // Send clear message to customer display before completing cash payment
                    try {
                      const protocol =
                        window.location.protocol === "https:" ? "wss:" : "ws:";
                      const wsUrl = `${protocol}//${window.location.host}/ws`;
                      const ws = new WebSocket(wsUrl);

                      ws.onopen = () => {
                        console.log(
                          "Payment Modal: Sending clear message from cash payment complete button",
                        );
                        ws.send(
                          JSON.stringify({
                            type: "restore_cart_display",
                            timestamp: new Date().toISOString(),
                            reason: "cash_payment_complete_button",
                          }),
                        );
                        ws.close();
                      };
                    } catch (error) {
                      console.error(
                        "Failed to send clear message from cash payment complete button:",
                        error,
                      );
                    }

                    handleCashPaymentComplete();
                  }}
                  disabled={
                    !cashAmountInput ||
                    parseFloat(cashAmountInput) <
                      (receipt?.exactTotal ??
                       orderForPayment?.exactTotal ??
                       orderForPayment?.total ??
                       total)
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200 disabled:bg-gray-400"
                >
                  {t("common.complete")}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>

      {/* E-Invoice Modal */}
      {showEInvoice && (
        <EInvoiceModal
          isOpen={showEInvoice}
          onClose={handleEInvoiceClose}
          onConfirm={handleEInvoiceConfirm}
          total={(() => {
            // Debug current data to understand the issue
            console.log("💰 Payment Modal EInvoice Total Debug:", {
              orderForPayment: orderForPayment,
              receipt: receipt,
              propTotal: total,
              orderForPaymentTotal: orderForPayment?.total,
              orderForPaymentExactTotal: orderForPayment?.exactTotal,
              receiptTotal: receipt?.total,
              receiptExactTotal: receipt?.exactTotal
            });

            // Priority: orderForPayment data first, then receipt, then fallback to prop total
            let calculatedTotal = 0;

            if (orderForPayment?.total) {
              calculatedTotal = parseFloat(orderForPayment.total.toString());
              console.log("💰 Using orderForPayment.total for EInvoice:", calculatedTotal);
            } else if (orderForPayment?.exactTotal) {
              calculatedTotal = parseFloat(orderForPayment.exactTotal.toString());
              console.log("💰 Using orderForPayment.exactTotal for EInvoice:", calculatedTotal);
            } else if (receipt?.exactTotal) {
              calculatedTotal = parseFloat(receipt.exactTotal.toString());
              console.log("💰 Using receipt.exactTotal for EInvoice:", calculatedTotal);
            } else if (receipt?.total) {
              calculatedTotal = parseFloat(receipt.total.toString());
              console.log("💰 Using receipt.total for EInvoice:", calculatedTotal);
            } else {
              calculatedTotal = parseFloat(total?.toString() || "0");
              console.log("💰 Using fallback total for EInvoice:", calculatedTotal);
            }

            console.log("💰 Final calculated total for EInvoice:", calculatedTotal);
            return Math.floor(calculatedTotal || 0);
          })()}
          selectedPaymentMethod={selectedPaymentMethod}
          cartItems={(() => {
            // Use orderItems from orderForPayment first, then fallback to other sources
            const itemsToMap =
              orderForPayment?.orderItems ||
              receipt?.orderItems ||
              cartItems ||
              [];
            console.log(
              "📦 Mapping cart items for payment modal using exact Order Details data:",
              itemsToMap.length,
            );
            console.log("📦 Payment Modal CartItems Debug:", {
              orderForPayment: orderForPayment,
              orderItems: orderForPayment?.orderItems,
              receipt: receipt,
              receiptOrderItems: receipt?.orderItems,
              cartItems: cartItems,
              itemsToMap: itemsToMap,
              products: products
            });

            return itemsToMap.map((item: any, index: number) => {
              const product = Array.isArray(products)
                ? products.find((p: any) => p.id === item.productId)
                : null;

              console.log(`📦 Mapping item ${index + 1}:`, {
                rawItem: item,
                foundProduct: product,
                productId: item.productId,
                productName: item.productName,
                unitPrice: item.unitPrice,
                price: item.price
              });

              // Use correct field names from orderItems with better fallbacks
              const mappedItem = {
                id: item.productId || item.id || 0,
                name:
                  item.productName ||
                  product?.name ||
                  getProductName?.(item.productId) ||
                  (item.productId ? `Product ${item.productId}` : `Item ${index + 1}`),
                price: parseFloat(item.unitPrice || item.price || product?.price || "0"),
                quantity: parseInt(item.quantity?.toString() || "1"),
                sku: item.productSku || product?.sku || `SP${item.productId || item.id || index}`,
                taxRate: product?.taxRate ? parseFloat(product.taxRate.toString()) : (item.taxRate || 0),
                afterTaxPrice: product?.afterTaxPrice || null,
              };

              console.log(`📦 Final mapped item ${index + 1}:`, mappedItem);
              return mappedItem;
            });
          })()}
        />
      )}
    </Dialog>
  );
}