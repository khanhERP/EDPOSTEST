
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
import { TrendingUp, Calendar, DollarSign, Users, RefreshCw, Filter } from "lucide-react";
import type { Transaction } from "@shared/schema";
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

  // Fetch orders with proper error handling (like dashboard)
  const { data: orders, isLoading: ordersLoading, error: ordersError, refetch } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.status}`);
        }
        const data = await response.json();
        
        // Ensure we always return an array
        if (!Array.isArray(data)) {
          console.warn("Orders API returned non-array data:", data);
          return [];
        }
        
        return data;
      } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    retry: 3,
    refetchOnWindowFocus: false,
  });

  const getSalesData = () => {
    // Default return structure
    const defaultData = {
      dailySales: [],
      paymentMethods: [],
      hourlySales: {},
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      averageOrderValue: 0,
    };

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return defaultData;
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Filter completed orders by date range (like dashboard)
      const filteredOrders = orders.filter((order: any) => {
        // Check if order is completed/paid
        if (order.status !== 'completed' && order.status !== 'paid') return false;

        // Try multiple possible date fields
        const orderDate = new Date(
          order.orderedAt || order.createdAt || order.created_at || order.paidAt
        );

        // Skip if date is invalid
        if (isNaN(orderDate.getTime())) {
          return false;
        }

        return orderDate >= start && orderDate <= end;
      });

      // Daily sales breakdown with error handling
      const dailySales: {
        [date: string]: { revenue: number; orders: number; customers: number };
      } = {};

      filteredOrders.forEach((order: any) => {
        try {
          const orderDate = new Date(
            order.orderedAt || order.createdAt || order.created_at || order.paidAt
          );

          if (isNaN(orderDate.getTime())) return;

          const date = orderDate.toISOString().split('T')[0];

          if (!dailySales[date]) {
            dailySales[date] = { revenue: 0, orders: 0, customers: 0 };
          }

          const orderTotal = Number(order.total || 0);
          const discount = Number(order.discount || 0);
          const revenue = orderTotal - discount;
          
          if (!isNaN(revenue) && revenue >= 0) {
            dailySales[date].revenue += revenue;
            dailySales[date].orders += 1;
            // Count unique customers
            if (order.customerId) {
              dailySales[date].customers += 1;
            } else {
              dailySales[date].customers += 1; // Count as unique per order
            }
          }
        } catch (error) {
          console.warn("Error processing order for daily sales:", error);
        }
      });

      // Payment method breakdown with proper consolidation
      const paymentMethods: {
        [method: string]: { count: number; revenue: number };
      } = {};

      const consolidatePaymentMethod = (method: string): string => {
        if (!method) return 'cash';
        
        const normalizedMethod = method.toLowerCase().trim();
        switch (normalizedMethod) {
          case 'credit_card':
          case 'creditcard':
          case 'credit card':
            return 'credit_card';
          case 'debit_card':
          case 'debitcard':
          case 'debit card':
            return 'debit_card';
          case 'qr_code':
          case 'qrcode':
          case 'qr code':
            return 'qrCode';
          case 'card':
            return 'card';
          case 'transfer':
          case 'bank_transfer':
          case 'bank transfer':
            return 'transfer';
          case 'cash':
          case 'tiền mặt':
            return 'cash';
          case 'momo':
            return 'momo';
          case 'zalopay':
            return 'zalopay';
          case 'vnpay':
            return 'vnpay';
          case 'shopeepay':
            return 'shopeepay';
          case 'grabpay':
            return 'grabpay';
          default:
            return normalizedMethod;
        }
      };

      filteredOrders.forEach((order: any) => {
        try {
          const rawMethod = order.paymentMethod || order.payment_method || "cash";
          const method = consolidatePaymentMethod(rawMethod);
          
          if (!paymentMethods[method]) {
            paymentMethods[method] = { count: 0, revenue: 0 };
          }
          
          const orderTotal = Number(order.total || 0);
          const discount = Number(order.discount || 0);
          const revenue = orderTotal - discount;
          
          if (!isNaN(revenue) && revenue > 0) {
            paymentMethods[method].revenue += revenue;
            paymentMethods[method].count += 1;
          }
        } catch (error) {
          console.warn("Error processing order for payment methods:", error);
        }
      });

      // Hourly breakdown with error handling
      const hourlySales: { [hour: number]: number } = {};
      filteredOrders.forEach((order: any) => {
        try {
          const orderDate = new Date(
            order.orderedAt || order.createdAt || order.created_at || order.paidAt
          );
          
          if (isNaN(orderDate.getTime())) return;
          
          const hour = orderDate.getHours();
          const orderTotal = Number(order.total || 0);
          const discount = Number(order.discount || 0);
          const revenue = orderTotal - discount;
          
          if (!isNaN(revenue) && revenue > 0) {
            hourlySales[hour] = (hourlySales[hour] || 0) + revenue;
          }
        } catch (error) {
          console.warn("Error processing order for hourly sales:", error);
        }
      });

      // Calculate totals with validation (like dashboard)
      const totalRevenue = filteredOrders.reduce(
        (sum: number, order: any) => {
          const orderTotal = Number(order.total || 0);
          const discount = Number(order.discount || 0);
          return sum + (orderTotal - discount);
        },
        0,
      );
      
      const totalOrders = filteredOrders.length;
      
      // Count unique customers
      const uniqueCustomers = new Set();
      filteredOrders.forEach((order: any) => {
        if (order.customerId) {
          uniqueCustomers.add(order.customerId);
        } else {
          uniqueCustomers.add(`order_${order.id}`);
        }
      });
      const totalCustomers = uniqueCustomers.size;
      
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
    } catch (error) {
      console.error("Error processing sales data:", error);
      return defaultData;
    }
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const d = date.getDate().toString().padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    switch (range) {
      case "today":
        const todayStr = formatDate(today);
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
        
      case "week":
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - 1);
        
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 7);

        setStartDate(formatDate(lastWeekStart));
        setEndDate(formatDate(lastWeekEnd));
        break;
        
      case "month":
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        
        const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

        setStartDate(formatDate(lastMonthStart));
        setEndDate(formatDate(lastMonthEnd));
        break;

      case "thisWeek":
        const currentDayOfWeek = today.getDay();
        const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

        const thisWeekMonday = new Date(today);
        thisWeekMonday.setDate(today.getDate() - daysToMonday);

        const thisWeekSunday = new Date(thisWeekMonday);
        thisWeekSunday.setDate(thisWeekMonday.getDate() + 6);

        setStartDate(formatDate(thisWeekMonday));
        setEndDate(formatDate(thisWeekSunday));
        break;

      case "thisMonth":
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setStartDate(formatDate(thisMonthStart));
        setEndDate(formatDate(thisMonthEnd));
        break;
        
      case "custom":
        const customToday = formatDate(today);
        setStartDate(customToday);
        setEndDate(customToday);
        break;
        
      default:
        const defaultDate = formatDate(today);
        setStartDate(defaultDate);
        setEndDate(defaultDate);
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateStr;
    }
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
    refetch();
  };

  const salesData = getSalesData();
  const hasError = !!ordersError;

  const peakHour = salesData && Object.keys(salesData.hourlySales).length > 0 
    ? Object.entries(salesData.hourlySales).reduce(
        (peak, [hour, revenue]) =>
          revenue > (salesData.hourlySales[parseInt(peak)] || 0) ? hour : peak,
        "12",
      )
    : "12";

  // Loading state component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-20 bg-gray-200 rounded animate-pulse"></div>
      ))}
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <Card className="border-red-200">
      <CardContent className="p-6">
        <div className="text-center text-red-600">
          <p className="mb-4">{t("common.errorLoadingData")}</p>
          <p className="text-sm text-gray-600 mb-4">
            {ordersError?.message || "Không thể tải dữ liệu đơn hàng"}
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("reports.refresh")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card className="border-green-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-green-700 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t('reports.salesAnalysis')}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {t('reports.analyzeRevenue')}
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{t("reports.toDay")}</SelectItem>
                    <SelectItem value="thisWeek">Tuần này</SelectItem>
                    <SelectItem value="week">Tuần trước</SelectItem>
                    <SelectItem value="thisMonth">Tháng này</SelectItem>
                    <SelectItem value="month">Tháng trước</SelectItem>
                    <SelectItem value="custom">{t("reports.custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="startDate" className="text-sm whitespace-nowrap">
                      {t('reports.startDate')}:
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="endDate" className="text-sm whitespace-nowrap">
                      {t('reports.endDate')}:
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={ordersLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                {t("reports.refresh")}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {ordersLoading ? (
        <LoadingSkeleton />
      ) : hasError ? (
        <ErrorState />
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="border-green-200 hover:shadow-md transition-shadow">
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

            <Card className="border-blue-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("reports.totalOrders")}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {salesData?.totalOrders || 0}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.averageOrderValue")}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(salesData?.averageOrderValue || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.totalCustomers")}
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {salesData?.totalCustomers || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("reports.peakHour")}: {peakHour}{t("reports.hour")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {t("reports.dailySales")}
                </CardTitle>
                <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-white">{t("common.date")}</TableHead>
                        <TableHead className="sticky top-0 bg-white">{t("reports.revenue")}</TableHead>
                        <TableHead className="sticky top-0 bg-white">{t("reports.orders")}</TableHead>
                        <TableHead className="sticky top-0 bg-white">{t("reports.customers")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData?.dailySales && salesData.dailySales.length > 0 ? (
                        salesData.dailySales.map((day) => (
                          <TableRow key={day.date} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatCurrency(day.revenue)}
                            </TableCell>
                            <TableCell>
                              {day.orders} {t("common.items")}
                            </TableCell>
                            <TableCell>
                              {day.customers} {t("common.items")}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            {t("reports.noSalesData")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {t("reports.paymentMethods")}
                </CardTitle>
                <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {salesData?.paymentMethods && salesData.paymentMethods.length > 0 ? (
                    salesData.paymentMethods.map((payment) => {
                      const percentage =
                        (salesData?.totalRevenue || 0) > 0
                          ? (Number(payment.revenue) / Number(salesData?.totalRevenue || 1)) * 100
                          : 0;

                      return (
                        <div key={payment.method} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-medium">
                                {getPaymentMethodLabel(payment.method)}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {payment.count} {t("common.items")}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">
                                {formatCurrency(payment.revenue)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {isFinite(percentage) ? percentage.toFixed(1) : '0.0'}%
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <p className="text-gray-600 mb-2">{t("reports.noPaymentData")}</p>
                        <p className="text-sm text-gray-500">{t("reports.noPaymentDataDescription")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
