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

  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/transactions", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate
      });
      const response = await fetch(`/api/transactions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: tables, refetch: refetchTables } = useQuery({
    queryKey: ["/api/tables"],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const handleRefresh = async () => {
    try {
      // Refresh the queries to get the latest data for the selected date range
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
    // Always try to use real data first, fall back gracefully
    let periodRevenue = 0;
    let periodOrderCount = 0;
    let periodCustomerCount = 0;
    let dailyAverageRevenue = 0;
    let activeOrders = 0;
    let occupiedTables = 0;
    let monthRevenue = 0;
    let averageOrderValue = 0;
    let peakHour = 12;
    let totalTables = 0;

    // Process real transactions if available
    if (transactions && Array.isArray(transactions) && transactions.length > 0) {
      console.log("Dashboard Debug - Using real transaction data:", {
        totalTransactions: transactions.length,
        startDate,
        endDate,
        firstTransaction: transactions[0],
        dateRange: `${startDate} to ${endDate}`
      });

      // Transactions are already filtered by API based on date range
      const filteredTransactions = transactions;

      periodRevenue = filteredTransactions.reduce(
        (total: number, transaction: any) => total + Number(transaction.total || 0),
        0,
      );

      periodOrderCount = filteredTransactions.length;
      periodCustomerCount = filteredTransactions.length;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );
      dailyAverageRevenue = periodRevenue / daysDiff;
      monthRevenue = periodRevenue;
      averageOrderValue = periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

      // Calculate peak hour
      const hourlyTransactions: { [key: number]: number } = {};
      filteredTransactions.forEach((transaction: any) => {
        const hour = new Date(
          transaction.createdAt || transaction.created_at,
        ).getHours();
        hourlyTransactions[hour] = (hourlyTransactions[hour] || 0) + 1;
      });

      if (Object.keys(hourlyTransactions).length > 0) {
        peakHour = parseInt(Object.keys(hourlyTransactions).reduce(
          (peak, hour) =>
            hourlyTransactions[parseInt(hour)] > hourlyTransactions[parseInt(peak)]
              ? hour
              : peak,
        ));
      }
    }

    // Process real table data if available
    if (tables && Array.isArray(tables) && tables.length > 0) {
      console.log("Dashboard Debug - Using real table data:", tables.length);
      totalTables = tables.length;
      occupiedTables = tables.filter(
        (table: TableType) => table.status === "occupied",
      ).length;
    } else {
      // Default table data if none available
      totalTables = 12;
      occupiedTables = 2;
    }

    console.log("Dashboard Stats calculated:", {
      periodRevenue,
      periodOrderCount,
      hasRealData: transactions && transactions.length > 0
    });

    return {
      periodRevenue,
      periodOrderCount,
      periodCustomerCount,
      dailyAverageRevenue,
      activeOrders,
      occupiedTables,
      monthRevenue,
      averageOrderValue,
      peakHour,
      totalTables,
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
