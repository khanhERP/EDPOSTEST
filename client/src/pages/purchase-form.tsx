import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Search,
  Trash2,
  ShoppingCart,
  Package,
  Calculator,
  Save,
  Send,
  X,
} from "lucide-react";
import {
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertProductSchema,
} from "@shared/schema";

// Import types we need
type PurchaseOrderItem = {
  productId: number;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

// Form validation schema using shared schema
const purchaseFormSchema = insertPurchaseOrderSchema.extend({
  items: z
    .array(
      insertPurchaseOrderItemSchema.extend({
        productName: z.string(),
        sku: z.string().optional(),
        receivedQuantity: z.number().default(0),
      }),
    )
    .min(1, "At least one item is required"),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

// Product selection interface
interface ProductSelectionItem {
  id: number;
  name: string;
  sku?: string;
  stock: number;
  unitPrice: number;
}

interface PurchaseFormPageProps {
  id?: string;
  onLogout: () => void;
}

export default function PurchaseFormPage({
  id,
  onLogout,
}: PurchaseFormPageProps) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      productId: number;
      productName: string;
      sku?: string;
      quantity: number;
      receivedQuantity: number;
      unitPrice: number;
      total: number;
    }>
  >([]);

  const isEditMode = Boolean(id);

  // Form setup
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: 0,
      poNumber: "",
      expectedDeliveryDate: new Date().toISOString().split("T")[0],
      subtotal: "0.00",
      tax: "0.00",
      total: "0.00",
      notes: "",
      status: "pending" as const,
      items: [],
    },
  });

  // New product form
  const newProductForm = useForm({
    resolver: zodResolver(
      insertProductSchema.extend({
        categoryId: z.number(),
        productType: z.number().default(1),
        price: z.string(),
        stock: z.number().default(0),
        trackInventory: z.boolean().default(true),
        taxRate: z.string().default("8.00"),
      }),
    ),
    defaultValues: {
      name: "",
      sku: "",
      categoryId: 1,
      productType: 1,
      price: "0",
      stock: 0,
      trackInventory: true,
      isActive: true,
      taxRate: "8.00",
    },
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    select: (data: any) => data || [],
  });

  // Fetch categories for new product form
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    select: (data: any) => data || [],
  });

  // Fetch products for selection
  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    select: (data: any[]) =>
      (data || []).map((product: any) => ({
        ...product,
        unitPrice: Number(product.price) || 0,
      })),
  });

  // Filter products based on search
  const products = useMemo(() => {
    return allProducts.filter(
      (product: any) =>
        productSearch === "" ||
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.sku?.toLowerCase().includes(productSearch.toLowerCase()),
    );
  }, [allProducts, productSearch]);

  // Fetch existing purchase order for edit mode
  const { data: existingOrder } = useQuery({
    queryKey: [`/api/purchase-orders/${id}`],
    enabled: isEditMode && Boolean(id),
    select: (data: any) => data,
  });

  // Load existing order data
  useEffect(() => {
    if (existingOrder && typeof existingOrder === "object") {
      const order = existingOrder as any;
      form.setValue("supplierId", order.supplierId);
      form.setValue("poNumber", order.poNumber);
      form.setValue("expectedDeliveryDate", order.expectedDeliveryDate || "");
      form.setValue("notes", order.notes || "");
      form.setValue("status", order.status);

      // Load existing items
      if (order.items) {
        setSelectedItems(
          order.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            receivedQuantity: item.receivedQuantity || 0,
            unitPrice: parseFloat(item.unitPrice),
            total: parseFloat(item.unitPrice) * item.quantity,
          })),
        );
      }
    }
  }, [existingOrder, form]);

  // Update form items when selectedItems changes - convert to schema format
  useEffect(() => {
    const schemaItems = selectedItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku || "",
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
      unitPrice: item.unitPrice.toFixed(2),
      total: item.total.toFixed(2),
    }));
    form.setValue("items", schemaItems);
  }, [selectedItems, form]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      console.log("Starting mutation with data:", data);

      if (!data.supplierId || data.supplierId === 0) {
        throw new Error(t("purchases.supplierRequired"));
      }

      if (selectedItems.length === 0) {
        throw new Error(t("purchases.itemsRequired"));
      }

      const subtotalAmount = selectedItems.reduce(
        (sum, item) => sum + item.total,
        0,
      );
      const taxAmount = 0; // No tax applied
      const totalAmount = subtotalAmount;

      const payload = {
        supplierId: Number(data.supplierId),
        poNumber: data.poNumber?.trim() || `PO-${Date.now()}`,
        expectedDeliveryDate: data.expectedDeliveryDate || null,
        notes: data.notes?.trim() || null,
        subtotal: subtotalAmount.toFixed(2),
        tax: "0.00",
        total: subtotalAmount.toFixed(2),
        status: data.status || "pending",
        items: selectedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku || "",
          quantity: item.quantity,
          receivedQuantity: item.receivedQuantity || 0,
          unitPrice: item.unitPrice.toFixed(2),
          total: item.total.toFixed(2),
        })),
      };

      console.log("API payload:", payload);

      try {
        let response;
        if (isEditMode) {
          response = await apiRequest(
            "PUT",
            `/api/purchase-orders/${id}`,
            payload,
          );
        } else {
          response = await apiRequest("POST", "/api/purchase-orders", payload);
        }

        console.log("API response:", response);
        return response;
      } catch (apiError: any) {
        console.error("API Error:", apiError);
        throw new Error(
          apiError?.response?.data?.message ||
            apiError?.message ||
            "Failed to save purchase order",
        );
      }
    },
    onSuccess: (response) => {
      console.log("Mutation success:", response);
      toast({
        title: t("common.success"),
        description: isEditMode
          ? t("purchases.orderUpdated")
          : t("purchases.orderCreated"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      navigate("/purchases");
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      let errorMessage = "Có lỗi xảy ra khi tạo đơn mua hàng";

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Create new product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: (newProduct) => {
      toast({
        title: t("common.success"),
        description:
          t("inventory.productCreated") || "Product created successfully",
      });

      // Update products query cache
      queryClient.setQueryData(["/api/products"], (old: any[]) => {
        return [
          ...(old || []),
          { ...newProduct, unitPrice: Number(newProduct.price) || 0 },
        ];
      });

      // Invalidate queries for cache consistency
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      // Add new product to selected items automatically
      addProduct({
        id: newProduct.id,
        name: newProduct.name,
        sku: newProduct.sku,
        stock: newProduct.stock,
        unitPrice: Number(newProduct.price) || 0,
      });

      // Close dialog and reset form
      setIsNewProductDialogOpen(false);
      newProductForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("common.unexpectedError"),
        variant: "destructive",
      });
    },
  });

  // Handle new product creation
  const handleCreateNewProduct = (data: any) => {
    const payload = {
      name: data.name,
      sku: data.sku || "",
      categoryId: data.categoryId,
      productType: data.productType,
      price: data.price,
      stock: data.stock,
      trackInventory: data.trackInventory,
      isActive: true,
      taxRate: data.taxRate,
    };

    createProductMutation.mutate(payload);
  };

  // Add product to order
  const addProduct = (product: ProductSelectionItem) => {
    const existingIndex = selectedItems.findIndex(
      (item) => item.productId === product.id,
    );

    if (existingIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...selectedItems];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].total =
        updatedItems[existingIndex].quantity *
        updatedItems[existingIndex].unitPrice;
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        receivedQuantity: 0,
        unitPrice: product.unitPrice || 0,
        total: product.unitPrice || 0,
      };
      setSelectedItems([...selectedItems, newItem]);
    }
    setIsProductDialogOpen(false);
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }

    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = quantity;
    updatedItems[index].total = quantity * updatedItems[index].unitPrice;
    setSelectedItems(updatedItems);
  };

  // Update item unit price
  const updateItemUnitPrice = (index: number, unitPrice: number) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].unitPrice = Math.max(0, unitPrice);
    updatedItems[index].total = updatedItems[index].quantity * unitPrice;
    setSelectedItems(updatedItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Calculate totals
  const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0; // No tax applied
  const tax = 0;
  const total = subtotal;

  // Form submission
  const onSubmit = (data: PurchaseFormData) => {
    // Kiểm tra các điều kiện bắt buộc
    if (!data.supplierId || data.supplierId === 0) {
      toast({
        title: t("common.error"),
        description: t("purchases.supplierRequired"),
        variant: "destructive",
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: t("common.error"),
        description: t("purchases.itemsRequired"),
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra PO Number
    if (!data.poNumber || data.poNumber.trim() === "") {
      toast({
        title: t("common.error"),
        description: "Vui lòng nhập số PO",
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra các items có số lượng hợp lệ
    const hasInvalidQuantity = selectedItems.some(
      (item) => item.quantity <= 0 || item.unitPrice < 0,
    );
    if (hasInvalidQuantity) {
      toast({
        title: t("common.error"),
        description: "Vui lòng kiểm tra lại số lượng và giá của các sản phẩm",
        variant: "destructive",
      });
      return;
    }

    console.log("Submitting purchase order data:", data);
    console.log("Selected items:", selectedItems);

    saveMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/purchases")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditMode
                  ? t("purchases.editPurchaseOrder")
                  : t("purchases.createPurchaseOrder")}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isEditMode
                  ? t("purchases.editOrderDescription")
                  : t("purchases.createOrderDescription")}
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Order Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      {t("purchases.orderDetails")}
                    </CardTitle>
                    <CardDescription>
                      {t("purchases.orderDetailsDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Supplier Selection */}
                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("purchases.supplier")}</FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(parseInt(value))
                              }
                              value={field.value?.toString() || ""}
                              data-testid="select-supplier"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("purchases.selectSupplier")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {suppliers.map((supplier: any) => (
                                  <SelectItem
                                    key={supplier.id}
                                    value={supplier.id.toString()}
                                  >
                                    {supplier.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* PO Number */}
                      <FormField
                        control={form.control}
                        name="poNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("purchases.poNumber")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("purchases.poNumberPlaceholder")}
                                data-testid="input-po-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Order Date */}
                      <FormField
                        control={form.control}
                        name="expectedDeliveryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("purchases.expectedDeliveryDate")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="date"
                                data-testid="input-order-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Status (Edit Mode Only) */}
                    {isEditMode && (
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("purchases.status")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              data-testid="select-status"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">
                                  {t("purchases.pending")}
                                </SelectItem>
                                <SelectItem value="confirmed">
                                  {t("purchases.confirmed")}
                                </SelectItem>
                                <SelectItem value="partially_received">
                                  {t("purchases.partially_received")}
                                </SelectItem>
                                <SelectItem value="received">
                                  {t("purchases.received")}
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  {t("purchases.cancelled")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("purchases.notes")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder={t("purchases.notesPlaceholder")}
                              rows={3}
                              data-testid="textarea-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Items Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          {t("purchases.items")} ({selectedItems.length})
                        </CardTitle>
                        <CardDescription>
                          {t("purchases.itemsDescription")}
                        </CardDescription>
                      </div>
                      <Dialog
                        open={isProductDialogOpen}
                        onOpenChange={setIsProductDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-add-item">
                            <Plus className="h-4 w-4 mr-2" />
                            {t("purchases.addItem")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <DialogTitle>
                                  {t("purchases.selectProducts")}
                                </DialogTitle>
                                <DialogDescription>
                                  {t("purchases.selectProductsDescription")}
                                </DialogDescription>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsNewProductDialogOpen(true)}
                                className="flex items-center gap-2"
                                data-testid="button-add-new-product"
                              >
                                <Plus className="h-4 w-4" />
                                {t("inventory.addProduct")}
                              </Button>
                            </div>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                placeholder={t("purchases.searchProducts")}
                                value={productSearch}
                                onChange={(e) =>
                                  setProductSearch(e.target.value)
                                }
                                className="pl-10"
                                data-testid="input-product-search"
                              />
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                              <div className="grid gap-2">
                                {products.map((product: any) => (
                                  <div
                                    key={product.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                    onClick={() => addProduct(product)}
                                    data-testid={`product-${product.id}`}
                                  >
                                    <div>
                                      <p className="font-medium">
                                        {product.name}
                                      </p>
                                      {product.sku && (
                                        <p className="text-sm text-gray-500">
                                          SKU: {product.sku}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">
                                        {new Intl.NumberFormat("ko-KR", {
                                          style: "currency",
                                          currency: "KRW",
                                        }).format(product.unitPrice || 0)}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {t("inventory.stock")}:{" "}
                                        {product.stock || 0}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t("purchases.noItemsSelected")}</p>
                        <p className="text-sm">
                          {t("purchases.clickAddItemToStart")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("purchases.product")}</TableHead>
                              <TableHead className="w-24">
                                {t("purchases.quantity")}
                              </TableHead>
                              <TableHead className="w-32">
                                {t("purchases.unitPrice")}
                              </TableHead>
                              <TableHead className="w-32">
                                {t("purchases.totalAmount")}
                              </TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedItems.map((item, index) => (
                              <TableRow
                                key={index}
                                data-testid={`item-row-${index}`}
                              >
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {item.productName}
                                    </p>
                                    {item.sku && (
                                      <p className="text-sm text-gray-500">
                                        SKU: {item.sku}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateItemQuantity(
                                        index,
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                    min="1"
                                    className="w-20"
                                    data-testid={`input-quantity-${index}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={(e) =>
                                      updateItemUnitPrice(
                                        index,
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    min="0"
                                    step="0.01"
                                    className="w-28"
                                    data-testid={`input-unit-price-${index}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {new Intl.NumberFormat("ko-KR", {
                                    style: "currency",
                                    currency: "KRW",
                                  }).format(item.total)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(index)}
                                    data-testid={`button-remove-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Summary Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      {t("purchases.orderSummary")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{t("purchases.subtotal")}</span>
                        <span
                          className="font-medium"
                          data-testid="text-subtotal"
                        >
                          {new Intl.NumberFormat("ko-KR", {
                            style: "currency",
                            currency: "KRW",
                          }).format(subtotal)}
                        </span>
                      </div>
                      {tax > 0 && (
                        <div className="flex justify-between">
                          <span>{t("purchases.tax")}</span>
                          <span className="font-medium" data-testid="text-tax">
                            {new Intl.NumberFormat("ko-KR", {
                              style: "currency",
                              currency: "KRW",
                            }).format(tax)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>{t("purchases.totalCost")}</span>
                        <span data-testid="text-total">
                          {new Intl.NumberFormat("ko-KR", {
                            style: "currency",
                            currency: "KRW",
                          }).format(total)}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {/* Form Actions */}
                    <div className="space-y-2">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={saveMutation.isPending}
                        data-testid="button-submit"
                      >
                        {saveMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {t("common.saving")}
                          </div>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            {isEditMode
                              ? t("common.update")
                              : t("common.create")}
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate("/purchases")}
                        data-testid="button-cancel"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t("common.cancel")}
                      </Button>
                    </div>

                    {/* Order Info */}
                    <Separator />
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>{t("purchases.items")}:</span>
                        <span data-testid="text-item-count">
                          {selectedItems.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("purchases.totalQuantity")}:</span>
                        <span data-testid="text-total-quantity">
                          {selectedItems.reduce(
                            (sum, item) => sum + item.quantity,
                            0,
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>

        {/* New Product Dialog */}
        <Dialog
          open={isNewProductDialogOpen}
          onOpenChange={setIsNewProductDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("inventory.addProduct")}</DialogTitle>
              <DialogDescription>
                {t("inventory.addProductDescription") ||
                  "Create a new product for your inventory"}
              </DialogDescription>
            </DialogHeader>
            <Form {...newProductForm}>
              <form
                onSubmit={newProductForm.handleSubmit(handleCreateNewProduct)}
                className="space-y-4"
              >
                <FormField
                  control={newProductForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.name")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            t("inventory.productNamePlaceholder") ||
                            "Enter product name"
                          }
                          {...field}
                          data-testid="input-product-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={newProductForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.sku")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            t("inventory.skuPlaceholder") ||
                            "Enter SKU (optional)"
                          }
                          {...field}
                          data-testid="input-product-sku"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={newProductForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.category")}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue
                              placeholder={
                                t("inventory.selectCategory") ||
                                "Select category"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category: any) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={newProductForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.unitPrice")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-product-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={newProductForm.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.currentStock")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          data-testid="input-product-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={newProductForm.control}
                  name="trackInventory"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t("inventory.trackInventory")}</FormLabel>
                        <FormDescription>
                          {t("inventory.trackInventoryDescription") ||
                            "Track stock levels for this product"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-track-inventory"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewProductDialogOpen(false)}
                    className="flex-1"
                    data-testid="button-cancel-new-product"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    className="flex-1"
                    data-testid="button-create-product"
                  >
                    {createProductMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t("common.creating")}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t("common.create")}
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}