import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Users, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import type { Table as TableType } from "@shared/schema";
import { z } from "zod";

const tableFormSchema = z.object({
  tableNumber: z.string().min(1, "테이블 번호는 필수입니다"),
  capacity: z.number().min(1, "수용 인원은 1명 이상이어야 합니다"),
  status: z.enum(["available", "occupied", "reserved", "maintenance"]),
  qrCode: z.string().optional(),
});

type TableFormData = z.infer<typeof tableFormSchema>;

export function TableManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['/api/tables'],
  });

  const form = useForm<TableFormData>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      tableNumber: "",
      capacity: 1,
      status: "available",
      qrCode: "",
    },
  });

  const createTableMutation = useMutation({
    mutationFn: (data: TableFormData) => apiRequest('POST', '/api/tables', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: t('common.success'),
        description: "테이블이 성공적으로 추가되었습니다.",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "테이블 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TableFormData }) =>
      apiRequest('PUT', `/api/tables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: t('common.success'),
        description: "테이블이 성공적으로 수정되었습니다.",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "테이블 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/tables/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: t('common.success'),
        description: "테이블이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "테이블 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (table?: TableType) => {
    if (table) {
      setEditingTable(table);
      form.reset({
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status as "available" | "occupied" | "reserved" | "maintenance",
        qrCode: table.qrCode || "",
      });
    } else {
      setEditingTable(null);
      form.reset({
        tableNumber: "",
        capacity: 1,
        status: "available",
        qrCode: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTable(null);
    form.reset();
  };

  const onSubmit = (data: TableFormData) => {
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: t('tables.available'), variant: "default" as const },
      occupied: { label: t('tables.occupied'), variant: "destructive" as const },
      reserved: { label: t('tables.reserved'), variant: "secondary" as const },
      maintenance: { label: t('tables.outOfService'), variant: "outline" as const },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('tables.tableSettings')}</h2>
          <p className="text-gray-600">테이블을 추가, 수정, 삭제할 수 있습니다</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          테이블 추가
        </Button>
      </div>

      {/* Tables List */}
      <Card>
        <CardHeader>
          <CardTitle>테이블 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tables.tableNumberLabel')}</TableHead>
                <TableHead>{t('tables.capacityLabel')}</TableHead>
                <TableHead>{t('tables.statusLabel')}</TableHead>
                <TableHead>{t('tables.qrCodeLabel')}</TableHead>
                <TableHead>{t('tables.createdDate')}</TableHead>
                <TableHead>{t('tables.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables && (tables as TableType[]).length > 0 ? (
                (tables as TableType[]).map((table: TableType) => {
                  const statusConfig = getStatusBadge(table.status);
                  return (
                    <TableRow key={table.id}>
                      <TableCell className="font-medium">{table.tableNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {table.capacity} {t('tables.people')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {table.qrCode ? (
                          <div className="flex items-center gap-1">
                            <QrCode className="w-4 h-4" />
                            <span className="text-xs">{table.qrCode.substring(0, 10)}...</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{t('tables.none')}</span>
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
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(table.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {t('tables.noTables')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? t('tables.editTable') : t('tables.addTable')}
            </DialogTitle>
            <DialogDescription>
              {editingTable 
                ? t('tables.editTableDesc') 
                : t('tables.addTableDesc')
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tables.tableNumberLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('tables.tableNumberPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tables.capacityLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tables.statusLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('tables.statusPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">{t('tables.available')}</SelectItem>
                        <SelectItem value="occupied">{t('tables.occupied')}</SelectItem>
                        <SelectItem value="reserved">{t('tables.reserved')}</SelectItem>
                        <SelectItem value="maintenance">{t('tables.outOfService')}</SelectItem>
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
                    <FormLabel>{t('tables.qrCodeLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('tables.qrCodePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTableMutation.isPending || updateTableMutation.isPending}
                >
                  {createTableMutation.isPending || updateTableMutation.isPending 
                    ? t('common.loading') 
                    : editingTable ? t('common.edit') : t('common.add')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}