import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Table, Product, Category } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table | null;
  existingOrder?: any;
  mode?: "create" | "edit";
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export function OrderDialog({ open, onOpenChange, table, existingOrder, mode = "create" }: OrderDialogProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerCount, setCustomerCount] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: existingOrderItems, refetch: refetchExistingItems } = useQuery({
    queryKey: ['/api/order-items', existingOrder?.id],
    enabled: !!(existingOrder?.id && mode === "edit" && open),
    staleTime: 0,
    queryFn: async () => {
      console.log('Fetching existing order items for order:', existingOrder.id);
      const response = await apiRequest('GET', `/api/order-items/${existingOrder.id}`);
      const data = await response.json();
      console.log('Existing order items response:', data);
      return data;
    },
  });

  // Refetch existing items when dialog opens in edit mode
  useEffect(() => {
    if (mode === "edit" && open && existingOrder?.id) {
      console.log('Dialog opened in edit mode, refetching existing items');
      refetchExistingItems();
    }
  }, [mode, open, existingOrder?.id, refetchExistingItems]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: { order: any; items: any[] }) => {
      console.log(mode === "edit" ? "Updating order with data:" : "Creating order with data:", orderData);
      if (mode === "edit" && existingOrder) {
        // For edit mode, we add new items to the existing order
        return apiRequest("POST", `/api/orders/${existingOrder.id}/items`, { items: orderData.items });
      } else {
        // For create mode, create a new order
        return apiRequest("POST", "/api/orders", orderData);
      }
    },
    onSuccess: (response) => {
      console.log(mode === "edit" ? "Order updated successfully:" : "Order created successfully:", response);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-items"] });
      setCart([]);
      setCustomerName("");
      setCustomerCount(1);
      setExistingItems([]);
      onOpenChange(false);
      toast({
        title: mode === "edit" ? "Cập nhật đơn hàng" : t("orders.orderPlaced"),
        description: mode === "edit" ? "Đã thêm món mới vào đơn hàng" : t("orders.orderPlacedSuccess"),
      });
    },
    onError: (error: any) => {
      console.error("Order creation error:", error);
      toast({
        title: t("common.error"),
        description: error.response?.data?.message || t("orders.orderFailed"),
        variant: "destructive",
      });
    },
  });

  const filteredProducts = products
    ? (products as Product[]).filter(
        (product: Product) =>
          !selectedCategory || product.categoryId === selectedCategory,
      )
    : [];

  const addToCart = (product: Product) => {
    // Check if product is out of stock
    if (product.stock <= 0) {
      toast({
        title: t("common.error"),
        description: `${product.name} đã hết hàng`,
        variant: "destructive",
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        // Check if adding one more would exceed stock
        if (existing.quantity >= product.stock) {
          toast({
            title: t("common.warning"),
            description: `Chỉ còn ${product.stock} ${product.name} trong kho`,
            variant: "destructive",
          });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const updateItemNotes = (productId: number, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes } : item,
      ),
    );
  };

  const calculateTotal = () => {
    return cart.reduce(
      (total, item) => total + Number(item.product.price) * item.quantity,
      0,
    );
  };

  const calculateTax = () => {
    return calculateTotal() * 0.1;
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateTax();
  };

  const handlePlaceOrder = () => {
    if (!table || cart.length === 0) return;

    if (mode === "edit" && existingOrder) {
      // For edit mode, only send the new items to be added
      const items = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price.toString(),
        total: (item.product.price * item.quantity).toString(),
        notes: item.notes || null,
      }));

      console.log("Adding items to existing order:", { items });
      createOrderMutation.mutate({ order: existingOrder, items });
    } else {
      // Create mode - original logic
      const orderNumber = `ORD-${Date.now()}`;
      const subtotalAmount = cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      const taxAmount = subtotalAmount * 0.1; // 10% tax
      const totalAmount = subtotalAmount + taxAmount;

      const order = {
        orderNumber,
        tableId: table.id,
        employeeId: 1, // Default employee ID
        customerName: customerName || null,
        customerCount,
        subtotal: subtotalAmount.toString(),
        tax: taxAmount.toString(),
        total: totalAmount.toString(),
        status: "pending",
        paymentStatus: "pending",
        orderedAt: new Date().toISOString(),
      };

      const items = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price.toString(),
        total: (item.product.price * item.quantity).toString(),
        notes: item.notes || null,
      }));

      console.log("Placing order:", { order, items });
      createOrderMutation.mutate({ order, items });
    }
  };

  const handleClose = () => {
    setCart([]);
    setCustomerName("");
    setCustomerCount(1);
    setSelectedCategory(null);
    // Only clear existing items if we're not in edit mode
    if (mode !== "edit") {
      setExistingItems([]);
    }
    onOpenChange(false);
  };

  useEffect(() => {
    if (table && open) {
      if (mode === "edit" && existingOrder) {
        setCustomerName(existingOrder.customerName || "");
        setCustomerCount(existingOrder.customerCount || 1);
      } else {
        setCustomerCount(Math.min(table.capacity, 1));
      }
    }
  }, [table, open, mode, existingOrder]);

  useEffect(() => {
    if (mode === "edit" && existingOrderItems && Array.isArray(existingOrderItems)) {
      console.log('Setting existing items:', existingOrderItems);
      setExistingItems(existingOrderItems);
    } else if (mode === "edit" && open && existingOrder?.id) {
      // Clear existing items when dialog opens in edit mode but no data yet
      setExistingItems([]);
    }
  }, [mode, existingOrderItems, open, existingOrder?.id]);

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {mode === "edit" ? `Chỉnh sửa đơn hàng - Bàn ${table.tableNumber}` : `Bàn ${table.tableNumber}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" 
              ? `Đơn hàng ${existingOrder?.orderNumber} | Thêm món hoặc chỉnh sửa số lượng`
              : `${t("tables.tableCapacity")}: ${table.capacity}${t("orders.people")} | ${t("tables.selectMenuToOrder")}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Menu Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Info */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">
                      {t("tables.customerName")} ({t("tables.optional")})
                    </Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={t("tables.customerNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerCount">
                      {t("tables.customerCount")}
                    </Label>
                    <Input
                      id="customerCount"
                      type="number"
                      min={1}
                      max={table.capacity}
                      value={customerCount}
                      onChange={(e) =>
                        setCustomerCount(parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                {t("tables.allCategories")}
              </Button>
              {Array.isArray(categories) &&
                categories.map((category: Category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="whitespace-nowrap"
                  >
                    {category.name}
                  </Button>
                ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-96">
              {filteredProducts.map((product: Product) => (
                <Card
                  key={product.id}
                  className={`transition-shadow ${
                    Number(product.stock) > 0
                      ? "cursor-pointer hover:shadow-md"
                      : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <CardContent
                    className="p-3"
                    onClick={() => Number(product.stock) > 0 && addToCart(product)}
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {product.sku}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className={`font-bold ${
                          Number(product.stock) > 0 ? "text-blue-600" : "text-gray-400"
                        }`}>
                          {Number(product.price).toLocaleString()} ₫
                        </span>
                        <Badge
                          variant={
                            Number(product.stock) > 0
                              ? "default"
                              : "destructive"
                          }
                        >
                          {Number(product.stock) > 0 
                            ? `${t("tables.stockCount")} ${product.stock}`
                            : "Hết hàng"
                          }
                        </Badge>
                      </div>
                      {Number(product.stock) === 0 && (
                        <div className="text-xs text-red-500 font-medium">
                          Sản phẩm hiện đang hết hàng
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {mode === "edit" ? "Món đã gọi & Món mới" : t("tables.orderHistory")}
              </h3>
              <Badge variant="secondary">
                {mode === "edit" ? `${existingItems.length + cart.length} món` : `${cart.length}${t("tables.itemsSelected")}`}
              </Badge>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {/* Existing Items (Edit Mode Only) */}
              {mode === "edit" && existingItems.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600">Món đã gọi trước đó:</h4>
                    {existingItems.map((item, index) => (
                      <Card key={`existing-${index}`} className="bg-gray-50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-sm">{item.productName}</h4>
                              <p className="text-xs text-gray-500">Đã gọi</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold">
                                {(Number(item.total)).toLocaleString()} ₫
                              </span>
                              <p className="text-xs text-gray-500">x{item.quantity}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {cart.length > 0 && <Separator />}
                  {cart.length > 0 && (
                    <h4 className="text-sm font-medium text-gray-600">Món mới thêm:</h4>
                  )}
                </>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{t("tables.noItemsSelected")}</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-3">
                  {cart.map((item) => (
                    <Card key={item.product.id}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm">
                              {item.product.name}
                            </h4>
                            <span className="text-sm font-bold">
                              {(
                                Number(item.product.price) * item.quantity
                              ).toLocaleString()} ₫
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFromCart(item.product.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addToCart(item.product)}
                                className="h-6 w-6 p-0"
                                disabled={item.quantity >= item.product.stock}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <span className="text-xs text-gray-500">
                              @{Number(item.product.price).toLocaleString()} ₫
                            </span>
                          </div>

                          <Textarea
                            placeholder={t("tables.specialRequests")}
                            value={item.notes || ""}
                            onChange={(e) =>
                              updateItemNotes(item.product.id, e.target.value)
                            }
                            className="text-xs h-16"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          </div>
        </div>

        {/* Summary Footer Container - Below main content */}
        {cart.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              {/* Summary items in horizontal layout */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{t("tables.subtotalLabel")}</span>
                  <span className="font-medium">{calculateTotal().toLocaleString()} ₫</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{t("tables.taxLabel")}</span>
                  <span className="font-medium">{Math.round(calculateTax()).toLocaleString()} ₫</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-bold">{t("tables.totalLabel")}</span>
                  <span className="font-bold text-lg text-blue-600">
                    {Math.round(calculateGrandTotal()).toLocaleString()} ₫
                  </span>
                </div>
              </div>
              
              {/* Action button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending
                  ? (mode === "edit" ? "Đang cập nhật..." : t("tables.placing"))
                  : (mode === "edit" ? "Cập nhật đơn hàng" : t("tables.placeOrder"))}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
      </DialogContent>
    </Dialog>
  );
}
