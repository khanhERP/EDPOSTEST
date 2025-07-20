import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderDialog } from "@/components/orders/order-dialog";
import { Users, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Table, Order } from "@shared/schema";

interface TableGridProps {
  onTableSelect?: (tableId: number | null) => void;
  selectedTableId?: number | null;
}

export function TableGrid({ onTableSelect, selectedTableId }: TableGridProps) {
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['/api/tables'],
  });

  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ tableId, status }: { tableId: number; status: string }) =>
      apiRequest(`/api/tables/${tableId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "테이블 상태 변경",
        description: "테이블 상태가 성공적으로 변경되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "테이블 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const getTableStatus = (status: string) => {
    const statusConfig = {
      available: { label: "이용 가능", variant: "default" as const, color: "bg-green-500" },
      occupied: { label: "사용 중", variant: "destructive" as const, color: "bg-red-500" },
      reserved: { label: "예약됨", variant: "secondary" as const, color: "bg-yellow-500" },
      maintenance: { label: "정비 중", variant: "outline" as const, color: "bg-gray-500" },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  };

  const getActiveOrder = (tableId: number) => {
    if (!orders) return null;
    return orders.find((order: Order) => 
      order.tableId === tableId && !["paid", "cancelled"].includes(order.status)
    );
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    onTableSelect?.(table.id);
    
    if (table.status === "available") {
      setOrderDialogOpen(true);
    }
  };

  const handleStatusChange = (tableId: number, newStatus: string) => {
    updateTableStatusMutation.mutate({ tableId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-32"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables?.map((table: Table) => {
          const statusConfig = getTableStatus(table.status);
          const activeOrder = getActiveOrder(table.id);
          const isSelected = selectedTableId === table.id;

          return (
            <Card 
              key={table.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected ? "ring-2 ring-blue-500" : ""
              } ${table.status === "occupied" ? "bg-red-50" : "bg-white"}`}
              onClick={() => handleTableClick(table)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                  {/* Table Number */}
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full ${statusConfig.color} flex items-center justify-center text-white font-bold text-lg`}>
                      {table.tableNumber}
                    </div>
                    {activeOrder && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
                    )}
                  </div>

                  {/* Table Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-center text-sm text-gray-600">
                      <Users className="w-3 h-3 mr-1" />
                      {table.capacity}명
                    </div>
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Order Info */}
                  {activeOrder && (
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center justify-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(activeOrder.orderedAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="font-medium">
                        ₩{Number(activeOrder.total).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {table.status === "occupied" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(table.id, "available");
                      }}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      정리완료
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Dialog */}
      <OrderDialog 
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        table={selectedTable}
      />
    </>
  );
}