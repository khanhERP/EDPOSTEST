import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { CalendarIcon, Search, RotateCcw, TrendingUp, Package, DollarSign, ShoppingCart } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function MenuReport() {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [productType, setProductType] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");

  // Query categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query orders by date range
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          startDate: startOfDay(startDate).toISOString(),
          endDate: endOfDay(endDate).toISOString(),
        });

        const response = await fetch(`/api/orders/date-range/${format(startDate, 'yyyy-MM-dd')}/${format(endDate, 'yyyy-MM-dd')}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error("Orders fetch error:", error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 2000,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query order items to get detailed product sales data
  const { data: orderItems = [] } = useQuery({
    queryKey: ["/api/order-items"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/order-items");
        if (!response.ok) {
          throw new Error("Failed to fetch order items");
        }
        return response.json();
      } catch (error) {
        console.error("Order items fetch error:", error);
        return [];
      }
    },
    retry: 2,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate menu analysis from real order data
  const menuAnalysis = useMemo(() => {
    try {
      // Filter completed orders by date range
      const filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const isInDateRange = orderDate >= startOfDay(startDate) && orderDate <= endOfDay(endDate);
        const isCompleted = order.status === 'paid' || order.status === 'completed';
        return isInDateRange && isCompleted;
      });

      console.log("Menu Analysis Debug:", {
        totalOrders: orders.length,
        filteredOrders: filteredOrders.length,
        dateRange: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`
      });

      // Get order items for filtered orders
      const filteredOrderItems = orderItems.filter((item: any) => 
        filteredOrders.some((order: any) => order.id === item.orderId)
      );

      // Calculate product statistics from real order items
      const productStats = new Map();
      const categoryStats = new Map();

      filteredOrderItems.forEach((item: any) => {
        // Find product details
        const product = products.find((p: any) => p.id === item.productId);
        const productKey = item.productId || item.productName;
        const categoryId = product?.categoryId || 'unknown';
        const quantity = parseInt(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const revenue = parseFloat(item.total) || (quantity * price);

        // Product statistics
        if (!productStats.has(productKey)) {
          productStats.set(productKey, {
            productId: item.productId,
            productName: item.productName || product?.name || 'Unknown Product',
            sku: product?.sku || item.productSku,
            categoryId: categoryId,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0
          });
        }

        const productStat = productStats.get(productKey);
        productStat.totalQuantity += quantity;
        productStat.totalRevenue += revenue;
        productStat.orderCount += 1;

        // Category statistics
        if (!categoryStats.has(categoryId)) {
          const category = categories.find(cat => cat.id == categoryId);
          categoryStats.set(categoryId, {
            categoryId: categoryId,
            categoryName: category?.name || `Category ${categoryId}`,
            totalQuantity: 0,
            totalRevenue: 0,
            productCount: 0
          });
        }

        const categoryStat = categoryStats.get(categoryId);
        categoryStat.totalQuantity += quantity;
        categoryStat.totalRevenue += revenue;
      });

      // Update product count for categories
      categoryStats.forEach(categoryStat => {
        categoryStat.productCount = Array.from(productStats.values())
          .filter(p => p.categoryId == categoryStat.categoryId).length;
      });

      // Convert to arrays and sort
      const productStatsArray = Array.from(productStats.values());
      const categoryStatsArray = Array.from(categoryStats.values());

      // Calculate totals
      const totalRevenue = productStatsArray.reduce((sum, product) => sum + product.totalRevenue, 0);
      const totalQuantity = productStatsArray.reduce((sum, product) => sum + product.totalQuantity, 0);

      // Top selling products (by quantity)
      const topSellingProducts = productStatsArray
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

      // Top revenue products
      const topRevenueProducts = productStatsArray
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      return {
        totalRevenue,
        totalQuantity,
        categoryStats: categoryStatsArray,
        productStats: productStatsArray,
        topSellingProducts,
        topRevenueProducts,
      };
    } catch (error) {
      console.error("Menu analysis calculation error:", error);
      return {
        totalRevenue: 0,
        totalQuantity: 0,
        categoryStats: [],
        productStats: [],
        topSellingProducts: [],
        topRevenueProducts: [],
      };
    }
  }, [orders, orderItems, products, categories, startDate, endDate]);

  const resetFilters = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setSelectedCategory("all");
    setProductType("all");
    setProductSearch("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Phân tích menu
        </h1>
        <Button onClick={resetFilters} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Đặt lại
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Ngày bắt đầu
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Ngày kết thúc
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Danh mục
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tìm kiếm
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm sản phẩm..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tổng doanh thu
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(menuAnalysis?.totalRevenue || 0)} ₫
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tổng số lượng
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {menuAnalysis?.totalQuantity || 0}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Sản phẩm độc đáo
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {menuAnalysis?.productStats?.length || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Danh mục
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {menuAnalysis?.categoryStats?.length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Sản phẩm bán chạy</TabsTrigger>
          <TabsTrigger value="revenue">Doanh thu theo sản phẩm</TabsTrigger>
          <TabsTrigger value="categories">Phân tích danh mục</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 sản phẩm bán chạy nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {menuAnalysis?.topSellingProducts?.length > 0 ? (
                  <div className="grid gap-4">
                    {menuAnalysis.topSellingProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{product.totalQuantity} đã bán</p>
                          <p className="text-sm text-green-600">{formatCurrency(product.totalRevenue)} ₫</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Không có dữ liệu sản phẩm</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 sản phẩm doanh thu cao nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {menuAnalysis?.topRevenueProducts?.length > 0 ? (
                  <div className="grid gap-4">
                    {menuAnalysis.topRevenueProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(product.totalRevenue)} ₫</p>
                          <p className="text-sm text-blue-600">{product.totalQuantity} đã bán</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Không có dữ liệu doanh thu</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phân tích theo danh mục</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {menuAnalysis?.categoryStats?.length > 0 ? (
                  <div className="grid gap-4">
                    {menuAnalysis.categoryStats.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{category.categoryName}</Badge>
                          <div>
                            <p className="text-sm text-gray-500">{category.productCount} sản phẩm</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(category.totalRevenue)} ₫</p>
                          <p className="text-sm text-blue-600">{category.totalQuantity} đã bán</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Không có dữ liệu danh mục</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MenuReport;