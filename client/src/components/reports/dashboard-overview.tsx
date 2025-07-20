import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, ShoppingCart, Users, Clock, Target } from "lucide-react";
import type { Order, Table as TableType } from "@shared/schema";

export function DashboardOverview() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/tables'],
  });

  const getDashboardStats = () => {
    if (!orders || !tables) return null;

    const today = new Date(selectedDate);
    const todayOrders = orders.filter((order: Order) => {
      const orderDate = new Date(order.orderedAt);
      return orderDate.toDateString() === today.toDateString();
    });

    const paidTodayOrders = todayOrders.filter((order: Order) => order.status === 'paid');

    // Today's stats
    const todayRevenue = paidTodayOrders.reduce((total: number, order: Order) => 
      total + Number(order.total), 0
    );
    
    const todayOrderCount = todayOrders.length;
    const todayCustomerCount = todayOrders.reduce((total: number, order: Order) => 
      total + (order.customerCount || 0), 0
    );

    // Current status
    const activeOrders = orders.filter((order: Order) => 
      !['paid', 'cancelled'].includes(order.status)
    );
    
    const occupiedTables = tables.filter((table: TableType) => 
      table.status === 'occupied'
    );

    // This month stats
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const monthOrders = orders.filter((order: Order) => {
      const orderDate = new Date(order.orderedAt);
      return orderDate >= monthStart && order.status === 'paid';
    });

    const monthRevenue = monthOrders.reduce((total: number, order: Order) => 
      total + Number(order.total), 0
    );

    // Average order value
    const averageOrderValue = paidTodayOrders.length > 0 
      ? todayRevenue / paidTodayOrders.length 
      : 0;

    // Peak hours analysis
    const hourlyOrders: { [key: number]: number } = {};
    todayOrders.forEach((order: Order) => {
      const hour = new Date(order.orderedAt).getHours();
      hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
    });

    const peakHour = Object.keys(hourlyOrders).reduce((peak, hour) => 
      (hourlyOrders[parseInt(hour)] > hourlyOrders[parseInt(peak)]) ? hour : peak
    , "12");

    return {
      todayRevenue,
      todayOrderCount,
      todayCustomerCount,
      activeOrders: activeOrders.length,
      occupiedTables: occupiedTables.length,
      monthRevenue,
      averageOrderValue,
      peakHour: parseInt(peakHour),
      totalTables: tables.length,
    };
  };

  const stats = getDashboardStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!stats) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">대시보드 데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>매출 대시보드</CardTitle>
              <CardDescription>선택한 날짜의 운영 현황을 확인합니다.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="date-picker">날짜:</Label>
              <Input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
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
                <p className="text-sm font-medium text-gray-600">일일 매출</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.todayRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(selectedDate)}
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
                <p className="text-sm font-medium text-gray-600">주문 건수</p>
                <p className="text-2xl font-bold">{stats.todayOrderCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  평균 주문가: {formatCurrency(stats.averageOrderValue)}
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
                <p className="text-sm font-medium text-gray-600">고객 수</p>
                <p className="text-2xl font-bold">{stats.todayCustomerCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  피크 시간: {stats.peakHour}시
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
                <p className="text-sm font-medium text-gray-600">월 매출</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.monthRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  이번 달 누적
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
              실시간 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">진행 중인 주문</span>
              <Badge variant={stats.activeOrders > 0 ? "default" : "outline"}>
                {stats.activeOrders}건
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">사용 중인 테이블</span>
              <Badge variant={stats.occupiedTables > 0 ? "destructive" : "outline"}>
                {stats.occupiedTables} / {stats.totalTables}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">테이블 이용률</span>
              <Badge variant="secondary">
                {Math.round((stats.occupiedTables / stats.totalTables) * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              성과 지표
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>일 매출 목표 달성률</span>
                <span className="font-medium">
                  {Math.round((stats.todayRevenue / 500000) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.todayRevenue / 500000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>테이블 회전율</span>
                <span className="font-medium">
                  {stats.totalTables > 0 ? (stats.todayOrderCount / stats.totalTables).toFixed(1) : 0}회
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.todayOrderCount / stats.totalTables / 5) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500">
                목표: 일매출 50만원, 테이블당 5회 회전
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}