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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Calendar,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  Search,
  Download, // Import Download icon
  RefreshCw,
  Filter,
  LineChart,
  AreaChart as AreaChartIcon,
  PieChart as PieChartIcon
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart as RechartsLineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from "recharts";
import * as XLSX from "xlsx"; // Import xlsx for Excel export

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function SalesChartReport() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [analysisType, setAnalysisType] = useState("time");
  const [concernType, setConcernType] = useState("time"); // Keep concernType for potential future use or different report types
  const [chartType, setChartType] = useState("bar"); // Add missing chartType state

  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [salesMethod, setSalesMethod] = useState("all"); // Keep for channel report if needed
  const [salesChannel, setSalesChannel] = useState("all"); // Keep for channel report if needed

  // Additional filters from legacy reports
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [productType, setProductType] = useState("all");
  const [customerStatus, setCustomerStatus] = useState("all");

  // Pagination state for product report
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(15);

  // Customer Report with Pagination State
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(15);

  // Employee Report with Pagination State
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(15);

  // Use dashboard data API - EXACT same data source as dashboard (consolidated fetching)
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useQuery({
    queryKey: ["/api/dashboard-data", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/dashboard-data/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        throw error; // Re-throw to let the query client handle it
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Use data from dashboard API response
  const transactions = dashboardData?.transactions || [];
  const orders = dashboardData?.orders || [];
  const invoices = dashboardData?.invoices || [];
  const tables = dashboardData?.tables || [];

  // Combined loading state
  const isLoading = dashboardLoading;
  const hasError = !!dashboardError;

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch products, dependent on category, type, and search
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products", selectedCategory, productType, productSearch],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/products/${selectedCategory}/${productType}/${productSearch || ""}`,
        );
        if (!response.ok) throw new Error("Failed to fetch products");
        return response.json();
      } catch (error) {
        console.error("Error fetching products:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });


  const { data: customers } = useQuery({
    queryKey: ["/api/customers", customerSearch, customerStatus],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/customers/${customerSearch || ""}/${customerStatus || "all"}`,
        );
        if (!response.ok) throw new Error("Failed to fetch customers");
        return response.json();
      } catch (error) {
        console.error("Error fetching customers:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });


  // Utility functions
  const formatCurrency = (amount: number) => {
    return `${(amount || 0).toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      console.error("Invalid date string:", dateStr, e);
      return dateStr; // Return original string if parsing fails
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: t("common.cash"),
      card: t("common.creditCard"),
      creditCard: t("common.creditCard"),
      credit_card: t("common.creditCard"),
      debitCard: t("common.debitCard"),
      debit_card: t("common.debitCard"),
      transfer: t("common.transfer"),
      einvoice: t("reports.einvoice"),
      momo: t("common.momo"),
      zalopay: t("common.zalopay"),
      vnpay: t("common.vnpay"),
      qrCode: t("common.qrCode"),
      shopeepay: t("common.shopeepay"),
      grabpay: t("common.grabpay"),
      mobile: "Mobile",
    };
    return labels[method as keyof typeof labels] || method;
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

  // State for expandable rows
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>(
    {},
  );

  // Pagination state for sales report
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Get dashboard stats from API response
  const getDashboardStats = () => {
    if (!dashboardData) {
      return null;
    }

    // Use dashboardData directly for stats, ensuring fallback to 0 or defaults
    return {
      periodRevenue: dashboardData.periodRevenue || 0,
      periodOrderCount: dashboardData.periodOrderCount || 0,
      periodCustomerCount: dashboardData.periodCustomerCount || 0,
      dailyAverageRevenue: dashboardData.dailyAverageRevenue || 0,
      activeOrders: dashboardData.activeOrders || 0,
      occupiedTables: dashboardData.occupiedTables || 0,
      monthRevenue: dashboardData.monthRevenue || 0,
      averageOrderValue: dashboardData.averageOrderValue || 0,
      peakHour: dashboardData.peakHour || 12,
      totalTables: dashboardData.totalTables || 0,
      filteredCompletedOrders: dashboardData.filteredCompletedOrders || [],
    };
  };

  // Function to export data to Excel
  const exportToExcel = (dataToExport: any[], fileName: string) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Có lỗi xảy ra khi xuất file Excel.");
    }
  };

  // Sales Report Component Logic using dashboard stats
  const renderSalesReport = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const dashboardStats = getDashboardStats();

    if (!dashboardStats) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Không có dữ liệu</div>
        </div>
      );
    }

    const { filteredCompletedOrders } = dashboardStats;

    // Convert orders to transaction-like format for compatibility
    const filteredTransactions = filteredCompletedOrders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber, // Ensure orderNumber is included if available
      transactionId: `TXN-${order.id}`,
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      paymentMethod: order.paymentMethod || "cash",
      createdAt:
        order.orderedAt || order.createdAt || order.created_at || order.paidAt,
      created_at:
        order.orderedAt || order.createdAt || order.created_at || order.paidAt,
      customerName: order.customerName,
      customerId: order.customerId,
      cashierName: order.employeeName || order.cashierName,
      employeeId: order.employeeId,
      items: order.items || [],
      status: order.status,
    }));

    // Calculate daily sales from filtered completed orders
    const dailySales: {
      [date: string]: { orders: number; revenue: number; customers: number };
    } = {};

    filteredCompletedOrders.forEach((order: any) => {
      try {
        // Use correct date field from order
        const orderDate = new Date(
          order.orderedAt ||
          order.createdAt ||
          order.created_at ||
          order.paidAt ||
          order.date
        );

        if (isNaN(orderDate.getTime())) {
          console.warn("Invalid date for order:", order.id, {
            orderedAt: order.orderedAt,
            createdAt: order.createdAt,
            paidAt: order.paidAt,
            date: order.date
          });
          return;
        }

        const dateStr = orderDate.toISOString().split("T")[0];

        if (!dailySales[dateStr]) {
          dailySales[dateStr] = { orders: 0, revenue: 0, customers: 0 };
        }

        dailySales[dateStr].orders += 1;
        // Use total from order, not amount
        const orderTotal = Number(order.total || order.amount || 0);
        const orderDiscount = Number(order.discount || 0);
        const revenue = orderTotal - orderDiscount;

        dailySales[dateStr].revenue += revenue;
        dailySales[dateStr].customers += Number(order.customerCount || 1);

      } catch (error) {
        console.warn("Error processing order for daily sales:", error, order);
      }
    });

    const paymentMethods: {
      [method: string]: { count: number; revenue: number };
    } = {};

    filteredCompletedOrders.forEach((order: any) => {
      const method = order.paymentMethod || "cash";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, revenue: 0 };
      }
      paymentMethods[method].count += 1;

      // Use EXACT same revenue calculation as dashboard: total - discount
      const orderTotal = Number(order.total || order.amount || 0);
      const discount = Number(order.discount || 0);
      paymentMethods[method].revenue += orderTotal - discount;
    });

    // Use dashboard stats directly for consistency
    const totalRevenue = dashboardStats.periodRevenue || 0;
    const totalOrders = dashboardStats.periodOrderCount || 0;
    const totalCustomers = dashboardStats.periodCustomerCount || 0;
    const averageOrderValue = dashboardStats.averageOrderValue || 0;

    return (
      <>
        {/* Summary Stats - Using Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Tổng doanh thu
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {startDate} ~ {endDate}
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
                    Tổng đơn hàng
                  </p>
                  <p className="text-2xl font-bold">{totalOrders}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("reports.averageOrderValue")}{" "}
                    {formatCurrency(averageOrderValue)}
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
                    Tổng khách hàng
                  </p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("reports.peakHour")} {dashboardStats.peakHour}{" "}
                    <span>{t("reports.hour")}</span>
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.monthRevenue")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(dashboardStats.monthRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {startDate === endDate
                      ? formatDate(startDate)
                      : `${formatDate(startDate)} - ${formatDate(endDate)}`}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Sales */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.dailySales")}</CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>
                Báo cáo chi tiết về doanh số và phân tích theo thời gian
              </span>
              <button
                onClick={() =>
                  exportToExcel(
                    Object.entries(dailySales).map(([date, data]) => ({
                      Ngày: formatDate(date),
                      "Tổng số đơn hàng": data.orders,
                      "Doanh thu": formatCurrency(data.revenue),
                      Thuế: formatCurrency(data.revenue * 0.1),
                      "Thành tiền": formatCurrency(data.revenue),
                      "Khách hàng": data.customers,
                    })),
                    `DailySales_` + `${startDate}_to_${endDate}`,
                  )
                }
                className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <div className="overflow-x-auto xl:overflow-x-visible">
                <Table className="w-full min-w-[1400px] xl:min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="text-center border-r bg-green-50 w-12"
                        rowSpan={2}
                      ></TableHead>
                      <TableHead
                        className="text-center border-r bg-green-50 min-w-[120px]"
                        rowSpan={2}
                      >
                        {t("reports.date")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[100px]"
                        rowSpan={2}
                      >
                        {t("reports.orderNumber")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[140px]"
                        rowSpan={2}
                      >
                        {t("reports.subtotal")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[120px]"
                        rowSpan={2}
                      >
                        {t("reports.discount")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[140px]"
                        rowSpan={2}
                      >
                        {t("reports.revenue")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[120px]"
                        rowSpan={2}
                      >
                        {t("reports.tax")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[140px]"
                        rowSpan={2}
                      >
                        {t("reports.total")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r bg-blue-50 min-w-[200px]"
                        colSpan={(() => {
                          // Get all unique payment methods from transactions
                          const allPaymentMethods = new Set();
                          if (
                            filteredTransactions &&
                            Array.isArray(filteredTransactions)
                          ) {
                            filteredTransactions.forEach((transaction: any) => {
                              const method =
                                transaction.paymentMethod || "cash";
                              allPaymentMethods.add(method);
                            });
                          }
                          return allPaymentMethods.size + 1; // +1 for total column
                        })()}
                      >
                        {t("reports.totalCustomerPayment")}
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      {(() => {
                        // Get all unique payment methods from transactions
                        const allPaymentMethods = new Set();
                        if (
                          filteredTransactions &&
                          Array.isArray(filteredTransactions)
                        ) {
                          filteredTransactions.forEach((transaction: any) => {
                            const method = transaction.paymentMethod || "cash";
                            allPaymentMethods.add(method);
                          });
                        }

                        const paymentMethodsArray =
                          Array.from(allPaymentMethods).sort();

                        return (
                          <>
                            {paymentMethodsArray.map((method: any, index: number) => (
                              <TableHead
                                key={`payment-method-${index}-${method}`}
                                className="text-center border-r bg-blue-50 min-w-[130px]"
                              >
                                {getPaymentMethodLabel(method)}
                              </TableHead>
                            ))}
                            <TableHead className="text-center bg-blue-50 min-w-[150px]">
                              {t("reports.totalCustomerPayment")}
                            </TableHead>
                          </>
                        );
                      })()}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(dailySales).length > 0 ? (
                      (() => {
                        const sortedEntries = Object.entries(dailySales).sort(
                          ([a], [b]) =>
                            new Date(b).getTime() - new Date(a).getTime(),
                        );
                        const totalPages = Math.ceil(
                          sortedEntries.length / pageSize,
                        );
                        const startIndex = (currentPage - 1) * pageSize;
                        const endIndex = startIndex + pageSize;
                        const paginatedEntries = sortedEntries.slice(
                          startIndex,
                          endIndex,
                        );

                        return paginatedEntries.map(([date, data]) => {
                          const paymentAmount = data.revenue * 1.05; // Thành tiền (bao gồm thuế và phí)
                          const discount = data.revenue * 0.05; // Giảm giá (5% trung bình)
                          const actualRevenue = paymentAmount - discount; // Doanh thu = Thành tiền - Giảm giá
                          const tax = actualRevenue * 0.1; // Thuế tính trên doanh thu
                          const customerPayment = actualRevenue; // Khách thanh toán = doanh thu

                          // Get transactions for this date
                          const dateTransactions = filteredTransactions.filter(
                            (transaction: any) => {
                              const transactionDate = new Date(
                                transaction.createdAt || transaction.created_at,
                              );
                              const year = transactionDate.getFullYear();
                              const month = (transactionDate.getMonth() + 1)
                                .toString()
                                .padStart(2, "0");
                              const day = transactionDate
                                .getDate()
                                .toString()
                                .padStart(2, "0");
                              const transactionDateStr = `${year}-${month}-${day}`;
                              return transactionDateStr === date;
                            },
                          );

                          const isExpanded = expandedRows[date] || false;

                          return (
                            <>
                              <TableRow key={date} className="hover:bg-gray-50">
                                <TableCell className="text-center border-r w-12">
                                  <button
                                    onClick={() =>
                                      setExpandedRows((prev) => ({
                                        ...prev,
                                        [date]: !prev[date],
                                      }))
                                    }
                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                                  >
                                    {isExpanded ? "−" : "+"}
                                  </button>
                                </TableCell>
                                <TableCell className="font-medium text-center border-r bg-green-50 min-w-[120px] px-4">
                                  {formatDate(date)}
                                </TableCell>
                                <TableCell className="text-center border-r min-w-[100px] px-4">
                                  {data.orders.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right border-r min-w-[140px] px-4">
                                  {formatCurrency(paymentAmount)}
                                </TableCell>
                                <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                                  {formatCurrency(discount)}
                                </TableCell>
                                <TableCell className="text-right border-r text-green-600 font-medium min-w-[140px] px-4">
                                  {formatCurrency(actualRevenue)}
                                </TableCell>
                                <TableCell className="text-right border-r min-w-[120px] px-4">
                                  {formatCurrency(tax)}
                                </TableCell>
                                <TableCell className="text-right border-r font-bold text-blue-600 min-w-[140px] px-4">
                                  {formatCurrency(actualRevenue)}
                                </TableCell>
                                {(() => {
                                  // Group transactions by payment method for this date
                                  const paymentMethods: {
                                    [method: string]: number;
                                  } = {};
                                  dateTransactions.forEach(
                                    (transaction: any) => {
                                      const method =
                                        transaction.paymentMethod || "cash";
                                      paymentMethods[method] =
                                        (paymentMethods[method] || 0) +
                                        Number(transaction.total);
                                    },
                                  );

                                  // Get all unique payment methods from all transactions
                                  const allPaymentMethods = new Set();
                                  if (
                                    filteredTransactions &&
                                    Array.isArray(filteredTransactions)
                                  ) {
                                    filteredTransactions.forEach(
                                      (transaction: any) => {
                                        const method =
                                          transaction.paymentMethod || "cash";
                                        allPaymentMethods.add(method);
                                      },
                                    );
                                  }

                                  const paymentMethodsArray =
                                    Array.from(allPaymentMethods).sort();
                                  const totalCustomerPayment = Object.values(
                                    paymentMethods,
                                  ).reduce(
                                    (sum: number, amount: number) =>
                                      sum + amount,
                                    0,
                                  );

                                  return (
                                    <>
                                      {paymentMethodsArray.map(
                                        (method: any) => {
                                          const amount =
                                            paymentMethods[method] || 0;
                                          return (
                                            <TableCell
                                              key={method}
                                              className="text-right border-r font-medium min-w-[130px] px-4"
                                            >
                                              {amount > 0
                                                ? formatCurrency(amount)
                                                : "-"}
                                            </TableCell>
                                          );
                                        },
                                      )}
                                      <TableCell className="text-right font-bold text-green-600 min-w-[150px] px-4">
                                        {formatCurrency(totalCustomerPayment)}
                                      </TableCell>
                                    </>
                                  );
                                })()}
                              </TableRow>

                              {/* Expanded order details */}
                              {isExpanded &&
                                dateTransactions.length > 0 &&
                                dateTransactions.map(
                                  (transaction: any, txIndex: number) => (
                                    <TableRow
                                      key={`${date}-transaction-${transaction.id || txIndex}`}
                                      className="bg-blue-50/50 border-l-4 border-l-blue-400"
                                    >
                                      <TableCell className="text-center border-r bg-blue-50 w-12">
                                        <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                          └
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium text-center border-r bg-blue-50 text-blue-600 text-sm min-w-[120px] px-4">
                                        {new Date(
                                          transaction.createdAt ||
                                            transaction.created_at,
                                        ).toLocaleTimeString("vi-VN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                        <div className="text-xs text-gray-500 font-normal">
                                          {getPaymentMethodLabel(
                                            transaction.paymentMethod,
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                        {transaction.orderNumber ||
                                          transaction.transactionId ||
                                          `ORD-${transaction.id}` ||
                                          `TXN-${txIndex + 1}`}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-sm min-w-[140px] px-4">
                                        {formatCurrency(
                                          Number(transaction.total) * 1.05,
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-red-600 text-sm min-w-[120px] px-4">
                                        {formatCurrency(
                                          Number(transaction.total) *
                                            1.05 *
                                            0.05,
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[140px] px-4">
                                        {formatCurrency(
                                          Number(transaction.total),
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                        {formatCurrency(
                                          Number(transaction.total) * 0.1,
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[140px] px-4">
                                        {formatCurrency(
                                          Number(transaction.total),
                                        )}
                                      </TableCell>
                                      {(() => {
                                        const transactionMethod =
                                          transaction.paymentMethod || "cash";
                                        const amount = Number(
                                          transaction.total,
                                        );

                                        // Get all unique payment methods from all transactions
                                        const allPaymentMethods = new Set();
                                        if (
                                          filteredTransactions &&
                                          Array.isArray(filteredTransactions)
                                        ) {
                                          filteredTransactions.forEach(
                                            (transaction: any) => {
                                              const method =
                                                transaction.paymentMethod ||
                                                "cash";
                                              allPaymentMethods.add(method);
                                            },
                                          );
                                        }

                                        const paymentMethodsArray =
                                          Array.from(allPaymentMethods).sort();

                                        return (
                                          <>
                                            {paymentMethodsArray.map(
                                              (method: any) => (
                                                <TableCell
                                                  key={method}
                                                  className="text-right border-r text-sm min-w-[130px] px-4"
                                                >
                                                  {transactionMethod === method
                                                    ? formatCurrency(amount)
                                                    : "-"}
                                                </TableCell>
                                              ),
                                            )}
                                            <TableCell className="text-right font-bold text-green-600 text-sm min-w-[150px] px-4">
                                              {formatCurrency(amount)}
                                            </TableCell>
                                          </>
                                        );
                                      })()}
                                    </TableRow>
                                  ),
                                )}
                            </>
                          );
                        });
                      })()
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-gray-500 py-8"
                        >
                          {t("reports.noDataDescription")}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Summary Row */}
                    {Object.entries(dailySales).length > 0 && (
                      <TableRow className="bg-gray-100 font-bold border-t-2">
                        <TableCell className="text-center border-r w-12"></TableCell>
                        <TableCell className="text-center border-r bg-green-50 min-w-[120px] px-4">
                          {t("common.total")}
                        </TableCell>
                        <TableCell className="text-center border-r min-w-[100px] px-4">
                          {Object.values(dailySales)
                            .reduce((sum, data) => sum + data.orders, 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right border-r min-w-[140px] px-4">
                          {formatCurrency(
                            Object.values(dailySales).reduce(
                              (sum, data) => sum + data.revenue * 1.05,
                              0,
                            ),
                          )}
                        </TableCell>
                        <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                          {formatCurrency(
                            Object.values(dailySales).reduce(
                              (sum, data) => sum + data.revenue * 1.05 * 0.05,
                              0,
                            ),
                          )}
                        </TableCell>
                        <TableCell className="text-right border-r text-green-600 min-w-[140px] px-4">
                          {formatCurrency(
                            Object.values(dailySales).reduce(
                              (sum, data) => sum + data.revenue,
                              0,
                            ),
                          )}
                        </TableCell>
                        <TableCell className="text-right border-r min-w-[120px] px-4">
                          {formatCurrency(
                            Object.values(dailySales).reduce(
                              (sum, data) => sum + data.revenue * 0.1,
                              0,
                            ),
                          )}
                        </TableCell>
                        <TableCell className="text-right border-r text-blue-600 min-w-[140px] px-4">
                          {formatCurrency(
                            Object.values(dailySales).reduce(
                              (sum, data) => sum + data.revenue,
                              0,
                            ),
                          )}
                        </TableCell>
                        {(() => {
                          // Calculate total payment methods across all dates
                          const totalPaymentMethods: {
                            [method: string]: number;
                          } = {};
                          filteredTransactions.forEach((transaction: any) => {
                            const method = transaction.paymentMethod || "cash";
                            totalPaymentMethods[method] =
                              (totalPaymentMethods[method] || 0) +
                              Number(transaction.total);
                          });

                          // Get all unique payment methods from all transactions
                          const allPaymentMethods = new Set();
                          filteredTransactions.forEach((transaction: any) => {
                            const method = transaction.paymentMethod || "cash";
                            allPaymentMethods.add(method);
                          });

                          const paymentMethodsArray =
                            Array.from(allPaymentMethods).sort();
                          const grandTotal = Object.values(
                            totalPaymentMethods,
                          ).reduce(
                            (sum: number, amount: number) => sum + amount,
                            0,
                          );

                          return (
                            <>
                              {paymentMethodsArray.map((method: any) => {
                                const total = totalPaymentMethods[method] || 0;
                                return (
                                  <TableCell
                                    key={method}
                                    className="text-right border-r font-bold text-green-600 min-w-[130px] px-4"
                                  >
                                    {total > 0 ? formatCurrency(total) : "-"}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-right font-bold text-green-600 text-xl min-w-[150px] px-4">
                                {formatCurrency(grandTotal)}
                              </TableCell>
                            </>
                          );
                        })()}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination Controls for Daily Sales */}
            {Object.entries(dailySales).length > 0 && (
              <div className="flex items-center justify-between space-x-6 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{t("common.show")} </p>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm font-medium"> {t("common.rows")}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">
                    {t("common.page")} {currentPage} /{" "}
                    {Math.ceil(Object.entries(dailySales).length / pageSize)}
                  </p>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      «
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            prev + 1,
                            Math.ceil(
                              Object.entries(dailySales).length / pageSize,
                            ),
                          ),
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(Object.entries(dailySales).length / pageSize)
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ›
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.ceil(
                            Object.entries(dailySales).length / pageSize,
                          ),
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(Object.entries(dailySales).length / pageSize)
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  // Sales Detail Report Component
  const renderSalesDetailReport = () => {
    // Temporarily use renderSalesReport logic for sales detail report
    // This might need a dedicated implementation later
    return renderSalesReport();
  };

  // Legacy Employee Report Component Logic
  const renderEmployeeReport = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    if (!orders || !Array.isArray(orders)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Không có dữ liệu đơn hàng</div>
        </div>
      );
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Use EXACT same filtering logic as dashboard for orders
      const filteredCompletedOrders = orders.filter((order: any) => {
        // Check if order is completed/paid (EXACT same as dashboard)
        if (order.status !== "completed" && order.status !== "paid")
          return false;

        // Try multiple possible date fields (EXACT same as dashboard)
        const orderDate = new Date(
          order.orderedAt ||
          order.createdAt ||
          order.created_at ||
          order.paidAt,
        );

        // Skip if date is invalid (EXACT same as dashboard)
        if (isNaN(orderDate.getTime())) {
          console.log(
            "Invalid order date for order:",
            order.id,
            "date fields:",
            {
              orderedAt: order.orderedAt,
              createdAt: order.createdAt,
              created_at: order.created_at,
              paidAt: order.paidAt,
            },
          );
          return false;
        }

        // Fix date comparison - ensure we're comparing dates correctly
        const startOfDay = new Date(start);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);

        const dateMatch = orderDate >= startOfDay && orderDate <= endOfDay;

        const employeeMatch =
          selectedEmployee === "all" ||
          order.employeeName === selectedEmployee ||
          order.cashierName === selectedEmployee ||
          order.employeeId?.toString() === selectedEmployee ||
          (order.employeeName &&
            order.employeeName.includes(selectedEmployee)) ||
          (order.cashierName && order.cashierName.includes(selectedEmployee));

        return dateMatch && employeeMatch;
      });

      // Convert orders to transaction-like format for compatibility
      const filteredTransactions = filteredCompletedOrders.map(
        (order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          transactionId: `TXN-${order.id}`,
          total: order.total,
          subtotal: order.subtotal,
          discount: order.discount || 0,
          paymentMethod: order.paymentMethod || "cash",
          createdAt:
            order.orderedAt ||
            order.createdAt ||
            order.created_at ||
            order.paidAt,
          created_at:
            order.orderedAt ||
            order.createdAt ||
            order.created_at ||
            order.paidAt,
          customerName: order.customerName,
          customerId: order.customerId,
          cashierName: order.employeeName || order.cashierName,
          employeeId: order.employeeId,
          items: order.items || [],
          status: order.status,
        }),
      );

      // Calculate employee sales using proper data structure
      const employeeSales: {
        [employeeKey: string]: {
          employeeCode: string;
          employeeName: string;
          orderCount: number;
          revenue: number;
          tax: number;
          total: number;
          paymentMethods: { [method: string]: number };
        };
      } = {};

      filteredCompletedOrders.forEach((order: any) => {
        const employeeCode = order.employeeId ? `EMP-${order.employeeId}` : "EMP-000";
        const employeeName = order.employeeName || order.cashierName || "Unknown";
        const employeeKey = `${employeeCode}-${employeeName}`;

        if (!employeeSales[employeeKey]) {
          employeeSales[employeeKey] = {
            employeeCode,
            employeeName,
            orderCount: 0,
            revenue: 0,
            tax: 0,
            total: 0,
            paymentMethods: {},
          };
        }

        const stats = employeeSales[employeeKey];
        const orderTotal = Number(order.total || 0);
        const orderDiscount = Number(order.discount || 0);
        const revenue = orderTotal - orderDiscount;
        const tax = revenue * 0.1; // 10% tax

        stats.orderCount += 1;
        stats.revenue += revenue;
        stats.tax += tax;
        stats.total += revenue;

        const paymentMethod = order.paymentMethod || "cash";
        stats.paymentMethods[paymentMethod] =
          (stats.paymentMethods[paymentMethod] || 0) + orderTotal;
      });

      const data = Object.values(employeeSales).sort(
        (a, b) => b.total - a.total,
      );

      // Pagination logic
      const totalPages = Math.ceil(data.length / employeePageSize);
      const startIndex = (employeeCurrentPage - 1) * employeePageSize;
      const endIndex = startIndex + employeePageSize;
      const paginatedData = data.slice(startIndex, endIndex);

      // Get all unique payment methods from transactions
      const allPaymentMethods = new Set();
      if (filteredTransactions && Array.isArray(filteredTransactions)) {
        filteredTransactions.forEach((transaction: any) => {
          const method = transaction.paymentMethod || "cash";
          allPaymentMethods.add(method);
        });
      }
      const paymentMethodsArray = Array.from(allPaymentMethods).sort();

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("reports.employeeSalesReport")}
            </CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>
                {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
                {t("reports.toDate")}: {formatDate(endDate)}
              </span>
              <button
                onClick={() =>
                  exportToExcel(
                    paginatedData.map((item) => ({
                      "Mã NV": item.employeeCode,
                      "Tên NV": item.employeeName,
                      "Số đơn": item.orderCount,
                      "Doanh thu": formatCurrency(item.revenue),
                      Thuế: formatCurrency(item.tax),
                      "Tổng cộng": formatCurrency(item.total),
                      ...Object.fromEntries(
                        paymentMethodsArray.map((method) => [
                          getPaymentMethodLabel(method),
                          item.paymentMethods[method]
                            ? formatCurrency(item.paymentMethods[method])
                            : "-",
                        ]),
                      ),
                      "Tổng thanh toán": formatCurrency(item.total),
                    })),
                    `EmployeeSales_` + `${startDate}_to_${endDate}`,
                  )
                }
                className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <div className="overflow-x-auto xl:overflow-x-visible">
                <Table className="w-full min-w-[1400px] xl:min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="text-center border-r bg-green-50 w-12"
                        rowSpan={2}
                      ></TableHead>
                      <TableHead
                        className="text-center border-r bg-green-50 min-w-[120px]"
                        rowSpan={2}
                      >
                        {t("reports.employeeId")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r bg-green-50 min-w-[150px]"
                        rowSpan={2}
                      >
                        {t("reports.seller")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r min-w-[100px]"
                        rowSpan={2}
                      >
                        {t("reports.orders")}
                      </TableHead>
                      <TableHead
                        className="text-right border-r min-w-[140px]"
                        rowSpan={2}
                      >
                        {t("reports.revenue")}
                      </TableHead>
                      <TableHead
                        className="text-right border-r min-w-[120px]"
                        rowSpan={2}
                      >
                        {t("reports.tax")}
                      </TableHead>
                      <TableHead
                        className="text-right border-r min-w-[140px]"
                        rowSpan={2}
                      >
                        {t("reports.total")}
                      </TableHead>
                      <TableHead
                        className="text-center border-r bg-blue-50 min-w-[200px]"
                        colSpan={(() => {
                          // Get all unique payment methods from transactions
                          const allPaymentMethods = new Set();
                          if (
                            filteredTransactions &&
                            Array.isArray(filteredTransactions)
                          ) {
                            filteredTransactions.forEach((transaction: any) => {
                              const method =
                                transaction.paymentMethod || "cash";
                              allPaymentMethods.add(method);
                            });
                          }
                          return allPaymentMethods.size + 1; // +1 for total column
                        })()}
                      >
                        {t("reports.totalCustomerPayment")}
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      {(() => {
                        // Get all unique payment methods from transactions
                        const allPaymentMethods = new Set();
                        if (
                          filteredTransactions &&
                          Array.isArray(filteredTransactions)
                        ) {
                          filteredTransactions.forEach((transaction: any) => {
                            const method = transaction.paymentMethod || "cash";
                            allPaymentMethods.add(method);
                          });
                        }

                        const paymentMethodsArray =
                          Array.from(allPaymentMethods).sort();

                        return (
                          <>
                            {paymentMethodsArray.map((method: any, index: number) => (
                              <TableHead
                                key={`payment-method-${index}-${method}`}
                                className="text-center border-r bg-blue-50 min-w-[130px]"
                              >
                                {getPaymentMethodLabel(method)}
                              </TableHead>
                            ))}
                            <TableHead className="text-center bg-blue-50 min-w-[150px]">
                              {t("reports.totalCustomerPayment")}
                            </TableHead>
                          </>
                        );
                      })()}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((item, index) => {
                        const isExpanded =
                          expandedRows[`emp-${item.employeeCode}`] || false;
                        const employeeTransactions =
                          filteredTransactions.filter((transaction: any) => {
                            const employeeCode =
                              transaction.employeeId || "EMP-000";
                            const employeeName =
                              transaction.cashierName ||
                              transaction.employeeName ||
                              "Unknown";
                            const employeeKey = `${employeeCode}-${employeeName}`;
                            return (
                              employeeKey ===
                              `${item.employeeCode}-${item.employeeName}`
                            );
                          });

                        return (
                          <>
                            <TableRow
                              key={`${item.employeeCode}-${index}`}
                              className="hover:bg-gray-50"
                            >
                              <TableCell className="text-center border-r w-12">
                                <button
                                  onClick={() =>
                                    setExpandedRows((prev) => ({
                                      ...prev,
                                      [`emp-${item.employeeCode}`]:
                                        !prev[`emp-${item.employeeCode}`],
                                    }))
                                  }
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                                >
                                  {isExpanded ? "−" : "+"}
                                </button>
                              </TableCell>
                              <TableCell className="text-center border-r bg-green-50 font-medium min-w-[120px] px-4">
                                {item.employeeCode}
                              </TableCell>
                              <TableCell className="text-center border-r bg-green-50 font-medium min-w-[150px] px-4">
                                {item.employeeName}
                              </TableCell>
                              <TableCell className="text-center border-r min-w-[100px] px-4">
                                {item.orderCount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right border-r text-green-600 font-medium min-w-[140px] px-4">
                                {formatCurrency(item.revenue)}
                              </TableCell>
                              <TableCell className="text-right border-r min-w-[120px] px-4">
                                {formatCurrency(item.tax)}
                              </TableCell>
                              <TableCell className="text-right border-r font-bold text-blue-600 min-w-[140px] px-4">
                                {formatCurrency(item.total)}
                              </TableCell>
                              {(() => {
                                // Group transactions by payment method for this employee
                                const paymentMethods: {
                                  [method: string]: number;
                                } = {};
                                employeeTransactions.forEach(
                                  (transaction: any) => {
                                    const method =
                                      transaction.paymentMethod || "cash";
                                    paymentMethods[method] =
                                      (paymentMethods[method] || 0) +
                                      Number(transaction.total);
                                  },
                                );

                                // Get all unique payment methods from all transactions
                                const allPaymentMethods = new Set();
                                if (
                                  filteredTransactions &&
                                  Array.isArray(filteredTransactions)
                                ) {
                                  filteredTransactions.forEach(
                                    (transaction: any) => {
                                      const method =
                                        transaction.paymentMethod || "cash";
                                      allPaymentMethods.add(method);
                                    },
                                  );
                                }

                                const paymentMethodsArray =
                                  Array.from(allPaymentMethods).sort();
                                const totalCustomerPayment = Object.values(
                                  paymentMethods,
                                ).reduce(
                                  (sum: number, amount: number) => sum + amount,
                                  0,
                                );

                                return (
                                  <>
                                    {paymentMethodsArray.map((method: any) => {
                                      const amount =
                                        paymentMethods[method] || 0;
                                      return (
                                        <TableCell
                                          key={method}
                                          className="text-right border-r font-medium min-w-[130px] px-4"
                                        >
                                          {amount > 0
                                            ? formatCurrency(amount)
                                            : "-"}
                                        </TableCell>
                                      );
                                    })}
                                    <TableCell className="text-right font-bold text-green-600 min-w-[150px] px-4">
                                      {formatCurrency(totalCustomerPayment)}
                                    </TableCell>
                                  </>
                                );
                              })()}
                            </TableRow>

                            {/* Expanded order details */}
                            {isExpanded &&
                              employeeTransactions.length > 0 &&
                              employeeTransactions.map(
                                (
                                  transaction: any,
                                  transactionIndex: number,
                                ) => (
                                  <TableRow
                                    key={`${item.employeeCode}-transaction-${transaction.id || transactionIndex}`}
                                    className="bg-blue-50/50 border-l-4 border-l-blue-400"
                                  >
                                    <TableCell className="text-center border-r bg-blue-50 w-12">
                                      <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                        └
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center border-r text-blue-600 text-sm min-w-[120px] px-4">
                                      {transaction.transactionId ||
                                        `TXN-${transaction.id}`}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                      {formatDate(
                                        transaction.createdAt ||
                                          transaction.created_at,
                                      )}{" "}
                                      {new Date(
                                        transaction.createdAt ||
                                          transaction.created_at,
                                      ).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                      {transaction.orderNumber || "1"}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[140px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total),
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total) * 0.1,
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[140px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total),
                                      )}
                                    </TableCell>
                                    {(() => {
                                      const transactionMethod =
                                        transaction.paymentMethod || "cash";
                                      const amount = Number(transaction.total);

                                      // Get all unique payment methods from all transactions
                                      const allPaymentMethods = new Set();
                                      if (
                                        filteredTransactions &&
                                        Array.isArray(filteredTransactions)
                                      ) {
                                        filteredTransactions.forEach(
                                          (transaction: any) => {
                                            const method =
                                              transaction.paymentMethod ||
                                              "cash";
                                            allPaymentMethods.add(method);
                                          },
                                        );
                                      }

                                      const paymentMethodsArray =
                                        Array.from(allPaymentMethods).sort();

                                      return (
                                        <>
                                          {paymentMethodsArray.map(
                                            (method: any) => (
                                              <TableCell
                                                key={method}
                                                className="text-right border-r text-sm min-w-[130px] px-4"
                                              >
                                                {transactionMethod === method
                                                  ? formatCurrency(amount)
                                                  : "-"}
                                              </TableCell>
                                            ),
                                          )}
                                          <TableCell className="text-right font-bold text-green-600 text-sm min-w-[150px] px-4">
                                            {formatCurrency(amount)}
                                          </TableCell>
                                        </>
                                      );
                                    })()}
                                  </TableRow>
                                ),
                              )}
                          </>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={(() => {
                            // Calculate column count: 6 base columns + payment methods + total
                            const allPaymentMethods = new Set();
                            if (
                              filteredTransactions &&
                              Array.isArray(filteredTransactions)
                            ) {
                              filteredTransactions.forEach(
                                (transaction: any) => {
                                  const method =
                                    transaction.paymentMethod || "cash";
                                  allPaymentMethods.add(method);
                                },
                              );
                            }
                            return 6 + allPaymentMethods.size + 1;
                          })()}
                          className="text-center text-gray-500 py-8"
                        >
                          {t("reports.noDataDescription")}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Summary Row */}
                    {data.length > 0 && (
                      <TableRow className="bg-gray-100 font-bold border-t-2">
                        <TableCell className="text-center border-r w-12"></TableCell>
                        <TableCell className="text-center border-r bg-green-100 min-w-[120px] px-4">
                          {t("common.total")}
                        </TableCell>
                        <TableCell className="text-center border-r bg-green-100 min-w-[150px] px-4">
                          {data.length} khách hàng
                        </TableCell>
                        <TableCell className="text-center border-r min-w-[100px] px-4">
                          {data
                            .reduce((sum, item) => sum + item.orderCount, 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right border-r text-green-600 min-w-[140px] px-4">
                          {formatCurrency(
                            data.reduce((sum, item) => sum + item.revenue, 0),
                          )}
                        </TableCell>
                        <TableCell className="text-right border-r min-w-[120px] px-4">
                          {formatCurrency(
                            data.reduce((sum, item) => sum + item.tax, 0),
                          )}
                        </TableCell>
                        <TableCell className="text-right border-r font-bold text-blue-600 min-w-[140px] px-4">
                          {formatCurrency(
                            data.reduce((sum, item) => sum + item.total, 0),
                          )}
                        </TableCell>
                        {(() => {
                          // Calculate total payment methods across all employees
                          const totalPaymentMethods: {
                            [method: string]: number;
                          } = {};
                          filteredTransactions.forEach((transaction: any) => {
                            const method = transaction.paymentMethod || "cash";
                            totalPaymentMethods[method] =
                              (totalPaymentMethods[method] || 0) +
                              Number(transaction.total);
                          });

                          // Get all unique payment methods from all transactions
                          const allPaymentMethods = new Set();
                          filteredTransactions.forEach((transaction: any) => {
                            const method = transaction.paymentMethod || "cash";
                            allPaymentMethods.add(method);
                          });

                          const paymentMethodsArray =
                            Array.from(allPaymentMethods).sort();
                          const grandTotal = Object.values(
                            totalPaymentMethods,
                          ).reduce(
                            (sum: number, amount: number) => sum + amount,
                            0,
                          );

                          return (
                            <>
                              {paymentMethodsArray.map((method: any) => {
                                const total = totalPaymentMethods[method] || 0;
                                return (
                                  <TableCell
                                    key={method}
                                    className="text-right border-r font-bold text-green-600 min-w-[130px] px-4"
                                  >
                                    {total > 0 ? formatCurrency(total) : "-"}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-right font-bold text-green-600 text-xl min-w-[150px] px-4">
                                {formatCurrency(grandTotal)}
                              </TableCell>
                            </>
                          );
                        })()}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination Controls for Employee Report */}
            {data.length > 0 && (
              <div className="flex items-center justify-between space-x-6 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{t("common.show")} </p>
                  <Select
                    value={employeePageSize.toString()}
                    onValueChange={(value) => {
                      setEmployeePageSize(Number(value));
                      setEmployeeCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm font-medium"> {t("common.rows")}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">
                    {t("common.page")} {employeeCurrentPage} / {totalPages}
                  </p>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setEmployeeCurrentPage(1)}
                      disabled={employeeCurrentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      «
                    </button>
                    <button
                      onClick={() =>
                        setEmployeeCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={employeeCurrentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setEmployeeCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages),
                        )
                      }
                      disabled={employeeCurrentPage === totalPages}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setEmployeeCurrentPage(totalPages)}
                      disabled={employeeCurrentPage === totalPages}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    } catch (error) {
      console.error("Error in renderEmployeeReport:", error);
      return (
        <div className="flex justify-center py-8">
          <div className="text-red-500">
            <p>Có lỗi xảy ra khi hiển thị báo cáo nhân viên</p>
            <p className="text-sm">{error?.message || "Unknown error"}</p>
          </div>
        </div>
      );
    }
  };

  // Legacy Customer Report Component Logic
  const renderCustomerReport = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    if (!orders || !Array.isArray(orders)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Không có dữ liệu đơn hàng</div>
        </div>
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(
        order.orderedAt || order.created_at || order.createdAt,
      );
      const dateMatch = orderDate >= start && orderDate <= end;

      const customerMatch =
        !customerSearch ||
        (order.customerName &&
          order.customerName
            .toLowerCase()
            .includes(customerSearch.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.includes(customerSearch)) ||
        (order.customerId &&
          order.customerId.toString().includes(customerSearch));

      // Status filter logic
      let statusMatch = true;
      if (customerStatus !== "all") {
        const orderTotal = Number(order.total || 0);
        const customerId = order.customerId;

        switch (customerStatus) {
          case "active":
            // Customer has recent orders (within last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            statusMatch = orderDate >= thirtyDaysAgo;
            break;
          case "inactive":
            // Customer hasn't ordered in last 30 days
            const thirtyDaysAgoInactive = new Date();
            thirtyDaysAgoInactive.setDate(thirtyDaysAgoInactive.getDate() - 30);
            statusMatch = orderDate < thirtyDaysAgoInactive;
            break;
          case "vip":
            // VIP customers with orders > 500,000 VND
            statusMatch = orderTotal >= 500000;
            break;
          case "new":
            // New customers (first order within date range)
            statusMatch = customerId && customerId !== "guest";
            break;
          default:
            statusMatch = true;
        }
      }

      return (
        dateMatch && customerMatch && statusMatch && (order.status === "paid" || order.status === "completed")
      );
    });

    // Calculate customer sales
    const customerSales: {
      [customerId: string]: {
        customerId: string;
        customerName: string;
        customerGroup: string;
        orders: number;
        totalAmount: number;
        discount: number;
        revenue: number;
        status: string;
        customerGroup: string;
        orderDetails: any[]; // Added orderDetails
      };
    } = {};

    filteredOrders.forEach((order: any) => {
      const customerId = order.customerId || "walk-in";
      const customerName = order.customerName || "Khách lẻ";

      if (!customerSales[customerId]) {
        customerSales[customerId] = {
          customerId: customerId === "walk-in" ? "KL-001" : customerId, // Use a placeholder if no ID
          customerName: customerName,
          customerGroup: t("common.regularCustomer"), // Default group
          orders: 0,
          totalAmount: 0,
          discount: 0,
          revenue: 0,
          status: t("reports.active"), // Default status
          customerGroup: t("common.regularCustomer"), // Default group
          orderDetails: [], // Initialize orderDetails array
        };
      }

      const orderTotal = Number(order.total);
      const orderSubtotal = Number(order.subtotal || orderTotal * 1.1); // Calculate subtotal if not available
      const orderDiscount = orderSubtotal - orderTotal;

      customerSales[customerId].orders += 1;
      customerSales[customerId].totalAmount += orderSubtotal;
      customerSales[customerId].discount += orderDiscount;
      customerSales[customerId].revenue += orderTotal;

      // Determine customer group based on total spending
      if (customerSales[customerId].revenue >= 1000000) {
        customerSales[customerId].customerGroup = t("reports.vip");
      } else if (customerSales[customerId].revenue >= 500000) {
        customerSales[customerId].customerGroup = t("common.goldCustomer");
      }
    });

    // Add orderDetails to customer sales data
    Object.keys(customerSales).forEach(customerId => {
      customerSales[customerId].orderDetails = filteredOrders.filter(order =>
        (order.customerId || "walk-in") === customerId
      );
    });

    const data = Object.values(customerSales).sort(
      (a, b) => b.revenue - a.revenue,
    );

    // Pagination logic
    const totalPages = Math.ceil(data.length / customerPageSize);
    const startIndex = (customerCurrentPage - 1) * customerPageSize;
    const endIndex = startIndex + customerPageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("reports.customerSalesReport")}
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>
              {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
              {t("reports.toDate")}: {formatDate(endDate)}
            </span>
            <button
              onClick={() =>
                exportToExcel(
                  paginatedData.map((item) => ({
                    "Mã KH": item.customerId,
                    "Tên KH": item.customerName, // Corrected key to customerName
                    "Nhóm KH": item.customerGroup,
                    "Số đơn": item.orders,
                    "Tổng tiền": formatCurrency(item.totalAmount),
                    "Giảm giá": formatCurrency(item.discount),
                    "Doanh thu": formatCurrency(item.revenue),
                    "Trạng thái": item.status,
                  })),
                  `CustomerSales_` + `${startDate}_to_${endDate}`,
                )
              }
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="overflow-x-auto xl:overflow-x-visible">
              <Table className="w-full min-w-[1000px] xl:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="text-center border-r bg-green-50 w-12"
                      rowSpan={1}
                    ></TableHead>
                    <TableHead className="text-center border-r bg-green-50 min-w-[120px]">
                      {t("reports.customerId")}
                    </TableHead>
                    <TableHead className="text-center border-r bg-green-50 min-w-[150px]">
                      {t("reports.customerName")}
                    </TableHead>
                    <TableHead className="text-center border-r min-w-[100px]">
                      {t("reports.orders")}
                    </TableHead>
                    <TableHead className="text-center border-r min-w-[130px]">
                      {t("common.customerGroup")}
                    </TableHead>
                    <TableHead className="text-right border-r min-w-[140px]">
                      {t("reports.totalAmount")}
                    </TableHead>
                    <TableHead className="text-right border-r min-w-[120px]">
                      {t("reports.discount")}
                    </TableHead>
                    <TableHead className="text-right border-r min-w-[140px]">
                      {t("reports.revenue")}
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      {t("reports.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const isExpanded = expandedRows[item.customerId] || false;

                      return (
                        <>
                          <TableRow
                            key={`${item.customerId}-${index}`}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="text-center border-r w-12">
                              <button
                                onClick={() =>
                                  setExpandedRows((prev) => ({
                                    ...prev,
                                    [item.customerId]: !prev[item.customerId],
                                  }))
                                }
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                              >
                                {isExpanded ? "−" : "+"}
                              </button>
                            </TableCell>
                            <TableCell className="text-center border-r bg-green-50 font-medium min-w-[120px] px-4">
                              {item.customerId}
                            </TableCell>
                            <TableCell className="text-center border-r bg-green-50 min-w-[150px] px-4">
                              {item.customerName}
                            </TableCell>
                            <TableCell className="text-center border-r min-w-[100px] px-4">
                              {item.orders}
                            </TableCell>
                            <TableCell className="text-center border-r min-w-[130px] px-4">
                              <Badge
                                variant={
                                  item.customerGroup === t("reports.vip")
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {item.customerGroup}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right border-r min-w-[140px] px-4">
                              {formatCurrency(item.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                              {formatCurrency(item.discount)}
                            </TableCell>
                            <TableCell className="text-right border-r text-green-600 font-medium min-w-[140px] px-4">
                              {formatCurrency(item.revenue)}
                            </TableCell>
                            <TableCell className="text-center min-w-[100px] px-4">
                              <Badge
                                variant={
                                  item.status === t("reports.active")
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {/* Expanded order details */}
                          {isExpanded &&
                            item.orderDetails.length > 0 &&
                            item.orderDetails.map(
                              (order: any, orderIndex: number) => (
                                <TableRow
                                  key={`${item.customerId}-order-${order.id || orderIndex}`}
                                  className="bg-blue-50/50 border-l-4 border-l-blue-400"
                                >
                                  <TableCell className="text-center border-r bg-blue-50 w-12">
                                    <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                      └
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center border-r text-blue-600 text-sm min-w-[120px] px-4">
                                    {order.orderNumber ||
                                      order.transactionId ||
                                      `ORD-${order.id}`}
                                  </TableCell>
                                  <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                    {formatDate(
                                      order.orderedAt || order.created_at,
                                    )}{" "}
                                    {new Date(
                                      order.orderedAt || order.created_at,
                                    ).toLocaleTimeString("vi-VN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </TableCell>
                                  <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                    1
                                  </TableCell>
                                  <TableCell className="text-center border-r text-sm min-w-[130px] px-4">
                                    {getPaymentMethodLabel(order.paymentMethod)}
                                  </TableCell>
                                  <TableCell className="text-right border-r text-sm min-w-[140px] px-4">
                                    {formatCurrency(
                                      Number(
                                        order.subtotal ||
                                        Number(order.total) * 1.1,
                                      ),
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right border-r text-red-600 text-sm min-w-[120px] px-4">
                                    {formatCurrency(
                                      Number(
                                        order.subtotal ||
                                        Number(order.total) * 1.1,
                                      ) - Number(order.total),
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[140px] px-4">
                                    {formatCurrency(Number(order.total))}
                                  </TableCell>
                                  <TableCell className="text-center text-sm min-w-[100px] px-4">
                                    <Badge
                                      variant={
                                        order.status === "paid"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {order.status === "paid"
                                        ? t("common.paid")
                                        : order.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                        </>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-gray-500"
                      >
                        {t("reports.noDataDescription")}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Summary Row */}
                  {data.length > 0 && (
                    <TableRow className="bg-gray-100 font-bold border-t-2">
                      <TableCell className="text-center border-r w-12"></TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[120px] px-4">
                        {t("common.total")}
                      </TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[150px] px-4">
                        {data.length} khách hàng
                      </TableCell>
                      <TableCell className="text-center border-r min-w-[100px] px-4">
                        {data
                          .reduce((sum, item) => sum + item.orders, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center border-r min-w-[130px]"></TableCell>
                      <TableCell className="text-right border-r min-w-[140px] px-4">
                        {formatCurrency(
                          data.reduce((sum, item) => sum + item.totalAmount, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                        {formatCurrency(
                          data.reduce((sum, item) => sum + item.discount, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r text-green-600 min-w-[140px] px-4">
                        {formatCurrency(
                          data.reduce((sum, item) => sum + item.revenue, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-center min-w-[100px] px-4"></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls for Customer Report */}
          {data.length > 0 && (
            <div className="flex items-center justify-between space-x-6 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("common.show")} </p>
                <Select
                  value={customerPageSize.toString()}
                  onValueChange={(value) => {
                    setCustomerPageSize(Number(value));
                    setCustomerCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm font-medium"> {t("common.rows")}</p>
              </div>

              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {customerCurrentPage} / {totalPages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCustomerCurrentPage(1)}
                    disabled={customerCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() =>
                      setCustomerCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={customerCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() =>
                      setCustomerCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages),
                      )
                    }
                    disabled={customerCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCustomerCurrentPage(totalPages)}
                    disabled={customerCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      );
    };

  // Sales Channel Report Component Logic
  const renderSalesChannelReport = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const dashboardStats = getDashboardStats();

    if (!dashboardStats) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Không có dữ liệu</div>
        </div>
      );
    }

    const { filteredCompletedOrders } = dashboardStats;

    // Group data by sales method (Dine In vs Takeaway) - use EXACT same logic as dashboard
    const salesMethodData: {
      [method: string]: {
        completedOrders: number;
        cancelledOrders: number;
        totalOrders: number;
        completedRevenue: number;
        cancelledRevenue: number;
        totalRevenue: number;
      };
    } = {
      [t("reports.dineIn")]: {
        completedOrders: 0,
        cancelledOrders: 0,
        totalOrders: 0,
        completedRevenue: 0,
        cancelledRevenue: 0,
        totalRevenue: 0,
      },
      [t("reports.takeaway")]: {
        completedOrders: 0,
        cancelledOrders: 0,
        totalOrders: 0,
        completedRevenue: 0,
        cancelledRevenue: 0,
        totalRevenue: 0,
      },
    };

    // Process completed orders ONLY
    filteredCompletedOrders.forEach((item: any) => {
      try {
        // Use EXACT same logic as dashboard - check tableId to determine method
        const isDineIn = item.tableId && item.tableId !== null;
        const method = isDineIn ? t("reports.dineIn") : t("reports.takeaway");

        if (salesMethodData[method]) {
          salesMethodData[method].completedOrders += 1;
          salesMethodData[method].completedRevenue += Number(item.amount || 0);
        }
      } catch (error) {
        console.warn("Error processing item for sales method:", error);
      }
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("reports.channelSalesReport")}
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>
              {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
              {t("reports.toDate")}: {formatDate(endDate)}
            </span>
            <button
              onClick={() =>
                exportToExcel(
                  Object.entries(salesMethodData).map(([method, data]) => ({
                    "Phương thức bán hàng": method,
                    "Đơn đã hoàn thành": data.completedOrders,
                    "Doanh thu đã hoàn thành": formatCurrency(
                      data.completedRevenue,
                    ),
                    "Tổng đơn": data.totalOrders,
                    "Tổng doanh thu": formatCurrency(data.totalRevenue),
                  })),
                  `SalesChannel_` + `${startDate}_to_${endDate}`,
                )
              }
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="overflow-x-visible">
              <Table className="w-full min-w-[800px] xl:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="text-center font-bold bg-green-100 border"
                      rowSpan={2}
                    >
                      {t("reports.salesMethod")}
                    </TableHead>
                    <TableHead
                      className="text-center font-bold bg-green-100 border"
                      colSpan={3}
                    >
                      {t("reports.totalOrders")}
                    </TableHead>
                    <TableHead
                      className="text-center font-bold bg-green-100 border"
                      colSpan={3}
                    >
                      {t("reports.revenue")}
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center bg-green-50 border">
                      {t("reports.completed")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("reports.cancelled")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("common.total")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("reports.completed")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("reports.cancelled")}
                    </TableHead>
                    <TableHead className="text-center bg-green-50 border">
                      {t("common.total")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(salesMethodData).map(([method, data]) => (
                    <TableRow key={method} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-center border bg-blue-50">
                        {method}
                      </TableCell>
                      <TableCell className="text-center border">
                        {data.completedOrders}
                      </TableCell>
                      <TableCell className="text-center border">
                        {data.cancelledOrders}
                      </TableCell>
                      <TableCell className="text-center border font-medium">
                        {data.totalOrders}
                      </TableCell>
                      <TableCell className="text-right border">
                        {formatCurrency(data.completedRevenue)}
                      </TableCell>
                      <TableCell className="text-right border">
                        {formatCurrency(data.cancelledRevenue)}
                      </TableCell>
                      <TableCell className="text-right border font-medium">
                        {formatCurrency(data.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Summary Row */}
                  <TableRow className="bg-green-100 font-bold border-t-2">
                    <TableCell className="text-center border font-bold">
                      {t("common.total")}
                    </TableCell>
                    <TableCell className="text-center border">
                      {Object.values(salesMethodData).reduce(
                        (sum, data) => sum + data.completedOrders,
                        0,
                      )}
                    </TableCell>
                    <TableCell className="text-center border">
                      {Object.values(salesMethodData).reduce(
                        (sum, data) => sum + data.cancelledOrders,
                        0,
                      )}
                    </TableCell>
                    <TableCell className="text-center border font-medium">
                      {Object.values(salesMethodData).reduce(
                        (sum, data) => sum + data.totalOrders,
                        0,
                      )}
                    </TableCell>
                    <TableCell className="text-right border">
                      {formatCurrency(
                        Object.values(salesMethodData).reduce(
                          (sum, data) => sum + data.completedRevenue,
                          0,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right border">
                      {formatCurrency(
                        Object.values(salesMethodData).reduce(
                          (sum, data) => sum + data.cancelledRevenue,
                          0,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right border font-medium">
                      {formatCurrency(
                        Object.values(salesMethodData).reduce(
                          (sum, data) => sum + data.totalRevenue,
                          0,
                        ),
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          {/* No pagination needed for sales channel report - it's a summary table */}
        </CardContent>
      </Card>
    );
  };

  // Chart configurations for each analysis type
  const chartConfig = {
    revenue: {
      label: t("reports.revenue"),
      color: "#10b981",
    },
    netRevenue: {
      label: t("reports.netRevenue"),
      color: "#3b82f6",
    },
    returnValue: {
      label: t("reports.returnValue"),
      color: "#ef4444",
    },
    quantity: {
      label: t("reports.quantity"),
      color: "#f59e0b",
    },
    profit: {
      label: t("reports.profit"),
      color: "#8b5cf6",
    },
  };

  // Get chart data based on analysis type
  const getChartData = () => {
    switch (analysisType) {
      case "time":
        // Use dashboard stats to get filtered orders
        const dashboardStats = getDashboardStats();
        if (!dashboardStats || !dashboardStats.filteredCompletedOrders) {
          return [];
        }

        const filteredOrders = dashboardStats.filteredCompletedOrders;

        // Calculate daily sales from filtered completed orders
        const dailySales: {
          [date: string]: { revenue: number; orders: number };
        } = {};

        filteredOrders.forEach((order: any) => {
          const orderDate = new Date(
            order.orderedAt ||
            order.createdAt ||
            order.created_at ||
            order.paidAt ||
            order.date
          );

          if (isNaN(orderDate.getTime())) {
            console.warn("Invalid date in chart data generation:", order.id);
            return;
          }

          const year = orderDate.getFullYear();
          const month = (orderDate.getMonth() + 1).toString().padStart(2, "0");
          const day = orderDate.getDate().toString().padStart(2, "0");
          const date = `${year}-${month}-${day}`;

          if (!dailySales[date]) {
            dailySales[date] = { revenue: 0, orders: 0 };
          }

          // Use exact same revenue calculation as dashboard
          const orderTotal = Number(order.total || order.amount || 0);
          const orderDiscount = Number(order.discount || 0);
          const revenue = orderTotal - orderDiscount;

          dailySales[date].revenue += revenue;
          dailySales[date].orders += 1;
        });

        const chartData = Object.entries(dailySales)
          .map(([date, data]) => ({
            name: formatDate(date), // Format date for display
            date: date,
            revenue: data.revenue,
            orders: data.orders,
            value: data.revenue // Use value for pie chart
          }))
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          ) // Sort by date
          .slice(0, 10);

        return chartData;

      case "product":
        if (!products || !Array.isArray(products)) return [];

        const productStart = new Date(startDate);
        const productEnd = new Date(endDate);
        productEnd.setHours(23, 59, 59, 999);

        const productSales: {
          [productId: string]: { quantity: number; revenue: number };
        } = {};

        // Get dữ liệu từ orders có items sẵn có
        if (orders && Array.isArray(orders)) {
          // Filter orders theo ngày và status
          const filteredOrders = orders.filter((order: any) => {
            // Chỉ lấy orders đã hoàn thành/thanh toán
            if (order.status !== "completed" && order.status !== "paid")
              return false;

            const orderDate = new Date(
              order.orderedAt ||
              order.createdAt ||
              order.created_at ||
              order.paidAt,
            );
            const orderDateOnly = new Date(orderDate);
            orderDateOnly.setHours(0, 0, 0, 0);
            return orderDateOnly >= productStart && orderDateOnly <= productEnd;
          });

          // Xử lý từng order để lấy order items từ order.items nếu có
          filteredOrders.forEach((order: any) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                const productId = item.productId?.toString();
                if (!productId) return;

                // Check if this product is in our products list
                const product = products.find(
                  (p) => p.id.toString() === productId,
                );
                if (!product) return;

                if (!productSales[productId]) {
                  productSales[productId] = {
                    quantity: 0,
                    revenue: 0,
                  };
                }

                const quantity = Number(item.quantity || 0);
                const total = Number(item.total || 0);

                productSales[productId].quantity += quantity;
                productSales[productId].revenue += total;
              });
            }
          });
        }

        // Fallback: Process transaction items from transactions if available
        if (
          transactions &&
          Array.isArray(transactions) &&
          Object.keys(productSales).length === 0
        ) {
          const filteredTransactions = transactions.filter((transaction: any) => {
            const transactionDate = new Date(
              transaction.createdAt || transaction.created_at,
            );
            const transactionDateOnly = new Date(transactionDate);
            transactionDateOnly.setHours(0, 0, 0, 0);
            return (
              transactionDateOnly >= productStart &&
              transactionDateOnly <= productEnd
            );
          });

          filteredTransactions.forEach((transaction: any) => {
            if (transaction.items && Array.isArray(transaction.items)) {
              transaction.items.forEach((item: any) => {
                const productId = item.productId?.toString();
                if (!productId) return;

                // Check if this product is in our products list
                const product = products.find(
                  (p) => p.id.toString() === productId,
                );
                if (!product) return;

                if (!productSales[productId]) {
                  productSales[productId] = {
                    quantity: 0,
                    revenue: 0,
                  };
                }

                const quantity = Number(item.quantity || 0);
                const total = Number(item.total || 0);

                productSales[productId].quantity += quantity;
                productSales[productId].revenue += total;
              });
            }
          });
        }

        return products
          .map((product: any) => {
            const sales = productSales[product.id.toString()] || {
              quantity: 0,
              revenue: 0,
            };
            // Find category name
            const categoryName =
              categories && Array.isArray(categories)
                ? categories.find((cat) => cat.id === product.categoryId)?.name ||
                  ""
                : "";

            return {
              name:
                product.name.length > 15
                  ? product.name.substring(0, 15) + "..."
                  : product.name,
              revenue: sales.revenue,
              quantity: sales.quantity,
              value: sales.revenue, // for pie chart
              categoryName: categoryName,
            };
          })
          .filter((item) => item.quantity > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

      case "employee":
        try {
          if (!orders || !Array.isArray(orders)) {
            console.warn("Employee chart: No orders data available");
            return [];
          }

          const empStart = new Date(startDate);
          const empEnd = new Date(endDate);
          empEnd.setHours(23, 59, 59, 999);

          // Use EXACT same filtering logic as dashboard for orders
          const empFilteredOrders = orders.filter((order: any) => {
            // Check if order is completed/paid (EXACT same as dashboard)
            if (order.status !== "completed" && order.status !== "paid")
              return false;

            // Try multiple possible date fields (EXACT same as dashboard)
            const orderDate = new Date(
              order.orderedAt ||
              order.createdAt ||
              order.created_at ||
              order.paidAt,
            );

            // Skip if date is invalid
            if (isNaN(orderDate.getTime())) {
              return false;
            }

            // Fix date comparison - ensure we're comparing dates correctly
            const startOfDay = new Date(empStart);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(empEnd);
            endOfDay.setHours(23, 59, 59, 999);

            const dateMatch = orderDate >= startOfDay && orderDate <= endOfDay;

            const employeeMatch =
              selectedEmployee === "all" ||
              order.employeeName === selectedEmployee ||
              order.cashierName === selectedEmployee ||
              order.employeeId?.toString() === selectedEmployee ||
              (order.employeeName &&
                order.employeeName.includes(selectedEmployee)) ||
              (order.cashierName &&
                order.cashierName.includes(selectedEmployee));

            return dateMatch && employeeMatch;
          });

          const employeeData: {
            [cashier: string]: { revenue: number; orders: number };
          } = {};

          empFilteredOrders.forEach((order: any) => {
            try {
              const cashier =
                order.cashierName || order.employeeName || "Unknown";
              if (!employeeData[cashier]) {
                employeeData[cashier] = { revenue: 0, orders: 0 };
              }

              // Use EXACT same calculation as dashboard: total - discount
              const orderTotal = Number(order.total || 0);
              const orderDiscount = Number(order.discount || 0);
              const revenue = orderTotal - orderDiscount;

              if (revenue >= 0) { // Allow 0 revenue orders
                employeeData[cashier].revenue += revenue;
                employeeData[cashier].orders += 1;
              }
            } catch (error) {
              console.warn("Error processing employee order:", error);
            }
          });

          const result = Object.entries(employeeData)
            .map(([name, data]) => ({
              name:
                name && name.length > 10
                  ? name.substring(0, 10) + "..."
                  : name || "Unknown",
              revenue: Math.max(0, data.revenue || 0), // Ensure no negative values
              orders: Math.max(0, data.orders || 0), // Ensure no negative values
              value: Math.max(0, data.revenue || 0), // For pie chart
            }))
            .filter((item) => item.revenue > 0 || item.orders > 0) // Only show employees with data
            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
            .slice(0, 10);

          return result;
        } catch (error) {
          console.error("Error in employee chart data generation:", error);
          return [];
        }

      case "customer":
        if (!orders || !Array.isArray(orders)) return [];

        const custStart = new Date(startDate);
        const custEnd = new Date(endDate);
        custEnd.setHours(23, 59, 59, 999);

        const custFilteredOrders = orders.filter((order: any) => {
          const orderDate = new Date(
            order.orderedAt || order.created_at || order.createdAt,
          );
          return (
            orderDate >= custStart &&
            orderDate <= custEnd &&
            (order.status === "paid" || order.status === "completed")
          );
        });

        const customerData: {
          [customerId: string]: {
            customerId: string;
            customerName: string;
            customerGroup: string;
            orders: number;
            totalAmount: number;
            discount: number;
            revenue: number;
            status: string;
            customerGroup: string;
            orderDetails: any[];
          };
        } = {};

        custFilteredOrders.forEach((order: any) => {
          const customerId = order.customerId || "guest";
          const customerName = order.customerName || "Khách lẻ";

          if (!customerData[customerId]) {
            customerData[customerId] = {
              customerId: customerId === "guest" ? "KL-001" : customerId,
              customerName: customerName,
              customerGroup: t("common.regularCustomer"), // Default group
              orders: 0,
              totalAmount: 0,
              discount: 0,
              revenue: 0,
              status: t("reports.active"),
              customerGroup: t("common.regularCustomer"), // Default group
              orderDetails: [],
            };
          }

          const orderTotal = Number(order.total);
          const orderSubtotal = Number(order.subtotal || orderTotal * 1.1); // Calculate subtotal if not available
          const orderDiscount = orderSubtotal - orderTotal;

          customerData[customerId].orders += 1;
          customerData[customerId].totalAmount += orderSubtotal;
          customerData[customerId].discount += orderDiscount;
          customerData[customerId].revenue += orderTotal;
          customerData[customerId].orderDetails.push(order);

          // Determine customer group based on total spending
          if (customerData[customerId].revenue >= 1000000) {
            customerData[customerId].customerGroup = t("reports.vip");
          } else if (customerData[customerId].revenue >= 500000) {
            customerData[customerId].customerGroup = t("common.goldCustomer");
          }
        });

        const data = Object.values(customerData).sort(
          (a, b) => b.revenue - a.revenue,
        );

        // Pagination logic
        const totalPages = Math.ceil(data.length / customerPageSize);
        const startIndex = (customerCurrentPage - 1) * customerPageSize;
        const endIndex = startIndex + customerPageSize;
        const paginatedData = data.slice(startIndex, endIndex);

        return Object.entries(customerData)
          .map(([customerId, data]) => ({
            name:
              data.customerName.length > 10
                ? data.customerName.substring(0, 10) + "..."
                : data.customerName,
            revenue: data.revenue,
            orders: data.orders,
            value: data.revenue, // for pie chart
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);
    }

    return [];
  };

  // Product Report Logic (Moved up to be before renderChart)
  const renderProductReport = () => {
    const getFilteredProducts = () => {
      if (!products || !Array.isArray(products)) return [];

      return products.filter((product: any) => {
        const searchMatch =
          !productSearch ||
          product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (product.sku &&
            product.sku.toLowerCase().includes(productSearch.toLowerCase()));

        const categoryMatch =
          selectedCategory === "all" ||
          product.categoryId?.toString() === selectedCategory;

        const typeMatch =
          productType === "all" ||
          (productType === "combo" && product.productType === 3) ||
          (productType === "product" && product.productType === 1) ||
          (productType === "service" && product.productType === 2);

        return searchMatch && categoryMatch && typeMatch;
      });
    };

    const getSalesData = () => {
      const filteredProducts = getFilteredProducts();
      if (!filteredProducts.length) return [];

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const productSales: {
        [productId: string]: {
          quantity: number;
          totalAmount: number;
          discount: number;
          revenue: number;
        };
      } = {};

      // Process order items from orders first (main data source)
      if (orders && Array.isArray(orders)) {
        // Use EXACT same filtering logic as other reports
        const filteredOrders = orders.filter((order: any) => {
          // Check if order is completed/paid (EXACT same as dashboard)
          if (order.status !== "completed" && order.status !== "paid")
            return false;

          // Try multiple possible date fields (EXACT same as dashboard)
          const orderDate = new Date(
            order.orderedAt ||
            order.createdAt ||
            order.created_at ||
            order.paidAt,
          );

          // Skip if date is invalid
          if (isNaN(orderDate.getTime())) {
            return false;
          }

          // Fix date comparison - ensure we're comparing dates correctly
          const startOfDay = new Date(start);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);

          return orderDate >= startOfDay && orderDate <= endOfDay;
        });

        filteredOrders.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const productId = item.productId?.toString();
              if (!productId) return;

              // Check if this product is in our filtered products list
              const product = filteredProducts.find(
                (p) => p.id.toString() === productId,
              );
              if (!product) return;

              if (!productSales[productId]) {
                productSales[productId] = {
                  quantity: 0,
                  totalAmount: 0,
                  discount: 0,
                  revenue: 0,
                };
              }

              const quantity = Number(item.quantity || 0);
              const total = Number(item.total || 0);
              const unitPrice = Number(item.unitPrice || item.price || 0);
              const totalAmount = quantity * unitPrice;
              const discount = Math.max(0, totalAmount - total); // Ensure discount is not negative

              productSales[productId].quantity += quantity;
              productSales[productId].totalAmount += totalAmount;
              productSales[productId].discount += discount;
              productSales[productId].revenue += total;
            });
          }
        });
      }

      // Fallback: Process transaction items from transactions if no order data
      if (
        transactions &&
        Array.isArray(transactions) &&
        Object.keys(productSales).length === 0
      ) {
        const filteredTransactions = transactions.filter((transaction: any) => {
          const transactionDate = new Date(
            transaction.createdAt || transaction.created_at,
          );
          const transactionDateOnly = new Date(transactionDate);
          transactionDateOnly.setHours(0, 0, 0, 0);
          return transactionDateOnly >= start && transactionDateOnly <= end;
        });

        filteredTransactions.forEach((transaction: any) => {
          if (transaction.items && Array.isArray(transaction.items)) {
            transaction.items.forEach((item: any) => {
              const productId = item.productId?.toString();
              if (!productId) return;

              // Check if this product is in our filtered products list
              const product = filteredProducts.find(
                (p) => p.id.toString() === productId,
              );
              if (!product) return;

              if (!productSales[productId]) {
                productSales[productId] = {
                  quantity: 0,
                  totalAmount: 0,
                  discount: 0,
                  revenue: 0,
                };
              }

              const quantity = Number(item.quantity || 0);
              const total = Number(item.total || 0);
              const unitPrice = Number(item.price || 0);
              const totalAmount = quantity * unitPrice;
              const discount = Math.max(0, totalAmount - total);

              productSales[productId].quantity += quantity;
              productSales[productId].totalAmount += totalAmount;
              productSales[productId].discount += discount;
              productSales[productId].revenue += total;
            });
          }
        });
      }

      return filteredProducts
        .map((product: any) => {
          const sales = productSales[product.id.toString()] || {
            quantity: 0,
            totalAmount: 0,
            discount: 0,
            revenue: 0,
          };

          // Find category name
          const categoryName =
            categories && Array.isArray(categories)
              ? categories.find((cat) => cat.id === product.categoryId)?.name ||
                ""
              : "";

          return {
            productCode: product.sku || "",
            productName: product.name || "",
            unit: "", // Đơn vị tính - để trống vì không có trong database
            quantitySold: sales.quantity,
            totalAmount: sales.totalAmount,
            discount: sales.discount,
            revenue: sales.revenue,
            categoryName: categoryName,
          };
        })
        .filter((item) => item !== null);
    };

    const data = getSalesData();
    const totalPages = Math.ceil(data.length / productPageSize);
    const startIndex = (productCurrentPage - 1) * productPageSize;
    const endIndex = startIndex + productPageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.salesReportByProduct")}
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>
              {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
              {t("reports.toDate")}: {formatDate(endDate)}
            </span>
            <button
              onClick={() =>
                exportToExcel(
                  paginatedData.map((item) => ({
                    "Mã SP": item.productCode,
                    "Tên SP": item.productName,
                    "Đơn vị": item.unit,
                    "Số lượng": item.quantitySold,
                    "Tổng tiền": formatCurrency(item.totalAmount),
                    "Giảm giá": formatCurrency(item.discount),
                    "Doanh thu": formatCurrency(item.revenue),
                    "Nhóm SP": item.categoryName,
                  })),
                  `ProductSales_` + `${startDate}_to_${endDate}`,
                )
              }
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="overflow-x-auto xl:overflow-x-visible">
              <Table className="w-full min-w-[1000px] xl:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.productCode")}</TableHead>
                    <TableHead>{t("reports.productName")}</TableHead>
                    <TableHead>{t("reports.unit")}</TableHead>
                    <TableHead className="text-center">
                      {t("reports.quantitySold")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("reports.totalAmount")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("reports.discount")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("reports.revenue")}
                    </TableHead>
                    <TableHead>{t("reports.categoryName")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.productCode}
                        </TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-center">
                          {item.quantitySold}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(item.discount)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                        <TableCell>{item.categoryName}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-gray-500 italic"
                      >
                        {t("reports.noDataDescription")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls for Product Report */}
          {data.length > 0 && (
            <div className="flex items-center justify-between space-x-6 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("common.show")} </p>
                <Select
                  value={productPageSize.toString()}
                  onValueChange={(value) => {
                    setProductPageSize(Number(value));
                    setProductCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm font-medium"> {t("common.rows")}</p>
              </div>

              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {productCurrentPage} / {totalPages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setProductCurrentPage(1)}
                    disabled={productCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() =>
                      setProductCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={productCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() =>
                      setProductCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages),
                      )
                    }
                    disabled={productCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setProductCurrentPage(totalPages)}
                    disabled={productCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      );
    };

  // Render Chart component
  const renderChart = () => {
    try {
      // Function to get chart data based on analysis type
      const getChartDataForType = () => {
        let dataPoints: { name: string; value: number; orders?: number }[] = [];

        switch (analysisType) {
          case "time":
            const dashboardStats = getDashboardStats();
            if (!dashboardStats || !dashboardStats.filteredCompletedOrders) return [];

            const dailySalesTime: { [date: string]: { revenue: number; orders: number } } = {};
            dashboardStats.filteredCompletedOrders.forEach((order: any) => {
              const orderDate = new Date(order.orderedAt || order.createdAt || order.paidAt);
              if (isNaN(orderDate.getTime())) return;
              const dateStr = orderDate.toISOString().split('T')[0];
              if (!dailySalesTime[dateStr]) dailySalesTime[dateStr] = { revenue: 0, orders: 0 };
              dailySalesTime[dateStr].revenue += Number(order.total || 0);
              dailySalesTime[dateStr].orders += 1;
            });

            dataPoints = Object.entries(dailySalesTime)
              .map(([date, stats]) => ({
                name: formatDate(date),
                value: stats.revenue,
                orders: stats.orders
              }))
              .sort((a, b) => a.name.localeCompare(b.name)) // Sort by date string
              .slice(0, 10);
            break;

          case "product":
            const productData = getSalesDataForProductChart(); // Assuming this function exists and returns formatted product data
            dataPoints = productData.map(p => ({ name: p.name, value: p.revenue, orders: p.quantity }));
            break;

          case "employee":
            const employeeData = getSalesDataForEmployeeChart(); // Assuming this function exists
            dataPoints = employeeData.map(e => ({ name: e.name, value: e.revenue, orders: e.orders }));
            break;

          case "customer":
            const customerData = getSalesDataForCustomerChart(); // Assuming this function exists
            dataPoints = customerData.map(c => ({ name: c.name, value: c.revenue, orders: c.orders }));
            break;

          default:
            dataPoints = [];
        }
        return dataPoints;
      };

      const chartData = getChartDataForType();

      if (!chartData || chartData.length === 0) {
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">Không có dữ liệu biểu đồ</p>
            <p className="text-gray-400 text-sm">
              Chọn khoảng thời gian có dữ liệu bán hàng để xem biểu đồ
            </p>
          </div>
        );
      }

      const height = 400;

      const renderSpecificChart = () => {
        switch (chartType) {
          case "bar":
            return (
              <ResponsiveContainer width="100%" height={height}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#8884d8" name={analysisType === "time" ? "Doanh thu" : "Giá trị"} />
                  {analysisType === "time" && <Bar dataKey="orders" fill="#82ca9d" name="Đơn hàng" />}
                </BarChart>
              </ResponsiveContainer>
            );
          case "line":
            return (
              <ResponsiveContainer width="100%" height={height}>
                <RechartsLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} name={analysisType === "time" ? "Doanh thu" : "Giá trị"} />
                  {analysisType === "time" && <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} name="Đơn hàng" />}
                </RechartsLineChart>
              </ResponsiveContainer>
            );
          case "area":
            return (
              <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stackId="1" stroke="#8884d8" fill="#8884d8" name={analysisType === "time" ? "Doanh thu" : "Giá trị"} />
                </AreaChart>
              </ResponsiveContainer>
            );
          case "pie":
            return (
              <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                  <Pie
                    data={chartData.slice(0, 8)} // Limit to 8 items for readability
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            );
          default:
            return null;
        }
      };
      return (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                {analysisType === "time" && <TrendingUp className="w-6 h-6" />}
                {analysisType === "product" && <Package className="w-6 h-6" />}
                {analysisType === "employee" && <Users className="w-6 h-6" />}
                {analysisType === "customer" && <DollarSign className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-white/90 text-sm font-normal">
                  {t("reports.chartView")}
                </div>
                <div className="text-white font-semibold">
                  {getReportTitle()}
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              {t("reports.visualRepresentation")} - {t("reports.fromDate")}:{" "}
              {formatDate(startDate)} {t("reports.toDate")}:{" "}
              {formatDate(endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
            {renderSpecificChart()}
          </CardContent>
        </Card>
      );
    } catch (error) {
      console.error("Error in renderChart:", error);
      return (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-red-50/50 to-pink-50/30">
          <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-white/90 text-sm font-normal">
                  {t("reports.chartView")}
                </div>
                <div className="text-white font-semibold">
                  Lỗi hiển thị biểu đồ
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
            <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 flex flex-col justify-center items-center">
              <div className="text-red-500 text-center">
                <p className="text-lg font-medium mb-2">
                  Lỗi khi hiển thị biểu đồ
                </p>
                <p className="text-sm">{error?.message || "Unknown error"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  // Main render function
  const renderReportContent = () => {
    try {
      switch (analysisType) {
        case "time":
          // Handle concernType for time-based analysis
          if (concernType === "employee") {
            return renderEmployeeReport();
          } else if (concernType === "salesDetail") {
            return renderSalesDetailReport(); // This seems redundant if salesDetail is handled separately
          }
          return renderSalesReport();
        case "product":
          return renderProductReport();
        case "employee":
          return renderEmployeeReport();
        case "customer":
          return renderCustomerReport();
        case "channel":
          return renderSalesChannelReport();
        case "salesDetail": // Explicitly handle salesDetail
          return renderSalesDetailReport();
        default:
          return renderSalesReport();
      }
    } catch (error) {
      console.error("Error in renderReportContent:", error);
      return (
        <div className="flex justify-center py-8">
          <div className="text-red-500">
            <p>Có lỗi xảy ra khi hiển thị báo cáo</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      );
    }
  };

  // Helper functions for chart data (placeholder, need implementation based on actual data structure)
  const getSalesDataForProductChart = () => {
    // This function should return data structured for charts, similar to getChartDataForType's output
    // Example: [{ name: 'Product A', value: 1500, orders: 20 }, ...]
    console.warn("getSalesDataForProductChart needs implementation");
    return []; // Return empty array as placeholder
  };
  const getSalesDataForEmployeeChart = () => {
    console.warn("getSalesDataForEmployeeChart needs implementation");
    return [];
  };
  const getSalesDataForCustomerChart = () => {
    console.warn("getSalesDataForCustomerChart needs implementation");
    return [];
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-semibold text-gray-800 mb-2">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.name === 'value' ? formatCurrency(Number(entry.value)) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleRefresh = () => {
    refetchDashboard(); // Use refetch for dashboard data
    // Invalidate other queries if necessary, though dashboard data might cover most
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-blue-700 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {t('reports.salesChartTab') || 'Biểu đồ bán hàng'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {t('reports.visualRepresentation') || 'Trực quan hóa dữ liệu bán hàng'}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-sm whitespace-nowrap">
                  {t('reports.startDate') || 'Từ ngày'}:
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-sm whitespace-nowrap">
                  {t('reports.endDate') || 'Đến ngày'}:
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>

              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {t("reports.refresh") || "Làm mới"}
              </Button>
            </div>
          </div>

          {/* Analysis and Chart Type Controls */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Label className="text-sm font-medium text-gray-700">
                {t("reports.analysisType") || "Phân tích theo"}:
              </Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">
                    {t("reports.timeAnalysis") || "Thời gian"}
                  </SelectItem>
                  <SelectItem value="product">
                    {t("reports.productAnalysis") || "Sản phẩm"}
                  </SelectItem>
                  <SelectItem value="employee">
                    {t("reports.employeeAnalysis") || "Nhân viên"}
                  </SelectItem>
                  <SelectItem value="customer">
                    {t("reports.customerAnalysis") || "Khách hàng"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {/* Chart Type Icon */}
              {chartType === "bar" && <BarChart3 className="w-4 h-4 text-gray-500" />}
              {chartType === "line" && <LineChart className="w-4 h-4 text-gray-500" />}
              {chartType === "area" && <AreaChartIcon className="w-4 h-4 text-gray-500" />}
              {chartType === "pie" && <PieChartIcon className="w-4 h-4 text-gray-500" />}
              <Label className="text-sm font-medium text-gray-700">
                {t("reports.chartView") || "Loại biểu đồ"}:
              </Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Cột</SelectItem>
                  <SelectItem value="line">Đường</SelectItem>
                  <SelectItem value="area">Vùng</SelectItem>
                  <SelectItem value="pie">Tròn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading or Error State */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading") || "Đang tải..."}</div>
        </div>
      ) : hasError ? (
        <div className="flex justify-center py-8">
          <div className="text-red-500">
            Lỗi tải dữ liệu: {dashboardError?.message || "Unknown error"}
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              Thử lại
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("reports.totalRevenue") || "Tổng doanh thu"}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(dashboardData?.periodRevenue || 0)}
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
                      {t("reports.totalOrders") || "Tổng đơn hàng"}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {dashboardData?.periodOrderCount || 0}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("reports.totalItems") || "Tổng sản phẩm"}
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {dashboardData?.totalItems || 0}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {/* Dynamic Icon based on analysis type */}
                {analysisType === "time" && <TrendingUp className="w-5 h-5" />}
                {analysisType === "product" && <Package className="w-5 h-5" />}
                {analysisType === "employee" && <Users className="w-5 h-5" />}
                {analysisType === "customer" && <DollarSign className="w-5 h-5" />}
                {t("reports.chartData") || "Biểu đồ dữ liệu"} - {
                  analysisType === "time" ? "Theo thời gian" :
                  analysisType === "product" ? "Theo sản phẩm" :
                  analysisType === "employee" ? "Theo nhân viên" :
                  "Theo khách hàng"
                }
              </CardTitle>
              <CardDescription>
                {t("reports.analyzeRevenue") || "Phân tích doanh thu và hiệu suất"} ({startDate} - {endDate})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderChart()}
            </CardContent>
          </Card>

          {/* Render specific report table based on analysisType */}
          {renderReportContent()}

        </>
      )}
    </div>
  );
};

// Placeholder functions for chart data (need actual implementation based on fetched data)
const getSalesDataForProductChart = () => {
  console.warn("getSalesDataForProductChart needs implementation based on fetched products and sales data.");
  return [];
};

const getSalesDataForEmployeeChart = () => {
  console.warn("getSalesDataForEmployeeChart needs implementation.");
  return [];
};

const getSalesDataForCustomerChart = () => {
  console.warn("getSalesDataForCustomerChart needs implementation.");
  return [];
};

// Mock Table component if not globally available or imported separately
const Table = ({ children, ...props }: any) => (
  <table {...props}>{children}</table>
);
const TableHeader = ({ children, ...props }: any) => (
  <thead {...props}>{children}</thead>
);
const TableBody = ({ children, ...props }: any) => (
  <tbody {...props}>{children}</tbody>
);
const TableRow = ({ children, ...props }: any) => (
  <tr {...props}>{children}</tr>
);
const TableCell = ({ children, ...props }: any) => (
  <td {...props}>{children}</td>
);
const TableHead = ({ children, ...props }: any) => (
  <th {...props}>{children}</th>
);