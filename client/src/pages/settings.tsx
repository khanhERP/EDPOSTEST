import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type StoreSettings, type InsertStoreSettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, 
  Package, 
  Users, 
  CreditCard, 
  Settings as SettingsIcon,
  Home,
  MapPin,
  Phone,
  Mail,
  Save,
  Plus,
  Trash2,
  Edit,
  Search,
  Clock
} from "lucide-react";
import { EmployeeFormModal } from "@/components/employees/employee-form-modal";

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("store");
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  
  // Fetch store settings
  const { data: storeData, isLoading } = useQuery<StoreSettings>({
    queryKey: ['/api/store-settings'],
  });

  // Store settings state
  const [storeSettings, setStoreSettings] = useState({
    storeName: "EDPOS 레스토랑",
    storeCode: "STORE001",
    address: "서울시 강남구 테헤란로 123",
    phone: "02-1234-5678",
    email: "contact@edpos.com",
    taxId: "123-45-67890",
    openTime: "09:00",
    closeTime: "22:00"
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (storeData) {
      setStoreSettings({
        storeName: storeData.storeName || "EDPOS 레스토랑",
        storeCode: storeData.storeCode || "STORE001",
        address: storeData.address || "",
        phone: storeData.phone || "",
        email: storeData.email || "",
        taxId: storeData.taxId || "",
        openTime: storeData.openTime || "09:00",
        closeTime: storeData.closeTime || "22:00"
      });
    }
  }, [storeData]);

  // Mutation to update store settings
  const updateStoreSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<InsertStoreSettings>) => {
      const response = await apiRequest("PUT", "/api/store-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-settings'] });
      toast({
        title: t('common.success'),
        description: t('settings.storeUpdated'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('settings.updateError'),
        variant: "destructive",
      });
    },
  });

  // Payment methods state - Vietnamese market localized
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, name: "Tiền mặt", nameKey: "cash", type: "cash", enabled: true, icon: "💵" },
    { id: 2, name: "Thẻ tín dụng", nameKey: "creditCard", type: "card", enabled: true, icon: "💳" },
    { id: 3, name: "Thẻ ghi nợ", nameKey: "debitCard", type: "debit", enabled: true, icon: "💳" },
    { id: 4, name: "MoMo", nameKey: "momo", type: "digital", enabled: true, icon: "📱" },
    { id: 5, name: "ZaloPay", nameKey: "zalopay", type: "digital", enabled: true, icon: "📱" },
    { id: 6, name: "VNPay", nameKey: "vnpay", type: "digital", enabled: true, icon: "💳" },
    { id: 7, name: "Ngân hàng trực tuyến", nameKey: "banking", type: "banking", enabled: false, icon: "🏦" },
    { id: 8, name: "ShopeePay", nameKey: "shopeepay", type: "digital", enabled: false, icon: "🛒" },
    { id: 9, name: "GrabPay", nameKey: "grabpay", type: "digital", enabled: false, icon: "🚗" }
  ]);

  const handleStoreSettingChange = (field: string, value: string) => {
    setStoreSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveStoreSettings = () => {
    updateStoreSettingsMutation.mutate(storeSettings);
  };

  const togglePaymentMethod = (id: number) => {
    setPaymentMethods(prev => 
      prev.map(method => 
        method.id === id 
          ? { ...method, enabled: !method.enabled }
          : method
      )
    );
  };

  const addPaymentMethod = () => {
    const newMethod = {
      id: paymentMethods.length + 1,
      name: "Phương thức thanh toán mới",
      nameKey: "newPayment",
      type: "custom",
      enabled: false,
      icon: "💳"
    };
    setPaymentMethods(prev => [...prev, newMethod]);
  };

  const removePaymentMethod = (id: number) => {
    setPaymentMethods(prev => prev.filter(method => method.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #10b981 0%, transparent 50%),
                           radial-gradient(circle at 75% 25%, #059669 0%, transparent 50%),
                           radial-gradient(circle at 25% 75%, #065f46 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, #059669 0%, transparent 50%)`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      <div className="relative z-10 container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-green-600" />
                {t('settings.title')}
              </h1>
              <p className="text-gray-600">{t('settings.description')}</p>
            </div>
            <Button
              onClick={() => window.location.href = '/pos'}
              variant="outline"
              className="bg-white hover:bg-green-50 border-green-200 text-green-700 hover:text-green-800"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('settings.backToPos')}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              {t('settings.storeInfo')}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('settings.categories')}
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('settings.employees')}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {t('settings.paymentMethods')}
            </TabsTrigger>
          </TabsList>

          {/* Store Information Tab */}
          <TabsContent value="store">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-green-600" />
                    {t('settings.basicInfo')}
                  </CardTitle>
                  <CardDescription>{t('settings.basicInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">{t('settings.storeName')}</Label>
                    <Input
                      id="storeName"
                      value={storeSettings.storeName}
                      onChange={(e) => handleStoreSettingChange('storeName', e.target.value)}
                      placeholder={t('settings.storeNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeCode">{t('settings.storeCode')}</Label>
                    <Input
                      id="storeCode"
                      value={storeSettings.storeCode}
                      onChange={(e) => handleStoreSettingChange('storeCode', e.target.value)}
                      placeholder={t('settings.storeCodePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">{t('settings.taxId')}</Label>
                    <Input
                      id="taxId"
                      value={storeSettings.taxId}
                      onChange={(e) => handleStoreSettingChange('taxId', e.target.value)}
                      placeholder={t('settings.taxIdPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                    {t('settings.contactInfo')}
                  </CardTitle>
                  <CardDescription>{t('settings.contactInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">{t('settings.address')}</Label>
                    <Textarea
                      id="address"
                      value={storeSettings.address}
                      onChange={(e) => handleStoreSettingChange('address', e.target.value)}
                      placeholder={t('settings.addressPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('settings.phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={storeSettings.phone}
                      onChange={(e) => handleStoreSettingChange('phone', e.target.value)}
                      placeholder={t('settings.phonePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={storeSettings.email}
                      onChange={(e) => handleStoreSettingChange('email', e.target.value)}
                      placeholder={t('settings.emailPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-green-600" />
                    {t('settings.operationHours')}
                  </CardTitle>
                  <CardDescription>{t('settings.operationHoursDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="openTime">{t('settings.openTime')}</Label>
                      <Input
                        id="openTime"
                        type="time"
                        value={storeSettings.openTime}
                        onChange={(e) => handleStoreSettingChange('openTime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closeTime">{t('settings.closeTime')}</Label>
                      <Input
                        id="closeTime"
                        type="time"
                        value={storeSettings.closeTime}
                        onChange={(e) => handleStoreSettingChange('closeTime', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  onClick={saveStoreSettings}
                  disabled={updateStoreSettingsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateStoreSettingsMutation.isPending ? t('common.loading') : t('common.save')}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  {t('settings.categoryManagement')}
                </CardTitle>
                <CardDescription>{t('settings.categoryManagementDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">{t('settings.categoriesRedirect')}</p>
                  <Button 
                    onClick={() => window.location.href = '/inventory'}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {t('settings.goToInventory')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <div className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    {t('settings.employeeManagement')}
                  </CardTitle>
                  <CardDescription>{t('settings.employeeManagementDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Input
                        placeholder="직원 검색..."
                        className="w-64"
                      />
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        검색
                      </Button>
                    </div>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowAddEmployeeModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      직원 추가
                    </Button>
                  </div>

                  <div className="rounded-md border">
                    <div className="grid grid-cols-6 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                      <div>직원 ID</div>
                      <div>이름</div>
                      <div>역할</div>
                      <div>전화번호</div>
                      <div>상태</div>
                      <div className="text-center">작업</div>
                    </div>
                    
                    <div className="divide-y">
                      {/* Employee rows will be populated here */}
                      <div className="grid grid-cols-6 gap-4 p-4 items-center">
                        <div className="font-mono text-sm">EMP001</div>
                        <div className="font-medium">김직원</div>
                        <div>
                          <Badge variant="secondary">매니저</Badge>
                        </div>
                        <div className="text-sm text-gray-600">010-1234-5678</div>
                        <div>
                          <Badge variant="default" className="bg-green-100 text-green-800">활성</Badge>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-4 p-4 items-center">
                        <div className="font-mono text-sm">EMP002</div>
                        <div className="font-medium">이서버</div>
                        <div>
                          <Badge variant="secondary">서버</Badge>
                        </div>
                        <div className="text-sm text-gray-600">010-2345-6789</div>
                        <div>
                          <Badge variant="default" className="bg-green-100 text-green-800">활성</Badge>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-4 p-4 items-center">
                        <div className="font-mono text-sm">EMP003</div>
                        <div className="font-medium">박주방</div>
                        <div>
                          <Badge variant="secondary">주방장</Badge>
                        </div>
                        <div className="text-sm text-gray-600">010-3456-7890</div>
                        <div>
                          <Badge variant="outline" className="text-gray-600">휴가</Badge>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                      총 3명의 직원이 등록되어 있습니다.
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        직원 관리로 이동
                      </Button>
                      <Button variant="outline" size="sm">
                        <Clock className="w-4 h-4 mr-2" />
                        근태 관리
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payments">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  {t('settings.paymentMethods')}
                </CardTitle>
                <CardDescription>{t('settings.paymentMethodsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">{t('settings.availablePayments')}</h3>
                    <Button 
                      onClick={addPaymentMethod}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('settings.addPayment')}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          method.enabled
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{method.icon}</span>
                            <span className="font-medium">
                              {method.nameKey ? t(`settings.payments.${method.nameKey}`) : method.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={method.enabled}
                              onCheckedChange={() => togglePaymentMethod(method.id)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removePaymentMethod(method.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <Badge variant={method.enabled ? "default" : "secondary"}>
                          {method.enabled ? t('settings.enabled') : t('settings.disabled')}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Employee Add Modal */}
      <EmployeeFormModal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        mode="create"
      />
    </div>
  );
}