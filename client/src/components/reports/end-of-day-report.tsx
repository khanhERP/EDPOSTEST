import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Users,
} from "lucide-react";
import type { Transaction, Employee, Order, Product } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";

export function EndOfDayReport() {
  const { t } = useTranslation();

  // Main concern filters
  const [concernType, setConcernType] = useState("sales"); // sales, revenue, inventory, summary

  // Date range
  const [dateType, setDateType] = useState("single"); // single, range
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Payment method filter
  const [paymentMethod, setPaymentMethod] = useState("all"); // all, cash, card, transfer, wallet

  // Transaction type filter
  const [transactionType, setTransactionType] = useState("all"); // all, customer_payment, customer_refund, other_expense, supplier_refund, supplier_payment

  // Creator and employee filters
  const [selectedCreator, setSelectedCreator] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const getFilteredData = () => {
    if (!transactions || !Array.isArray(transactions)) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let filtered = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      const dateMatch =
        dateType === "single"
          ? transactionDate.toDateString() === start.toDateString()
          : transactionDate >= start && transactionDate <= end;

      const paymentMatch =
        paymentMethod === "all" || transaction.paymentMethod === paymentMethod;

      const transactionTypeMatch =
        transactionType === "all" ||
        (transactionType === "customer_payment" &&
          Number(transaction.total) > 0) ||
        (transactionType === "customer_refund" &&
          Number(transaction.total) < 0) ||
        (transactionType === "other_expense" && Number(transaction.total) < 0);

      return dateMatch && paymentMatch && transactionTypeMatch;
    });

    // Filter orders for sales report
    let filteredOrders = [];
    if (orders && Array.isArray(orders)) {
      filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.orderedAt || order.created_at);
        const dateMatch =
          dateType === "single"
            ? orderDate.toDateString() === start.toDateString()
            : orderDate >= start && orderDate <= end;
        return dateMatch && order.status === "paid";
      });
    }

    return {
      filtered,
      filteredOrders,
    };
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getReportTitle = () => {
    const titles = {
      sales: t("reports.salesReportTitle"),
      revenue: t("reports.revenueReportTitle"),
      inventory: t("reports.inventoryReportTitle"),
      summary: t("reports.summaryReportTitle"),
    };
    return titles[concernType as keyof typeof titles] || t("reports.endOfDayReport");
  };

  const getDateDisplay = () => {
    if (concernType === "sales") {
      return `${t("reports.saleDate")}: ${formatDate(startDate)}${dateType === "range" ? ` - ${t("reports.paymentDate")}: ${formatDate(endDate)}` : ` - ${t("reports.paymentDate")}: ${formatDate(startDate)}`}`;
    } else if (concernType === "revenue") {
      return `${t("reports.fromDate")}: ${formatDate(startDate)}${dateType === "range" ? ` - ${t("reports.toDate")}: ${formatDate(endDate)}` : ` - ${t("reports.toDate")}: ${formatDate(startDate)}`}`;
    } else if (concernType === "inventory" || concernType === "summary") {
      return `${t("reports.saleDate")}: ${formatDate(startDate)}${dateType === "range" ? ` - ${formatDate(endDate)}` : ""}`;
    }
    return "";
  };

  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const generatePrintContent = () => {
    const reportData = getFilteredData();
    if (!reportData) return "";

    const currentDate = new Date().toLocaleDateString("vi-VN");
    const currentTime = new Date().toLocaleTimeString("vi-VN");

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${getReportTitle()}</title>
      <style>
        @page {
          margin: 15mm;
          size: A4;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          margin: 0;
          padding: 0;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        .header p {
          margin: 5px 0;
          font-size: 11px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: left;
          font-size: 11px;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .center {
          text-align: center;
        }
        .right {
          text-align: right;
        }
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${getReportTitle()}</h1>
        <p>${getDateDisplay()}</p>
        <p>Chi nhánh: Chi nhánh trung tâm</p>
      </div>
      ${generateTableContent(reportData)}
      <div class="footer">
        <p>Báo cáo được tạo: ${currentDate} ${currentTime}</p>
      </div>
    </body>
    </html>
    `;
  };

  const generateTableContent = (reportData: any) => {
    if (concernType === "sales") {
      return `
        <table>
          <thead>
            <tr style="background-color: #b8d4f0;">
              <th class="center">Mã giao dịch</th>
              <th class="center">Thời gian</th>
              <th class="center">Số lượng</th>
              <th class="center">Doanh thu</th>
              <th class="center">Thu khác</th>
              <th class="center">VAT</th>
              <th class="center">Thực thu</th>
            </tr>
          </thead>
          <tbody>
            ${
              reportData.filteredOrders.length > 0
                ? reportData.filteredOrders
                    .map(
                      (order: any, index: number) => `
              <tr ${index % 2 === 0 ? 'style="background-color: #f8f9fa;"' : ""}>
                <td class="center">${order.orderNumber || `ORD-${order.id}`}</td>
                <td class="center">${new Date(order.orderedAt || order.created_at).toLocaleString("vi-VN")}</td>
                <td class="center">${order.customerCount || 1}</td>
                <td class="right">${formatCurrency(Number(order.total))}</td>
                <td class="right">0 ₫</td>
                <td class="right">0 ₫</td>
                <td class="right">${formatCurrency(Number(order.total))}</td>
              </tr>
            `,
                    )
                    .join("")
                : `
              <tr style="background-color: #fffacd;">
                <td colspan="7" class="center" style="font-style: italic;">
                  ${t("reports.noReportData")}
                </td>
              </tr>
            `
            }
          </tbody>
        </table>
      `;
    } else if (concernType === "revenue") {
      return `
        <table>
          <thead>
            <tr style="background-color: #b8d4f0;">
              <th class="center">Mã phiếu thu/chi</th>
              <th class="center">Người nộp/nhận</th>
              <th class="center">Thu/Chi</th>
              <th class="center">Thời gian</th>
              <th class="center">Mã giao dịch</th>
            </tr>
          </thead>
          <tbody>
            ${
              reportData.filtered.length > 0
                ? reportData.filtered
                    .map(
                      (transaction: any, index: number) => `
              <tr ${index % 2 === 0 ? 'style="background-color: #f8f9fa;"' : ""}>
                <td class="center">${transaction.transactionId || `TXN-${transaction.id}`}</td>
                <td class="center">${transaction.createdBy || "Hệ thống"}</td>
                <td class="center">${Number(transaction.total) >= 0 ? "Thu" : "Chi"}</td>
                <td class="center">${new Date(transaction.createdAt || transaction.created_at).toLocaleString("vi-VN")}</td>
                <td class="center">${transaction.id}</td>
              </tr>
            `,
                    )
                    .join("")
                : `
              <tr style="background-color: #fffacd;">
                <td colspan="5" class="center" style="font-style: italic;">
                  ${t("reports.noReportData")}
                </td>
              </tr>
            `
            }
          </tbody>
        </table>
      `;
    } else if (concernType === "inventory") {
      return `
        <table>
          <thead>
            <tr style="background-color: #b8d4f0;">
              <th class="center">Mã hàng</th>
              <th class="center">Tên hàng</th>
              <th class="center">SL bán</th>
              <th class="center">Doanh thu</th>
              <th class="center">SL trả</th>
              <th class="center">Giá trị trả</th>
              <th class="center">Doanh thu thuần</th>
            </tr>
          </thead>
          <tbody>
            ${
              products && products.length > 0
                ? products
                    .slice(0, 10)
                    .map(
                      (product: any, index: number) => `
              <tr ${index % 2 === 0 ? 'style="background-color: #f8f9fa;"' : ""}>
                <td class="center">${product.sku || product.id}</td>
                <td>${product.name}</td>
                <td class="center">0</td>
                <td class="right">0 ₫</td>
                <td class="center">0</td>
                <td class="right">0 ₫</td>
                <td class="right">0 ₫</td>
              </tr>
            `,
                    )
                    .join("")
                : `
              <tr style="background-color: #fffacd;">
                <td colspan="7" class="center" style="font-style: italic;">
                  ${t("reports.noReportData")}
                </td>
              </tr>
            `
            }
          </tbody>
        </table>
      `;
    }
    return "";
  };

  const renderSalesTable = () => {
    const reportData = getFilteredData();
    if (!reportData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.salesDetailsHeader")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  {t("reports.transactionCode")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.time")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.quantity")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.otherRevenue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.vat")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.actualRevenue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.filteredOrders.length > 0 ? (
                reportData.filteredOrders.slice(0, 20).map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-center font-medium">
                      {order.orderNumber || `ORD-${order.id}`}
                    </TableCell>
                    <TableCell className="text-center">
                      {new Date(
                        order.orderedAt || order.created_at,
                      ).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-center">
                      {order.customerCount || 1}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(Number(order.total))}
                    </TableCell>
                    <TableCell className="text-right">0 ₫</TableCell>
                    <TableCell className="text-right">0 ₫</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(Number(order.total))}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-gray-500 italic"
                  >
                    {t("reports.noReportData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderRevenueTable = () => {
    const reportData = getFilteredData();
    if (!reportData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.revenueExpenseDetailsHeader")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  {t("reports.receiptCode")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.payerReceiver")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.revenueExpenseType")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.time")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.transactionCode")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.filtered.length > 0 ? (
                reportData.filtered.slice(0, 20).map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-center font-medium">
                      {transaction.transactionId || `TXN-${transaction.id}`}
                    </TableCell>
                    <TableCell className="text-center">
                      {transaction.createdBy || "Hệ thống"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          Number(transaction.total) >= 0
                            ? "default"
                            : "destructive"
                        }
                      >
                        {Number(transaction.total) >= 0 ? "Thu" : "Chi"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {new Date(
                        transaction.createdAt || transaction.created_at,
                      ).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-center">
                      {transaction.id}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-gray-500 italic"
                  >
                    {t("reports.noReportData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderInventoryTable = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.inventoryDetailsHeader")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  {t("reports.productCode")}
                </TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.soldQuantity")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.returnQuantity")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.netRevenue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.length > 0 ? (
                products.slice(0, 20).map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="text-center font-medium">
                      {product.sku || product.id}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-center">0</TableCell>
                    <TableCell className="text-right">0 ₫</TableCell>
                    <TableCell className="text-center">0</TableCell>
                    <TableCell className="text-right">0 ₫</TableCell>
                    <TableCell className="text-right">0 ₫</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-gray-500 italic"
                  >
                    {t("reports.noReportData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const reportData = getFilteredData();

  if (!reportData) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('reports.endOfDayReport')}
              </CardTitle>
              <CardDescription className="mt-2">
                {getDateDisplay()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                {t("reports.printReport")}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("reports.printOptions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Main concern and date type in same row */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-sm">{t("reports.mainConcern")}</Label>
              <Select value={concernType} onValueChange={setConcernType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">{t("reports.sales")}</SelectItem>
                  <SelectItem value="revenue">
                    {t("reports.revenueExpense")}
                  </SelectItem>
                  <SelectItem value="inventory">
                    {t("reports.inventory")}
                  </SelectItem>
                  <SelectItem value="summary">
                    {t("reports.summary")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">{t("reports.dateType")}</Label>
              <Select value={dateType} onValueChange={setDateType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">
                    {t("reports.singleDate")}
                  </SelectItem>
                  <SelectItem value="range">
                    {t("reports.dateRange")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">
                {dateType === "single"
                  ? t("reports.date")
                  : t("reports.startDate")}
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {dateType === "range" && (
              <div>
                <Label className="text-sm">{t("reports.endDate")}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>

          {/* Additional filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm">
                {t("reports.paymentMethodFilter")}
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="cash">
                    {t("reports.cashPayment")}
                  </SelectItem>
                  <SelectItem value="card">
                    {t("reports.cardPayment")}
                  </SelectItem>
                  <SelectItem value="transfer">
                    {t("reports.transfer")}
                  </SelectItem>
                  <SelectItem value="wallet">{t("reports.wallet")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">
                {t("reports.transactionTypeFilter")}
              </Label>
              <Select
                value={transactionType}
                onValueChange={setTransactionType}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="customer_payment">
                    {t("reports.customerPayment")}
                  </SelectItem>
                  <SelectItem value="customer_refund">
                    {t("reports.customerRefund")}
                  </SelectItem>
                  <SelectItem value="other_expense">
                    {t("reports.otherExpense")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">{t("reports.employee")}</Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t("reports.employee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {employees &&
                    Array.isArray(employees) &&
                    employees.map((emp: Employee) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div className="space-y-6">
        {concernType === "sales" && renderSalesTable()}
        {concernType === "revenue" && renderRevenueTable()}
        {concernType === "inventory" && renderInventoryTable()}
        {concernType === "summary" && (
          <div className="space-y-6">
            {renderSalesTable()}
            <Separator />
            {renderRevenueTable()}
            <Separator />
            {renderInventoryTable()}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Báo cáo được tạo: {new Date().toLocaleString("vi-VN")}</span>
            <span>{getDateDisplay()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
