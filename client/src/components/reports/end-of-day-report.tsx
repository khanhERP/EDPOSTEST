
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
      cash: 'Tiền mặt',
      card: 'Thẻ',
      transfer: 'Chuyển khoản',
      wallet: 'Ví điện tử'
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      customer_payment: 'Thu tiền khách trả',
      customer_refund: 'Chi tiền trả khách',
      other_expense: 'Chi phí khác',
      supplier_refund: 'Thu tiền NCC hoàn trả',
      supplier_payment: 'Chi tiền trả NCC'
    };
    return labels[type as keyof typeof labels] || 'Tất cả';
  };

  const reportData = getFilteredData();

  if (!reportData) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Đang tải dữ liệu...</div>
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
                <p className="text-sm text-gray-600">Tổng doanh thu</p>
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
                <p className="text-sm text-gray-600">Số giao dịch</p>
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
                <p className="text-sm text-gray-600">Trung bình/giao dịch</p>
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
          <CardTitle>Phân tích theo phương thức thanh toán</CardTitle>
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
                <p className="text-sm text-gray-600">Thu nhập</p>
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
                <p className="text-sm text-gray-600">Chi phí</p>
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
                <p className="text-sm text-gray-600">Lợi nhuận ròng</p>
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
        <CardTitle>Chi tiết giao dịch</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã giao dịch</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Phương thức</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Ghi chú</TableHead>
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
                Báo cáo cuối ngày
              </CardTitle>
              <CardDescription>
                Báo cáo tổng hợp hoạt động kinh doanh trong ngày
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                In báo cáo
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tùy chọn báo cáo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Hiển thị</Label>
              <Select value={displayMode} onValueChange={setDisplayMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Ngang
                    </div>
                  </SelectItem>
                  <SelectItem value="vertical">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Dọc
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mối quan tâm</Label>
              <Select value={concernType} onValueChange={setConcernType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Bán hàng</SelectItem>
                  <SelectItem value="revenue">Thu chi</SelectItem>
                  <SelectItem value="inventory">Hàng hóa</SelectItem>
                  <SelectItem value="summary">Tổng hợp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Thời gian</Label>
              <Select value={dateType} onValueChange={setDateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Theo ngày</SelectItem>
                  <SelectItem value="range">Từ ngày - đến ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Phương thức thanh toán</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="cash">Tiền mặt</SelectItem>
                  <SelectItem value="card">Thẻ</SelectItem>
                  <SelectItem value="transfer">Chuyển khoản</SelectItem>
                  <SelectItem value="wallet">Ví điện tử</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{dateType === "single" ? "Ngày" : "Từ ngày"}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {dateType === "range" && (
              <div>
                <Label>Đến ngày</Label>
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
              <Label>Loại thu chi</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="customer_payment">Thu tiền khách trả</SelectItem>
                  <SelectItem value="customer_refund">Chi tiền trả khách</SelectItem>
                  <SelectItem value="other_expense">Chi phí khác</SelectItem>
                  <SelectItem value="supplier_refund">Thu tiền NCC hoàn trả</SelectItem>
                  <SelectItem value="supplier_payment">Chi tiền trả NCC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Người tạo</Label>
              <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người tạo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {employees && Array.isArray(employees) && employees.map((emp: Employee) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nhân viên</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
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
              Báo cáo được tạo: {new Date().toLocaleString('vi-VN')}
            </span>
            <span>
              Dữ liệu từ {formatDate(startDate)} 
              {dateType === "range" && ` đến ${formatDate(endDate)}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
