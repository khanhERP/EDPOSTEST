import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    transactionId: string;
    items: Array<{
      id: number;
      productName: string;
      price: string;
      quantity: number;
      total: string;
      sku: string;
      taxRate: number;
      afterTaxPrice?: string | null; // Added for new tax calculation
    }>;
    subtotal: string;
    tax: string;
    total: string;
    paymentMethod: string;
    amountReceived: string;
    change: string;
    cashierName: string;
    createdAt: string;
    invoiceNumber?: string;
    customerName?: string;
    customerTaxCode?: string;
  };
  storeInfo?: {
    storeName: string;
    address: string;
    phone: string;
  };
}

export function PrintDialog({
  isOpen,
  onClose,
  receiptData,
  storeInfo = {
    storeName: "IDMC",
    address: "Vị trí của hàng chính\n서울시 강남구 테헤란로 123",
    phone: "02-1234-5678"
  }
}: PrintDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);

    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        alert('Popup bị chặn. Vui lòng cho phép popup để in hóa đơn.');
        return;
      }

      // Generate print content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>In Hóa Đơn</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .separator {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .item-name {
              flex: 1;
              text-align: left;
            }
            .item-qty {
              width: 40px;
              text-align: center;
            }
            .item-price {
              width: 80px;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-weight: bold;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="center bold">
            ${storeInfo.storeName}
          </div>
          <div class="center">
            ${storeInfo.address.replace(/\n/g, '<br>')}
          </div>
          <div class="center">
            Điện thoại: ${storeInfo.phone}
          </div>

          <div class="separator"></div>

          <div style="display: flex; justify-content: space-between;">
            <span>Số giao dịch:</span>
            <span>${receiptData.transactionId}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Ngày:</span>
            <span>${new Date(receiptData.createdAt).toLocaleString('vi-VN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Thu ngân:</span>
            <span>${receiptData.cashierName}</span>
          </div>

          ${receiptData.customerName ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Khách hàng:</span>
            <span>${receiptData.customerName}</span>
          </div>
          ` : ''}

          ${receiptData.customerTaxCode ? `
          <div style="display: flex; justify-content: space-between;">
            <span>MST:</span>
            <span>${receiptData.customerTaxCode}</span>
          </div>
          ` : ''}

          ${receiptData.invoiceNumber ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Số HĐ:</span>
            <span>${receiptData.invoiceNumber}</span>
          </div>
          ` : ''}

          <div class="separator"></div>

          ${receiptData.items.map(item => `
            <div class="item-row">
              <div class="item-name">${item.productName}</div>
              <div class="item-price">${parseFloat(item.total).toLocaleString('vi-VN')} đ</div>
            </div>
            <div style="font-size: 10px; color: #666;">
              SKU: ${item.sku} | ${item.quantity} x ${parseFloat(item.price).toLocaleString('vi-VN')} đ
            </div>
          `).join('')}

          <div class="separator"></div>

          <div class="total-row">
            <span>Tạm tính:</span>
            <span>${parseFloat(receiptData.subtotal).toLocaleString('vi-VN')} đ</span>
          </div>
          <div class="total-row">
            <span>Thuế (${(() => {
              // Calculate actual tax from total - subtotal
              const total = parseFloat(receiptData.total || "0");
              const subtotal = parseFloat(receiptData.subtotal || "0");
              const actualTax = total - subtotal;
              
              if (subtotal === 0 || actualTax <= 0) return "0.0";
              
              const taxRate = (actualTax / subtotal) * 100;
              return taxRate.toFixed(1);
            })()}%):</span>
            <span>${(() => {
              const total = parseFloat(receiptData.total || "0");
              const subtotal = parseFloat(receiptData.subtotal || "0");
              const actualTax = total - subtotal;
              return Math.round(actualTax).toLocaleString('vi-VN');
            })()} đ</span>
          </div>
          <div class="total-row" style="font-size: 14px; border-top: 1px solid #000; padding-top: 5px;">
            <span>Tổng cộng:</span>
            <span>${parseFloat(receiptData.total).toLocaleString('vi-VN')} đ</span>
          </div>

          <div class="separator"></div>

          <div style="display: flex; justify-content: space-between;">
            <span>Phương thức thanh toán:</span>
            <span>${receiptData.paymentMethod === 'einvoice' ? 'Hóa đơn điện tử' : receiptData.paymentMethod}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Số tiền nhận:</span>
            <span>${parseFloat(receiptData.amountReceived).toLocaleString('vi-VN')} đ</span>
          </div>

          <div class="separator"></div>

          <div class="center">
            Cảm ơn bạn đã mua hàng!
          </div>
          <div class="center">
            Vui lòng giữ hóa đơn để làm bằng chứng
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    } catch (error) {
      console.error('Print error:', error);
      alert('Có lỗi xảy ra khi in hóa đơn');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <Printer className="w-5 h-5" />
            In Hóa Đơn
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receipt Preview */}
          <div className="bg-white border-2 border-dashed border-gray-300 p-4 font-mono text-sm max-h-96 overflow-y-auto">
            <div className="text-center font-bold mb-2">
              {storeInfo.storeName}
            </div>
            <div className="text-center text-xs mb-2">
              {storeInfo.address.split('\n').map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
            <div className="text-center text-xs mb-2">
              Điện thoại: {storeInfo.phone}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            <div className="flex justify-between text-xs">
              <span>Số giao dịch:</span>
              <span>{receiptData.transactionId}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Ngày:</span>
              <span>{new Date(receiptData.createdAt).toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Thu ngân:</span>
              <span>{receiptData.cashierName}</span>
            </div>

            {receiptData.customerName && (
              <div className="flex justify-between text-xs">
                <span>Khách hàng:</span>
                <span>{receiptData.customerName}</span>
              </div>
            )}

            {receiptData.invoiceNumber && (
              <div className="flex justify-between text-xs">
                <span>Số HĐ:</span>
                <span>{receiptData.invoiceNumber}</span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            {receiptData.items.map((item, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between">
                  <span className="text-xs">{item.productName}</span>
                  <span className="text-xs font-bold">{parseFloat(item.total).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="text-xs text-gray-600">
                  SKU: {item.sku} | {item.quantity} x {parseFloat(item.price).toLocaleString('vi-VN')} đ
                </div>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            <div className="flex justify-between text-xs">
              <span>Tạm tính:</span>
              <span>{parseFloat(receiptData.subtotal).toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Thuế ({(() => {
                // Calculate actual tax from total - subtotal
                const total = parseFloat(receiptData.total || "0");
                const subtotal = parseFloat(receiptData.subtotal || "0");
                const actualTax = total - subtotal;
                
                if (subtotal === 0 || actualTax <= 0) return "0.0";
                
                const taxRate = (actualTax / subtotal) * 100;
                return taxRate.toFixed(1);
              })()}%):</span>
              <span>{(() => {
                const total = parseFloat(receiptData.total || "0");
                const subtotal = parseFloat(receiptData.subtotal || "0");
                const actualTax = total - subtotal;
                return Math.round(actualTax).toLocaleString('vi-VN');
              })()} đ</span>
            </div>
            <div className="flex justify-between font-bold border-t border-gray-400 pt-1">
              <span>Tổng cộng:</span>
              <span>{parseFloat(receiptData.total).toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            <div className="flex justify-between text-xs">
              <span>Phương thức thanh toán:</span>
              <span>{receiptData.paymentMethod === 'einvoice' ? 'Hóa đơn điện tử' : receiptData.paymentMethod}</span>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            <div className="text-center text-xs">
              <div>Cảm ơn bạn đã mua hàng!</div>
              <div>Vui lòng giữ hóa đơn để làm bằng chứng</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPrinting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Đang in...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  In Hóa Đơn
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}