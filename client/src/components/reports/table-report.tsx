import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Utensils, TrendingUp, Clock, DollarSign, Users, RefreshCw, Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function TableReport() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Query orders by date range
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
        console.error('Table Report - Error fetching orders:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Query order items by date range
  const { data: orderItems = [], isLoading: orderItemsLoading, refetch: refetchOrderItems } = useQuery({
    queryKey: ["/api/order-items/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/order-items/${startDate}/${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Table Report - Error fetching order items:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Query tables
  const { data: tables = [] } = useQuery({
    queryKey: ["/api/tables"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/tables");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  const getTableAnalysis = () => {
    try {
      if (ordersLoading || orderItemsLoading) {
        return {
          tableStats: [],
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          averageOrderValue: 0,
          peakHour: 12,
          tableUtilization: 0,
        };
      }

      const validOrders = Array.isArray(orders) ? orders : [];
      const validOrderItems = Array.isArray(orderItems) ? orderItems : [];
      const validTables = Array.isArray(tables) ? tables : [];

      // Filter completed/paid orders only
      const completedOrders = validOrders.filter((order: any) => 
        order.status === 'paid' || order.status === 'completed'
      );

      console.log("Table Report Debug:", {
        totalOrders: validOrders.length,
        completedOrders: completedOrders.length,
        totalOrderItems: validOrderItems.length,
        totalTables: validTables.length,
        dateRange: `${startDate} to ${endDate}`,
      });

      // Group order items by order ID to avoid duplicates
      const orderItemsMap = new Map<string, any[]>();
      validOrderItems.forEach((item: any) => {
        if (!orderItemsMap.has(item.orderId)) {
          orderItemsMap.set(item.orderId, []);
        }
        orderItemsMap.get(item.orderId)!.push(item);
      });

      // Calculate table statistics from completed orders
      const tableStatsMap = new Map<number, any>();

      // Initialize table stats for all tables
      validTables.forEach((table: any) => {
        tableStatsMap.set(table.id, {
          tableId: table.id,
          tableName: table.name,
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          averageOrderValue: 0,
          peakHour: 0,
          hourlyBreakdown: {} as { [hour: number]: number },
          utilizationRate: 0,
        });
      });

      // Process completed orders
      completedOrders.forEach((order: any) => {
        const tableId = order.tableId;
        if (!tableId || !tableStatsMap.has(tableId)) return;

        const tableStats = tableStatsMap.get(tableId);
        const orderTotal = Number(order.total || 0);
        const orderDate = new Date(order.orderedAt || order.createdAt);

        // Update table statistics
        tableStats.totalRevenue += orderTotal;
        tableStats.totalOrders += 1;
        tableStats.totalCustomers += 1; // Each order represents a customer session

        // Hourly breakdown
        if (!isNaN(orderDate.getTime())) {
          const hour = orderDate.getHours();
          tableStats.hourlyBreakdown[hour] = (tableStats.hourlyBreakdown[hour] || 0) + 1;
        }
      });

      // Calculate derived statistics
      tableStatsMap.forEach((stats) => {
        stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

        // Find peak hour
        const hourlyEntries = Object.entries(stats.hourlyBreakdown);
        if (hourlyEntries.length > 0) {
          const peakEntry = hourlyEntries.reduce((max, current) => 
            current[1] > max[1] ? current : max
          );
          stats.peakHour = parseInt(peakEntry[0]);
        }

        // Calculate utilization rate (simplified: orders per day)
        const daysDiff = Math.max(1, Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1);
        stats.utilizationRate = (stats.totalOrders / daysDiff) * 100;
      });

      // Convert to array and sort by revenue
      const tableStats = Array.from(tableStatsMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calculate totals
      const totalRevenue = completedOrders.reduce((sum: number, order: any) => 
        sum + Number(order.total || 0), 0);
      const totalOrders = completedOrders.length;
      const totalCustomers = new Set(completedOrders.map((order: any) => 
        order.customerId || order.customerName || `order_${order.id}`
      )).size;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Find overall peak hour
      const allHourlyBreakdown: { [hour: number]: number } = {};
      completedOrders.forEach((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        if (!isNaN(orderDate.getTime())) {
          const hour = orderDate.getHours();
          allHourlyBreakdown[hour] = (allHourlyBreakdown[hour] || 0) + 1;
        }
      });

      const peakHour = Object.keys(allHourlyBreakdown).reduce(
        (peak, hour) =>
          allHourlyBreakdown[parseInt(hour)] > (allHourlyBreakdown[parseInt(peak)] || 0)
            ? hour
            : peak,
        "12",
      );

      // Calculate overall table utilization
      const occupiedTables = validTables.filter((table: any) => table.status === "occupied").length;
      const tableUtilization = validTables.length > 0 ? (occupiedTables / validTables.length) * 100 : 0;

      return {
        tableStats,
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue,
        peakHour: parseInt(peakHour),
        tableUtilization,
      };
    } catch (error) {
      console.error("Error in getTableAnalysis:", error);
      return {
        tableStats: [],
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
        peakHour: 12,
        tableUtilization: 0,
      };
    }
  };

  const handleRefresh = () => {
    refetchOrders();
    refetchOrderItems();
    queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
  };

  const formatCurrency = (amount: number) => {
    return `${(amount || 0).toLocaleString()} ₫`;
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

  const analysis = getTableAnalysis();
  const isLoading = ordersLoading || orderItemsLoading;
  const hasError = !!ordersError;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading") || "Đang tải..."}</div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-red-500">
          Lỗi tải dữ liệu: {ordersError?.message || "Unknown error"}
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

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Utensils className="w-5 h-5" />
                {t('reports.tableAnalysis') || 'Phân tích bàn'}
              </CardTitle>
              <CardDescription>
                {t("reports.analyzeTableRevenueTrend") || "Phân tích xu hướng doanh thu theo bàn"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date">
                {t("reports.startDate") || "Từ ngày"}:
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              <Label htmlFor="end-date">{t("reports.endDate") || "Đến ngày"}:</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
              
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue") || "Tổng doanh thu"}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(analysis.totalRevenue)}
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
                  {t("reports.totalOrders") || "Tổng đơn hàng"}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {analysis.totalOrders}
                </p>
              </div>
              <Utensils className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.averageOrderValue") || "Giá trị trung bình"}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(analysis.averageOrderValue)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.tableUtilization") || "Sử dụng bàn"}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {analysis.tableUtilization.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("reports.peakHour") || "Giờ cao điểm"}: {analysis.peakHour}h
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            {t("reports.tablePerformance") || "Hiệu suất bàn"}
          </CardTitle>
          <CardDescription>
            {t("reports.analyzeRevenue") || "Phân tích doanh thu và hiệu suất theo từng bàn"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.tableStats.length === 0 ? (
            <div className="text-center py-8">
              <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">Không có dữ liệu bàn</p>
              <p className="text-gray-400 text-sm">
                Chọn khoảng thời gian có dữ liệu bán hàng để xem phân tích
              </p>
              <Button 
                onClick={handleRefresh} 
                className="mt-4 flex items-center gap-2 mx-auto"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới dữ liệu
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.table") || "Bàn"}</TableHead>
                    <TableHead className="text-right">{t("reports.revenue") || "Doanh thu"}</TableHead>
                    <TableHead className="text-right">{t("reports.totalOrders") || "Số đơn"}</TableHead>
                    <TableHead className="text-right">{t("reports.totalCustomers") || "Khách hàng"}</TableHead>
                    <TableHead className="text-right">{t("reports.averageOrderValue") || "Đơn TB"}</TableHead>
                    <TableHead className="text-center">{t("reports.peakHour") || "Giờ cao điểm"}</TableHead>
                    <TableHead className="text-right">{t("reports.utilizationRate") || "Tỷ lệ sử dụng"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.tableStats.map((tableStats, index) => (
                    <TableRow key={tableStats.tableId} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            tableStats.totalRevenue > 0 ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                          {tableStats.tableName || `Bàn ${tableStats.tableId}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(tableStats.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {tableStats.totalOrders}
                      </TableCell>
                      <TableCell className="text-right">
                        {tableStats.totalCustomers}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tableStats.averageOrderValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        {tableStats.peakHour > 0 ? (
                          <Badge variant="outline">
                            {tableStats.peakHour}:00
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={tableStats.utilizationRate > 50 ? "default" : "secondary"}
                          className={tableStats.utilizationRate > 50 ? "bg-green-100 text-green-800" : ""}
                        >
                          {tableStats.utilizationRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}