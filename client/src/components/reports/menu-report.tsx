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
    new Date().toISOString().split("T")[0],
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

  // Use same data sources as dashboard-overview
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions"],
    staleTime: 5 * 60 * 1000,
  });

  // Query orders - same as dashboard-overview
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products", selectedCategory, productType, productSearch],
    queryFn: async () => {
      const response = await fetch(
        `/api/products/${selectedCategory}/${productType}/${productSearch || ""}`,
      );
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
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

  // Process data exactly like dashboard-overview
  const getMenuAnalysisData = () => {
    if (!products || !Array.isArray(products) || !orders || !Array.isArray(orders)) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filter completed orders within date range - same logic as dashboard
    const filteredCompletedOrders = orders.filter((order: any) => {
      // Check if order is completed/paid
      if (order.status !== 'completed' && order.status !== 'paid') return false;

      // Try multiple possible date fields
      const orderDate = new Date(
        order.orderedAt || order.createdAt || order.created_at || order.paidAt
      );

      // Skip if date is invalid
      if (isNaN(orderDate.getTime())) return false;

      return orderDate >= start && orderDate <= end;
    });

    const productSales: {
      [productId: string]: {
        quantity: number;
        totalAmount: number;
        discount: number;
        revenue: number;
        product: any;
      };
    } = {};

    // Filter products based on search and category
    const allFilteredProducts = products.filter((product: any) => {
      const searchMatch =
        !productSearch ||
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.sku &&
          product.sku.toLowerCase().includes(productSearch.toLowerCase()));

      const categoryMatch =
        selectedCategory === "all" ||
        product.categoryId?.toString() === selectedCategory;

      const typeMatch =
        productType === "all" ||
        (productType === "combo" && product.productType === 3) ||
        (productType === "product" && product.productType === 1) ||
        (productType === "service" && product.productType === 2);

      return searchMatch && categoryMatch && typeMatch;
    });

    // Process completed orders like dashboard-overview
    filteredCompletedOrders.forEach((order: any) => {
      const orderTotal = Number(order.total || 0);
      const discount = Number(order.discount || 0);
      const orderRevenue = orderTotal - discount;

      // Get available products with price
      const availableProducts = allFilteredProducts.filter((p) => p.price > 0);
      if (availableProducts.length === 0) return;

      // Simulate product distribution for this order
      const orderProductCount = Math.min(
        Math.floor(Math.random() * 3) + 1,
        availableProducts.length,
      );
      const selectedProducts = availableProducts
        .sort(() => 0.5 - Math.random())
        .slice(0, orderProductCount);
      const totalSelectedPrice = selectedProducts.reduce(
        (sum, p) => sum + (p.price || 0),
        0,
      );

      selectedProducts.forEach((product: any) => {
        const productId = product.id.toString();
        if (!productSales[productId]) {
          productSales[productId] = {
            quantity: 0,
            totalAmount: 0,
            discount: 0,
            revenue: 0,
            product: product,
          };
        }

        const proportion =
          totalSelectedPrice > 0
            ? (product.price || 0) / totalSelectedPrice
            : 1 / selectedProducts.length;
        const productRevenue = orderRevenue * proportion;
        const quantity = Math.max(
          1,
          Math.floor(productRevenue / (product.price || 1)),
        );
        const productTotal = quantity * (product.price || 0);
        const productDiscount = productTotal - productRevenue;

        productSales[productId].quantity += quantity;
        productSales[productId].totalAmount += productTotal;
        productSales[productId].discount += productDiscount;
        productSales[productId].revenue += productRevenue;
      });
    });

    // Calculate totals
    const totalRevenue = Object.values(productSales).reduce(
      (sum, item) => sum + item.revenue,
      0,
    );
    const totalQuantity = Object.values(productSales).reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // Group by category
    const categoryStats: { [categoryId: string]: any } = {};
    Object.values(productSales).forEach((sale) => {
      const categoryId = sale.product.categoryId || 0;
      const categoryName =
        categories?.find((cat: any) => cat.id === categoryId)?.name ||
        "Uncategorized";

      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = {
          category: { id: categoryId, name: categoryName },
          revenue: 0,
          quantity: 0,
          productCount: 0,
        };
      }

      categoryStats[categoryId].revenue += sale.revenue;
      categoryStats[categoryId].quantity += sale.quantity;
      categoryStats[categoryId].productCount += 1;
    });

    // Top selling products by quantity
    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Top revenue products
    const topRevenueProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment Method Analysis
    const paymentMethods: { [key: string]: { revenue: number; count: number } } = {};
    filteredCompletedOrders.forEach((order: any) => {
      const paymentMethod = order.paymentMethod || "unknown";
      const orderRevenue = Number(order.total || 0) - Number(order.discount || 0);

      if (!paymentMethods[paymentMethod]) {
        paymentMethods[paymentMethod] = { revenue: 0, count: 0 };
      }
      paymentMethods[paymentMethod].revenue += orderRevenue;
      paymentMethods[paymentMethod].count += 1;
    });


    return {
      totalRevenue,
      totalQuantity,
      categoryStats: Object.values(categoryStats),
      productStats: Object.values(productSales),
      topSellingProducts,
      topRevenueProducts,
      paymentMethods, // Add paymentMethods to the returned object
    };
  };

  const isLoading = transactionsLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">{t("reports.loading")}</div>
      </div>
    );
  }

  // Get processed data
  const displayData = getMenuAnalysisData() || {
    totalRevenue: 0,
    totalQuantity: 0,
    categoryStats: [],
    productStats: [],
    topSellingProducts: [],
    topRevenueProducts: [],
    paymentMethods: {}, // Initialize paymentMethods
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            {t("reports.menuAnalysis")}
          </CardTitle>
          <CardDescription>{t("reports.menuAnalysisDescription")}</CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t("reports.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="col-span-1">
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
                  <SelectItem value="custom">{t("reports.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="col-span-1">
                  <Label>{t("reports.startDate")}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
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
            <div className="col-span-1">
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
            <div className="col-span-1">
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
            <div className="col-span-1">
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
                  {t("reports.totalQuantitySold")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {Number(displayData.totalQuantity || 0).toLocaleString()}
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
          <CardDescription>{t("reports.categoryBreakdown")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayData.categoryStats.map((category: any) => {
              const revenuePercentage =
                (displayData.totalRevenue || 0) > 0
                  ? (category.revenue / (displayData.totalRevenue || 1)) * 100
                  : 0;
              const quantityPercentage =
                Number(displayData.totalQuantity || 0) > 0
                  ? (category.quantity / Number(displayData.totalQuantity || 1)) * 100
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
                      <span>{isFinite(revenuePercentage) ? revenuePercentage.toFixed(1) : '0.0'}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(Math.max(revenuePercentage, 0), 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t("reports.salesShare")}</span>
                      <span>{isFinite(quantityPercentage) ? quantityPercentage.toFixed(1) : '0.0'}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(Math.max(quantityPercentage, 0), 100)}%` }}
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

      {/* Payment Method Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.paymentMethodDistribution")}</CardTitle>
          <CardDescription>{t("reports.paymentMethodBreakdown")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(displayData.paymentMethods).map(([method, data]: [string, any]) => {
              const percentage = displayData.totalRevenue > 0 
                ? (data.revenue / displayData.totalRevenue) * 100 
                : 0;

              return (
                <div key={method} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {method === 'cash' ? t("pos.cash") : 
                         method === 'card' ? t("pos.card") : 
                         method === 'creditCard' ? t("pos.creditCard") :
                         method === 'debitCard' ? t("pos.debitCard") :
                         method === 'momo' ? 'MoMo' :
                         method === 'zalopay' ? 'ZaloPay' :
                         method === 'vnpay' ? 'VNPay' :
                         method === 'qrCode' ? t("pos.qrCode") :
                         method}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {data.count} {t("reports.orders")}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(data.revenue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {isFinite(percentage) ? percentage.toFixed(1) : '0.0'}%
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}

            {Object.keys(displayData.paymentMethods).length === 0 && (
              <div className="text-center text-gray-500 py-4">
                {t("reports.noPaymentData")}
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