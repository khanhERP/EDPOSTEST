
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function SalesChartReport() {
  const { t } = useTranslation();
  
  const [dateRange, setDateRange] = useState("week");
  const [chartType, setChartType] = useState("bar"); // bar, pie, line
  const [startDate, setStartDate] = useState<string>(
    "2025-01-15"
  );
  const [endDate, setEndDate] = useState<string>(
    "2025-01-20"
  );

  const { data: transactions } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  const getSalesChartData = () => {
    if (!transactions || !Array.isArray(transactions)) return null;
    
    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(transaction.createdAt || transaction.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      return transactionDate >= start && transactionDate <= end;
    });

    // Daily sales data for bar and line charts
    const dailySales: { [date: string]: { revenue: number; orders: number } } = {};
    
    filteredTransactions.forEach((transaction: any) => {
      const date = new Date(transaction.createdAt || transaction.created_at).toLocaleDateString('vi-VN');
      
      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, orders: 0 };
      }
      
      dailySales[date].revenue += Number(transaction.total);
      dailySales[date].orders += 1;
    });

    const dailyChartData = Object.entries(dailySales).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
      name: date
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Payment method data for pie chart
    const paymentMethods: { [method: string]: number } = {};
    
    filteredTransactions.forEach((transaction: any) => {
      const method = transaction.paymentMethod || 'cash';
      paymentMethods[method] = (paymentMethods[method] || 0) + Number(transaction.total);
    });

    const pieChartData = Object.entries(paymentMethods).map(([method, revenue]) => ({
      name: getPaymentMethodLabel(method),
      value: revenue,
      method
    }));

    // Hourly sales data
    const hourlySales: { [hour: number]: number } = {};
    
    filteredTransactions.forEach((transaction: any) => {
      const hour = new Date(transaction.createdAt || transaction.created_at).getHours();
      hourlySales[hour] = (hourlySales[hour] || 0) + Number(transaction.total);
    });

    const hourlyChartData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      revenue: hourlySales[hour] || 0,
      name: `${hour}:00`
    }));

    // Total stats
    const totalRevenue = filteredTransactions.reduce((sum: number, transaction: any) => 
      sum + Number(transaction.total), 0
    );
    const totalOrders = filteredTransactions.length;

    return {
      dailyChartData,
      pieChartData,
      hourlyChartData,
      totalRevenue,
      totalOrders,
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

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: t("reports.cash"),
      card: t("reports.card"),
      mobile: 'Mobile'
    };
    return labels[method as keyof typeof labels] || method;
  };

  const chartConfig = {
    revenue: {
      label: t("reports.revenue"),
      color: "#10b981",
    },
    orders: {
      label: t("reports.orders"),
      color: "#3b82f6",
    },
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const salesData = getSalesChartData();

  if (!salesData) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ChartContainer config={chartConfig} className="h-[400px]">
            <BarChart data={salesData.dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="#10b981" name={t("reports.revenue")} />
            </BarChart>
          </ChartContainer>
        );
      
      case "pie":
        return (
          <ChartContainer config={chartConfig} className="h-[400px]">
            <PieChart>
              <Pie
                data={salesData.pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {salesData.pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        );
      
      case "line":
        return (
          <ChartContainer config={chartConfig} className="h-[400px]">
            <LineChart data={salesData.hourlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={2}
                name={t("reports.revenue")}
              />
            </LineChart>
          </ChartContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {t("reports.salesChart")}
              </CardTitle>
              <CardDescription>{t("reports.salesChartDescription")}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      {t("reports.barChart")}
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" />
                      {t("reports.pieChart")}
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {t("reports.lineChart")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("reports.totalRevenue")}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(salesData.totalRevenue)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("reports.totalOrders")}</p>
                <p className="text-2xl font-bold">{salesData.totalOrders}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("reports.averageOrderValue")}: {formatCurrency(salesData.totalOrders > 0 ? salesData.totalRevenue / salesData.totalOrders : 0)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {chartType === "bar" && t("reports.dailyRevenue")}
            {chartType === "pie" && t("reports.paymentMethodDistribution")}
            {chartType === "line" && t("reports.hourlyRevenue")}
          </CardTitle>
          <CardDescription>
            {chartType === "bar" && t("reports.barChartDesc")}
            {chartType === "pie" && t("reports.pieChartDesc")}
            {chartType === "line" && t("reports.lineChartDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Legend for Pie Chart */}
      {chartType === "pie" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.paymentMethodDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {salesData.pieChartData.map((entry, index) => (
                <div key={entry.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(entry.value)}</div>
                    <div className="text-xs text-gray-500">
                      {((entry.value / salesData.totalRevenue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
