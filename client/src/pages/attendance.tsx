import { useState } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { AttendanceList } from "@/components/attendance/attendance-list";
import { AttendanceStats } from "@/components/attendance/attendance-stats";
import { ClockInOut } from "@/components/attendance/clock-in-out";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users } from "lucide-react";
import { Link } from "wouter";

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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
              <h1 className="text-3xl font-bold text-gray-900">근태 관리</h1>
              <p className="mt-2 text-gray-600">직원 출퇴근 기록과 근무시간을 관리합니다.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/employees">
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  직원 관리
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">
                  POS로 돌아가기
                </Button>
              </Link>
            </div>
          </div>

          <Tabs defaultValue="clock" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="clock" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                출퇴근
              </TabsTrigger>
              <TabsTrigger value="records" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                근태 기록
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                통계
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clock">
              <ClockInOut />
            </TabsContent>

            <TabsContent value="records">
              <AttendanceList selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </TabsContent>

            <TabsContent value="stats">
              <AttendanceStats />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}