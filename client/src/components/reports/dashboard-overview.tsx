
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

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  // Query invoices - same as sales-orders page
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/invoices`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Query orders - same as sales-orders page
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/orders`);
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
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
  };

  const getDashboardStats = () => {
    // Add proper loading and error checks
    if (invoicesLoading || ordersLoading) {
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

    if (
      !tables ||
      !Array.isArray(tables)
    )
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

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    // Combine invoices and orders data - same logic as sales-orders page
    const combinedData = [
      ...(Array.isArray(invoices) ? invoices.map((invoice: Invoice) => ({
        ...invoice,
        type: 'invoice' as const,
        date: invoice.invoiceDate,
        displayNumber: invoice.tradeNumber || invoice.invoiceNumber || `INV-${String(invoice.id).padStart(13, '0')}`,
        displayStatus: invoice.invoiceStatus || 1,
        customerName: invoice.customerName || 'Khách hàng lẻ',
        customerPhone: invoice.customerPhone || '',
        customerAddress: invoice.customerAddress || '',
        customerTaxCode: invoice.customerTaxCode || '',
        symbol: invoice.symbol || 'C11DTD',
        einvoiceStatus: invoice.einvoiceStatus || 0
      })) : []),
      ...(Array.isArray(orders) ? orders.map((order: Order) => ({
        ...order,
        type: 'order' as const,
        date: order.orderedAt,
        displayNumber: order.orderNumber || `ORD-${String(order.id).padStart(13, '0')}`,
        displayStatus: order.status === 'paid' ? 1 : order.status === 'pending' ? 2 : order.status === 'cancelled' ? 3 : 2,
        customerName: order.customerName || 'Khách hàng lẻ',
        invoiceStatus: order.status === 'paid' ? 1 : order.status === 'pending' ? 2 : order.status === 'cancelled' ? 3 : 2,
        customerPhone: '',
        customerAddress: '',
        customerTaxCode: '',
        symbol: 'C11DTD',
        invoiceNumber: order.orderNumber || `ORD-${String(order.id).padStart(8, '0')}`,
        tradeNumber: order.orderNumber || '',
        invoiceDate: order.orderedAt,
        einvoiceStatus: order.einvoiceStatus || 0
      })) : [])
    ];

    // Filter completed items within date range - enhanced logic to show more data
    const filteredCompletedItems = Array.isArray(combinedData) ? combinedData.filter((item: any) => {
      try {
        if (!item || !item.date) return false;

        const itemDate = new Date(item.date);
        if (isNaN(itemDate.getTime())) return false;

        const dateMatch = itemDate >= start && itemDate <= end;
        
        // Include more order statuses and invoice statuses to show real data
        const isCompleted = (item.type === 'invoice' && (item.invoiceStatus === 1 || item.status === 'paid' || item.status === 'completed')) ||
                          (item.type === 'order' && (item.status === 'paid' || item.status === 'completed' || item.status === 'confirmed' || item.status === 'served'));

        return dateMatch && isCompleted;
      } catch (error) {
        console.error('Error filtering item:', item, error);
        return false;
      }
    }) : [];

    // If no completed items found, include pending/draft items for display
    let itemsToAnalyze = filteredCompletedItems;
    if (filteredCompletedItems.length === 0) {
      itemsToAnalyze = Array.isArray(combinedData) ? combinedData.filter((item: any) => {
        try {
          if (!item || !item.date) return false;
          const itemDate = new Date(item.date);
          if (isNaN(itemDate.getTime())) return false;
          return itemDate >= start && itemDate <= end;
        } catch (error) {
          return false;
        }
      }) : [];
    }

    console.log("Dashboard Debug (Combined Data):", {
      totalInvoices: invoices.length,
      totalOrders: orders.length,
      combinedDataLength: combinedData.length,
      startDate,
      endDate,
      filteredCompletedItems: filteredCompletedItems.length,
      itemsToAnalyze: itemsToAnalyze.length,
      periodRevenue,
      monthRevenue,
      sampleItems: itemsToAnalyze.slice(0, 3).map((item: any) => ({
        id: item.id,
        type: item.type,
        total: item.total,
        subtotal: item.subtotal,
        tax: item.tax,
        discount: item.discount,
        calculatedRevenue: (Number(item.subtotal || 0) - Number(item.discount || 0))
      })),
    });

    // Period revenue: Use exact same calculation as Order Details
    // Revenue = Subtotal (base price without tax)
    const periodRevenue = itemsToAnalyze.reduce(
      (total: number, item: any) => {
        // Use subtotal (pre-tax amount) as revenue, same as Order Details display
        const itemSubtotal = Number(item.subtotal || 0);
        const itemDiscount = Number(item.discount || 0);
        // Revenue = Subtotal - Discount (excluding tax from revenue calculation)
        const itemRevenue = itemSubtotal - itemDiscount;
        return total + itemRevenue;
      },
      0,
    );

    // Order count: count of items in the filtered period
    const periodOrderCount = itemsToAnalyze.length;

    // Customer count: count unique customers from items
    const uniqueCustomers = new Set();
    itemsToAnalyze.forEach((item: any) => {
      if (item.customerId) {
        uniqueCustomers.add(item.customerId);
      } else if (item.customerName && item.customerName !== 'Khách hàng lẻ') {
        uniqueCustomers.add(item.customerName);
      } else {
        // If no customer info, count as unique customer per item
        uniqueCustomers.add(`${item.type}_${item.id}`);
      }
    });
    const periodCustomerCount = uniqueCustomers.size;

    // Daily average for the period
    const daysDiff = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const dailyAverageRevenue = periodRevenue / daysDiff;

    // Active orders (pending/in-progress orders only)
    const activeOrders = Array.isArray(orders) ? orders.filter((order: any) => 
      order.status === 'pending' || order.status === 'in_progress' || order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'served'
    ).length : 0;

    const occupiedTables = Array.isArray(tables) ? tables.filter(
      (table: TableType) => table.status === "occupied",
    ) : [];

    // Month revenue: Use subtotal-based calculation for consistency with Order Details
    const monthRevenue = itemsToAnalyze.reduce(
      (total: number, item: any) => {
        const itemSubtotal = Number(item.subtotal || 0);
        const itemDiscount = Number(item.discount || 0);
        return total + (itemSubtotal - itemDiscount);
      },
      0,
    );

    // Average order value
    const averageOrderValue =
      periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

    // Peak hours analysis from items in period
    const hourlyItems: { [key: number]: number } = {};
    itemsToAnalyze.forEach((item: any) => {
      const itemDate = new Date(item.date);
      if (!isNaN(itemDate.getTime())) {
        const hour = itemDate.getHours();
        hourlyItems[hour] = (hourlyItems[hour] || 0) + 1;
      }
    });

    const peakHour = Object.keys(hourlyItems).reduce(
      (peak, hour) =>
        hourlyItems[parseInt(hour)] > hourlyItems[parseInt(peak)]
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
      totalTables: Array.isArray(tables) ? tables.length : 0,
    };
  };

  const stats = getDashboardStats();

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
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
  };

  // Show loading state
  if (invoicesLoading || ordersLoading) {
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
                  Tổng thu từ bán hàng
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
