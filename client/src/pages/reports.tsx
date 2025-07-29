import { useState, useEffect } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { SalesReport } from "@/components/reports/sales-report";
import { SalesChartReport } from "@/components/reports/sales-chart-report";
import { MenuReport } from "@/components/reports/menu-report";
import { TableReport } from "@/components/reports/table-report";
import { DashboardOverview } from "@/components/reports/dashboard-overview";
import { EndOfDayReport } from "@/components/reports/end-of-day-report";
import { OrderReport } from "@/components/reports/order-report";
import { InventoryReport } from "@/components/reports/inventory-report";
import { CustomerReport } from "@/components/reports/customer-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart, TrendingUp, Utensils, Package, Users, Calendar, FileText, ShoppingCart } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { SupplierReport } from "@/components/reports/supplier-report";
import { EmployeeReport } from "@/components/reports/employee-report";
import { SalesChannelReport } from "@/components/reports/sales-channel-report";

export default function ReportsPage() {
  const { t } = useTranslation();
  const search = useSearch();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const tab = params.get('tab');
    if (tab && ['overview', 'sales', 'saleschart', 'menu', 'table', 'endofday', 'order', 'inventory', 'customer', 'supplier', 'employee', 'saleschannel'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [search]);
  return (
    <div className="min-h-screen bg-green-50 grocery-bg">
      {/* Header */}
      <POSHeader />

      {/* Right Sidebar */}
      <RightSidebar />

      <div className="main-content pt-16 px-6">
        <div className="max-w-5xl mx-auto py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('reports.title')}</h1>
              <p className="mt-2 text-gray-600">{t('reports.description')}</p>
            </div>
            <div className="flex gap-4">
              <Link href="/">
                <Button variant="outline">
                  {t('reports.backToTables')}
                </Button>
              </Link>
            </div>
          </div>



          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="w-full overflow-x-auto">
              <TabsList className="h-auto min-h-[40px] items-center justify-start rounded-md p-2 text-muted-foreground flex flex-wrap gap-1 bg-white border border-green-200 w-full shadow-sm">
                <TabsTrigger 
                  value="overview" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('reports.dashboard')}</span>
                  <span className="sm:hidden">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sales" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('reports.salesAnalysis')}</span>
                  <span className="sm:hidden">Sales</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="saleschart" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('reports.salesChart')}</span>
                  <span className="sm:hidden">Chart</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="menu" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <PieChart className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('reports.menuAnalysis')}</span>
                  <span className="sm:hidden">Menu</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="table" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <Utensils className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('reports.tableAnalysis')}</span>
                  <span className="sm:hidden">Table</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="endofday" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t("reports.endOfDayReportTab")}</span>
                  <span className="sm:hidden">EOD</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="order" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t("reports.orderReportTab")}</span>
                  <span className="sm:hidden">Order</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="inventory" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t("reports.inventoryReport")}</span>
                  <span className="sm:hidden">Inventory</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="customer" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t("reports.customerReportTab")}</span>
                  <span className="sm:hidden">Customer</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="supplier" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t("reports.supplierReportTab")}</span>
                  <span className="sm:hidden">Supplier</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="employee" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t("reports.employeeReportTab")}</span>
                  <span className="sm:hidden">Employee</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="saleschannel" 
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 transition-colors"
                >
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t("reports.salesChannelReportTab")}</span>
                  <span className="sm:hidden">Sales Channel</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <DashboardOverview />
            </TabsContent>

            <TabsContent value="sales">
              <SalesReport />
            </TabsContent>

            <TabsContent value="saleschart">
              <SalesChartReport />
            </TabsContent>

            <TabsContent value="menu">
              <MenuReport />
            </TabsContent>

            <TabsContent value="table">
              <TableReport />
            </TabsContent>

            <TabsContent value="endofday">
              <EndOfDayReport />
            </TabsContent>

            <TabsContent value="order">
              <OrderReport />
            </TabsContent>

            <TabsContent value="inventory">
              <InventoryReport />
            </TabsContent>

            <TabsContent value="customer">
              <CustomerReport />
            </TabsContent>

            <TabsContent value="supplier">
              <SupplierReport />
            </TabsContent>

            <TabsContent value="employee">
              <EmployeeReport />
            </TabsContent>

            <TabsContent value="saleschannel">
              <SalesChannelReport />
            </TabsContent>

            <TabsContent value="eod" className="hidden">
              <EndOfDayReport />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}