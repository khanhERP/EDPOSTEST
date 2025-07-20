import { useState } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { SalesReport } from "@/components/reports/sales-report";
import { MenuReport } from "@/components/reports/menu-report";
import { TableReport } from "@/components/reports/table-report";
import { DashboardOverview } from "@/components/reports/dashboard-overview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart, TrendingUp, Utensils } from "lucide-react";
import { Link } from "wouter";

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-green-50 grocery-bg">
      {/* Header */}
      <POSHeader />
      
      {/* Right Sidebar */}
      <RightSidebar />
      
      <div className="pt-16 px-6 pl-20">
        <div className="max-w-6xl mx-auto py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">매출 분석</h1>
              <p className="mt-2 text-gray-600">매출 현황과 운영 지표를 분석합니다.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/">
                <Button variant="outline">
                  테이블로 돌아가기
                </Button>
              </Link>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                대시보드
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                매출 분석
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                메뉴 분석
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                테이블 분석
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