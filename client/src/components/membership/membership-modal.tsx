import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Customer } from "@shared/schema";
import { 
  Crown, 
  Medal, 
  Award, 
  Users, 
  TrendingUp, 
  Gift,
  Star,
  Search,
  Save,
  X
} from "lucide-react";

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const membershipTiers = [
  {
    level: 'SILVER',
    name: 'Bạc',
    icon: Medal,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    benefits: ['Tích điểm cơ bản', 'Giảm giá sinh nhật 5%'],
    minSpent: 0,
    description: 'Cấp độ cơ bản cho khách hàng mới'
  },
  {
    level: 'GOLD',
    name: 'Vàng',
    icon: Award,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    benefits: ['Tích điểm x1.5', 'Giảm giá sinh nhật 10%', 'Đồ uống miễn phí 1 lần/tháng'],
    minSpent: 300000,
    description: 'Cấp độ cao cấp cho khách hàng thân thiết'
  },
  {
    level: 'VIP',
    name: 'VIP',
    icon: Crown,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    benefits: ['Tích điểm x2', 'Giảm giá sinh nhật 20%', 'Đồ uống miễn phí 2 lần/tháng', 'Sử dụng phòng VIP'],
    minSpent: 1000000,
    description: 'Cấp độ cao nhất cho khách hàng VIP'
  }
];

export function MembershipModal({ isOpen, onClose }: MembershipModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch customers
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: isOpen,
  });

  // Update customer membership
  const updateMembershipMutation = useMutation({
    mutationFn: async ({ customerId, membershipLevel }: { customerId: number; membershipLevel: string }) => {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ membershipLevel }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: '성공',
        description: '멤버십 등급이 업데이트되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '멤버십 등급 업데이트에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleUpdateMembership = (customerId: number, newLevel: string) => {
    updateMembershipMutation.mutate({ customerId, membershipLevel: newLevel });
  };

  const autoUpgradeBasedOnSpending = (customerId: number, totalSpent: number) => {
    let newLevel = 'SILVER';
    if (totalSpent >= 1000000) newLevel = 'VIP';
    else if (totalSpent >= 300000) newLevel = 'GOLD';
    
    handleUpdateMembership(customerId, newLevel);
  };

  const filteredCustomers = customers?.filter(customer => {
    const matchesSearch = customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.customerId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = !selectedTier || selectedTier === 'all' || customer.membershipLevel?.toLowerCase().includes(selectedTier.toLowerCase());
    return matchesSearch && matchesTier;
  }) || [];

  const membershipStats = customers?.reduce((acc, customer) => {
    const level = customer.membershipLevel || 'SILVER';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-purple-600" />
            멤버십 관리
          </DialogTitle>
          <DialogDescription>
            고객 멤버십 등급을 관리하고 혜택을 제공하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Membership Tiers Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              멤버십 등급 안내
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {membershipTiers.map((tier) => {
                const IconComponent = tier.icon;
                const count = membershipStats[tier.level] || 0;
                
                return (
                  <Card key={tier.level} className={`border-2 ${tier.color.includes('gray') ? 'border-gray-200' : tier.color.includes('yellow') ? 'border-yellow-200' : 'border-purple-200'}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <IconComponent className="w-5 h-5" />
                        {tier.name}
                        <Badge variant="outline" className="ml-auto">
                          {count}명
                        </Badge>
                      </CardTitle>
                      <CardDescription>{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">최소 구매금액: ₩{tier.minSpent.toLocaleString()}</div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">혜택:</div>
                          {tier.benefits.map((benefit, index) => (
                            <div key={index} className="text-xs text-gray-600 flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              {benefit}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Customer Management */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                고객 멤버십 관리
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    customers?.forEach(customer => {
                      const totalSpent = parseFloat(customer.totalSpent || '0');
                      autoUpgradeBasedOnSpending(customer.id, totalSpent);
                    });
                  }}
                  variant="outline"
                  size="sm"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  자동 등급 조정
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="고객명 또는 고객ID로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="등급별 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="silver">실버</SelectItem>
                  <SelectItem value="gold">골드</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer List */}
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <div className="grid grid-cols-7 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                  <div>고객ID</div>
                  <div>고객명</div>
                  <div>현재 등급</div>
                  <div>총 구매금액</div>
                  <div>방문횟수</div>
                  <div>포인트</div>
                  <div className="text-center">액션</div>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {filteredCustomers.map((customer) => {
                    const currentTier = membershipTiers.find(t => t.level === (customer.membershipLevel || 'SILVER'));
                    const totalSpent = parseFloat(customer.totalSpent || '0');
                    const suggestedTier = totalSpent >= 1000000 ? 'VIP' : totalSpent >= 300000 ? 'GOLD' : 'SILVER';
                    const needsUpgrade = suggestedTier !== (customer.membershipLevel || 'SILVER');
                    
                    return (
                      <div key={customer.id} className="grid grid-cols-7 gap-4 p-4 items-center">
                        <div className="font-mono text-sm">{customer.customerId || ''}</div>
                        <div className="font-medium">{customer.name}</div>
                        <div>
                          <Badge className={currentTier?.color || 'bg-gray-100 text-gray-800'}>
                            {currentTier?.name || customer.membershipLevel}
                          </Badge>
                          {needsUpgrade && (
                            <Badge variant="outline" className="ml-1 text-orange-600">
                              승급 가능
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm">{totalSpent.toLocaleString()} ₫</div>
                        <div className="text-sm">{customer.visitCount || 0}회</div>
                        <div className="text-sm">{customer.points || 0}P</div>
                        <div className="flex items-center justify-center gap-2">
                          <Select
                            value={customer.membershipLevel || 'SILVER'}
                            onValueChange={(newLevel) => handleUpdateMembership(customer.id, newLevel)}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SILVER">실버</SelectItem>
                              <SelectItem value="GOLD">골드</SelectItem>
                              <SelectItem value="VIP">VIP</SelectItem>
                            </SelectContent>
                          </Select>
                          {needsUpgrade && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => autoUpgradeBasedOnSpending(customer.id, totalSpent)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <TrendingUp className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}