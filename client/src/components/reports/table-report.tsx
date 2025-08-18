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

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["/api/tables"],
  });

  const getTableData = () => {
    if (!orders || !tables) return null;

    const filteredOrders = (orders as Order[]).filter((order: Order) => {
      const orderDate = new Date(order.orderedAt);

      // Sử dụng format ngày nhất quán như sales-report
      const orderDateStr = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, "0")}-${orderDate.getDate().toString().padStart(2, "0")}`;

      const isInDateRange = orderDateStr >= startDate && orderDateStr <= endDate;

      // Chỉ loại bỏ đơn hàng bị hủy hoặc không có total
      const isValidOrder = order.status && order.status !== "cancelled" && order.total && Number(order.total) > 0;

      // Debug logging cho hôm nay
      if (dateRange === "today") {
        console.log("Table Report Debug:", {
          orderId: order.id,
          orderDateStr,
          startDate,
          endDate,
          status: order.status,
          tableId: order.tableId,
          total: order.total,
          isInDateRange,
          isValidOrder
        });
      }

      return isInDateRange && isValidOrder;
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
      };
    });

    // Calculate stats from orders
    filteredOrders.forEach((order: Order) => {
      if (tableStats[order.tableId]) {
        const stats = tableStats[order.tableId];
        stats.orderCount += 1;
        
        // Revenue = subtotal - discount (excluding tax)
        const subtotal = Number(order.subtotal || order.total);
        const discount = Number(order.discount || 0);
        const revenue = subtotal - discount;
        stats.revenue += revenue;
        
        stats.customerCount += order.customerCount || 0;

        // Track peak hours
        const hour = new Date(order.orderedAt).getHours();
        stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1;
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

    // Debug logging
    console.log("Table Report Stats:", {
      dateRange,
      startDate,
      endDate,
      totalFilteredOrders: filteredOrders.length,
      totalRevenue,
      totalOrders,
      averageUtilization,
      tablesCount: tableList.length,
      sampleOrder: filteredOrders[0] || null,
      allOrdersCount: orders?.length || 0
    });

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
        // Tuần trước: từ thứ 2 tuần trước đến chủ nhật tuần trước
        const currentDayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        const daysToLastMonday =
          currentDayOfWeek === 0 ? 13 : currentDayOfWeek + 6; // Nếu hôm nay là CN thì lùi 13 ngày, không thì lùi (ngày hiện tại + 6)
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
        // Tháng trước: từ ngày 1 tháng trước đến ngày cuối tháng trước
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Tính tháng trước
        const lastMonthYear = month === 0 ? year - 1 : year;
        const lastMonth = month === 0 ? 11 : month - 1;

        // Ngày đầu tháng trước
        const lastMonthStart = new Date(lastMonthYear, lastMonth, 1);
        // Ngày cuối tháng trước
        const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0);

        // Format thành YYYY-MM-DD
        const startDateStr = `${lastMonthStart.getFullYear()}-${(lastMonthStart.getMonth() + 1).toString().padStart(2, "0")}-${lastMonthStart.getDate().toString().padStart(2, "0")}`;
        const endDateStr = `${lastMonthEnd.getFullYear()}-${(lastMonthEnd.getMonth() + 1).toString().padStart(2, "0")}-${lastMonthEnd.getDate().toString().padStart(2, "0")}`;

        setStartDate(startDateStr);
        setEndDate(endDateStr);
        break;
      case "custom":
        // Luôn set ngày hiện tại khi chọn tùy chỉnh
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

  if (!tableData) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
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
                  {t("reports.totalCustomers")}
                </p>
                <p className="text-2xl font-bold">{tableData.totalCustomers}</p>
                <p className="text-xs text-gray-500">
                  {t("reports.cumulativeVisitors")}
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
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(tableData.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500">
                  {t("reports.totalByTable")}
                </p>
              </div>
              <Utensils className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            {t("reports.tableAnalysis")}
          </CardTitle>
          <CardDescription>
            {t("reports.tableAnalysisDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.table")}</TableHead>
                <TableHead>{t("reports.currentStatus")}</TableHead>
                <TableHead>{t("reports.orderCount")}</TableHead>
                <TableHead>{t("reports.revenue")}</TableHead>
                <TableHead>{t("reports.customerCount")}</TableHead>
                <TableHead>{t("reports.averageOrderValue")}</TableHead>
                <TableHead>{t("reports.turnoverRate")}</TableHead>
                <TableHead>{t("reports.peakTime")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.tableStats
                .sort((a, b) => b.revenue - a.revenue)
                .map((stats) => {
                  const statusConfig = getTableStatusBadge(stats.table.status);
                  const peakHour = getPeakHour(stats.peakHours);

                  return (
                    <TableRow key={stats.table.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              stats.table.status === "occupied"
                                ? "bg-red-500"
                                : "bg-green-500"
                            }`}
                          ></div>
                          {stats.table.tableNumber}
                          <span className="text-xs text-gray-500">
                            ({stats.table.capacity} {t("common.people")})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {stats.orderCount} {t("common.count")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(stats.revenue)}
                      </TableCell>
                      <TableCell>
                        {stats.customerCount} {t("common.people")}
                      </TableCell>
                      <TableCell>
                        {stats.orderCount > 0
                          ? formatCurrency(stats.averageOrderValue)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            stats.turnoverRate > 1 ? "default" : "outline"
                          }
                        >
                          {stats.turnoverRate.toFixed(1)}{" "}
                          {t("reports.timesPerDay")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {peakHour !== null
                          ? `${peakHour} ${t("reports.hour")}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Revenue Tables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4" />
              {t("reports.topRevenueTables")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tableData.topRevenueTables
                .slice(0, 5)
                .map((stats: any, index: number) => (
                  <div
                    key={stats.table.id}
                    className="flex justify-between items-center p-2 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={index < 3 ? "default" : "outline"}
                        className="text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">
                        {stats.table.tableNumber}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(stats.revenue)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Turnover Tables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              {t("reports.topTurnoverTables")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tableData.topTurnoverTables
                .slice(0, 5)
                .map((stats: any, index: number) => (
                  <div
                    key={stats.table.id}
                    className="flex justify-between items-center p-2 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={index < 3 ? "default" : "outline"}
                        className="text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">
                        {stats.table.tableNumber}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      {stats.turnoverRate.toFixed(1)} {t("reports.timesPerDay")}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Utilization Tables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" />
              {t("reports.topUtilizationTables")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tableData.topUtilizationTables
                .slice(0, 5)
                .map((stats: any, index: number) => (
                  <div
                    key={stats.table.id}
                    className="flex justify-between items-center p-2 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={index < 3 ? "default" : "outline"}
                        className="text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">
                        {stats.table.tableNumber}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      {stats.orderCount} {t("common.count")}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}