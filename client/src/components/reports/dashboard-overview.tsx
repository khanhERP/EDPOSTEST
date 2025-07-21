import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, ShoppingCart, Users, Clock, Target, Search } from "lucide-react";
import type { Order, Table as TableType } from "@shared/schema";

export function DashboardOverview() {
  const [startDate, setStartDate] = useState<string>(
    "2025-01-15" // Set to a date that has sample data
  );
  const [endDate, setEndDate] = useState<string>(
    "2025-01-20" // End date with sample data
  );
  const queryClient = useQueryClient();

  const { data: transactions } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/tables'],
  });

  const handleRefresh = () => {
    // Refresh the queries to get the latest data for the selected date
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
  };

  const getDashboardStats = () => {
    if (!transactions || !tables || !Array.isArray(transactions) || !Array.isArray(tables)) return null;
    
    console.log('Dashboard Debug:', {
      totalTransactions: transactions.length,
      startDate,
      endDate,
      firstTransaction: transactions[0],
      allTransactionDates: transactions.map((t: any) => new Date(t.createdAt).toDateString())
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date
    
    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(transaction.createdAt || transaction.created_at);
      return transactionDate >= start && transactionDate <= end;
    });
    
    console.log('Filtered Transactions:', filteredTransactions.length);

    // Period stats
    const periodRevenue = filteredTransactions.reduce((total: number, transaction: any) => 
      total + Number(transaction.total), 0
    );
    
    const periodOrderCount = filteredTransactions.length;
    const periodCustomerCount = filteredTransactions.length; // Each transaction represents customers
    
    // Daily average for the period
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const dailyAverageRevenue = periodRevenue / daysDiff;

    // Current status (for active orders, we need to check the orders table separately)
    const activeOrders = 0; // Will show 0 since we're using transactions data
    
    const occupiedTables = tables.filter((table: TableType) => 
      table.status === 'occupied'
    );

    // This month stats
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const monthTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(transaction.createdAt || transaction.created_at);
      return transactionDate >= monthStart;
    });

    const monthRevenue = monthTransactions.reduce((total: number, transaction: any) => 
      total + Number(transaction.total), 0
    );

    // Average order value
    const averageOrderValue = periodOrderCount > 0 
      ? periodRevenue / periodOrderCount 
      : 0;

    // Peak hours analysis from filtered transactions
    const hourlyTransactions: { [key: number]: number } = {};
    filteredTransactions.forEach((transaction: any) => {
      const hour = new Date(transaction.createdAt || transaction.created_at).getHours();
      hourlyTransactions[hour] = (hourlyTransactions[hour] || 0) + 1;
    });

    const peakHour = Object.keys(hourlyTransactions).reduce((peak, hour) => 
      (hourlyTransactions[parseInt(hour)] > hourlyTransactions[parseInt(peak)]) ? hour : peak
    , "12");

    return {
      periodRevenue,
      periodOrderCount,
      periodCustomerCount,
      dailyAverageRevenue,
      activeOrders: activeOrders,
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
              <CardDescription>선택한 기간의 운영 현황을 확인합니다.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date-picker">시작 날짜:</Label>
              <Input
                id="start-date-picker"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              <Label htmlFor="end-date-picker">종료 날짜:</Label>
              <Input
                id="end-date-picker"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
              <Button
                onClick={handleRefresh}
                size="sm"
                variant="outline"
                className="ml-2"
              >
                <Search className="w-4 h-4 mr-1" />
                조회
              </Button>
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
                <p className="text-sm font-medium text-gray-600">기간 매출</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.periodRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {startDate} ~ {endDate}
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
                <p className="text-2xl font-bold">{stats.periodOrderCount}</p>
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
                <p className="text-2xl font-bold">{stats.periodCustomerCount}</p>
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
                <span>기간 매출 목표 달성률</span>
                <span className="font-medium">
                  {Math.round((stats.dailyAverageRevenue / 500000) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.dailyAverageRevenue / 500000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>테이블 회전율</span>
                <span className="font-medium">
                  {stats.totalTables > 0 ? (stats.periodOrderCount / stats.totalTables).toFixed(1) : 0}회
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.periodOrderCount / stats.totalTables / 5) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500">
                목표: 일평균 매출 50만원, 테이블당 5회 회전
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}