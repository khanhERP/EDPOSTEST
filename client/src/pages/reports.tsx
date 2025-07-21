import { useState } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { SalesReport } from "@/components/reports/sales-report";
import { MenuReport } from "@/components/reports/menu-report";
import { TableReport } from "@/components/reports/table-report";
import { DashboardOverview } from "@/components/reports/dashboard-overview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart, TrendingUp, Utensils, Package, Users, Calendar, FileText } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";

export default function ReportsPage() {
  const { t } = useTranslation();
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

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Item Sales Report */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white rounded-2xl border-green-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <Package className="w-5 h-5 text-green-600" />
                  </div>
                  {t('reports.itemSalesReport')}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {t('reports.itemSalesDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Employee Sales Report */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white rounded-2xl border-green-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  {t('reports.employeeSalesReport')}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {t('reports.employeeSalesDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Daily Sales Report */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white rounded-2xl border-green-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  {t('reports.dailySalesReport')}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {t('reports.dailySalesDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Detailed Sales Report */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white rounded-2xl border-green-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  {t('reports.detailedSalesReport')}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {t('reports.detailedSalesDesc')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('reports.dashboard')}
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {t('reports.salesAnalysis')}
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                {t('reports.menuAnalysis')}
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                {t('reports.tableAnalysis')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <DashboardOverview />
            </TabsContent>

            <TabsContent value="sales">
              <SalesReport />
            </TabsContent>

            <TabsContent value="menu">
              <MenuReport />
            </TabsContent>

            <TabsContent value="table">
              <TableReport />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}