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

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
  onConfirm?: () => void;
  isPreview?: boolean;
}

export function ReceiptModal({
  isOpen,
  onClose,
  receipt,
  onConfirm,
  isPreview = false,
}: ReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    const printContent = document.getElementById("receipt-content");
    if (printContent) {
      const printWindow = window.open("", "", "height=600,width=400");
      if (printWindow) {
        printWindow.document.write("<html><head><title>Receipt</title>");
        printWindow.document.write(
          "<style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; } .text-center { text-align: center; } .text-right { text-align: right; } .border-t { border-top: 1px solid #000; } .border-b { border-bottom: 1px solid #000; } .py-2 { padding: 8px 0; } .mb-4 { margin-bottom: 16px; } .mt-4 { margin-top: 16px; } .space-y-1 > * + * { margin-top: 4px; } .flex { display: flex; } .justify-between { justify-content: space-between; } .text-sm { font-size: 11px; } .text-xs { font-size: 10px; } .font-bold { font-weight: bold; }</style>",
        );
        printWindow.document.write("</head><body>");
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleEmail = () => {
    // Mock email functionality
    alert("Email functionality would be implemented here");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPreview ? "Xem trước hóa đơn" : "Receipt"}
          </DialogTitle>
        </DialogHeader>

        <div
          id="receipt-content"
          className="px-6 pb-6 receipt-print bg-white"
          style={{ paddingTop: "1px" }}
        >
          <div className="text-center mb-4">
            <p className="text-sm font-semibold">Easy Digital Point Of Sale Service</p>
            <div className="flex items-center justify-center mb-2 mt-1">
              <img src={logoPath} alt="EDPOS Logo" className="h-8" />
            </div>
            <p className="text-sm">Main Store Location</p>
            <p className="text-sm">123 Commerce St, City, State 12345</p>
            <p className="text-sm">Phone: (555) 123-4567</p>
          </div>

          <div className="border-t border-b border-gray-300 py-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Transaction #:</span>
              <span>{receipt.transactionId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Date:</span>
              <span>{new Date(receipt.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cashier:</span>
              <span>{receipt.cashierName}</span>
            </div>
          </div>

          <div className="space-y-1 mb-4">
            {receipt.items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div>{item.productName}</div>
                    <div className="text-xs text-gray-600">
                      {item.quantity} x {item.price} ₫
                    </div>
                  </div>
                  <div>{item.total} ₫</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-300 pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{receipt.subtotal} ₫</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (8.25%):</span>
              <span>{receipt.tax} ₫</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>{receipt.total} ₫</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>Payment Method:</span>
              <span className="capitalize">{receipt.paymentMethod}</span>
            </div>
            {receipt.amountReceived && (
              <div className="flex justify-between text-sm">
                <span>Amount Received:</span>
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
            <p>Thank you for your business!</p>
            <p>Please keep this receipt for your records</p>
          </div>
        </div>

        <div className="flex space-x-3 p-4 border-t">
          {isPreview ? (
            <>
              <Button onClick={onClose} variant="outline" className="flex-1">
                Hủy
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
              >
                Xác nhận & Chọn thanh toán
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handlePrint}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
              >
                <Printer className="mr-2" size={16} />
                Print Receipt
              </Button>
              <Button
                onClick={handleEmail}
                variant="secondary"
                className="flex-1"
              >
                <Mail className="mr-2" size={16} />
                Email Receipt
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
