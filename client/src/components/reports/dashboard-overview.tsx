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

export function DashboardOverview() {
  const { t, currentLanguage } = useTranslation();

  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const queryClient = useQueryClient();

  // Query orders by date range - same as sales-orders page
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/orders/date-range/${startDate}/${endDate}`);
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

  // Query transactions by date range - same as sales-orders page
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/transactions/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dashboard - Transactions loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Dashboard - Error fetching transactions:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Query invoices by date range - same as sales-orders page
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ["/api/invoices/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/invoices/date-range/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dashboard - Invoices loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Dashboard - Error fetching invoices:', error);
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

  const handleRefresh = () => {
    // Refresh the queries to get the latest data for the selected date
    setStartDate(formatDateToYYYYMMDD(new Date()));
    setEndDate(formatDateToYYYYMMDD(new Date()));
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    queryClient.invalidateQueries({ queryKey: ["/api/invoices/date-range"] });
  };

  const getDashboardStats = () => {
    try {
      // Add proper loading and error checks
      if (invoicesLoading || ordersLoading || transactionsLoading) {
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
        };
      }

      // Ensure we have valid arrays
      const validOrders = Array.isArray(orders) ? orders : [];
      const validTransactions = Array.isArray(transactions) ? transactions : [];
      const validInvoices = Array.isArray(invoices) ? invoices : [];
      const validTables = Array.isArray(tables) ? tables : [];

      // Filter completed/paid items only - data is already filtered by date range from API
      const completedOrders = validOrders.filter((order: any) => order.status === 'paid');
      const completedTransactions = validTransactions.filter((tx: any) => 
        tx.status === 'completed' || tx.status === 'paid' || !tx.status
      );
      const publishedInvoices = validInvoices.filter((invoice: any) => 
        invoice.invoiceStatus === 1 || invoice.status === 'published'
      );

      console.log("Dashboard Debug - Raw Data:", {
        totalOrders: validOrders.length,
        completedOrders: completedOrders.length,
        totalTransactions: validTransactions.length,
        completedTransactions: completedTransactions.length,
        totalInvoices: validInvoices.length,
        publishedInvoices: publishedInvoices.length,
        dateRange: `${startDate} to ${endDate}`,
        sampleCompletedOrder: completedOrders[0] ? {
          id: completedOrders[0].id,
          total: completedOrders[0].total,
          status: completedOrders[0].status,
          date: completedOrders[0].orderedAt || completedOrders[0].createdAt
        } : null,
        sampleInvoice: publishedInvoices[0] ? {
          id: publishedInvoices[0].id,
          total: publishedInvoices[0].total,
          status: publishedInvoices[0].invoiceStatus,
          date: publishedInvoices[0].invoiceDate
        } : null
      });

      // Calculate revenue from each source
      const orderRevenue = completedOrders.reduce((sum: number, order: any) => {
        return sum + Number(order.total || 0);
      }, 0);

      const transactionRevenue = completedTransactions.reduce((sum: number, tx: any) => {
        return sum + Number(tx.total || tx.amount || 0);
      }, 0);

      const invoiceRevenue = publishedInvoices.reduce((sum: number, invoice: any) => {
        return sum + Number(invoice.total || 0);
      }, 0);

      // Total revenue from all sources
      const periodRevenue = orderRevenue + transactionRevenue + invoiceRevenue;

      // Total count from all sources
      const periodOrderCount = completedOrders.length + completedTransactions.length + publishedInvoices.length;

      // Count unique customers
      const uniqueCustomers = new Set();
      
      // Add customers from orders
      completedOrders.forEach((order: any) => {
        if (order.customerId) {
          uniqueCustomers.add(order.customerId);
        } else if (order.customerName && order.customerName !== 'Khách hàng lẻ') {
          uniqueCustomers.add(order.customerName);
        } else {
          uniqueCustomers.add(`order_${order.id}`);
        }
      });

      // Add customers from transactions
      completedTransactions.forEach((tx: any) => {
        if (tx.customerId) {
          uniqueCustomers.add(tx.customerId);
        } else if (tx.customerName && tx.customerName !== 'Khách hàng lẻ') {
          uniqueCustomers.add(tx.customerName);
        } else {
          uniqueCustomers.add(`transaction_${tx.id}`);
        }
      });

      // Add customers from invoices
      publishedInvoices.forEach((invoice: any) => {
        if (invoice.customerId) {
          uniqueCustomers.add(invoice.customerId);
        } else if (invoice.customerName && invoice.customerName !== 'Khách hàng lẻ') {
          uniqueCustomers.add(invoice.customerName);
        } else {
          uniqueCustomers.add(`invoice_${invoice.id}`);
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

      // Active orders (pending/in-progress orders only from all current orders, not date-filtered)
      const activeOrders = Array.isArray(allCurrentOrders) ? allCurrentOrders.filter((order: any) => 
        order.status === 'pending' || order.status === 'in_progress' || order.status === 'confirmed' || 
        order.status === 'preparing' || order.status === 'ready' || order.status === 'served'
      ).length : 0;

      const occupiedTables = validTables.filter(
        (table: TableType) => table.status === "occupied",
      );

      // Month revenue: same as period revenue for the selected date range
      const monthRevenue = periodRevenue;

      // Average order value
      const averageOrderValue = periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

      // Peak hours analysis from all completed items
      const hourlyItems: { [key: number]: number } = {};
      
      // Analyze orders
      completedOrders.forEach((order: any) => {
        const itemDate = new Date(order.orderedAt || order.createdAt);
        if (!isNaN(itemDate.getTime())) {
          const hour = itemDate.getHours();
          hourlyItems[hour] = (hourlyItems[hour] || 0) + 1;
        }
      });

      // Analyze transactions
      completedTransactions.forEach((tx: any) => {
        const itemDate = new Date(tx.createdAt);
        if (!isNaN(itemDate.getTime())) {
          const hour = itemDate.getHours();
          hourlyItems[hour] = (hourlyItems[hour] || 0) + 1;
        }
      });

      // Analyze invoices
      publishedInvoices.forEach((invoice: any) => {
        const itemDate = new Date(invoice.invoiceDate || invoice.createdAt);
        if (!isNaN(itemDate.getTime())) {
          const hour = itemDate.getHours();
          hourlyItems[hour] = (hourlyItems[hour] || 0) + 1;
        }
      });

      const peakHour = Object.keys(hourlyItems).reduce(
        (peak, hour) =>
          hourlyItems[parseInt(hour)] > (hourlyItems[parseInt(peak)] || 0)
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
      };

      console.log("Dashboard Debug - Final Stats:", {
        orderRevenue,
        transactionRevenue,
        invoiceRevenue,
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
      };
    }
  };

  // Get all current orders to check active ones (not date-filtered)
  const { data: allCurrentOrders = [] } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/orders");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  const stats = getDashboardStats();

  const formatCurrency = (amount: number) => {
    try {
      return `${(amount || 0).toLocaleString()} ₫`;
    } catch (error) {
      console.error("Error formatting currency:", error);
      return "0 ₫";
    }
  };

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

  // Show loading state
  if (invoicesLoading || ordersLoading || transactionsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  // Show error state
  if (invoicesError || ordersError) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-red-500">
          Lỗi tải dữ liệu báo cáo: {invoicesError?.message || ordersError?.message || "Unknown error"}
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="ml-4"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {t('reports.dashboardTab')}
              </CardTitle>
              <CardDescription>
                {t("reports.dashboardDescription")} (Dữ liệu từ hóa đơn và đơn hàng)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date-picker">
                {t("reports.startDate")}:
              </Label>
              <Input
                id="start-date-picker"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              <Label htmlFor="end-date-picker">{t("reports.endDate")}:</Label>
              <Input
                id="end-date-picker"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
              <Button
                onClick={handleRefresh}
                size="sm"
                variant="outline"
                className="ml-2"
              >
                <Search className="w-4 h-4 mr-1" />
                {t("reports.refresh")}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.periodRevenue)}
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
                  Tổng doanh thu
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.monthRevenue)}
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tổng đơn hàng
                </p>
                <p className="text-2xl font-bold">{stats.periodOrderCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("reports.averageOrderValue")}{" "}
                  {formatCurrency(stats.averageOrderValue)}
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
                  {stats.periodCustomerCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("reports.peakHour")} {stats.peakHour}{" "}
                  <span>{t("reports.hour")}</span>
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status */}
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
                variant={stats.occupiedTables > 0 ? "destructive" : "outline"}
              >
                {stats.occupiedTables} / {stats.totalTables}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                {t("reports.tableUtilization")}
              </span>
              <Badge variant="secondary">
                {stats.totalTables > 0 ? Math.round((stats.occupiedTables / stats.totalTables) * 100) : 0} %
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
                  {Math.round((stats.dailyAverageRevenue / 500000) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((stats.dailyAverageRevenue / 500000) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("reports.tableTurnoverRate")}</span>
                <span className="font-medium">
                  {stats.totalTables > 0
                    ? (stats.periodOrderCount / stats.totalTables).toFixed(1)
                    : 0}{" "}
                  {t("reports.times")}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((stats.periodOrderCount / stats.totalTables / 5) * 100, 100)}%`,
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
    </div>
  );
}