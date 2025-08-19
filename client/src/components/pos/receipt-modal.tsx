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
  onConfirm?: () => void;
  isPreview?: boolean;
  cartItems?: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    taxRate?: number;
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
  console.log("Receipt Modal Mode:", isPreview ? "PREVIEW (Step 1)" : "FINAL RECEIPT (Step 5)");
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

  // Auto-open print dialog for non-preview receipts that have items
  useEffect(() => {
    console.log("🔍 Receipt Modal useEffect triggered with:", {
      isOpen,
      hasReceipt: !!receipt,
      isPreview,
      hasAutoOpened,
    });

    // Only auto-print for non-preview receipts that are opened and haven't been auto-opened yet
    if (isOpen && receipt && !isPreview && !hasAutoOpened) {
      console.log("✅ Initial conditions met for auto-print");
      setHasAutoOpened(true);

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        console.log("🖨️ Auto-triggering print dialog for completed payment");
        handlePrint();
      }, 500);
    } else {
      console.log("❌ Initial conditions not met for auto-print:", {
        isOpen,
        hasReceipt: !!receipt,
        isPreview,
        hasAutoOpened,
      });
    }
  }, [isOpen, receipt, isPreview, hasAutoOpened]);

  // Reset auto-opened flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasAutoOpened(false);
    }
  }, [isOpen]);

  if (!receipt) return null;

  const handlePrint = () => {
    const printContent = document.getElementById("receipt-content");
    if (printContent) {
      // Calculate content height dynamically
      const contentHeight = printContent.scrollHeight;
      const windowWidth = 400;
      // Add some padding for print margins and controls
      const windowHeight = Math.min(Math.max(contentHeight + 120, 300), 800);

      console.log("Receipt content height:", contentHeight, "Window height:", windowHeight);

      const printWindow = window.open("", "_blank", `width=${windowWidth},height=${windowHeight},scrollbars=yes,resizable=yes`);
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
          const newHeight = Math.min(Math.max(actualContentHeight + 100, 300), 800);
          console.log("Actual content height:", actualContentHeight, "Resizing to:", newHeight);
          printWindow.resizeTo(windowWidth, newHeight);
        };

        // Trigger print dialog
        printWindow.print();

        // Auto close modals and print window after printing or saving
        const handlePrintComplete = () => {
          console.log("🖨️ Print/Save completed, auto-closing all popups and print window");

          // Force close print window immediately
          if (!printWindow.closed) {
            printWindow.close();
          }

          // Auto close receipt modal and complete payment flow immediately after print
          setTimeout(() => {
            console.log("🔄 Auto-closing receipt modal and completing payment after print/save");
            if (onConfirm) {
              // Complete the payment flow first
              onConfirm();
            }
            // Close the receipt modal
            onClose();

            // Close any other modals that might be open
            setShowEInvoiceModal(false);
            setShowPaymentMethodModal(false);
          }, 200);
        };

        // Handle print completion
        printWindow.onafterprint = handlePrintComplete;

        // Handle browser's save dialog completion (when user saves or cancels)
        printWindow.addEventListener('beforeunload', handlePrintComplete);

        // Handle when print dialog is dismissed without printing
        printWindow.addEventListener('focus', () => {
          // Check if print dialog was closed without printing after a short delay
          setTimeout(() => {
            if (printWindow.document.hasFocus() && !printWindow.closed) {
              console.log("🖨️ Print dialog likely dismissed, auto-closing window");
              handlePrintComplete();
            }
          }, 500);
        });

        // Handle manual close of print window
        const checkClosed = setInterval(() => {
          if (printWindow.closed) {
            console.log("🖨️ Print window closed manually, auto-closing all popups");
            clearInterval(checkClosed);
            handlePrintComplete();
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
          if (!printWindow.closed) {
            console.log("🖨️ Print window still open after 15s, clearing interval");
          }
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
    // Close preview modal and trigger payment method selection in parent
    if (onConfirm) {
      onConfirm();
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
            {isEInvoice ? t('pos.eInvoice') : (isPreview ? t('pos.receiptPreview') : t('pos.receipt'))}
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
            <p className="text-xs mb-0.5">{t('pos.mainStoreLocation')}</p>
            <p className="text-xs mb-0.5">
              {storeSettings?.address || "123 Commerce St, City, State 12345"}
            </p>
            <p className="text-xs mb-2">
              {t('pos.phone')} {storeSettings?.phone || "(555) 123-4567"}
            </p>
            <div className="flex items-center justify-center">
              <img src={logoPath} alt="EDPOS Logo" className="h-6" />
            </div>
          </div>

          <div className="border-t border-b border-gray-300 py-3 mb-3">
            <div className="flex justify-between text-sm">
              <span>{t('pos.transactionNumber')}</span>
              <span>{receipt.transactionId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('pos.date')}</span>
              <span>{new Date(receipt.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('pos.cashier')}</span>
              <span>{receipt.cashierName}</span>
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
            {receipt.paymentMethod === 'einvoice' && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>Trạng thái E-Invoice:</span>
                <span>{receipt.invoiceNumber ? 'Đã phát hành' : 'Chờ phát hành'}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 mb-3">
            {receipt.items.map((item) => {
              // item.price is the base price (15,000)
              // item.total is the price with tax included (16,500)
              // For display, show base price without tax
              const unitPrice = parseFloat(item.price);
              const lineTotal = unitPrice * item.quantity;

              return (
                <div key={item.id}>
                  <div className="flex justify-between text-sm">
                    <div className="flex-1">
                      <div>{item.productName}</div>
                      <div className="text-xs text-gray-600">
                        SKU: {`FOOD${String(item.productId || item.id).padStart(5, '0')}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.quantity} x {unitPrice.toFixed(2)} ₫
                      </div>
                    </div>
                    <div>{lineTotal.toFixed(2)} ₫</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-300 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Tạm tính</span>
              <span>{(() => {
                // Calculate subtotal as sum of base prices (without tax)
                const baseSubtotal = receipt.items.reduce((sum, item) => {
                  return sum + (parseFloat(item.price) * item.quantity);
                }, 0);
                return baseSubtotal.toFixed(2);
              })()} ₫</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Thuế</span>
              <span>{(() => {
                // Calculate tax based on base prices (without tax)
                const baseSubtotal = receipt.items.reduce((sum, item) => {
                  return sum + (parseFloat(item.price) * item.quantity);
                }, 0);
                const taxAmount = baseSubtotal * 0.1; // 10% tax
                return taxAmount.toFixed(2);
              })()} ₫</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>{t('pos.total')}</span>
              <span>{(() => {
                // Calculate total as base subtotal + tax
                const baseSubtotal = receipt.items.reduce((sum, item) => {
                  return sum + (parseFloat(item.price) * item.quantity);
                }, 0);
                const taxAmount = baseSubtotal * 0.1;
                const total = baseSubtotal + taxAmount;
                return total.toFixed(2);
              })()} ₫</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>{t('pos.paymentMethod')}</span>
              <span className="capitalize">
                {(() => {
                  // Always prioritize originalPaymentMethod for e-invoices
                  let displayMethod = receipt.paymentMethod;

                  // If this is an e-invoice transaction and we have originalPaymentMethod, use it
                  if (receipt.originalPaymentMethod) {
                    displayMethod = receipt.originalPaymentMethod;
                  }

                  // Map payment methods to display names
                  const methodNames = {
                    cash: t('common.cash'),
                    creditCard: t('common.creditCard'),
                    debitCard: t('common.debitCard'),
                    momo: t('common.momo'),
                    zalopay: t('common.zalopay'),
                    vnpay: t('common.vnpay'),
                    qrCode: t('common.qrCode'),
                    shopeepay: t('common.shopeepay'),
                    grabpay: t('common.grabpay'),
                    einvoice: t('pos.eInvoice')
                  };

                  return methodNames[displayMethod] || displayMethod;
                })()}
              </span>
            </div>
            {receipt.amountReceived && (
              <div className="flex justify-between text-sm">
                <span>{t('pos.amountReceived')}</span>
                <span>{receipt.amountReceived} ₫</span>
              </div>
            )}
            {receipt.change && parseFloat(receipt.change) > 0 && (
              <div className="flex justify-between text-sm">
                <span>Change:</span>
                <span>{receipt.change} ₫</span>
              </div>
            )}
          </div>

          <div className="text-center mt-4 text-xs text-gray-600">
            <p>{t('pos.thankYouBusiness')}</p>
            <p>{t('pos.keepReceiptRecords')}</p>
          </div>
        </div>

        <div className="flex justify-center p-2 border-t">
          {isPreview ? (
            <div className="flex space-x-3 w-full">
              <Button onClick={onClose} variant="outline" className="flex-1">
                {t('pos.cancel')}
              </Button>
              <Button
                onClick={handleConfirmAndSelectPayment}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
              >
                {t('pos.confirmAndSelectPayment')}
              </Button>
            </div>
          ) : (
            <div className="flex justify-center space-x-3">
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
              >
                <Printer className="mr-2" size={16} />
                {t('pos.printReceipt')}
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
          total={typeof receipt?.total === 'string' ? parseFloat(receipt.total) : (receipt?.total || 0)}
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
            console.log('📧 E-Invoice confirmed:', eInvoiceData);
            setShowEInvoiceModal(false);

            // Sau khi e-invoice xử lý xong (phát hành ngay hoặc phát hành sau),
            // hiển thị lại receipt modal để in hóa đơn
            console.log('📄 Showing receipt modal after e-invoice processing');
          }}
          total={typeof receipt?.total === 'string' ? parseFloat(receipt.total) : (receipt?.total || 0)}
          selectedPaymentMethod={receipt?.paymentMethod || 'cash'}
          cartItems={(() => {
            console.log("🔄 Receipt Modal - Preparing cartItems for EInvoice:");
            console.log("- cartItems prop:", cartItems);
            console.log("- cartItems length:", cartItems?.length || 0);
            console.log("- receipt items:", receipt?.items);

            // Always prefer cartItems prop since it has the most accurate data
            if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
              console.log("✅ Using cartItems prop for e-invoice (most accurate data)");
              // Ensure all cartItems have proper structure
              const processedCartItems = cartItems.map(item => ({
                id: item.id,
                name: item.name,
                price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity,
                sku: item.sku || `FOOD${String(item.id).padStart(5, '0')}`,
                taxRate: typeof item.taxRate === 'string' ? parseFloat(item.taxRate || "10") : (item.taxRate || 10)
              }));
              console.log("🔧 Processed cartItems for e-invoice:", processedCartItems);
              return processedCartItems;
            } else if (receipt?.items && Array.isArray(receipt.items) && receipt.items.length > 0) {
              console.log("⚠️ Fallback to receipt items for e-invoice");
              return receipt.items.map(item => ({
                id: item.productId || item.id,
                name: item.productName,
                price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity,
                sku: item.productId?.toString() || `FOOD${String(item.id).padStart(5, '0')}`,
                taxRate: 10
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