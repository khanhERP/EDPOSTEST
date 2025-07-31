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
      const printWindow = window.open("", "", "height=600,width=400");
      if (printWindow) {
        printWindow.document.write("<html><head><title>Receipt</title>");
        printWindow.document.write(
          "<style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; } .text-center { text-align: center; } .text-right { text-align: right; } .border-t { border-top: 1px solid #000; } .border-b { border-bottom: 1px solid #000; } .py-2 { padding: 4px 0; } .mb-4 { margin-bottom: 8px; } .mb-2 { margin-bottom: 4px; } .mt-4 { margin-top: 8px; } .mt-2 { margin-top: 4px; } .space-y-1 > * + * { margin-top: 2px; } .flex { display: flex; } .justify-between { justify-content: space-between; } .text-sm { font-size: 11px; } .text-xs { font-size: 10px; } .font-bold { font-weight: bold; }</style>",
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
          style={{ padding: "10px 0" }}
        >
          <div className="text-center mb-2">
            <p className="text-xs font-semibold mb-0.5">
              {storeSettings?.storeName || "Easy Digital Point Of Sale Service"}
            </p>
            <p className="text-xs">Main Store Location</p>
            <p className="text-xs">
              {storeSettings?.address || "123 Commerce St, City, State 12345"}
            </p>
            <p className="text-xs mb-1">
              Phone: {storeSettings?.phone || "(555) 123-4567"}
            </p>
            <div className="flex items-center justify-center">
              <img src={logoPath} alt="EDPOS Logo" className="h-6" />
            </div>
          </div>

          <div className="border-t border-b border-gray-300 py-2 mb-2">
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

          <div className="space-y-1 mb-2">
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

        <div className="flex justify-center p-2 border-t">
          {isPreview ? (
            <div className="flex space-x-3 w-full">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Hủy
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
              >
                Xác nhận & Chọn thanh toán
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                onClick={handlePrint}
                className="bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
                style={{ width: "80mm" }}
              >
                <Printer className="mr-2" size={16} />
                Print Receipt
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
