import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type StoreSettings, type InsertStoreSettings, type Product, type Category } from "@shared/schema";
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
  UserCheck,
  Search
} from "lucide-react";

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("store");
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // Store Settings
  const [storeSettings, setStoreSettings] = useState<InsertStoreSettings>({
    storeName: "EDPOS 레스토랑",
    storeCode: "",
    taxId: "",
    address: "",
    phone: "",
    email: "",
    openTime: "09:00",
    closeTime: "22:00"
  });

  // Fetch store settings
  const { data: storeSettingsData, isLoading: isLoadingStoreSettings } = useQuery<StoreSettings>({
    queryKey: ['/api/store-settings'],
    enabled: true
  });

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: true
  });

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: true
  });

  // Update store settings mutation
  const updateStoreSettingsMutation = useMutation({
    mutationFn: async (data: InsertStoreSettings) => {
      return await apiRequest("PUT", "/api/store-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-settings'] });
      toast({
        title: '성공',
        description: '매장 정보가 성공적으로 저장되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '매장 정보 저장에 실패했습니다.',
        variant: "destructive",
      });
    }
  });

  // Filter products for management
  const filteredProductsForManagement = products.filter(product =>
    productSearchTerm === "" || 
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const handleStoreSettingChange = (field: keyof InsertStoreSettings, value: string) => {
    setStoreSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveStoreSettings = async () => {
    await updateStoreSettingsMutation.mutateAsync(storeSettings);
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm("정말로 이 상품을 삭제하시겠습니까?")) {
      try {
        await apiRequest("DELETE", `/api/products/${id}`);
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        toast({
          title: '성공',
          description: '상품이 성공적으로 삭제되었습니다.',
        });
      } catch (error) {
        toast({
          title: '오류',
          description: '상품 삭제에 실패했습니다.',
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("정말로 이 카테고리를 삭제하시겠습니까?")) {
      try {
        await apiRequest("DELETE", `/api/categories/${id}`);
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        toast({
          title: '성공',
          description: '카테고리가 성공적으로 삭제되었습니다.',
        });
      } catch (error) {
        toast({
          title: '오류',
          description: '카테고리 삭제에 실패했습니다.',
          variant: "destructive",
        });
      }
    }
  };

  if (isLoadingStoreSettings || isLoadingCategories || isLoadingProducts) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
          }}
        ></div>
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
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('settings.categories')}
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('settings.employees')}
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              고객 관리
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
                  <CardDescription>{t('settings.basicInfoDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">{t('settings.storeName')}</Label>
                    <Input
                      id="storeName"
                      value={storeSettings.storeName}
                      onChange={(e) => handleStoreSettingChange('storeName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeCode">{t('settings.storeCode')}</Label>
                    <Input
                      id="storeCode"
                      value={storeSettings.storeCode || ""}
                      onChange={(e) => handleStoreSettingChange('storeCode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">{t('settings.taxId')}</Label>
                    <Input
                      id="taxId"
                      value={storeSettings.taxId || ""}
                      onChange={(e) => handleStoreSettingChange('taxId', e.target.value)}
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
                  <CardDescription>{t('settings.contactInfoDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">{t('settings.address')}</Label>
                    <Input
                      id="address"
                      value={storeSettings.address || ""}
                      onChange={(e) => handleStoreSettingChange('address', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('settings.phone')}</Label>
                    <Input
                      id="phone"
                      value={storeSettings.phone || ""}
                      onChange={(e) => handleStoreSettingChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={storeSettings.email || ""}
                      onChange={(e) => handleStoreSettingChange('email', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="openTime">{t('settings.openTime')}</Label>
                      <Input
                        id="openTime"
                        type="time"
                        value={storeSettings.openTime || "09:00"}
                        onChange={(e) => handleStoreSettingChange('openTime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closeTime">{t('settings.closeTime')}</Label>
                      <Input
                        id="closeTime"
                        type="time"
                        value={storeSettings.closeTime || "22:00"}
                        onChange={(e) => handleStoreSettingChange('closeTime', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 flex justify-end">
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
            <div className="space-y-6">
              {/* Product Management Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    품목 관리
                  </CardTitle>
                  <CardDescription>상품을 추가, 편집, 삭제할 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Input
                        placeholder="상품 검색..."
                        className="w-64"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                      />
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        검색
                      </Button>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      상품 추가
                    </Button>
                  </div>

                  <div className="rounded-md border">
                    <div className="grid grid-cols-8 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                      <div>이미지</div>
                      <div>상품명</div>
                      <div>SKU</div>
                      <div>카테고리</div>
                      <div>가격</div>
                      <div>재고</div>
                      <div>상태</div>
                      <div className="text-center">작업</div>
                    </div>

                    <div className="divide-y max-h-96 overflow-y-auto">
                      {filteredProductsForManagement.length > 0 ? (
                        filteredProductsForManagement.map((product) => {
                          const category = categories.find(c => c.id === product.categoryId);
                          return (
                            <div key={product.id} className="grid grid-cols-8 gap-4 p-4 items-center">
                              <div>
                                {product.imageUrl ? (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                    <Package className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-600">{product.sku}</div>
                              <div>
                                <Badge variant="outline" className="text-xs">
                                  {category?.name || '미분류'}
                                </Badge>
                              </div>
                              <div className="font-medium">₩{parseInt(product.price).toLocaleString()}</div>
                              <div>
                                <Badge 
                                  variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                                  className="text-xs"
                                >
                                  {product.stock}개
                                </Badge>
                              </div>
                              <div>
                                <Badge 
                                  variant={product.isActive ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {product.isActive ? '활성' : '비활성'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">등록된 상품이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                      총 {filteredProductsForManagement.length}개의 상품이 등록되어 있습니다.
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = '/inventory'}
                      >
                        <Package className="w-4 h-4 mr-2" />
                        재고 관리로 이동
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Management Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    카테고리 관리
                  </CardTitle>
                  <CardDescription>상품 카테고리를 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-sm text-gray-600">
                      상품을 효율적으로 분류하기 위한 카테고리를 관리하세요.
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      카테고리 추가
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => {
                      const productCount = products.filter(p => p.categoryId === category.id).length;
                      return (
                        <div
                          key={category.id}
                          className="p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-medium text-gray-900">{category.name}</h3>
                              <p className="text-sm text-gray-600">{productCount}개 상품</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-100"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center mt-6 text-sm text-gray-600">
                    총 {categories.length}개의 카테고리가 등록되어 있습니다.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  직원 관리
                </CardTitle>
                <CardDescription>직원 정보를 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">직원 관리 기능은 개발 중입니다.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  고객 관리
                </CardTitle>
                <CardDescription>고객 정보를 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">고객 관리 기능은 개발 중입니다.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  {t('settings.paymentMethods')}
                </CardTitle>
                <CardDescription>결제 방법을 설정합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">결제 설정 기능은 개발 중입니다.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}