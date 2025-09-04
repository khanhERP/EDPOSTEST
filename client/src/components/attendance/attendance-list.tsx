import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { AttendanceRecord, Employee } from "@shared/schema";

interface AttendanceListProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  useRange?: boolean;
}

export function AttendanceList({ 
  selectedDate, 
  onDateChange, 
  dateRange, 
  onDateRangeChange, 
  useRange = false 
}: AttendanceListProps) {
  const { t } = useTranslation();
  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: useRange 
      ? ['/api/attendance', 'range', dateRange?.startDate, dateRange?.endDate]
      : ['/api/attendance', selectedDate],
    queryFn: async () => {
      let url = '/api/attendance';
      if (useRange && dateRange?.startDate && dateRange?.endDate) {
        url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      } else {
        url += `?date=${selectedDate}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      return response.json();
    },
    enabled: useRange ? !!(dateRange?.startDate && dateRange?.endDate) : !!selectedDate
  });

  const getEmployeeName = (employeeId: number) => {
    const employee = employees?.find((emp: Employee) => emp.id === employeeId);
    return employee?.name || t('attendance.unknownEmployee');
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { label: t('attendance.status.present'), variant: "default" as const },
      absent: { label: t('attendance.status.absent'), variant: "destructive" as const },
      late: { label: t('attendance.status.late'), variant: "secondary" as const },
      half_day: { label: t('attendance.status.halfDay'), variant: "outline" as const },
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
    return hours > 0 ? `${hours}${t('attendance.hours')} ${mins}${t('attendance.minutes')}` : `${mins}${t('attendance.minutes')}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('attendance.attendanceRecords')}
            </CardTitle>
            <CardDescription>
              {t('attendance.recordsDescription')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {useRange && onDateRangeChange ? (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="start-date">{t('attendance.startDate')}:</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={dateRange?.startDate || ''}
                    onChange={(e) => onDateRangeChange(e.target.value, dateRange?.endDate || '')}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="end-date">{t('attendance.endDate')}:</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={dateRange?.endDate || ''}
                    onChange={(e) => onDateRangeChange(dateRange?.startDate || '', e.target.value)}
                    className="w-auto"
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Label htmlFor="date-picker">{t('attendance.selectedDate')}:</Label>
                <Input
                  id="date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-auto"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t('common.loading')}</div>
          </div>
        ) : !attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">{t('attendance.noRecords')}</p>
            <p className="text-sm text-gray-400 mt-2">{t('attendance.selectOtherDate')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employees.name')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('attendance.clockInTime')}</TableHead>
                <TableHead>{t('attendance.clockOutTime')}</TableHead>
                <TableHead>{t('attendance.breakTime')}</TableHead>
                <TableHead>{t('attendance.totalHours')}</TableHead>
                <TableHead>{t('attendance.overtime')}</TableHead>
                <TableHead>{t('attendance.notes')}</TableHead>
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
                    {record.totalHours ? `${record.totalHours}${t('attendance.hours')}` : "-"}
                  </TableCell>
                  <TableCell>
                    {record.overtime && parseFloat(record.overtime) > 0 ? (
                      <Badge variant="secondary">{record.overtime}{t('attendance.hours')}</Badge>
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