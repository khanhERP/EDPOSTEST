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
import { TrendingUp, Calendar, DollarSign } from "lucide-react";
import type { Transaction } from "@shared/schema";
import { useTranslation, useLanguageStore } from "@/lib/i18n";

export function SalesReport() {
  const { t } = useTranslation();

  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const getSalesData = () => {
    if (!transactions || !Array.isArray(transactions)) return null;

    console.log("Sales Report Debug:", {
      totalTransactions: transactions.length,
      startDate,
      endDate,
      firstTransaction: transactions[0],
    });

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      return transactionDate >= start && transactionDate <= end;
    });

    console.log("Filtered Transactions:", filteredTransactions.length);

    // Daily sales breakdown
    const dailySales: {
      [date: string]: { revenue: number; orders: number; customers: number };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const date = new Date(transaction.createdAt || transaction.created_at)
        .toISOString()
        .split("T")[0];

      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, orders: 0, customers: 0 };
      }

      dailySales[date].revenue += Number(transaction.total);
      dailySales[date].orders += 1;
      dailySales[date].customers += 1; // Each transaction represents one customer
    });

    // Payment method breakdown
    const paymentMethods: {
      [method: string]: { count: number; revenue: number };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const method = transaction.paymentMethod || "cash";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, revenue: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].revenue += Number(transaction.total);
    });

    // Hourly breakdown
    const hourlySales: { [hour: number]: number } = {};

    filteredTransactions.forEach((transaction: any) => {
      const hour = new Date(
        transaction.createdAt || transaction.created_at,
      ).getHours();
      hourlySales[hour] = (hourlySales[hour] || 0) + Number(transaction.total);
    });

    // Total stats
    const totalRevenue = filteredTransactions.reduce(
      (sum: number, transaction: any) => sum + Number(transaction.total),
      0,
    );
    const totalOrders = filteredTransactions.length;
    const totalCustomers = filteredTransactions.length; // Each transaction is one customer
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      dailySales: Object.entries(dailySales)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({
        method,
        ...data,
      })),
      hourlySales,
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageOrderValue,
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
        setStartDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        );
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(monthStart.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: t("reports.cash"),
      card: t("reports.card"),
      credit_card: t("reports.credit_card"),
      mobile: "Mobile",
    };
    return labels[method as keyof typeof labels] || method;
  };

  const salesData = getSalesData();

  if (!salesData) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  const peakHour = Object.entries(salesData.hourlySales).reduce(
    (peak, [hour, revenue]) =>
      revenue > (salesData.hourlySales[parseInt(peak)] || 0) ? hour : peak,
    "12",
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t("reports.salesAnalysis")}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(salesData.totalRevenue)}
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
                  {t("reports.totalOrders")}
                </p>
                <p className="text-2xl font-bold">{salesData.totalOrders}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t("reports.averageOrderValue")}
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(salesData.averageOrderValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t("reports.totalCustomers")}
              </p>
              <p className="text-2xl font-bold">{salesData.totalCustomers}</p>
              <p className="text-xs text-gray-500 mt-1">
                {t("reports.peakHour")}: {peakHour}
                {t("reports.hour")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.dailySales")}</CardTitle>
            <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("reports.revenue")}</TableHead>
                  <TableHead>{t("reports.orders")}</TableHead>
                  <TableHead>{t("reports.customers")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.dailySales.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{formatDate(day.date)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(day.revenue)}
                    </TableCell>
                    <TableCell>
                      {day.orders} {t("reports.count")}
                    </TableCell>
                    <TableCell>
                      {day.customers} {t("reports.count")}
                    </TableCell>
                  </TableRow>
                ))}
                {salesData.dailySales.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-500"
                    >
                      {t("reports.noDataDescription")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.paymentMethods")}</CardTitle>
            <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData.paymentMethods.map((payment) => {
                const percentage =
                  salesData.totalRevenue > 0
                    ? (payment.revenue / salesData.totalRevenue) * 100
                    : 0;

                return (
                  <div key={payment.method} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getPaymentMethodLabel(payment.method)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {payment.count} {t("reports.count")}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(payment.revenue)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}

              {salesData.paymentMethods.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  {t("reports.noPaymentData")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
