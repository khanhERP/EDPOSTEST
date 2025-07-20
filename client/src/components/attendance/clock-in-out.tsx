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
import type { Employee, AttendanceRecord } from "@shared/schema";

export function ClockInOut() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: todayAttendance, refetch: refetchTodayAttendance } = useQuery({
    queryKey: ['/api/attendance/today', selectedEmployeeId],
    enabled: !!selectedEmployeeId,
  });

  const clockInMutation = useMutation({
    mutationFn: () => apiRequest('/api/attendance/clock-in', { 
      method: 'POST', 
      body: JSON.stringify({ employeeId: selectedEmployeeId, notes }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchTodayAttendance();
      setNotes("");
      toast({
        title: "출근 완료",
        description: "출근이 기록되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "출근 기록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => apiRequest(`/api/attendance/clock-out/${todayAttendance?.id}`, { 
      method: 'POST' 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchTodayAttendance();
      toast({
        title: "퇴근 완료",
        description: "퇴근이 기록되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "퇴근 기록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: () => apiRequest(`/api/attendance/break-start/${todayAttendance?.id}`, { 
      method: 'POST' 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchTodayAttendance();
      toast({
        title: "휴게 시작",
        description: "휴게 시간이 시작되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "휴게 시작 기록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: () => apiRequest(`/api/attendance/break-end/${todayAttendance?.id}`, { 
      method: 'POST' 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchTodayAttendance();
      toast({
        title: "휴게 종료",
        description: "휴게 시간이 종료되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "휴게 종료 기록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const selectedEmployee = employees?.find((emp: Employee) => emp.id === selectedEmployeeId);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWorkingHours = (clockIn: string, clockOut?: string) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diff.toFixed(1);
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.clockOut) {
      if (record.breakStart && !record.breakEnd) {
        return <Badge variant="secondary">휴게 중</Badge>;
      }
      return <Badge variant="default">근무 중</Badge>;
    }
    return <Badge variant="outline">퇴근 완료</Badge>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            직원 선택
          </CardTitle>
          <CardDescription>
            출퇴근을 기록할 직원을 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {employees?.map((employee: Employee) => (
              <Button
                key={employee.id}
                variant={selectedEmployeeId === employee.id ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSelectedEmployeeId(employee.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{employee.name}</span>
                  <Badge variant="secondary">{employee.role === 'manager' ? '매니저' : employee.role === 'admin' ? '관리자' : '캐셔'}</Badge>
                </div>
              </Button>
            )) || (
              <p className="text-gray-500 text-center py-4">직원 정보를 불러오는 중...</p>
            )}
          </div>

          {selectedEmployeeId && (
            <div className="space-y-2">
              <Label htmlFor="notes">메모 (선택사항)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="근무 관련 메모를 입력하세요..."
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
            출퇴근 기록
          </CardTitle>
          <CardDescription>
            {selectedEmployee ? `${selectedEmployee.name}님의 근태 관리` : "직원을 선택하세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedEmployee ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">먼저 직원을 선택해주세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Today's Status */}
              {todayAttendance && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">오늘의 근무 현황</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>출근 시간:</span>
                      <span className="font-medium">{formatTime(todayAttendance.clockIn)}</span>
                    </div>
                    {todayAttendance.clockOut && (
                      <div className="flex justify-between items-center">
                        <span>퇴근 시간:</span>
                        <span className="font-medium">{formatTime(todayAttendance.clockOut)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span>근무 시간:</span>
                      <span className="font-medium">{getWorkingHours(todayAttendance.clockIn, todayAttendance.clockOut)}시간</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>상태:</span>
                      {getStatusBadge(todayAttendance)}
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
                    {clockInMutation.isPending ? "처리 중..." : "출근"}
                  </Button>
                ) : (
                  <>
                    {!todayAttendance.clockOut && (
                      <>
                        {todayAttendance.breakStart && !todayAttendance.breakEnd ? (
                          <Button
                            onClick={() => breakEndMutation.mutate()}
                            disabled={breakEndMutation.isPending}
                            variant="outline"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            휴게 종료
                          </Button>
                        ) : (
                          <Button
                            onClick={() => breakStartMutation.mutate()}
                            disabled={breakStartMutation.isPending}
                            variant="outline"
                          >
                            <Coffee className="w-4 h-4 mr-2" />
                            휴게 시작
                          </Button>
                        )}
                        <Button
                          onClick={() => clockOutMutation.mutate()}
                          disabled={clockOutMutation.isPending}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          퇴근
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