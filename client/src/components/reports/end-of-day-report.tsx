
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Printer, Monitor, Smartphone, Calendar, DollarSign, TrendingUp, Package, Users } from "lucide-react";
import type { Transaction, Employee } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";

export function EndOfDayReport() {
  const { t } = useTranslation();
  
  // Display options
  const [displayMode, setDisplayMode] = useState("horizontal"); // horizontal, vertical
  
  // Main concern filters
  const [concernType, setConcernType] = useState("sales"); // sales, revenue, inventory, summary
  
  // Date range
  const [dateType, setDateType] = useState("single"); // single, range
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Payment method filter
  const [paymentMethod, setPaymentMethod] = useState("all"); // all, cash, card, transfer, wallet
  
  // Transaction type filter
  const [transactionType, setTransactionType] = useState("all"); // all, customer_payment, customer_refund, other_expense, supplier_refund, supplier_payment
  
  // Creator and employee filters
  const [selectedCreator, setSelectedCreator] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const { data: transactions } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const getFilteredData = () => {
    if (!transactions || !Array.isArray(transactions)) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let filtered = transactions.filter((transaction: any) => {
      const transactionDate = new Date(transaction.createdAt || transaction.created_at);
      const dateMatch = dateType === "single" 
        ? transactionDate.toDateString() === start.toDateString()
        : transactionDate >= start && transactionDate <= end;
      
      const paymentMatch = paymentMethod === "all" || transaction.paymentMethod === paymentMethod;
      
      // For now, we'll use transaction type based on total amount (positive = income, negative = expense)
      const transactionTypeMatch = transactionType === "all" || 
        (transactionType === "customer_payment" && Number(transaction.total) > 0) ||
        (transactionType === "customer_refund" && Number(transaction.total) < 0) ||
        (transactionType === "other_expense" && Number(transaction.total) < 0);

      return dateMatch && paymentMatch && transactionTypeMatch;
    });

    // Group data by concern type
    const salesData = {
      totalRevenue: filtered.reduce((sum, t) => sum + Number(t.total), 0),
      totalTransactions: filtered.length,
      averageTransaction: filtered.length > 0 ? filtered.reduce((sum, t) => sum + Number(t.total), 0) / filtered.length : 0,
    };

    const revenueData = {
      income: filtered.filter(t => Number(t.total) > 0).reduce((sum, t) => sum + Number(t.total), 0),
      expenses: filtered.filter(t => Number(t.total) < 0).reduce((sum, t) => sum + Math.abs(Number(t.total)), 0),
      netProfit: 0,
    };
    revenueData.netProfit = revenueData.income - revenueData.expenses;

    const paymentBreakdown = filtered.reduce((acc, t) => {
      const method = t.paymentMethod || 'cash';
      acc[method] = (acc[method] || 0) + Number(t.total);
      return acc;
    }, {} as Record<string, number>);

    const hourlyBreakdown = filtered.reduce((acc, t) => {
      const hour = new Date(t.createdAt || t.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + Number(t.total);
      return acc;
    }, {} as Record<number, number>);

    return {
      filtered,
      salesData,
      revenueData,
      paymentBreakdown,
      hourlyBreakdown,
    };
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: t("reports.cash"),
      card: t("reports.card"),
      transfer: t("reports.transfer"),
      wallet: t("reports.wallet")
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      customer_payment: t("reports.customerPayment"),
      customer_refund: t("reports.customerRefund"),
      other_expense: t("reports.otherExpense"),
      supplier_refund: t("reports.supplierRefund"),
      supplier_payment: t("reports.supplierPayment")
    };
    return labels[type as keyof typeof labels] || t("common.all");
  };

  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const generatePrintContent = () => {
    const reportData = getFilteredData();
    if (!reportData) return '';

    const currentDate = new Date().toLocaleDateString('vi-VN');
    const currentTime = new Date().toLocaleTimeString('vi-VN');
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t("reports.endOfDayReport")}</title>
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
        .section {
          margin-bottom: 15px;
        }
        .section h2 {
          font-size: 14px;
          margin: 0 0 8px 0;
          color: #333;
          border-bottom: 1px solid #ccc;
          padding-bottom: 2px;
        }
        .stats-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .stat-item {
          text-align: center;
          flex: 1;
          padding: 8px;
          border: 1px solid #ddd;
          margin-right: 5px;
        }
        .stat-item:last-child {
          margin-right: 0;
        }
        .stat-value {
          font-size: 14px;
          font-weight: bold;
          color: #0066cc;
        }
        .stat-label {
          font-size: 10px;
          color: #666;
          margin-top: 2px;
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
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${t("reports.endOfDayReport")}</h1>
        <p>${t("reports.dataFrom")} ${formatDate(startDate)} ${dateType === "range" ? `${t("reports.to")} ${formatDate(endDate)}` : ""}</p>
        <p>Chi nhánh: Chi nhánh trung tâm</p>
      </div>

      <div class="section">
        <h2>Mã phiếu thu/chi</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${formatCurrency(reportData.salesData.totalRevenue)}</div>
            <div class="stat-label">${t("reports.totalRevenue")}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${reportData.salesData.totalTransactions}</div>
            <div class="stat-label">${t("reports.totalTransactions")}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${formatCurrency(reportData.revenueData.income)}</div>
            <div class="stat-label">${t("reports.income")}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${formatCurrency(reportData.revenueData.expenses)}</div>
            <div class="stat-label">${t("reports.expenses")}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <table>
          <thead>
            <tr style="background-color: #b8d4f0;">
              <th class="center">${t("reports.transactionId")}</th>
              <th class="center">Người nhập/nhận</th>
              <th class="center">Thu/Chi</th>
              <th class="center">${t("reports.time")}</th>
              <th class="center">Mã chứng từ</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #fffacd;">
              <td colspan="5" class="center" style="font-style: italic;">
                Báo cáo không có dữ liệu
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      ${concernType === "revenue" || concernType === "summary" ? `
      <div class="section">
        <h2>${t("reports.paymentMethodBreakdown")}</h2>
        <table>
          <thead>
            <tr>
              <th>${t("reports.method")}</th>
              <th class="right">${t("reports.amount")}</th>
              <th class="right">Tỷ lệ %</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(reportData.paymentBreakdown).map(([method, amount]) => `
              <tr>
                <td>${getPaymentMethodLabel(method)}</td>
                <td class="right">${formatCurrency(amount)}</td>
                <td class="right">${reportData.salesData.totalRevenue > 0 ? ((amount / reportData.salesData.totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="footer">
        <p>${t("reports.reportGenerated")}: ${currentDate} ${currentTime}</p>
      </div>
    </body>
    </html>
    `;
  };

  const reportData = getFilteredData();

  if (!reportData) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  const renderSalesReport = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">{t("reports.totalRevenue")}</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(reportData.salesData.totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">{t("reports.totalTransactions")}</p>
                <p className="text-xl font-bold">{reportData.salesData.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">{t("reports.averageOrderValue")}</p>
                <p className="text-xl font-bold">
                  {formatCurrency(reportData.salesData.averageTransaction)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("reports.paymentMethodBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(reportData.paymentBreakdown).map(([method, amount]) => (
              <div key={method} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getPaymentMethodLabel(method)}</Badge>
                </div>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRevenueReport = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">{t("reports.income")}</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(reportData.revenueData.income)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">{t("reports.expenses")}</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(reportData.revenueData.expenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">{t("reports.netProfit")}</p>
                <p className={`text-xl font-bold ${reportData.revenueData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.revenueData.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTransactionTable = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t("reports.transactionDetails")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reports.transactionId")}</TableHead>
              <TableHead>{t("reports.time")}</TableHead>
              <TableHead>{t("reports.method")}</TableHead>
              <TableHead>{t("reports.amount")}</TableHead>
              <TableHead>{t("reports.notes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.filtered.slice(0, 10).map((transaction: any) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.transactionId || `TXN-${transaction.id}`}
                </TableCell>
                <TableCell>
                  {new Date(transaction.createdAt || transaction.created_at).toLocaleString('vi-VN')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getPaymentMethodLabel(transaction.paymentMethod || 'cash')}
                  </Badge>
                </TableCell>
                <TableCell className={Number(transaction.total) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(Number(transaction.total))}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {transaction.notes || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("reports.endOfDayReport")}
              </CardTitle>
              <CardDescription>
                {t("reports.dashboardDescription")}
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
          <CardTitle className="text-lg">{t("reports.printOptions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>{t("reports.displayMode")}</Label>
              <Select value={displayMode} onValueChange={setDisplayMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      {t("reports.horizontal")}
                    </div>
                  </SelectItem>
                  <SelectItem value="vertical">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      {t("reports.vertical")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("reports.concernType")}</Label>
              <Select value={concernType} onValueChange={setConcernType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">{t("reports.sales")}</SelectItem>
                  <SelectItem value="revenue">{t("reports.revenue")}</SelectItem>
                  <SelectItem value="inventory">{t("reports.inventory")}</SelectItem>
                  <SelectItem value="summary">{t("reports.summary")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("reports.dateType")}</Label>
              <Select value={dateType} onValueChange={setDateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{t("reports.singleDate")}</SelectItem>
                  <SelectItem value="range">{t("reports.dateRange")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("reports.paymentMethodFilter")}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="cash">{t("reports.cash")}</SelectItem>
                  <SelectItem value="card">{t("reports.card")}</SelectItem>
                  <SelectItem value="transfer">{t("reports.transfer")}</SelectItem>
                  <SelectItem value="wallet">{t("reports.wallet")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{dateType === "single" ? t("common.date") : t("reports.startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {dateType === "range" && (
              <div>
                <Label>{t("reports.endDate")}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Additional filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t("reports.transactionTypeFilter")}</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="customer_payment">{t("reports.customerPayment")}</SelectItem>
                  <SelectItem value="customer_refund">{t("reports.customerRefund")}</SelectItem>
                  <SelectItem value="other_expense">{t("reports.otherExpense")}</SelectItem>
                  <SelectItem value="supplier_refund">{t("reports.supplierRefund")}</SelectItem>
                  <SelectItem value="supplier_payment">{t("reports.supplierPayment")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("reports.creator")}</Label>
              <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reports.creator")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {employees && Array.isArray(employees) && employees.map((emp: Employee) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("reports.employee")}</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reports.employee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {employees && Array.isArray(employees) && employees.map((emp: Employee) => (
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
      <div className={displayMode === "vertical" ? "space-y-6" : ""}>
        {concernType === "sales" && renderSalesReport()}
        {concernType === "revenue" && renderRevenueReport()}
        {(concernType === "summary" || concernType === "inventory") && (
          <div className="space-y-6">
            {renderSalesReport()}
            <Separator />
            {renderRevenueReport()}
          </div>
        )}
        
        {/* Transaction Details */}
        <div className={displayMode === "horizontal" ? "mt-6" : ""}>
          {renderTransactionTable()}
        </div>
      </div>

      {/* Summary Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {t("reports.reportGenerated")}: {new Date().toLocaleString('vi-VN')}
            </span>
            <span>
              {t("reports.dataFrom")} {formatDate(startDate)} 
              {dateType === "range" && ` ${t("reports.to")} ${formatDate(endDate)}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
