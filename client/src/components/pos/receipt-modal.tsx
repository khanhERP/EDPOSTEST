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
        hasReceiptData: !!(receipt && typeof receipt === "object"),
        hasValidData:
          !!(receipt && typeof receipt === "object") ||
          (isPreview &&
            cartItems &&
            Array.isArray(cartItems) &&
            cartItems.length > 0 &&
            total > 0),
      });

      // Force show modal when receipt data exists
      if (receipt && typeof receipt === "object") {
        console.log(
          "✅ Receipt Modal: Valid receipt data found - modal will display",
        );
      }
    }
  }, [isOpen, receipt, isPreview, cartItems, total, onConfirm]);

  // Early return after hooks
  if (!isOpen) {
    console.log("❌ Receipt Modal: Modal is closed");
    return null;
  }

  // Handle missing data cases
  const hasReceiptData = receipt && typeof receipt === "object";
  const hasCartData =
    cartItems && Array.isArray(cartItems) && cartItems.length > 0;
  const hasValidData =
    hasReceiptData || (isPreview && hasCartData && total > 0);

  if (!hasValidData) {
    console.log("❌ Receipt Modal: No valid data for display", {
      hasReceiptData,
      hasCartData,
      isPreview,
      total,
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
                : "Không có dữ liệu hóa đơn để hiển thị"}
            </p>
            <Button onClick={onClose} className="mt-4">
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handlePrint = async () => {
    console.log("🖨️ Receipt Modal: Print button clicked - processing for mobile/POS");

    const printContent = document.getElementById("receipt-content");
    if (!printContent) return;

    try {
      // Enhanced device detection
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isMobile = isIOS || isAndroid || /mobile|tablet|phone/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
      const isChrome = /chrome/.test(userAgent);
      
      console.log("🔍 Enhanced device detection:", { 
        isIOS, isAndroid, isMobile, isSafari, isChrome, userAgent 
      });

      // For mobile devices, use enhanced mobile printing approach
      if (isMobile) {
        console.log("📱 Using enhanced mobile printing approach");
        
        // Create receipt data for API printing
        const receiptData = {
          content: printContent.innerHTML,
          type: 'receipt',
          timestamp: new Date().toISOString(),
          orderId: receipt?.id,
          transactionId: receipt?.transactionId
        };

        // Try POS API first
        try {
          const printResponse = await fetch('/api/pos/print-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(receiptData)
          });

          if (printResponse.ok) {
            console.log("✅ Receipt sent to POS printer successfully");
            onClose();
            
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("printCompleted", {
                  detail: { closeAllModals: true, refreshData: true },
                }),
              );
            }
            return;
          }
        } catch (apiError) {
          console.log("⚠️ POS print API not available, using mobile fallbacks");
        }

        // iOS Safari specific handling
        if (isIOS) {
          console.log("🍎 iOS device detected - using iOS-optimized printing");
          
          // Create a clean print version for iOS
          const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
          if (printWindow) {
            const cleanContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Hóa đơn - ${receipt?.transactionId}</title>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
                      font-size: 14px;
                      line-height: 1.4;
                      margin: 10px;
                      padding: 0;
                      background: white;
                      color: black;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .border-t { border-top: 1px solid #000; margin: 8px 0; padding-top: 8px; }
                    .border-b { border-bottom: 1px solid #000; margin: 8px 0; padding-bottom: 8px; }
                    .flex { display: flex; justify-content: space-between; align-items: center; }
                    img { max-width: 80px; height: auto; }
                    .receipt-container { max-width: 300px; margin: 0 auto; }
                    @media print {
                      body { margin: 0; font-size: 12px; }
                      .receipt-container { max-width: 100%; }
                    }
                  </style>
                </head>
                <body>
                  <div class="receipt-container">
                    ${printContent.innerHTML}
                  </div>
                  <script>
                    // Auto-trigger print dialog for iOS
                    setTimeout(() => {
                      window.print();
                    }, 500);
                  </script>
                </body>
              </html>
            `;
            
            printWindow.document.write(cleanContent);
            printWindow.document.close();
            
            // Close current modal
            setTimeout(() => {
              onClose();
            }, 1000);
            
            return;
          }
        }

        // Android specific handling
        if (isAndroid) {
          console.log("🤖 Android device detected - using Android-optimized approach");
          
          // Try Web Share API first (if available)
          if (navigator.share) {
            try {
              const blob = new Blob([`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Hóa đơn</title>
                  <style>
                    body { font-family: monospace; font-size: 12px; margin: 10px; line-height: 1.4; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .border-t, .border-b { border: 1px solid #000; margin: 8px 0; padding: 4px 0; }
                    .flex { display: flex; justify-content: space-between; }
                  </style>
                </head>
                <body>
                  ${printContent.innerHTML}
                </body>
                </html>
              `], { type: 'text/html' });
              
              const url = URL.createObjectURL(blob);
              const file = new File([blob], `receipt-${receipt?.transactionId || Date.now()}.html`, { type: 'text/html' });
              
              await navigator.share({
                title: 'Hóa đơn',
                text: 'Chia sẻ hóa đơn để in',
                files: [file]
              });
              
              URL.revokeObjectURL(url);
              onClose();
              return;
            } catch (shareError) {
              console.log("📱 Web Share API failed, falling back to download");
            }
          }
          
          // Fallback to download for Android
          const blob = new Blob([`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Hóa đơn</title>
              <style>
                body { font-family: monospace; font-size: 12px; margin: 10px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .border-t, .border-b { border: 1px solid #000; margin: 8px 0; padding: 4px 0; }
                .flex { display: flex; justify-content: space-between; }
                img { max-width: 100px; height: auto; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
            </html>
          `], { type: 'text/html' });
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt-${receipt?.transactionId || Date.now()}.html`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          alert("Hóa đơn đã được tải xuống. Mở file để in hoặc chia sẻ với ứng dụng in.");
          onClose();
          return;
        }

        // Generic mobile fallback
        console.log("📱 Using generic mobile print fallback");
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Hóa đơn</title>
              <style>
                body { font-family: monospace; font-size: 12px; margin: 10px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .border-t, .border-b { border: 1px solid #000; margin: 8px 0; }
                .flex { display: flex; justify-content: space-between; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
              <script>
                setTimeout(() => { window.print(); }, 500);
              </script>
            </body>
            </html>
          `);
          printWindow.document.close();
          
          setTimeout(() => onClose(), 1000);
          return;
        }
      }

      // Desktop fallback
      console.log("🖥️ Using desktop printing method");
      handleDesktopPrint(printContent);

    } catch (error) {
      console.error("❌ Print error:", error);
      // Final fallback to desktop method
      handleDesktopPrint(printContent);
    }
  };

  const handleDesktopPrint = (printContent: HTMLElement) => {
    const printWindow = window.open("", "_blank");
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

          // Auto close after print and refresh data
          setTimeout(() => {
            console.log("🖨️ Receipt Modal: Auto-closing after print and refreshing data");

            onClose();

            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("printCompleted", {
                  detail: {
                    closeAllModals: true,
                    refreshData: true,
                  },
                }),
              );
              window.dispatchEvent(
                new CustomEvent("refreshOrders", {
                  detail: { immediate: true },
                }),
              );
              window.dispatchEvent(
                new CustomEvent("refreshTables", {
                  detail: { immediate: true },
                }),
              );
            }
          }, 1000);
        }, 500);
      };

      // Close modal immediately after opening print window
      setTimeout(() => {
        console.log("🖨️ Closing receipt modal immediately after print");
        onClose();
      }, 50);
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
    console.log(
      "📄 Receipt Modal: Confirming receipt and proceeding to payment method selection",
    );
    console.log("🎯 Receipt data being passed:", {
      receipt,
      cartItems,
      total,
      subtotal: receipt?.subtotal,
      tax: receipt?.tax,
      exactTotal: receipt?.exactTotal,
      exactSubtotal: receipt?.exactSubtotal,
      exactTax: receipt?.exactTax,
    });

    // Show payment method modal directly
    setShowPaymentMethodModal(true);
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

  const handleClose = () => {
    console.log(
      "🔴 Receipt Modal: handleClose called - closing all popups and refreshing data without notification",
    );

    // Send refresh signal without notification
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "receipt_closed",
            action: "refresh_all_data",
            clearCart: true,
            showNotification: false, // No notification when just closing
            timestamp: new Date().toISOString(),
          }),
        );
        ws.close();
      };
    } catch (error) {
      console.error("Failed to send refresh signal:", error);
    }

    // Clear all popup states
    if (typeof window !== "undefined") {
      (window as any).previewReceipt = null;
      (window as any).orderForPayment = null;

      // Send event to close all popups without notification
      window.dispatchEvent(
        new CustomEvent("closeAllPopups", {
          detail: {
            source: "receipt_modal_closed",
            showSuccessNotification: false, // No notification
            timestamp: new Date().toISOString(),
          },
        }),
      );

      // Clear cart
      window.dispatchEvent(
        new CustomEvent("clearCart", {
          detail: {
            source: "receipt_modal_closed",
            timestamp: new Date().toISOString(),
          },
        }),
      );
    }

    // Close the modal
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPreview ? t("pos.receiptPreview") : t("pos.receipt")}
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
                {storeSettings?.storeName ||
                  "Easy Digital Point Of Sale Service"}
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
                // For receipt display, use the actual unit price from database (not calculated)
                const actualUnitPrice = parseFloat(
                  item.unitPrice || item.price || "0",
                );
                const quantity = item.quantity || 1;
                const actualTotal = parseFloat(item.total || "0");

                return (
                  <div key={item.id || Math.random()}>
                    <div className="flex justify-between text-sm">
                      <div className="flex-1">
                        <div>
                          {item.productName || item.name || "Unknown Product"}
                        </div>
                        <div className="text-xs text-gray-600">
                          SKU:{" "}
                          {`FOOD${String(item.productId || item.id || "0").padStart(5, "0")}`}
                        </div>
                        <div className="text-xs text-gray-600">
                          {quantity} x{" "}
                          {Math.floor(actualUnitPrice).toLocaleString("vi-VN")}{" "}
                          ₫
                        </div>
                      </div>
                      <div>
                        {Math.floor(actualTotal).toLocaleString("vi-VN")} ₫
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-300 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t("pos.subtotal")}</span>
                <span>
                  {Math.round(
                    parseFloat(receipt.subtotal || "0"),
                  ).toLocaleString("vi-VN")}{" "}
                  ₫
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("pos.tax")}</span>
                <span>
                  {Math.floor(parseFloat(receipt.tax || "0")).toLocaleString(
                    "vi-VN",
                  )}{" "}
                  ₫
                </span>
              </div>
              {(() => {
                // Check for discount from multiple sources with priority
                let displayDiscount = 0;
                console.log("receipt_trường", receipt);
                // Priority 1: exactDiscount (most accurate)
                if (
                  receipt.exactDiscount !== undefined &&
                  receipt.exactDiscount !== null &&
                  parseFloat(receipt.exactDiscount.toString()) > 0
                ) {
                  displayDiscount = parseFloat(
                    receipt.exactDiscount.toString(),
                  );
                  console.log(
                    "📄 Receipt Modal: Using exactDiscount:",
                    displayDiscount,
                  );
                }
                // Priority 2: discount property
                else if (
                  receipt.discount !== undefined &&
                  receipt.discount !== null &&
                  parseFloat(receipt.discount.toString()) > 0
                ) {
                  displayDiscount = parseFloat(receipt.discount.toString());
                  console.log(
                    "📄 Receipt Modal: Using discount:",
                    displayDiscount,
                  );
                }

                return (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Giảm giá:</span>
                    <span className="font-medium">
                      -
                      {Math.floor(displayDiscount || "0").toLocaleString(
                        "vi-VN",
                      )}{" "}
                      ₫
                    </span>
                  </div>
                );
              })()}
              <div className="flex justify-between font-bold">
                <span>{t("pos.total")}</span>
                <span>
                  {(() => {
                    // Use EXACT database total directly without calculation
                    // This ensures exact match with what's stored in database
                    const dbTotal = parseFloat(receipt.total || "0");
                    console.log(
                      "📄 Receipt Modal: Using EXACT database total:",
                      {
                        rawTotal: receipt.total,
                        parsedTotal: dbTotal,
                        receiptId: receipt.id,
                        source: "database_exact",
                      },
                    );
                    return Math.round(dbTotal).toLocaleString("vi-VN");
                  })()}{" "}
                  ₫
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
                {storeSettings?.storeName ||
                  "Easy Digital Point Of Sale Service"}
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
                        SKU:{" "}
                        {item.sku || `FOOD${String(item.id).padStart(5, "0")}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.quantity} x{" "}
                        {Math.floor(
                          typeof item.price === "string"
                            ? parseFloat(item.price)
                            : item.price,
                        ).toLocaleString("vi-VN")}{" "}
                        ₫
                      </div>
                    </div>
                    <div>
                      {Math.floor(
                        (typeof item.price === "string"
                          ? parseFloat(item.price)
                          : item.price) * item.quantity,
                      ).toLocaleString("vi-VN")}{" "}
                      ₫
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
                    const price =
                      typeof item.price === "string"
                        ? parseFloat(item.price)
                        : item.price;
                    return sum + price * item.quantity;
                  }, 0);

                  // Calculate tax from individual items if they have afterTaxPrice
                  let totalTax = 0;
                  cartItems.forEach((item) => {
                    console.log(
                      "🔍 Receipt Modal - Tax calculation for item:",
                      {
                        name: item.name,
                        basePrice: item.price,
                        afterTaxPrice: item.afterTaxPrice,
                        quantity: item.quantity,
                        taxRate: item.taxRate,
                      },
                    );

                    if (
                      item.afterTaxPrice &&
                      item.afterTaxPrice !== null &&
                      item.afterTaxPrice !== ""
                    ) {
                      const basePrice =
                        typeof item.price === "string"
                          ? parseFloat(item.price)
                          : item.price;
                      const afterTaxPrice = parseFloat(item.afterTaxPrice);
                      const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
                      const itemTax = Math.floor(taxPerUnit * item.quantity);
                      totalTax += itemTax;

                      console.log("💸 Tax calculated using afterTaxPrice:", {
                        basePrice,
                        afterTaxPrice,
                        taxPerUnit,
                        quantity: item.quantity,
                        itemTax,
                      });
                    } else if (item.taxRate && parseFloat(item.taxRate) > 0) {
                      // Fallback to taxRate if afterTaxPrice not available
                      const basePrice =
                        typeof item.price === "string"
                          ? parseFloat(item.price)
                          : item.price;
                      const taxRate = parseFloat(item.taxRate) / 100;
                      const itemTax = Math.floor(
                        basePrice * taxRate * item.quantity,
                      );
                      totalTax += itemTax;

                      console.log("💸 Tax calculated using taxRate:", {
                        basePrice,
                        taxRate: item.taxRate,
                        quantity: item.quantity,
                        itemTax,
                      });
                    }
                  });

                  const tax = totalTax;

                  // Check for discount from multiple sources with priority order
                  let orderDiscount = 0;

                  // Check if this is from order-management specifically
                  const isFromOrderManagement =
                    typeof window !== "undefined" &&
                    (window as any).orderForPayment;

                  if (isFromOrderManagement) {
                    // For order-management: prioritize orderForPayment data
                    const orderForPayment = (window as any).orderForPayment;

                    // Priority 1: exactDiscount (most accurate)
                    if (
                      orderForPayment.exactDiscount !== undefined &&
                      orderForPayment.exactDiscount !== null
                    ) {
                      orderDiscount = Math.floor(
                        Number(orderForPayment.exactDiscount),
                      );
                      console.log(
                        "✅ Order Management: Using orderForPayment exactDiscount:",
                        orderDiscount,
                      );
                    }
                    // Priority 2: discount property
                    else if (
                      orderForPayment.discount !== undefined &&
                      orderForPayment.discount !== null
                    ) {
                      orderDiscount = Math.floor(
                        Number(orderForPayment.discount),
                      );
                      console.log(
                        "✅ Order Management: Using orderForPayment discount:",
                        orderDiscount,
                      );
                    }
                    // Priority 3: receipt discount as fallback
                    else if (receipt) {
                      if (
                        receipt.exactDiscount !== undefined &&
                        receipt.exactDiscount !== null
                      ) {
                        orderDiscount = Math.floor(
                          Number(receipt.exactDiscount),
                        );
                        console.log(
                          "✅ Order Management: Using receipt exactDiscount (fallback):",
                          orderDiscount,
                        );
                      } else if (
                        receipt.discount !== undefined &&
                        receipt.discount !== null
                      ) {
                        orderDiscount = Math.floor(Number(receipt.discount));
                        console.log(
                          "✅ Order Management: Using receipt discount (fallback):",
                          orderDiscount,
                        );
                      }
                    }
                  } else {
                    // For other screens (POS, etc.): keep original logic
                    // 1. Check receipt exactDiscount first (most reliable for exact calculations)
                    if (
                      receipt &&
                      receipt.exactDiscount !== undefined &&
                      receipt.exactDiscount !== null &&
                      parseFloat(receipt.exactDiscount.toString()) > 0
                    ) {
                      const exactDiscount = parseFloat(
                        receipt.exactDiscount.toString(),
                      );
                      orderDiscount = exactDiscount;
                      console.log(
                        "✅ Using receipt exactDiscount (highest priority):",
                        exactDiscount,
                      );
                    }
                    // 2. Check receipt discount property
                    else if (
                      receipt &&
                      parseFloat(receipt.discount || "0") > 0
                    ) {
                      const receiptDiscount = parseFloat(
                        receipt.discount || "0",
                      );
                      orderDiscount = receiptDiscount;
                      console.log(
                        "✅ Using receipt discount:",
                        receiptDiscount,
                      );
                    }
                    // 3. Check if total prop contains discount info
                    else if (typeof total === "object" && total.discount) {
                      const totalPropDiscount = parseFloat(total.discount) || 0;
                      orderDiscount = totalPropDiscount;
                      console.log(
                        "✅ Using total prop discount:",
                        totalPropDiscount,
                      );
                    }
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
                      quantity: item.quantity,
                    });

                    // Check if item has discount property (per unit discount)
                    if (item.discount && parseFloat(item.discount) > 0) {
                      const itemDiscount =
                        parseFloat(item.discount) * item.quantity;
                      console.log("✅ Found per-unit discount:", itemDiscount);
                      return sum + itemDiscount;
                    }

                    // Check if item has discountAmount property (total discount for item)
                    if (
                      item.discountAmount &&
                      parseFloat(item.discountAmount) > 0
                    ) {
                      const itemDiscount = parseFloat(item.discountAmount);
                      console.log(
                        "✅ Found total discount amount:",
                        itemDiscount,
                      );
                      return sum + itemDiscount;
                    }

                    // Check if item has originalPrice vs current price difference (implicit discount)
                    if (
                      item.originalPrice &&
                      parseFloat(item.originalPrice) > parseFloat(item.price)
                    ) {
                      const itemDiscount =
                        (parseFloat(item.originalPrice) -
                          parseFloat(item.price)) *
                        item.quantity;
                      console.log(
                        "✅ Found price difference discount:",
                        itemDiscount,
                      );
                      return sum + itemDiscount;
                    }

                    console.log("❌ No discount found for this item");
                    return sum;
                  }, 0);

                  // Use order-level discount as priority, then item-level discount as fallback
                  const finalDiscount =
                    orderDiscount > 0 ? orderDiscount : itemLevelDiscount;

                  console.log(
                    "💰 Final discount calculation (order-management priority):",
                    {
                      itemLevelDiscount: itemLevelDiscount,
                      orderLevelDiscount: orderDiscount,
                      finalDiscount: finalDiscount,
                      discountSource:
                        orderDiscount > 0 ? "order-level" : "item-level",
                    },
                  );

                  // Total is always subtotal + tax (discount handled separately in payment)
                  const finalTotal = subtotal + tax;
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
                        <span>{Math.floor(tax).toLocaleString("vi-VN")} ₫</span>
                      </div>
                      {finalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Giảm giá:</span>
                          <span className="font-medium">
                            -{Math.floor(finalDiscount).toLocaleString("vi-VN")}{" "}
                            ₫
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold">
                        <span>{t("pos.total")}</span>
                        <span>
                          {(() => {
                            // For order-management preview: use exact total from orderForPayment
                            const isFromOrderManagement =
                              typeof window !== "undefined" &&
                              (window as any).orderForPayment;

                            if (isFromOrderManagement) {
                              const orderForPayment = (window as any)
                                .orderForPayment;
                              // Use exactTotal first, then total as fallback
                              const exactTotal =
                                orderForPayment.exactTotal ||
                                orderForPayment.total;
                              return Math.round(
                                parseFloat(exactTotal || "0"),
                              ).toLocaleString("vi-VN");
                            }

                            // For other screens: use calculated finalTotal
                            return Math.round(finalTotal).toLocaleString(
                              "vi-VN",
                            );
                          })()}{" "}
                          ₫
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

                  console.log(
                    "🔍 Receipt Modal: Using EXACT database values:",
                    {
                      rawSubtotal: receipt.subtotal,
                      rawTax: receipt.tax,
                      rawTotal: receipt.total,
                      rawDiscount: receipt.discount,
                      parsedSubtotal: dbSubtotal,
                      parsedTax: dbTax,
                      parsedTotal: dbTotal,
                      parsedDiscount: dbDiscount,
                      receiptId: receipt.id,
                      source: "database_exact",
                    },
                  );

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
                      {(() => {
                        // Check for discount from multiple sources with priority
                        let displayDiscount = 0;
                        console.log("receipt_trường 2", receipt);
                        // Priority 1: exactDiscount (most accurate)
                        if (
                          receipt.exactDiscount !== undefined &&
                          receipt.exactDiscount !== null &&
                          parseFloat(receipt.exactDiscount.toString()) > 0
                        ) {
                          displayDiscount = parseFloat(
                            receipt.exactDiscount.toString(),
                          );
                          console.log(
                            "📄 Receipt Modal: Using exactDiscount Print Invoice:",
                            displayDiscount,
                          );
                        }
                        // Priority 2: discount property
                        else if (
                          receipt.discount !== undefined &&
                          receipt.discount !== null &&
                          parseFloat(receipt.discount.toString()) > 0
                        ) {
                          displayDiscount = parseFloat(
                            receipt.discount.toString(),
                          );
                          console.log(
                            "📄 Receipt Modal: Using discount:",
                            displayDiscount,
                          );
                        }

                        return (
                          <div className="flex justify-between text-sm text-red-600">
                            <span>Giảm giá:</span>
                            <span className="font-medium">
                              -
                              {Math.floor(displayDiscount).toLocaleString(
                                "vi-VN",
                              )}{" "}
                              ₫
                            </span>
                          </div>
                        );
                      })()}
                      <div className="flex justify-between font-bold">
                        <span>{t("pos.total")}</span>
                        <span>
                          {(() => {
                            // Use EXACT database total directly - no calculation
                            const dbTotal = parseFloat(receipt.total || "0");
                            console.log(
                              "📄 Receipt Modal (Final): Using EXACT database total:",
                              {
                                rawTotal: receipt.total,
                                parsedTotal: dbTotal,
                                receiptId: receipt.id,
                                mode: "final_receipt",
                              },
                            );
                            return Math.round(dbTotal).toLocaleString("vi-VN");
                          })()}{" "}
                          ₫
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
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
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
              <Button onClick={handleClose} variant="outline" className="ml-2">
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
          total={(() => {
            // Use exact total with proper priority for receipt modal
            if (
              receipt?.exactTotal !== undefined &&
              receipt.exactTotal !== null
            ) {
              return Math.floor(Number(receipt.exactTotal));
            } else if (receipt?.total !== undefined && receipt.total !== null) {
              return Math.floor(Number(receipt.total));
            } else {
              return Math.floor(Number(total || 0));
            }
          })()}
          cartItems={cartItems}
          receipt={receipt}
          orderForPayment={
            receipt
              ? {
                  id: receipt.id || `temp-${Date.now()}`,
                  total: receipt.total,
                  exactTotal: receipt.exactTotal,
                  subtotal: receipt.subtotal,
                  tax: receipt.tax,
                  discount: receipt.discount,
                  items: cartItems,
                }
              : null
          }
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
