import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Plus, Edit2, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { insertTableSchema, type InsertTable, type Table as TableType } from "@shared/schema";

export function TableManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['/api/tables'],
  });

  const form = useForm<InsertTable>({
    resolver: zodResolver(insertTableSchema),
    defaultValues: {
      tableNumber: "",
      capacity: 4,
      status: "available",
      qrCode: null,
    },
  });

  const createTableMutation = useMutation({
    mutationFn: (tableData: InsertTable) =>
      apiRequest('/api/tables', {
        method: 'POST',
        body: JSON.stringify(tableData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "테이블 생성",
        description: "새 테이블이 성공적으로 생성되었습니다.",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "생성 실패",
        description: "테이블 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertTable> }) =>
      apiRequest(`/api/tables/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "테이블 수정",
        description: "테이블 정보가 성공적으로 수정되었습니다.",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "테이블 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/tables/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "테이블 삭제",
        description: "테이블이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "테이블 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: "이용 가능", variant: "default" as const },
      occupied: { label: "사용 중", variant: "destructive" as const },
      reserved: { label: "예약됨", variant: "secondary" as const },
      maintenance: { label: "정비 중", variant: "outline" as const },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  };

  const handleOpenDialog = (table?: TableType) => {
    if (table) {
      setEditingTable(table);
      form.reset({
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status as any,
        qrCode: table.qrCode,
      });
    } else {
      setEditingTable(null);
      form.reset({
        tableNumber: "",
        capacity: 4,
        status: "available",
        qrCode: null,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTable(null);
    form.reset();
  };

  const onSubmit = (data: InsertTable) => {
    if (editingTable) {
      updateTableMutation.mutate({ id: editingTable.id, data });
    } else {
      createTableMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("정말로 이 테이블을 삭제하시겠습니까?")) {
      deleteTableMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">테이블 목록을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              테이블 설정
            </CardTitle>
            <CardDescription>
              매장 테이블을 추가, 수정, 삭제할 수 있습니다.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                테이블 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTable ? "테이블 수정" : "새 테이블 추가"}
                </DialogTitle>
                <DialogDescription>
                  {editingTable ? "테이블 정보를 수정하세요." : "새로운 테이블을 추가하세요."}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tableNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>테이블 번호</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="T1, A1 등" />
                        </FormControl>
                        <FormDescription>
                          테이블을 식별할 수 있는 고유한 번호를 입력하세요.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>수용 인원</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min={1} 
                            max={20}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>
                          테이블의 최대 수용 인원을 설정하세요.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>상태</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="테이블 상태를 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">이용 가능</SelectItem>
                            <SelectItem value="occupied">사용 중</SelectItem>
                            <SelectItem value="reserved">예약됨</SelectItem>
                            <SelectItem value="maintenance">정비 중</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="qrCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>QR 코드 (선택사항)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="QR 코드 데이터" />
                        </FormControl>
                        <FormDescription>
                          모바일 주문용 QR 코드 데이터를 입력하세요.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      취소
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTableMutation.isPending || updateTableMutation.isPending}
                    >
                      {editingTable ? "수정" : "추가"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!tables || tables.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">등록된 테이블이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">테이블을 추가해보세요.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>테이블 번호</TableHead>
                <TableHead>수용 인원</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>QR 코드</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table: TableType) => {
                const statusConfig = getStatusBadge(table.status);
                
                return (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.tableNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        {table.capacity}명
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {table.qrCode ? (
                        <span className="text-xs text-green-600">설정됨</span>
                      ) : (
                        <span className="text-xs text-gray-400">없음</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(table.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(table)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(table.id)}
                          disabled={table.status === "occupied"}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}