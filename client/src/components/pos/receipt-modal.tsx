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
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const { t } = useTranslation();

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

  // Auto-open print window for e-invoice receipts or when autoShowPrint is true
  useEffect(() => {
    console.log('🔍 Receipt Modal useEffect triggered with:', {
      isOpen,
      hasReceipt: !!receipt,
      isPreview,
      hasAutoOpened,
      autoShowPrint,
      paymentMethod: receipt?.paymentMethod
    });

    if (isOpen && receipt && !isPreview && !hasAutoOpened) {
      // Check if this is specifically from e-invoice or has autoShowPrint flag
      const isFromEInvoice = receipt.paymentMethod === 'einvoice';
      
      console.log('🔍 Auto-print check PASSED initial conditions:', {
        isOpen,
        hasReceipt: !!receipt,
        isPreview,
        hasAutoOpened,
        isFromEInvoice,
        autoShowPrint,
        paymentMethod: receipt.paymentMethod
      });
      
      if (isFromEInvoice || autoShowPrint) {
        console.log(`🖨️ Auto-opening print window for ${isFromEInvoice ? 'e-invoice' : 'auto-print'} receipt`);
        setHasAutoOpened(true);
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          handlePrint();
        }, 300);
      } else {
        console.log('❌ Auto-print conditions not met:', { isFromEInvoice, autoShowPrint });
      }
    } else {
      console.log('❌ Initial conditions not met for auto-print:', {
        isOpen,
        hasReceipt: !!receipt,
        isPreview,
        hasAutoOpened
      });
    }
  }, [isOpen, receipt, isPreview, hasAutoOpened, autoShowPrint]);

  // Reset hasAutoOpened when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasAutoOpened(false);
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
          "<style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 16px; min-height: auto; } .text-center { text-align: center; } .text-right { text-align: right; } .border-t { border-top: 1px solid #000; } .border-b { border-bottom: 1px solid #000; } .py-2 { padding: 4px 0; } .mb-4 { margin-bottom: 8px; } .mb-2 { margin-bottom: 4px; } .mt-4 { margin-top: 8px; } .mt-2 { margin-top: 4px; } .space-y-1 > * + * { margin-top: 2px; } .flex { display: flex; } .justify-between { justify-content: space-between; } .text-sm { font-size: 11px; } .text-xs { font-size: 10px; } .font-bold { font-weight: bold; } @media print { body { min-height: auto !important; height: auto !important; } } @page { margin: 10mm; size: auto; }</style>",
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
      }
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
          </div>

          <div className="space-y-2 mb-3">
            {receipt.items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div>{item.productName}</div>
                    <div className="text-xs text-gray-600">
                      SKU: {`FOOD${String(item.productId || item.id).padStart(5, '0')}`}
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.quantity} x {item.price} ₫
                    </div>
                  </div>
                  <div>{item.total} ₫</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-300 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>{t('pos.subtotal')}</span>
              <span>{receipt.subtotal} ₫</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('pos.tax')}</span>
              <span>{receipt.tax} ₫</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>{t('pos.total')}</span>
              <span>{receipt.total} ₫</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>{t('pos.paymentMethod')}</span>
              <span className="capitalize">{receipt.paymentMethod}</span>
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
                className="bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
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
          total={receipt?.total || 0}
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
          total={receipt?.total || 0}
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
                sku: item.sku || `FOOD${String(item.productId || item.id).padStart(5, '0')}`,
                taxRate: item.taxRate || 10
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