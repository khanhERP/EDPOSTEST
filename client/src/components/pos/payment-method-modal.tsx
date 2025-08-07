import { useState, useEffect } from "react";
import { CreditCard, Banknote, Smartphone, Wallet, QrCode } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCodeLib from "qrcode";
import { createQRPosAsync, type CreateQRPosRequest } from "@/lib/api";
import { EInvoiceModal } from "./einvoice-modal";
import { usePopupSignal } from "@/hooks/use-popup-signal";

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: string) => void;
  total: number;
  onShowEInvoice?: () => void;
  cartItems?: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    taxRate?: number;
  }>;
}

export function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectMethod,
  total,
  onShowEInvoice,
  cartItems = [],
}: PaymentMethodModalProps) {
  const { t } = useTranslation();
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showEInvoice, setShowEInvoice] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");
  const [showCashPayment, setShowCashPayment] = useState(false);
  const [currentTransactionUuid, setCurrentTransactionUuid] = useState<string | null>(null);
  
  const { listenForPaymentSuccess, removePaymentListener } = usePopupSignal();

  // Load payment methods from settings
  const getPaymentMethods = () => {
    const savedPaymentMethods = localStorage.getItem("paymentMethods");

    const defaultPaymentMethods = [
      {
        id: 1,
        name: t("common.cash"),
        nameKey: "cash",
        type: "cash",
        enabled: true,
        icon: "💵",
      },
      {
        id: 2,
        name: t("common.creditCard"),
        nameKey: "creditCard",
        type: "card",
        enabled: false,
        icon: "💳",
      },
      {
        id: 3,
        name: t("common.debitCard"),
        nameKey: "debitCard",
        type: "debit",
        enabled: false,
        icon: "💳",
      },
      {
        id: 4,
        name: t("common.momo"),
        nameKey: "momo",
        type: "digital",
        enabled: false,
        icon: "📱",
      },
      {
        id: 5,
        name: t("common.zalopay"),
        nameKey: "zalopay",
        type: "digital",
        enabled: false,
        icon: "📱",
      },
      {
        id: 6,
        name: t("common.vnpay"),
        nameKey: "vnpay",
        type: "digital",
        enabled: false,
        icon: "💳",
      },
      {
        id: 7,
        name: t("common.qrCode"),
        nameKey: "qrCode",
        type: "qr",
        enabled: true,
        icon: "📱",
      },
      {
        id: 8,
        name: t("common.shopeepay"),
        nameKey: "shopeepay",
        type: "digital",
        enabled: false,
        icon: "🛒",
      },
      {
        id: 9,
        name: t("common.grabpay"),
        nameKey: "grabpay",
        type: "digital",
        enabled: false,
        icon: "🚗",
      },
    ];

    const paymentMethods = savedPaymentMethods
      ? JSON.parse(savedPaymentMethods)
      : defaultPaymentMethods;

    console.log("All payment methods:", paymentMethods);

    // Ensure cash payment is always available
    const cashMethodExists = paymentMethods.find(
      (method) => method.nameKey === "cash" && method.enabled,
    );
    if (!cashMethodExists) {
      const cashMethod = paymentMethods.find(
        (method) => method.nameKey === "cash",
      );
      if (cashMethod) {
        cashMethod.enabled = true;
      } else {
        paymentMethods.unshift({
          id: 1,
          name: t("common.cash"),
          nameKey: "cash",
          type: "cash",
          enabled: true,
          icon: "💵",
        });
      }
    }

    // Filter to only return enabled payment methods and map to modal format
    const enabledMethods = paymentMethods
      .filter((method) => method.enabled === true)
      .map((method) => ({
        id: method.nameKey,
        name: method.name,
        icon: getIconComponent(method.type),
        description: getMethodDescription(method.nameKey),
      }));

    console.log("Enabled payment methods:", enabledMethods);
    return enabledMethods;
  };

  const getIconComponent = (type: string) => {
    switch (type) {
      case "cash":
        return Banknote;
      case "card":
      case "debit":
      case "digital":
        return CreditCard;
      case "qr":
        return QrCode;
      default:
        return Wallet;
    }
  };

  const getMethodDescription = (nameKey: string) => {
    const descriptions = {
      cash: t("common.cash"),
      creditCard: t("common.visaMastercard"),
      debitCard: t("common.atmCard"),
      momo: t("common.momoWallet"),
      zalopay: t("common.zalopayWallet"),
      vnpay: t("common.vnpayWallet"),
      qrCode: t("common.qrBanking"),
      shopeepay: t("common.shopeepayWallet"),
      grabpay: t("common.grabpayWallet"),
    };
    return (
      descriptions[nameKey as keyof typeof descriptions] ||
      t("common.paymentMethodGeneric")
    );
  };

  const paymentMethods = getPaymentMethods();

  const handleSelect = async (method: string) => {
    setSelectedPaymentMethod(method);

    if (method === "cash") {
      // Show cash payment input form
      setShowCashPayment(true);
    } else if (method === "qrCode") {
      // Call CreateQRPos API for QR payment
      try {
        setQrLoading(true);
        const transactionUuid = `TXN-${Date.now()}`;
        const depositAmt = total;

        const qrRequest: CreateQRPosRequest = {
          transactionUuid,
          depositAmt: depositAmt,
          posUniqueId: "HAN01",
          accntNo: "0900993023",
          posfranchiseeName: "DOOKI-HANOI",
          posCompanyName: "HYOJUNG",
          posBillNo: `BILL-${Date.now()}`,
        };

        const bankCode = "79616001";
        const clientID = "91a3a3668724e631e1baf4f8526524f3";

        console.log("Calling CreateQRPos API with:", {
          qrRequest,
          bankCode,
          clientID,
        });

        const qrResponse = await createQRPosAsync(
          qrRequest,
          bankCode,
          clientID,
        );

        console.log("CreateQRPos API response:", qrResponse);

        // Store transaction UUID for payment tracking
        setCurrentTransactionUuid(transactionUuid);

        // Listen for payment success notification
        listenForPaymentSuccess(transactionUuid, (success) => {
          if (success) {
            console.log('Payment confirmed via WebSocket for transaction:', transactionUuid);
            // Auto-complete the payment when notification is received
            handleQRComplete();
          }
        });

        // Generate QR code from the received QR data
        if (qrResponse.qrData) {
          // Decode base64 qrData to get the actual QR content
          let qrContent = qrResponse.qrData;
          try {
            // Try to decode if it's base64 encoded
            qrContent = atob(qrResponse.qrData);
          } catch (e) {
            // If decode fails, use the raw qrData
            console.log("Using raw qrData as it is not base64 encoded");
          }

          const qrUrl = await QRCodeLib.toDataURL(qrContent, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);
        } else {
          console.error("No QR data received from API");
          // Fallback to mock QR code
          const fallbackData = `Payment via QR\nAmount: ${total.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nTime: ${new Date().toLocaleString("vi-VN")}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);
        }
      } catch (error) {
        console.error("Error calling CreateQRPos API:", error);
        // Fallback to mock QR code on error
        try {
          const fallbackData = `Payment via QR\nAmount: ${total.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nTime: ${new Date().toLocaleString("vi-VN")}`;
          const qrUrl = await QRCodeLib.toDataURL(fallbackData, {
            width: 256,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
          setShowQRCode(true);
        } catch (fallbackError) {
          console.error("Error generating fallback QR code:", fallbackError);
        }
      } finally {
        setQrLoading(false);
      }
    } else if (method === "vnpay") {
      // Generate QR code for VNPay
      try {
        setQrLoading(true);
        const qrData = `Payment via ${method}\nAmount: ${total.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫\nTime: ${new Date().toLocaleString("vi-VN")}`;
        const qrUrl = await QRCodeLib.toDataURL(qrData, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(qrUrl);
        setShowQRCode(true);
      } catch (error) {
        console.error("Error generating QR code:", error);
      } finally {
        setQrLoading(false);
      }
    } else {
      // Show E-invoice modal for other payment methods
      setShowEInvoice(true);
    }
  };

  const handleQRComplete = () => {
    setShowQRCode(false);
    setQrCodeUrl("");
    setShowEInvoice(true);
  };

  const handleBack = () => {
    setShowQRCode(false);
    setQrCodeUrl("");
    setShowCashPayment(false);
    setAmountReceived("");
  };

  const handleCashPaymentComplete = () => {
    const receivedAmount = parseFloat(amountReceived) || 0;
    const changeAmount = receivedAmount - total;

    if (receivedAmount < total) {
      return; // Don't proceed if insufficient amount
    }

    setShowCashPayment(false);
    setShowEInvoice(true);
  };

  const handleEInvoiceConfirm = (eInvoiceData: any) => {
    // Process E-invoice data here
    console.log("E-invoice data:", eInvoiceData);
    setShowEInvoice(false);
    onSelectMethod(selectedPaymentMethod);
    onClose();
    // Trigger receipt modal
    if (onShowEInvoice) {
      onShowEInvoice();
    }
  };

  const handleEInvoiceClose = () => {
    setShowEInvoice(false);
    setSelectedPaymentMethod("");
  };

  // Reset all states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowQRCode(false);
      setQrCodeUrl("");
      setShowEInvoice(false);
      setSelectedPaymentMethod("");
      setQrLoading(false);
      setShowCashPayment(false);
      setAmountReceived("");
      
      // Remove payment listener if exists
      if (currentTransactionUuid) {
        removePaymentListener(currentTransactionUuid);
        setCurrentTransactionUuid(null);
      }
    }
  }, [isOpen, currentTransactionUuid, removePaymentListener]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("common.selectPaymentMethod")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          {!showQRCode && !showCashPayment ? (
            <>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{t("common.totalAmount")}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {total.toLocaleString("vi-VN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ₫
                </p>
              </div>

              <div className="grid gap-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  const isQRMethod =
                    method.id === "qrCode" || method.id === "vnpay";
                  const isLoading = qrLoading && isQRMethod;

                  return (
                    <Button
                      key={method.id}
                      variant="outline"
                      className="flex items-center justify-start p-4 h-auto"
                      onClick={() => handleSelect(method.id)}
                      disabled={isLoading}
                    >
                      <IconComponent className="mr-3" size={24} />
                      <div className="text-left flex-1">
                        <div className="font-medium">
                          {isLoading ? t("common.generatingQr") : method.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {method.description}
                        </div>
                      </div>
                      {isLoading && (
                        <div className="ml-auto">
                          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>

              <Button variant="outline" onClick={onClose} className="w-full">
                {t("common.cancel")}
              </Button>
            </>
          ) : showQRCode ? (
            <>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <QrCode className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">
                    {t("common.scanQrPayment")}
                  </h3>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {t("common.amountToPay")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {total.toLocaleString("vi-VN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ₫
                  </p>
                </div>

                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-lg">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code for Bank Transfer"
                        className="w-64 h-64"
                      />
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  {t("common.useBankingApp")}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  {t("common.goBack")}
                </Button>
                <Button
                  onClick={handleQRComplete}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
                >
                  {t("common.complete")}
                </Button>
              </div>
            </>
          ) : showCashPayment ? (
            <>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Banknote className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">{t("common.cashPayment")}</h3>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {t("common.amountToPay")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {total.toLocaleString("vi-VN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ₫
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("common.customerAmount")}
                    </label>
                    <input
                      type="number"
                      step="1000"
                      placeholder={t("common.enterCustomerAmount")}
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-center"
                      autoFocus
                    />
                  </div>

                  {amountReceived && parseFloat(amountReceived) >= total && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-800">
                          {t("common.change")}:
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {(parseFloat(amountReceived) - total).toLocaleString(
                            "vi-VN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}{" "}
                          ₫
                        </span>
                      </div>
                    </div>
                  )}

                  {amountReceived && parseFloat(amountReceived) < total && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-red-800">
                          {t("common.insufficient")}:
                        </span>
                        <span className="text-lg font-bold text-red-600">
                          {(total - parseFloat(amountReceived)).toLocaleString(
                            "vi-VN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}{" "}
                          ₫
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  {t("common.goBack")}
                </Button>
                <Button
                  onClick={handleCashPaymentComplete}
                  disabled={
                    !amountReceived || parseFloat(amountReceived) < total
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200 disabled:bg-gray-400"
                >
                  {t("common.complete")}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>

      <EInvoiceModal
        isOpen={showEInvoice}
        onClose={handleEInvoiceClose}
        onConfirm={handleEInvoiceConfirm}
        total={total}
        cartItems={cartItems}
        source="pos"
      />
    </Dialog>
  );
}
