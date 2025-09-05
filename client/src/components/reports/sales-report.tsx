
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { CalendarIcon, Search, Download, RotateCcw, TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function SalesReport() {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [selectedSalesChannel, setSelectedSalesChannel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Query orders by date range
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      try {
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
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query order items for detailed analysis
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

  // Query customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/customers");
        if (!response.ok) {
          throw new Error("Failed to fetch customers");
        }
        return response.json();
      } catch (error) {
        console.error("Customers fetch error:", error);
        return [];
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query employees
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/employees");
        if (!response.ok) {
          throw new Error("Failed to fetch employees");
        }
        return response.json();
      } catch (error) {
        console.error("Employees fetch error:", error);
        return [];
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate sales analytics from real order data
  const salesAnalytics = useMemo(() => {
    try {
      // Filter orders by date range and filters
      const filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const isInDateRange = orderDate >= startOfDay(startDate) && orderDate <= endOfDay(endDate);
        
        // Apply filters
        let matchesFilters = true;
        
        if (selectedEmployee !== "all" && order.employeeId != selectedEmployee) {
          matchesFilters = false;
        }
        
        if (selectedCustomer !== "all" && order.customerId != selectedCustomer) {
          matchesFilters = false;
        }
        
        if (selectedPaymentMethod !== "all" && order.paymentMethod !== selectedPaymentMethod) {
          matchesFilters = false;
        }
        
        if (selectedSalesChannel !== "all" && order.salesChannel !== selectedSalesChannel) {
          matchesFilters = false;
        }
        
        if (searchQuery && !order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !order.customerName?.toLowerCase().includes(searchQuery.toLowerCase())) {
          matchesFilters = false;
        }
        
        return isInDateRange && matchesFilters;
      });

      const completedOrders = filteredOrders.filter((order: any) => 
        order.status === 'paid' || order.status === 'completed'
      );

      // Calculate metrics
      const totalRevenue = completedOrders.reduce((sum: number, order: any) => {
        return sum + (parseFloat(order.total) || parseFloat(order.storedTotal) || 0);
      }, 0);

      const totalOrders = filteredOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Sales by employee
      const salesByEmployee = new Map();
      completedOrders.forEach((order: any) => {
        const employeeId = order.employeeId || 'unknown';
        const employee = employees.find(emp => emp.id == employeeId);
        const employeeName = employee?.name || `Employee ${employeeId}`;
        
        if (!salesByEmployee.has(employeeId)) {
          salesByEmployee.set(employeeId, {
            employeeId,
            employeeName,
            totalRevenue: 0,
            totalOrders: 0,
            averageOrderValue: 0
          });
        }
        
        const empData = salesByEmployee.get(employeeId);
        empData.totalRevenue += parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
        empData.totalOrders += 1;
        empData.averageOrderValue = empData.totalRevenue / empData.totalOrders;
      });

      // Sales by customer
      const salesByCustomer = new Map();
      completedOrders.forEach((order: any) => {
        const customerId = order.customerId || 'walk-in';
        const customer = customers.find(cust => cust.id == customerId);
        const customerName = customer?.name || order.customerName || 'Walk-in Customer';
        
        if (!salesByCustomer.has(customerId)) {
          salesByCustomer.set(customerId, {
            customerId,
            customerName,
            totalRevenue: 0,
            totalOrders: 0,
            averageOrderValue: 0
          });
        }
        
        const custData = salesByCustomer.get(customerId);
        custData.totalRevenue += parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
        custData.totalOrders += 1;
        custData.averageOrderValue = custData.totalRevenue / custData.totalOrders;
      });

      // Sales by payment method
      const salesByPaymentMethod = new Map();
      completedOrders.forEach((order: any) => {
        const method = order.paymentMethod || 'cash';
        
        if (!salesByPaymentMethod.has(method)) {
          salesByPaymentMethod.set(method, {
            method,
            totalRevenue: 0,
            totalOrders: 0,
            percentage: 0
          });
        }
        
        const methodData = salesByPaymentMethod.get(method);
        methodData.totalRevenue += parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
        methodData.totalOrders += 1;
      });

      // Calculate percentages for payment methods
      salesByPaymentMethod.forEach(methodData => {
        methodData.percentage = totalRevenue > 0 ? (methodData.totalRevenue / totalRevenue) * 100 : 0;
      });

      // Daily sales trend
      const dailySales = new Map();
      completedOrders.forEach((order: any) => {
        const orderDate = new Date(order.orderedAt || order.createdAt);
        const dateKey = format(orderDate, 'yyyy-MM-dd');
        
        if (!dailySales.has(dateKey)) {
          dailySales.set(dateKey, {
            date: dateKey,
            revenue: 0,
            orders: 0
          });
        }
        
        const dayData = dailySales.get(dateKey);
        dayData.revenue += parseFloat(order.total) || parseFloat(order.storedTotal) || 0;
        dayData.orders += 1;
      });

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        filteredOrders,
        salesByEmployee: Array.from(salesByEmployee.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
        salesByCustomer: Array.from(salesByCustomer.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
        salesByPaymentMethod: Array.from(salesByPaymentMethod.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
        dailySalesData: Array.from(dailySales.values()).sort((a, b) => a.date.localeCompare(b.date))
      };
    } catch (error) {
      console.error("Sales analytics calculation error:", error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        filteredOrders: [],
        salesByEmployee: [],
        salesByCustomer: [],
        salesByPaymentMethod: [],
        dailySalesData: []
      };
    }
  }, [orders, orderItems, customers, employees, startDate, endDate, selectedEmployee, selectedCustomer, selectedPaymentMethod, selectedSalesChannel, searchQuery]);

  const resetFilters = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setSelectedEmployee("all");
    setSelectedCustomer("all");
    setSelectedPaymentMethod("all");
    setSelectedSalesChannel("all");
    setSearchQuery("");
  };

  const exportData = () => {
    // Simple CSV export functionality
    const csvData = salesAnalytics.filteredOrders.map(order => ({
      orderNumber: order.orderNumber,
      date: format(new Date(order.orderedAt || order.createdAt), 'dd/MM/yyyy HH:mm'),
      customerName: order.customerName || 'Walk-in',
      total: order.total || order.storedTotal,
      paymentMethod: order.paymentMethod,
      status: order.status
    }));
    
    console.log("Export data:", csvData);
    // In a real implementation, you would convert to CSV and download
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("reports.salesAnalysis")}
        </h1>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("common.export")}
          </Button>
          <Button onClick={resetFilters} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("common.reset")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("common.filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("common.startDate")}
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
                    {startDate ? format(startDate, "dd/MM/yyyy") : t("common.selectDate")}
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
                {t("common.endDate")}
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
                    {endDate ? format(endDate, "dd/MM/yyyy") : t("common.selectDate")}
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

            {/* Employee Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("reports.employee")}
              </label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reports.selectEmployee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("reports.paymentMethod")}
              </label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reports.selectPaymentMethod")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="cash">{t("pos.cash")}</SelectItem>
                  <SelectItem value="card">{t("pos.card")}</SelectItem>
                  <SelectItem value="transfer">{t("pos.transfer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                {t("common.search")}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("reports.searchOrderOrCustomer")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(salesAnalytics.totalRevenue)} ₫
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
                  {t("reports.totalOrders")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {salesAnalytics.totalOrders}
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
                  {t("reports.averageOrderValue")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(salesAnalytics.averageOrderValue)} ₫
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("reports.overview")}</TabsTrigger>
          <TabsTrigger value="employee">{t("reports.byEmployee")}</TabsTrigger>
          <TabsTrigger value="customer">{t("reports.byCustomer")}</TabsTrigger>
          <TabsTrigger value="payment">{t("reports.byPaymentMethod")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle>{t("reports.dailyRevenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesAnalytics.dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)) + " ₫", t("reports.revenue")]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Method Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t("reports.paymentMethodDistribution")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={salesAnalytics.salesByPaymentMethod}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percentage }) => `${method} ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalRevenue"
                    >
                      {salesAnalytics.salesByPaymentMethod.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)) + " ₫", t("reports.revenue")]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employee" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.salesByEmployee")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.employeeName")}</TableHead>
                    <TableHead>{t("reports.totalOrders")}</TableHead>
                    <TableHead>{t("reports.totalRevenue")}</TableHead>
                    <TableHead>{t("reports.averageOrderValue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesAnalytics.salesByEmployee.map((emp, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{emp.employeeName}</TableCell>
                      <TableCell>{emp.totalOrders}</TableCell>
                      <TableCell>{formatCurrency(emp.totalRevenue)} ₫</TableCell>
                      <TableCell>{formatCurrency(emp.averageOrderValue)} ₫</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.salesByCustomer")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.customerName")}</TableHead>
                    <TableHead>{t("reports.totalOrders")}</TableHead>
                    <TableHead>{t("reports.totalRevenue")}</TableHead>
                    <TableHead>{t("reports.averageOrderValue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesAnalytics.salesByCustomer.slice(0, 20).map((cust, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{cust.customerName}</TableCell>
                      <TableCell>{cust.totalOrders}</TableCell>
                      <TableCell>{formatCurrency(cust.totalRevenue)} ₫</TableCell>
                      <TableCell>{formatCurrency(cust.averageOrderValue)} ₫</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.salesByPaymentMethod")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.paymentMethod")}</TableHead>
                    <TableHead>{t("reports.totalOrders")}</TableHead>
                    <TableHead>{t("reports.totalRevenue")}</TableHead>
                    <TableHead>{t("common.percentage")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesAnalytics.salesByPaymentMethod.map((method, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{method.method}</TableCell>
                      <TableCell>{method.totalOrders}</TableCell>
                      <TableCell>{formatCurrency(method.totalRevenue)} ₫</TableCell>
                      <TableCell>{method.percentage.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SalesReport;
