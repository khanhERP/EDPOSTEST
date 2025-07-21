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
  Clock,
  UserCheck
} from "lucide-react";
import { EmployeeFormModal } from "@/components/employees/employee-form-modal";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product, Category } from "@shared/schema";

// Form schemas
const productFormSchema = z.object({
  name: z.string().min(1, "상품명은 필수입니다"),
  sku: z.string().min(1, "SKU는 필수입니다"),
  price: z.string().min(1, "가격은 필수입니다"),
  stock: z.number().min(0, "재고는 0 이상이어야 합니다"),
  categoryId: z.number().min(1, "카테고리를 선택해주세요"),
  imageUrl: z.string().optional(),
});

const categoryFormSchema = z.object({
  name: z.string().min(1, "카테고리명은 필수입니다"),
  description: z.string().optional(),
});

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("store");
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  
  // Product management state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  
  // Customer management state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  
  // Fetch store settings
  const { data: storeData, isLoading } = useQuery<StoreSettings>({
    queryKey: ['/api/store-settings'],
  });

  // Fetch products and categories
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
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

  // Product management functions
  const filteredProductsForManagement = products.filter(product => 
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // Product form
  const productForm = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: "",
      stock: 0,
      categoryId: 0,
      imageUrl: "",
    },
  });

  // Category form
  const categoryForm = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowAddProductModal(false);
      setEditingProduct(null);
      productForm.reset();
      toast({
        title: '성공',
        description: '상품이 성공적으로 등록되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '상품 등록에 실패했습니다.',
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof productFormSchema> }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowAddProductModal(false);
      setEditingProduct(null);
      productForm.reset();
      toast({
        title: '성공',
        description: '상품이 성공적으로 수정되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '상품 수정에 실패했습니다.',
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/products/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: '성공',
        description: '상품이 성공적으로 삭제되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '상품 삭제에 실패했습니다.',
        variant: "destructive",
      });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categoryFormSchema>) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setShowAddCategoryModal(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: '성공',
        description: '카테고리가 성공적으로 등록되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '카테고리 등록에 실패했습니다.',
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof categoryFormSchema> }) => {
      const response = await apiRequest("PUT", `/api/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setShowAddCategoryModal(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: '성공',
        description: '카테고리가 성공적으로 수정되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '카테고리 수정에 실패했습니다.',
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/categories/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: '성공',
        description: '카테고리가 성공적으로 삭제되었습니다.',
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '카테고리 삭제에 실패했습니다.',
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    productForm.reset({
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl || "",
    });
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = (id: number) => {
    if (confirm("정말로 이 상품을 삭제하시겠습니까?")) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
    });
    setShowAddCategoryModal(true);
  };

  const handleDeleteCategory = (id: number) => {
    const productCount = products.filter(p => p.categoryId === id).length;
    if (productCount > 0) {
      toast({
        title: '삭제 불가',
        description: '이 카테고리에 속한 상품이 있어 삭제할 수 없습니다.',
        variant: "destructive",
      });
      return;
    }
    
    if (confirm("정말로 이 카테고리를 삭제하시겠습니까?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const onProductSubmit = (data: z.infer<typeof productFormSchema>) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const onCategorySubmit = (data: z.infer<typeof categoryFormSchema>) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const resetProductForm = () => {
    setShowAddProductModal(false);
    setEditingProduct(null);
    productForm.reset();
  };

  const resetCategoryForm = () => {
    setShowAddCategoryModal(false);
    setEditingCategory(null);
    categoryForm.reset();
  };

  // Customer management functions
  const handleDeleteCustomer = async (id: number) => {
    if (confirm("정말로 이 고객을 삭제하시겠습니까?")) {
      try {
        await apiRequest("DELETE", `/api/customers/${id}`);
        queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
        toast({
          title: '성공',
          description: '고객이 성공적으로 삭제되었습니다.',
        });
      } catch (error) {
        toast({
          title: '오류',
          description: '고객 삭제에 실패했습니다.',
          variant: "destructive",
        });
      }
    }
  };

  const resetCustomerForm = () => {
    setShowAddCustomerModal(false);
    setEditingCustomer(null);
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
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowAddProductModal(true)}
                    >
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
                              <div className="font-mono text-sm text-gray-600">{product.sku}</div>
                              <div>
                                <Badge variant="outline" className="text-green-700 border-green-300">
                                  {category?.name || '미분류'}
                                </Badge>
                              </div>
                              <div className="font-medium">₩{parseFloat(product.price).toLocaleString()}</div>
                              <div>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  product.stock > 10 ? "bg-green-100 text-green-800" :
                                  product.stock > 5 ? "bg-yellow-100 text-yellow-800" :
                                  product.stock > 0 ? "bg-red-100 text-red-800" :
                                  "bg-gray-100 text-gray-800"
                                }`}>
                                  {product.stock}
                                </span>
                              </div>
                              <div>
                                <Badge variant={product.stock > 0 ? "default" : "secondary"} 
                                       className={product.stock > 0 ? "bg-green-100 text-green-800" : ""}>
                                  {product.stock > 0 ? '판매 중' : '품절'}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDeleteProduct(product.id)}
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
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowAddCategoryModal(true)}
                    >
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
                                onClick={() => handleEditCategory(category)}
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
                          {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-center mt-6">
                    <div className="text-sm text-gray-600">
                      총 {categories.length}개의 카테고리가 등록되어 있습니다.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

          {/* Customers Tab */}
          <TabsContent value="customers">
            <div className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    고객 관리
                  </CardTitle>
                  <CardDescription>고객 정보를 등록하고 관리하세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Input
                        placeholder="고객 검색..."
                        className="w-64"
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      />
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        검색
                      </Button>
                    </div>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowAddCustomerModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      고객 등록
                    </Button>
                  </div>

                  <div className="rounded-md border">
                    <div className="grid grid-cols-7 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                      <div>고객 ID</div>
                      <div>이름</div>
                      <div>전화번호</div>
                      <div>이메일</div>
                      <div>등급</div>
                      <div>총 주문 금액</div>
                      <div className="text-center">작업</div>
                    </div>
                    
                    <div className="divide-y max-h-96 overflow-y-auto">
                      {customers.length > 0 ? (
                        customers.filter(customer => 
                          customer.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                          customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                          customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                        ).map((customer: any) => (
                          <div key={customer.id} className="grid grid-cols-7 gap-4 p-4 items-center">
                            <div className="font-mono text-sm">{customer.customerId || `CUS${customer.id.toString().padStart(3, '0')}`}</div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-600">{customer.phone}</div>
                            <div className="text-sm text-gray-600">{customer.email || '-'}</div>
                            <div>
                              <Badge 
                                variant={customer.grade === 'gold' ? 'default' : customer.grade === 'silver' ? 'secondary' : 'outline'}
                                className={
                                  customer.grade === 'gold' ? 'bg-amber-100 text-amber-800' :
                                  customer.grade === 'silver' ? 'bg-gray-100 text-gray-800' :
                                  customer.grade === 'vip' ? 'bg-purple-100 text-purple-800' :
                                  'text-green-700 border-green-300'
                                }
                              >
                                {customer.grade === 'gold' ? '골드' : 
                                 customer.grade === 'silver' ? '실버' : 
                                 customer.grade === 'vip' ? 'VIP' : '브론즈'}
                              </Badge>
                            </div>
                            <div className="font-medium">₩{(customer.totalSpent || 0).toLocaleString()}</div>
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingCustomer(customer);
                                  setShowAddCustomerModal(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
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
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">등록된 고객이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                      총 {customers.length}명의 고객이 등록되어 있습니다.
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <UserCheck className="w-4 h-4 mr-2" />
                        고객 분석
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4 mr-2" />
                        마케팅 메시지
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

      {/* Product Add/Edit Modal */}
      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? '상품 수정' : '새 상품 추가'}</DialogTitle>
          </DialogHeader>
          
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상품명</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="상품명 입력" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SKU 입력" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={productForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>가격</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productForm.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>재고</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={productForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이미지 URL (선택사항)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetProductForm}>
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {editingProduct ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Category Add/Edit Modal */}
      <Dialog open={showAddCategoryModal} onOpenChange={setShowAddCategoryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? '카테고리 수정' : '새 카테고리 추가'}</DialogTitle>
          </DialogHeader>
          
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리명</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="카테고리명 입력" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명 (선택사항)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="카테고리 설명" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetCategoryForm}>
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {editingCategory ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Customer Add/Edit Modal */}
      <CustomerFormModal
        isOpen={showAddCustomerModal}
        onClose={resetCustomerForm}
        customer={editingCustomer}
        mode={editingCustomer ? "edit" : "create"}
      />
    </div>
  );
}