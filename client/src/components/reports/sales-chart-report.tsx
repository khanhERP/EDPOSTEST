import React, { useState, useEffect, useMemo, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  FileText,
  Calendar,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  BarChart3,
  Search,
  Download,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";

export function SalesChartReport() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [analysisType, setAnalysisType] = useState("time");
  const [concernType, setConcernType] = useState("time");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedSalesChannel, setSelectedSalesChannel] = useState("all");
  const [selectedSalesMethod, setSelectedSalesMethod] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [productType, setProductType] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerStatus, setCustomerStatus] = useState("all");

  // Use same data fetching logic as dashboard-overview.tsx
  const { data: orders = [], isLoading: ordersLoading, error: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/orders/date-range/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Sales Report - Orders loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Sales Report - Error fetching orders:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/transactions", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/transactions/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Sales Report - Transactions loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Sales Report - Error fetching transactions:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ["/api/invoices/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/invoices/date-range/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Sales Report - Invoices loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Sales Report - Error fetching invoices:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["/api/tables"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const handleRefresh = () => {
    refetchOrders();
    refetchTransactions();
    refetchInvoices();
    queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
  };

  // Use EXACT same data processing logic as dashboard-overview.tsx
  const getDashboardStats = () => {
    try {
      if (invoicesLoading || ordersLoading || transactionsLoading) {
        return {
          periodRevenue: 0,
          periodOrderCount: 0,
          periodCustomerCount: 0,
          dailyAverageRevenue: 0,
          filteredCompletedOrders: [],
          filteredCompletedTransactions: [],
          filteredPublishedInvoices: [],
        };
      }

      const validOrders = Array.isArray(orders) ? orders : [];
      const validTransactions = Array.isArray(transactions) ? transactions : [];
      const validInvoices = Array.isArray(invoices) ? invoices : [];

      // Filter completed/paid items only - data is already filtered by date range from API
      const completedOrders = validOrders.filter((order: any) => order.status === 'paid');
      const completedTransactions = validTransactions.filter((tx: any) => 
        tx.status === 'completed' || tx.status === 'paid' || !tx.status
      );
      const publishedInvoices = validInvoices.filter((invoice: any) => 
        invoice.invoiceStatus === 1 || invoice.status === 'published'
      );

      console.log("Sales Report Debug - Raw Data:", {
        totalOrders: validOrders.length,
        completedOrders: completedOrders.length,
        totalTransactions: validTransactions.length,
        completedTransactions: completedTransactions.length,
        totalInvoices: validInvoices.length,
        publishedInvoices: publishedInvoices.length,
        dateRange: `${startDate} to ${endDate}`,
      });

      // Calculate revenue from each source - use subtotal (before tax) as net revenue
      const orderRevenue = completedOrders.reduce((sum: number, order: any) => {
        const subtotal = Number(order.subtotal || 0);
        const total = Number(order.total || 0);
        const tax = Number(order.tax || 0);
        const discount = Number(order.discount || 0);

        const netRevenue = subtotal > 0 ? (subtotal - discount) : (total - tax - discount);
        return sum + Math.max(0, netRevenue);
      }, 0);

      const transactionRevenue = completedTransactions.reduce((sum: number, tx: any) => {
        const subtotal = Number(tx.subtotal || 0);
        const total = Number(tx.total || tx.amount || 0);
        const tax = Number(tx.tax || 0);
        const discount = Number(tx.discount || 0);

        const netRevenue = subtotal > 0 ? (subtotal - discount) : (total - tax - discount);
        return sum + Math.max(0, netRevenue);
      }, 0);

      const invoiceRevenue = publishedInvoices.reduce((sum: number, invoice: any) => {
        const subtotal = Number(invoice.subtotal || 0);
        const total = Number(invoice.total || 0);
        const tax = Number(invoice.tax || 0);
        const discount = Number(invoice.discount || 0);

        const netRevenue = subtotal > 0 ? (subtotal - discount) : (total - tax - discount);
        return sum + Math.max(0, netRevenue);
      }, 0);

      const periodRevenue = orderRevenue + transactionRevenue + invoiceRevenue;
      const periodOrderCount = completedOrders.length + completedTransactions.length + publishedInvoices.length;

      // Count unique customers
      const uniqueCustomers = new Set();

      completedOrders.forEach((order: any) => {
        if (order.customerId) {
          uniqueCustomers.add(order.customerId);
        } else if (order.customerName && order.customerName !== 'Khách hàng lẻ') {
          uniqueCustomers.add(order.customerName);
        } else {
          uniqueCustomers.add(`order_${order.id}`);
        }
      });

      completedTransactions.forEach((tx: any) => {
        if (tx.customerId) {
          uniqueCustomers.add(tx.customerId);
        } else if (tx.customerName && tx.customerName !== 'Khách hàng lẻ') {
          uniqueCustomers.add(tx.customerName);
        } else {
          uniqueCustomers.add(`transaction_${tx.id}`);
        }
      });

      publishedInvoices.forEach((invoice: any) => {
        if (invoice.customerId) {
          uniqueCustomers.add(invoice.customerId);
        } else if (invoice.customerName && invoice.customerName !== 'Khách hàng lẻ') {
          uniqueCustomers.add(invoice.customerName);
        } else {
          uniqueCustomers.add(`invoice_${invoice.id}`);
        }
      });

      const periodCustomerCount = uniqueCustomers.size;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );
      const dailyAverageRevenue = periodRevenue / daysDiff;

      return {
        periodRevenue,
        periodOrderCount,
        periodCustomerCount,
        dailyAverageRevenue,
        filteredCompletedOrders: completedOrders,
        filteredCompletedTransactions: completedTransactions,
        filteredPublishedInvoices: publishedInvoices,
      };
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      return {
        periodRevenue: 0,
        periodOrderCount: 0,
        periodCustomerCount: 0,
        dailyAverageRevenue: 0,
        filteredCompletedOrders: [],
        filteredCompletedTransactions: [],
        filteredPublishedInvoices: [],
      };
    }
  };

  const getReportTitle = () => {
    switch (analysisType) {
      case "time":
        const concernTypes = {
          time: t("reports.timeSalesReport"),
          profit: t("reports.profitByInvoiceReport"),
          discount: t("reports.invoiceDiscountReport"),
          return: t("reports.returnByInvoiceReport"),
          employee: t("reports.employeeSalesReport"),
          salesDetail: t("reports.salesDetailReport"),
        };
        return (
          concernTypes[concernType as keyof typeof concernTypes] ||
          t("reports.salesReport")
        );
      case "product":
        return t("reports.inventoryReport");
      case "employee":
        return t("reports.employeeSalesReport");
      case "customer":
        return t("reports.customerSalesReport");
      case "channel":
        return t("reports.channelSalesReport");
      default:
        return t("reports.salesReport");
    }
  };

  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("vi-VN");
    } catch (error) {
      return dateStr;
    }
  };

  const exportToExcel = (dataToExport: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const renderSalesReport = () => {
    const dashboardStats = getDashboardStats();

    if (!dashboardStats) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const { filteredCompletedOrders, filteredCompletedTransactions, filteredPublishedInvoices } = dashboardStats;

    console.log("Sales Report Debug:", {
      filteredCompletedOrders: filteredCompletedOrders.length,
      filteredCompletedTransactions: filteredCompletedTransactions.length,
      filteredPublishedInvoices: filteredPublishedInvoices.length,
    });

    // Combine all data sources for unified reporting
    const allSalesData = [
      ...filteredCompletedOrders.map((order: any) => ({
        id: `order_${order.id}`,
        type: 'order',
        orderNumber: order.orderNumber,
        date: order.orderedAt || order.createdAt,
        customerName: order.customerName || 'Khách hàng lẻ',
        employeeName: order.employeeName || 'N/A',
        total: Number(order.total || 0),
        subtotal: Number(order.subtotal || 0),
        tax: Number(order.tax || 0),
        paymentMethod: order.paymentMethod || 'cash',
        status: order.status,
      })),
      ...filteredCompletedTransactions.map((tx: any) => ({
        id: `transaction_${tx.id}`,
        type: 'transaction',
        orderNumber: tx.transactionId,
        date: tx.createdAt,
        customerName: tx.customerName || 'Khách hàng lẻ',
        employeeName: tx.cashierName || 'N/A',
        total: Number(tx.total || 0),
        subtotal: Number(tx.subtotal || 0),
        tax: Number(tx.tax || 0),
        paymentMethod: tx.paymentMethod || 'cash',
        status: 'completed',
      })),
      ...filteredPublishedInvoices.map((invoice: any) => ({
        id: `invoice_${invoice.id}`,
        type: 'invoice',
        orderNumber: invoice.invoiceNumber || invoice.tradeNumber,
        date: invoice.invoiceDate || invoice.createdAt,
        customerName: invoice.customerName || 'Khách hàng lẻ',
        employeeName: 'N/A',
        total: Number(invoice.total || 0),
        subtotal: Number(invoice.subtotal || 0),
        tax: Number(invoice.tax || 0),
        paymentMethod: `${invoice.paymentMethod || 'cash'}`,
        status: 'published',
      })),
    ];

    // Sort by date (newest first)
    allSalesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = allSalesData.slice(startIndex, endIndex);

    const totalPages = Math.ceil(allSalesData.length / pageSize);

    return (
      <>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.totalRevenue")}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(dashboardStats.periodRevenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.totalOrders")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dashboardStats.periodOrderCount}
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.totalCustomers")}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {dashboardStats.periodCustomerCount}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Data Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Chi tiết doanh thu ({allSalesData.length} giao dịch)
                </CardTitle>
                <CardDescription>
                  {t("reports.fromDate")}: {formatDate(startDate)} - {t("reports.toDate")}: {formatDate(endDate)}
                </CardDescription>
              </div>
              <Button
                onClick={() => exportToExcel(allSalesData, `sales-report-${startDate}-${endDate}`)}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead className="text-right">Tạm tính</TableHead>
                  <TableHead className="text-right">Thuế</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant={
                          item.type === 'order' ? 'default' : 
                          item.type === 'transaction' ? 'secondary' : 'outline'
                        }>
                          {item.type === 'order' ? 'Đơn hàng' : 
                           item.type === 'transaction' ? 'Giao dịch' : 'Hóa đơn'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.orderNumber || `#${item.id}`}
                      </TableCell>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>{item.employeeName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.tax)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.paymentMethod === 'cash' ? 'Tiền mặt' : 
                           item.paymentMethod === 'card' ? 'Thẻ' : 
                           item.paymentMethod || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'paid' || item.status === 'completed' || item.status === 'published' ? 'default' : 'secondary'}>
                          {item.status === 'paid' ? 'Đã thanh toán' : 
                           item.status === 'completed' ? 'Hoàn thành' : 
                           item.status === 'published' ? 'Đã phát hành' : item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                      Không có dữ liệu bán hàng
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Hiển thị {startIndex + 1} - {Math.min(endIndex, allSalesData.length)} trong tổng số {allSalesData.length} giao dịch
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>
                  <span className="flex items-center px-3">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  const isLoading = ordersLoading || transactionsLoading || invoicesLoading;
  const hasError = !!ordersError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {getReportTitle()}
              </CardTitle>
              <CardDescription>
                Báo cáo doanh thu từ đơn hàng, giao dịch và hóa đơn
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {t("tables.refresh")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>{t("reports.analysisType")}</Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">{t("reports.timeAnalysis")}</SelectItem>
                  <SelectItem value="product">{t("reports.productAnalysis")}</SelectItem>
                  <SelectItem value="employee">{t("reports.employeeAnalysis")}</SelectItem>
                  <SelectItem value="customer">{t("reports.customerAnalysis")}</SelectItem>
                  <SelectItem value="channel">{t("reports.channelAnalysis")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {analysisType === "time" && (
              <div>
                <Label>{t("reports.concernType")}</Label>
                <Select value={concernType} onValueChange={setConcernType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">{t("reports.timeConcern")}</SelectItem>
                    <SelectItem value="profit">{t("reports.profitConcern")}</SelectItem>
                    <SelectItem value="employee">{t("reports.employeeConcern")}</SelectItem>
                    <SelectItem value="salesDetail">{t("reports.salesDetailConcern")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>{t("reports.startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>{t("reports.endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      ) : hasError ? (
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="mb-4">{t("common.errorLoadingData")}</p>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("tables.refresh")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        renderSalesReport()
      )}
    </div>
  );
}