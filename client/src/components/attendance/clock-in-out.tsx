import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, LogIn, LogOut, Coffee, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import type { Employee, AttendanceRecord } from "@shared/schema";

export function ClockInOut() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: todayAttendance, refetch: refetchTodayAttendance } = useQuery({
    queryKey: ['/api/attendance/today', selectedEmployeeId],
    enabled: !!selectedEmployeeId,
  });

  const clockInMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/attendance/clock-in', { 
      employeeId: selectedEmployeeId, 
      notes 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchTodayAttendance();
      setNotes("");
      toast({
        title: t('attendance.clockInSuccess'),
        description: t('attendance.clockInSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('attendance.clockInError'),
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/attendance/clock-out/${(todayAttendance as AttendanceRecord)?.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchTodayAttendance();
      toast({
        title: t('attendance.clockOutSuccess'),
        description: t('attendance.clockOutSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('attendance.clockOutError'),
        variant: "destructive",
      });
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/attendance/break-start/${(todayAttendance as AttendanceRecord)?.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchTodayAttendance();
      toast({
        title: t('attendance.breakStartSuccess'),
        description: t('attendance.breakStartSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('attendance.breakStartError'),
        variant: "destructive",
      });
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/attendance/break-end/${(todayAttendance as AttendanceRecord)?.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchTodayAttendance();
      toast({
        title: t('attendance.breakEndSuccess'),
        description: t('attendance.breakEndSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('attendance.breakEndError'),
        variant: "destructive",
      });
    },
  });

  const selectedEmployee = (employees as Employee[] | undefined)?.find((emp: Employee) => emp.id === selectedEmployeeId);

  const formatTime = (dateInput: Date | string) => {
    return new Date(dateInput).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWorkingHours = (clockIn: Date | string, clockOut?: Date | string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diff.toFixed(1);
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.clockOut) {
      if (record.breakStart && !record.breakEnd) {
        return <Badge variant="secondary">{t('attendance.status.onBreak')}</Badge>;
      }
      return <Badge variant="default">{t('attendance.status.working')}</Badge>;
    }
    return <Badge variant="outline">{t('attendance.status.clockedOut')}</Badge>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('attendance.employeeSelect')}
          </CardTitle>
          <CardDescription>
            {t('attendance.selectEmployee')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {(employees as Employee[] | undefined)?.map((employee: Employee) => (
              <Button
                key={employee.id}
                variant={selectedEmployeeId === employee.id ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSelectedEmployeeId(employee.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{employee.name}</span>
                  <Badge variant="secondary">{t(`employees.roles.${employee.role}`)}</Badge>
                </div>
              </Button>
            )) || (
              <p className="text-gray-500 text-center py-4">{t('common.loading')}</p>
            )}
          </div>

          {selectedEmployeeId && (
            <div className="space-y-2">
              <Label htmlFor="notes">{t('attendance.notes')}</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('attendance.notesPlaceholder')}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clock In/Out Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('attendance.clockInOut')}
          </CardTitle>
          <CardDescription>
            {selectedEmployee ? `${selectedEmployee.name}${t('attendance.workingTime')}` : t('attendance.selectEmployee')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedEmployee ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{t('attendance.selectEmployee')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Today's Status */}
              {todayAttendance && (todayAttendance as AttendanceRecord) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">{t('attendance.currentStatus')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>{t('attendance.clockInTime')}:</span>
                      <span className="font-medium">{formatTime((todayAttendance as AttendanceRecord).clockIn)}</span>
                    </div>
                    {(todayAttendance as AttendanceRecord).clockOut && (
                      <div className="flex justify-between items-center">
                        <span>{t('attendance.clockOutTime')}:</span>
                        <span className="font-medium">{formatTime((todayAttendance as AttendanceRecord).clockOut!)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span>{t('attendance.workingTime')}:</span>
                      <span className="font-medium">{getWorkingHours((todayAttendance as AttendanceRecord).clockIn, (todayAttendance as AttendanceRecord).clockOut)}{t('attendance.hours')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{t('common.status')}:</span>
                      {getStatusBadge(todayAttendance as AttendanceRecord)}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {!todayAttendance ? (
                  <Button
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending}
                    className="col-span-2"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {clockInMutation.isPending ? t('common.loading') : t('attendance.clockIn')}
                  </Button>
                ) : (
                  <>
                    {!(todayAttendance as AttendanceRecord).clockOut && (
                      <>
                        {(todayAttendance as AttendanceRecord).breakStart && !(todayAttendance as AttendanceRecord).breakEnd ? (
                          <Button
                            onClick={() => breakEndMutation.mutate()}
                            disabled={breakEndMutation.isPending}
                            variant="outline"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {t('attendance.endBreak')}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => breakStartMutation.mutate()}
                            disabled={breakStartMutation.isPending}
                            variant="outline"
                          >
                            <Coffee className="w-4 h-4 mr-2" />
                            {t('attendance.startBreak')}
                          </Button>
                        )}
                        <Button
                          onClick={() => clockOutMutation.mutate()}
                          disabled={clockOutMutation.isPending}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {t('attendance.clockOut')}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}