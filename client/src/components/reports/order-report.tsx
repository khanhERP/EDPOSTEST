
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Package, Users, Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export function OrderReport() {
  const { t } = useTranslation();

  // Filters
  const [concernType, setConcernType] = useState("transaction");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [orderStatus, setOrderStatus] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const getFilteredData = () => {
    if (!orders || !Array.isArray(orders)) return [];

    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderedAt || order.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = orderDate >= start && orderDate <= end;

      const statusMatch =
        orderStatus === "all" ||
        (orderStatus === "draft" && order.status === "pending") ||
        (orderStatus === "confirmed" && order.status === "confirmed") ||
        (orderStatus === "delivering" && order.status === "preparing") ||
        (orderStatus === "completed" && order.status === "paid");

      const customerMatch =
        !customerSearch ||
        (order.customerName &&
          order.customerName
            .toLowerCase()
            .includes(customerSearch.toLowerCase())) ||
        (order.customerPhone &&
          order.customerPhone.includes(customerSearch));

      return dateMatch && statusMatch && customerMatch;
    });

    return filteredOrders;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: t("reports.draft"), variant: "secondary" as const },
      confirmed: { label: t("reports.confirmed"), variant: "default" as const },
      preparing: { label: t("reports.delivering"), variant: "outline" as const },
      paid: { label: t("reports.completed"), variant: "default" as const },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  const getProductData = () => {
    const filteredOrders = getFilteredData();
    const productStats: {
      [productId: string]: {
        product: any;
        quantity: number;
        value: number;
        orders: Set<number>;
      };
    } = {};

    filteredOrders.forEach((order: any) => {
      // Since we don't have order items in the current schema,
      // we'll simulate product data based on orders
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const productId = item.productId.toString();
          if (!productStats[productId]) {
            const product = products?.find((p: any) => p.id === item.productId);
            productStats[productId] = {
              product: product || { id: item.productId, name: "Unknown Product", sku: "N/A" },
              quantity: 0,
              value: 0,
              orders: new Set(),
            };
          }
          productStats[productId].quantity += item.quantity;
          productStats[productId].value += item.quantity * item.price;
          productStats[productId].orders.add(order.id);
        });
      }
    });

    return Object.values(productStats);
  };

  const getChartData = () => {
    const filteredOrders = getFilteredData();
    
    if (concernType === "transaction") {
      // Daily order count chart
      const dailyData: { [date: string]: { orders: number; value: number } } = {};
      
      filteredOrders.forEach((order: any) => {
        const date = new Date(order.orderedAt || order.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { orders: 0, value: 0 };
        }
        dailyData[date].orders += 1;
        dailyData[date].value += Number(order.total);
      });

      return Object.entries(dailyData).map(([date, data]) => ({
        name: formatDate(date),
        orders: data.orders,
        value: data.value,
      }));
    } else {
      // Product quantity chart
      const productData = getProductData();
      return productData.slice(0, 10).map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        value: item.value,
      }));
    }
  };

  const renderTransactionTable = () => {
    const filteredOrders = getFilteredData();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("reports.orderReportByTransaction")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} - {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  {t("reports.orderCode")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.orderTime")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.customer")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.orderQuantity")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.orderValue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.orderStatus")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.slice(0, 20).map((order: any) => {
                  const statusConfig = getStatusBadge(order.status);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-center font-medium">
                        {order.orderNumber || `ORD-${order.id}`}
                      </TableCell>
                      <TableCell className="text-center">
                        {new Date(order.orderedAt || order.created_at).toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-center">
                        {order.customerName || "Khách lẻ"}
                      </TableCell>
                      <TableCell className="text-center">
                        {order.customerCount || 1}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(Number(order.total))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 italic">
                    {t("reports.noReportData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderProductTable = () => {
    const productData = getProductData();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.orderReportByProduct")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} - {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  {t("reports.productCode")}
                </TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.orderQuantity")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.orderValue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productData.length > 0 ? (
                productData.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center font-medium">
                      {item.product.sku || item.product.id}
                    </TableCell>
                    <TableCell>{item.product.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(item.value)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 italic">
                    {t("reports.noReportData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const chartConfig = {
    orders: {
      label: t("reports.orders"),
      color: "#10b981",
    },
    value: {
      label: t("reports.orderValue"),
      color: "#3b82f6",
    },
    quantity: {
      label: t("reports.orderQuantity"),
      color: "#f59e0b",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("reports.orderReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.orderReportDescription")}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Concern Type */}
            <div>
              <Label>{t("reports.orderConcernType")}</Label>
              <Select value={concernType} onValueChange={setConcernType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transaction">
                    {t("reports.transactionConcern")}
                  </SelectItem>
                  <SelectItem value="product">
                    {t("reports.productConcern")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Status */}
            <div>
              <Label>{t("reports.orderStatus")}</Label>
              <Select value={orderStatus} onValueChange={setOrderStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="draft">{t("reports.draft")}</SelectItem>
                  <SelectItem value="confirmed">{t("reports.confirmed")}</SelectItem>
                  <SelectItem value="delivering">{t("reports.delivering")}</SelectItem>
                  <SelectItem value="completed">{t("reports.completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Group */}
            <div>
              <Label>{t("reports.productGroup")}</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reports.productGroup")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {categories &&
                    Array.isArray(categories) &&
                    categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee */}
            <div>
              <Label>{t("reports.employee")}</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reports.employee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {employees &&
                    Array.isArray(employees) &&
                    employees.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Search Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("reports.customerSearch")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t("reports.customerSearchPlaceholder")}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>{t("reports.productSearch")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t("reports.productSearchPlaceholder")}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Display */}
      <Card className="shadow-lg border-blue-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            {t("reports.chartView")} - {concernType === "transaction" ? t("reports.transactionConcern") : t("reports.productConcern")}
          </CardTitle>
          <CardDescription className="text-blue-600">
            {t("reports.visualRepresentation")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-96 w-full bg-white rounded-lg border border-blue-100 p-4">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getChartData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#374151" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tickMargin={10}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#374151" }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) {
                        return `${(value / 1000000).toFixed(1)}M`;
                      } else if (value >= 1000) {
                        return `${(value / 1000).toFixed(0)}K`;
                      }
                      return value.toString();
                    }}
                    width={60}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelStyle={{ color: "#374151", fontWeight: 600 }}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  {concernType === "transaction" ? (
                    <>
                      <Bar
                        dataKey="orders"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                    </>
                  ) : (
                    <Bar
                      dataKey="quantity"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Tables */}
      <div className="space-y-6">
        {concernType === "transaction" ? renderTransactionTable() : renderProductTable()}
      </div>
    </div>
  );
}
