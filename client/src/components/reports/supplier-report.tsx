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
    if (!supplierPurchases || !Array.isArray(supplierPurchases)) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return supplierPurchases
      .filter((purchase: any) => {
        const purchaseDate = new Date(purchase.createdAt || purchase.created_at);
        const dateMatch = purchaseDate >= start && purchaseDate <= end;

        const supplierMatch =
          !supplierSearch ||
          (purchase.supplier?.code &&
            purchase.supplier.code.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (purchase.supplier?.name &&
            purchase.supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (purchase.supplier?.phone && 
            purchase.supplier.phone.includes(supplierSearch)) ||
          (purchase.supplierCode &&
            purchase.supplierCode.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (purchase.supplierName &&
            purchase.supplierName.toLowerCase().includes(supplierSearch.toLowerCase()));

        return dateMatch && supplierMatch;
      })
      .map((purchase: any) => ({
        supplierCode: purchase.supplier?.code || purchase.supplierCode || purchase.supplier?.id || "N/A",
        supplierName: purchase.supplier?.name || purchase.supplierName || "Không xác định",
        purchaseValue: Number(purchase.purchaseValue || purchase.totalValue || 0),
        returnValue: Number(purchase.returnValue || 0),
        netValue: Number(purchase.purchaseValue || purchase.totalValue || 0) - Number(purchase.returnValue || 0),
      }));
  };

  const getSupplierDebtData = () => {
    if (!supplierDebts || !Array.isArray(supplierDebts)) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return supplierDebts
      .filter((debt: any) => {
        const debtDate = new Date(debt.createdAt || debt.created_at);
        const dateMatch = debtDate >= start && debtDate <= end;

        const supplierMatch =
          !supplierSearch ||
          (debt.supplier?.code &&
            debt.supplier.code.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (debt.supplier?.name &&
            debt.supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (debt.supplier?.phone && 
            debt.supplier.phone.includes(supplierSearch)) ||
          (debt.supplierCode &&
            debt.supplierCode.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (debt.supplierName &&
            debt.supplierName.toLowerCase().includes(supplierSearch.toLowerCase()));

        const debtAmountMatch = (() => {
          if (!debtFrom && !debtTo) return true;
          const from = debtFrom ? Number(debtFrom) : 0;
          const to = debtTo ? Number(debtTo) : Infinity;
          const closingDebt = Number(debt.closingDebt || 0);
          return closingDebt >= from && closingDebt <= to;
        })();

        return dateMatch && supplierMatch && debtAmountMatch;
      })
      .map((debt: any) => ({
        supplierCode: debt.supplier?.code || debt.supplierCode || debt.supplier?.id || "N/A",
        supplierName: debt.supplier?.name || debt.supplierName || "Không xác định",
        openingDebt: Number(debt.openingDebt || 0),
        debitAmount: Number(debt.debitAmount || 0),
        creditAmount: Number(debt.creditAmount || 0),
        closingDebt: Number(debt.closingDebt || 0),
      }));
  };

  const getSupplierProductData = () => {
    if (!supplierPurchases || !Array.isArray(supplierPurchases)) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const supplierProductMap = new Map();

    supplierPurchases.forEach((purchase: any) => {
      const purchaseDate = new Date(purchase.createdAt || purchase.created_at);
      const dateMatch = purchaseDate >= start && purchaseDate <= end;

      if (!dateMatch) return;

      const supplierCode = purchase.supplier?.code || purchase.supplierCode || purchase.supplier?.id || "N/A";
      const supplierName = purchase.supplier?.name || purchase.supplierName || "Không xác định";

      const supplierMatch =
        !supplierSearch ||
        supplierCode.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        supplierName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        (purchase.supplier?.phone && purchase.supplier.phone.includes(supplierSearch));

      if (!supplierMatch) return;

      const key = supplierCode;
      if (!supplierProductMap.has(key)) {
        supplierProductMap.set(key, {
          supplierCode,
          supplierName,
          openingDebt: Number(purchase.openingDebt || 0),
          debitAmount: Number(purchase.debitAmount || 0),
          creditAmount: Number(purchase.creditAmount || 0),
          closingDebt: Number(purchase.closingDebt || 0),
        });
      }
    });

    return Array.from(supplierProductMap.values());
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
          <CardContent className="pt-6">
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

        {/* Report Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t("reports.supplierPurchaseReportTitle")}
            </CardTitle>
            <CardDescription>
              {t("reports.fromDate")}: {formatDate(startDate)} - {t("reports.toDate")}: {formatDate(endDate)}
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
                  data.map((item, index) => (
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
          <CardContent className="pt-6">
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

        {/* Report Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t("reports.supplierDebtReportTitle")}
            </CardTitle>
            <CardDescription>
              {t("reports.fromDate")}: {formatDate(startDate)} - {t("reports.toDate")}: {formatDate(endDate)}
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
                  data.map((item, index) => (
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
            {t("reports.supplierProductPurchaseReportTitle")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} - {t("reports.toDate")}: {formatDate(endDate)}
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
                data.map((item, index) => (
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.supplierReport")}</CardTitle>
          <CardDescription>{t("reports.supplierReportDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Debt Range Filter - Only show for debt concern type */}
          {concernType === "debt" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <Label htmlFor="debt-from">{t("reports.supplierDebtFrom")}</Label>
                <Input
                  id="debt-from"
                  type="number"
                  placeholder="0"
                  value={debtFrom}
                  onChange={(e) => setDebtFrom(e.target.value)}
                />
              </div>
              <div>
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
          )}
        </CardContent>
      </Card>

      {/* Report Content Based on Concern Type */}
      <div key={concernType}>
        {concernType === "purchase" && renderPurchaseReport()}
        {concernType === "debt" && renderDebtReport()}
        {concernType === "purchaseBySupplier" && renderProductsBySupplierReport()}
      </div>
    </div>
  );
}