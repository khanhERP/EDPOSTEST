import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User } from "lucide-react";
import type { AttendanceRecord, Employee } from "@shared/schema";

interface AttendanceListProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function AttendanceList({ selectedDate, onDateChange }: AttendanceListProps) {
  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['/api/attendance', { date: selectedDate }],
  });

  const getEmployeeName = (employeeId: number) => {
    const employee = employees?.find((emp: Employee) => emp.id === employeeId);
    return employee?.name || "알 수 없음";
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { label: "출근", variant: "default" as const },
      absent: { label: "결근", variant: "destructive" as const },
      late: { label: "지각", variant: "secondary" as const },
      half_day: { label: "반차", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateBreakTime = (breakStart: string | null, breakEnd: string | null) => {
    if (!breakStart || !breakEnd) return "-";
    const start = new Date(breakStart);
    const end = new Date(breakEnd);
    const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              근태 기록
            </CardTitle>
            <CardDescription>
              직원들의 일별 근태 기록을 확인합니다.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="date-picker">날짜 선택:</Label>
            <Input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">근태 기록을 불러오는 중...</div>
          </div>
        ) : !attendanceRecords || attendanceRecords.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">{formatDate(selectedDate)}의 근태 기록이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">다른 날짜를 선택해보세요.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>직원명</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>출근 시간</TableHead>
                <TableHead>퇴근 시간</TableHead>
                <TableHead>휴게 시간</TableHead>
                <TableHead>총 근무시간</TableHead>
                <TableHead>초과근무</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords.map((record: AttendanceRecord) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {getEmployeeName(record.employeeId)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>{formatTime(record.clockIn)}</TableCell>
                  <TableCell>{formatTime(record.clockOut)}</TableCell>
                  <TableCell>{calculateBreakTime(record.breakStart, record.breakEnd)}</TableCell>
                  <TableCell>
                    {record.totalHours ? `${record.totalHours}시간` : "-"}
                  </TableCell>
                  <TableCell>
                    {record.overtime && parseFloat(record.overtime) > 0 ? (
                      <Badge variant="secondary">{record.overtime}시간</Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {record.notes ? (
                      <span className="text-sm text-gray-600">{record.notes}</span>
                    ) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}