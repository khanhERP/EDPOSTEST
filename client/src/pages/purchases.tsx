import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { ClipboardCheck, Plus, Search, Filter, BarChart3, Calendar, Package, User, DollarSign, Eye } from "lucide-react";
import type { PurchaseOrder, Supplier } from "@shared/schema";

interface PurchasesPageProps {
  onLogout: () => void;
}

export default function PurchasesPage({ onLogout }: PurchasesPageProps) {
  const { t, currentLanguage } = useTranslation();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading: isOrdersLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  // Fetch suppliers for filtering
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Calculate dashboard statistics
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Filter orders from current month
    const thisMonthOrders = purchaseOrders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    const pending = purchaseOrders.filter(order => order.status === 'pending').length;
    const completed = purchaseOrders.filter(order => order.status === 'received').length;
    const totalValue = purchaseOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0);

    return {
      totalOrders: thisMonthOrders.length, // Now correctly shows this month's orders
      pendingOrders: pending, 
      completedOrders: completed,
      totalValue: totalValue
    };
  }, [purchaseOrders]);

  // Filter purchase orders based on search and filters
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      // Safe supplier name lookup with null checks
      const supplierName = suppliers.find(s => s.id === order.supplierId)?.name?.toLowerCase() ?? "";
      const poNumber = order.poNumber?.toLowerCase() ?? "";
      const searchTermLower = searchTerm.toLowerCase();
      
      const matchesSearch = !searchTerm || 
        poNumber.includes(searchTermLower) ||
        supplierName.includes(searchTermLower);
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || order.supplierId.toString() === supplierFilter;
      
      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [purchaseOrders, searchTerm, statusFilter, supplierFilter, suppliers]);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
      partially_received: 'bg-purple-100 text-purple-800 border-purple-300',
      received: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const formatCurrency = (amount: string) => {
    // Get locale from current language setting
    const locale = {
      ko: 'ko-KR',
      en: 'en-US', 
      vi: 'vi-VN'
    }[currentLanguage] || 'en-US';
    
    // Use appropriate currency based on locale
    const currency = {
      ko: 'KRW',
      en: 'USD',
      vi: 'VND'  
    }[currentLanguage] || 'USD';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount || '0'));
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || t('purchases.unknownSupplier');
  };

  return (
    <div className="min-h-screen bg-green-50 grocery-bg">
      {/* Header */}
      <POSHeader />

      {/* Right Sidebar */}
      <RightSidebar />

      <div className="main-content pt-16 px-6">
        <div className="mx-auto py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardCheck className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">{t("purchases.title")}</h1>
            </div>
            <p className="text-gray-600">{t("purchases.dashboard")}</p>
          </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("purchases.totalOrders")}
              </CardTitle>
              <ClipboardCheck className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
              <p className="text-xs text-gray-500">{t("purchases.ordersThisMonth")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("purchases.pendingOrders")}
              </CardTitle>
              <ClipboardCheck className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</div>
              <p className="text-xs text-gray-500">{t("purchases.awaitingApproval")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("purchases.completedOrders")}
              </CardTitle>
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.completedOrders}</div>
              <p className="text-xs text-gray-500">{t("purchases.fullyReceived")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("purchases.totalValue")}
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue.toString())}</div>
              <p className="text-xs text-gray-500">{t("purchases.totalSpent")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar with Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
                {/* Create Purchase Order Button */}
                <Button 
                  className="bg-green-600 hover:bg-green-700 shrink-0" 
                  onClick={() => navigate('/purchases/create')}
                  data-testid="button-create-purchase-order"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("purchases.newPurchaseOrder")}
                </Button>

                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={t("purchases.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-purchase-orders"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder={t("purchases.filterByStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("purchases.allStatuses")}</SelectItem>
                    <SelectItem value="pending">{t("purchases.pending")}</SelectItem>
                    <SelectItem value="confirmed">{t("purchases.confirmed")}</SelectItem>
                    <SelectItem value="partially_received">{t("purchases.partially_received")}</SelectItem>
                    <SelectItem value="received">{t("purchases.received")}</SelectItem>
                    <SelectItem value="cancelled">{t("purchases.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Supplier Filter */}
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-48" data-testid="select-supplier-filter">
                    <SelectValue placeholder={t("purchases.filterBySupplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("purchases.allSuppliers")}</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
          </CardHeader>
          <CardContent>
            {isOrdersLoading ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500">{t("purchases.loadingOrders")}</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {purchaseOrders.length === 0 ? t("purchases.noOrders") : t("purchases.noOrdersFound")}
                </h3>
                <p className="text-gray-500 mb-6">
                  {purchaseOrders.length === 0 
                    ? t("purchases.createFirstOrder") 
                    : t("purchases.tryDifferentFilters")
                  }
                </p>
                {purchaseOrders.length === 0 && (
                  <Button 
                    className="bg-green-600 hover:bg-green-700" 
                    onClick={() => navigate('/purchases/create')}
                    data-testid="button-create-first-order"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("purchases.createPurchaseOrder")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("purchases.poNumber")}</TableHead>
                      <TableHead>{t("purchases.supplier")}</TableHead>
                      <TableHead>{t("purchases.orderDate")}</TableHead>
                      <TableHead>{t("purchases.expectedDate")}</TableHead>
                      <TableHead>{t("purchases.status")}</TableHead>
                      <TableHead>{t("purchases.totalAmount")}</TableHead>
                      <TableHead className="text-right">{t("purchases.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} data-testid={`row-purchase-order-${order.id}`}>
                        <TableCell className="font-medium">
                          {order.poNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            {getSupplierName(order.supplierId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            {new Date(order.orderDate).toLocaleDateString({
                              ko: 'ko-KR',
                              en: 'en-US',
                              vi: 'vi-VN'
                            }[currentLanguage] || 'en-US')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            {order.expectedDate 
                              ? new Date(order.expectedDate).toLocaleDateString({
                                  ko: 'ko-KR',
                                  en: 'en-US', 
                                  vi: 'vi-VN'
                                }[currentLanguage] || 'en-US')
                              : '-'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`${getStatusBadge(order.status)} border`}
                            data-testid={`badge-status-${order.status}`}
                          >
                            {t(`purchases.${order.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            {formatCurrency(order.totalAmount || '0')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {t("purchases.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}