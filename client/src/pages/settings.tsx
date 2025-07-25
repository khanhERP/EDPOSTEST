The code changes fix the translation keys in the Employees tab to use the `employees` module instead of the non-existent `employeesSettings` module, and corrects the delete confirmation message.
```

```replit_final_file
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  type StoreSettings,
  type InsertStoreSettings,
  type Customer,
} from "@shared/schema";
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
  UserCheck,
  Tag,
  ShoppingCart,
} from "lucide-react";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { CustomerPointsModal } from "@/components/customers/customer-points-modal";
import { MembershipModal } from "@/components/membership/membership-modal";
import { PointsManagementModal } from "@/components/customers/points-management-modal";
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
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showPointsManagementModal, setShowPointsManagementModal] =
    useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // Employee management state
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  // Product management state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    icon: "fas fa-utensils",
  });
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    price: "",
    stock: "0",
    categoryId: "",
    description: "",
  });

  // Fetch store settings
  const { data: storeData, isLoading } = useQuery<StoreSettings>({
    queryKey: ["/api/store-settings"],
  });

  // Fetch customers
  const { data: customersData, isLoading: customersLoading } = useQuery<
    Customer[]
  >({
    queryKey: ["/api/customers"],
  });

  // Fetch employees
  const { data: employeesData, isLoading: employeesLoading } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/categories"],
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
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
    closeTime: "22:00",
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
        closeTime: storeData.closeTime || "22:00",
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
      queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
      toast({
        title: t("common.success"),
        description: t("settings.storeUpdated"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("settings.updateError"),
        variant: "destructive",
      });
    },
  });

  // Payment methods state - Vietnamese market localized
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 1,
      name: "Tiền mặt",
      nameKey: "cash",
      type: "cash",
      enabled: true,
      icon: "💵",
    },
    {
      id: 2,
      name: "Thẻ tín dụng",
      nameKey: "creditCard",
      type: "card",
      enabled: true,
      icon: "💳",
    },
    {
      id: 3,
      name: "Thẻ ghi nợ",
      nameKey: "debitCard",
      type: "debit",
      enabled: true,
      icon: "💳",
    },
    {
      id: 4,
      name: "MoMo",
      nameKey: "momo",
      type: "digital",
      enabled: true,
      icon: "📱",
    },
    {
      id: 5,
      name: "ZaloPay",
      nameKey: "zalopay",
      type: "digital",
      enabled: true,
      icon: "📱",
    },
    {
      id: 6,
      name: "VNPay",
      nameKey: "vnpay",
      type: "digital",
      enabled: true,
      icon: "💳",
    },
    {
      id: 7,
      name: "Ngân hàng trực tuyến",
      nameKey: "banking",
      type: "banking",
      enabled: false,
      icon: "🏦",
    },
    {
      id: 8,
      name: "ShopeePay",
      nameKey: "shopeepay",
      type: "digital",
      enabled: false,
      icon: "🛒",
    },
    {
      id: 9,
      name: "GrabPay",
      nameKey: "grabpay",
      type: "digital",
      enabled: false,
      icon: "🚗",
    },
  ]);

  const handleStoreSettingChange = (field: string, value: string) => {
    setStoreSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveStoreSettings = () => {
    updateStoreSettingsMutation.mutate(storeSettings);
  };

  const togglePaymentMethod = (id: number) => {
    setPaymentMethods((prev) =>
      prev.map((method) =>
        method.id === id ? { ...method, enabled: !method.enabled } : method,
      ),
    );
  };

  const addPaymentMethod = () => {
    const newMethod = {
      id: paymentMethods.length + 1,
      name: "Phương thức thanh toán mới",
      nameKey: "newPayment",
      type: "custom",
      enabled: false,
      icon: "💳",
    };
    setPaymentMethods((prev) => [...prev, newMethod]);
  };

  const removePaymentMethod = (id: number) => {
    setPaymentMethods((prev) => prev.filter((method) => method.id !== id));
  };

  // Customer management functions
  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleDeleteCustomer = (customerId: number) => {
    if (confirm("정말로 이 고객을 t제하시겠습니까?")) {
      fetch(`/api/customers/${customerId}`, { method: "DELETE" })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          toast({
            title: "성공",
            description: "고객이 삭제되었습니다.",
          });
        })
        .catch(() => {
          toast({
            title: "오류",
            description: "고객 삭제에 실패했습니다.",
            variant: "destructive",
          });
        });
    }
  };

  const handleManagePoints = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowPointsModal(true);
  };

  const handleCloseCustomerForm = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  // Filter customers based on search term
  const filteredCustomers = customersData
    ? customersData.filter(
        (customer: Customer) =>
          customer.name
            .toLowerCase()
            .includes(customerSearchTerm.toLowerCase()) ||
          customer.customerId
            .toLowerCase()
            .includes(customerSearchTerm.toLowerCase()) ||
          (customer.phone && customer.phone.includes(customerSearchTerm)),
      )
    : [];

  // Product management functions
  const resetCategoryForm = () => {
    setCategoryForm({ name: "", icon: "fas fa-utensils" });
    setEditingCategory(null);
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      sku: "",
      price: "",
      stock: "0",
      categoryId: "",
      description: "",
    });
    setEditingProduct(null);
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return;

    try {
      const response = await apiRequest(
        "POST",
        "/api/categories",
        categoryForm,
      );
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: t("common.success"),
        description: t("productManagement.categoryCreateSuccess"),
      });
      setShowCategoryForm(false);
      resetCategoryForm();
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!categoryForm.name.trim() || !editingCategory) return;

    try {
      const response = await apiRequest(
        "PUT",
        `/api/categories/${editingCategory.id}`,
        categoryForm,
      );
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: t("common.success"),
        description: t("productManagement.categoryUpdateSuccess"),
      });
      setShowCategoryForm(false);
      resetCategoryForm();
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (
      confirm(
        `${t("productManagement.deleteConfirm")} ${t("productManagement.categoryDeleteConfirm")}`,
      )
    ) {
      try {
        await apiRequest("DELETE", `/api/categories/${categoryId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        toast({
          title: t("common.success"),
          description: t("productManagement.categoryDeleteSuccess"),
        });
      } catch (error) {
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateProduct = async () => {
    if (
      !productForm.name.trim() ||
      !productForm.sku.trim() ||
      !productForm.categoryId
    )
      return;

    try {
      const productData = {
        ...productForm,
        price: productForm.price,
        stock: parseInt(productForm.stock) || 0,
        categoryId: parseInt(productForm.categoryId),
      };

      const response = await apiRequest("POST", "/api/products", productData);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: t("common.success"),
        description: t("productManagement.productCreateSuccess"),
      });
      setShowProductForm(false);
      resetProductForm();
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async () => {
    if (
      !productForm.name.trim() ||
      !productForm.sku.trim() ||
      !productForm.categoryId ||
      !editingProduct
    )
      return;

    try {
      const productData = {
        ...productForm,
        price: productForm.price,
        stock: parseInt(productForm.stock) || 0,
        categoryId: parseInt(productForm.categoryId),
      };

      const response = await apiRequest(
        "PUT",
        `/api/products/${editingProduct.id}`,
        productData,
      );
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: t("common.success"),
        description: t("productManagement.productUpdateSuccess"),
      });
      setShowProductForm(false);
      resetProductForm();
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (confirm(t("productManagement.deleteConfirm"))) {
      try {
        await apiRequest("DELETE", `/api/products/${productId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        toast({
          title: t("common.success"),
          description: t("productManagement.productDeleteSuccess"),
        });
      } catch (error) {
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        });
      }
    }
  };

  const handleEditCategory = (category: any) => {
    setCategoryForm({ name: category.name, icon: category.icon });
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleEditProduct = (product: any) => {
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      stock: product.stock.toString(),
      categoryId: product.categoryId.toString(),
      description: product.description || "",
    });
    setEditingProduct(product);
    setShowProductForm(true);
  };

  // Filter products based on category and search term
  const filteredProducts = productsData
    ? productsData.filter((product: any) => {
        const matchesCategory =
          selectedCategoryFilter === "all" ||
          product.categoryId.toString() === selectedCategoryFilter;
        const matchesSearch =
          product.name
            .toLowerCase()
            .includes(productSearchTerm.toLowerCase()) ||
          product.sku.toLowerCase().includes(productSearchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    : [];

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
            backgroundSize: "100px 100px",
          }}
        ></div>
      </div>

      <div className="relative z-10 container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-green-600" />
                {t("settings.title")}
              </h1>
              <p className="text-gray-600">{t("settings.description")}</p>
            </div>
            <Button
              onClick={() => (window.location.href = "/pos")}
              variant="outline"
              className="bg-white hover:bg-green-50 border-green-200 text-green-700 hover:text-green-800"
            >
              <Home className="w-4 h-4 mr-2" />
              {t("settings.backToPos")}
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              {t("settings.storeInfo")}
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {t("customers.title")}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t("settings.categories")}
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("settings.employees")}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {t("settings.paymentMethods")}
            </TabsTrigger>
          </TabsList>

          {/* Store Information Tab */}
          <TabsContent value="store">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-green-600" />
                    {t("settings.basicInfo")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.basicInfoDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">{t("settings.storeName")}</Label>
                    <Input
                      id="storeName"
                      value={storeSettings.storeName}
                      onChange={(e) =>
                        handleStoreSettingChange("storeName", e.target.value)
                      }
                      placeholder={t("settings.storeNamePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeCode">{t("settings.storeCode")}</Label>
                    <Input
                      id="storeCode"
                      value={storeSettings.storeCode}
                      onChange={(e) =>
                        handleStoreSettingChange("storeCode", e.target.value)
                      }
                      placeholder={t("settings.storeCodePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">{t("settings.taxId")}</Label>
                    <Input
                      id="taxId"
                      value={storeSettings.taxId}
                      onChange={(e) =>
                        handleStoreSettingChange("taxId", e.target.value)
                      }
                      placeholder={t("settings.taxIdPlaceholder")}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                    {t("settings.contactInfo")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.contactInfoDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">{t("settings.address")}</Label>
                    <Textarea
                      id="address"
                      value={storeSettings.address}
                      onChange={(e) =>
                        handleStoreSettingChange("address", e.target.value)
                      }
                      placeholder={t("settings.addressPlaceholder")}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("settings.phone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={storeSettings.phone}
                      onChange={(e) =>
                        handleStoreSettingChange("phone", e.target.value)
                      }
                      placeholder={t("settings.phonePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("settings.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={storeSettings.email}
                      onChange={(e) =>
                        handleStoreSettingChange("email", e.target.value)
                      }
                      placeholder={t("settings.emailPlaceholder")}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-green-600" />
                    {t("settings.operationHours")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.operationHoursDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="openTime">{t("settings.openTime")}</Label>
                      <Input
                        id="openTime"
                        type="time"
                        value={storeSettings.openTime}
                        onChange={(e) =>
                          handleStoreSettingChange("openTime", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closeTime">
                        {t("settings.closeTime")}
                      </Label>
                      <Input
                        id="closeTime"
                        type="time"
                        value={storeSettings.closeTime}
                        onChange={(e) =>
                          handleStoreSettingChange("closeTime", e.target.value)
                        }
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
                  {updateStoreSettingsMutation.isPending
                    ? t("common.loading")
                    : t("common.save")}
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
                        <p className="text-sm font-medium text-gray-600">
                          {t("customers.totalCustomers")}
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {customersData ? customersData.length : 0}
                        </p>
                      </div>
                      <UserCheck className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {t("customers.activeCustomers")}
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {customersData
                            ? customersData.filter((c) => c.status === "active")
                                .length
                            : 0}
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
                        <p className="text-sm font-medium text-gray-600">
                          {t("customers.pointsIssued")}
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {customersData
                            ? customersData
                                .reduce(
                                  (total, c) => total + (c.points || 0),
                                  0,
                                )
                                .toLocaleString()
                            : 0}
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
                        <p className="text-sm font-medium text-gray-600">
                          {t("customers.averageSpent")}
                        </p>
                        <p className="text-2xl font-bold text-orange-600">
                          {customersData && customersData.length > 0
                            ? Math.round(
                                customersData.reduce(
                                  (total, c) =>
                                    total + parseFloat(c.totalSpent || "0"),
                                  0,
                                ) / customersData.length,
                              ).toLocaleString()
                            : "0"}{" "}
                          ₫
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
                    {t("customers.customerManagement")}
                  </CardTitle>
                  <CardDescription>
                    {t("customers.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Input
                        placeholder={t("customers.searchPlaceholder")}
                        className="w-64"
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      />
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        {t("common.search")}
                      </Button>
                    </div>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowCustomerForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("customers.addCustomer")}
                    </Button>
                  </div>

                  {customersLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {t("customers.loadingCustomerData")}
                      </p>
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {t("customers.noRegisteredCustomers")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-8 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                        <div>{t("customers.customerId")}</div>
                        <div>{t("customers.name")}</div>
                        <div>{t("customers.phone")}</div>
                        <div>{t("customers.visitCount")}</div>
                        <div>{t("customers.totalSpent")}</div>
                        <div>{t("customers.points")}</div>
                        <div>{t("customers.membershipLevel")}</div>
                        <div className="text-center">{t("common.actions")}</div>
                      </div>

                      <div className="divide-y">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="grid grid-cols-8 gap-4 p-4 items-center"
                          >
                            <div className="font-mono text-sm">
                              {customer.customerId}
                            </div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-600">
                              {customer.phone || "-"}
                            </div>
                            <div className="text-center">
                              {customer.visitCount || 0}
                            </div>
                            <div className="text-sm font-medium">
                              {parseFloat(
                                customer.totalSpent || "0",
                              ).toLocaleString()}{" "}
                              ₫
                            </div>
                            <div className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                onClick={() => handleManagePoints(customer)}
                              >
                                {