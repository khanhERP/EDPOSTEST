
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Package, DollarSign, Search, RefreshCw } from "lucide-react";
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

export default function MenuReport() {
  const { t } = useTranslation();
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
      case 1: return t("reports.product");
      case 2: return t("reports.service");
      case 3: return t("reports.combo");
      default: return t("reports.product");
    }
  };

  const handleRefresh = () => {
    refetch();
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
            {t("reports.menuAnalysis")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("reports.fromDate")}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("reports.toDate")}
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("common.category")}
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
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
                {t("reports.productType")}
              </label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="product">{t("reports.product")}</SelectItem>
                  <SelectItem value="combo">{t("reports.combo")}</SelectItem>
                  <SelectItem value="service">{t("reports.service")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("common.search")}
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t("common.searchProduct")}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleRefresh} className="flex items-center gap-2" disabled={analysisLoading}>
              <RefreshCw className={`w-4 h-4 ${analysisLoading ? 'animate-spin' : ''}`} />
              {analysisLoading ? "Đang tải..." : "Cập nhật"}
            </Button>
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
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(menuAnalysis?.totalRevenue || 0)}
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
                  {t("reports.totalSales")}
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
                  {t("reports.averagePrice")}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(
                    menuAnalysis?.totalQuantity && menuAnalysis.totalQuantity > 0
                      ? menuAnalysis.totalRevenue / menuAnalysis.totalQuantity
                      : 0
                  )}
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
                  {t("reports.uniqueProducts")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredProducts.length.toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      {menuAnalysis?.categoryStats && menuAnalysis.categoryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.categoryPerformance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{t("common.category")}</th>
                    <th className="text-right py-2 px-4">{t("reports.productCount")}</th>
                    <th className="text-right py-2 px-4">{t("reports.quantity")}</th>
                    <th className="text-right py-2 px-4">{t("reports.revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {menuAnalysis.categoryStats.map((category, index) => (
                    <tr key={category.categoryId || index} className="border-b">
                      <td className="py-2 px-4 font-medium">
                        {category.categoryName || `Category ${category.categoryId}`}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {(category.productCount || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {(category.totalQuantity || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-4 text-right font-medium">
                        {formatCurrency(category.totalRevenue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        {menuAnalysis?.topSellingProducts && menuAnalysis.topSellingProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.topSellingItems")}</CardTitle>
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
                        <p className="font-medium">{product.productName || `Product ${product.productId}`}</p>
                        <p className="text-sm text-gray-500">
                          {(product.totalQuantity || 0).toLocaleString('vi-VN')} {t("common.sold")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.totalRevenue || 0)}</p>
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
              <CardTitle>{t("reports.topRevenueItems")}</CardTitle>
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
                        <p className="font-medium">{product.productName || `Product ${product.productId}`}</p>
                        <p className="text-sm text-gray-500">
                          {(product.totalQuantity || 0).toLocaleString('vi-VN')} {t("common.sold")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{formatCurrency(product.totalRevenue || 0)}</p>
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
          <CardTitle>{t("reports.menuItemAnalysis")}</CardTitle>
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
              <p className="text-gray-500">{t("common.noData")}</p>
              <p className="text-sm text-gray-400 mt-2">
                Thử thay đổi bộ lọc để xem kết quả khác
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{t("common.product")}</th>
                    <th className="text-left py-2 px-4">{t("common.sku")}</th>
                    <th className="text-left py-2 px-4">{t("common.category")}</th>
                    <th className="text-left py-2 px-4">{t("common.type")}</th>
                    <th className="text-right py-2 px-4">{t("common.price")}</th>
                    <th className="text-right py-2 px-4">{t("common.stock")}</th>
                    <th className="text-center py-2 px-4">{t("common.status")}</th>
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
                          {formatCurrency(product.price)}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <span className={`${product.stock <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? t("common.active") : t("common.inactive")}
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
