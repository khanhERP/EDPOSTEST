import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Package, DollarSign, Search, RefreshCw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { useTranslation } from "@/lib/i18n";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock: number;
  categoryId: number;
  categoryName?: string;
  productType: number;
  taxRate: string;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface MenuAnalysisData {
  totalRevenue: number;
  totalQuantity: number;
  categoryStats: Array<{
    categoryId: number;
    categoryName: string;
    totalQuantity: number;
    totalRevenue: number;
    productCount: number;
  }>;
  productStats: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    averagePrice: number;
  }>;
  topSellingProducts: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  topRevenueProducts: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
}

function MenuReport() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [productType, setProductType] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");

  // Query categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/categories");
        if (!response.ok) throw new Error("Failed to fetch categories");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
    },
    retry: 2,
  });

  // Query products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products", selectedCategory, productType, productSearch],
    queryFn: async () => {
      try {
        const searchParam = productSearch ? encodeURIComponent(productSearch) : "";
        const response = await apiRequest(
          "GET",
          `/api/products/${selectedCategory}/${productType}/${searchParam}`
        );
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching products:", error);
        return [];
      }
    },
    retry: 2,
  });

  // Query menu analysis data
  const { data: menuAnalysis, isLoading: analysisLoading, error: analysisError, refetch } = useQuery({
    queryKey: ["/api/menu-analysis", startDate, endDate, selectedCategory],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          ...(selectedCategory !== "all" && { categoryId: selectedCategory })
        });

        const response = await apiRequest("GET", `/api/menu-analysis?${params.toString()}`);
        if (!response.ok) {
          console.error("Menu analysis API error:", response.status, response.statusText);
          throw new Error(`Failed to fetch menu analysis: ${response.status}`);
        }

        const data = await response.json();
        console.log("Menu analysis data received:", data);

        // Ensure data structure is correct
        return {
          totalRevenue: Number(data.totalRevenue || 0),
          totalQuantity: Number(data.totalQuantity || 0),
          categoryStats: Array.isArray(data.categoryStats) ? data.categoryStats : [],
          productStats: Array.isArray(data.productStats) ? data.productStats : [],
          topSellingProducts: Array.isArray(data.topSellingProducts) ? data.topSellingProducts : [],
          topRevenueProducts: Array.isArray(data.topRevenueProducts) ? data.topRevenueProducts : [],
        } as MenuAnalysisData;
      } catch (error) {
        console.error("Error fetching menu analysis:", error);
        // Return fallback data structure
        return {
          totalRevenue: 0,
          totalQuantity: 0,
          categoryStats: [],
          productStats: [],
          topSellingProducts: [],
          topRevenueProducts: [],
        } as MenuAnalysisData;
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Filter products for display
  const filteredProducts = products.filter((product: Product) => {
    if (!product || !product.name) return false;

    const searchMatch = !productSearch ||
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase()));

    const categoryMatch = selectedCategory === "all" ||
      product.categoryId === parseInt(selectedCategory);

    const typeMatch = productType === "all" ||
      (productType === "combo" && product.productType === 3) ||
      (productType === "product" && product.productType === 1) ||
      (productType === "service" && product.productType === 2);

    return searchMatch && categoryMatch && typeMatch;
  });

  const formatCurrency = (amount: number | string | undefined | null): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }
    return Math.floor(num).toLocaleString('vi-VN');
  };

  const getProductTypeName = (type: number): string => {
    switch (type) {
      case 1: return t("reports.product") || "Sản phẩm";
      case 2: return t("reports.service") || "Dịch vụ";
      case 3: return t("reports.combo") || "Combo";
      default: return t("reports.product") || "Sản phẩm";
    }
  };

  const handleRefresh = () => {
    // Refresh both orders and order items data
    queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range"] });
    queryClient.invalidateQueries({ queryKey: ["/api/order-items"] });
  };

  if (analysisError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">
            <BarChart3 className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium">Lỗi tải dữ liệu phân tích menu</p>
          </div>
          <p className="text-gray-500 mb-4">
            {analysisError instanceof Error ? analysisError.message : "Không thể tải dữ liệu phân tích"}
          </p>
          <Button onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("reports.menuAnalysis") || "Phân tích menu"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("reports.fromDate") || "Từ ngày"}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("reports.toDate") || "Đến ngày"}
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("common.category") || "Danh mục"}
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectCategory") || "Chọn danh mục"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all") || "Tất cả"}</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("reports.productType") || "Loại sản phẩm"}
              </label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectType") || "Chọn loại"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all") || "Tất cả"}</SelectItem>
                  <SelectItem value="product">{t("reports.product") || "Sản phẩm"}</SelectItem>
                  <SelectItem value="combo">{t("reports.combo") || "Combo"}</SelectItem>
                  <SelectItem value="service">{t("reports.service") || "Dịch vụ"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("common.search") || "Tìm kiếm"}
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t("common.searchProduct") || "Tìm kiếm sản phẩm"}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleRefresh}
                className="flex items-center gap-2"
                disabled={analysisLoading}
              >
                <RefreshCw className={`w-4 h-4 ${analysisLoading ? 'animate-spin' : ''}`} />
                {analysisLoading ? 'Đang tải...' : 'Làm mới'}
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue") || "Tổng doanh thu"}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(menuAnalysis?.totalRevenue || 0)} ₫
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalSales") || "Tổng số lượng đã bán"}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {(menuAnalysis?.totalQuantity || 0).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.averagePrice") || "Giá trung bình"}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(
                    menuAnalysis?.totalQuantity && menuAnalysis.totalQuantity > 0
                      ? menuAnalysis.totalRevenue / menuAnalysis.totalQuantity
                      : 0
                  )} ₫
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.uniqueProducts") || "Tổng số lượng đã bán"}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {(menuAnalysis?.productStats?.reduce((total, product) => total + (product.totalQuantity || 0), 0) || 0).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("reports.categoryPerformance") || "Hiệu suất danh mục"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysisLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Đang tải dữ liệu biểu đồ...</p>
            </div>
          ) : !menuAnalysis?.categoryStats || menuAnalysis.categoryStats.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">Không có dữ liệu biểu đồ</p>
              <p className="text-gray-400 text-sm">
                Chọn khoảng thời gian có dữ liệu bán hàng để xem biểu đồ
              </p>
              <Button
                onClick={handleRefresh}
                className="mt-4 flex items-center gap-2 mx-auto"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới dữ liệu
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue Pie Chart */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    {t("reports.revenue") || "Doanh thu"} theo danh mục
                  </h4>
                  <div className="h-80 relative border rounded-lg bg-gradient-to-br from-green-50/30 to-emerald-50/20">
                    <div className="absolute inset-0 bg-white/50 rounded-lg"></div>
                    <div className="relative z-10 h-full p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={menuAnalysis.categoryStats.map((cat, index) => ({
                              name: cat.categoryName || `Danh mục ${cat.categoryId}`,
                              value: Number(cat.totalRevenue || 0),
                              fill: `hsl(${(index * 137.508) % 360}, 70%, 60%)`
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {menuAnalysis.categoryStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 137.508) % 360}, 70%, 60%)`} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [formatCurrency(Number(value)) + ' ₫', 'Doanh thu']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{ fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Quantity Pie Chart */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    {t("reports.quantity") || "Số lượng"} theo danh mục
                  </h4>
                  <div className="h-80 relative border rounded-lg bg-gradient-to-br from-blue-50/30 to-sky-50/20">
                    <div className="absolute inset-0 bg-white/50 rounded-lg"></div>
                    <div className="relative z-10 h-full p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={menuAnalysis?.categoryStats?.length > 0 ? menuAnalysis.categoryStats.map((cat, index) => ({
                              name: cat.categoryName || `Danh mục ${cat.categoryId}`,
                              value: Number(cat.totalQuantity || 0),
                              fill: `hsl(${(index * 137.508 + 180) % 360}, 70%, 60%)`
                            })) : [{ name: "Không có dữ liệu", value: 1, fill: "#e0e0e0" }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            <Cell />
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [
                              `${Number(value).toLocaleString()}`,
                              name
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Category Performance Table - Only show when data exists */}
          {menuAnalysis?.categoryStats && menuAnalysis.categoryStats.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{t("common.category") || "Danh mục"}</th>
                    <th className="text-right py-2 px-4">{t("reports.productCount") || "Số sản phẩm"}</th>
                    <th className="text-right py-2 px-4">{t("reports.quantity") || "Số lượng"}</th>
                    <th className="text-right py-2 px-4">{t("reports.revenue") || "Doanh thu"}</th>
                  </tr>
                </thead>
                <tbody>
                  {menuAnalysis.categoryStats.map((category, index) => (
                    <tr key={category.categoryId || index} className="border-b">
                      <td className="py-2 px-4 font-medium">
                        {category.categoryName || `Danh mục ${category.categoryId}`}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {(category.productCount || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {(category.totalQuantity || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-4 text-right font-medium">
                        {formatCurrency(category.totalRevenue || 0)} ₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        {menuAnalysis?.topSellingProducts && menuAnalysis.topSellingProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.topSellingItems") || "Sản phẩm bán chạy"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {menuAnalysis.topSellingProducts.slice(0, 10).map((product, index) => (
                  <div key={product.productId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{product.productName || `Sản phẩm ${product.productId}`}</p>
                        <p className="text-sm text-gray-500">
                          {(product.totalQuantity || 0).toLocaleString('vi-VN')} đã bán
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.totalRevenue || 0)} ₫</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Revenue Products */}
        {menuAnalysis?.topRevenueProducts && menuAnalysis.topRevenueProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.topRevenueItems") || "Sản phẩm doanh thu cao"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {menuAnalysis.topRevenueProducts.slice(0, 10).map((product, index) => (
                  <div key={product.productId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{product.productName || `Sản phẩm ${product.productId}`}</p>
                        <p className="text-sm text-gray-500">
                          {(product.totalQuantity || 0).toLocaleString('vi-VN')} đã bán
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{formatCurrency(product.totalRevenue || 0)} ₫</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.menuItemAnalysis") || "Phân tích sản phẩm"}</CardTitle>
        </CardHeader>
        <CardContent>
          {analysisLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-500">Đang tải dữ liệu...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{t("common.noData") || "Không có dữ liệu"}</p>
              <p className="text-sm text-gray-400 mt-2">
                Thử thay đổi bộ lọc để xem kết quả khác
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{t("common.product") || "Sản phẩm"}</th>
                    <th className="text-left py-2 px-4">{t("common.sku") || "SKU"}</th>
                    <th className="text-left py-2 px-4">{t("common.category") || "Danh mục"}</th>
                    <th className="text-left py-2 px-4">{t("common.type") || "Loại"}</th>
                    <th className="text-right py-2 px-4">{t("common.price") || "Giá"}</th>
                    <th className="text-right py-2 px-4">{t("common.stock") || "Tồn kho"}</th>
                    <th className="text-center py-2 px-4">{t("common.status") || "Trạng thái"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product: Product) => {
                    const category = categories.find((c: Category) => c.id === product.categoryId);
                    return (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium">{product.name}</td>
                        <td className="py-2 px-4 font-mono text-sm">{product.sku}</td>
                        <td className="py-2 px-4">{category?.name || 'N/A'}</td>
                        <td className="py-2 px-4">
                          <Badge variant="outline">
                            {getProductTypeName(product.productType)}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-right font-medium">
                          {formatCurrency(product.price)} ₫
                        </td>
                        <td className="py-2 px-4 text-right">
                          <span className={`${product.stock <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? t("common.active") || "Hoạt động" : t("common.inactive") || "Không hoạt động"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MenuReport;
export { MenuReport };