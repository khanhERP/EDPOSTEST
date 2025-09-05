import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  Target,
  Search,
  RefreshCw
} from "lucide-react";
import type { Order, Table as TableType } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfDay, endOfDay } from "date-fns";
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
} from "recharts";

export function formatDateToYYYYMMDD(date: Date | string | number): string {
  const d = new Date(date); // Ensure input is a Date
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  tradeNumber: string;
  templateNumber: string;
  symbol: string;
  customerName: string;
  customerTaxCode: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  subtotal: string;
  tax: string;
  total: string;
  paymentMethod: number;
  invoiceDate: string;
  status: string;
  einvoiceStatus: number;
  invoiceStatus: number;
  notes: string;
  createdAt: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};


export function DashboardOverview() {
  const { t, currentLanguage } = useTranslation();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  // Query orders by date range
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/orders/date-range/${format(startDate, 'yyyy-MM-dd')}/${format(endDate, 'yyyy-MM-dd')}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dashboard - Orders loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Dashboard - Error fetching orders:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Query tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["/api/tables"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/tables");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dashboard - Tables loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Dashboard - Error fetching tables:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Query order items for detailed analysis
  const { data: orderItems = [], isLoading: orderItemsLoading } = useQuery({
    queryKey: ["/api/order-items"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/order-items");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dashboard - Order Items loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Dashboard - Error fetching order items:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Query products for product analysis
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dashboard - Products loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Dashboard - Error fetching products:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate dashboard data from real orders
  const dashboardData = useMemo(() => {
    try {
      // Filter completed orders by date range
      const filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const isInDateRange = orderDate >= startOfDay(startDate) && orderDate <= endOfDay(endDate);
        const isCompleted = order.status === 'paid' || order.status === 'completed';
        return isInDateRange && isCompleted;
      });

      console.log("Dashboard Debug:", {
        totalOrders: orders.length,
        filteredOrders: filteredOrders.length,
        dateRange: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`
      });

      // Calculate totals
      const totalRevenue = filteredOrders.reduce((total: number, order: any) => {
        const orderTotal = Number(order.total || 0);
        const orderDiscount = Number(order.discount || 0);
        return total + (orderTotal - orderDiscount);
      }, 0);

      const totalOrdersCount = filteredOrders.length;
      const totalCustomers = filteredOrders.reduce((total: number, order: any) => {
        return total + Number(order.customerCount || 1);
      }, 0);
      const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

      // Calculate daily sales
      const dailySales: { [date: string]: { revenue: number; orders: number } } = {};

      filteredOrders.forEach((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const dateStr = format(orderDate, 'dd/MM');

        if (!dailySales[dateStr]) {
          dailySales[dateStr] = { revenue: 0, orders: 0 };
        }

        const orderTotal = Number(order.total || 0);
        const orderDiscount = Number(order.discount || 0);
        const revenue = orderTotal - orderDiscount;

        dailySales[dateStr].revenue += revenue;
        dailySales[dateStr].orders += 1;
      });

      const salesData = Object.entries(dailySales).map(([date, data]) => ({
        date,
        ...data,
      }));

      // Payment method breakdown
      const paymentMethodStats: { [method: string]: { value: number; count: number } } = {};

      filteredOrders.forEach((order: any) => {
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

        const methodLabel = {
          cash: "Tiền mặt",
          card: "Thẻ",
          transfer: "Chuyển khoản",
          momo: "MoMo",
          zalopay: "ZaloPay",
          vnpay: "VNPay"
        }[method] || "Khác";

        if (!paymentMethodStats[methodLabel]) {
          paymentMethodStats[methodLabel] = { value: 0, count: 0 };
        }

        const orderTotal = Number(order.total || 0);
        const orderDiscount = Number(order.discount || 0);
        const revenue = orderTotal - orderDiscount;

        paymentMethodStats[methodLabel].value += revenue;
        paymentMethodStats[methodLabel].count += 1;
      });

      const paymentMethods = Object.entries(paymentMethodStats).map(([method, stats]) => ({
        method,
        value: stats.value,
        percentage: totalRevenue > 0 ? Math.round((stats.value / totalRevenue) * 100) : 0,
      }));

      // Top products analysis
      const productStats: { [productId: string]: { name: string; quantity: number; revenue: number } } = {};

      const filteredOrderItems = orderItems.filter((item: any) => 
        filteredOrders.some((order: any) => order.id === item.orderId)
      );

      filteredOrderItems.forEach((item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        const productKey = item.productId || item.productName;
        const quantity = parseInt(item.quantity) || 0;
        const revenue = parseFloat(item.total) || (quantity * parseFloat(item.unitPrice || '0'));

        if (!productStats[productKey]) {
          productStats[productKey] = {
            name: item.productName || product?.name || 'Unknown Product',
            quantity: 0,
            revenue: 0
          };
        }

        productStats[productKey].quantity += quantity;
        productStats[productKey].revenue += revenue;
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Table status
      const occupiedTables = tables.filter((table: any) => table.status === 'occupied').length;
      const totalTables = tables.length;

      // Pending orders
      const pendingOrders = orders.filter((order: any) => 
        order.status === 'pending' || order.status === 'confirmed'
      ).length;

      return {
        totalRevenue,
        totalOrders: totalOrdersCount,
        totalCustomers,
        averageOrderValue,
        occupiedTables,
        totalTables,
        pendingOrders,
        salesData,
        paymentMethods,
        topProducts,
      };
    } catch (error) {
      console.error("Dashboard calculation error:", error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
        occupiedTables: 0,
        totalTables: 0,
        pendingOrders: 0,
        salesData: [],
        paymentMethods: [],
        topProducts: [],
      };
    }
  }, [orders, orderItems, products, tables, startDate, endDate]);

  const resetFilters = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/order-items"] });
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const isLoading = ordersLoading || tablesLoading || orderItemsLoading || productsLoading;

  const formatDate = (dateStr: string) => {
    try {
      // Map translation language codes to locale codes
      const localeMap = {
        ko: "ko-KR",
        en: "en-US", 
        vi: "vi-VN"
      };

      const locale = localeMap[currentLanguage] || "ko-KR";

      return new Date(dateStr).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateStr || "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-gray-500">Đang tải dữ liệu dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('reports.dashboard')}
        </h1>
        <Button onClick={resetFilters} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {t('reports.dashboardTab')}
              </CardTitle>
              <CardDescription>
                {t("reports.dashboardDescription")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date-picker">
                {t("reports.startDate")}:
              </Label>
              <Input
                id="start-date-picker"
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="w-auto"
              />
              <Label htmlFor="end-date-picker">{t("reports.endDate")}:</Label>
              <Input
                id="end-date-picker"
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="w-auto"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('reports.totalRevenue')}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardData.totalRevenue)} ₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(startDate, 'dd/MM/yyyy')} ~ {format(endDate, 'dd/MM/yyyy')}
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
                  {t('reports.totalOrders')}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboardData.totalOrders}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("reports.averageOrderValue")}{" "}
                  {formatCurrency(dashboardData.averageOrderValue)} ₫
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
                  {t('reports.averageOrderValue')}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dashboardData.averageOrderValue)} ₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("reports.peakHour")} {dashboardData.peakHour}{" "}
                  <span>{t("reports.hour")}</span>
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
                  {t('reports.totalCustomers')}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboardData.totalCustomers}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("reports.peakHour")} {dashboardData.peakHour}{" "}
                  <span>{t("reports.hour")}</span>
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status & Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t("reports.realTimeStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                {t("reports.occupiedTables")}
              </span>
              <Badge
                variant={dashboardData.occupiedTables > 0 ? "destructive" : "outline"}
              >
                {dashboardData.occupiedTables}/{dashboardData.totalTables}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                {t("reports.tableUtilization")}
              </span>
              <Badge variant="secondary">
                {dashboardData.totalTables > 0 ? Math.round((dashboardData.occupiedTables / dashboardData.totalTables) * 100) : 0} %
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                {t("reports.pendingOrders")}
              </span>
              <Badge variant="destructive">
                {dashboardData.pendingOrders}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t("reports.performanceMetrics")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("reports.salesAchievementRate")}</span>
                <span className="font-medium">
                  {dashboardData.totalTables > 0 ? Math.round((dashboardData.totalRevenue / 500000) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((dashboardData.totalRevenue / 500000) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("reports.tableTurnoverRate")}</span>
                <span className="font-medium">
                  {dashboardData.totalTables > 0
                    ? (dashboardData.totalOrders / dashboardData.totalTables).toFixed(1)
                    : 0}{" "}
                  {t("reports.times")}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((dashboardData.totalOrders / dashboardData.totalTables / 5) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500">
                {t("reports.targetAverageDailySales")
                  .replace("{amount}", formatCurrency(500000))
                  .replace("{turnovers}", "5")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.dailySales')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `${formatCurrency(Number(value))} ₫` : value,
                    name === 'revenue' ? 'Doanh thu' : 'Đơn hàng'
                  ]}
                />
                <Bar dataKey="revenue" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.paymentMethods')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percentage }) => `${method} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dashboardData.paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${formatCurrency(Number(value))} ₫`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.topProducts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.topProducts && dashboardData.topProducts.length > 0 ? (
              dashboardData.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.quantity} đã bán</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(product.revenue)} ₫</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Không có dữ liệu sản phẩm</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}