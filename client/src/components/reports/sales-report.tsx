
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
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, DollarSign, Users, PieChart, BarChart3, Search } from "lucide-react";
import type { Transaction } from "@shared/schema";
import { useTranslation, useLanguageStore } from "@/lib/i18n";
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

export function SalesReport() {
  const { t } = useTranslation();

  const [analysisType, setAnalysisType] = useState("time");
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Filters for different analysis types
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [productType, setProductType] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedSalesChannel, setSelectedSalesChannel] = useState("all");
  const [selectedSeller, setSelectedSeller] = useState("all");

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    staleTime: 5 * 60 * 1000,
  });

  // Menu analysis data
  const { data: menuData } = useQuery({
    queryKey: [
      "/api/menu-analysis",
      startDate,
      endDate,
      productSearch,
      selectedCategory,
      productType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(productSearch && { search: productSearch }),
        ...(selectedCategory !== "all" && { categoryId: selectedCategory }),
        ...(productType !== "all" && { productType }),
      });
      const response = await fetch(`/api/menu-analysis?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch menu analysis data");
      }
      return response.json();
    },
    enabled: analysisType === "product",
    staleTime: 2 * 60 * 1000,
  });

  // Sales channel data
  const { data: salesChannelData } = useQuery({
    queryKey: [
      "/api/sales-channel-sales",
      startDate,
      endDate,
      selectedSeller,
      selectedSalesChannel,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedSeller !== "all" && { sellerId: selectedSeller }),
        ...(selectedSalesChannel !== "all" && {
          salesChannel: selectedSalesChannel,
        }),
      });
      const response = await fetch(`/api/sales-channel-sales?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sales channel sales data");
      }
      return response.json();
    },
    enabled: analysisType === "channel",
    staleTime: 2 * 60 * 1000,
  });

  const getSalesData = () => {
    if (!transactions || !Array.isArray(transactions)) return null;

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );

      // Chuyển về ngày local để so sánh chính xác
      const transactionDateStr = `${transactionDate.getFullYear()}-${(transactionDate.getMonth() + 1).toString().padStart(2, "0")}-${transactionDate.getDate().toString().padStart(2, "0")}`;
      
      const isInRange = transactionDateStr >= startDate && transactionDateStr <= endDate;

      return isInRange;
    });

    // Daily sales breakdown
    const dailySales: {
      [date: string]: { revenue: number; orders: number; customers: number };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      // Sử dụng format ngày nhất quán
      const date = `${transactionDate.getFullYear()}-${(transactionDate.getMonth() + 1).toString().padStart(2, "0")}-${transactionDate.getDate().toString().padStart(2, "0")}`;

      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, orders: 0, customers: 0 };
      }

      dailySales[date].revenue += Number(transaction.total);
      dailySales[date].orders += 1;
      dailySales[date].customers += 1; // Each transaction represents one customer
    });

    // Payment method breakdown
    const paymentMethods: {
      [method: string]: { count: number; revenue: number };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const method = transaction.paymentMethod || "cash";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, revenue: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].revenue += Number(transaction.total);
    });

    // Hourly breakdown
    const hourlySales: { [hour: number]: number } = {};

    filteredTransactions.forEach((transaction: any) => {
      const hour = new Date(
        transaction.createdAt || transaction.created_at,
      ).getHours();
      hourlySales[hour] = (hourlySales[hour] || 0) + Number(transaction.total);
    });

    // Total stats
    const totalRevenue = filteredTransactions.reduce(
      (sum: number, transaction: any) => sum + Number(transaction.total),
      0,
    );
    const totalOrders = filteredTransactions.length;
    const totalCustomers = filteredTransactions.length; // Each transaction is one customer
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      dailySales: Object.entries(dailySales)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({
        method,
        ...data,
      })),
      hourlySales,
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageOrderValue,
    };
  };

  const getEmployeeSalesData = () => {
    if (!transactions || !Array.isArray(transactions)) return [];

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = transactionDate >= start && transactionDate <= end;

      const employeeMatch =
        selectedEmployee === "all" ||
        transaction.cashierName === selectedEmployee ||
        transaction.employeeId?.toString() === selectedEmployee ||
        transaction.cashierName?.includes(selectedEmployee);

      return dateMatch && employeeMatch;
    });

    const employeeSales: {
      [employeeName: string]: {
        revenue: number;
        returnValue: number;
        netRevenue: number;
        orderCount: number;
      };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const employeeName = transaction.cashierName || "Unknown";

      if (!employeeSales[employeeName]) {
        employeeSales[employeeName] = {
          revenue: 0,
          returnValue: 0,
          netRevenue: 0,
          orderCount: 0,
        };
      }

      const amount = Number(transaction.total);
      employeeSales[employeeName].revenue += amount;
      employeeSales[employeeName].netRevenue += amount;
      employeeSales[employeeName].orderCount += 1;
    });

    return Object.entries(employeeSales).map(([employee, data]) => ({
      employee,
      ...data,
    }));
  };

  const getCustomerSalesData = () => {
    if (!transactions || !Array.isArray(transactions)) return [];

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = transactionDate >= start && transactionDate <= end;

      const customerMatch =
        !customerSearch ||
        (transaction.customerName &&
          transaction.customerName
            .toLowerCase()
            .includes(customerSearch.toLowerCase())) ||
        (transaction.customerPhone && transaction.customerPhone.includes(customerSearch)) ||
        (transaction.customerId &&
          transaction.customerId.toString().includes(customerSearch));

      return dateMatch && customerMatch;
    });

    const customerStats: {
      [customerId: string]: {
        customer: any;
        revenue: number;
        returnValue: number;
        netRevenue: number;
        orderCount: number;
      };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const customerId = transaction.customerId || "guest";
      const customerName = transaction.customerName || "Khách lẻ";

      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          customer: {
            id: customerId,
            name: customerName,
            phone: transaction.customerPhone || "",
          },
          revenue: 0,
          returnValue: 0,
          netRevenue: 0,
          orderCount: 0,
        };
      }

      const orderTotal = Number(transaction.total);
      customerStats[customerId].revenue += orderTotal;
      customerStats[customerId].netRevenue += orderTotal; // Assuming no returns for now
      customerStats[customerId].orderCount += 1;
    });

    return Object.values(customerStats);
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();

    switch (range) {
      case "today":
        setStartDate(today.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "week":
        // Tuần trước: từ thứ 2 tuần trước đến chủ nhật tuần trước
        const currentDayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        const daysToLastMonday =
          currentDayOfWeek === 0 ? 13 : currentDayOfWeek + 6; // Nếu hôm nay là CN thì lùi 13 ngày, không thì lùi (ngày hiện tại + 6)
        const lastWeekMonday = new Date(
          today.getTime() - daysToLastMonday * 24 * 60 * 60 * 1000,
        );
        const lastWeekSunday = new Date(
          lastWeekMonday.getTime() + 6 * 24 * 60 * 60 * 1000,
        );

        setStartDate(lastWeekMonday.toISOString().split("T")[0]);
        setEndDate(lastWeekSunday.toISOString().split("T")[0]);
        break;
      case "month":
        // Tháng trước: từ ngày 1 tháng trước đến ngày cuối tháng trước
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Tính tháng trước
        const lastMonthYear = month === 0 ? year - 1 : year;
        const lastMonth = month === 0 ? 11 : month - 1;
        
        // Ngày đầu tháng trước
        const lastMonthStart = new Date(lastMonthYear, lastMonth, 1);
        // Ngày cuối tháng trước
        const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0);

        // Format thành YYYY-MM-DD
        const startDateStr = `${lastMonthStart.getFullYear()}-${(lastMonthStart.getMonth() + 1).toString().padStart(2, "0")}-${lastMonthStart.getDate().toString().padStart(2, "0")}`;
        const endDateStr = `${lastMonthEnd.getFullYear()}-${(lastMonthEnd.getMonth() + 1).toString().padStart(2, "0")}-${lastMonthEnd.getDate().toString().padStart(2, "0")}`;

        setStartDate(startDateStr);
        setEndDate(endDateStr);
        break;
      case "custom":
        // Luôn set ngày hiện tại khi chọn tùy chỉnh
        const customCurrentDate = new Date().toISOString().split("T")[0];
        setStartDate(customCurrentDate);
        setEndDate(customCurrentDate);
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // Đảm bảo ngày tháng được hiển thị đúng timezone
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: t("reports.cash"),
      card: t("reports.card"),
      creditCard: t("reports.credit_card"),
      credit_card: t("reports.credit_card"),
      debitCard: t("pos.debitCard"),
      debit_card: t("pos.debitCard"),
      transfer: t("common.transfer"),
      einvoice: t("reports.einvoice"),
      momo: t("pos.momo"),
      zalopay: t("pos.zalopay"),
      vnpay: t("pos.vnpay"),
      qrCode: t("reports.qrbanking"),
      shopeepay: t("pos.shopeepay"),
      grabpay: t("pos.grabpay"),
      mobile: "Mobile",
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getAnalysisTitle = () => {
    const titles = {
      time: t("reports.salesAnalysis"),
      product: t("reports.menuAnalysis"),
      employee: t("reports.employeeReport"),
      customer: t("reports.customerReport"),
      channel: t("reports.salesChannelReport"),
    };
    return titles[analysisType as keyof typeof titles] || t("reports.salesAnalysis");
  };

  const getChartData = () => {
    switch (analysisType) {
      case "product":
        if (!menuData || !menuData.topRevenueProducts) return [];
        return menuData.topRevenueProducts.slice(0, 10).map((item: any) => ({
          name: item.product.name,
          revenue: item.revenue,
          quantity: item.quantity,
        }));
      case "employee":
        return getEmployeeSalesData().slice(0, 10).map((item) => ({
          name: item.employee,
          revenue: item.revenue,
          netRevenue: item.netRevenue,
        }));
      case "customer":
        return getCustomerSalesData().slice(0, 10).map((item) => ({
          name: item.customer.name,
          revenue: item.revenue,
          netRevenue: item.netRevenue,
        }));
      case "channel":
        if (!salesChannelData || !Array.isArray(salesChannelData)) return [];
        return salesChannelData.map((item: any) => ({
          name: item.salesChannelName || "N/A",
          revenue: item.revenue || 0,
          netRevenue: item.netRevenue || 0,
        }));
      default:
        return [];
    }
  };

  const salesData = getSalesData();

  if (!salesData && analysisType === "time") {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  const peakHour = salesData ? Object.entries(salesData.hourlySales).reduce(
    (peak, [hour, revenue]) =>
      revenue > (salesData.hourlySales[parseInt(peak)] || 0) ? hour : peak,
    "12",
  ) : "12";

  const renderTimeAnalysis = () => (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(salesData?.totalRevenue || 0)}
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
                <p className="text-2xl font-bold">{salesData?.totalOrders || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t("reports.averageOrderValue")}
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(salesData?.averageOrderValue || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t("reports.totalCustomers")}
              </p>
              <p className="text-2xl font-bold">{salesData?.totalCustomers || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {t("reports.peakHour")}: {peakHour}
                {t("reports.hour")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.dailySales")}</CardTitle>
            <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("reports.revenue")}</TableHead>
                  <TableHead>{t("reports.orders")}</TableHead>
                  <TableHead>{t("reports.customers")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData?.dailySales.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{formatDate(day.date)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(day.revenue)}
                    </TableCell>
                    <TableCell>
                      {day.orders} {t("reports.count")}
                    </TableCell>
                    <TableCell>
                      {day.customers} {t("reports.count")}
                    </TableCell>
                  </TableRow>
                ))}
                {(!salesData?.dailySales || salesData.dailySales.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-500"
                    >
                      {t("reports.noDataDescription")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.paymentMethods")}</CardTitle>
            <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData?.paymentMethods.map((payment) => {
                const percentage =
                  (salesData?.totalRevenue || 0) > 0
                    ? (payment.revenue / (salesData?.totalRevenue || 1)) * 100
                    : 0;

                return (
                  <div key={payment.method} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getPaymentMethodLabel(payment.method)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {payment.count} {t("reports.count")}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(payment.revenue)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}

              {(!salesData?.paymentMethods || salesData.paymentMethods.length === 0) && (
                <div className="text-center text-gray-500 py-4">
                  {t("reports.noPaymentData")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderProductAnalysis = () => {
    if (!menuData) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}</div>
        </div>
      );
    }

    const displayData = menuData || {
      totalRevenue: 0,
      totalQuantity: 0,
      categoryStats: [],
      productStats: [],
      topSellingProducts: [],
      topRevenueProducts: [],
    };

    return (
      <>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.totalRevenue")}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(displayData.totalRevenue)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.totalQuantitySold")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Number(displayData.totalQuantity || 0).toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.uniqueProducts")}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {displayData.productStats.length}
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {t("reports.popularMenuByQuantity")}
              </CardTitle>
              <CardDescription>
                {t("reports.popularMenuByQuantityDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.rank")}</TableHead>
                    <TableHead>{t("reports.menuName")}</TableHead>
                    <TableHead>{t("reports.salesCount")}</TableHead>
                    <TableHead>{t("reports.revenue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.topSellingProducts
                    .slice(0, 10)
                    .map((item: any, index: number) => (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "outline"}>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.product.name}
                        </TableCell>
                        <TableCell>
                          {item.quantity} {t("common.items")}
                        </TableCell>
                        <TableCell>{formatCurrency(item.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  {displayData.topSellingProducts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-500"
                      >
                        {t("reports.noSalesData")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Revenue Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t("reports.highRevenueMenu")}
              </CardTitle>
              <CardDescription>
                {t("reports.highRevenueMenuDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.rank")}</TableHead>
                    <TableHead>{t("reports.menuName")}</TableHead>
                    <TableHead>{t("reports.revenue")}</TableHead>
                    <TableHead>{t("reports.salesCount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.topRevenueProducts
                    .slice(0, 10)
                    .map((item: any, index: number) => (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "outline"}>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.product.name}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                        <TableCell>
                          {item.quantity} {t("common.items")}
                        </TableCell>
                      </TableRow>
                    ))}
                  {displayData.topRevenueProducts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-500"
                      >
                        {t("reports.noRevenueData")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  const renderEmployeeAnalysis = () => {
    const data = getEmployeeSalesData();

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.seller")}</TableHead>
                <TableHead className="text-right">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.orders")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.employee}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.returnValue)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.netRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.orderCount}
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

  const renderCustomerAnalysis = () => {
    const data = getCustomerSalesData();

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.customerId")}</TableHead>
                <TableHead>{t("reports.customerName")}</TableHead>
                <TableHead className="text-right">
                  {t("reports.customerRevenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.customerReturnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.customerNetRevenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.orders")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.customer.id}
                    </TableCell>
                    <TableCell>{item.customer.name}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.returnValue)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.netRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.orderCount}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
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

  const renderChannelAnalysis = () => {
    if (!salesChannelData) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}</div>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("reports.salesChannelReport")}
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
                <TableHead className="min-w-[150px]">
                  {t("reports.salesChannelFilter")}
                </TableHead>
                <TableHead className="text-right min-w-[120px]">
                  {t("reports.salesChannelRevenue")}
                </TableHead>
                <TableHead className="text-right min-w-[120px]">
                  {t("reports.salesChannelReturnValue")}
                </TableHead>
                <TableHead className="text-right min-w-[120px]">
                  {t("reports.salesChannelNetRevenue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesChannelData &&
              Array.isArray(salesChannelData) &&
              salesChannelData.length > 0 ? (
                salesChannelData.map((item: any, index: number) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">
                          {item.salesChannelName || "N/A"}
                        </div>
                        {item.sellerName && (
                          <div className="text-sm text-gray-500">
                            {item.sellerName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.revenue || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.returnValue || 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(item.netRevenue || 0)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-gray-500"
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

  const chartConfig = {
    revenue: {
      label: t("reports.revenue"),
      color: "#10b981",
    },
    netRevenue: {
      label: t("reports.netRevenue"),
      color: "#3b82f6",
    },
    quantity: {
      label: t("reports.quantity"),
      color: "#f59e0b",
    },
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {getAnalysisTitle()}
              </CardTitle>
              <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* Analysis Type Selector */}
              <div className="flex items-center gap-2">
                <Label>{t("reports.analysisType")}:</Label>
                <Select value={analysisType} onValueChange={setAnalysisType}>
                  <SelectTrigger className="w-48">
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
                <>
                  <Select value={dateRange} onValueChange={handleDateRangeChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t("reports.toDay")}</SelectItem>
                      <SelectItem value="week">{t("reports.lastWeek")}</SelectItem>
                      <SelectItem value="month">
                        {t("reports.lastMonth")}
                      </SelectItem>
                      <SelectItem value="custom">{t("reports.custom")}</SelectItem>
                    </SelectContent>
                  </Select>

                  {dateRange === "custom" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label>{t("reports.startDate")}:</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-auto"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>{t("reports.endDate")}:</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-auto"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Additional Filters for Non-Time Analysis */}
      {analysisType !== "time" && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Range */}
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

              {/* Product Analysis Filters */}
              {analysisType === "product" && (
                <>
                  <div>
                    <Label>{t("reports.productFilter")}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder={t("reports.productFilterPlaceholder")}
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t("common.category")}</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {categories?.map((category: any) => (
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
                </>
              )}

              {/* Employee Analysis Filters */}
              {analysisType === "employee" && (
                <div>
                  <Label>{t("reports.seller")}</Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {employees?.map((employee: any) => (
                        <SelectItem key={employee.id} value={employee.name}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Customer Analysis Filters */}
              {analysisType === "customer" && (
                <div>
                  <Label>{t("reports.customerFilter")}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.customerFilterPlaceholder")}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Channel Analysis Filters */}
              {analysisType === "channel" && (
                <>
                  <div>
                    <Label>{t("reports.sellerFilter")}</Label>
                    <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {employees?.map((employee: any) => (
                          <SelectItem
                            key={employee.id}
                            value={employee.id.toString()}
                          >
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("reports.salesChannelFilter")}</Label>
                    <Select
                      value={selectedSalesChannel}
                      onValueChange={setSelectedSalesChannel}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        <SelectItem value="direct">
                          {t("reports.directSales")}
                        </SelectItem>
                        <SelectItem value="other">
                          {t("reports.otherSales")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart Display - Only for non-time analysis */}
      {analysisType !== "time" && getChartData().length > 0 && (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-white/90 text-sm font-normal">
                  {t("reports.chartView")}
                </div>
                <div className="text-white font-semibold">
                  {getAnalysisTitle()}
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              {t("reports.visualRepresentation")} - {t("reports.fromDate")}:{" "}
              {formatDate(startDate)} {t("reports.toDate")}: {formatDate(endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
            <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/20 rounded-xl"></div>

              <div className="relative z-10 h-full">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getChartData()}
                      margin={{ top: 30, right: 40, left: 30, bottom: 90 }}
                      barCategoryGap="25%"
                    >
                      <defs>
                        <linearGradient
                          id="revenueGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#10b981"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="100%"
                            stopColor="#10b981"
                            stopOpacity={0.6}
                          />
                        </linearGradient>
                        <linearGradient
                          id="netRevenueGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3b82f6"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="100%"
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
                          <stop
                            offset="0%"
                            stopColor="#f59e0b"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="100%"
                            stopColor="#f59e0b"
                            stopOpacity={0.6}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="2 4"
                        stroke="#e2e8f0"
                        opacity={0.4}
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
                        angle={-35}
                        textAnchor="end"
                        height={85}
                        interval={0}
                        tickMargin={12}
                        axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                        tickLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `${(value / 1000000).toFixed(1)}M`;
                          } else if (value >= 1000) {
                            return `${(value / 1000).toFixed(0)}K`;
                          }
                          return value.toString();
                        }}
                        width={70}
                        axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                        tickLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        labelStyle={{
                          color: "#1e293b",
                          fontWeight: 600,
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.98)",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          boxShadow:
                            "0 10px 25px -5px rgb(0 0 0 / 0.15), 0 4px 6px -2px rgb(0 0 0 / 0.05)",
                          padding: "12px 16px",
                          backdropFilter: "blur(8px)",
                        }}
                        cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                      />

                      {analysisType === "product" && (
                        <>
                          <Bar
                            dataKey="revenue"
                            fill="url(#revenueGradient)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={45}
                            stroke="#059669"
                            strokeWidth={1}
                            name={t("reports.revenue")}
                          />
                          <Bar
                            dataKey="quantity"
                            fill="url(#quantityGradient)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={45}
                            stroke="#d97706"
                            strokeWidth={1}
                            name={t("reports.quantity")}
                          />
                        </>
                      )}

                      {(analysisType === "employee" || analysisType === "customer" || analysisType === "channel") && (
                        <>
                          <Bar
                            dataKey="revenue"
                            fill="url(#revenueGradient)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={45}
                            stroke="#059669"
                            strokeWidth={1}
                            name={t("reports.revenue")}
                          />
                          <Bar
                            dataKey="netRevenue"
                            fill="url(#netRevenueGradient)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={45}
                            stroke="#2563eb"
                            strokeWidth={1}
                            name={t("reports.netRevenue")}
                          />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Content */}
      {analysisType === "time" && renderTimeAnalysis()}
      {analysisType === "product" && renderProductAnalysis()}
      {analysisType === "employee" && renderEmployeeAnalysis()}
      {analysisType === "customer" && renderCustomerAnalysis()}
      {analysisType === "channel" && renderChannelAnalysis()}
    </div>
  );
}
