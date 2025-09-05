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
import { useTranslation } from "@/lib/i18n";
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

  // Query orders by date range - using real order data
  const { data: orders = [], isLoading: ordersLoading, error: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/orders/date-range/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  const getSalesData = () => {
    // Default return structure for empty data
    const defaultData = {
      dailySales: [],
      paymentMethods: [],
      hourlySales: {},
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      averageOrderValue: 0,
    };

    try {
      // Use only completed/paid orders
      const completedOrders = orders.filter((order: any) => 
        order.status === 'paid' || order.status === 'completed'
      );

      if (completedOrders.length === 0) {
        return defaultData;
      }

      // Daily sales breakdown
      const dailySales: {
        [date: string]: { revenue: number; orders: number; customers: number };
      } = {};

      completedOrders.forEach((order: any) => {
        try {
          const orderDate = new Date(order.orderedAt || order.createdAt);
          if (isNaN(orderDate.getTime())) return;

          const dateStr = orderDate.toISOString().split('T')[0];

          if (!dailySales[dateStr]) {
            dailySales[dateStr] = { revenue: 0, orders: 0, customers: 0 };
          }

          const orderTotal = Number(order.total || 0);
          const orderDiscount = Number(order.discount || 0);
          const revenue = orderTotal - orderDiscount;

          dailySales[dateStr].revenue += revenue;
          dailySales[dateStr].orders += 1;
          dailySales[dateStr].customers += Number(order.customerCount || 1);
        } catch (error) {
          console.warn("Error processing order for daily sales:", error);
        }
      });

      // Payment method breakdown
      const paymentMethods: {
        [method: string]: { count: number; revenue: number };
      } = {};

      completedOrders.forEach((order: any) => {
        try {
          let method = order.paymentMethod || "cash";
          if (typeof method === 'number') {
            const methodMap: { [key: number]: string } = {
              1: "cash",
              2: "card", 
              3: "transfer",
              4: "momo",
              5: "zalopay",
              6: "vnpay"
            };
            method = methodMap[method] || "cash";
          }

          if (!paymentMethods[method]) {
            paymentMethods[method] = { count: 0, revenue: 0 };
          }

          paymentMethods[method].count += 1;

          const orderTotal = Number(order.total || 0);
          const orderDiscount = Number(order.discount || 0);
          const revenue = orderTotal - orderDiscount;

          paymentMethods[method].revenue += revenue;
        } catch (error) {
          console.warn("Error processing order for payment methods:", error);
        }
      });

      // Hourly breakdown
      const hourlySales: { [hour: number]: number } = {};
      completedOrders.forEach((order: any) => {
        try {
          const orderDate = new Date(order.orderedAt || order.createdAt);
          if (isNaN(orderDate.getTime())) return;

          const hour = orderDate.getHours();
          const orderTotal = Number(order.total || 0);
          const orderDiscount = Number(order.discount || 0);
          const revenue = orderTotal - orderDiscount;

          if (!isNaN(revenue) && revenue > 0) {
            hourlySales[hour] = (hourlySales[hour] || 0) + revenue;
          }
        } catch (error) {
          console.warn("Error processing order for hourly sales:", error);
        }
      });

      // Calculate totals
      const totalRevenue = completedOrders.reduce((total: number, order: any) => {
        const orderTotal = Number(order.total || 0);
        const orderDiscount = Number(order.discount || 0);
        return total + (orderTotal - orderDiscount);
      }, 0);

      const totalOrders = completedOrders.length;
      const totalCustomers = completedOrders.reduce((total: number, order: any) => {
        return total + Number(order.customerCount || 1);
      }, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const paymentMethodsArray = Object.entries(paymentMethods).map(([method, data]) => ({
        method,
        ...data,
      }));

      return {
        dailySales: Object.entries(dailySales)
          .map(([date, data]) => ({
            date,
            ...data,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        paymentMethods: paymentMethodsArray,
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
      return date.toLocaleDateString("vi-VN");
    } catch (error) {
      return dateStr;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: "Tiền mặt",
      card: "Thẻ",
      creditCard: "Thẻ tín dụng",
      credit_card: "Thẻ tín dụng",
      debitCard: "Thẻ ghi nợ",
      debit_card: "Thẻ ghi nợ",
      transfer: "Chuyển khoản",
      einvoice: "Hóa đơn điện tử",
      momo: "MoMo",
      zalopay: "ZaloPay",
      vnpay: "VNPay",
      qrCode: "QR Banking",
      shopeepay: "ShopeePay",
      grabpay: "GrabPay",
      mobile: "Di động",
    };
    return labels[method as keyof typeof labels] || `Phương thức ${method}`;
  };

  const handleRefresh = () => {
    refetchOrders();
  };

  const salesData = getSalesData();
  const hasError = !!ordersError;
  const isLoading = ordersLoading;

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
            {t("tables.refresh")}
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
                {t('tables.salesAnalysis')}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {t('tables.analyzeRevenue')}
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
                    <SelectItem value="today">{t("tables.toDay")}</SelectItem>
                    <SelectItem value="thisWeek">Tuần này</SelectItem>
                    <SelectItem value="week">Tuần trước</SelectItem>
                    <SelectItem value="thisMonth">Tháng này</SelectItem>
                    <SelectItem value="month">Tháng trước</SelectItem>
                    <SelectItem value="custom">{t("tables.custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="startDate" className="text-sm whitespace-nowrap">
                      {t('tables.startDate')}:
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
                      {t('tables.endDate')}:
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
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {t("tables.refresh")}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {isLoading ? (
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
                      {t("tables.totalRevenue")}
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
                      {t("tables.totalOrders")}
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
                    {t("tables.averageOrderValue")}
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
                    {t("tables.totalCustomers")}
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {salesData?.totalCustomers || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("tables.peakHour")}: {peakHour}{t("tables.hour")}
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
                  {t("tables.dailySales")}
                </CardTitle>
                <CardDescription>{t("tables.analyzeRevenue")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-white">Ngày</TableHead>
                        <TableHead className="sticky top-0 bg-white">{t("tables.revenue")}</TableHead>
                        <TableHead className="sticky top-0 bg-white">Tổng đơn hàng</TableHead>
                        <TableHead className="sticky top-0 bg-white">Tổng khách hàng</TableHead>
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
                            <TableCell>{day.orders}</TableCell>
                            <TableCell>{day.customers}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            {t("tables.noSalesData")}
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
                  {t("tables.paymentMethods")}
                </CardTitle>
                <CardDescription>
                  {t("tables.analyzeRevenue")}
                  {salesData?.paymentMethods && salesData.paymentMethods.length > 0 && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({salesData.paymentMethods.length} phương thức • {salesData.totalOrders} đơn hàng)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-white">Phương thức</TableHead>
                        <TableHead className="sticky top-0 bg-white text-right">Số đơn</TableHead>
                        <TableHead className="sticky top-0 bg-white text-right">Doanh thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData?.paymentMethods && salesData.paymentMethods.length > 0 ? (
                        salesData.paymentMethods.map((method, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <Badge variant="outline">
                                {getPaymentMethodLabel(method.method)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{method.count}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(method.revenue)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                            Không có dữ liệu phương thức thanh toán
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}