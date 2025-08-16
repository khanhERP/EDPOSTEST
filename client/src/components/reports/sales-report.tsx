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
import { Button } from "@/components/ui/button";

export function SalesReport() {
  const { t } = useTranslation();

  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );



  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${startDate}/${endDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });





  const getSalesData = () => {
    if (!transactions || !Array.isArray(transactions)) {
      return {
        dailySales: [],
        paymentMethods: [],
        hourlySales: {},
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
      };
    }

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );

      // Tạo date objects để so sánh chính xác  
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // So sánh với timestamp thực
      const transactionTimestamp = transactionDate.getTime();
      const startTimestamp = start.getTime();
      const endTimestamp = end.getTime();

      const isInRange = transactionTimestamp >= startTimestamp && transactionTimestamp <= endTimestamp;
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

      // Đảm bảo format ngày nhất quán - luôn sử dụng UTC để tránh timezone issues
      const year = transactionDate.getFullYear();
      const month = (transactionDate.getMonth() + 1).toString().padStart(2, "0");
      const day = transactionDate.getDate().toString().padStart(2, "0");
      const date = `${year}-${month}-${day}`;

      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, orders: 0, customers: 0 };
      }

      const amount = Number(transaction.total || 0);
      dailySales[date].revenue += isNaN(amount) ? 0 : amount;
      dailySales[date].orders += 1;
      dailySales[date].customers += 1; // Each transaction represents one customer
    });

    // Payment method breakdown
    const paymentMethods: {
      [method: string]: { count: number; revenue: number };
    } = {};

    // Map to consolidate similar payment methods
    const consolidatePaymentMethod = (method: string): string => {
      switch (method.toLowerCase()) {
        case 'credit_card':
        case 'creditcard':
          return 'credit_card';
        case 'debit_card':
        case 'debitcard':
          return 'debit_card';
        case 'qr_code':
        case 'qrcode':
          return 'qrCode';
        case 'card':
          return 'card';
        case 'transfer':
        case 'bank_transfer':
          return 'transfer';
        default:
          return method;
      }
    };

    filteredTransactions.forEach((transaction: any) => {
      const rawMethod = transaction.paymentMethod || "cash";
      const method = consolidatePaymentMethod(rawMethod);
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, revenue: 0 };
      }
      const amount = Number(transaction.total || 0);
      paymentMethods[method].revenue += isNaN(amount) ? 0 : amount;
      paymentMethods[method].count += 1;
    });

    // Hourly breakdown
    const hourlySales: { [hour: number]: number } = {};

    filteredTransactions.forEach((transaction: any) => {
      const hour = new Date(
        transaction.createdAt || transaction.created_at,
      ).getHours();
      hourlySales[hour] = (hourlySales[hour] || 0) + Number(transaction.total || 0);
    });

    // Total stats
    const totalRevenue = filteredTransactions.reduce(
      (sum: number, transaction: any) => sum + Number(transaction.total || 0),
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



  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();

    switch (range) {
      case "today":
        setStartDate(today.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "week":
        // Tuần hiện tại: từ thứ 2 đến chủ nhật
        const currentDayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Tính số ngày từ thứ 2

        const thisWeekMonday = new Date(today);
        thisWeekMonday.setDate(today.getDate() - daysToMonday);

        const thisWeekSunday = new Date(thisWeekMonday);
        thisWeekSunday.setDate(thisWeekMonday.getDate() + 6);

        setStartDate(thisWeekMonday.toISOString().split("T")[0]);
        setEndDate(thisWeekSunday.toISOString().split("T")[0]);
        break;
      case "month":
        // Tháng hiện tại: từ ngày 1 đến ngày cuối tháng
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Ngày đầu tháng hiện tại
        const monthStart = new Date(year, month, 1);
        // Ngày cuối tháng hiện tại
        const monthEnd = new Date(year, month + 1, 0);

        // Format thành YYYY-MM-DD
        const startDateStr = `${monthStart.getFullYear()}-${(monthStart.getMonth() + 1).toString().padStart(2, "0")}-${monthStart.getDate().toString().padStart(2, "0")}`;
        const endDateStr = `${monthEnd.getFullYear()}-${(monthEnd.getMonth() + 1).toString().padStart(2, "0")}-${monthEnd.getDate().toString().padStart(2, "0")}`;

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

  const handleRefresh = () => {
    // Refresh logic would go here, e.g., refetching data
    // For now, we can just log it or perhaps reset state if needed
    console.log("Refresh button clicked");
  };


  const salesData = getSalesData();
  const isLoading = transactionsLoading || !transactions;

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
                {isLoading ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse mt-2"></div>
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(salesData?.totalRevenue || 0)}
                  </p>
                )}
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
                {isLoading ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse mt-2"></div>
                ) : (
                  <p className="text-2xl font-bold">{salesData?.totalOrders || 0}</p>
                )}
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
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse mt-2"></div>
              ) : (
                <p className="text-2xl font-bold">
                  {formatCurrency(salesData?.averageOrderValue || 0)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t("reports.totalCustomers")}
              </p>
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse mt-2"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold">{salesData?.totalCustomers || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("reports.peakHour")}: {peakHour}
                    {t("reports.hour")}
                  </p>
                </>
              )}
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
                {isLoading ? (
                  // Skeleton rows for loading state
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <>
                    {salesData?.dailySales.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{formatDate(day.date)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(day.revenue)}
                        </TableCell>
                        <TableCell>
                          {day.orders} {t("common.items")}
                        </TableCell>
                        <TableCell>
                          {day.customers} {t("common.items")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!salesData?.dailySales || salesData.dailySales.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-gray-500"
                        >
                          {t("common.noData")}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
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
              {isLoading ? (
                // Skeleton for payment methods loading
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gray-300 h-2 rounded-full animate-pulse w-1/3"></div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {salesData?.paymentMethods.map((payment) => {
                    const percentage =
                      (salesData?.totalRevenue || 0) > 0
                        ? (Number(payment.revenue) / Number(salesData?.totalRevenue || 1)) * 100
                        : 0;

                    return (
                      <div key={payment.method} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getPaymentMethodLabel(payment.method)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {payment.count} {t("common.items")}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(payment.revenue)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {isFinite(percentage) ? percentage.toFixed(1) : '0.0'}%
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
                      {t("common.noData")}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );



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
              <CardTitle className="text-lg font-semibold">
                {t('reports.salesAnalysis')}
              </CardTitle>
              <CardDescription>
                {t('reports.analyzeRevenue')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">

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
                    <Label htmlFor="startDate">{t('reports.startDate')}:</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="endDate">{t('reports.endDate')}:</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Analysis Content */}
      {renderTimeAnalysis()}
    </div>
  );
}