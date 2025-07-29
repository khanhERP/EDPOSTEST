
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, DollarSign, PieChart, BarChart } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from "recharts";

export function FinancialReport() {
  const { t } = useTranslation();

  // Filters
  const [period, setPeriod] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedQuarter, setSelectedQuarter] = useState("1");

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Quarter options
  const quarterOptions = [
    { value: "1", label: t("reports.quarter1") },
    { value: "2", label: t("reports.quarter2") },
    { value: "3", label: t("reports.quarter3") },
    { value: "4", label: t("reports.quarter4") },
  ];

  // Month options
  const monthOptions = [
    { value: "1", label: "Tháng 1" },
    { value: "2", label: "Tháng 2" },
    { value: "3", label: "Tháng 3" },
    { value: "4", label: "Tháng 4" },
    { value: "5", label: "Tháng 5" },
    { value: "6", label: "Tháng 6" },
    { value: "7", label: "Tháng 7" },
    { value: "8", label: "Tháng 8" },
    { value: "9", label: "Tháng 9" },
    { value: "10", label: "Tháng 10" },
    { value: "11", label: "Tháng 11" },
    { value: "12", label: "Tháng 12" },
  ];

  // API queries
  const { data: financialSummary } = useQuery({
    queryKey: ["/api/financial-summary", period, selectedYear, selectedMonth, selectedQuarter],
    queryFn: async () => {
      const url = `/api/financial-summary/${period}/${selectedYear}${period === 'monthly' ? `/${selectedMonth}` : ''}${period === 'quarterly' ? `/${selectedMonth}/${selectedQuarter}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch financial summary');
      return response.json();
    },
    staleTime: 1 * 60 * 1000,
  });

  const { data: incomeBreakdown } = useQuery({
    queryKey: ["/api/income-breakdown", period, selectedYear, selectedMonth, selectedQuarter],
    queryFn: async () => {
      const url = `/api/income-breakdown/${period}/${selectedYear}${period === 'monthly' ? `/${selectedMonth}` : ''}${period === 'quarterly' ? `/${selectedMonth}/${selectedQuarter}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch income breakdown');
      return response.json();
    },
    staleTime: 1 * 60 * 1000,
  });

  const { data: expenseBreakdown } = useQuery({
    queryKey: ["/api/expense-breakdown", period, selectedYear, selectedMonth, selectedQuarter],
    queryFn: async () => {
      const url = `/api/expense-breakdown/${period}/${selectedYear}${period === 'monthly' ? `/${selectedMonth}` : ''}${period === 'quarterly' ? `/${selectedMonth}/${selectedQuarter}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch expense breakdown');
      return response.json();
    },
    staleTime: 1 * 60 * 1000,
  });

  const { data: cashFlow } = useQuery({
    queryKey: ["/api/cash-flow", period, selectedYear, selectedMonth, selectedQuarter],
    queryFn: async () => {
      const url = `/api/cash-flow/${period}/${selectedYear}${period === 'monthly' ? `/${selectedMonth}` : ''}${period === 'quarterly' ? `/${selectedMonth}/${selectedQuarter}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch cash flow');
      return response.json();
    },
    staleTime: 1 * 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPeriodText = () => {
    if (period === 'yearly') {
      return `Năm ${selectedYear}`;
    } else if (period === 'monthly') {
      return `Tháng ${selectedMonth}/${selectedYear}`;
    } else if (period === 'quarterly') {
      return `${quarterOptions.find(q => q.value === selectedQuarter)?.label} ${selectedYear}`;
    }
    return '';
  };

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Prepare chart data
  const profitLossData = financialSummary ? [
    { name: 'Tổng thu nhập', value: financialSummary.totalIncome },
    { name: 'Tổng chi phí', value: -financialSummary.totalExpenses },
    { name: 'Lợi nhuận gộp', value: financialSummary.grossProfit },
    { name: 'Chi phí hoạt động', value: -financialSummary.operatingExpenses },
    { name: 'Thu nhập ròng', value: financialSummary.netIncome },
  ] : [];

  const cashFlowData = cashFlow ? [
    { name: 'Dòng tiền hoạt động', value: cashFlow.operatingCashFlow },
    { name: 'Dòng tiền đầu tư', value: cashFlow.investingCashFlow },
    { name: 'Dòng tiền tài chính', value: cashFlow.financingCashFlow },
    { name: 'Dòng tiền ròng', value: cashFlow.netCashFlow },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t("reports.financialReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.financialReportDescription")} - {getPeriodText()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Period Filter */}
            <div>
              <Label>{t("reports.periodFilter")}</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("reports.monthlyFilter")}</SelectItem>
                  <SelectItem value="quarterly">{t("reports.quarterlyFilter")}</SelectItem>
                  <SelectItem value="yearly">{t("reports.yearlyFilter")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div>
              <Label>Năm</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter (only for monthly period) */}
            {period === "monthly" && (
              <div>
                <Label>Tháng</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quarter Filter (only for quarterly period) */}
            {period === "quarterly" && (
              <div>
                <Label>Quý</Label>
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarterOptions.map((quarter) => (
                      <SelectItem key={quarter.value} value={quarter.value}>
                        {quarter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      {financialSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t("reports.totalIncome")}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialSummary.totalIncome)}
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
                  <p className="text-sm font-medium text-gray-600">{t("reports.totalExpenses")}</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(financialSummary.totalExpenses)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("reports.grossProfit")}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(financialSummary.grossProfit)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("reports.operatingExpenses")}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(financialSummary.operatingExpenses)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("reports.netIncome")}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(financialSummary.netIncome)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">{t("reports.profitMargin")}</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatPercentage(financialSummary.profitMargin)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit & Loss Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5" />
              Lãi lỗ ({getPeriodText()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={profitLossData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#8884d8"
                    name="Giá trị"
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t("reports.cashFlow")} ({getPeriodText()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#82ca9d"
                    name="Dòng tiền"
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Income Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {t("reports.incomeBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={incomeBreakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {(incomeBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {t("reports.expenseBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={expenseBreakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {(expenseBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.incomeBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="text-right">Tỷ lệ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeBreakdown && incomeBreakdown.length > 0 ? (
                  incomeBreakdown.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(item.percentage)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      {t("reports.noReportData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expense Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.expenseBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="text-right">Tỷ lệ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseBreakdown && expenseBreakdown.length > 0 ? (
                  expenseBreakdown.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(item.percentage)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      {t("reports.noReportData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.cashFlow")} - Chi tiết</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại dòng tiền</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlow ? (
                <>
                  <TableRow>
                    <TableCell className="font-medium">{t("reports.operatingCashFlow")}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(cashFlow.operatingCashFlow)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t("reports.investingCashFlow")}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(cashFlow.investingCashFlow)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t("reports.financingCashFlow")}</TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(cashFlow.financingCashFlow)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell className="font-bold">{t("reports.netCashFlow")}</TableCell>
                    <TableCell className="text-right font-bold text-purple-600">
                      {formatCurrency(cashFlow.netCashFlow)}
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-500">
                    {t("reports.noReportData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
