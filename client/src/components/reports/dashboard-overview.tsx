import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
  CalendarDays,
  Clock,
  RefreshCw,
  TrendingDown,
  Package,
  CreditCard,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function DashboardOverview() {
  const { t } = useTranslation();

  // Date filters
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Fetch real data from APIs
  const { data: orders = [], refetch: refetchOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch orders');

      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["/api/tables"],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Process data with useMemo for performance
  const dashboardData = useMemo(() => {
    if (!orders || !Array.isArray(orders)) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        todayRevenue: 0,
        recentOrders: [],
        revenueChart: [],
        orderStatusChart: [],
        paymentMethodChart: [],
        topProducts: [],
      };
    }

    // Filter orders by date range and status
    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderedAt || order.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = orderDate >= start && orderDate <= end;
      const statusMatch = order.status === 'paid';

      return dateMatch && statusMatch;
    });

    // Calculate metrics
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Today's revenue
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = filteredOrders.filter((order: any) => {
      const orderDate = new Date(order.orderedAt || order.created_at).toISOString().split('T')[0];
      return orderDate === today;
    });
    const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    // Recent orders (last 10)
    const recentOrders = [...filteredOrders]
      .sort((a, b) => new Date(b.orderedAt || b.created_at).getTime() - new Date(a.orderedAt || a.created_at).getTime())
      .slice(0, 10);

    // Revenue chart (daily)
    const revenueByDay: { [date: string]: number } = {};
    filteredOrders.forEach((order: any) => {
      const date = new Date(order.orderedAt || order.created_at).toISOString().split('T')[0];
      revenueByDay[date] = (revenueByDay[date] || 0) + Number(order.total || 0);
    });

    const revenueChart = Object.entries(revenueByDay)
      .map(([date, revenue]) => ({
        name: new Date(date).toLocaleDateString('vi-VN'),
        value: revenue,
      }))
      .sort((a, b) => new Date(a.name.split('/').reverse().join('-')).getTime() - new Date(b.name.split('/').reverse().join('-')).getTime());

    // Order status chart
    const statusCounts: { [status: string]: number } = {};
    orders.forEach((order: any) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    const orderStatusChart = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
    }));

    // Payment method chart
    const paymentCounts: { [method: string]: number } = {};
    filteredOrders.forEach((order: any) => {
      const method = order.paymentMethod || 'cash';
      paymentCounts[method] = (paymentCounts[method] || 0) + 1;
    });

    const paymentMethodChart = Object.entries(paymentCounts).map(([method, count]) => ({
      name: method,
      value: count,
    }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      todayRevenue,
      recentOrders,
      revenueChart,
      orderStatusChart,
      paymentMethodChart,
      topProducts: [],
    };
  }, [orders, startDate, endDate]);

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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Chờ xử lý", variant: "secondary" as const },
      confirmed: { label: "Đã xác nhận", variant: "default" as const },
      preparing: { label: "Đang chuẩn bị", variant: "outline" as const },
      paid: { label: "Đã thanh toán", variant: "default" as const },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  const chartConfig = {
    value: {
      label: "Doanh thu",
      color: "#10b981",
    },
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t("reports.dashboard")}
          </CardTitle>
          <CardDescription>
            {t("reports.dashboardDescription")}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
            <Button 
              onClick={async () => {
                await refetchOrders();
              }}
              disabled={ordersLoading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${ordersLoading ? 'animate-spin' : ''}`} />
              {ordersLoading ? t("reports.loading") : t("reports.refresh")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reports.totalRevenue")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reports.totalOrders")}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {t("reports.ordersCount")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reports.averageOrderValue")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.avgOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("reports.perOrder")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reports.todayRevenue")}
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.todayRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("vi-VN")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.revenueChart")}</CardTitle>
            <CardDescription>
              {t("reports.dailyRevenue")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.orderStatus")}</CardTitle>
            <CardDescription>
              {t("reports.orderStatusDistribution")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.orderStatusChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.orderStatusChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.recentOrders")}</CardTitle>
          <CardDescription>
            {t("reports.recentOrdersDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.orderNumber")}</TableHead>
                <TableHead>{t("reports.customer")}</TableHead>
                <TableHead>{t("reports.total")}</TableHead>
                <TableHead>{t("reports.status")}</TableHead>
                <TableHead>{t("reports.orderTime")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardData.recentOrders.length > 0 ? (
                dashboardData.recentOrders.map((order: any) => {
                  const statusConfig = getStatusBadge(order.status);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.orderNumber || `ORD-${order.id}`}
                      </TableCell>
                      <TableCell>
                        {order.customerName || "Khách lẻ"}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(Number(order.total))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(order.orderedAt || order.created_at).toLocaleString("vi-VN")}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 italic">
                    {t("reports.noRecentOrders")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}