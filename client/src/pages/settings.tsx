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
import { type StoreSettings, type InsertStoreSettings, type Customer } from "@shared/schema";
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
  Clock,
  UserCheck
} from "lucide-react";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { MembershipModal } from "@/components/membership/membership-modal";
import { EmployeeFormModal } from "@/components/employees/employee-form-modal";

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("store");
  
  // Customer management state
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  
  // Employee management state
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  
  // Fetch store settings
  const { data: storeData, isLoading } = useQuery<StoreSettings>({
    queryKey: ['/api/store-settings'],
  });

  // Fetch customers
  const { data: customersData, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch employees
  const { data: employeesData, isLoading: employeesLoading } = useQuery<any[]>({
    queryKey: ['/api/employees'],
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

  // Customer management functions
  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleDeleteCustomer = (customerId: number) => {
    if (confirm('정말로 이 고객을 삭제하시겠습니까?')) {
      fetch(`/api/customers/${customerId}`, { method: 'DELETE' })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
          toast({
            title: '성공',
            description: '고객이 삭제되었습니다.',
          });
        })
        .catch(() => {
          toast({
            title: '오류',
            description: '고객 삭제에 실패했습니다.',
            variant: 'destructive',
          });
        });
    }
  };

  const handleAddPoints = (customer: Customer) => {
    const points = prompt('추가할 포인트를 입력하세요:');
    if (points && !isNaN(Number(points))) {
      fetch(`/api/customers/${customer.id}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0, points: Number(points) })
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
          toast({
            title: '성공',
            description: '포인트가 추가되었습니다.',
          });
        })
        .catch(() => {
          toast({
            title: '오류',
            description: '포인트 추가에 실패했습니다.',
            variant: 'destructive',
          });
        });
    }
  };

  const handleCloseCustomerForm = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  // Filter customers based on search term
  const filteredCustomers = customersData ? customersData.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.customerId.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(customerSearchTerm))
  ) : [];

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
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              {t('settings.storeInfo')}
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {t('customers.title')}
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

          {/* Customers Tab */}
          <TabsContent value="customers">
            <div className="space-y-6">
              {/* Customer Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{t('customers.totalCustomers')}</p>
                        <p className="text-2xl font-bold text-green-600">{customersData ? customersData.length : 0}</p>
                      </div>
                      <UserCheck className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{t('customers.activeCustomers')}</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {customersData ? customersData.filter(c => c.status === 'active').length : 0}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{t('customers.pointsIssued')}</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {customersData ? customersData.reduce((total, c) => total + (c.points || 0), 0).toLocaleString() : 0}
                        </p>
                      </div>
                      <CreditCard className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{t('customers.averageSpent')}</p>
                        <p className="text-2xl font-bold text-orange-600">
                          ₩{customersData && customersData.length > 0 
                            ? Math.round(customersData.reduce((total, c) => total + parseFloat(c.totalSpent || '0'), 0) / customersData.length).toLocaleString()
                            : '0'}
                        </p>
                      </div>
                      <CreditCard className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Management */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    {t('customers.customerManagement')}
                  </CardTitle>
                  <CardDescription>{t('customers.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Input
                        placeholder={t('customers.searchPlaceholder')}
                        className="w-64"
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      />
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        {t('common.search')}
                      </Button>
                    </div>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowCustomerForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('customers.addCustomer')}
                    </Button>
                  </div>

                  {customersLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">고객 데이터를 불러오는 중...</p>
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">등록된 고객이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-8 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                        <div>{t('customers.customerId')}</div>
                        <div>{t('customers.name')}</div>
                        <div>{t('customers.phone')}</div>
                        <div>{t('customers.visitCount')}</div>
                        <div>{t('customers.totalSpent')}</div>
                        <div>{t('customers.points')}</div>
                        <div>{t('customers.membershipLevel')}</div>
                        <div className="text-center">{t('common.actions')}</div>
                      </div>
                      
                      <div className="divide-y">
                        {filteredCustomers.map((customer) => (
                          <div key={customer.id} className="grid grid-cols-8 gap-4 p-4 items-center">
                            <div className="font-mono text-sm">{customer.customerId}</div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-600">{customer.phone || '-'}</div>
                            <div className="text-center">{customer.visitCount || 0}</div>
                            <div className="text-sm font-medium">₩{parseFloat(customer.totalSpent || '0').toLocaleString()}</div>
                            <div className="text-center font-medium text-purple-600">{customer.points || 0}</div>
                            <div>
                              <Badge 
                                variant="default" 
                                className={`${
                                  customer.membershipLevel === 'VIP' ? 'bg-purple-500' :
                                  customer.membershipLevel === 'GOLD' ? 'bg-yellow-500' :
                                  customer.membershipLevel === 'SILVER' ? 'bg-gray-300 text-black' :
                                  'bg-gray-400'
                                } text-white`}
                              >
                                {customer.membershipLevel === 'VIP' ? 'VIP' :
                                 customer.membershipLevel === 'GOLD' ? '골드' :
                                 customer.membershipLevel === 'SILVER' ? '실버' :
                                 customer.membershipLevel}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditCustomer(customer)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-blue-500 hover:text-blue-700"
                                onClick={() => handleAddPoints(customer)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteCustomer(customer.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                      총 {customersData ? customersData.length : 0}명의 고객이 등록되어 있습니다.
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowMembershipModal(true)}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        멤버십 관리
                      </Button>
                      <Button variant="outline" size="sm">
                        <CreditCard className="w-4 h-4 mr-2" />
                        포인트 관리
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                        placeholder={t('employees.searchPlaceholder')}
                        className="w-64"
                      />
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        {t('common.search')}
                      </Button>
                    </div>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowEmployeeForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('employees.addEmployee')}
                    </Button>
                  </div>

                  {employeesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">직원 데이터를 불러오는 중...</p>
                    </div>
                  ) : !employeesData || employeesData.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">등록된 직원이 없습니다.</p>
                      <p className="text-sm text-gray-400 mt-2">직원 추가 버튼을 클릭하여 새 직원을 등록하세요.</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-6 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                        <div>{t('employees.employeeId')}</div>
                        <div>{t('employees.name')}</div>
                        <div>{t('employees.role')}</div>
                        <div>{t('employees.phone')}</div>
                        <div>{t('employees.status')}</div>
                        <div className="text-center">{t('common.actions')}</div>
                      </div>
                      
                      <div className="divide-y">
                        {employeesData.map((employee: any) => (
                          <div key={employee.id} className="grid grid-cols-6 gap-4 p-4 items-center">
                            <div className="font-mono text-sm">{employee.employeeId}</div>
                            <div className="font-medium">{employee.name}</div>
                            <div>
                              <Badge variant={employee.role === 'admin' ? 'destructive' : employee.role === 'manager' ? 'default' : 'secondary'}>
                                {employee.role === 'admin' ? '관리자' : 
                                 employee.role === 'manager' ? '매니저' : 
                                 employee.role === 'cashier' ? '캐셔' : employee.role}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">{employee.phone || '-'}</div>
                            <div>
                              <Badge variant={employee.isActive ? "default" : "secondary"} className={employee.isActive ? "bg-green-100 text-green-800" : ""}>
                                {employee.isActive ? "활성" : "비활성"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingEmployee(employee);
                                  setShowEmployeeForm(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700"
                                onClick={() => {
                                  if (confirm(`정말로 ${employee.name} 직원을 삭제하시겠습니까?`)) {
                                    fetch(`/api/employees/${employee.id}`, { method: 'DELETE' })
                                      .then(() => {
                                        queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
                                        toast({
                                          title: '성공',
                                          description: '직원이 삭제되었습니다.',
                                        });
                                      })
                                      .catch(() => {
                                        toast({
                                          title: '오류',
                                          description: '직원 삭제에 실패했습니다.',
                                          variant: 'destructive',
                                        });
                                      });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                      총 {employeesData ? employeesData.length : 0}명의 직원이 등록되어 있습니다.
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        {t('settings.goToEmployees')}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Clock className="w-4 h-4 mr-2" />
                        {t('attendance.title')}
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

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={showCustomerForm}
        onClose={handleCloseCustomerForm}
        customer={editingCustomer}
      />

      {/* Membership Management Modal */}
      <MembershipModal
        isOpen={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
      />

      {/* Employee Form Modal */}
      <EmployeeFormModal
        isOpen={showEmployeeForm}
        onClose={() => {
          setShowEmployeeForm(false);
          setEditingEmployee(null);
        }}
        mode={editingEmployee ? "edit" : "create"}
        employee={editingEmployee}
      />
    </div>
  );
}