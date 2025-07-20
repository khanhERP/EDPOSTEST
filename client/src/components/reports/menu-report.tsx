import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PieChart, TrendingUp, Award } from "lucide-react";
import type { Order, OrderItem, Product, Category } from "@shared/schema";

export function MenuReport() {
  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
  });

  const getMenuData = async () => {
    if (!orders || !products || !categories) return null;

    const filteredOrders = orders.filter((order: Order) => {
      const orderDate = new Date(order.orderedAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      return orderDate >= start && orderDate <= end && order.status === 'paid';
    });

    // Get all order items for the filtered orders
    const allOrderItems: OrderItem[] = [];
    
    for (const order of filteredOrders) {
      try {
        const response = await fetch(`/api/orders/${order.id}`);
        const orderData = await response.json();
        if (orderData.items) {
          allOrderItems.push(...orderData.items.map((item: OrderItem) => ({
            ...item,
            orderId: order.id
          })));
        }
      } catch (error) {
        console.error('Error fetching order items:', error);
      }
    }

    // Product performance analysis
    const productStats: { [productId: number]: {
      product: Product;
      quantity: number;
      revenue: number;
      orders: Set<number>;
    } } = {};

    allOrderItems.forEach((item: OrderItem) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return;

      if (!productStats[item.productId]) {
        productStats[item.productId] = {
          product,
          quantity: 0,
          revenue: 0,
          orders: new Set()
        };
      }

      productStats[item.productId].quantity += item.quantity;
      productStats[item.productId].revenue += Number(item.total);
      productStats[item.productId].orders.add(item.orderId);
    });

    // Category performance
    const categoryStats: { [categoryId: number]: {
      category: Category;
      quantity: number;
      revenue: number;
      productCount: number;
    } } = {};

    Object.values(productStats).forEach(({ product, quantity, revenue }) => {
      if (!categoryStats[product.categoryId]) {
        const category = categories.find((c: Category) => c.id === product.categoryId);
        if (category) {
          categoryStats[product.categoryId] = {
            category,
            quantity: 0,
            revenue: 0,
            productCount: 0
          };
        }
      }

      if (categoryStats[product.categoryId]) {
        categoryStats[product.categoryId].quantity += quantity;
        categoryStats[product.categoryId].revenue += revenue;
        categoryStats[product.categoryId].productCount += 1;
      }
    });

    // Sort products by various metrics
    const productList = Object.values(productStats);
    const topSellingProducts = [...productList].sort((a, b) => b.quantity - a.quantity);
    const topRevenueProducts = [...productList].sort((a, b) => b.revenue - a.revenue);

    // Total stats
    const totalQuantity = productList.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = productList.reduce((sum, item) => sum + item.revenue, 0);

    return {
      productStats: productList,
      categoryStats: Object.values(categoryStats),
      topSellingProducts,
      topRevenueProducts,
      totalQuantity,
      totalRevenue,
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
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch menu data when dates change
  useEffect(() => {
    setLoading(true);
    getMenuData().then(data => {
      setMenuData(data);
      setLoading(false);
    });
  }, [orders, products, categories, startDate, endDate]);

  if (loading || !menuData) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">메뉴 분석 데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                메뉴 분석
              </CardTitle>
              <CardDescription>메뉴별 판매 현황과 인기도를 분석합니다.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">오늘</SelectItem>
                  <SelectItem value="week">최근 7일</SelectItem>
                  <SelectItem value="month">이번 달</SelectItem>
                  <SelectItem value="custom">사용자 정의</SelectItem>
                </SelectContent>
              </Select>
              
              {dateRange === "custom" && (
                <>
                  <div className="flex items-center gap-2">
                    <Label>시작:</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>종료:</Label>
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

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리별 성과</CardTitle>
          <CardDescription>메뉴 카테고리별 판매량과 매출을 비교합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {menuData.categoryStats.map((category: any) => {
              const revenuePercentage = menuData.totalRevenue > 0 
                ? (category.revenue / menuData.totalRevenue) * 100 
                : 0;
              const quantityPercentage = menuData.totalQuantity > 0
                ? (category.quantity / menuData.totalQuantity) * 100
                : 0;
              
              return (
                <div key={category.category.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {category.category.name}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {category.productCount}개 메뉴
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(category.revenue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {category.quantity}개 판매
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>매출 비중</span>
                      <span>{revenuePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${revenuePercentage}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>판매량 비중</span>
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
            
            {menuData.categoryStats.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                카테고리 데이터가 없습니다.
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
              인기 메뉴 (판매량 기준)
            </CardTitle>
            <CardDescription>판매 수량이 많은 메뉴 순위입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순위</TableHead>
                  <TableHead>메뉴명</TableHead>
                  <TableHead>판매량</TableHead>
                  <TableHead>매출</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuData.topSellingProducts.slice(0, 10).map((item: any, index: number) => (
                  <TableRow key={item.product.id}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "outline"}>
                        {index + 1}위
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.product.name}
                    </TableCell>
                    <TableCell>{item.quantity}개</TableCell>
                    <TableCell>{formatCurrency(item.revenue)}</TableCell>
                  </TableRow>
                ))}
                {menuData.topSellingProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      판매 데이터가 없습니다.
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
              고매출 메뉴 (매출 기준)
            </CardTitle>
            <CardDescription>매출 기여도가 높은 메뉴 순위입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순위</TableHead>
                  <TableHead>메뉴명</TableHead>
                  <TableHead>매출</TableHead>
                  <TableHead>판매량</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuData.topRevenueProducts.slice(0, 10).map((item: any, index: number) => (
                  <TableRow key={item.product.id}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "outline"}>
                        {index + 1}위
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.product.name}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell>{item.quantity}개</TableCell>
                  </TableRow>
                ))}
                {menuData.topRevenueProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      매출 데이터가 없습니다.
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