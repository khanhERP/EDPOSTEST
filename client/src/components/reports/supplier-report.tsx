
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Building2, Search, BarChart3 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function SupplierReport() {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [concernType, setConcernType] = useState<string>("purchase");
  const [supplierSearch, setSupplierSearch] = useState<string>("");
  const [debtFrom, setDebtFrom] = useState<string>("");
  const [debtTo, setDebtTo] = useState<string>("");

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const { data: supplierDebts } = useQuery({
    queryKey: ["/api/supplier-debts"],
    enabled: concernType === "debt",
  });

  const { data: supplierPurchases } = useQuery({
    queryKey: ["/api/supplier-purchases"],
    enabled: concernType === "purchase" || concernType === "purchaseBySupplier",
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

  const getSupplierPurchaseData = () => {
    if (!suppliers || !Array.isArray(suppliers)) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Mock purchase data based on suppliers
    return suppliers
      .filter((supplier: any) => {
        const supplierMatch =
          !supplierSearch ||
          (supplier.code &&
            supplier.code.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (supplier.name &&
            supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (supplier.phone && supplier.phone.includes(supplierSearch));

        return supplierMatch;
      })
      .map((supplier: any) => {
        // Mock purchase values
        const purchaseValue = Math.floor(Math.random() * 10000000) + 1000000;
        const returnValue = Math.floor(Math.random() * 1000000);
        const netValue = purchaseValue - returnValue;

        return {
          supplierCode: supplier.code || supplier.id,
          supplierName: supplier.name,
          purchaseValue,
          returnValue,
          netValue,
        };
      });
  };

  const getSupplierDebtData = () => {
    if (!suppliers || !Array.isArray(suppliers)) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return suppliers
      .filter((supplier: any) => {
        const supplierMatch =
          !supplierSearch ||
          (supplier.code &&
            supplier.code.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (supplier.name &&
            supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (supplier.phone && supplier.phone.includes(supplierSearch));

        return supplierMatch;
      })
      .map((supplier: any) => {
        // Mock debt values
        const openingDebt = Math.floor(Math.random() * 5000000);
        const debitAmount = Math.floor(Math.random() * 3000000);
        const creditAmount = Math.floor(Math.random() * 2000000);
        const closingDebt = openingDebt + debitAmount - creditAmount;

        return {
          supplierCode: supplier.code || supplier.id,
          supplierName: supplier.name,
          openingDebt,
          debitAmount,
          creditAmount,
          closingDebt,
        };
      })
      .filter((debt) => {
        if (!debtFrom && !debtTo) return true;
        const from = debtFrom ? Number(debtFrom) : 0;
        const to = debtTo ? Number(debtTo) : Infinity;
        return debt.closingDebt >= from && debt.closingDebt <= to;
      });
  };

  const getSupplierProductData = () => {
    if (!suppliers || !Array.isArray(suppliers)) return [];

    return suppliers
      .filter((supplier: any) => {
        const supplierMatch =
          !supplierSearch ||
          (supplier.code &&
            supplier.code.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (supplier.name &&
            supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (supplier.phone && supplier.phone.includes(supplierSearch));

        return supplierMatch;
      })
      .map((supplier: any) => {
        // Mock product purchase data
        const productCount = Math.floor(Math.random() * 20) + 1;
        const totalQuantity = Math.floor(Math.random() * 1000) + 100;
        const totalValue = Math.floor(Math.random() * 10000000) + 1000000;

        return {
          supplierCode: supplier.code || supplier.id,
          supplierName: supplier.name,
          productCount,
          totalQuantity,
          totalValue,
        };
      });
  };

  const renderPurchaseReport = () => {
    const data = getSupplierPurchaseData();
    const chartData = data.slice(0, 10).map((item) => ({
      name: item.supplierName.length > 15 
        ? item.supplierName.substring(0, 15) + "..." 
        : item.supplierName,
      value: item.netValue,
    }));

    return (
      <div className="space-y-6">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t("reports.supplierPurchaseChart")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => (value / 1000000).toFixed(1) + "M"}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), t("reports.netValue")]}
                />
                <Bar dataKey="value" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t("reports.supplierPurchaseReport")}
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
                  <TableHead>{t("reports.supplierCode")}</TableHead>
                  <TableHead>{t("reports.supplierName")}</TableHead>
                  <TableHead className="text-right">{t("reports.purchaseValue")}</TableHead>
                  <TableHead className="text-right">{t("reports.returnValue")}</TableHead>
                  <TableHead className="text-right">{t("reports.netValue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length > 0 ? (
                  data.slice(0, 20).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.supplierCode}</TableCell>
                      <TableCell>{item.supplierName}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(item.purchaseValue)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(item.returnValue)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(item.netValue)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 italic">
                      {t("reports.noReportData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDebtReport = () => {
    const data = getSupplierDebtData();
    const chartData = data.slice(0, 10).map((item) => ({
      name: item.supplierName.length > 15 
        ? item.supplierName.substring(0, 15) + "..." 
        : item.supplierName,
      value: item.closingDebt,
    }));

    return (
      <div className="space-y-6">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t("reports.supplierDebtChart")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => (value / 1000000).toFixed(1) + "M"}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), t("reports.closingDebt")]}
                />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Debt Range Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="debt-from">{t("reports.supplierDebtFrom")}</Label>
                <Input
                  id="debt-from"
                  type="number"
                  placeholder="0"
                  value={debtFrom}
                  onChange={(e) => setDebtFrom(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="debt-to">{t("reports.supplierDebtTo")}</Label>
                <Input
                  id="debt-to"
                  type="number"
                  placeholder="999999999"
                  value={debtTo}
                  onChange={(e) => setDebtTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t("reports.supplierDebtReport")}
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
                  <TableHead>{t("reports.supplierCode")}</TableHead>
                  <TableHead>{t("reports.supplierName")}</TableHead>
                  <TableHead className="text-right">{t("reports.openingDebt")}</TableHead>
                  <TableHead className="text-right">{t("reports.debitAmount")}</TableHead>
                  <TableHead className="text-right">{t("reports.creditAmount")}</TableHead>
                  <TableHead className="text-right">{t("reports.closingDebt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length > 0 ? (
                  data.slice(0, 20).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.supplierCode}</TableCell>
                      <TableCell>{item.supplierName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.openingDebt)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(item.debitAmount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(item.creditAmount)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(item.closingDebt)}
                      </TableCell>
                    </TableRow>
                  ))
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
      </div>
    );
  };

  const renderProductsBySupplierReport = () => {
    const data = getSupplierProductData();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t("reports.supplierProductPurchaseReport")}
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
                <TableHead>{t("reports.supplierCode")}</TableHead>
                <TableHead>{t("reports.supplierName")}</TableHead>
                <TableHead className="text-center">{t("reports.productCount")}</TableHead>
                <TableHead className="text-center">{t("reports.totalQuantity")}</TableHead>
                <TableHead className="text-right">{t("reports.totalValue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.supplierCode}</TableCell>
                    <TableCell>{item.supplierName}</TableCell>
                    <TableCell className="text-center">{item.productCount}</TableCell>
                    <TableCell className="text-center">{item.totalQuantity}</TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.totalValue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 italic">
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.supplierReport")}</CardTitle>
          <CardDescription>{t("reports.supplierReportDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main filters row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="concern-type">{t("reports.supplierConcernType")}</Label>
              <Select value={concernType} onValueChange={setConcernType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">{t("reports.supplierPurchase")}</SelectItem>
                  <SelectItem value="debt">{t("reports.supplierDebt")}</SelectItem>
                  <SelectItem value="purchaseBySupplier">{t("reports.supplierPurchaseBySupplier")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="start-date">{t("reports.startDate")}</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="end-date">{t("reports.endDate")}</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="supplier-search">{t("reports.supplierFilter")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="supplier-search"
                  placeholder={t("reports.supplierFilterPlaceholder")}
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {concernType === "purchase" && renderPurchaseReport()}
      {concernType === "debt" && renderDebtReport()}
      {concernType === "purchaseBySupplier" && renderProductsBySupplierReport()}
    </div>
  );
}
