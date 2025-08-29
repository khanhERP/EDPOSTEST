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
  receipt: Receipt | null;
  onConfirm?: (data?: any) => void; // Modified to accept optional data
  isPreview?: boolean;
  cartItems?: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    taxRate?: number;
    afterTaxPrice?: number | string | null; // Added for precise calculations
  }>;
  total?: number;
  isEInvoice?: boolean;
  customerName?: string;
  customerTaxCode?: string;
}

export function ReceiptModal({
  isOpen,
  onClose,
  receipt,
  onConfirm,
  isPreview = false,
  cartItems = [],
  total,
  isEInvoice = false,
  customerName,
  customerTaxCode,
}: ReceiptModalProps) {
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const { t } = useTranslation();

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

  // Query store settings to get dynamic address
  const { data: storeSettings } = useQuery({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    },
  });

  // Log receipt modal state for debugging
  useEffect(() => {
    const hasReceipt = receipt && receipt.items && receipt.items.length > 0;
    const shouldShow = isOpen && (hasReceipt || isPreview);
    console.log("🔍 Receipt Modal state:", { isOpen, hasReceipt, isPreview, shouldShow });
  }, [isOpen, receipt, isPreview]);

  // Debug: Log all props
  console.log("🔍 ReceiptModal Props Debug:", {
    isOpen,
    isPreview,
    receipt,
    cartItems,
    total,
    onConfirm: !!onConfirm
  });

  // Early return if no receipt data and not in preview mode
  if (!receipt && !isPreview) {
    console.log("❌ Receipt Modal: No receipt data provided");

    console.log("🔍 Receipt Modal state:", {
      isOpen,
      hasReceipt: !!receipt,
      isPreview
    });

    // Early return if no receipt data to prevent null access errors
    if (!receipt) {
      return null;
    }
  }

  // Additional safety check - if receipt is null and not in preview mode, return null
  if (!receipt && !isPreview) {
    console.log("❌ Receipt Modal: Receipt is null, cannot render");
    return null;
  }

  // Debug logging for receipt modal state
  console.log("🔍 Receipt Modal state:", {
    isOpen,
    hasReceipt: !!receipt,
    isPreview,
    receiptTransactionId: receipt?.transactionId || 'N/A',
  });

  const handlePrint = async () => {
    console.log("🖨️ Starting browser print process");
    await handleBrowserPrint();
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
      console.log('📄 Receipt Modal: Passing complete receipt data to payment flow');

      // Use exact values from receipt for accurate calculation
      const exactData = {
        receipt,
        cartItems,
        total,
        // Pass exact calculated values to ensure consistency
        exactSubtotal: receipt?.exactSubtotal ?? parseFloat(receipt?.subtotal || "0"),
        exactTax: receipt?.exactTax ?? parseFloat(receipt?.tax || "0"),
        exactTotal: receipt?.exactTotal ?? parseFloat(receipt?.total || "0"),
        // Map cart items with correct tax calculation
        processedCartItems: cartItems?.map((item: any) => ({
          ...item,
          // Ensure proper tax calculation based on afterTaxPrice logic
          calculatedTax: (() => {
            if (item.afterTaxPrice && item.afterTaxPrice !== null && item.afterTaxPrice !== "") {
              const afterTax = typeof item.afterTaxPrice === 'string'
                ? parseFloat(item.afterTaxPrice)
                : item.afterTaxPrice;
              const basePrice = typeof item.price === 'string'
                ? parseFloat(item.price)
                : item.price;
              return (afterTax - basePrice) * item.quantity;
            }
            return 0;
          })()
        })) || []
      };

      console.log('🎯 Receipt data being passed with exact values:', {
        exactSubtotal: exactData.exactSubtotal,
        exactTax: exactData.exactTax,
        exactTotal: exactData.exactTotal,
        receiptSubtotal: receipt?.subtotal,
        receiptTax: receipt?.tax,
        receiptTotal: receipt?.total
      });

      // Call onConfirm with exact receipt data
      onConfirm(exactData);
    }
  };

  // Placeholder for handlePaymentMethodSelect, assuming it's defined elsewhere or in a parent component
  const handlePaymentMethodSelect = (method: string) => {
    console.log("Selected payment method:", method);
    // Logic to handle payment method selection, potentially opening e-invoice modal
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEInvoice
              ? t("pos.eInvoice")
              : isPreview
                ? t("pos.receiptPreview")
                : t("pos.receipt")}
          </DialogTitle>
        </DialogHeader>

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
              <span>{receipt?.transactionId || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("pos.date")}</span>
              <span>{receipt?.createdAt ? new Date(receipt.createdAt).toLocaleString() : "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("pos.cashier")}</span>
              <span>{receipt?.cashierName || "N/A"}</span>
            </div>
            {isEInvoice && customerName && (
              <div className="flex justify-between text-sm">
                <span>Khách hàng:</span>
                <span>{customerName}</span>
              </div>
            )}
            {isEInvoice && customerTaxCode && (
              <div className="flex justify-between text-sm">
                <span>Mã số thuế:</span>
                <span>{customerTaxCode}</span>
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
            {receipt?.items?.map((item) => {
              // For receipt display, show the unit price (base price without tax) and total from order details
              const unitPrice = parseFloat(item.price);

              return (
                <div key={item.id}>
                  <div className="flex justify-between text-sm">
                    <div className="flex-1">
                      <div>{item.productName}</div>
                      <div className="text-xs text-gray-600">
                        SKU:{" "}
                        {`FOOD${String(item.productId || item.id).padStart(5, "0")}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.quantity} x{" "}
                        {Math.floor(parseFloat(item.total) / item.quantity).toLocaleString("vi-VN")} ₫
                      </div>
                    </div>
                    <div>{Math.floor(parseFloat(item.total)).toLocaleString("vi-VN")} ₫</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-300 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Tạm tính</span>
              <span>
                {(() => {
                  // Always prioritize exact values passed from parent component
                  const subtotalValue = receipt.exactSubtotal !== undefined
                    ? receipt.exactSubtotal
                    : parseFloat(receipt.subtotal || "0");
                  console.log('💰 Receipt Modal - Subtotal display:', subtotalValue, 'from exactSubtotal:', receipt.exactSubtotal, 'from subtotal:', receipt.subtotal);
                  return Math.floor(subtotalValue).toLocaleString("vi-VN");
                })()} ₫
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Thuế:</span>
              <span>
                {(() => {
                  // Always prioritize exact values passed from parent component
                  const taxValue = receipt.exactTax !== undefined
                    ? receipt.exactTax
                    : parseFloat(receipt.tax || "0");
                  console.log('💰 Receipt Modal - Tax display:', taxValue, 'from exactTax:', receipt.exactTax, 'from tax:', receipt.tax);
                  return Math.floor(taxValue).toLocaleString("vi-VN");
                })()} ₫
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>{t("pos.total")}</span>
              <span>
                {(() => {
                  // Always prioritize exact values passed from parent component
                  const totalValue = receipt.exactTotal !== undefined
                    ? receipt.exactTotal
                    : parseFloat(receipt.total || "0");
                  console.log('💰 Receipt Modal - Total display:', totalValue, 'from exactTotal:', receipt.exactTotal, 'from total:', receipt.total);
                  return Math.floor(totalValue).toLocaleString("vi-VN");
                })()} ₫
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>{t("pos.paymentMethod")}</span>
              <span className="capitalize">
                {(() => {
                  // Always prioritize originalPaymentMethod for e-invoices
                  let displayMethod = receipt?.paymentMethod || "cash";

                  // If this is an e-invoice transaction and we have originalPaymentMethod, use it
                  if (receipt?.originalPaymentMethod) {
                    displayMethod = receipt.originalPaymentMethod;
                  }

                  // Map payment methods to display names
                  const methodNames = {
                    cash: t("common.cash"),
                    creditCard: t("common.creditCard"),
                    debitCard: t("common.debitCard"),
                    momo: t("common.momo"),
                    zalopay: t("common.zalopay"),
                    vnpay: t("common.vnpay"),
                    qrCode: t("common.qrCode"),
                    shopeepay: t("common.shopeepay"),
                    grabpay: t("common.grabpay"),
                    einvoice: t("pos.eInvoice"),
                  };

                  return methodNames[displayMethod] || displayMethod;
                })()}
              </span>
            </div>
            {receipt?.amountReceived && (
              <div className="flex justify-between text-sm">
                <span>{t("pos.amountReceived")}</span>
                <span>
                  {(() => {
                    // For e-invoice transactions, amount received should equal the total
                    if (
                      receipt?.paymentMethod === "einvoice" ||
                      receipt?.originalPaymentMethod === "einvoice"
                    ) {
                      // For e-invoice, use the total from receipt
                      return Math.floor(parseFloat(receipt?.total || "0")).toLocaleString("vi-VN");
                    }
                    // For other payment methods, use the original amount received
                    return Math.floor(
                      parseFloat(receipt?.amountReceived || "0"),
                    ).toLocaleString("vi-VN");
                  })()}{" "}
                  ₫
                </span>
              </div>
            )}
            {receipt?.change && parseFloat(receipt.change) > 0 && (
              <div className="flex justify-between text-sm">
                <span>Change:</span>
                <span>{receipt.change} ₫</span>
              </div>
            )}
          </div>

          <div className="text-center mt-4 text-xs text-gray-600">
            <p>{t("pos.thankYouBusiness")}</p>
            <p>{t("pos.keepReceiptRecords")}</p>
          </div>
        </div>

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
                taxRate:
                  typeof item.taxRate === "string"
                    ? parseFloat(item.taxRate || "10")
                    : item.taxRate || 10,
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
                taxRate: 10,
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