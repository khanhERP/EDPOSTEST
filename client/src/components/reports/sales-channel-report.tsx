import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Search, Calendar, Filter } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function SalesChannelReport() {
  const { t } = useTranslation();

  // Filters
  const [concernType, setConcernType] = useState("sales");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedSalesChannel, setSelectedSalesChannel] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [productType, setProductType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
  });

  // Sales channel sales data query
  const { data: salesChannelSalesData } = useQuery({
    queryKey: ["/api/sales-channel-sales", startDate, endDate, selectedSeller, selectedSalesChannel],
    staleTime: 1 * 60 * 1000,
  });

  // Sales channel profit data query
  const { data: salesChannelProfitData } = useQuery({
    queryKey: ["/api/sales-channel-profit", startDate, endDate, selectedSeller, selectedSalesChannel],
    staleTime: 1 * 60 * 1000,
  });

  // Sales channel products data query
  const { data: salesChannelProductsData } = useQuery({
    queryKey: ["/api/sales-channel-products", startDate, endDate, selectedSeller, selectedSalesChannel, productSearch, productType, selectedCategory],
    staleTime: 1 * 60 * 1000,
  });

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

  const getReportTitle = () => {
    const concernTypes = {
      sales: t("reports.salesBySalesChannel"),
      profit: t("reports.profitBySalesChannel"),
      products: t("reports.productsBySalesChannel"),
    };
    return concernTypes[concernType as keyof typeof concernTypes] || t("reports.salesChannelReport");
  };

  const getChartData = () => {
    if (concernType === "sales" && salesChannelSalesData) {
      return salesChannelSalesData.map((item: any) => ({
        name: item.salesChannelName,
        revenue: item.revenue,
        returnValue: item.returnValue,
        netRevenue: item.netRevenue,
      }));
    } else if (concernType === "profit" && salesChannelProfitData) {
      return salesChannelProfitData.map((item: any) => ({
        name: item.salesChannelName,
        grossProfit: item.grossProfit,
        netProfit: item.netProfit,
        platformFee: item.platformFee,
      }));
    }
    return [];
  };

  const renderSalesTable = () => {
    if (!salesChannelSalesData) return null;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.salesChannelFilter")}</TableHead>
            <TableHead>{t("reports.salesChannelRevenue")}</TableHead>
            <TableHead>{t("reports.salesChannelReturnValue")}</TableHead>
            <TableHead>{t("reports.salesChannelNetRevenue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesChannelSalesData.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold">{item.salesChannelName}</div>
                  {item.sellerName && (
                    <div className="text-sm text-gray-500">{item.sellerName}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatCurrency(item.revenue)}</TableCell>
              <TableCell>{formatCurrency(item.returnValue)}</TableCell>
              <TableCell className="font-semibold text-green-600">
                {formatCurrency(item.netRevenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderProfitTable = () => {
    if (!salesChannelProfitData) return null;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.salesChannelFilter")}</TableHead>
            <TableHead>{t("reports.salesChannelTotalAmount")}</TableHead>
            <TableHead>{t("reports.salesChannelDiscount")}</TableHead>
            <TableHead>{t("reports.salesChannelRevenue")}</TableHead>
            <TableHead>{t("reports.salesChannelReturnValue")}</TableHead>
            <TableHead>{t("reports.salesChannelNetRevenue")}</TableHead>
            <TableHead>{t("reports.salesChannelTotalCost")}</TableHead>
            <TableHead>{t("reports.salesChannelGrossProfit")}</TableHead>
            <TableHead>{t("reports.salesChannelFee")}</TableHead>
            <TableHead>{t("reports.salesChannelNetProfit")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesChannelProfitData.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold">{item.salesChannelName}</div>
                  {item.sellerName && (
                    <div className="text-sm text-gray-500">{item.sellerName}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
              <TableCell>{formatCurrency(item.discount)}</TableCell>
              <TableCell>{formatCurrency(item.revenue)}</TableCell>
              <TableCell>{formatCurrency(item.returnValue)}</TableCell>
              <TableCell>{formatCurrency(item.netRevenue)}</TableCell>
              <TableCell>{formatCurrency(item.totalCost)}</TableCell>
              <TableCell className="font-semibold text-green-600">
                {formatCurrency(item.grossProfit)}
              </TableCell>
              <TableCell>{formatCurrency(item.platformFee)}</TableCell>
              <TableCell className="font-semibold text-blue-600">
                {formatCurrency(item.netProfit)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderProductsTable = () => {
    if (!salesChannelProductsData) return null;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.salesChannelFilter")}</TableHead>
            <TableHead>{t("reports.productCode")}</TableHead>
            <TableHead>{t("reports.productName")}</TableHead>
            <TableHead>{t("reports.salesChannelQuantitySold")}</TableHead>
            <TableHead>{t("reports.salesChannelRevenue")}</TableHead>
            <TableHead>{t("reports.salesChannelQuantityReturned")}</TableHead>
            <TableHead>{t("reports.salesChannelReturnValue")}</TableHead>
            <TableHead>{t("reports.salesChannelNetRevenue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesChannelProductsData.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold">{item.salesChannelName}</div>
                  {item.sellerName && (
                    <div className="text-sm text-gray-500">{item.sellerName}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.productCode}</Badge>
              </TableCell>
              <TableCell>{item.productName}</TableCell>
              <TableCell>{item.quantitySold}</TableCell>
              <TableCell>{formatCurrency(item.revenue)}</TableCell>
              <TableCell>{item.quantityReturned}</TableCell>
              <TableCell>{formatCurrency(item.returnValue)}</TableCell>
              <TableCell className="font-semibold text-green-600">
                {formatCurrency(item.netRevenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t("reports.salesChannelReport")}
          </CardTitle>
          <CardDescription>{t("reports.salesChannelReportDescription")}</CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t("common.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Concern Type */}
            <div>
              <Label>{t("reports.salesChannelConcernType")}</Label>
              <Select value={concernType} onValueChange={setConcernType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">{t("reports.salesChannelSales")}</SelectItem>
                  <SelectItem value="profit">{t("reports.salesChannelProfit")}</SelectItem>
                  <SelectItem value="products">{t("reports.salesChannelProducts")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <Label>{t("reports.startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <Label>{t("reports.endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Seller Filter */}
            <div>
              <Label>{t("reports.sellerFilter")}</Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {employees?.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sales Channel Filter */}
            <div>
              <Label>{t("reports.salesChannelFilter")}</Label>
              <Select value={selectedSalesChannel} onValueChange={setSelectedSalesChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="direct">{t("reports.directSales")}</SelectItem>
                  <SelectItem value="other">{t("reports.otherSales")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional filters for products concern type */}
            {concernType === "products" && (
              <>
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

                {/* Product Type */}
                <div>
                  <Label>{t("reports.productType")}</Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="combo">{t("reports.combo")}</SelectItem>
                      <SelectItem value="product">{t("reports.product")}</SelectItem>
                      <SelectItem value="service">{t("reports.service")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div>
                  <Label>{t("common.category")}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {getReportTitle()}
          </CardTitle>
          <CardDescription>
            {t("reports.dataFrom")} {formatDate(startDate)} {t("reports.to")} {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {concernType === "sales" && renderSalesTable()}
          {concernType === "profit" && renderProfitTable()}
          {concernType === "products" && renderProductsTable()}

          {!salesChannelSalesData && !salesChannelProfitData && !salesChannelProductsData && (
            <div className="text-center py-8">
              <div className="text-gray-500">{t("reports.noReportData")}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {(concernType === "sales" || concernType === "profit") && (
        <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t("reports.salesChannelChart")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              {concernType === "sales" && (
                <>
                  <Bar dataKey="revenue" fill="#3B82F6" name={t("reports.salesChannelRevenue")} />
                  <Bar dataKey="netRevenue" fill="#10B981" name={t("reports.salesChannelNetRevenue")} />
                </>
              )}
              {concernType === "profit" && (
                <>
                  <Bar dataKey="grossProfit" fill="#3B82F6" name={t("reports.salesChannelGrossProfit")} />
                  <Bar dataKey="netProfit" fill="#10B981" name={t("reports.salesChannelNetProfit")} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      )}
    </div>
  );
}