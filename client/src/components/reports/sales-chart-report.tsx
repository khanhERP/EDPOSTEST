import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  CalendarIcon,
  Download,
  RotateCcw,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Search,
  Package,
  BarChart3,
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FF6B6B",
  "#4ECDC4",
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function SalesChartReport() {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [periodFilter, setPeriodFilter] = useState<string>("today");
  const [chartType, setChartType] = useState<string>("revenue");
  const [viewType, setViewType] = useState<string>("daily");

  // Fetch data for filters
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });


  // Update date range based on period filter
  React.useEffect(() => {
    const today = new Date();
    switch (periodFilter) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "week":
        setStartDate(subDays(today, 7));
        setEndDate(today);
        break;
      case "month":
        setStartDate(subDays(today, 30));
        setEndDate(today);
        break;
      case "custom":
        // Keep current dates
        break;
      default:
        setStartDate(today);
        setEndDate(today);
    }
  }, [periodFilter]);

  // Query orders by date range
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/orders/date-range/${format(
            startDate,
            "yyyy-MM-dd",
          )}/${format(endDate, "yyyy-MM-dd")}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error("Orders fetch error:", error);
        return [];
      }
    },
    retry: 2,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query order items for detailed analysis
  const { data: orderItems = [], isLoading: orderItemsLoading } = useQuery({
    queryKey: ["/api/order-items"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/order-items");
        if (!response.ok) {
          throw new Error("Failed to fetch order items");
        }
        return response.json();
      } catch (error) {
        console.error("Order items fetch error:", error);
        return [];
      }
    },
    retry: 2,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate chart data from real order data
  const chartData = useMemo(() => {
    try {
      // Filter orders by date range and status
      const filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const isInDateRange =
          orderDate >= startOfDay(startDate) && orderDate <= endOfDay(endDate);
        return isInDateRange;
      });

      const completedOrders = filteredOrders.filter(
        (order: any) => order.status === "paid" || order.status === "completed",
      );

      // Calculate basic metrics
      const totalRevenue = completedOrders.reduce((sum: number, order: any) => {
        return (
          sum +
          (parseFloat(order.total) ||
            parseFloat(order.storedTotal) ||
            0)
        );
      }, 0);

      const totalOrders = completedOrders.length;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate data based on view type
      let timeSeriesData: any[] = [];

      if (viewType === "daily") {
        const dailySales = new Map();
        completedOrders.forEach((order: any) => {
          const orderDate = new Date(order.orderedAt || order.createdAt);
          const dateKey = format(orderDate, "yyyy-MM-dd");

          if (!dailySales.has(dateKey)) {
            dailySales.set(dateKey, {
              date: dateKey,
              dateDisplay: format(orderDate, "dd/MM"),
              revenue: 0,
              orders: 0,
              customers: new Set(),
            });
          }

          const dayData = dailySales.get(dateKey);
          dayData.revenue +=
            parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
          dayData.orders += 1;
          if (order.customerId) {
            dayData.customers.add(order.customerId);
          }
        });

        timeSeriesData = Array.from(dailySales.values())
          .map((day) => ({
            ...day,
            customers: day.customers.size,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      } else if (viewType === "hourly") {
        const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
          hour,
          hourDisplay: `${hour}:00`,
          revenue: 0,
          orders: 0,
          customers: new Set(),
        }));

        completedOrders.forEach((order: any) => {
          const orderDate = new Date(order.orderedAt || order.createdAt);
          const hour = orderDate.getHours();
          hourlySales[hour].revenue +=
            parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
          hourlySales[hour].orders += 1;
          if (order.customerId) {
            hourlySales[hour].customers.add(order.customerId);
          }
        });

        timeSeriesData = hourlySales
          .map((hour) => ({
            ...hour,
            customers: hour.customers.size,
          }))
          .filter((h) => h.revenue > 0 || h.orders > 0);
      }

      // Payment method distribution
      const paymentMethods = new Map();
      completedOrders.forEach((order: any) => {
        const method = order.paymentMethod || "cash";
        if (!paymentMethods.has(method)) {
          paymentMethods.set(method, {
            method,
            count: 0,
            revenue: 0,
            percentage: 0,
          });
        }
        const methodData = paymentMethods.get(method);
        methodData.count += 1;
        methodData.revenue +=
          parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
      });

      // Calculate percentages
      paymentMethods.forEach((methodData) => {
        methodData.percentage =
          totalRevenue > 0 ? (methodData.revenue / totalRevenue) * 100 : 0;
      });

      // Sales channel distribution
      const salesChannels = new Map();
      completedOrders.forEach((order: any) => {
        const channel = order.salesChannel || "pos";
        if (!salesChannels.has(channel)) {
          salesChannels.set(channel, {
            channel,
            count: 0,
            revenue: 0,
            percentage: 0,
          });
        }
        const channelData = salesChannels.get(channel);
        channelData.count += 1;
        channelData.revenue +=
          parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
      });

      // Calculate percentages for channels
      salesChannels.forEach((channelData) => {
        channelData.percentage =
          totalRevenue > 0 ? (channelData.revenue / totalRevenue) * 100 : 0;
      });

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        timeSeriesData,
        paymentMethodData: Array.from(paymentMethods.values()),
        salesChannelData: Array.from(salesChannels.values()),
      };
    } catch (error) {
      console.error("Chart data calculation error:", error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        timeSeriesData: [],
        paymentMethodData: [],
        salesChannelData: [],
      };
    }
  }, [
    orders,
    orderItems,
    startDate,
    endDate,
    viewType,
    periodFilter,
    chartType,
  ]);

  const resetFilters = () => {
    setPeriodFilter("today");
    setStartDate(new Date());
    setEndDate(new Date());
    setChartType("revenue");
    setViewType("daily");
  };

  const exportData = () => {
    const csvData = chartData.timeSeriesData.map((item) => ({
      date: item.date || item.hourDisplay,
      revenue: item.revenue,
      orders: item.orders,
      customers: item.customers,
    }));

    console.log("Export chart data:", csvData);
    // In a real implementation, you would convert to CSV and download
  };

  const isLoading = ordersLoading || orderItemsLoading;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-800">
          {t("reports.salesChart")}
        </h1>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("common.export")}
          </Button>
          <Button onClick={resetFilters} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("common.reset")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-700">
            {t("common.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 block">
                {t("common.period")}
              </label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="h-10 text-base">
                  <SelectValue placeholder={t("common.selectPeriod")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("common.today")}</SelectItem>
                  <SelectItem value="week">{t("common.thisWeek")}</SelectItem>
                  <SelectItem value="month">{t("common.thisMonth")}</SelectItem>
                  <SelectItem value="custom">{t("common.customRange")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 block">
                Loại biểu đồ
              </label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="h-10 text-base">
                  <SelectValue placeholder="Chọn loại biểu đồ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Doanh thu</SelectItem>
                  <SelectItem value="orders">Số đơn hàng</SelectItem>
                  <SelectItem value="customers">Khách hàng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 block">
                Kiểu hiển thị
              </label>
              <Select value={viewType} onValueChange={setViewType}>
                <SelectTrigger className="h-10 text-base">
                  <SelectValue placeholder="Chọn kiểu hiển thị" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Theo ngày</SelectItem>
                  <SelectItem value="hourly">Theo giờ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodFilter === "custom" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 block">
                    {t("common.startDate")}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !startDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate
                          ? format(startDate, "dd/MM/yyyy")
                          : t("common.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 block">
                    {t("common.endDate")}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !endDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate
                          ? format(endDate, "dd/MM/yyyy")
                          : t("common.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(chartData.totalRevenue)} ₫
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalOrders")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {chartData.totalOrders}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.averageOrderValue")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(chartData.averageOrderValue)} ₫
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2 shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-white/90 text-sm font-normal">
                  {t("reports.chartView")}
                </div>
                <div className="text-white font-semibold">
                  {chartType === "revenue" && "Biểu đồ doanh thu"}
                  {chartType === "orders" && "Biểu đồ số đơn hàng"}
                  {chartType === "customers" && "Biểu đồ khách hàng"}
                  {viewType === "daily" ? " theo ngày" : " theo giờ"}
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              {t("reports.visualRepresentation")} - {t("reports.fromDate")}:{" "}
              {format(startDate, "dd/MM/yyyy")} {t("reports.toDate")}:{" "}
              {format(endDate, "dd/MM/yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
            {!isLoading && chartData.timeSeriesData.length === 0 ? (
              <div className="h-[400px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 flex flex-col justify-center items-center">
                <div className="text-gray-500 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium mb-2">
                    {t("reports.noDataDescription")}
                  </div>
                  <div className="text-sm text-orange-600 mb-2">
                    📊 Không có dữ liệu trong khoảng thời gian đã chọn
                  </div>
                  <div className="text-sm text-gray-400">
                    ({format(startDate, "dd/MM/yyyy")} -{" "}
                    {format(endDate, "dd/MM/yyyy")})
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu đơn
                    hàng và hóa đơn
                  </div>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart
                  data={chartData.timeSeriesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey={
                      viewType === "daily" ? "dateDisplay" : "hourDisplay"
                    }
                    stroke="#6b7280"
                    fontSize={12}
                    angle={viewType === "daily" ? 0 : -45}
                    textAnchor={viewType === "daily" ? "middle" : "end"}
                    height={viewType === "daily" ? 50 : 80}
                    interval={viewType === "daily" ? "preserveStartEnd" : 0}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "revenue") {
                        return [formatCurrency(Number(value)) + " ₫", "Doanh thu"];
                      }
                      if (name === "orders") {
                        return [value, "Đơn hàng"];
                      }
                      if (name === "customers") {
                        return [value, "Khách hàng"];
                      }
                      return [value, name];
                    }}
                    content={(props) => (
                      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-gray-200 shadow-lg">
                        <p className="font-semibold text-gray-800 mb-2">
                          {props.label}
                        </p>
                        {props.payload?.map((entry, index) => {
                          const translatedName =
                            entry.dataKey === "revenue"
                              ? t("reports.revenue")
                              : entry.dataKey === "orders"
                              ? t("reports.orders")
                              : entry.dataKey === "customers"
                              ? t("reports.customers")
                              : entry.name;
                          return (
                            <p
                              key={index}
                              className="text-sm"
                              style={{ color: entry.color }}
                            >
                              {translatedName}:{" "}
                              {entry.dataKey === "revenue"
                                ? formatCurrency(Number(entry.value)) + " ₫"
                                : entry.value}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  />
                  {chartType === "revenue" && (
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0088FE"
                      fill="url(#revenueGradient)"
                      fillOpacity={0.6}
                    />
                  )}
                  {chartType === "orders" && (
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#00C49F"
                      fill="url(#ordersGradient)"
                      fillOpacity={0.6}
                    />
                  )}
                  {chartType === "customers" && (
                    <Area
                      type="monotone"
                      dataKey="customers"
                      stroke="#FFBB28"
                      fill="url(#customersGradient)"
                      fillOpacity={0.6}
                    />
                  )}
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0088FE" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#0088FE" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C49F" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#00C49F" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="customersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFBB28" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#FFBB28" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Method Chart */}
        <Card className="shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700">
              Phân bố phương thức thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percentage }) =>
                    `${method} ${percentage.toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {chartData.paymentMethodData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)) + " ₫",
                    "Doanh thu",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Channel Chart */}
        <Card className="shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700">
              Phân bố kênh bán hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.salesChannelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)) + " ₫",
                    "Doanh thu",
                  ]}
                />
                <Bar dataKey="revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}