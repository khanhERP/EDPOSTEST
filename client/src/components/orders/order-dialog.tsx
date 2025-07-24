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
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export function OrderDialog({ open, onOpenChange, table }: OrderDialogProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerCount, setCustomerCount] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: { order: any; items: any[] }) => {
      console.log("Creating order with data:", orderData);
      return apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: (response) => {
      console.log("Order created successfully:", response);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-items"] });
      setCart([]);
      setCustomerName("");
      setCustomerCount(1);
      onOpenChange(false);
      toast({
        title: t("orders.orderPlaced"),
        description: t("orders.orderPlacedSuccess"),
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
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
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
      subtotal: subtotalAmount.toString(), // Add required subtotal field
      tax: taxAmount.toString(), // Add tax field
      total: totalAmount.toString(), // Convert to string as expected by schema
      status: "pending",
      paymentStatus: "pending", // Add required paymentStatus field
      orderedAt: new Date().toISOString(),
    };

    const items = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.product.price.toString(), // Convert to string
      total: (item.product.price * item.quantity).toString(), // Convert to string
      notes: item.notes || null,
    }));

    console.log("Placing order:", { order, items });
    createOrderMutation.mutate({ order, items });
  };

  const handleClose = () => {
    setCart([]);
    setCustomerName("");
    setCustomerCount(1);
    setSelectedCategory(null);
    onOpenChange(false);
  };

  useEffect(() => {
    if (table && open) {
      setCustomerCount(Math.min(table.capacity, 1));
    }
  }, [table, open]);

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {table.tableNumber}
          </DialogTitle>
          <DialogDescription>
            {t("orders.tableCapacity")}: {table.capacity}
            {t("orders.people")} | {t("tables.selectMenuToOrder")}
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
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent
                    className="p-3"
                    onClick={() => addToCart(product)}
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {product.sku}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-blue-600">
                          ₩{Number(product.price).toLocaleString()}
                        </span>
                        <Badge
                          variant={
                            Number(product.stock) > 0
                              ? "default"
                              : "destructive"
                          }
                        >
                          {t("tables.stockCount")} {product.stock}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {t("tables.orderHistory")}
              </h3>
              <Badge variant="secondary">
                {cart.length}
                {t("tables.itemsSelected")}
              </Badge>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>{t("tables.noItemsSelected")}</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-80">
                {cart.map((item) => (
                  <Card key={item.product.id}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-sm">
                            {item.product.name}
                          </h4>
                          <span className="text-sm font-bold">
                            ₩
                            {(
                              Number(item.product.price) * item.quantity
                            ).toLocaleString()}
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
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-gray-500">
                            @₩{Number(item.product.price).toLocaleString()}
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

            {cart.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("tables.subtotalLabel")}</span>
                    <span>₩{calculateTotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("tables.taxLabel")}</span>
                    <span>₩{Math.round(calculateTax()).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>{t("tables.totalLabel")}</span>
                    <span>
                      ₩{Math.round(calculateGrandTotal()).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  className="w-full"
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending
                    ? t("tables.placing")
                    : t("tables.placeOrder")}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
