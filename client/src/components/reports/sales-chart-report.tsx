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
  const [chartType, setChartType] = useState("bar");

  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [salesMethod, setSalesMethod] = useState("all");
  const [salesChannel, setSalesChannel] = useState("all");

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

  // Query orders by date range - using proper order data
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/orders/date-range/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Sales Chart - Orders loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Sales Chart - Error fetching orders:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Query order items for all orders
  const { data: orderItems = [], isLoading: orderItemsLoading } = useQuery({
    queryKey: ["/api/order-items"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/order-items");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Sales Chart - Order items loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Sales Chart - Error fetching order items:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tables } = useQuery({
    queryKey: ["/api/tables"],
  });

  // Combined loading state
  const isLoading = ordersLoading || orderItemsLoading;

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products", selectedCategory, productType, productSearch],
    queryFn: async () => {
      const response = await fetch(
        `/api/products/${selectedCategory}/${productType}/${productSearch || ""}`,
      );
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers", customerSearch, customerStatus],
    queryFn: async () => {
      const response = await fetch(
        `/api/customers/${customerSearch || ""}/${customerStatus || "all"}`,
      );
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    staleTime: 5 * 60 * 1000,
  });

  // Utility functions
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

  // Get dashboard stats from orders data
  const getDashboardStats = () => {
    try {
      if (ordersLoading || orderItemsLoading) {
        return {
          periodRevenue: 0,
          periodOrderCount: 0,
          periodCustomerCount: 0,
          dailyAverageRevenue: 0,
          activeOrders: 0,
          occupiedTables: 0,
          monthRevenue: 0,
          averageOrderValue: 0,
          peakHour: 12,
          totalTables: Array.isArray(tables) ? tables.length : 0,
          filteredCompletedOrders: [],
        };
      }

      // Ensure we have valid arrays
      const validOrders = Array.isArray(orders) ? orders : [];
      const validOrderItems = Array.isArray(orderItems) ? orderItems : [];
      const validTables = Array.isArray(tables) ? tables : [];

      // Filter completed/paid orders only
      const completedOrders = validOrders.filter((order: any) => 
        order.status === 'paid' || order.status === 'completed'
      );

      console.log("Sales Chart Debug - Raw Data:", {
        totalOrders: validOrders.length,
        completedOrders: completedOrders.length,
        totalOrderItems: validOrderItems.length,
        dateRange: `${startDate} to ${endDate}`,
        sampleCompletedOrder: completedOrders[0] ? {
          id: completedOrders[0].id,
          total: completedOrders[0].total,
          status: completedOrders[0].status,
          date: completedOrders[0].orderedAt || completedOrders[0].createdAt
        } : null
      });

      // Calculate revenue from completed orders using actual order totals
      const periodRevenue = completedOrders.reduce((sum: number, order: any) => {
        const total = Number(order.total || 0);
        return sum + total;
      }, 0);

      // Total count from completed orders only
      const periodOrderCount = completedOrders.length;

      // Count unique customers from completed orders
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

      const periodCustomerCount = uniqueCustomers.size;

      // Calculate days difference for average
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );
      const dailyAverageRevenue = periodRevenue / daysDiff;

      // Active orders (pending/in-progress orders only from all current orders)
      const activeOrders = validOrders.filter((order: any) => 
        order.status === 'pending' || order.status === 'in_progress' || order.status === 'confirmed' || 
        order.status === 'preparing' || order.status === 'ready' || order.status === 'served'
      ).length;

      const occupiedTables = validTables.filter(
        (table: any) => table.status === "occupied",
      );

      // Month revenue: same as period revenue for the selected date range
      const monthRevenue = periodRevenue;

      // Average order value
      const averageOrderValue = periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

      // Peak hours analysis from completed orders only
      const hourlyOrders: { [key: number]: number } = {};

      completedOrders.forEach((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        if (!isNaN(orderDate.getTime())) {
          const hour = orderDate.getHours();
          hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
        }
      });

      const peakHour = Object.keys(hourlyOrders).reduce(
        (peak, hour) =>
          hourlyOrders[parseInt(hour)] > (hourlyOrders[parseInt(peak)] || 0)
            ? hour
            : peak,
        "12",
      );

      const finalStats = {
        periodRevenue,
        periodOrderCount,
        periodCustomerCount,
        dailyAverageRevenue,
        activeOrders,
        occupiedTables: occupiedTables.length,
        monthRevenue,
        averageOrderValue,
        peakHour: parseInt(peakHour),
        totalTables: validTables.length,
        filteredCompletedOrders: completedOrders,
      };

      console.log("Sales Chart Debug - Final Stats:", {
        periodRevenue,
        periodOrderCount,
        periodCustomerCount,
        dateRange: `${startDate} to ${endDate}`
      });

      return finalStats;
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      return {
        periodRevenue: 0,
        periodOrderCount: 0,
        periodCustomerCount: 0,
        dailyAverageRevenue: 0,
        activeOrders: 0,
        occupiedTables: 0,
        monthRevenue: 0,
        averageOrderValue: 0,
        peakHour: 12,
        totalTables: 0,
        filteredCompletedOrders: [],
      };
    }
  };

  // Function to export data to Excel
  const exportToExcel = (dataToExport: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
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
      orderNumber: order.orderNumber,
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

    console.log("Processing filtered completed orders:", {
      count: filteredCompletedOrders.length,
      sampleOrder: filteredCompletedOrders[0]
    });

    filteredCompletedOrders.forEach((order: any) => {
      try {
        const orderDate = new Date(
          order.orderedAt ||
          order.createdAt ||
          order.created_at ||
          order.paidAt ||
          order.date
        );

        if (isNaN(orderDate.getTime())) {
          console.warn("Invalid date for order:", order.id);
          return;
        }

        const dateStr = orderDate.toISOString().split("T")[0];

        if (!dailySales[dateStr]) {
          dailySales[dateStr] = { orders: 0, revenue: 0, customers: 0 };
        }

        dailySales[dateStr].orders += 1;
        const orderTotal = Number(order.total || order.amount || 0);
        const orderDiscount = Number(order.discount || 0);
        const revenue = orderTotal - orderDiscount;

        dailySales[dateStr].revenue += revenue;
        dailySales[dateStr].customers += Number(order.customerCount || 1);
      } catch (error) {
        console.warn("Error processing order for daily sales:", error, order);
      }
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

        {/* Daily Sales Table */}
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
                      "Khách hàng": data.customers,
                    })),
                    `DailySales_${startDate}_to_${endDate}`,
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
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">{t("reports.date")}</TableHead>
                      <TableHead className="text-center">{t("reports.orderNumber")}</TableHead>
                      <TableHead className="text-right">{t("reports.revenue")}</TableHead>
                      <TableHead className="text-center">{t("reports.customers")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(dailySales).length > 0 ? (
                      Object.entries(dailySales)
                        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                        .map(([date, data]) => (
                          <TableRow key={date} className="hover:bg-gray-50">
                            <TableCell className="text-center font-medium">
                              {formatDate(date)}
                            </TableCell>
                            <TableCell className="text-center">
                              {data.orders}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(data.revenue)}
                            </TableCell>
                            <TableCell className="text-center">
                              {data.customers}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                          {t("reports.noDataDescription")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  // Chart configurations for each analysis type
  const chartConfig = {
    revenue: {
      label: t("reports.revenue"),
      color: "#10b981",
    },
    orders: {
      label: t("reports.orders"),
      color: "#3b82f6",
    },
    quantity: {
      label: t("reports.quantity"),
      color: "#f59e0b",
    },
  };

  // Get chart data based on analysis type
  const getChartData = () => {
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
        return;
      }

      const year = orderDate.getFullYear();
      const month = (orderDate.getMonth() + 1).toString().padStart(2, "0");
      const day = orderDate.getDate().toString().padStart(2, "0");
      const date = `${year}-${month}-${day}`;

      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, orders: 0 };
      }

      const orderTotal = Number(order.total || order.amount || 0);
      const orderDiscount = Number(order.discount || 0);
      const revenue = orderTotal - orderDiscount;

      dailySales[date].revenue += revenue;
      dailySales[date].orders += 1;
    });

    const chartData = Object.entries(dailySales)
      .map(([date, data]) => ({
        name: formatDate(date),
        revenue: data.revenue,
        orders: data.orders,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
      .slice(0, 10);

    return chartData;
  };

  // Render Chart component
  const renderChart = () => {
    const chartData = getChartData();

    return (
      <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold text-white">
            <TrendingUp className="w-6 h-6" />
            {t("reports.chartView")}
          </CardTitle>
          <CardDescription className="text-blue-100">
            {t("reports.visualRepresentation")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
          {!chartData || chartData.length === 0 ? (
            <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 flex flex-col justify-center items-center">
              <div className="text-gray-500 mb-4 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">
                  {t("reports.noDataDescription")}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 relative overflow-hidden">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-gray-200 shadow-lg">
                              <p className="font-semibold text-gray-800 mb-2">{label}</p>
                              {payload.map((entry, index) => (
                                <p key={index} className="text-sm" style={{ color: entry.color }}>
                                  {entry.dataKey === "revenue" ? t("reports.revenue") : t("reports.orders")}:{" "}
                                  {entry.dataKey === "revenue" ? formatCurrency(Number(entry.value)) : entry.value}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {t("reports.startDate")}
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {t("reports.endDate")}
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t("reports.loading")}...</div>
          </div>
        ) : (
          <>
            {renderChart()}
            {renderSalesReport()}
          </>
        )}
      </div>
    </div>
  );
}