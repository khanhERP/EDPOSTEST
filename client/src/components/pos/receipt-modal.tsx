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
          "<style>body { font-family: monospace; font-size: 11px; margin: 0; padding: 2px; line-height: 1.1; } .text-center { text-align: center; } .text-right { text-align: right; } .border-t { border-top: 1px solid #000; } .border-b { border-bottom: 1px solid #000; } .py-2 { padding: 2px 0; } .mb-4 { margin-bottom: 2px; } .mb-2 { margin-bottom: 1px; } .mt-4 { margin-top: 3px; } .mt-2 { margin-top: 1px; } .space-y-1 > * + * { margin-top: 1px; } .flex { display: flex; } .justify-between { justify-content: space-between; } .text-sm { font-size: 10px; } .text-xs { font-size: 9px; } .font-bold { font-weight: bold; } p { margin: 0 !important; } div { margin: 0 !important; }</style>",
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
          className="receipt-print bg-white"
          style={{ padding: "5px", margin: 0, fontSize: "11px", lineHeight: "1.1" }}
        >
          <div className="text-center" style={{ marginBottom: "3px" }}>
            <p style={{ margin: "0", fontSize: "11px", fontWeight: "bold" }}>
              {storeSettings?.storeName || "Easy Digital Point Of Sale Service"}
            </p>
            <p style={{ margin: "0", fontSize: "10px" }}>Main Store Location</p>
            <p style={{ margin: "0", fontSize: "10px" }}>
              {storeSettings?.address || "123 Commerce St, City, State 12345"}
            </p>
            <p style={{ margin: "0 0 2px 0", fontSize: "10px" }}>
              Phone: {storeSettings?.phone || "(555) 123-4567"}
            </p>
          </div>

          <div style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "2px 0", margin: "2px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", margin: "0" }}>
              <span>Transaction #:</span>
              <span>{receipt.transactionId}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", margin: "0" }}>
              <span>Date:</span>
              <span>{new Date(receipt.createdAt).toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", margin: "0" }}>
              <span>Cashier:</span>
              <span>{receipt.cashierName}</span>
            </div>
          </div>

          <div style={{ margin: "2px 0" }}>
            {receipt.items.map((item) => (
              <div key={item.id} style={{ margin: "1px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ margin: "0" }}>{item.productName}</div>
                    <div style={{ fontSize: "9px", color: "#666", margin: "0" }}>
                      {item.quantity} x {item.price} ₫
                    </div>
                  </div>
                  <div style={{ margin: "0" }}>{item.total} ₫</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #000", paddingTop: "2px", margin: "2px 0 0 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", margin: "0" }}>
              <span>Subtotal:</span>
              <span>{receipt.subtotal} ₫</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", margin: "0" }}>
              <span>Tax (8.25%):</span>
              <span>{receipt.tax} ₫</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold", margin: "0" }}>
              <span>Total:</span>
              <span>{receipt.total} ₫</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", margin: "1px 0 0 0" }}>
              <span>Payment Method:</span>
              <span style={{ textTransform: "capitalize" }}>{receipt.paymentMethod}</span>
            </div>
            {receipt.amountReceived && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", margin: "0" }}>
                <span>Amount Received:</span>
                <span>{receipt.amountReceived} ₫</span>
              </div>
            )}
            {receipt.change && parseFloat(receipt.change) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", margin: "0" }}>
                <span>Change:</span>
                <span>{receipt.change} ₫</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: "3px", fontSize: "9px", color: "#666" }}>
            <p style={{ margin: "0" }}>Thank you for your business!</p>
            <p style={{ margin: "0" }}>Please keep this receipt for your records</p>
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
                style={{ width: '80mm' }}
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