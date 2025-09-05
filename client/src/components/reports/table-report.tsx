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
import { Utensils, Clock, Users, TrendingUp } from "lucide-react";
import type { Order, Table as TableType } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";

export function TableReport() {
  const { t } = useTranslation();

  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Fetch orders using real API
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/orders/date-range/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Table Report - Orders loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Table Report - Error fetching orders:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["/api/tables"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/tables");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Table Report - Tables loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Table Report - Error fetching tables:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch order items for detailed analysis
  const { data: orderItems = [], isLoading: orderItemsLoading } = useQuery({
    queryKey: ["/api/order-items"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/order-items");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Table Report - Order items loaded:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Table Report - Error fetching order items:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  const getTableData = () => {
    if (!orders || !tables) return null;

    // Filter orders by date range and completion status
    const filteredCompletedOrders = orders.filter((order: any) => {
      try {
        if (!order.orderedAt && !order.createdAt) return false;

        const orderDate = new Date(order.orderedAt || order.createdAt);
        if (isNaN(orderDate.getTime())) return false;

        // Normalize dates for comparison
        const orderDateOnly = new Date(orderDate);
        orderDateOnly.setHours(0, 0, 0, 0);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const dateMatch = orderDateOnly >= start && orderDateOnly <= end;
        const isCompleted = order.status === 'paid' || order.status === 'completed';

        return dateMatch && isCompleted;
      } catch (error) {
        console.error('Table Report - Error filtering order:', order, error);
        return false;
      }
    });

    console.log("Table Report Debug:", {
      dateRange,
      startDate,
      endDate,
      totalOrders: orders?.length || 0,
      filteredCompletedOrders: filteredCompletedOrders.length,
      sampleOrder: filteredCompletedOrders[0] || null
    });

    // Table performance analysis
    const tableStats: {
      [tableId: number]: {
        table: TableType;
        orderCount: number;
        revenue: number;
        customerCount: number;
        averageOrderValue: number;
        turnoverRate: number;
        peakHours: { [hour: number]: number };
        itemsSold: number;
      };
    } = {};

    // Initialize stats for all tables
    (tables as TableType[]).forEach((table: TableType) => {
      tableStats[table.id] = {
        table,
        orderCount: 0,
        revenue: 0,
        customerCount: 0,
        averageOrderValue: 0,
        turnoverRate: 0,
        peakHours: {},
        itemsSold: 0,
      };
    });

    // Calculate stats from completed orders
    filteredCompletedOrders.forEach((order: any) => {
      if (order.tableId && tableStats[order.tableId]) {
        const stats = tableStats[order.tableId];
        stats.orderCount += 1;

        const orderTotal = Number(order.total || 0);
        const orderDiscount = Number(order.discount || 0);
        const revenue = orderTotal - orderDiscount;

        stats.revenue += revenue;
        stats.customerCount += Number(order.customerCount || 1);

        // Track peak hours
        const orderDate = new Date(order.orderedAt || order.createdAt);
        if (!isNaN(orderDate.getTime())) {
          const hour = orderDate.getHours();
          stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1;
        }

        // Count items sold from order_items
        const relatedOrderItems = orderItems.filter((item: any) => item.orderId === order.id);
        const itemsCount = relatedOrderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        stats.itemsSold += itemsCount;
      }
    });

    // Calculate derived metrics
    Object.values(tableStats).forEach((stats) => {
      if (stats.orderCount > 0) {
        stats.averageOrderValue = stats.revenue / stats.orderCount;
        // Calculate turnover rate (orders per day over the period)
        const days = Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        stats.turnoverRate = stats.orderCount / days;
      }
    });

    // Sort tables by different metrics
    const tableList = Object.values(tableStats);
    const topRevenueTables = [...tableList].sort(
      (a, b) => b.revenue - a.revenue,
    );
    const topTurnoverTables = [...tableList].sort(
      (a, b) => b.turnoverRate - a.turnoverRate,
    );
    const topUtilizationTables = [...tableList].sort(
      (a, b) => b.orderCount - a.orderCount,
    );

    // Overall stats
    const totalRevenue = tableList.reduce(
      (sum, stats) => sum + stats.revenue,
      0,
    );
    const totalOrders = tableList.reduce(
      (sum, stats) => sum + stats.orderCount,
      0,
    );
    const totalCustomers = tableList.reduce(
      (sum, stats) => sum + stats.customerCount,
      0,
    );
    const averageUtilization =
      tableList.length > 0
        ? tableList.reduce((sum, stats) => sum + stats.orderCount, 0) /
          tableList.length
        : 0;

    return {
      tableStats: tableList,
      topRevenueTables,
      topTurnoverTables,
      topUtilizationTables,
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageUtilization,
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
        const currentDayOfWeek = today.getDay();
        const daysToLastMonday =
          currentDayOfWeek === 0 ? 13 : currentDayOfWeek + 6;
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
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const lastMonthYear = month === 0 ? year - 1 : year;
        const lastMonth = month === 0 ? 11 : month - 1;

        const lastMonthStart = new Date(lastMonthYear, lastMonth, 1);
        const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0);

        const startDateStr = `${lastMonthStart.getFullYear()}-${(lastMonthStart.getMonth() + 1).toString().padStart(2, "0")}-${lastMonthStart.getDate().toString().padStart(2, "0")}`;
        const endDateStr = `${lastMonthEnd.getFullYear()}-${(lastMonthEnd.getMonth() + 1).toString().padStart(2, "0")}-${lastMonthEnd.getDate().toString().padStart(2, "0")}`;

        setStartDate(startDateStr);
        setEndDate(endDateStr);
        break;
      case "custom":
        const customCurrentDate = new Date().toISOString().split("T")[0];
        setStartDate(customCurrentDate);
        setEndDate(customCurrentDate);
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const getTableStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: t("common.available"), variant: "default" as const },
      occupied: {
        label: t("common.occupied"),
        variant: "destructive" as const,
      },
      reserved: { label: t("common.reserved"), variant: "secondary" as const },
      maintenance: {
        label: t("common.maintenance"),
        variant: "outline" as const,
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.available
    );
  };

  const getPeakHour = (peakHours: { [hour: number]: number }) => {
    const hours = Object.keys(peakHours);
    if (hours.length === 0) return null;

    const peak = hours.reduce((max, hour) =>
      peakHours[parseInt(hour)] > peakHours[parseInt(max)] ? hour : max,
    );
    return parseInt(peak);
  };

  const tableData = getTableData();

  const isLoading = ordersLoading || tablesLoading || orderItemsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-gray-500">{t("reports.loading") || "Đang tải dữ liệu..."}</div>
      </div>
    );
  }

  if (!tableData) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Không có dữ liệu để hiển thị</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5" />
                {t("reports.tableAnalysis")}
              </CardTitle>
              <CardDescription>{t("reports.analyzeTableRevenueTrend")}</CardDescription>
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
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.averageUtilization")}
                </p>
                <p className="text-2xl font-bold">
                  {tableData.averageUtilization.toFixed(1)} {t("reports.times")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("reports.averageOrdersPerTable")}
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
                  {t("reports.totalOrders")}
                </p>
                <p className="text-2xl font-bold">{tableData.totalOrders}</p>
                <p className="text-xs text-gray-500">
                  {t("reports.allTables")}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(tableData.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500">
                  {startDate} ~ {endDate}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalCustomers")}
                </p>
                <p className="text-2xl font-bold">{tableData.totalCustomers}</p>
                <p className="text-xs text-gray-500">
                  Khách phục vụ
                </p>
              </div>
              <Utensils className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Revenue Tables */}
        <Card>
          <CardHeader>
            <CardTitle>Bàn doanh thu cao nhất</CardTitle>
            <CardDescription>
              Top 10 bàn có doanh thu cao nhất trong khoảng thời gian
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bàn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-center">Đơn hàng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.topRevenueTables.slice(0, 10).map((stats) => {
                  const statusConfig = getTableStatusBadge(stats.table.status);
                  return (
                    <TableRow key={stats.table.id}>
                      <TableCell className="font-medium">
                        {stats.table.tableNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(stats.revenue)}
                      </TableCell>
                      <TableCell className="text-center">
                        {stats.orderCount}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Utilization Tables */}
        <Card>
          <CardHeader>
            <CardTitle>Bàn sử dụng nhiều nhất</CardTitle>
            <CardDescription>
              Top 10 bàn có số lượng đơn hàng nhiều nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bàn</TableHead>
                  <TableHead className="text-center">Đơn hàng</TableHead>
                  <TableHead className="text-center">Khách</TableHead>
                  <TableHead className="text-center">Giờ cao điểm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.topUtilizationTables.slice(0, 10).map((stats) => {
                  const peakHour = getPeakHour(stats.peakHours);
                  return (
                    <TableRow key={stats.table.id}>
                      <TableCell className="font-medium">
                        {stats.table.tableNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        {stats.orderCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {stats.customerCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {peakHour !== null ? `${peakHour}:00` : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* All Tables Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Hiệu suất tất cả bàn</CardTitle>
          <CardDescription>
            Chi tiết hiệu suất của từng bàn trong khoảng thời gian được chọn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bàn</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-center">Đơn hàng</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead className="text-center">Khách</TableHead>
                <TableHead className="text-right">GT Trung bình</TableHead>
                <TableHead className="text-center">Tỷ lệ xoay bàn</TableHead>
                <TableHead className="text-center">Sản phẩm bán</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.tableStats.map((stats) => {
                const statusConfig = getTableStatusBadge(stats.table.status);
                return (
                  <TableRow key={stats.table.id}>
                    <TableCell className="font-medium">
                      {stats.table.tableNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {stats.orderCount}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(stats.revenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {stats.customerCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(stats.averageOrderValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {stats.turnoverRate.toFixed(1)}/ngày
                    </TableCell>
                    <TableCell className="text-center">
                      {stats.itemsSold}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}