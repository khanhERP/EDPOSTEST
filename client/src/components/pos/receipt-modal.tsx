import { X, Printer, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Receipt } from "@shared/schema";
import logoPath from "@assets/EDPOS_1753091767028.png";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { EInvoiceModal } from "./einvoice-modal";
import { PaymentMethodModal } from "./payment-method-modal";
import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt?: Receipt | null;
  cartItems?: any[];
  total?: number;
  isPreview?: boolean;
  onConfirm?: () => void;
  autoClose?: boolean;
}

export function ReceiptModal({
  isOpen,
  onClose,
  receipt,
  cartItems = [],
  total = 0,
  isPreview = false,
  onConfirm,
  autoClose = false,
}: ReceiptModalProps) {
  // ALL HOOKS MUST BE AT THE TOP LEVEL - NEVER CONDITIONAL
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const { t } = useTranslation();

  // Query store settings to get dynamic address - ALWAYS CALL THIS HOOK
  const { data: storeSettings } = useQuery({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  // Log receipt modal state for debugging - ALWAYS CALL THIS HOOK
  useEffect(() => {
    if (isOpen) {
      console.log("=== RECEIPT MODAL RENDERED ===");
      console.log(
        "Receipt Modal Mode:",
        isPreview ? "PREVIEW (Step 1)" : "FINAL RECEIPT (Step 5)",
      );
      console.log("Receipt Modal isOpen:", isOpen);
      console.log("Receipt Modal isPreview:", isPreview);
      console.log("Receipt Modal cartItems received:", cartItems);
      console.log("Receipt Modal cartItems length:", cartItems?.length || 0);
      console.log("Receipt Modal total:", total);
      console.log("Receipt Modal receipt:", receipt);
      console.log("🔍 ReceiptModal Props Debug:", {
        isOpen,
        isPreview,
        receipt,
        cartItems: cartItems?.length || 0,
        onConfirm: !!onConfirm,
        hasReceiptData: !!(receipt && typeof receipt === 'object'),
        hasValidData: !!(receipt && typeof receipt === 'object') || (isPreview && cartItems && Array.isArray(cartItems) && cartItems.length > 0 && total > 0)
      });

      // Force show modal when receipt data exists
      if (receipt && typeof receipt === 'object') {
        console.log("✅ Receipt Modal: Valid receipt data found - modal will display");
      }
    }
  }, [isOpen, receipt, isPreview, cartItems, total, onConfirm]);

  // Early return after hooks
  if (!isOpen) {
    console.log("❌ Receipt Modal: Modal is closed");
    return null;
  }

  // Handle missing data cases
  const hasReceiptData = receipt && typeof receipt === 'object';
  const hasCartData = cartItems && Array.isArray(cartItems) && cartItems.length > 0;
  const hasValidData = hasReceiptData || (isPreview && hasCartData && total > 0);

  if (!hasValidData) {
    console.log("❌ Receipt Modal: No valid data for display", {
      hasReceiptData,
      hasCartData,
      isPreview,
      total
    });

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thông tin hóa đơn</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p>
              {isPreview
                ? "Không có sản phẩm trong giỏ hàng để xem trước hóa đơn"
                : "Không có dữ liệu hóa đơn để hiển thị"
              }
            </p>
            <Button onClick={onClose} className="mt-4">
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handlePrint = () => {
    console.log('🖨️ Receipt Modal: Print button clicked - triggering data refresh');

    // Force clear cart immediately when print is clicked
    if (typeof window !== 'undefined') {
      // Dispatch custom event to clear cart
      window.dispatchEvent(new CustomEvent('clearCart', {
        detail: {
          source: 'receipt_print',
          timestamp: new Date().toISOString()
        }
      }));
    }

    // Send enhanced refresh signals to ensure all components refresh
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Send multiple signals to ensure all components refresh
        const signals = [
          {
            type: "popup_close",
            success: true,
            action: 'print_receipt_requested',
            forceRefresh: true,
            timestamp: new Date().toISOString()
          },
          {
            type: "payment_completed",
            success: true,
            action: 'receipt_printed',
            refreshTables: true,
            timestamp: new Date().toISOString()
          },
          {
            type: "force_refresh",
            reason: 'receipt_modal_print',
            refreshTables: true,
            refreshOrders: true,
            timestamp: new Date().toISOString()
          }
        ];

        signals.forEach((signal, index) => {
          setTimeout(() => {
            ws.send(JSON.stringify(signal));
          }, index * 100);
        });

        setTimeout(() => ws.close(), 500);
      };
    } catch (error) {
      console.error("Failed to send refresh signals:", error);
    }

    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  margin: 0;
                  padding: 20px;
                  background: white;
                }
                .receipt-container {
                  width: 280px;
                  margin: 0 auto;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .border-t { border-top: 1px solid #000; }
                .border-b { border-bottom: 1px solid #000; }
                .py-1 { padding: 2px 0; }
                .py-2 { padding: 4px 0; }
                .mb-2 { margin-bottom: 4px; }
                .mb-4 { margin-bottom: 8px; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                .space-y-1 > * + * { margin-top: 2px; }
                .space-y-2 > * + * { margin-top: 4px; }
                img { max-width: 100px; height: auto; }
                @media print {
                  body { margin: 0; padding: 0; }
                  .receipt-container { width: 100%; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();

        // Wait for images to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();

            // Auto-close receipt modal after printing and refresh data
            setTimeout(() => {
              console.log('🔄 Auto-closing receipt modal after print start and refreshing data');

              // Send refresh signal to update table status and clear cart
              try {
                const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                const wsUrl = `${protocol}//${window.location.host}/ws`;
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                  ws.send(JSON.stringify({
                    type: "refresh_data_after_print",
                    action: "refresh_tables_and_clear_cart",
                    timestamp: new Date().toISOString(),
                  }));
                  ws.close();
                };
              } catch (error) {
                console.error("Failed to send refresh signal after print:", error);
              }

              // Close the receipt modal
              onClose();
            }, 2000);
          }, 500);
        };

        // Monitor print completion
        const checkClosed = setInterval(() => {
          if (printWindow.closed) {
            clearInterval(checkClosed);
            console.log("🖨️ Print window closed - print completed");

            // Also trigger refresh when print window is manually closed
            try {
              const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
              const wsUrl = `${protocol}//${window.location.host}/ws`;
              const ws = new WebSocket(wsUrl);

              ws.onopen = () => {
                ws.send(JSON.stringify({
                  type: "refresh_data_after_print",
                  action: "refresh_tables_and_clear_cart",
                  timestamp: new Date().toISOString(),
                }));
                ws.close();
              };
            } catch (error) {
              console.error("Failed to send refresh signal after print window closed:", error);
            }
          }
        }, 500);

        // Force close print window after 10 seconds and clear interval after 15 seconds
        setTimeout(() => {
          if (!printWindow.closed) {
            console.log("🖨️ Force closing print window after 10s timeout");
            printWindow.close();
          }
        }, 10000);

        setTimeout(() => {
          clearInterval(checkClosed);
        }, 15000);
      }
    }
  };

  const handleBrowserPrint = async () => {
    const printContent = document.getElementById("receipt-content");
    if (printContent) {
      // Calculate content height dynamically
      const contentHeight = printContent.scrollHeight;
      const windowWidth = 400;
      // Add some padding for print margins and controls
      const windowHeight = Math.min(Math.max(contentHeight + 120, 300), 800);

      console.log(
        "Receipt content height:",
        contentHeight,
        "Window height:",
        windowHeight,
      );

      const printWindow = window.open(
        "",
        "_blank",
        `width=${windowWidth},height=${windowHeight},scrollbars=yes,resizable=yes`,
      );
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body {
                  font-family: monospace;
                  margin: 0;
                  padding: 10px;
                  font-size: 12px;
                  line-height: 1.4;
                  background: white;
                }
                .receipt-container {
                  max-width: 300px;
                  margin: 0 auto;
                  background: white;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .border-t { border-top: 1px dashed #000; margin: 8px 0; }
                .border-b { border-bottom: 1px dashed #000; margin: 8px 0; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .space-y-1 > * + * { margin-top: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mb-4 { margin-bottom: 16px; }
                .text-sm { font-size: 11px; }
                .text-xs { font-size: 10px; }
                @media print {
                  body { margin: 0; }
                  .receipt-container { box-shadow: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();

        // Wait for content to load then adjust window size
        printWindow.onload = () => {
          const actualContentHeight = printWindow.document.body.scrollHeight;
          const newHeight = Math.min(
            Math.max(actualContentHeight + 100, 300),
            800,
          );
          console.log(
            "Actual content height:",
            actualContentHeight,
            "Resizing to:",
            newHeight,
          );
          printWindow.resizeTo(windowWidth, newHeight);
        };

        // Trigger print dialog
        printWindow.print();

        // Handle print completion - just close the print window, don't auto-close modals
        const handlePrintComplete = () => {
          console.log("🖨️ Print/Save completed, closing print window");

          // Close print window
          if (!printWindow.closed) {
            printWindow.close();
          }
        };

        // Handle print completion
        printWindow.onafterprint = handlePrintComplete;

        // Handle browser's save dialog completion (when user saves or cancels)
        printWindow.addEventListener("beforeunload", handlePrintComplete);

        // Handle manual close of print window
        const checkClosed = setInterval(() => {
          if (printWindow.closed) {
            console.log("🖨️ Print window closed manually");
            clearInterval(checkClosed);
          }
        }, 500);

        // Force close print window after 10 seconds and clear interval after 15 seconds
        setTimeout(() => {
          if (!printWindow.closed) {
            console.log("🖨️ Force closing print window after 10s timeout");
            printWindow.close();
          }
        }, 10000);

        setTimeout(() => {
          clearInterval(checkClosed);
        }, 15000);
      }
    }
  };

  const handleEmail = () => {
    // Mock email functionality
    alert("Email functionality would be implemented here");
  };

  const handleConfirmAndSelectPayment = () => {
    // Pass complete receipt data to parent for payment flow
    if (onConfirm) {
      console.log('📄 Receipt Modal: Confirming receipt and proceeding to payment method selection');
      console.log('🎯 Receipt data being passed:', {
        receipt,
        cartItems,
        total,
        subtotal: receipt?.subtotal,
        tax: receipt?.tax,
        exactTotal: receipt?.exactTotal,
        exactSubtotal: receipt?.exactSubtotal,
        exactTax: receipt?.exactTax
      });

      // Call onConfirm to proceed to payment method selection
      onConfirm();
    }
  };

  // Placeholder for handlePaymentMethodSelect, assuming it's defined elsewhere or in a parent component
  const handlePaymentMethodSelect = (method: string) => {
    console.log("Selected payment method:", method);
    // Logic to handle payment method selection, potentially opening e-invoice modal
  };

  // If receipt is null but isPreview is true, we still render the modal structure but without receipt data
  // This case is handled by the check below, which will render a message if receipt is null.
  // We only return null if !isOpen
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPreview
              ? t("pos.receiptPreview")
              : t("pos.receipt")}
          </DialogTitle>
        </DialogHeader>

        {hasReceiptData ? (
          <div
            id="receipt-content"
            className="receipt-print bg-white"
            style={{ padding: "16px" }}
          >
            <div className="text-center mb-4">
              <p className="text-xs font-semibold mb-1">
                {storeSettings?.storeName || "Easy Digital Point Of Sale Service"}
              </p>
              <p className="text-xs mb-0.5">{t("pos.mainStoreLocation")}</p>
              <p className="text-xs mb-0.5">
                {storeSettings?.address || "123 Commerce St, City, State 12345"}
              </p>
              <p className="text-xs mb-2">
                {t("pos.phone")} {storeSettings?.phone || "(555) 123-4567"}
              </p>
              <div className="flex items-center justify-center">
                <img src={logoPath} alt="EDPOS Logo" className="h-6" />
              </div>
            </div>

            <div className="border-t border-b border-gray-300 py-3 mb-3">
              <div className="flex justify-between text-sm">
                <span>{t("pos.transactionNumber")}</span>
                <span>{receipt.transactionId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("pos.date")}</span>
                <span>{new Date(receipt.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("pos.cashier")}</span>
                <span>{receipt.cashierName}</span>
              </div>
              {receipt?.customerName && (
                <div className="flex justify-between text-sm">
                  <span>{t("einvoice.customer")}:</span>
                  <span>{receipt.customerName}</span>
                </div>
              )}
              {receipt?.customerTaxCode && (
                <div className="flex justify-between text-sm">
                  <span>{t("einvoice.taxCode")}</span>
                  <span>{receipt.customerTaxCode}</span>
                </div>
              )}
              {receipt.paymentMethod === "einvoice" && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Trạng thái E-Invoice:</span>
                  <span>
                    {receipt.invoiceNumber ? "Đã phát hành" : "Chờ phát hành"}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {(receipt.items || []).map((item) => {
                // For receipt display, show the unit price (base price without tax) and total from order details
                const unitPrice = parseFloat(item.price || "0");

                return (
                  <div key={item.id || Math.random()}>
                    <div className="flex justify-between text-sm">
                      <div className="flex-1">
                        <div>{item.productName || item.name || "Unknown Product"}</div>
                        <div className="text-xs text-gray-600">
                          SKU:{" "}
                          {`FOOD${String(item.productId || item.id || "0").padStart(5, "0")}`}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.quantity || 1} x{" "}
                          {Math.floor(parseFloat(item.total || "0") / (item.quantity || 1)).toLocaleString("vi-VN")} ₫
                        </div>
                      </div>
                      <div>{Math.floor(parseFloat(item.total || "0")).toLocaleString("vi-VN")} ₫</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-300 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t("pos.subtotal")}</span>
                <span>
                  {Math.round(parseFloat(receipt.subtotal || "0")).toLocaleString("vi-VN")} ₫
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("pos.tax")}</span>
                <span>
                  {Math.floor(parseFloat(receipt.tax || "0")).toLocaleString("vi-VN")} ₫
                </span>
              </div>
              {parseFloat(receipt.discount || "0") > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Giảm giá:</span>
                  <span className="font-medium">
                    -{Math.floor(parseFloat(receipt.discount || "0")).toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                        <span>{t("pos.total")}</span>
                        <span>
                          {Math.round(parseFloat(receipt.total || "0")).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
            </div>
          </div>
        ) : isPreview && hasCartData && total > 0 ? (
          // Generate preview receipt from cartItems when in preview mode
          <div
            id="receipt-content"
            className="receipt-print bg-white"
            style={{ padding: "16px" }}
          >
            <div className="text-center mb-4">
              <p className="text-xs font-semibold mb-1">
                {storeSettings?.storeName || "Easy Digital Point Of Sale Service"}
              </p>
              <p className="text-xs mb-0.5">{t("pos.mainStoreLocation")}</p>
              <p className="text-xs mb-0.5">
                {storeSettings?.address || "123 Commerce St, City, State 12345"}
              </p>
              <p className="text-xs mb-2">
                {t("pos.phone")} {storeSettings?.phone || "(555) 123-4567"}
              </p>
              <div className="flex items-center justify-center">
                <img src={logoPath} alt="EDPOS Logo" className="h-6" />
              </div>
            </div>

            <div className="border-t border-b border-gray-300 py-3 mb-3">
              <div className="flex justify-between text-sm">
                <span>{t("pos.transactionNumber")}</span>
                <span>PREVIEW-{Date.now()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("pos.date")}</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("pos.cashier")}</span>
                <span>Nhân viên</span>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {cartItems.map((item) => (
                <div key={item.id}>
                  <div className="flex justify-between text-sm">
                    <div className="flex-1">
                      <div>{item.name}</div>
                      <div className="text-xs text-gray-600">
                        SKU: {item.sku || `FOOD${String(item.id).padStart(5, "0")}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.quantity} x{" "}
                        {Math.floor(
                          typeof item.price === "string"
                            ? parseFloat(item.price)
                            : item.price
                        ).toLocaleString("vi-VN")} ₫
                      </div>
                    </div>
                    <div>
                      {Math.floor(
                        (typeof item.price === "string"
                          ? parseFloat(item.price)
                          : item.price) * item.quantity
                      ).toLocaleString("vi-VN")} ₫
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-300 pt-3 space-y-1">
              {(() => {
                // For preview mode (cartItems), calculate values from cart
                if (isPreview && cartItems && cartItems.length > 0) {
                  const subtotal = cartItems.reduce((sum, item) => {
                    const price = typeof item.price === "string" ? parseFloat(item.price) : item.price;
                    return sum + (price * item.quantity);
                  }, 0);

                  // Calculate tax from individual items if they have afterTaxPrice
                  let totalTax = 0;
                  cartItems.forEach((item) => {
                    console.log('🔍 Receipt Modal - Tax calculation for item:', {
                      name: item.name,
                      basePrice: item.price,
                      afterTaxPrice: item.afterTaxPrice,
                      quantity: item.quantity,
                      taxRate: item.taxRate
                    });

                    if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
                      const basePrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
                      const afterTaxPrice = parseFloat(item.afterTaxPrice);
                      const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
                      const itemTax = Math.floor(taxPerUnit * item.quantity);
                      totalTax += itemTax;

                      console.log('💸 Tax calculated using afterTaxPrice:', {
                        basePrice,
                        afterTaxPrice,
                        taxPerUnit,
                        quantity: item.quantity,
                        itemTax
                      });
                    } else if (item.taxRate && parseFloat(item.taxRate) > 0) {
                      // Fallback to taxRate if afterTaxPrice not available
                      const basePrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
                      const taxRate = parseFloat(item.taxRate) / 100;
                      const itemTax = Math.floor(basePrice * taxRate * item.quantity);
                      totalTax += itemTax;

                      console.log('💸 Tax calculated using taxRate:', {
                        basePrice,
                        taxRate: item.taxRate,
                        quantity: item.quantity,
                        itemTax
                      });
                    }
                  });

                  const tax = totalTax;

                  // Check for order-level discount first (from orderForPayment or parent props)
                  let orderDiscount = 0;

                  // Check for discount from multiple sources (table-grid specific)

                  // 1. Check receipt prop first (most reliable for table-grid)
                  if (receipt && parseFloat(receipt.discount || "0") > 0) {
                    const receiptDiscount = parseFloat(receipt.discount || "0");
                    orderDiscount = Math.max(orderDiscount, receiptDiscount);
                    console.log("✅ Found receipt discount (table-grid):", receiptDiscount, "final order discount:", orderDiscount);
                  }

                  // 2. Check if there's discount in orderForPayment (passed from parent)
                  if (typeof window !== 'undefined' && (window as any).orderForPayment?.discount) {
                    const windowDiscount = parseFloat((window as any).orderForPayment.discount) || 0;
                    orderDiscount = Math.max(orderDiscount, windowDiscount);
                    console.log("✅ Found orderForPayment discount:", windowDiscount, "final order discount:", orderDiscount);
                  }

                  // 3. Check if total prop contains discount info
                  if (typeof total === 'object' && total.discount) {
                    const totalPropDiscount = parseFloat(total.discount) || 0;
                    orderDiscount = Math.max(orderDiscount, totalPropDiscount);
                    console.log("✅ Found total prop discount:", totalPropDiscount, "final order discount:", orderDiscount);
                  }

                  // 4. Check receipt exactDiscount property (for table-grid exact values)
                  if (receipt && receipt.exactDiscount && parseFloat(receipt.exactDiscount.toString()) > 0) {
                    const exactDiscount = parseFloat(receipt.exactDiscount.toString());
                    orderDiscount = Math.max(orderDiscount, exactDiscount);
                    console.log("✅ Found receipt exactDiscount:", exactDiscount, "final order discount:", orderDiscount);
                  }

                  // Get discount from cart items if available (for preview mode)
                  const itemLevelDiscount = cartItems.reduce((sum, item) => {
                    console.log("🔍 Checking discount for item:", {
                      id: item.id,
                      name: item.name,
                      discount: item.discount,
                      discountAmount: item.discountAmount,
                      originalPrice: item.originalPrice,
                      currentPrice: item.price,
                      quantity: item.quantity
                    });

                    // Check if item has discount property (per unit discount)
                    if (item.discount && parseFloat(item.discount) > 0) {
                      const itemDiscount = parseFloat(item.discount) * item.quantity;
                      console.log("✅ Found per-unit discount:", itemDiscount);
                      return sum + itemDiscount;
                    }

                    // Check if item has discountAmount property (total discount for item)
                    if (item.discountAmount && parseFloat(item.discountAmount) > 0) {
                      const itemDiscount = parseFloat(item.discountAmount);
                      console.log("✅ Found total discount amount:", itemDiscount);
                      return sum + itemDiscount;
                    }

                    // Check if item has originalPrice vs current price difference (implicit discount)
                    if (item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price)) {
                      const itemDiscount = (parseFloat(item.originalPrice) - parseFloat(item.price)) * item.quantity;
                      console.log("✅ Found price difference discount:", itemDiscount);
                      return sum + itemDiscount;
                    }

                    console.log("❌ No discount found for this item");
                    return sum;
                  }, 0);

                      // Use order-level discount as priority, then item-level discount as fallback
                      const finalDiscount = orderDiscount > 0 ? orderDiscount : itemLevelDiscount;

                      console.log("💰 Final discount calculation (order-management priority):", {
                        itemLevelDiscount: itemLevelDiscount,
                        orderLevelDiscount: orderDiscount,
                        finalDiscount: finalDiscount,
                        discountSource: orderDiscount > 0 ? 'order-level' : 'item-level'
                      });

                  // Calculate final total after discount - use base total before tax, then add tax, then subtract discount
                  const totalWithTax = subtotal + tax;
                  const finalTotal = Math.max(0, totalWithTax - finalDiscount);

                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>{t("pos.subtotal")}</span>
                        <span>
                          {Math.round(subtotal).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t("pos.tax")}</span>
                        <span>
                          {Math.floor(tax).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      {finalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Giảm giá:</span>
                          <span className="font-medium">
                            -{Math.floor(finalDiscount).toLocaleString("vi-VN")} ₫
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold">
                        <span>{t("pos.total")}</span>
                        <span>
                          {Math.round(finalTotal).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                    </>
                  );
                } else if (receipt) {
                  // For final receipt, ALWAYS use values directly from database without any calculation
                  // This ensures exact match with what's stored in the orders table
                  const dbSubtotal = parseFloat(receipt.subtotal || "0");
                  const dbTax = parseFloat(receipt.tax || "0");
                  const dbTotal = parseFloat(receipt.total || "0");
                  const dbDiscount = parseFloat(receipt.discount || "0");

                  console.log("🔍 Receipt Modal: Using EXACT database values:", {
                    rawSubtotal: receipt.subtotal,
                    rawTax: receipt.tax,
                    rawTotal: receipt.total,
                    rawDiscount: receipt.discount,
                    parsedSubtotal: dbSubtotal,
                    parsedTax: dbTax,
                    parsedTotal: dbTotal,
                    parsedDiscount: dbDiscount,
                    receiptId: receipt.id,
                    source: "database_exact"
                  });

                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>{t("pos.subtotal")}</span>
                        <span>
                          {Math.round(dbSubtotal).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t("pos.tax")}</span>
                        <span>
                          {Math.floor(dbTax).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      {dbDiscount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Giảm giá:</span>
                          <span className="font-medium">
                            -{Math.floor(dbDiscount).toLocaleString("vi-VN")} ₫
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold">
                        <span>{t("pos.total")}</span>
                        <span>
                          {(() => {
                            const dbTotal = parseFloat(receipt.total || "0");
                            const dbDiscount = parseFloat(receipt.discount || "0");
                            const finalTotal = Math.max(0, dbTotal - dbDiscount);
                            return Math.round(finalTotal).toLocaleString("vi-VN");
                          })()} ₫
                        </span>
                      </div>
                    </>
                  );
                } else {
                  // Fallback for missing data
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>{t("pos.subtotal")}</span>
                        <span>0 ₫</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t("pos.tax")}</span>
                        <span>0 ₫</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>{t("pos.total")}</span>
                        <span>0 ₫</span>
                      </div>
                    </>
                  );
                }
              })()}
            </div>
          </div>
        ) : (
          // Fallback content - should not reach here due to validation above
          <div className="p-4 text-center">
            <p>Đang tải dữ liệu hóa đơn...</p>
            <Button onClick={onClose} className="mt-4">
              Đóng
            </Button>
          </div>
        )}

        <div className="flex justify-center p-2 border-t">
          {isPreview ? (
            <div className="flex space-x-3 w-full">
              <Button onClick={onClose} variant="outline" className="flex-1">
                {t("pos.cancel")}
              </Button>
              <Button
                onClick={handleConfirmAndSelectPayment}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
              >
                {t("pos.confirmAndSelectPayment")}
              </Button>
            </div>
          ) : (
            <div className="flex justify-center space-x-3">
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
              >
                <Printer className="mr-2" size={16} />
                {t("pos.printReceipt")}
              </Button>
              <Button
                onClick={() => {
                  console.log('🔴 Receipt Modal: Close button clicked - forcing data refresh');

                  // Force clear cart when close button is clicked
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('clearCart', {
                      detail: {
                        source: 'receipt_close_button',
                        timestamp: new Date().toISOString()
                      }
                    }));
                  }

                  // Send enhanced refresh signals to update table data
                  try {
                    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                    const wsUrl = `${protocol}//${window.location.host}/ws`;
                    const ws = new WebSocket(wsUrl);

                    ws.onopen = () => {
                      // Send multiple refresh signals for table data update
                      const refreshSignals = [
                        {
                          type: "popup_close",
                          success: true,
                          action: 'receipt_modal_closed_manually',
                          refreshTables: true,
                          timestamp: new Date().toISOString()
                        },
                        {
                          type: "invoice_modal_closed",
                          success: true,
                          refreshTables: true,
                          refreshOrders: true,
                          timestamp: new Date().toISOString()
                        },
                        {
                          type: "modal_closed",
                          modalType: 'receipt',
                          forceRefresh: true,
                          refreshTables: true,
                          timestamp: new Date().toISOString()
                        }
                      ];

                      refreshSignals.forEach((signal, index) => {
                        setTimeout(() => {
                          console.log('📡 Receipt Modal: Sending refresh signal:', signal.type);
                          ws.send(JSON.stringify(signal));
                        }, index * 50);
                      });

                      setTimeout(() => ws.close(), 300);
                    };

                    ws.onerror = (error) => {
                      console.error("WebSocket error when closing receipt modal:", error);
                    };
                  } catch (error) {
                    console.error("Failed to send refresh signals:", error);
                  }

                  // Close the modal
                  onClose();
                }}
                variant="outline"
                className="ml-2"
              >
                {t("common.close")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Payment Method Modal */}
      {showPaymentMethodModal && (
        <PaymentMethodModal
          isOpen={showPaymentMethodModal}
          onClose={() => setShowPaymentMethodModal(false)}
          onSelectMethod={handlePaymentMethodSelect}
          total={
            typeof receipt?.total === "string"
              ? parseFloat(receipt.total)
              : receipt?.total || 0
          }
          cartItems={cartItems}
          onShowEInvoice={() => setShowEInvoiceModal(true)}
        />
      )}

      {/* E-Invoice Modal */}
      {showEInvoiceModal && (
        <EInvoiceModal
          isOpen={showEInvoiceModal}
          onClose={() => setShowEInvoiceModal(false)}
          onConfirm={(eInvoiceData) => {
            console.log("📧 E-Invoice confirmed:", eInvoiceData);
            setShowEInvoiceModal(false);

            // Sau khi e-invoice xử lý xong (phát hành ngay hoặc phát hành sau),
            // hiển thị lại receipt modal để in hóa đơn
            console.log("📄 Showing receipt modal after e-invoice processing");
          }}
          total={
            typeof receipt?.total === "string"
              ? parseFloat(receipt.total)
              : receipt?.total || 0
          }
          selectedPaymentMethod={receipt?.paymentMethod || "cash"}
          cartItems={(() => {
            console.log("🔄 Receipt Modal - Preparing cartItems for EInvoice:");
            console.log("- cartItems prop:", cartItems);
            console.log("- cartItems length:", cartItems?.length || 0);
            console.log("- receipt items:", receipt?.items);

            // Always prefer cartItems prop since it has the most accurate data
            if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
              console.log(
                "✅ Using cartItems prop for e-invoice (most accurate data)",
              );
              // Ensure all cartItems have proper structure
              const processedCartItems = cartItems.map((item) => ({
                id: item.id,
                name: item.name,
                price:
                  typeof item.price === "string"
                    ? parseFloat(item.price)
                    : item.price,
                quantity:
                  typeof item.quantity === "string"
                    ? parseInt(item.quantity)
                    : item.quantity,
                sku: item.sku || `FOOD${String(item.id).padStart(5, "0")}`,
                taxRate: item.taxRate || 0,
              }));
              console.log(
                "🔧 Processed cartItems for e-invoice:",
                processedCartItems,
              );
              return processedCartItems;
            } else if (
              receipt?.items &&
              Array.isArray(receipt.items) &&
              receipt.items.length > 0
            ) {
              console.log("⚠️ Fallback to receipt items for e-invoice");
              return receipt.items.map((item) => ({
                id: item.productId || item.id,
                name: item.productName,
                price:
                  typeof item.price === "string"
                    ? parseFloat(item.price)
                    : item.price,
                quantity:
                  typeof item.quantity === "string"
                    ? parseInt(item.quantity)
                    : item.quantity,
                sku:
                  item.productId?.toString() ||
                  `FOOD${String(item.id).padStart(5, "0")}`,
                taxRate: 0,
              }));
            } else {
              console.error("❌ No valid cart items found for e-invoice");
              return [];
            }
          })()}
        />
      )}
    </Dialog>
  );
}