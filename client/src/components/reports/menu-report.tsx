import { useState, useEffect } from "react";
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
import { PieChart, TrendingUp, Award, Search, Filter } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function MenuReport() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [productType, setProductType] = useState("all");

  // Categories query for filter
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
  });

  // Use the new optimized API endpoint with filters
  const { data: menuData, isLoading } = useQuery({
    queryKey: [
      "/api/menu-analysis",
      startDate,
      endDate,
      productSearch,
      selectedCategory,
      productType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(productSearch && { search: productSearch }),
        ...(selectedCategory !== "all" && { categoryId: selectedCategory }),
        ...(productType !== "all" && { productType }),
      });
      const response = await fetch(`/api/menu-analysis?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch menu analysis data");
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

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
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(lastMonthStart.toISOString().split("T")[0]);
        setEndDate(lastMonthEnd.toISOString().split("T")[0]);
        break;
      case "lastmonth":
        // Tháng trước: từ ngày 1 tháng trước đến ngày cuối tháng trước
        const lastMonthStart2 = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const lastMonthEnd2 = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(lastMonthStart2.toISOString().split("T")[0]);
        setEndDate(lastMonthEnd2.toISOString().split("T")[0]);
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  // Initialize default empty data structure if no data or error
  const defaultData = {
    totalRevenue: 0,
    totalQuantity: 0,
    categoryStats: [],
    productStats: [],
    topSellingProducts: [],
    topRevenueProducts: [],
  };

  const displayData = menuData || defaultData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            {t("reports.menuAnalysis")}
          </CardTitle>
          <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <Label>{t("reports.dateRange")}</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("reports.toDay")}</SelectItem>
                  <SelectItem value="week">{t("reports.lastWeek")}</SelectItem>
                  <SelectItem value="month">
                    {t("reports.lastMonth")}
                  </SelectItem>
                  <SelectItem value="lastmonth">
                    {t("reports.lastMonth")}
                  </SelectItem>
                  <SelectItem value="custom">{t("reports.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div>
                  <Label>{t("reports.startDate")}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("reports.endDate")}</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Product Search */}
            <div>
              <Label>{t("reports.productFilter")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t("reports.productFilterPlaceholder")}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Label>{t("common.category")}</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {categories?.map((category: any) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Type Filter */}
            <div>
              <Label>{t("reports.productType")}</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="combo">{t("reports.combo")}</SelectItem>
                  <SelectItem value="product">
                    {t("reports.product")}
                  </SelectItem>
                  <SelectItem value="service">
                    {t("reports.service")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(displayData.totalRevenue)}
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
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalOrders")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {displayData.totalQuantity.toLocaleString()}
                </p>
              </div>
              <Award className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.uniqueProducts")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {displayData.productStats.length}
                </p>
              </div>
              <PieChart className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.categoryPerformance")}</CardTitle>
          <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayData.categoryStats.map((category: any) => {
              const revenuePercentage =
                displayData.totalRevenue > 0
                  ? (category.revenue / displayData.totalRevenue) * 100
                  : 0;
              const quantityPercentage =
                displayData.totalQuantity > 0
                  ? (category.quantity / displayData.totalQuantity) * 100
                  : 0;

              return (
                <div key={category.category.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{category.category.name}</Badge>
                      <span className="text-sm text-gray-600">
                        {t("reports.menuItems").replace(
                          "{count}",
                          category.productCount,
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(category.revenue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t("reports.itemsSold").replace(
                          "{count}",
                          category.quantity,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t("reports.revenueShare")}</span>
                      <span>{revenuePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${revenuePercentage}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t("reports.salesShare")}</span>
                      <span>{quantityPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${quantityPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}

            {displayData.categoryStats.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                {t("reports.noCategoryData")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              {t("reports.popularMenuByQuantity")}
            </CardTitle>
            <CardDescription>
              {t("reports.popularMenuByQuantityDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.rank")}</TableHead>
                  <TableHead>{t("reports.menuName")}</TableHead>
                  <TableHead>{t("reports.salesCount")}</TableHead>
                  <TableHead>{t("reports.revenue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.topSellingProducts
                  .slice(0, 10)
                  .map((item: any, index: number) => (
                    <TableRow key={item.product.id}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "outline"}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.product.name}
                      </TableCell>
                      <TableCell>
                        {item.quantity} {t("common.items")}
                      </TableCell>
                      <TableCell>{formatCurrency(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                {displayData.topSellingProducts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-500"
                    >
                      {t("reports.noSalesData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Revenue Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t("reports.highRevenueMenu")}
            </CardTitle>
            <CardDescription>
              {t("reports.highRevenueMenuDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.rank")}</TableHead>
                  <TableHead>{t("reports.menuName")}</TableHead>
                  <TableHead>{t("reports.revenue")}</TableHead>
                  <TableHead>{t("reports.salesCount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.topRevenueProducts
                  .slice(0, 10)
                  .map((item: any, index: number) => (
                    <TableRow key={item.product.id}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "outline"}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.product.name}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                      <TableCell>
                        {item.quantity} {t("common.items")}
                      </TableCell>
                    </TableRow>
                  ))}
                {displayData.topRevenueProducts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-500"
                    >
                      {t("reports.noRevenueData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
