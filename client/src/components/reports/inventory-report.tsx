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
import { Badge } from "@/components/ui/badge";
import { Package, Search, TrendingUp } from "lucide-react";
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
} from "recharts";

export function InventoryReport() {
  const { t } = useTranslation();

  // Filters
  const [concernType, setConcernType] = useState("sales");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [productSearch, setProductSearch] = useState("");
  const [productType, setProductType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
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

  const getFilteredProducts = () => {
    if (!products || !Array.isArray(products)) return [];

    return products.filter((product: any) => {
      const searchMatch =
        !productSearch ||
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.sku &&
          product.sku.toLowerCase().includes(productSearch.toLowerCase()));

      const categoryMatch =
        selectedCategory === "all" ||
        product.categoryId.toString() === selectedCategory;

      return searchMatch && categoryMatch;
    });
  };

  const getSalesData = () => {
    const filteredProducts = getFilteredProducts();
    if (!filteredProducts.length || !orders) return [];

    // Mock sales data based on products
    return filteredProducts
      .map((product: any) => ({
        productCode: product.sku || product.id,
        productName: product.name,
        quantitySold: Math.floor(Math.random() * 100) + 10,
        revenue: Math.floor(Math.random() * 1000000) + 100000,
        quantityReturned: Math.floor(Math.random() * 10),
        returnValue: Math.floor(Math.random() * 50000) + 5000,
        netRevenue: 0, // Will be calculated
      }))
      .map((item) => ({
        ...item,
        netRevenue: item.revenue - item.returnValue,
      }));
  };

  const getProfitData = () => {
    const salesData = getSalesData();
    return salesData.map((item) => {
      const totalCost = item.quantitySold * (Math.random() * 20000 + 10000);
      const profit = item.netRevenue - totalCost;
      const profitMargin =
        item.netRevenue > 0 ? (profit / item.netRevenue) * 100 : 0;

      return {
        ...item,
        totalCost,
        profit,
        profitMargin,
      };
    });
  };

  const getInventoryValue = () => {
    const filteredProducts = getFilteredProducts();
    return filteredProducts.map((product: any) => {
      const quantity = Math.floor(Math.random() * 100) + 10;
      const salePrice =
        product.price || Math.floor(Math.random() * 50000) + 10000;
      const costPrice = salePrice * 0.7;

      return {
        productCode: product.sku || product.id,
        productName: product.name,
        quantity,
        salePrice,
        saleValue: quantity * salePrice,
        costPrice,
        inventoryValue: quantity * costPrice,
      };
    });
  };

  const getInOutInventory = () => {
    const filteredProducts = getFilteredProducts();
    return filteredProducts.map((product: any) => {
      const openingStock = Math.floor(Math.random() * 50) + 10;
      const openingValue = openingStock * (Math.random() * 20000 + 10000);
      const inQuantity = Math.floor(Math.random() * 30) + 5;
      const outQuantity = Math.floor(Math.random() * 25) + 5;
      const outValue = outQuantity * (Math.random() * 25000 + 15000);
      const closingStock = openingStock + inQuantity - outQuantity;
      const closingValue = closingStock * (Math.random() * 22000 + 12000);

      return {
        productCode: product.sku || product.id,
        productName: product.name,
        openingStock,
        openingValue,
        inQuantity,
        outQuantity,
        outValue,
        closingStock,
        closingValue,
      };
    });
  };

  const getDetailedInOutInventory = () => {
    const filteredProducts = getFilteredProducts();
    return filteredProducts.map((product: any) => {
      const openingStock = Math.floor(Math.random() * 50) + 10;
      const openingPrice = Math.random() * 20000 + 10000;
      const closingStock = Math.floor(Math.random() * 60) + 5;
      const closingValue = closingStock * (Math.random() * 22000 + 12000);

      return {
        productCode: product.sku || product.id,
        productName: product.name,
        openingStock,
        openingPrice,
        inSupplier: Math.floor(Math.random() * 10) + 1,
        inCheck: Math.floor(Math.random() * 5),
        inReturn: Math.floor(Math.random() * 3),
        inTransfer: Math.floor(Math.random() * 5),
        inProduction: Math.floor(Math.random() * 8),
        outSale: Math.floor(Math.random() * 20) + 5,
        outDisposal: Math.floor(Math.random() * 3),
        outSupplier: Math.floor(Math.random() * 2),
        outCheck: Math.floor(Math.random() * 2),
        outTransfer: Math.floor(Math.random() * 3),
        outProduction: Math.floor(Math.random() * 5),
        closingStock,
        closingValue,
      };
    });
  };

  const getDisposalData = () => {
    const filteredProducts = getFilteredProducts();
    return filteredProducts.map((product: any) => ({
      productCode: product.sku || product.id,
      productName: product.name,
      totalDisposed: Math.floor(Math.random() * 10) + 1,
      totalValue: Math.floor(Math.random() * 100000) + 10000,
    }));
  };

  const getEmployeeSalesData = () => {
    const salesData = getSalesData();
    return salesData.map((item) => ({
      ...item,
      employeeCount: Math.floor(Math.random() * 5) + 1,
    }));
  };

  const getCustomerSalesData = () => {
    const salesData = getSalesData();
    return salesData.map((item) => ({
      ...item,
      customerCount: Math.floor(Math.random() * 20) + 5,
    }));
  };

  const getSupplierData = () => {
    const filteredProducts = getFilteredProducts();
    return filteredProducts
      .map((product: any) => ({
        productCode: product.sku || product.id,
        productName: product.name,
        supplierCount: Math.floor(Math.random() * 3) + 1,
        inQuantity: Math.floor(Math.random() * 50) + 10,
        inValue: Math.floor(Math.random() * 500000) + 100000,
        returnQuantity: Math.floor(Math.random() * 5),
        returnValue: Math.floor(Math.random() * 50000) + 5000,
        netRevenue: 0,
      }))
      .map((item) => ({
        ...item,
        netRevenue: item.inValue - item.returnValue,
      }));
  };

  const getChartData = () => {
    if (concernType === "sales") {
      return getSalesData()
        .slice(0, 10)
        .map((item) => ({
          name: item.productName,
          value: item.netRevenue,
          quantity: item.quantitySold,
        }));
    } else if (concernType === "profit") {
      return getProfitData()
        .slice(0, 10)
        .map((item) => ({
          name: item.productName,
          value: item.profit,
          margin: item.profitMargin,
        }));
    } else if (concernType === "inventoryValue") {
      return getInventoryValue()
        .slice(0, 10)
        .map((item) => ({
          name: item.productName,
          value: item.inventoryValue,
          quantity: item.quantity,
        }));
    }
    return [];
  };

  const renderSalesReport = () => {
    const data = getSalesData();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.salesReportByProduct")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.quantitySold")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.returnQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.quantitySold}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantityReturned}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.returnValue)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.netRevenue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-gray-500 italic"
                  >
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

  const renderProfitReport = () => {
    const data = getProfitData();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t("reports.profitReportByProduct")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.quantitySold")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.returnQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.totalCost")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.grossProfit")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.profitMargin")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.quantitySold}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantityReturned}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.returnValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.netRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.totalCost)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(item.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.profitMargin.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-gray-500 italic"
                  >
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

  const renderInventoryValueReport = () => {
    const data = getInventoryValue();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.inventoryValueReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.quantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.salePrice")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.saleValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.costPrice")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.inventoryValue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.salePrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.saleValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.costPrice)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.inventoryValue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-gray-500 italic"
                  >
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

  const renderInOutInventoryReport = () => {
    const data = getInOutInventory();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.inOutInventoryReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.openingStock")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.openingValue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.inQuantity")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.outQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.outValue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.closingStock")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.closingValue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.openingStock}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.openingValue)}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {item.inQuantity}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.outQuantity}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.outValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.closingStock}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.closingValue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-gray-500 italic"
                  >
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

  const renderDetailedInOutInventoryReport = () => {
    const data = getDetailedInOutInventory();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.detailedInOutInventoryReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.openingStock")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.openingPrice")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.inSupplier")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.inCheck")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.inReturn")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.inTransfer")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.inProduction")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.outSale")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.outDisposal")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.outSupplier")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.outCheck")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.outTransfer")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.outProduction")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.closingStock")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.closingValue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.openingStock}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.openingPrice)}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {item.inSupplier}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {item.inCheck}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {item.inReturn}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {item.inTransfer}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {item.inProduction}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.outSale}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.outDisposal}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.outSupplier}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.outCheck}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.outTransfer}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.outProduction}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.closingStock}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.closingValue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={17}
                    className="text-center text-gray-500 italic"
                  >
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

  const renderDisposalReport = () => {
    const data = getDisposalData();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.disposalReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.totalDisposed")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.totalValue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.totalDisposed}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.totalValue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-gray-500 italic"
                  >
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

  const renderEmployeeSalesReport = () => {
    const data = getEmployeeSalesData();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.employeeSalesReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.employeeCount")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.quantitySold")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.returnQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.employeeCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantitySold}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantityReturned}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.returnValue)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.netRevenue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-500 italic"
                  >
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

  const renderCustomerSalesReport = () => {
    const data = getCustomerSalesData();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.customerSalesReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.customerCount")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.quantityPurchased")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.returnQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.customerCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantitySold}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantityReturned}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.returnValue)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.netRevenue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-500 italic"
                  >
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

  const renderSupplierReport = () => {
    const data = getSupplierData();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.supplierReportByProduct")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.supplierCount")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.inQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.inValue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.returnQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.supplierCount}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {item.inQuantity}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(item.inValue)}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {item.returnQuantity}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.returnValue)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.netRevenue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-500 italic"
                  >
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
    value: {
      label: t("reports.value"),
      color: "#3b82f6",
    },
    quantity: {
      label: t("reports.quantity"),
      color: "#10b981",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.inventoryReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.inventoryReportDescription")}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Concern Type */}
            <div>
              <Label>{t("reports.concernType")}</Label>
              <Select value={concernType} onValueChange={setConcernType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">{t("reports.sales")}</SelectItem>
                  <SelectItem value="profit">{t("reports.profit")}</SelectItem>
                  <SelectItem value="inventoryValue">
                    {t("reports.inventoryValue")}
                  </SelectItem>
                  <SelectItem value="inOutInventory">
                    {t("reports.inOutInventory")}
                  </SelectItem>
                  <SelectItem value="detailedInOutInventory">
                    {t("reports.detailedInOutInventory")}
                  </SelectItem>
                  <SelectItem value="disposal">
                    {t("reports.disposal")}
                  </SelectItem>
                  <SelectItem value="employeeSales">
                    {t("reports.employeeBySales")}
                  </SelectItem>
                  <SelectItem value="customerSales">
                    {t("reports.customerBySales")}
                  </SelectItem>
                  <SelectItem value="supplierPurchase">
                    {t("reports.supplierByPurchase")}
                  </SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="product">
                    {t("reports.product")}
                  </SelectItem>
                  <SelectItem value="service">
                    {t("reports.service")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Group */}
            <div>
              <Label>{t("reports.productGroup")}</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("reports.productGroup")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {categories &&
                    Array.isArray(categories) &&
                    categories.map((category: any) => (
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
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

          {/* Product Search */}
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
        </CardContent>
      </Card>

      {/* Chart Display for Sales, Profit, and Inventory Value */}
      {["sales", "profit", "inventoryValue"].includes(concernType) && (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-white/90 text-sm font-normal">
                  {t("reports.chartView")}
                </div>
                <div className="text-white font-semibold">
                  {concernType === "sales" && t("reports.sales")}
                  {concernType === "profit" && t("reports.profit")}
                  {concernType === "inventoryValue" &&
                    t("reports.inventoryValue")}
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              {t("reports.visualRepresentation")} - {t("reports.fromDate")}:{" "}
              {formatDate(startDate)} {t("reports.toDate")}:{" "}
              {formatDate(endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
            <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getChartData()}
                    margin={{ top: 30, right: 40, left: 30, bottom: 90 }}
                    barCategoryGap="25%"
                  >
                    <defs>
                      <linearGradient
                        id="valueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b82f6"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#3b82f6"
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="#e2e8f0"
                      opacity={0.4}
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
                      angle={-35}
                      textAnchor="end"
                      height={85}
                      interval={0}
                      tickMargin={12}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) {
                          return `${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                          return `${(value / 1000).toFixed(0)}K`;
                        }
                        return value.toString();
                      }}
                      width={70}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      labelStyle={{
                        color: "#1e293b",
                        fontWeight: 600,
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.98)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow:
                          "0 10px 25px -5px rgb(0 0 0 / 0.15), 0 4px 6px -2px rgb(0 0 0 / 0.05)",
                        padding: "12px 16px",
                        backdropFilter: "blur(8px)",
                      }}
                      cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#valueGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                      stroke="#2563eb"
                      strokeWidth={1}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Tables */}
      <div className="space-y-6">
        {concernType === "sales" && renderSalesReport()}
        {concernType === "profit" && renderProfitReport()}
        {concernType === "inventoryValue" && renderInventoryValueReport()}
        {concernType === "inOutInventory" && renderInOutInventoryReport()}
        {concernType === "detailedInOutInventory" &&
          renderDetailedInOutInventoryReport()}
        {concernType === "disposal" && renderDisposalReport()}
        {concernType === "employeeSales" && renderEmployeeSalesReport()}
        {concernType === "customerSales" && renderCustomerSalesReport()}
        {concernType === "supplierPurchase" && renderSupplierReport()}
      </div>
    </div>
  );
}
