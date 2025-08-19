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

export function SalesChartReport() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [analysisType, setAnalysisType] = useState("time");
  const [concernType, setConcernType] = useState("time");

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

  // Data queries - using same source as dashboard for consistency
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: tables } = useQuery({
    queryKey: ["/api/tables"],
    staleTime: 5 * 60 * 1000,
  });

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

  // EXACT same data processing logic as dashboard
  const getDashboardStats = () => {
    if (!orders || !tables || !Array.isArray(orders) || !Array.isArray(tables)) {
      return null;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    // Filter completed orders within date range - EXACT same as dashboard
    const filteredCompletedOrders = orders.filter((order: any) => {
      // Check if order is completed/paid
      if (order.status !== 'completed' && order.status !== 'paid') return false;

      // Try multiple possible date fields
      const orderDate = new Date(
        order.orderedAt || order.createdAt || order.created_at || order.paidAt
      );

      // Skip if date is invalid
      if (isNaN(orderDate.getTime())) {
        console.log('Invalid order date for order:', order.id, 'date fields:', {
          orderedAt: order.orderedAt,
          createdAt: order.createdAt,
          created_at: order.created_at,
          paidAt: order.paidAt
        });
        return false;
      }

      return orderDate >= start && orderDate <= end;
    });

    console.log("Sales Chart Dashboard Debug:", {
      totalOrders: orders.length,
      startDate,
      endDate,
      firstOrder: orders[0],
      completedOrders: orders.filter((o: any) => o.status === 'completed' || o.status === 'paid').length,
      filteredCompletedOrders: filteredCompletedOrders.length,
      sampleOrderDates: orders.slice(0, 5).map((o: any) => ({
        id: o.id,
        status: o.status,
        orderedAt: o.orderedAt,
        createdAt: o.createdAt,
        created_at: o.created_at,
        paidAt: o.paidAt,
        parsedDate: new Date(o.orderedAt || o.createdAt || o.created_at || o.paidAt).toISOString()
      })),
    });

    // Period revenue: total amount - discount for all completed orders - EXACT same as dashboard
    const periodRevenue = filteredCompletedOrders.reduce(
      (total: number, order: any) => {
        const orderTotal = Number(order.total || 0);
        const discount = Number(order.discount || 0);
        return total + (orderTotal - discount);
      },
      0,
    );

    // Order count: count of completed orders in the filtered period - EXACT same as dashboard
    const periodOrderCount = filteredCompletedOrders.length;

    // Customer count: count unique customers from completed orders - EXACT same as dashboard
    const uniqueCustomers = new Set();
    filteredCompletedOrders.forEach((order: any) => {
      if (order.customerId) {
        uniqueCustomers.add(order.customerId);
      } else {
        // If no customer ID, count as unique customer per order
        uniqueCustomers.add(`order_${order.id}`);
      }
    });
    const periodCustomerCount = uniqueCustomers.size;

    // Daily average for the period - EXACT same as dashboard
    const daysDiff = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const dailyAverageRevenue = periodRevenue / daysDiff;

    // Active orders (pending/in-progress orders) - EXACT same as dashboard
    const activeOrders = orders.filter((order: any) => 
      order.status === 'pending' || order.status === 'in_progress'
    ).length;

    const occupiedTables = tables.filter(
      (table: any) => table.status === "occupied",
    );

    // Month revenue: same as period revenue for the selected date range - EXACT same as dashboard
    const monthRevenue = periodRevenue;

    // Average order value - EXACT same as dashboard
    const averageOrderValue =
      periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

    // Peak hours analysis from filtered completed orders - EXACT same as dashboard
    const hourlyOrders: { [key: number]: number } = {};
    filteredCompletedOrders.forEach((order: any) => {
      const orderDate = new Date(
        order.orderedAt || order.createdAt || order.created_at || order.paidAt
      );
      if (!isNaN(orderDate.getTime())) {
        const hour = orderDate.getHours();
        hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
      }
    });

    const peakHour = Object.keys(hourlyOrders).reduce(
      (peak, hour) =>
        hourlyOrders[parseInt(hour)] > hourlyOrders[parseInt(peak)]
          ? hour
          : peak,
      "12",
    );

    return {
      periodRevenue,
      periodOrderCount,
      periodCustomerCount,
      dailyAverageRevenue,
      activeOrders: activeOrders,
      occupiedTables: occupiedTables.length,
      monthRevenue,
      averageOrderValue,
      peakHour: parseInt(peakHour),
      totalTables: tables.length,
      filteredCompletedOrders, // Return filtered orders for further processing
    };
  };

  // Legacy Sales Report Component Logic using dashboard stats
  const renderSalesReport = () => {
    const dashboardStats = getDashboardStats();

    if (!dashboardStats) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const { filteredCompletedOrders } = dashboardStats;

    // Convert orders to transaction-like format for compatibility
    const filteredTransactions = filteredCompletedOrders.map((order: any) => ({
      id: order.id,
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

    const dailySales: {
      [date: string]: { revenue: number; orders: number; customers: number };
    } = {};

    filteredCompletedOrders.forEach((order: any) => {
      const orderDate = new Date(
        order.orderedAt || order.createdAt || order.created_at || order.paidAt,
      );

      const year = orderDate.getFullYear();
      const month = (orderDate.getMonth() + 1).toString().padStart(2, "0");
      const day = orderDate.getDate().toString().padStart(2, "0");
      const date = `${year}-${month}-${day}`;

      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, orders: 0, customers: 0 };
      }

      // Use EXACT same revenue calculation as dashboard: total - discount
      const orderTotal = Number(order.total || 0);
      const discount = Number(order.discount || 0);
      dailySales[date].revenue += orderTotal - discount;
      dailySales[date].orders += 1;

      // Count unique customers per day
      if (order.customerId) {
        dailySales[date].customers += 1;
      } else {
        dailySales[date].customers += 1; // Count walk-in customers
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
      const orderTotal = Number(order.total || 0);
      const discount = Number(order.discount || 0);
      paymentMethods[method].revenue += orderTotal - discount;
    });

    // Use dashboard stats directly for consistency
    const totalRevenue = dashboardStats.periodRevenue;
    const totalOrders = dashboardStats.periodOrderCount;
    const totalCustomers = dashboardStats.periodCustomerCount;
    const averageOrderValue = dashboardStats.averageOrderValue;

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
                  <p className="text-2xl font-bold">
                    {totalCustomers}
                  </p>
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
                      : `${formatDate(startDate)} - ${formatDate(endDate)}`
                    }
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
            <CardDescription>
              {t("reports.salesChartDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
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
                            const method = transaction.paymentMethod || "cash";
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
                          {paymentMethodsArray.map((method: any) => (
                            <TableHead
                              key={method}
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
                                dateTransactions.forEach((transaction: any) => {
                                  const method =
                                    transaction.paymentMethod || "cash";
                                  paymentMethods[method] =
                                    (paymentMethods[method] || 0) +
                                    Number(transaction.total);
                                });

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
                                      #
                                      {transaction.transactionId ||
                                        `TXN-${txIndex + 1}`}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-sm min-w-[140px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total) * 1.05,
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-red-600 text-sm min-w-[120px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total) * 1.05 * 0.05,
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
                                              transaction.paymentMethod || "cash";
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
                        {Object.values(dailySales).reduce((sum, data) => sum + data.orders, 0).toLocaleString()}
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

  // Legacy Inventory Report Component Logic
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

      console.log("Product Report Debug:", {
        startDate,
        endDate,
        start: start.toISOString(),
        end: end.toISOString(),
        ordersLength: orders?.length || 0,
        transactionsLength: transactions?.length || 0,
      });

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
          if (order.status !== 'completed' && order.status !== 'paid') return false;

          // Try multiple possible date fields (EXACT same as dashboard)
          const orderDate = new Date(
            order.orderedAt || order.createdAt || order.created_at || order.paidAt
          );

          // Skip if date is invalid
          if (isNaN(orderDate.getTime())) {
            return false;
          }

          return orderDate >= start && orderDate <= end;
        });

        console.log("Filtered Orders for Product Report:", {
          totalOrders: orders.length,
          filteredOrders: filteredOrders.length,
          sampleOrder: filteredOrders[0] ? {
            id: filteredOrders[0].id,
            status: filteredOrders[0].status,
            orderedAt: filteredOrders[0].orderedAt,
            createdAt: filteredOrders[0].createdAt,
            items: filteredOrders[0].items?.length || 0
          } : null
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

              console.log("Processing order item:", {
                productId,
                productName: product.name,
                quantity,
                total,
                unitPrice,
                totalAmount,
                discount
              });
            });
          }
        });
      }

      // Fallback: Process transaction items from transactions if no order data
      if (transactions && Array.isArray(transactions) && Object.keys(productSales).length === 0) {
        const filteredTransactions = transactions.filter((transaction: any) => {
          const transactionDate = new Date(
            transaction.createdAt || transaction.created_at,
          );
          const transactionDateOnly = new Date(transactionDate);
          transactionDateOnly.setHours(0, 0, 0, 0);
          return transactionDateOnly >= start && transactionDateOnly <= end;
        });

        console.log("Fallback to transactions:", {
          totalTransactions: transactions.length,
          filteredTransactions: filteredTransactions.length
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

      console.log("Product Sales Summary:", productSales);

      return filteredProducts
        .map((product: any) => {
          const sales = productSales[product.id.toString()] || {
            quantity: 0,
            totalAmount: 0,
            discount: 0,
            revenue: 0,
          };

          // Tìm category name
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
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
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

  // Employee Report with Pagination State
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(15);

  // Legacy Employee Report Component Logic
  const renderEmployeeReport = () => {
    if (!orders || !Array.isArray(orders)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    try {

      console.log("Employee Report - orders data:", {
        ordersLength: orders.length,
        sampleOrder: orders[0] ? {
          id: orders[0].id,
          status: orders[0].status,
          employeeName: orders[0].employeeName,
          cashierName: orders[0].cashierName,
          total: orders[0].total
        } : null
      });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Use EXACT same filtering logic as dashboard for orders
    const filteredCompletedOrders = orders.filter((order: any) => {
      // Check if order is completed/paid (EXACT same as dashboard)
      if (order.status !== 'completed' && order.status !== 'paid') return false;

      // Try multiple possible date fields (EXACT same as dashboard)
      const orderDate = new Date(
        order.orderedAt || order.createdAt || order.created_at || order.paidAt
      );

      // Skip if date is invalid (EXACT same as dashboard)
      if (isNaN(orderDate.getTime())) {
        console.log('Invalid order date for order:', order.id, 'date fields:', {
          orderedAt: order.orderedAt,
          createdAt: order.createdAt,
          created_at: order.created_at,
          paidAt: order.paidAt
        });
        return false;
      }

      const dateMatch = orderDate >= start && orderDate <= end;

      const employeeMatch =
        selectedEmployee === "all" ||
        order.employeeName === selectedEmployee ||
        order.cashierName === selectedEmployee ||
        order.employeeId?.toString() === selectedEmployee ||
        order.employeeName?.includes(selectedEmployee) ||
        order.cashierName?.includes(selectedEmployee);

      return dateMatch && employeeMatch;
    });

    // Convert orders to transaction-like format for compatibility
    const filteredTransactions = filteredCompletedOrders.map((order: any) => ({
      id: order.id,
      transactionId: `TXN-${order.id}`,
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      paymentMethod: order.paymentMethod || "cash",
      createdAt: order.orderedAt || order.createdAt || order.created_at || order.paidAt,
      created_at: order.orderedAt || order.createdAt || order.created_at || order.paidAt,
      customerName: order.customerName,
      customerId: order.customerId,
      cashierName: order.employeeName || order.cashierName,
      employeeId: order.employeeId,
      items: order.items || [],
      status: order.status,
    }));

    console.log("Employee Report Debug:", {
      totalOrders: orders.length,
      startDate,
      endDate,
      completedOrders: orders.filter((o: any) => o.status === 'completed' || o.status === 'paid').length,
      filteredCompletedOrders: filteredCompletedOrders.length,
      selectedEmployee,
      sampleOrderDates: orders.slice(0, 3).map((o: any) => ({
        id: o.id,
        status: o.status,
        employeeName: o.employeeName || o.cashierName,
        orderedAt: o.orderedAt,
        createdAt: o.createdAt,
        created_at: o.created_at,
        paidAt: o.paidAt
      })),
    });

    // Group orders by employee and extract payment methods
    const employeeData: {
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

    // Get all unique payment methods from filtered orders
    const allPaymentMethods = new Set<string>();
    filteredCompletedOrders.forEach((order: any) => {
      const method = order.paymentMethod || "cash";
      allPaymentMethods.add(method);
    });

    filteredCompletedOrders.forEach((order: any) => {
      try {
        const employeeCode = order.employeeId || "EMP-000";
        const employeeName =
          order.cashierName || order.employeeName || "Unknown";
        const employeeKey = `${employeeCode}-${employeeName}`;

        if (!employeeData[employeeKey]) {
          employeeData[employeeKey] = {
            employeeCode,
            employeeName,
            orderCount: 0,
            revenue: 0,
            tax: 0,
            total: 0,
            paymentMethods: {},
          };

          // Initialize payment methods for each employee
          allPaymentMethods.forEach((method) => {
            employeeData[employeeKey].paymentMethods[method] = 0;
          });
        }

        // Use EXACT same calculation as dashboard: total - discount
        const orderTotal = Number(order.total || 0);
        const orderDiscount = Number(order.discount || 0);
        const orderRevenue = orderTotal - orderDiscount; // EXACT same calculation as dashboard
        const orderTax = orderRevenue * 0.1; // 10% tax on revenue

        employeeData[employeeKey].orderCount += 1;
        employeeData[employeeKey].revenue += orderRevenue;
        employeeData[employeeKey].tax += orderTax;
        employeeData[employeeKey].total += orderRevenue;

        // Add to payment method total
        const paymentMethod = order.paymentMethod || "cash";
        if (!employeeData[employeeKey].paymentMethods[paymentMethod]) {
          employeeData[employeeKey].paymentMethods[paymentMethod] = 0;
        }
        employeeData[employeeKey].paymentMethods[paymentMethod] += orderRevenue;
      } catch (error) {
        console.warn("Error processing employee order:", error, order);
      }
    });

    const data = Object.values(employeeData).sort((a, b) => b.total - a.total);

    // Pagination logic
    const totalPages = Math.ceil(data.length / employeePageSize);
    const startIndex = (employeeCurrentPage - 1) * employeePageSize;
    const endIndex = startIndex + employeePageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    const paymentMethodsArray = Array.from(allPaymentMethods).sort();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("reports.employeeSalesReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
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
                          const method = transaction.paymentMethod || "cash";
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
                        {paymentMethodsArray.map((method: any) => (
                          <TableHead
                            key={method}
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
                    const employeeTransactions = filteredTransactions.filter(
                      (transaction: any) => {
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
                      },
                    );

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
                            employeeTransactions.forEach((transaction: any) => {
                              const method =
                                transaction.paymentMethod || "cash";
                              paymentMethods[method] =
                                (paymentMethods[method] || 0) +
                                Number(transaction.total);
                            });

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
                                  const amount = paymentMethods[method] || 0;
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
                            (transaction: any, transactionIndex: number) => (
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
                                  {new Date(
                                    transaction.createdAt ||
                                      transaction.created_at,
                                  ).toLocaleDateString("vi-VN")}{" "}
                                  {new Date(
                                    transaction.createdAt ||
                                      transaction.created_at,
                                  ).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </TableCell>
                                <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                  1
                                </TableCell>
                                <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[140px] px-4">
                                  {formatCurrency(Number(transaction.total))}
                                </TableCell>
                                <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                  {formatCurrency(
                                    Number(transaction.total) * 0.1,
                                  )}
                                </TableCell>
                                <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[140px] px-4">
                                  {formatCurrency(Number(transaction.total))}
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
                                          transaction.paymentMethod || "cash";
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
                          filteredTransactions.forEach((transaction: any) => {
                            const method = transaction.paymentMethod || "cash";
                            allPaymentMethods.add(method);
                          });
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
                      {data.length} {t("reports.employee")}
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
            <p className="text-sm">{error?.message || 'Unknown error'}</p>
          </div>
        </div>
      );
    }
  };

  // Customer Report with Pagination State
  // const [customerCurrentPage, setCustomerCurrentPage] = useState(1); // Moved up
  // const [customerPageSize, setCustomerPageSize] = useState(15); // Moved up

  // Legacy Customer Report Component Logic
  const renderCustomerReport = () => {
    if (!orders || !Array.isArray(orders)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
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
        dateMatch && customerMatch && statusMatch && order.status === "paid"
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
        orderDetails: any[];
      };
    } = {};

    filteredOrders.forEach((order: any) => {
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

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("reports.customerSalesReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
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
                            >
                              {t("reports.active")}
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
                                  {order.orderNumber || `ORD-${order.id}`}
                                </TableCell>
                                <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                  {new Date(
                                    order.orderedAt || order.created_at,
                                  ).toLocaleDateString("vi-VN")}
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
                    <TableCell className="text-center border-r min-w-[130px] px-4"></TableCell>
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

  // Legacy Sales Channel Report Component Logic
  const renderSalesChannelReport = () => {
    const dashboardStats = getDashboardStats();

    if (!dashboardStats) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const { filteredCompletedOrders } = dashboardStats;

    console.log("Sales Channel Report Debug:", {
      filteredCompletedOrders: filteredCompletedOrders.length,
      sampleOrder: filteredCompletedOrders[0],
    });

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

    // Process completed orders from dashboard (EXACT same data source)
    filteredCompletedOrders.forEach((order: any) => {
      // Determine sales method based on order properties
      let method = t("reports.dineIn"); // Default

      // Check for delivery/takeaway indicators
      if (
        order.deliveryMethod === "delivery" ||
        order.deliveryMethod === "takeout" ||
        order.deliveryMethod === "takeaway" ||
        order.isDelivery === true ||
        order.salesChannel === "delivery" ||
        order.salesChannel === "takeout" ||
        order.salesChannel === "takeaway"
      ) {
        method = t("reports.takeaway");
      } else if (
        order.deliveryMethod === "dine_in" ||
        order.deliveryMethod === "dinein" ||
        order.salesChannel === "dine_in" ||
        order.tableId ||
        order.tableNumber
      ) {
        method = t("reports.dineIn");
      }

      // Use EXACT same revenue calculation as dashboard: total - discount
      const orderTotal = Number(order.total || 0);
      const discount = Number(order.discount || 0);
      const revenue = orderTotal - discount;

      // All orders from filteredCompletedOrders are already completed/paid
      if (revenue > 0) {
        salesMethodData[method].completedOrders += 1;
        salesMethodData[method].completedRevenue += revenue;
      }

      salesMethodData[method].totalOrders = salesMethodData[method].completedOrders;
      salesMethodData[method].totalRevenue = salesMethodData[method].completedRevenue;
    });

    console.log("Sales Method Data:", salesMethodData);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("reports.channelSalesReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
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
                  <TableCell className="text-center border font-bold">
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
                  <TableCell className="text-right border font-bold">
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
          {/* No pagination needed for sales channel report - it's a summary table */}
        </CardContent>
      </Card>
    );
  };

  // New Sales Detail Report Component Logic
  const renderSalesDetailReport = () => {
    if (transactionsLoading || ordersLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filter transactions by date and sales method
    const filteredTransactions =
      transactions?.filter((transaction: any) => {
        const transactionDate = new Date(
          transaction.createdAt || transaction.created_at,
        );
        const transactionDateOnly = new Date(transactionDate);
        transactionDateOnly.setHours(0, 0, 0, 0);

        const isInRange =
          transactionDateOnly >= start && transactionDateOnly <= end;

        // Filter by employee if specified
        const employeeMatch =
          selectedEmployee === "all" ||
          transaction.cashierName === selectedEmployee ||
          transaction.employeeId?.toString() === selectedEmployee ||
          transaction.cashierName?.includes(selectedEmployee);

        // Filter by product if specified
        const productMatch =
          !productSearch ||
          (transaction.items &&
            transaction.items.some((item: any) => {
              const product = products?.find(
                (p: any) => p.id.toString() === item.productId?.toString(),
              );
              return (
                product &&
                (product.name
                  .toLowerCase()
                  .includes(productSearch.toLowerCase()) ||
                  (product.sku &&
                    product.sku
                      .toLowerCase()
                      .includes(productSearch.toLowerCase())))
              );
            }));

        return isInRange && employeeMatch && productMatch;
      }) || [];

    // Group transactions by date, customer, and employee for summary rows
    const groupedTransactions: {
      [key: string]: {
        date: string;
        time: string;
        orderCount: number;
        customerId: string;
        customerName: string;
        employeeName: string;
        totalRevenue: number;
        totalDiscount: number;
        totalTax: number;
        totalAmount: number;
        transactions: any[];
        salesChannel: string;
        tableNumber: string;
      };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      const dateStr = transactionDate.toLocaleDateString("vi-VN");
      const timeStr = transactionDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const customerId = transaction.customerId || "KL-001";
      const customerName = transaction.customerName || "Khách lẻ";
      const employeeName =
        transaction.cashierName || transaction.employeeName || "Nhân viên";

      const groupKey = `${dateStr}-${customerId}-${employeeName}`;

      if (!groupedTransactions[groupKey]) {
        groupedTransactions[groupKey] = {
          date: dateStr,
          time: timeStr,
          orderCount: 0,
          customerId: customerId,
          customerName: customerName,
          employeeName: employeeName,
          totalRevenue: 0,
          totalDiscount: 0,
          totalTax: 0,
          totalAmount: 0,
          transactions: [],
          salesChannel: transaction.salesChannel || "Trực tiếp",
          tableNumber: transaction.tableNumber || "B01",
        };
      }

      const transactionTotal = Number(transaction.total || 0);
      const transactionSubtotal = Number(
        transaction.subtotal || transactionTotal * 1.1,
      );
      const transactionDiscount = transactionSubtotal - transactionTotal;
      const transactionTax = transactionTotal * 0.1;
      const transactionRevenue = transactionTotal - transactionTax;

      groupedTransactions[groupKey].orderCount += 1;
      groupedTransactions[groupKey].totalAmount += transactionTotal;
      groupedTransactions[groupKey].totalDiscount += transactionDiscount;
      groupedTransactions[groupKey].totalTax += transactionTax;
      groupedTransactions[groupKey].totalRevenue += transactionRevenue;
      groupedTransactions[groupKey].transactions.push(transaction);
    });

    // Map grouped transactions to the detailed report format
    const salesDetailData = Object.values(groupedTransactions).map((group) => {
      return {
        date: group.date,
        time: group.time,
        orderCount: group.orderCount, // Show order count as number
        customerId: group.customerId,
        customerName: group.customerName,
        productCode: "---",
        productName: "Tổng cộng các đơn hàng",
        unit: "---",
        quantity: group.orderCount,
        unitPrice: 0,
        totalAmount: group.totalAmount,
        discount: group.totalDiscount,
        revenue: group.totalRevenue,
        taxRate: "10%",
        taxAmount: group.totalTax,
        total: group.totalAmount,
        group: "Tổng hợp",
        note: `${group.orderCount} đơn hàng`,
        salesChannel: group.salesChannel,
        tableNumber: group.tableNumber,
        employeeName: group.employeeName,
        status: "Hoàn thành",
        isGroupHeader: true,
        groupKey: `${group.date}-${group.customerId}-${group.employeeName}`,
        transactions: group.transactions,
      };
    });

    // Sort data by date and time
    const sortedData = [...salesDetailData].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Pagination logic
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = sortedData.slice(startIndex, endIndex);

    // Calculate totals for the summary row
    const totalOrderCount = paginatedData.reduce(
      (sum, item) => sum + (item.isGroupHeader ? item.quantity : 0), // Only count orders from group headers
      0,
    );
    const totalRevenue = paginatedData.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );
    const totalTaxAmount = paginatedData.reduce(
      (sum, item) => sum + item.taxAmount,
      0,
    );
    const grandTotal = paginatedData.reduce((sum, item) => sum + item.total, 0);
    const totalDiscount = paginatedData.reduce(
      (sum, item) => sum + item.discount,
      0,
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("reports.salesDetailReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center border-r bg-green-50 w-12"></TableHead>
                  <TableHead className="text-center border-r bg-green-50 min-w-[100px]">
                    {t("reports.date")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[80px]">
                    {t("reports.time")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[130px]">
                    {t("reports.orderNumber")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[120px]">
                    {t("reports.customerCode")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[150px]">
                    {t("reports.customerName")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[100px]">
                    {t("reports.productCode")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[150px]">
                    {t("reports.productName")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[80px]">
                    {t("reports.unit")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[80px]">
                    {t("reports.quantity")}
                  </TableHead>
                  <TableHead className="text-right border-r min-w-[100px]">
                    {t("reports.unitPrice")}
                  </TableHead>
                  <TableHead className="text-right border-r min-w-[120px]">
                    {t("reports.totalAmount")}
                  </TableHead>
                  <TableHead className="text-right border-r text-red-600 min-w-[100px]">
                    {t("reports.discount")}
                  </TableHead>
                  <TableHead className="text-right border-r text-green-600 font-medium min-w-[120px]">
                    {t("reports.revenue")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[80px]">
                    {t("reports.taxRate")}
                  </TableHead>
                  <TableHead className="text-right border-r min-w-[100px]">
                    {t("reports.taxAmount")}
                  </TableHead>
                  <TableHead className="text-right border-r font-bold text-blue-600 min-w-[120px]">
                    {t("reports.total")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[120px]">
                    {t("reports.group")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[150px]">
                    {t("reports.note")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[100px]">
                    {t("reports.channel")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[80px]">
                    {t("reports.table")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[150px]">
                    {t("reports.employeeName")}
                  </TableHead>
                  <TableHead className="text-center min-w-[100px]">
                    {t("reports.status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => {
                    const isExpanded =
                      expandedRows[`group-${item.groupKey}`] || false;
                    return (
                      <React.Fragment key={index}>
                        {/* Group Header Row */}
                        <TableRow
                          className={`hover:bg-gray-50 ${item.isGroupHeader ? "bg-blue-50 font-medium" : ""}`}
                        >
                          <TableCell className="text-center border-r w-12">
                            {item.isGroupHeader && (
                              <button
                                onClick={() =>
                                  setExpandedRows((prev) => ({
                                    ...prev,
                                    [`group-${item.groupKey}`]:
                                      !prev[`group-${item.groupKey}`],
                                  }))
                                }
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                              >
                                {isExpanded ? "−" : "+"}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-center border-r bg-green-50 font-medium min-w-[100px] px-4">
                            {item.date}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[80px] px-4">
                            {item.time}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[130px] px-4 font-bold text-blue-600">
                            {item.orderCount}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[120px] px-4">
                            {item.customerId}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[150px] px-4">
                            {item.customerName}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[100px] px-4">
                            {item.productCode}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[150px] px-4">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[80px] px-4">
                            {item.unit}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[80px] px-4">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right border-r min-w-[100px] px-4">
                            {item.unitPrice > 0
                              ? formatCurrency(item.unitPrice)
                              : "---"}
                          </TableCell>
                          <TableCell className="text-right border-r min-w-[120px] px-4">
                            {formatCurrency(item.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right border-r text-red-600 min-w-[100px] px-4">
                            {formatCurrency(item.discount)}
                          </TableCell>
                          <TableCell className="text-right border-r text-green-600 font-medium min-w-[120px] px-4">
                            {formatCurrency(item.revenue)}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[80px] px-4">
                            {item.taxRate}
                          </TableCell>
                          <TableCell className="text-right border-r min-w-[100px] px-4">
                            {formatCurrency(item.taxAmount)}
                          </TableCell>
                          <TableCell className="text-right border-r font-bold text-blue-600 min-w-[120px] px-4">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[120px] px-4">
                            {item.group}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[150px] px-4">
                            {item.note}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[100px] px-4">
                            {item.salesChannel}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[80px] px-4">
                            {item.tableNumber}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[150px] px-4">
                            {item.employeeName}
                          </TableCell>
                          <TableCell className="text-center min-w-[100px] px-4">
                            {item.status}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Order Details */}
                        {isExpanded &&
                          item.transactions &&
                          item.transactions.map(
                            (transaction: any, txIndex: number) => {
                              // Get all items for this transaction from database
                              const transactionItems = transaction.items || [];

                              // If no items in database, show transaction summary
                              if (transactionItems.length === 0) {
                                return (
                                  <TableRow
                                    key={`tx-${txIndex}`}
                                    className="bg-yellow-50/50 border-l-4 border-l-yellow-400"
                                  >
                                    <TableCell className="text-center border-r bg-yellow-50 w-12">
                                      <div className="w-8 h-6 flex items-center justify-center text-yellow-600 text-xs">
                                        └
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                      {new Date(
                                        transaction.createdAt ||
                                          transaction.created_at,
                                      ).toLocaleDateString("vi-VN")}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                      {new Date(
                                        transaction.createdAt ||
                                          transaction.created_at,
                                      ).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-blue-600 text-sm min-w-[130px] px-4">
                                      {transaction.transactionId ||
                                        `TXN-${transaction.id}`}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[120px] px-4">
                                      {transaction.customerId || "KL-001"}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                      {transaction.customerName ||
                                        t("common.walkInCustomer")}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                      ---
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                      Giao dịch tổng hợp
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                      Đơn
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                      1
                                    </TableCell>
                                    <TableCell className="text-right border-r text-sm min-w-[100px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total),
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                      {formatCurrency(
                                        Number(
                                          transaction.subtotal ||
                                            Number(transaction.total) * 1.1,
                                        ),
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-red-600 text-sm min-w-[100px] px-4">
                                      {formatCurrency(
                                        Number(
                                          transaction.subtotal ||
                                            Number(transaction.total) * 1.1,
                                        ) - Number(transaction.total),
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[120px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total) * 0.9,
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                      10%
                                    </TableCell>
                                    <TableCell className="text-right border-r text-sm min-w-[100px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total) * 0.1,
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[120px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total),
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[120px] px-4">
                                      Giao dịch
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                      {transaction.note ||
                                        transaction.notes ||
                                        ""}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                      {transaction.salesChannel ||
                                        transaction.deliveryMethod ||
                                        "Trực tiếp"}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                      {transaction.tableNumber ||
                                        transaction.tableId ||
                                        "B01"}
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                      {transaction.cashierName ||
                                        transaction.employeeName ||
                                        "Nhân viên"}
                                    </TableCell>
                                    <TableCell className="text-center text-sm min-w-[100px] px-4">
                                      {transaction.status || "Hoàn thành"}
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              // Show individual items from database for this transaction
                              return transactionItems.map(
                                (txItem: any, itemIndex: number) => {
                                  const product = products?.find(
                                    (p: any) =>
                                      p.id.toString() ===
                                      txItem.productId?.toString(),
                                  );
                                  const productName =
                                    product?.name ||
                                    txItem.productName ||
                                    "Sản phẩm";
                                  const productCode =
                                    product?.sku ||
                                    txItem.productCode ||
                                    txItem.sku ||
                                    `PRD-${txItem.productId}`;
                                  const category = categories?.find(
                                    (cat: any) =>
                                      cat.id === product?.categoryId,
                                  );
                                  const group =
                                    category?.name ||
                                    product?.categoryName ||
                                    txItem.group ||
                                    "Nhóm sản phẩm";

                                  const itemTotal = Number(txItem.total || 0);
                                  const itemUnitPrice = Number(
                                    txItem.price || txItem.unitPrice || 0,
                                  );
                                  const itemQuantity = Number(
                                    txItem.quantity || 0,
                                  );
                                  const itemSubtotal =
                                    itemUnitPrice * itemQuantity;
                                  const itemDiscount = itemSubtotal - itemTotal;
                                  const itemTax = itemTotal * 0.1;
                                  const itemRevenue = itemTotal - itemTax;

                                  return (
                                    <TableRow
                                      key={`tx-${txIndex}-item-${itemIndex}`}
                                      className="bg-green-50/30 border-l-4 border-l-green-400"
                                    >
                                      <TableCell className="text-center border-r bg-green-50 w-12">
                                        <div className="w-8 h-6 flex items-center justify-center text-green-600 text-xs">
                                          └
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                        {itemIndex === 0
                                          ? new Date(
                                              transaction.createdAt ||
                                                transaction.created_at,
                                            ).toLocaleDateString("vi-VN")
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                        {itemIndex === 0
                                          ? new Date(
                                              transaction.createdAt ||
                                                transaction.created_at,
                                            ).toLocaleTimeString("vi-VN", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-blue-600 text-sm min-w-[130px] px-4">
                                        {itemIndex === 0
                                          ? transaction.transactionId ||
                                            `TXN-${transaction.id}`
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[120px] px-4">
                                        {itemIndex === 0
                                          ? transaction.customerId || "KL-001"
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                        {itemIndex === 0
                                          ? transaction.customerName ||
                                            t("common.walkInCustomer")
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                        {productCode}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                        {productName}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                        {txItem.unit || product?.unit || "Cái"}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                        {itemQuantity}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-sm min-w-[100px] px-4">
                                        {formatCurrency(itemUnitPrice)}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                        {formatCurrency(itemSubtotal)}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-red-600 text-sm min-w-[100px] px-4">
                                        {formatCurrency(itemDiscount)}
                                      </TableCell>
                                      <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[120px] px-4">
                                        {formatCurrency(itemRevenue)}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                        {Number(txItem.taxRate || 10)}%
                                      </TableCell>
                                      <TableCell className="text-right border-r text-sm min-w-[100px] px-4">
                                        {formatCurrency(itemTax)}
                                      </TableCell>
                                      <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[120px] px-4">
                                        {formatCurrency(itemTotal)}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[120px] px-4">
                                        {group}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                        {itemIndex === 0
                                          ? transaction.note ||
                                            transaction.notes ||
                                            ""
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                        {itemIndex === 0
                                          ? transaction.salesChannel ||
                                            transaction.deliveryMethod ||
                                            "Trực tiếp"
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[80px] px-4">
                                        {itemIndex === 0
                                          ? transaction.tableNumber ||
                                            transaction.tableId ||
                                            "B01"
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                        {itemIndex === 0
                                          ? transaction.cashierName ||
                                            transaction.employeeName ||
                                            "Nhân viên"
                                          : ""}
                                      </TableCell>
                                      <TableCell className="text-center text-sm min-w-[100px] px-4">
                                        {itemIndex === 0
                                          ? transaction.status || "Hoàn thành"
                                          : ""}
                                      </TableCell>
                                    </TableRow>
                                  );
                                },
                              );
                            },
                          )}
                      </React.Fragment>
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
                    <TableCell className="text-center border-r min-w-[130px] px-4"></TableCell>
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

          {/* Pagination Controls for Sales Detail Report */}
          {sortedData.length > 0 && (
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
                  {t("common.page")} {currentPage} / {totalPages}
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
                        Math.min(prev + 1, totalPages),
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
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
        if (!transactions || !Array.isArray(transactions)) return [];

        const filteredTransactions = transactions.filter((transaction: any) => {
          const transactionDate = new Date(
            transaction.createdAt || transaction.created_at,
          );
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          const transactionDateOnly = new Date(transactionDate);
          transactionDateOnly.setHours(0, 0, 0, 0);
          return transactionDateOnly >= start && transactionDateOnly <= end;
        });

        const dailySales: {
          [date: string]: { revenue: number; orders: number };
        } = {};

        filteredTransactions.forEach((transaction: any) => {
          const transactionDate = new Date(
            transaction.createdAt || transaction.created_at,
          );
          const year = transactionDate.getFullYear();
          const month = (transactionDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          const day = transactionDate.getDate().toString().padStart(2, "0");
          const date = `${day}/${month}`;

          if (!dailySales[date]) {
            dailySales[date] = { revenue: 0, orders: 0 };
          }
          dailySales[date].revenue += Number(transaction.total || 0);
          dailySales[date].orders += 1;
        });

        return Object.entries(dailySales)
          .map(([date, data]) => ({
            name: date,
            revenue: data.revenue,
            orders: data.orders,
          }))
          .slice(0, 10);

      case "product":
        if (!products || !Array.isArray(products)) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const productSales: {
          [productId: string]: { quantity: number; revenue: number };
        } = {};

        // Lấy dữ liệu từ orders có items sẵn có
        if (orders && Array.isArray(orders)) {
          // Filter orders theo ngày và status
          const filteredOrders = orders.filter((order: any) => {
            // Chỉ lấy orders đã hoàn thành/thanh toán
            if (order.status !== 'completed' && order.status !== 'paid') return false;

            const orderDate = new Date(
              order.orderedAt || order.createdAt || order.created_at || order.paidAt
            );
            const orderDateOnly = new Date(orderDate);
            orderDateOnly.setHours(0, 0, 0, 0);
            return orderDateOnly >= start && orderDateOnly <= end;
          });

          // Xử lý từng order để lấy order items từ order.items nếu có
          filteredOrders.forEach((order: any) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                const productId = item.productId?.toString();
                if (!productId) return;

                // Kiểm tra product có tồn tại trong danh sách products không
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
        if (transactions && Array.isArray(transactions)) {
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
            return {
              name:
                product.name.length > 15
                  ? product.name.substring(0, 15) + "..."
                  : product.name,
              revenue: sales.revenue,
              quantity: sales.quantity,
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
            try {
              // Check if order is completed/paid (EXACT same as dashboard)
              if (order.status !== 'completed' && order.status !== 'paid') return false;

              // Try multiple possible date fields (EXACT same as dashboard)
              const orderDate = new Date(
                order.orderedAt || order.createdAt || order.created_at || order.paidAt
              );

              // Skip if date is invalid
              if (isNaN(orderDate.getTime())) {
                return false;
              }

              const dateMatch = orderDate >= empStart && orderDate <= empEnd;

              const employeeMatch =
                selectedEmployee === "all" ||
                order.employeeName === selectedEmployee ||
                order.cashierName === selectedEmployee ||
                order.employeeId?.toString() === selectedEmployee ||
                (order.employeeName && order.employeeName.includes(selectedEmployee)) ||
                (order.cashierName && order.cashierName.includes(selectedEmployee));

              return dateMatch && employeeMatch;
            } catch (error) {
              console.warn("Error filtering order:", error);
              return false;
            }
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
              name: name && name.length > 10 ? name.substring(0, 10) + "..." : name || "Unknown",
              revenue: Math.max(0, data.revenue || 0), // Ensure no negative values
              orders: Math.max(0, data.orders || 0), // Ensure no negative values
            }))
            .filter(item => item.revenue > 0 || item.orders > 0) // Only show employees with data
            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
            .slice(0, 10);

          console.log("Employee chart data generated:", {
            filteredOrdersCount: empFilteredOrders.length,
            employeeDataKeys: Object.keys(employeeData),
            result
          });

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
            order.status === "paid"
          );
        });

        const customerData: {
          [customerId: string]: {
            revenue: number;
            orders: number;
            customerName: string;
          };
        } = {};

        custFilteredOrders.forEach((order: any) => {
          const customerId = order.customerId || "guest";
          const customerName = order.customerName || "Khách lẻ";

          if (!customerData[customerId]) {
            customerData[customerId] = { revenue: 0, orders: 0, customerName };
          }

          const orderTotal = Number(order.total);
          customerData[customerId].revenue += orderTotal;
          customerData[customerId].orders += 1;
        });

        return Object.entries(customerData)
          .map(([id, data]) => ({
            name:
              data.customerName.length > 12
                ? data.customerName.substring(0, 12) + "..."
                : data.customerName,
            revenue: data.revenue,
            orders: data.orders,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

      case "channel":
        if (!transactions || !Array.isArray(transactions)) return [];

        const channelStart = new Date(startDate);
        const channelEnd = new Date(endDate);
        channelEnd.setHours(23, 59, 59, 999);

        const channelFilteredTransactions = transactions.filter(
          (transaction: any) => {
            const transactionDate = new Date(
              transaction.createdAt || transaction.created_at,
            );
            return (
              transactionDate >= channelStart && transactionDate <= channelEnd
            );
          },
        );

        const channelData: {
          [channel: string]: { revenue: number; orders: number };
        } = {};

        channelFilteredTransactions.forEach((transaction: any) => {
          const channel = transaction.salesChannel || "Direct";

          if (!channelData[channel]) {
            channelData[channel] = { revenue: 0, orders: 0 };
          }

          const amount = Number(transaction.total);
          if (amount > 0) {
            channelData[channel].revenue += amount;
            channelData[channel].orders += 1;
          }
        });

        return Object.entries(channelData)
          .map(([name, data]) => ({
            name: name,
            revenue: data.revenue,
            orders: data.orders,
          }))
          .sort((a, b) => b.revenue - a.revenue);

      case "salesDetail":
        // For sales detail, show daily revenue like time analysis
        if (!transactions || !Array.isArray(transactions)) return [];

        const detailStart = new Date(startDate);
        const detailEnd = new Date(endDate);
        detailEnd.setHours(23, 59, 59, 999);

        const detailFilteredTransactions = transactions.filter(
          (transaction: any) => {
            const transactionDate = new Date(
              transaction.createdAt || transaction.created_at,
            );
            const transactionDateOnly = new Date(transactionDate);
            transactionDateOnly.setHours(0, 0, 0, 0);
            return (
              transactionDateOnly >= detailStart &&
              transactionDateOnly <= detailEnd
            );
          },
        );

        const dailyDetailSales: {
          [date: string]: { revenue: number; orders: number };
        } = {};

        detailFilteredTransactions.forEach((transaction: any) => {
          const transactionDate = new Date(
            transaction.createdAt || transaction.created_at,
          );
          const year = transactionDate.getFullYear();
          const month = (transactionDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          const day = transactionDate.getDate().toString().padStart(2, "0");
          const date = `${day}/${month}`;

          if (!dailyDetailSales[date]) {
            dailyDetailSales[date] = { revenue: 0, orders: 0 };
          }
          dailyDetailSales[date].revenue += Number(transaction.total || 0);
          dailyDetailSales[date].orders += 1;
        });

        return Object.entries(dailyDetailSales)
          .map(([date, data]) => ({
            name: date,
            revenue: data.revenue,
            orders: data.orders,
          }))
          .slice(0, 10);

      default:
        return [];
    }
  };

  // Chart rendering component
  const renderChart = () => {
    try {
      const chartData = getChartData();

      console.log("Chart data for", analysisType, ":", chartData);

      if (!chartData || chartData.length === 0) {
        return (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t("reports.noDataDescription")}</div>
          </div>
        );
      }

      return (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-white/90 text-sm font-normal">
                {t("reports.chartView")}
              </div>
              <div className="text-white font-semibold">{getReportTitle()}</div>
            </div>
          </CardTitle>
          <CardDescription className="text-blue-100 mt-2">
            {t("reports.visualRepresentation")} - {t("reports.fromDate")}:{" "}
            {formatDate(startDate)} {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
          <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20 rounded-xl"></div>
            <ChartContainer
              config={chartConfig}
              className="h-full w-full relative z-10"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.6}
                      />
                    </linearGradient>
                    <linearGradient
                      id="ordersGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.6}
                      />
                    </linearGradient>
                    <linearGradient
                      id="quantityGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop
                        offset="95%"
                        stopColor="#f59e0b"
                        stopOpacity={0.6}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-gray-200 shadow-lg">
                            <p className="font-semibold text-gray-800 mb-2">
                              {label}
                            </p>
                            {payload.map((entry, index) => {
                              const translatedName =
                                entry.dataKey === "revenue"
                                  ? t("reports.revenue")
                                  : entry.dataKey === "orders"
                                    ? t("reports.orders")
                                    : entry.dataKey === "quantity"
                                      ? t("reports.quantity")
                                      : entry.name;
                              return (
                                <p
                                  key={index}
                                  className="text-sm"
                                  style={{ color: entry.color }}
                                >
                                  {translatedName}:{" "}
                                  {entry.dataKey === "revenue" ||
                                  entry.dataKey === "netRevenue"
                                    ? formatCurrency(Number(entry.value))
                                    : entry.value}
                                </p>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Revenue bar - always show */}
                  <Bar
                    dataKey="revenue"
                    fill="url(#revenueGradient)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />

                  {/* Additional bars based on analysis type */}
                  {analysisType === "time" && (
                    <Bar
                      dataKey="orders"
                      fill="url(#ordersGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  )}

                  {analysisType === "product" && (
                    <Bar
                      dataKey="quantity"
                      fill="url(#quantityGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  )}

                  {(analysisType === "employee" ||
                    analysisType === "customer" ||
                    analysisType === "channel" ||
                    analysisType === "salesDetail") && (
                    <Bar
                      dataKey="orders"
                      fill="url(#ordersGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
      );
    } catch (error) {
      console.error("Error in renderChart:", error);
      return (
        <div className="flex justify-center py-8">
          <div className="text-red-500">
            <p>Lỗi khi hiển thị biểu đồ</p>
            <p className="text-sm">{error?.message || 'Unknown error'}</p>
          </div>
        </div>
      );
    }
  };

  // Main render component function
  const renderReportContent = () => {
    try {
      console.log("Rendering report content for analysisType:", analysisType, "concernType:", concernType);

      switch (analysisType) {
        case "time":
          // Handle concernType for time-based analysis
          if (concernType === "employee") {
            return renderEmployeeReport();
          } else if (concernType === "salesDetail") {
            return renderSalesDetailReport();
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
        case "salesDetail":
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          {/* Main Filter Row */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Analysis Type */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {t("reports.analyzeBy")}
              </Label>
              <Select
                value={analysisType}
                onValueChange={(value) => {
                  setAnalysisType(value);
                  // Reset concernType when analysisType changes if necessary
                  if (value === "time") {
                    setConcernType("time"); // Default for time analysis
                  } else if (value === "salesDetail") {
                    setConcernType("sales"); // Default for sales detail analysis
                  } else {
                    // If moving away from 'time', ensure concernType is sensible or reset
                    setConcernType("sales"); // Or a more appropriate default
                  }
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">
                    {t("reports.timeAnalysis")}
                  </SelectItem>
                  <SelectItem value="product">
                    {t("reports.productAnalysis")}
                  </SelectItem>
                  <SelectItem value="employee">
                    {t("reports.employeeAnalysis")}
                  </SelectItem>
                  <SelectItem value="customer">
                    {t("reports.customerAnalysis")}
                  </SelectItem>
                  <SelectItem value="channel">
                    {t("reports.channelAnalysis")}
                  </SelectItem>
                  <SelectItem value="salesDetail">
                    {t("reports.salesDetailReport")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
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

          {/* Secondary Filter Row - Show based on analysis type */}
          {analysisType === "employee" && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.employeeFilter")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={t("reports.employeeFilterPlaceholder")}
                    value={selectedEmployee === "all" ? "" : selectedEmployee}
                    onChange={(e) =>
                      setSelectedEmployee(e.target.value || "all")
                    }
                    className="pl-10 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {analysisType === "customer" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.customerFilter")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={t("reports.customerFilterPlaceholder")}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.status")}
                </Label>
                <Select
                  value={customerStatus}
                  onValueChange={setCustomerStatus}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="active">
                      {t("reports.active")}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t("reports.inactive")}
                    </SelectItem>
                    <SelectItem value="vip">{t("reports.vip")}</SelectItem>
                    <SelectItem value="new">
                      {t("reports.newCustomer")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {analysisType === "product" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.productFilter")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={t("reports.productFilterPlaceholder")}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.productType")}
                </Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="combo">{t("reports.combo")}</SelectItem>
                    <SelectItem value="product">
                      {t("reports.product")}
                    </SelectItem>
                    <SelectItem value="service">
                      {t("reports.service")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.productGroup")}
                </Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t("reports.productGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {categories &&
                      Array.isArray(categories) &&
                      categories.map((category: any) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {analysisType === "channel" && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sales Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    {t("reports.salesMethod")}
                  </Label>
                  <Select value={salesMethod} onValueChange={setSalesMethod}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="no_delivery">
                        Không giao hàng
                      </SelectItem>
                      <SelectItem value="delivery">Có giao hàng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Filters for Time Analysis and Sales Detail Report */}
          {(analysisType === "time" || concernType === "salesDetail") && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.employeeFilter")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={t("reports.employeeFilterPlaceholder")}
                    value={selectedEmployee === "all" ? "" : selectedEmployee}
                    onChange={(e) =>
                      setSelectedEmployee(e.target.value || "all")
                    }
                    className="pl-10 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sales Detail Report Filters */}
          {analysisType === "salesDetail" && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {/* Employee and Order Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("reports.employeeFilter")}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.employeeFilterPlaceholder")}
                      value={selectedEmployee === "all" ? "" : selectedEmployee}
                      onChange={(e) =>
                        setSelectedEmployee(e.target.value || "all")
                      }
                      className="pl-10 h-9 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("reports.orderCode")}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.searchOrderCode")}
                      className="pl-10 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Product and Product Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("reports.productFilter")}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.productFilterPlaceholder")}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 h-9 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("reports.productGroup")}
                  </Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("reports.productGroup")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {categories &&
                        Array.isArray(categories) &&
                        categories.map((category: any) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status only */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("reports.status")}
                  </Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="h-9 text-sm w-full md:w-1/2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="completed">
                        {t("reports.completed")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("reports.pending")}
                      </SelectItem>
                      <SelectItem value="cancelled">
                        {t("reports.cancelled")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      <div className="space-y-6">
        {transactionsLoading || ordersLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t("reports.loading")}...</div>
          </div>
        ) : (
          <>
            {/* Chart Display */}
            {(analysisType === "time" ||
              analysisType === "product" ||
              analysisType === "employee" ||
              analysisType === "customer" ||
              analysisType === "channel") &&
              renderChart()}

            {/* Data Tables */}
            {renderReportContent()}
          </>
        )}
      </div>
    </div>
  );
}