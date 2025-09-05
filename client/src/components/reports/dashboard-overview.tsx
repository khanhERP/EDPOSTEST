import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { CalendarIcon, DollarSign, ShoppingCart, Users, TrendingUp, Package, RotateCcw } from "lucide-react";
import { format, startOfDay, endOfDay, isToday, isThisWeek, isThisMonth, subDays, subWeeks, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function DashboardOverview() {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [periodFilter, setPeriodFilter] = useState<string>("today");

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
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/orders/date-range/${format(startDate, 'yyyy-MM-dd')}/${format(endDate, 'yyyy-MM-dd')}`);
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
  const { data: orderItems = [] } = useQuery({
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

  // Query customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/customers");
        if (!response.ok) {
          throw new Error("Failed to fetch customers");
        }
        return response.json();
      } catch (error) {
        console.error("Customers fetch error:", error);
        return [];
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query products for inventory analysis
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        return response.json();
      } catch (error) {
        console.error("Products fetch error:", error);
        return [];
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate dashboard metrics from real order data
  const dashboardMetrics = useMemo(() => {
    try {
      // Filter orders by date range and status
      const filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const isInDateRange = orderDate >= startOfDay(startDate) && orderDate <= endOfDay(endDate);
        return isInDateRange;
      });

      // Calculate basic metrics
      const totalOrders = filteredOrders.length;
      const completedOrders = filteredOrders.filter((order: any) => 
        order.status === 'paid' || order.status === 'completed'
      );

      const totalRevenue = completedOrders.reduce((sum: number, order: any) => {
        return sum + (parseFloat(order.total) || parseFloat(order.storedTotal) || 0);
      }, 0);

      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get unique customers
      const uniqueCustomers = new Set(
        filteredOrders
          .filter((order: any) => order.customerId)
          .map((order: any) => order.customerId)
      ).size;

      // Calculate hourly sales data for charts
      const hourlySales = Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0, orders: 0 }));

      completedOrders.forEach((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const hour = orderDate.getHours();
        hourlySales[hour].revenue += parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
        hourlySales[hour].orders += 1;
      });

      // Calculate daily sales for the period
      const dailySales = new Map();
      completedOrders.forEach((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const dateKey = format(orderDate, 'yyyy-MM-dd');
        if (!dailySales.has(dateKey)) {
          dailySales.set(dateKey, { date: dateKey, revenue: 0, orders: 0 });
        }
        const dayData = dailySales.get(dateKey);
        dayData.revenue += parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
        dayData.orders += 1;
      });

      // Payment method distribution
      const paymentMethods = new Map();
      completedOrders.forEach((order: any) => {
        const method = order.paymentMethod || 'cash';
        if (!paymentMethods.has(method)) {
          paymentMethods.set(method, { method, count: 0, revenue: 0 });
        }
        const methodData = paymentMethods.get(method);
        methodData.count += 1;
        methodData.revenue += parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
      });

      // Sales channel distribution
      const salesChannels = new Map();
      completedOrders.forEach((order: any) => {
        const channel = order.salesChannel || 'pos';
        if (!salesChannels.has(channel)) {
          salesChannels.set(channel, { channel, count: 0, revenue: 0 });
        }
        const channelData = salesChannels.get(channel);
        channelData.count += 1;
        channelData.revenue += parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
      });

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        uniqueCustomers,
        completedOrders: completedOrders.length,
        hourlySalesData: hourlySales.filter(h => h.revenue > 0 || h.orders > 0),
        dailySalesData: Array.from(dailySales.values()),
        paymentMethodData: Array.from(paymentMethods.values()),
        salesChannelData: Array.from(salesChannels.values()),
      };
    } catch (error) {
      console.error("Dashboard metrics calculation error:", error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        uniqueCustomers: 0,
        completedOrders: 0,
        hourlySalesData: [],
        dailySalesData: [],
        paymentMethodData: [],
        salesChannelData: [],
      };
    }
  }, [orders, startDate, endDate]);

  const resetFilters = () => {
    setPeriodFilter("today");
    setStartDate(new Date());
    setEndDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("reports.dashboard")}
        </h1>
        <Button onClick={resetFilters} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          {t("common.reset")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("common.filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("common.period")}
              </label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
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

            {periodFilter === "custom" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("common.startDate")}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : t("common.selectDate")}
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
                  <label className="text-sm font-medium">
                    {t("common.endDate")}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : t("common.selectDate")}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardMetrics.totalRevenue)} ₫
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalOrders")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboardMetrics.totalOrders}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.averageOrderValue")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dashboardMetrics.averageOrderValue)} ₫
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalCustomers")}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboardMetrics.uniqueCustomers}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.dailyRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardMetrics.dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)) + " ₫", t("reports.revenue")]}
                />
                <Bar dataKey="revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.paymentMethodDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardMetrics.paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {dashboardMetrics.paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.hourlyRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardMetrics.hourlySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)) + " ₫", t("reports.revenue")]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.salesChannel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardMetrics.salesChannelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="count"
                >
                  {dashboardMetrics.salesChannelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}