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
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
  onConfirm?: () => void;
  isPreview?: boolean;
  autoShowPrint?: boolean;
  cartItems?: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    taxRate?: number;
  }>;
}

export function ReceiptModal({
  isOpen,
  onClose,
  receipt,
  onConfirm,
  isPreview = false,
  autoShowPrint = false,
  cartItems = [],
}: ReceiptModalProps) {
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false); // State to control print dialog visibility
  const hasAutoOpenedPrint = useRef(false); // Ref to track if print dialog has auto-opened
  const { t } = useTranslation();

  // Determine if the current receipt is a preview based on paymentMethod
  const receiptData = receipt; // Use the receipt prop directly

  // Debug logging when modal opens and when props change
  console.log("=== RECEIPT MODAL RENDERED ===");
  console.log("Receipt Modal isOpen:", isOpen);
  console.log("Receipt Modal cartItems received:", cartItems);
  console.log("Receipt Modal cartItems length:", cartItems?.length || 0);
  console.log("Receipt Modal cartItems type:", typeof cartItems);
  console.log("Receipt Modal cartItems is array:", Array.isArray(cartItems));
  console.log("Receipt Modal total:", receipt?.total);
  console.log("Receipt Modal cartItems content:");

  if (Array.isArray(cartItems)) {
    cartItems.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        id: item.id,
        name: item.name,
        price: item.price,
        priceType: typeof item.price,
        quantity: item.quantity,
        quantityType: typeof item.quantity,
        sku: item.sku,
        taxRate: item.taxRate
      });
    });
  }

  console.log("Receipt Modal receipt:", receipt);
  console.log("Receipt Modal receiptData?.paymentMethod:", receiptData?.paymentMethod);

  // Auto-show print dialog when modal opens with autoShowPrint = true
  // Effect to auto-open print dialog when needed
  useEffect(() => {
    console.log('🔍 Receipt Modal useEffect triggered with:', {
      isOpen,
      hasReceipt: !!receipt,
      isPreview: receiptData?.paymentMethod === 'preview',
      hasAutoOpened: hasAutoOpenedPrint.current,
      autoShowPrint
    });

    if (
      isOpen &&
      receipt &&
      receiptData?.paymentMethod !== 'preview' &&
      autoShowPrint &&
      !hasAutoOpenedPrint.current
    ) {
      console.log('✅ Auto-opening print dialog for completed transaction');

      // Delay to ensure modal has rendered and is ready
      const timer = setTimeout(() => {
        setShowPrintDialog(true);
        hasAutoOpenedPrint.current = true;
        console.log('✅ Print dialog auto-opened successfully');
      }, 800); // Increased delay to ensure UI is fully rendered

      return () => clearTimeout(timer);
    } else {
      console.log('❌ Initial conditions not met for auto-print:', {
        isOpen,
        hasReceipt: !!receipt,
        isPreview: receiptData?.paymentMethod === 'preview',
        hasAutoOpened: hasAutoOpenedPrint.current
      });
    }
  }, [isOpen, receipt, autoShowPrint, receiptData?.paymentMethod]);

  // Reset hasAutoOpenedPrint when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasAutoOpenedPrint.current = false;
      setShowPrintDialog(false); // Also reset the print dialog state
    }
  }, [isOpen]);

  // Query store settings to get dynamic address
  const { data: storeSettings } = useQuery({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    },
  });

  if (!receipt) return null;

  const handlePrint = () => {
    console.log("Attempting to handle print...");
    const printContent = document.getElementById("receipt-content");
    if (printContent) {
      // Calculate content height dynamically
      const contentHeight = printContent.scrollHeight;
      const windowWidth = 400;
      // Add some padding for print margins and controls
      const windowHeight = Math.min(Math.max(contentHeight + 120, 300), 800);

      console.log("Receipt content height:", contentHeight, "Window height:", windowHeight);

      const printWindow = window.open("", "", `height=${windowHeight},width=${windowWidth}`);
      if (printWindow) {
        printWindow.document.write("<html><head><title>Receipt</title>");
        printWindow.document.write(
          "<style>body { font-family: monospace; font-size: 11px; margin: 0; padding: 16px; min-height: auto; line-height: 1.4; } .text-center { text-align: center; } .text-right { text-align: right; } .border-t { border-top: 1px dashed #000; } .border-b { border-bottom: 1px dashed #000; } .py-2 { padding: 4px 0; } .mb-4 { margin-bottom: 8px; } .mb-3 { margin-bottom: 6px; } .mb-2 { margin-bottom: 4px; } .mb-1 { margin-bottom: 2px; } .mt-4 { margin-top: 8px; } .mt-2 { margin-top: 4px; } .pt-2 { padding-top: 4px; } .space-y-1 > * + * { margin-top: 2px; } .flex { display: flex; } .flex-1 { flex: 1; } .justify-between { justify-content: space-between; } .text-sm { font-size: 12px; } .text-xs { font-size: 10px; } .font-bold { font-weight: bold; } .font-medium { font-weight: 500; } .text-gray-600 { color: #666; } @media print { body { min-height: auto !important; height: auto !important; } } @page { margin: 10mm; size: auto; }</style>",
        );
        printWindow.document.write("</head><body>");
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write("</body></html>");
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

        // Multiple approaches to detect when printing is done and close modal
        let modalClosed = false;

        // Method 1: Use onafterprint event
        printWindow.onafterprint = () => {
          if (!modalClosed) {
            modalClosed = true;
            printWindow.close();
            onClose();
          }
        };

        // Method 2: Monitor window focus change (fallback)
        const handleFocus = () => {
          setTimeout(() => {
            if (!modalClosed) {
              modalClosed = true;
              printWindow.close();
              onClose();
            }
          }, 500);
        };

        window.addEventListener('focus', handleFocus, { once: true });

        // Method 3: Timer-based fallback (last resort)
        setTimeout(() => {
          if (!modalClosed) {
            modalClosed = true;
            printWindow.close();
            onClose();
          }
        }, 3000);

        // Method 4: Check if print window is closed manually
        const checkClosed = setInterval(() => {
          if (printWindow.closed && !modalClosed) {
            modalClosed = true;
            clearInterval(checkClosed);
            onClose();
          }
        }, 500);

        // Clear interval after 10 seconds to prevent memory leaks
        setTimeout(() => {
          clearInterval(checkClosed);
        }, 10000);
      } else {
        console.error("Failed to open print window.");
      }
    } else {
      console.error("Print content element not found.");
    }
  };

  const handleEmail = () => {
    // Mock email functionality
    alert("Email functionality would be implemented here");
  };

  const handleConfirmAndSelectPayment = () => {
    setShowPaymentMethodModal(true);
  };

  const handlePaymentMethodSelect = (method: string) => {
    setShowPaymentMethodModal(false);
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPreview ? t('pos.receiptPreview') : t('pos.receipt')}
          </DialogTitle>
        </DialogHeader>

        <div
          id="receipt-content"
          className="receipt-print bg-white"
          style={{ padding: "16px", fontFamily: "monospace", fontSize: "11px", lineHeight: "1.4" }}
        >
          <div className="text-center mb-4">
            <p className="font-bold text-sm mb-1">
              {storeSettings?.storeName || "IDMC"}
            </p>
            <p className="text-xs mb-0.5">Vì trí của hàng chính</p>
            <p className="text-xs mb-0.5">서울시 강남구 테헤란로 123</p>
            <p className="text-xs mb-2">
              Điện thoại: {storeSettings?.phone || "02-1234-5678"}
            </p>
          </div>

          <div className="py-2 mb-2" style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000" }}>
            <div className="flex justify-between text-xs mb-1">
              <span>Số giao dịch:</span>
              <span>{receipt.transactionId}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Ngày:</span>
              <span>{new Date(receipt.createdAt).toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Thu ngân:</span>
              <span>{receipt.cashierName}</span>
            </div>
          </div>

          <div className="mb-3">
            {receipt.items.map((item, index) => (
              <div key={item.id} className="mb-2">
                <div className="flex justify-between text-xs">
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-gray-600">
                      SKU: {`FOOD${String(item.productId || item.id).padStart(6, '0')}`}
                    </div>
                    <div className="text-gray-600">
                      {item.quantity} x {parseFloat(item.price).toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                  <div className="text-right font-medium">
                    {parseFloat(item.total).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px dashed #000" }} className="pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Tạm tính:</span>
              <span>{parseFloat(receipt.subtotal).toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Thuế (8.25%):</span>
              <span>{parseFloat(receipt.tax).toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="flex justify-between font-bold text-sm">
              <span>Tổng cộng:</span>
              <span>{parseFloat(receipt.total).toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span>Phương thức thanh toán:</span>
              <span className="capitalize">
                {receipt.paymentMethod === 'einvoice' ? 'E-Invoice' :
                 receipt.paymentMethod === 'cash' ? 'Tiền mặt' :
                 receipt.paymentMethod === 'preview' ? 'Preview' :
                 receipt.paymentMethod}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Số tiền nhận:</span>
              <span>{parseFloat(receipt.amountReceived || receipt.total).toLocaleString('vi-VN')} ₫</span>
            </div>
            {receipt.change && parseFloat(receipt.change) > 0 && (
              <div className="flex justify-between text-xs">
                <span>Tiền thừa:</span>
                <span>{parseFloat(receipt.change).toLocaleString('vi-VN')} ₫</span>
              </div>
            )}
          </div>

          <div className="text-center mt-4 text-xs">
            <p>Cảm ơn bạn đã mua hàng!</p>
            <p>Vui lòng giữ hóa đơn để làm bằng chứng</p>
          </div>
        </div>

        <div className="flex justify-center p-2 border-t">
          {isPreview || receiptData?.paymentMethod === 'preview' ? ( // Conditionally render buttons based on preview status
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
                disabled={showPrintDialog} // Disable print button when print dialog is shown
                className={`bg-green-600 hover:bg-green-700 text-white transition-colors duration-200 ${showPrintDialog ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            // The receipt modal should re-open or re-render to potentially trigger the print dialog again if autoShowPrint is true.
            // If the initial receipt data was for e-invoice, this might need a refresh or a state update that causes re-render.
            // For now, we assume the parent component handles re-opening or providing updated receipt data.
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