import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Customer } from "@shared/schema";
import { 
  CreditCard, 
  Plus, 
  Minus, 
  History, 
  Search,
  Calculator,
  Gift,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  X,
  Save
} from "lucide-react";

interface PointsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PointTransaction {
  id: number;
  customerId: number;
  points: number;
  type: 'earned' | 'redeemed' | 'adjusted' | 'expired';
  description: string;
  createdAt: string;
}

export function PointsManagementModal({ isOpen, onClose }: PointsManagementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for point operations
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [operationType, setOperationType] = useState<'add' | 'subtract' | 'set'>('add');
  const [activeTab, setActiveTab] = useState('management');

  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: isOpen,
  });

  // Fetch point transactions history
  const { data: pointTransactions, isLoading: transactionsLoading } = useQuery<PointTransaction[]>({
    queryKey: ['/api/point-transactions'],
    enabled: isOpen && activeTab === 'history',
  });

  // Point adjustment mutation
  const adjustPointsMutation = useMutation({
    mutationFn: async ({ customerId, points, type, description }: { 
      customerId: number; 
      points: number; 
      type: string; 
      description: string 
    }) => {
      const response = await apiRequest('POST', '/api/customers/adjust-points', {
        customerId,
        points,
        type,
        description
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/point-transactions'] });
      toast({
        title: '포인트 조정 완료',
        description: '포인트가 성공적으로 조정되었습니다.',
      });
      setPointsAmount('');
      setAdjustmentReason('');
      setSelectedCustomer(null);
    },
    onError: () => {
      toast({
        title: '오류',
        description: '포인트 조정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // Point payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async ({ customerId, points }: { customerId: number; points: number }) => {
      const response = await apiRequest('POST', '/api/customers/redeem-points', {
        customerId,
        points
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/point-transactions'] });
      toast({
        title: '포인트 사용 완료',
        description: '포인트가 성공적으로 사용되었습니다.',
      });
      setPointsAmount('');
      setSelectedCustomer(null);
    },
    onError: () => {
      toast({
        title: '오류',
        description: '포인트 사용 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handlePointsAdjustment = () => {
    if (!selectedCustomer || !pointsAmount || !adjustmentReason) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const points = parseInt(pointsAmount);
    const currentPoints = selectedCustomer.points || 0;
    
    let finalPoints = points;
    let type = 'adjusted';
    
    if (operationType === 'add') {
      finalPoints = points;
      type = 'earned';
    } else if (operationType === 'subtract') {
      finalPoints = -points;
      type = 'redeemed';
    } else if (operationType === 'set') {
      finalPoints = points - currentPoints;
      type = 'adjusted';
    }

    adjustPointsMutation.mutate({
      customerId: selectedCustomer.id,
      points: finalPoints,
      type,
      description: adjustmentReason
    });
  };

  const handlePointsPayment = () => {
    if (!selectedCustomer || !pointsAmount) {
      toast({
        title: '입력 오류',
        description: '고객과 포인트를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const points = parseInt(pointsAmount);
    const currentPoints = selectedCustomer.points || 0;
    
    if (points > currentPoints) {
      toast({
        title: '포인트 부족',
        description: '사용 가능한 포인트가 부족합니다.',
        variant: 'destructive',
      });
      return;
    }

    processPaymentMutation.mutate({
      customerId: selectedCustomer.id,
      points
    });
  };

  const filteredCustomers = customers?.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return customer.name?.toLowerCase().includes(searchLower) ||
           customer.customerId?.toLowerCase().includes(searchLower) ||
           customer.phone?.toLowerCase().includes(searchLower);
  }) || [];

  const totalPoints = customers?.reduce((sum, customer) => sum + (customer.points || 0), 0) || 0;
  const avgPoints = customers?.length ? Math.round(totalPoints / customers.length) : 0;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            포인트 관리
          </DialogTitle>
          <DialogDescription>
            고객 포인트를 관리하고 사용 내역을 확인하세요
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="management">포인트 조정</TabsTrigger>
            <TabsTrigger value="payment">포인트 결제</TabsTrigger>
            <TabsTrigger value="history">사용 내역</TabsTrigger>
          </TabsList>

          {/* Points Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">총 포인트</p>
                    <p className="text-2xl font-bold text-blue-600">{totalPoints.toLocaleString()}P</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">평균 포인트</p>
                    <p className="text-2xl font-bold text-green-600">{avgPoints.toLocaleString()}P</p>
                  </div>
                  <Calculator className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">보유 고객</p>
                    <p className="text-2xl font-bold text-purple-600">{customers?.length || 0}명</p>
                  </div>
                  <Gift className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <TabsContent value="management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  포인트 편집 및 조정
                </CardTitle>
                <CardDescription>고객의 포인트를 추가, 차감 또는 설정할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Selection */}
                  <div className="space-y-4">
                    <Label>고객 선택</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="고객명, ID, 전화번호로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="max-h-64 overflow-y-auto border rounded-md">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                              selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-gray-500">{customer.customerId}</p>
                              </div>
                              <Badge variant="outline">
                                {(customer.points || 0).toLocaleString()}P
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Point Adjustment */}
                  <div className="space-y-4">
                    <Label>포인트 조정</Label>
                    {selectedCustomer && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="font-medium">{selectedCustomer.name}</p>
                        <p className="text-sm text-gray-600">현재 포인트: {(selectedCustomer.points || 0).toLocaleString()}P</p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <Label>조정 유형</Label>
                        <Select value={operationType} onValueChange={(value: 'add' | 'subtract' | 'set') => setOperationType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add">포인트 추가</SelectItem>
                            <SelectItem value="subtract">포인트 차감</SelectItem>
                            <SelectItem value="set">포인트 설정</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>
                          {operationType === 'add' ? '추가할 포인트' : 
                           operationType === 'subtract' ? '차감할 포인트' : 
                           '설정할 포인트'}
                        </Label>
                        <Input
                          type="number"
                          placeholder="포인트 입력"
                          value={pointsAmount}
                          onChange={(e) => setPointsAmount(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>조정 사유</Label>
                        <Textarea
                          placeholder="포인트 조정 사유를 입력하세요"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                        />
                      </div>

                      <Button 
                        onClick={handlePointsAdjustment}
                        className="w-full"
                        disabled={!selectedCustomer || !pointsAmount || !adjustmentReason || adjustPointsMutation.isPending}
                      >
                        {adjustPointsMutation.isPending ? '처리 중...' : 
                         operationType === 'add' ? <Plus className="w-4 h-4 mr-2" /> : 
                         operationType === 'subtract' ? <Minus className="w-4 h-4 mr-2" /> : 
                         <Calculator className="w-4 h-4 mr-2" />}
                        {operationType === 'add' ? '포인트 추가' : 
                         operationType === 'subtract' ? '포인트 차감' : 
                         '포인트 설정'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  포인트 결제
                </CardTitle>
                <CardDescription>고객의 포인트를 사용하여 결제를 처리합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Selection for Payment */}
                  <div className="space-y-4">
                    <Label>결제 고객 선택</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="고객명, ID, 전화번호로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="max-h-64 overflow-y-auto border rounded-md">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                              selectedCustomer?.id === customer.id ? 'bg-green-50 border-green-200' : ''
                            }`}
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-gray-500">{customer.customerId}</p>
                              </div>
                              <Badge variant="outline" className={
                                (customer.points || 0) >= 1000 ? 'bg-green-100 text-green-800' : 
                                (customer.points || 0) >= 500 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'
                              }>
                                {(customer.points || 0).toLocaleString()}P
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment Processing */}
                  <div className="space-y-4">
                    <Label>포인트 결제</Label>
                    {selectedCustomer && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="font-medium">{selectedCustomer.name}</p>
                        <p className="text-sm text-gray-600">사용 가능 포인트: {(selectedCustomer.points || 0).toLocaleString()}P</p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <Label>사용할 포인트</Label>
                        <Input
                          type="number"
                          placeholder="사용할 포인트 입력"
                          value={pointsAmount}
                          onChange={(e) => setPointsAmount(e.target.value)}
                        />
                        {selectedCustomer && pointsAmount && parseInt(pointsAmount) > (selectedCustomer.points || 0) && (
                          <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-4 h-4" />
                            포인트가 부족합니다
                          </p>
                        )}
                      </div>

                      {pointsAmount && selectedCustomer && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span>결제 후 남은 포인트:</span>
                            <span className="font-medium">
                              {Math.max(0, (selectedCustomer.points || 0) - parseInt(pointsAmount || '0')).toLocaleString()}P
                            </span>
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={handlePointsPayment}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={!selectedCustomer || !pointsAmount || parseInt(pointsAmount || '0') > (selectedCustomer?.points || 0) || processPaymentMutation.isPending}
                      >
                        {processPaymentMutation.isPending ? '처리 중...' : 
                         <>
                           <CreditCard className="w-4 h-4 mr-2" />
                           포인트 결제 처리
                         </>}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-600" />
                  포인트 사용 내역
                </CardTitle>
                <CardDescription>모든 포인트 거래 내역을 확인할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">내역을 불러오는 중...</p>
                  </div>
                ) : !pointTransactions || pointTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">포인트 사용 내역이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pointTransactions.map((transaction) => {
                      const customer = customers?.find(c => c.id === transaction.customerId);
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.type === 'earned' ? 'bg-green-100' :
                              transaction.type === 'redeemed' ? 'bg-red-100' :
                              transaction.type === 'adjusted' ? 'bg-blue-100' :
                              'bg-gray-100'
                            }`}>
                              {transaction.type === 'earned' ? <TrendingUp className="w-5 h-5 text-green-600" /> :
                               transaction.type === 'redeemed' ? <TrendingDown className="w-5 h-5 text-red-600" /> :
                               transaction.type === 'adjusted' ? <Calculator className="w-5 h-5 text-blue-600" /> :
                               <AlertCircle className="w-5 h-5 text-gray-600" />}
                            </div>
                            <div>
                              <p className="font-medium">{customer?.name || '알 수 없음'}</p>
                              <p className="text-sm text-gray-600">{transaction.description}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(transaction.createdAt).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${
                              transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString()}P
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {transaction.type === 'earned' ? '적립' :
                               transaction.type === 'redeemed' ? '사용' :
                               transaction.type === 'adjusted' ? '조정' :
                               '만료'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}