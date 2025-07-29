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
    businessType: "restaurant",
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
        businessType: storeData.businessType || "restaurant",
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
      name: "QR Code",
      nameKey: "qrCode",
      type: "qr",
      enabled: true,
      icon: "📱",
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
    if (!categoryForm.name.trim()) {
      toast({
        title: t("common.error"),
        description: "Vui lòng nhập tên danh mục",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Refetch data immediately
      await queryClient.refetchQueries({ queryKey: ["/api/categories"] });
      await queryClient.refetchQueries({ queryKey: ["/api/products"] });

      toast({
        title: t("common.success"),
        description: "Danh mục đã được tạo thành công",
      });
      setShowCategoryForm(false);
      resetCategoryForm();
    } catch (error) {
      console.error("Category creation error:", error);
      toast({
        title: t("common.error"),
        description: "Có lỗi xảy ra khi tạo danh mục",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({
        title: t("common.error"),
        description: "Vui lòng nhập tên danh mục",
        variant: "destructive",
      });
      return;
    }

    if (!editingCategory) {
      toast({
        title: t("common.error"),
        description: "Không tìm thấy danh mục cần cập nhật",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Close dialog and reset form
      setShowCategoryForm(false);
      resetCategoryForm();

      // Refetch data immediately
      await queryClient.refetchQueries({ queryKey: ["/api/categories"] });
      await queryClient.refetchQueries({ queryKey: ["/api/products"] });

      toast({
        title: t("common.success"),
        description: "Danh mục đã được cập nhật thành công",
      });
    } catch (error) {
      console.error("Category update error:", error);
      toast({
        title: t("common.error"),
        description: "Có lỗi xảy ra khi cập nhật danh mục",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    // Check if category has products
    const categoryProducts = productsData?.filter(
      (product: any) => product.categoryId === categoryId
    );

    if (categoryProducts && categoryProducts.length > 0) {
      toast({
        title: t("common.error"),
        description: `Không thể xóa danh mục này vì còn ${categoryProducts.length} sản phẩm. Vui lòng xóa hoặc chuyển các sản phẩm sang danh mục khác trước.`,
        variant: "destructive",
      });
      return;
    }

    if (
      confirm(
        "Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác."
      )
    ) {
      try {
        const response = await fetch(`/api/categories/${categoryId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        // Refetch data immediately
        await queryClient.refetchQueries({ queryKey: ["/api/categories"] });
        await queryClient.refetchQueries({ queryKey: ["/api/products"] });

        toast({
          title: t("common.success"),
          description: "Danh mục đã được xóa thành công",
        });
      } catch (error) {
        console.error("Category delete error:", error);
        
        let errorMessage = "Có lỗi xảy ra khi xóa danh mục";
        if (error instanceof Error) {
          if (error.message.includes("products")) {
            errorMessage = "Không thể xóa danh mục vì vẫn còn sản phẩm trong danh mục này. Vui lòng xóa hoặc chuyển các sản phẩm sang danh mục khác trước.";
          } else {
            errorMessage = error.message;
          }
        }
        
        toast({
          title: t("common.error"),
          description: errorMessage,
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
    setCategoryForm({ 
      name: category.name || "", 
      icon: category.icon || "fas fa-utensils" 
    });
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
              <CreditCard className="w-5 h-5" />
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
                  <div className="space-y-2">
                    <Label htmlFor="businessType">{t("settings.businessType")}</Label>
                    <Select
                      value={storeSettings.businessType}
                      onValueChange={(value) =>
                        handleStoreSettingChange("businessType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("settings.businessTypePlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">
                          {t("settings.posRetail")}
                        </SelectItem>
                        <SelectItem value="restaurant">
                          {t("settings.posRestaurant")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Plus classNameName="w-4 h-4 mr-2" />
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
                                {customer.points || 0}P
                              </Button>
                            </div>
                            <div><Badge
                                variant="default"
                                className={`${
                                  customer.membershipLevel === "VIP"
                                    ? "bg-purple-500"
                                    : customer.membershipLevel === "GOLD"
                                      ? "bg-yellow-500"
                                      : customer.membershipLevel === "SILVER"
                                        ? "bg-gray-300 text-black"
                                        : "bg-gray-400"
                                } text-white`}
                              >
                                {customer.membershipLevel === "VIP"
                                  ? t("customers.vip")
                                  : customer.membershipLevel === "GOLD"
                                    ? t("customers.gold")
                                    : customer.membershipLevel === "SILVER"
                                      ? t("customers.silver")
                                      : customer.membershipLevel}
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
                                onClick={() => handleManagePoints(customer)}
                              >
                                <CreditCard className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() =>
                                  handleDeleteCustomer(customer.id)
                                }
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
                      {t("customers.total")}{" "}
                      {customersData ? customersData.length : 0}{" "}
                      {t("customers.totalCustomersRegistered")}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMembershipModal(true)}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        {t("customers.membershipManagement")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPointsManagementModal(true)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t("customers.pointsManagement")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Categories Tab - Product Management */}
          <TabsContent value="categories">
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {t("settings.totalCategories")}
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {categoriesData ? categoriesData.length : 0}
                        </p>
                      </div>
                      <Tag className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {t("settings.totalProducts")}
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {productsData ? productsData.length : 0}
                        </p>
                      </div>
                      <ShoppingCart className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {t("settings.totalStockQuantity")}
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {productsData
                            ? productsData.reduce(
                                (total: number, product: any) =>
                                  total + (product.stock || 0),
                                0,
                              )
                            : 0}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Management */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-green-600" />
                    {t("settings.categoryTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.categoryManagementDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Input placeholder="품목군 검색..." className="w-64" />
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        {t("common.search")}
                      </Button>
                    </div>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        resetCategoryForm();
                        setShowCategoryForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("settings.addCategory")}
                    </Button>
                  </div>

                  {categoriesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{t("common.loading")}</p>
                    </div>
                  ) : !categoriesData || categoriesData.length === 0 ? (
                    <div className="text-center py-8">
                      <Tag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {t("settings.noCategories")}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoriesData.map((category: any) => (
                        <Card
                          key={category.id}
                          className="border-2 hover:border-green-300 transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <i
                                    className={`${category.icon} text-green-600`}
                                  ></i>
                                </div>
                                <div>
                                  <h3 className="font-semibold">
                                    {category.name}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    {productsData
                                      ? productsData.filter(
                                          (p: any) =>
                                            p.categoryId === category.id,
                                        ).length
                                      : 0} sản phẩm
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCategory(category)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Management */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    {t("settings.productTitle")}
                  </CardTitle>
                  <CardDescription>
                    Quản lý thông tin sản phẩm và giá cả
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Input
                        placeholder={t("settings.productNamePlaceholder")}
                        className="w-64"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                      />
                      <Select
                        value={selectedCategoryFilter}
                        onValueChange={setSelectedCategoryFilter}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue
                            placeholder={t("settings.selectCategory")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("settings.allCategories")}
                          </SelectItem>
                          {categoriesData?.map((category: any) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        {t("common.search")}
                      </Button>
                    </div>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        resetProductForm();
                        setShowProductForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("settings.addProduct")}
                    </Button>
                  </div>

                  {productsLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{t("common.loading")}</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {t("settings.noProducts")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-7 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                        <div>{t("settings.productName")}</div>
                        <div>{t("settings.productSku")}</div>
                        <div>{t("settings.productCategory")}</div>
                        <div>{t("settings.productPrice")}</div>
                        <div>{t("settings.productStock")}</div>
                        <div>상태</div>
                        <div className="text-center">{t("common.actions")}</div>
                      </div>

                      <div className="divide-y">
                        {filteredProducts.map((product: any) => {
                          const category = categoriesData?.find(
                            (c: any) => c.id === product.categoryId,
                          );
                          return (
                            <div
                              key={product.id}
                              className="grid grid-cols-7 gap-4 p-4 items-center"
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="font-mono text-sm">
                                {product.sku}
                              </div>
                              <div className="text-sm">
                                <Badge variant="outline">
                                  {category?.name || "N/A"}
                                </Badge>
                              </div>
                              <div className="font-medium">
                                {parseFloat(
                                  product.price || "0",
                                ).toLocaleString()}{" "}
                                ₫
                              </div>
                              <div className="text-center">
                                {product.stock || 0}
                              </div>
                              <div>
                                <Badge
                                  variant={
                                    product.stock > 0
                                      ? "default"
                                      : "destructive"
                                  }
                                  className={
                                    product.stock > 0
                                      ? "bg-green-100 text-green-800"
                                      : ""
                                  }
                                >
                                  {product.stock > 0 ? "재고있음" : "품절"}
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
                                  onClick={() =>
                                    handleDeleteProduct(product.id)
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                      {t("settings.total")} {filteredProducts.length} sản phẩm đang hiển thị
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
                    {t("settings.employeeManagement")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.employeeManagementDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Input
                        placeholder={t("employees.searchPlaceholder")}
                        className="w-64"
                      />
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        {t("common.search")}
                      </Button>
                    </div>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowEmployeeForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("employees.addEmployee")}
                    </Button>
                  </div>

                  {employeesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {t("employeesSettings.loadingEmployeeData")}
                      </p>
                    </div>
                  ) : !employeesData || employeesData.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {t("employeesSettings.noRegisteredEmployees")}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        {t("employeesSettings.addEmployeeToStart")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-6 gap-4 p-4 font-medium text-sm text-gray-600 bg-gray-50 border-b">
                        <div>{t("employees.employeeId")}</div>
                        <div>{t("employees.name")}</div>
                        <div>{t("employees.role")}</div>
                        <div>{t("employees.phone")}</div>
                        <div>{t("employees.status")}</div>
                        <div className="text-center">{t("common.actions")}</div>
                      </div>

                      <div className="divide-y">
                        {employeesData.map((employee: any) => (
                          <div
                            key={employee.id}
                            className="grid grid-cols-6 gap-4 p-4 items-center"
                          >
                            <div className="font-mono text-sm">
                              {employee.employeeId}
                            </div>
                            <div className="font-medium">{employee.name}</div>
                            <div>
                              <Badge
                                variant={
                                  employee.role === "admin"
                                    ? "destructive"
                                    : employee.role === "manager"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {employee.role === "admin"
                                  ? t("employees.roles.admin")
                                  : employee.role === "manager"
                                    ? t("employees.roles.manager")
                                    : employee.role === "cashier"
                                      ? t("employees.roles.cashier")
                                      : employee.role}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {employee.phone || "-"}
                            </div>
                            <div>
                              <Badge
                                variant={
                                  employee.isActive ? "default" : "secondary"
                                }
                                className={
                                  employee.isActive
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                              >
                                {employee.isActive
                                  ? t("employees.active")
                                  : t("employees.inactive")}
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
                                  if (
                                    confirm(
                                      `${t("employeesSettings.deleteConfirm")} ${employee.name} ${t("employeesSettings.employeeDeleteConfirm")}`,
                                    )
                                  ) {
                                    fetch(`/api/employees/${employee.id}`, {
                                      method: "DELETE",
                                    })
                                      .then(() => {
                                        queryClient.invalidateQueries({
                                          queryKey: ["/api/employees"],
                                        });
                                        toast({
                                          title: t(
                                            "employeesSettings.deleteSuccess",
                                          ),
                                          description: t(
                                            "employeesSettings.employeeDeleted",
                                          ),
                                        });
                                      })
                                      .catch(() => {
                                        toast({
                                          title: t(
                                            "employeesSettings.deleteError",
                                          ),
                                          description: t(
                                            "employeesSettings.employeeDeleteFailed",
                                          ),
                                          variant: "destructive",
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
                      {t("employees.total")}{" "}
                      {employeesData ? employeesData.length : 0} nhân viên
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        {t("settings.goToEmployees")}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Clock className="w-4 h-4 mr-2" />
                        {t("attendance.title")}
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
                  {t("settings.paymentMethods")}
                </CardTitle>
                <CardDescription>
                  {t("settings.paymentMethodsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      {t("settings.availablePayments")}
                    </h3>
                    <Button
                      onClick={addPaymentMethod}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("settings.addPayment")}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          method.enabled
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{method.icon}</span>
                            <span className="font-medium">
                              {t(`settings.payments.${method.nameKey}`)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={method.enabled}
                              onCheckedChange={() =>
                                togglePaymentMethod(method.id)
                              }
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
                        <Badge
                          variant={method.enabled ? "default" : "secondary"}
                        >
                          {method.enabled
                            ? t("settings.enabled")
                            : t("settings.disabled")}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      {t("common.save")}
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

      {/* Customer Points Modal */}
      {selectedCustomer && (
        <CustomerPointsModal
          open={showPointsModal}
          onOpenChange={setShowPointsModal}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
        />
      )}

      {/* Membership Management Modal */}
      <MembershipModal
        isOpen={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
      />

      {/* Points Management Modal */}
      <PointsManagementModal
        isOpen={showPointsManagementModal}
        onClose={() => setShowPointsManagementModal(false)}
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

      {/* Category Form Modal */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? "Sửa danh mục"
                : t("settings.addCategory")}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Cập nhật thông tin danh mục sản phẩm"
                : t("settings.categoryManagementDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="categoryName" className="text-right">
                {t("settings.categoryName")}
              </Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="col-span-3"
                placeholder={t("settings.categoryNamePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="categoryIcon" className="text-right">
                {t("settings.categoryIcon")}
              </Label>
              <Select
                value={categoryForm.icon}
                onValueChange={(value) =>
                  setCategoryForm((prev) => ({ ...prev, icon: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fas fa-utensils">🍽️ 식사</SelectItem>
                  <SelectItem value="fas fa-coffee">☕ 음료</SelectItem>
                  <SelectItem value="fas fa-cookie">🍪 간식</SelectItem>
                  <SelectItem value="fas fa-ice-cream">🍨 디저트</SelectItem>
                  <SelectItem value="fas fa-beer">🍺 주류</SelectItem>
                  <SelectItem value="fas fa-apple-alt">🍎 과일</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCategoryForm(false);
                resetCategoryForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={
                editingCategory ? handleUpdateCategory : handleCreateCategory
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {editingCategory ? "Cập nhật" : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Form Modal */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? t("settings.editProduct")
                : t("settings.addProduct")}
            </DialogTitle>
            <DialogDescription>
              Nhập thông tin sản phẩm mới
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productName" className="text-right">
                {t("settings.productName")}
              </Label>
              <Input
                id="productName"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="col-span-3"
                placeholder={t("settings.productNamePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productSku" className="text-right">
                {t("settings.productSku")}
              </Label>
              <Input
                id="productSku"
                value={productForm.sku}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, sku: e.target.value }))
                }
                className="col-span-3"
                placeholder={t("settings.productSkuPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productCategory" className="text-right">
                {t("settings.productCategory")}
              </Label>
              <Select
                value={productForm.categoryId}
                onValueChange={(value) =>
                  setProductForm((prev) => ({ ...prev, categoryId: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue
                    placeholder={t("settings.selectCategory")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.map((category: any) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productPrice" className="text-right">
                {t("settings.productPrice")}
              </Label>
              <Input
                id="productPrice"
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, price: e.target.value }))
                }
                className="col-span-3"
                placeholder={t("settings.productPricePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productStock" className="text-right">
                {t("settings.productStock")}
              </Label>
              <Input
                id="productStock"
                type="number"
                value={productForm.stock}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, stock: e.target.value }))
                }
                className="col-span-3"
                placeholder={t("settings.productStockPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productDescription" className="text-right">
                설명
              </Label>
              <Textarea
                id="productDescription"
                value={productForm.description}
                onChange={(e) =>
                  setProductForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="col-span-3"
                placeholder="품목 설명을 입력하세요 (선택사항)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductForm(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={
                editingProduct ? handleUpdateProduct : handleCreateProduct
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {editingProduct ? t("common.update") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}