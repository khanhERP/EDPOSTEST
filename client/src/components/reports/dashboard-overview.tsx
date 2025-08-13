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
} from "lucide-react";
import type { Order, Table as TableType } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";

export function formatDateToYYYYMMDD(date: Date | string | number): string {
  const d = new Date(date); // Ensure input is a Date
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DashboardOverview() {
  const { t, currentLanguage } = useTranslation();

  const [startDate, setStartDate] = useState<string>(
    formatDateToYYYYMMDD(new Date()), // Set to a date that has sample data
  );
  const [endDate, setEndDate] = useState<string>(
    formatDateToYYYYMMDD(new Date()), // End date with sample data
  );
  const queryClient = useQueryClient();

  const { data: transactions, isLoading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/transactions", startDate, endDate],
    refetchInterval: 30000,
  });

  const { data: tables, isLoading: tablesLoading, error: tablesError, refetch: refetchTables } = useQuery({
    queryKey: ["/api/tables", startDate, endDate],
    refetchInterval: 30000,
  });

  const handleRefresh = async () => {
    try {
      // Refresh the queries to get the latest data for the selected date
      setStartDate(formatDateToYYYYMMDD(new Date()));
      setEndDate(formatDateToYYYYMMDD(new Date()));
      
      await Promise.all([
        refetchTransactions(),
        refetchTables(),
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] })
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    }
  };

  const getDashboardStats = () => {
    // Return null if data is not available or not in correct format
    if (
      !transactions ||
      !tables ||
      !Array.isArray(transactions) ||
      !Array.isArray(tables)
    ) {
      console.log("Dashboard Debug - Missing data:", {
        transactions: !!transactions,
        tables: !!tables,
        transactionsArray: Array.isArray(transactions),
        tablesArray: Array.isArray(tables)
      });
      return null;
    }

    console.log("Dashboard Debug - API Response:", {
      totalTransactions: transactions.length,
      totalTables: tables.length,
      startDate,
      endDate,
      firstTransaction: transactions[0],
      firstTable: tables[0],
      allTransactionDates: transactions.map((t: any) =>
        new Date(t.createdAt || t.created_at).toDateString(),
      ),
      transactionsStructure: transactions.slice(0, 2),
      tablesStructure: tables.slice(0, 2)
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      return transactionDate >= start && transactionDate <= end;
    });

    // Period stats
    const periodRevenue = filteredTransactions.reduce(
      (total: number, transaction: any) => total + Number(transaction.total),
      0,
    );

    const periodOrderCount = filteredTransactions.length;
    const periodCustomerCount = filteredTransactions.length; // Each transaction represents customers

    // Daily average for the period
    const daysDiff = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const dailyAverageRevenue = periodRevenue / daysDiff;

    // Current status (for active orders, we need to check the orders table separately)
    const activeOrders = 0; // Will show 0 since we're using transactions data

    const occupiedTables = tables.filter(
      (table: TableType) => table.status === "occupied",
    );

    // Revenue for selected date range (displayed as "month revenue")
    const monthRevenue = periodRevenue;

    // Average order value
    const averageOrderValue =
      periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

    // Peak hours analysis from filtered transactions
    const hourlyTransactions: { [key: number]: number } = {};
    filteredTransactions.forEach((transaction: any) => {
      const hour = new Date(
        transaction.createdAt || transaction.created_at,
      ).getHours();
      hourlyTransactions[hour] = (hourlyTransactions[hour] || 0) + 1;
    });

    const peakHour = Object.keys(hourlyTransactions).reduce(
      (peak, hour) =>
        hourlyTransactions[parseInt(hour)] > hourlyTransactions[parseInt(peak)]
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
      totalTables: tables.length,
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
  if (transactionsLoading || tablesLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  // Show error state
  if (transactionsError || tablesError) {
    return (
      <div className="flex flex-col items-center py-8 space-y-4">
        <div className="text-red-500">
          {t("reports.loadingError") || "Lỗi khi tải dữ liệu"}
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <Search className="w-4 h-4 mr-1" />
          {t("reports.refresh")}
        </Button>
      </div>
    );
  }

  // Show no data state
  if (!stats) {
    return (
      <div className="flex flex-col items-center py-8 space-y-4">
        <div className="text-gray-500">
          {t("reports.noData") || "Không có dữ liệu để hiển thị"}
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <Search className="w-4 h-4 mr-1" />
          {t("reports.refresh")}
        </Button>
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
              <CardTitle>{t("reports.dashboard")}</CardTitle>
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
                  {t("reports.periodRevenue")}
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
                  {t("reports.orderCount")}
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
                  {t("reports.customerCount")}
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.monthRevenue")}
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
                {t("reports.pendingOrders")}
              </span>
              <Badge variant={stats.activeOrders > 0 ? "default" : "outline"}>
                {stats.activeOrders} {t("reports.count")}
              </Badge>
            </div>
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
                {Math.round((stats.occupiedTables / stats.totalTables) * 100)} %
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
