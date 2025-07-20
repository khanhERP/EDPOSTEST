import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order, OrderItem, Product, Table as TableType } from "@shared/schema";

export function OrderManagement() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/tables'],
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "주문 상태 변경",
        description: "주문 상태가 성공적으로 변경되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "주문 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const getTableNumber = (tableId: number) => {
    const table = tables?.find((t: TableType) => t.id === tableId);
    return table?.tableNumber || "Unknown";
  };

  const getProductName = (productId: number) => {
    const product = products?.find((p: Product) => p.id === productId);
    return product?.name || "Unknown Product";
  };

  const getOrderStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "대기 중", variant: "secondary" as const, color: "bg-yellow-500" },
      confirmed: { label: "주문 확인", variant: "default" as const, color: "bg-blue-500" },
      preparing: { label: "조리 중", variant: "secondary" as const, color: "bg-orange-500" },
      ready: { label: "준비 완료", variant: "default" as const, color: "bg-green-500" },
      served: { label: "서빙 완료", variant: "outline" as const, color: "bg-purple-500" },
      paid: { label: "결제 완료", variant: "default" as const, color: "bg-emerald-500" },
      cancelled: { label: "취소", variant: "destructive" as const, color: "bg-red-500" },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "미결제", variant: "secondary" as const },
      paid: { label: "결제 완료", variant: "default" as const },
      refunded: { label: "환불", variant: "destructive" as const },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const filteredOrders = orders?.filter((order: Order) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return !["paid", "cancelled"].includes(order.status);
    return order.status === statusFilter;
  }) || [];

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: newStatus });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">주문 목록을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              주문 관리
            </CardTitle>
            <CardDescription>
              실시간 주문 현황을 확인하고 관리합니다.
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 주문</SelectItem>
              <SelectItem value="active">진행 중</SelectItem>
              <SelectItem value="pending">대기 중</SelectItem>
              <SelectItem value="confirmed">확인됨</SelectItem>
              <SelectItem value="preparing">조리 중</SelectItem>
              <SelectItem value="ready">준비 완료</SelectItem>
              <SelectItem value="served">서빙 완료</SelectItem>
              <SelectItem value="paid">결제 완료</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">해당하는 주문이 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문번호</TableHead>
                <TableHead>테이블</TableHead>
                <TableHead>고객</TableHead>
                <TableHead>주문 시간</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>주문 상태</TableHead>
                <TableHead>결제 상태</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order: Order) => {
                const statusConfig = getOrderStatusBadge(order.status);
                const paymentConfig = getPaymentStatusBadge(order.paymentStatus);
                
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusConfig.color}`}></div>
                        {getTableNumber(order.tableId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div>{order.customerName || "고객"}</div>
                          <div className="text-xs text-gray-500">{order.customerCount}명</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatTime(order.orderedAt)}</TableCell>
                    <TableCell className="font-semibold">
                      ₩{Number(order.total).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentConfig.variant}>
                        {paymentConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {order.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(order.id, "confirmed")}
                          >
                            확인
                          </Button>
                        )}
                        {order.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(order.id, "preparing")}
                          >
                            조리시작
                          </Button>
                        )}
                        {order.status === "preparing" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(order.id, "ready")}
                          >
                            완료
                          </Button>
                        )}
                        {order.status === "ready" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(order.id, "served")}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            서빙
                          </Button>
                        )}
                        {order.status === "served" && order.paymentStatus === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(order.id, "paid")}
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            결제
                          </Button>
                        )}
                        {!["paid", "cancelled"].includes(order.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusChange(order.id, "cancelled")}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        )}
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