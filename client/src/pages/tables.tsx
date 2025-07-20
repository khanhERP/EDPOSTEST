import { useState } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { TableGrid } from "@/components/tables/table-grid";
import { OrderManagement } from "@/components/orders/order-management";
import { TableManagement } from "@/components/tables/table-management";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Settings, ClipboardList } from "lucide-react";
import { Link } from "wouter";

export default function TablesPage() {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <POSHeader />
      
      {/* Right Sidebar */}
      <RightSidebar />
      
      <div className="pt-16 px-6 pr-20">
        <div className="max-w-6xl mx-auto py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">테이블 관리</h1>
              <p className="mt-2 text-gray-600">매장 테이블과 주문을 관리합니다.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/">
                <Button variant="outline">
                  POS로 돌아가기
                </Button>
              </Link>
            </div>
          </div>

          <Tabs defaultValue="tables" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tables" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                테이블 현황
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                주문 관리
              </TabsTrigger>
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                테이블 설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tables">
              <TableGrid onTableSelect={setSelectedTableId} selectedTableId={selectedTableId} />
            </TabsContent>

            <TabsContent value="orders">
              <OrderManagement />
            </TabsContent>

            <TabsContent value="management">
              <TableManagement />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}