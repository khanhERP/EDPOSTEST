import { useState } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { SalesReport } from "@/components/reports/sales-report";
import { SalesChartReport } from "@/components/reports/sales-chart-report";
import { MenuReport } from "@/components/reports/menu-report";
import { TableReport } from "@/components/reports/table-report";
import { DashboardOverview } from "@/components/reports/dashboard-overview";
import { EndOfDayReport } from "@/components/reports/end-of-day-report";
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



          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="h-10 items-center justify-center rounded-md p-1 text-muted-foreground grid w-full grid-cols-6 bg-[#4ed17e]">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('reports.dashboard')}
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {t('reports.salesAnalysis')}
              </TabsTrigger>
              <TabsTrigger value="saleschart" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {t('reports.salesChart')}
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                {t('reports.menuAnalysis')}
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                {t('reports.tableAnalysis')}
              </TabsTrigger>
              <TabsTrigger value="endofday" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("reports.endOfDayReportTab")}
              </TabsTrigger>
            </TabsList>

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
          </Tabs>
        </div>
      </div>
    </div>
  );
}