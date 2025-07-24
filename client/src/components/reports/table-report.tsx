import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Utensils, Clock, Users, TrendingUp } from "lucide-react";
import type { Order, Table as TableType } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";

export function TableReport() {
  const { t } = useTranslation();
  
  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['/api/tables'],
  });

  const getTableData = () => {
    if (!orders || !tables) return null;

    const filteredOrders = (orders as Order[]).filter((order: Order) => {
      const orderDate = new Date(order.orderedAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      return orderDate >= start && orderDate <= end && order.status === 'paid';
    });

    // Table performance analysis
    const tableStats: { [tableId: number]: {
      table: TableType;
      orderCount: number;
      revenue: number;
      customerCount: number;
      averageOrderValue: number;
      turnoverRate: number;
      peakHours: { [hour: number]: number };
    } } = {};

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
        stats.revenue += Number(order.total);
        stats.customerCount += order.customerCount || 0;
        
        // Track peak hours
        const hour = new Date(order.orderedAt).getHours();
        stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1;
      }
    });

    // Calculate derived metrics
    Object.values(tableStats).forEach(stats => {
      if (stats.orderCount > 0) {
        stats.averageOrderValue = stats.revenue / stats.orderCount;
        // Calculate turnover rate (orders per day over the period)
        const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
        stats.turnoverRate = stats.orderCount / days;
      }
    });

    // Sort tables by different metrics
    const tableList = Object.values(tableStats);
    const topRevenueTables = [...tableList].sort((a, b) => b.revenue - a.revenue);
    const topTurnoverTables = [...tableList].sort((a, b) => b.turnoverRate - a.turnoverRate);
    const topUtilizationTables = [...tableList].sort((a, b) => b.orderCount - a.orderCount);

    // Overall stats
    const totalRevenue = tableList.reduce((sum, stats) => sum + stats.revenue, 0);
    const totalOrders = tableList.reduce((sum, stats) => sum + stats.orderCount, 0);
    const totalCustomers = tableList.reduce((sum, stats) => sum + stats.customerCount, 0);
    const averageUtilization = tableList.length > 0 
      ? tableList.reduce((sum, stats) => sum + stats.orderCount, 0) / tableList.length 
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
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "week":
        setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const getTableStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: t("common.available"), variant: "default" as const },
      occupied: { label: t("common.occupied"), variant: "destructive" as const },
      reserved: { label: t("common.reserved"), variant: "secondary" as const },
      maintenance: { label: t("common.maintenance"), variant: "outline" as const },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  };

  const getPeakHour = (peakHours: { [hour: number]: number }) => {
    const hours = Object.keys(peakHours);
    if (hours.length === 0) return null;
    
    const peak = hours.reduce((max, hour) => 
      peakHours[parseInt(hour)] > peakHours[parseInt(max)] ? hour : max
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
              <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("reports.toDay")}</SelectItem>
                  <SelectItem value="week">{t("reports.lastWeek")}</SelectItem>
                  <SelectItem value="month">{t("reports.lastMonth")}</SelectItem>
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
                <p className="text-sm font-medium text-gray-600">평균 이용률</p>
                <p className="text-2xl font-bold">
                  {tableData.averageUtilization.toFixed(1)}회
                </p>
                <p className="text-xs text-gray-500">테이블당 평균 주문 수</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 주문 건수</p>
                <p className="text-2xl font-bold">{tableData.totalOrders}</p>
                <p className="text-xs text-gray-500">전체 테이블</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 고객 수</p>
                <p className="text-2xl font-bold">{tableData.totalCustomers}</p>
                <p className="text-xs text-gray-500">누적 방문 고객</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 매출</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(tableData.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500">테이블별 합계</p>
              </div>
              <Utensils className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table Performance */}
      <Card>
        <CardHeader>
          <CardTitle>테이블별 상세 성과</CardTitle>
          <CardDescription>각 테이블의 상세한 운영 지표를 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>테이블</TableHead>
                <TableHead>현재 상태</TableHead>
                <TableHead>주문 수</TableHead>
                <TableHead>매출</TableHead>
                <TableHead>고객 수</TableHead>
                <TableHead>평균 주문가</TableHead>
                <TableHead>회전율</TableHead>
                <TableHead>피크 시간</TableHead>
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
                          <div className={`w-3 h-3 rounded-full ${
                            stats.table.status === 'occupied' ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                          {stats.table.tableNumber}
                          <span className="text-xs text-gray-500">
                            ({stats.table.capacity}명)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{stats.orderCount}건</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(stats.revenue)}
                      </TableCell>
                      <TableCell>{stats.customerCount}명</TableCell>
                      <TableCell>
                        {stats.orderCount > 0 ? formatCurrency(stats.averageOrderValue) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stats.turnoverRate > 1 ? "default" : "outline"}>
                          {stats.turnoverRate.toFixed(1)}회/일
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {peakHour !== null ? `${peakHour}시` : '-'}
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
              매출 상위 테이블
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tableData.topRevenueTables.slice(0, 5).map((stats: any, index: number) => (
                <div key={stats.table.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Badge variant={index < 3 ? "default" : "outline"} className="text-xs">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{stats.table.tableNumber}</span>
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
              회전율 상위 테이블
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tableData.topTurnoverTables.slice(0, 5).map((stats: any, index: number) => (
                <div key={stats.table.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Badge variant={index < 3 ? "default" : "outline"} className="text-xs">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{stats.table.tableNumber}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {stats.turnoverRate.toFixed(1)}회/일
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
              이용률 상위 테이블
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tableData.topUtilizationTables.slice(0, 5).map((stats: any, index: number) => (
                <div key={stats.table.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Badge variant={index < 3 ? "default" : "outline"} className="text-xs">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{stats.table.tableNumber}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {stats.orderCount}건
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