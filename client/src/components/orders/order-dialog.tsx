import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

export function OrderDialog({
  open,
  onOpenChange,
  table,
  existingOrder,
  mode = "create",
}: OrderDialogProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerCount, setCustomerCount] = useState(1);
  const [discount, setDiscount] = useState(0);
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
    queryKey: ["/api/order-items", existingOrder?.id],
    enabled: !!(existingOrder?.id && mode === "edit" && open),
    staleTime: 0,
    queryFn: async () => {
      console.log("Fetching existing order items for order:", existingOrder.id);
      const response = await apiRequest(
        "GET",
        `/api/order-items/${existingOrder.id}`,
      );
      const data = await response.json();
      console.log("Existing order items response:", data);
      return data;
    },
  });

  // Refetch existing items when dialog opens in edit mode
  useEffect(() => {
    if (mode === "edit" && open && existingOrder?.id) {
      console.log("Dialog opened in edit mode, refetching existing items");
      refetchExistingItems();
    }
  }, [mode, open, existingOrder?.id, refetchExistingItems]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: { order: any; items: any[] }) => {
      console.log('=== ORDER MUTATION STARTED ===');
      console.log('Mode:', mode);
      console.log('Existing order:', existingOrder);
      console.log(
        mode === "edit"
          ? "Updating existing order:"
          : "Creating new order:",
        JSON.stringify(orderData, null, 2),
      );

      try {
        if (mode === "edit" && existingOrder) {
          let finalResult = null;

          // Step 1: Add new items if any exist
          if (orderData.items.length > 0) {
            console.log(`📝 Adding ${orderData.items.length} new items to existing order ${existingOrder.id}`);
            const addItemsResponse = await apiRequest("POST", `/api/orders/${existingOrder.id}/items`, {
              items: orderData.items,
            });

            const addItemsResult = await addItemsResponse.json();
            console.log('✅ Items added successfully:', addItemsResult);
            finalResult = addItemsResult.updatedOrder || addItemsResult;
          } else {
            console.log(`📝 No new items to add to order ${existingOrder.id}, proceeding with order update only`);
          }

          // Step 2: Always update order with current UI calculated totals
          console.log(`📝 Updating order with current UI calculated totals for order ${existingOrder.id}`);

          // Get the calculated values from the UI functions
          const uiSubtotal = calculateTotal();    // Tiền tạm tính (đã tính đúng)
          const uiTax = calculateTax();           // Thuế (đã tính đúng)
          const uiGrandTotal = calculateGrandTotal(); // Tổng tiền (đã tính đúng)

          console.log('💰 Using UI calculated totals for update:', {
            subtotal: uiSubtotal,
            tax: uiTax,
            total: uiGrandTotal,
            hasNewItems: orderData.items.length > 0
          });

          // Step 3: Always update order with customer info AND UI calculated totals
          console.log(`📝 Updating order with customer info and UI calculated totals for order ${existingOrder.id}`);
          const updateResponse = await apiRequest("PUT", `/api/orders/${existingOrder.id}`, {
            customerName: orderData.order.customerName,
            customerCount: orderData.order.customerCount,
            subtotal: uiSubtotal.toString(),
            tax: uiTax.toString(),
            discount: discount.toString(),
            total: uiGrandTotal.toString(),
          });

          const updateResult = await updateResponse.json();
          console.log('✅ Order updated successfully with current totals:', updateResult);

          // Return the final result (prioritize the order update result)
          return updateResult;
        } else {
          console.log('📝 Creating new order...');
          const response = await apiRequest("POST", "/api/orders", orderData);

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to create order: ${errorData}`);
          }

          const result = await response.json();
          console.log('✅ Order created successfully:', result);
          return result;
        }
      } catch (error) {
        console.error('=== ORDER MUTATION ERROR ===');
        console.error('Error details:', error);
        throw error;
      }
    },
    onSuccess: (response) => {
      console.log('=== ORDER MUTATION SUCCESS (SINGLE CALL) ===');
      console.log(
        mode === "edit"
          ? "Order updated successfully (no duplicates):"
          : "Order created successfully:",
        response,
      );

      // Only invalidate - let React Query handle refetch naturally (no forced refetch)
      console.log('🔄 Invalidating queries (natural refresh only)...');
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-items"] });

      // Reset form state
      setCart([]);
      setCustomerName("");
      setCustomerCount(1);
      setDiscount(0);
      setExistingItems([]);
      onOpenChange(false);

      toast({
        title: t('orders.orderUpdateSuccess'),
        description: mode === "edit" ? "Đã cập nhật đơn hàng thành công" : t('orders.orderUpdateSuccessDesc'),
      });

      console.log('✅ Order mutation completed - proper update flow executed');
    },
    onError: (error: any) => {
      console.error('=== ORDER MUTATION ERROR ===');
      console.error("Full error object:", error);
      console.error("Error message:", error.message);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);

      let errorMessage = t("orders.orderFailed");

      if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: t("common.error"),
        description: mode === "edit" ? `Lỗi cập nhật đơn hàng: ${errorMessage}` : `Lỗi tạo đơn hàng: ${errorMessage}`,
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
    // Tính subtotal (tiền tạm tính - trước thuế) cho cart items
    const cartSubtotal = cart.reduce(
      (total, item) => {
        const preTaxPrice = parseFloat(item.product.price); // Giá trước thuế
        const itemSubtotal = preTaxPrice * item.quantity;
        return total + itemSubtotal;
      },
      0,
    );

    // In edit mode, add existing items subtotal (pre-tax)
    const existingSubtotal =
      mode === "edit" && existingItems.length > 0
        ? existingItems.reduce((total, item) => {
            // Use unitPrice * quantity for existing items (tiền tạm tính)
            const preTaxAmount = Number(item.unitPrice || 0) * Number(item.quantity || 0);
            return total + preTaxAmount;
          }, 0)
        : 0;

    return cartSubtotal + existingSubtotal; // Trả về subtotal (tiền tạm tính)
  };

  const calculateTax = () => {
    let totalTax = 0; // Tổng thuế

    // Calculate tax for items in the current cart
    cart.forEach((item) => {
      const product = products?.find((p: Product) => p.id === item.product.id);
      let itemTax = 0;

      // Thuế = (after_tax_price - price) * quantity
      if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
        const afterTaxPrice = parseFloat(product.afterTaxPrice); // Giá sau thuế
        const preTaxPrice = parseFloat(product.price);           // Giá trước thuế
        const taxPerUnit = Math.max(0, afterTaxPrice - preTaxPrice); // Thuế trên đơn vị
        itemTax = taxPerUnit * item.quantity;
      }
      // Không có thuế nếu không có afterTaxPrice

      totalTax += itemTax;
    });

    // Calculate tax for existing items in edit mode
    if (mode === "edit" && existingItems.length > 0) {
      existingItems.forEach((item) => {
        const product = products?.find((p: Product) => p.id === item.productId);
        let itemTax = 0;

        // Thuế = (after_tax_price - unitPrice) * quantity
        if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const preTaxPrice = Number(item.unitPrice || 0); // Sử dụng unitPrice từ order item
          const taxPerUnit = Math.max(0, afterTaxPrice - preTaxPrice);
          itemTax = taxPerUnit * item.quantity;
        }

        totalTax += itemTax;
      });
    }

    return totalTax;
  };


  const calculateGrandTotal = () => {
    const beforeDiscount = calculateTotal() + calculateTax();
    return Math.max(0, beforeDiscount - discount);
  };

  const handlePlaceOrder = async () => {
    // For edit mode, allow update even with empty cart
    // In create mode, require items in cart
    if (!table || (mode !== "edit" && cart.length === 0)) return;

    if (mode === "edit" && existingOrder) {
      // Check for various types of changes
      const hasNewItems = cart.length > 0;
      const hasRemovedItems = existingItems.some(item => item.quantity === 0);
      const hasCustomerNameChange = (customerName || "") !== (existingOrder.customerName || "");
      const hasCustomerCountChange = customerCount !== (existingOrder.customerCount || 1);

      const hasAnyChanges = hasNewItems || hasRemovedItems || hasCustomerNameChange || hasCustomerCountChange;

      console.log('📝 Order Dialog: Update attempt - Changes detected:', {
        hasNewItems,
        hasRemovedItems,
        hasCustomerNameChange,
        hasCustomerCountChange,
        hasAnyChanges,
        cartLength: cart.length
      });

      // Always allow update to proceed - user wants to refresh/update order data
      console.log('📝 Order Dialog: Processing order update:', {
        hasNewItems,
        hasRemovedItems,
        hasCustomerNameChange,
        hasCustomerCountChange,
        hasAnyChanges,
        allowUpdate: true,
        cartItemsCount: cart.length
      });


      // For edit mode, handle both new items and order updates
      const items = cart.map((item) => {
        const product = products?.find((p: Product) => p.id === item.product.id);
        const basePrice = parseFloat(item.product.price.toString());
        const quantity = item.quantity;
        const itemSubtotal = basePrice * quantity;

        let itemTax = 0;
        // Tax = (after_tax_price - price) * quantity
        if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const taxPerUnit = afterTaxPrice - basePrice;
          itemTax = (taxPerUnit * quantity);
        }

        const itemTotal = itemSubtotal + itemTax;

        console.log(`📝 Order Dialog: Processing cart item ${item.product.name}:`, {
          productId: item.product.id,
          quantity: item.quantity,
          basePrice,
          itemTax,
          itemTotal
        });

        return {
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: basePrice.toString(),
          total: itemTotal.toString(),
          notes: item.notes || null,
        };
      });

      // Include updated order information
      const updatedOrder = {
        ...existingOrder,
        customerName: customerName || null,
        customerCount: parseInt(customerCount.toString()) || 1,
        discount: discount.toString(),
      };

      console.log("📝 Processing order update:", {
        orderId: existingOrder.id,
        hasNewItems: items.length > 0,
        hasCustomerChanges: hasCustomerNameChange || hasCustomerCountChange,
        customerUpdates: {
          name: customerName,
          count: customerCount
        },
        totalItems: items.length,
        proceedWithUpdate: true
      });

      // Always proceed with mutation - either adding items or updating customer info
      createOrderMutation.mutate({ order: updatedOrder, items });
    } else {
      // Create mode - calculate with correct mapping
      const orderNumber = `ORD-${Date.now()}`;

      // Subtotal = tiền tạm tính (giá trước thuế * số lượng)
      const subtotalAmount = cart.reduce(
        (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
        0,
      );

      // Tax = thuế (sử dụng calculateTax function)
      const taxAmount = calculateTax();

      // Total = tổng tiền (subtotal + tax)
      const totalAmount = subtotalAmount + taxAmount;

      const order = {
        orderNumber: `ORD-${Date.now()}`,
        tableId: table.id,
        employeeId: null, // Set to null since no employees exist
        customerName: customerName || null,
        customerCount: parseInt(customerCount) || 1,
        subtotal: subtotalAmount.toString(),
        tax: taxAmount.toString(),
        discount: discount.toString(),
        total: Math.max(0, totalAmount - discount).toString(),
        status: "served",
        paymentStatus: "pending",
        orderedAt: new Date().toISOString(),
      };

      const items = cart.map((item) => {
        const product = products?.find((p: Product) => p.id === item.product.id);
        const basePrice = item.product.price;
        const quantity = item.quantity;
        const itemSubtotal = basePrice * quantity;

        let itemTax = 0;
        // Tax = (after_tax_price - price) * quantity
        if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const price = parseFloat(product.price);
          itemTax = (afterTaxPrice - price) * quantity;
        }
        // No tax if no afterTaxPrice in database

        const itemTotal = itemSubtotal + itemTax;

        return {
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price.toString(),
          total: itemTotal.toString(),
          notes: item.notes || null,
        };
      });

      console.log("Placing order:", { order, items });
      createOrderMutation.mutate({ order, items });
    }
  };

  const handleClose = () => {
    setCart([]);
    setCustomerName("");
    setCustomerCount(1);
    setDiscount(0);
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
        setDiscount(parseFloat(existingOrder.discount || "0"));
      } else {
        setCustomerCount(Math.min(table.capacity, 1));
        setDiscount(0);
      }
    }
  }, [table, open, mode, existingOrder]);

  useEffect(() => {
    if (
      mode === "edit" &&
      existingOrderItems &&
      Array.isArray(existingOrderItems)
    ) {
      console.log("Setting existing items:", existingOrderItems);
      setExistingItems(existingOrderItems);
    } else if (mode === "edit" && open && existingOrder?.id) {
      // Clear existing items when dialog opens in edit mode but no data yet
      setExistingItems([]);
    }
  }, [mode, existingOrderItems, open, existingOrder?.id]);

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {mode === "edit"
              ? `${t("orders.editOrderTitle")} ${table.tableNumber}`
              : `Bàn ${table.tableNumber}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? t("orders.editOrderDesc").replace("{orderNumber}", existingOrder?.orderNumber || "")
              : `${t("tables.tableCapacity")}: ${table.capacity}${t("orders.people")} | ${t("tables.selectMenuToOrder")}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Menu Selection */}
          <div className="lg:col-span-2 space-y-4 flex flex-col min-h-0">
            {/* Customer Info */}
            <Card className="flex-shrink-0">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <Label htmlFor="discount">
                      Giảm giá (₫)
                    </Label>
                    <Input
                      id="discount"
                      type="text"
                      value={discount > 0 ? discount.toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, ''); // Chỉ giữ lại số
                        setDiscount(parseFloat(value) || 0);
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0">
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
            <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 min-h-0">
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
                    onClick={() =>
                      Number(product.stock) > 0 && addToCart(product)
                    }
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {product.sku}
                      </p>
                      <div className="flex justify-between items-center">
                        <span
                          className={`font-bold ${
                            Number(product.stock) > 0
                              ? "text-blue-600"
                              : "text-gray-400"
                          }`}
                        >
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
                            : "Hết hàng"}
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
          <div className="flex flex-col min-h-0 h-full">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold">
                {mode === "edit"
                  ? t("orders.itemsAndNewItems")
                  : t("tables.orderHistory")}
              </h3>
              <Badge variant="secondary">
                {mode === "edit"
                  ? `${existingItems.length + cart.length} ${t("common.items")}`
                  : `${cart.length}${t("tables.itemsSelected")}`}
              </Badge>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
              {/* Existing Items (Edit Mode Only) */}
              {mode === "edit" && existingItems.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600">
                      {t("orders.previouslyOrdered")}
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {existingItems.map((item, index) => (
                        <Card key={`existing-${index}`} className="bg-gray-50">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {item.productName}
                                </h4>
                                <p className="text-xs text-gray-500">{t("orders.alreadyOrdered")}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="text-sm font-bold">
                                    {Math.floor(Number(item.total)).toLocaleString()} ₫
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    x{item.quantity}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa "${item.productName}" khỏi đơn hàng?`)) {
                                      // Remove item from existing items list
                                      setExistingItems(prev => prev.filter((_, i) => i !== index));

                                      // Call API to delete the order item
                                      apiRequest('DELETE', `/api/order-items/${item.id}`)
                                        .then(async () => {
                                          console.log('🗑️ Order Dialog: Successfully deleted item:', item.productName);

                                          toast({
                                            title: "Xóa món thành công",
                                            description: `Đã xóa "${item.productName}" khỏi đơn hàng`,
                                          });

                                          // Recalculate order total if this is an existing order
                                          if (existingOrder?.id) {
                                            try {
                                              console.log('🧮 Order Dialog: Starting order total recalculation for order:', existingOrder.id);

                                              // Fetch current order items after deletion
                                              const response = await apiRequest('GET', `/api/order-items/${existingOrder.id}`);
                                              const remainingItems = await response.json();

                                              console.log('📦 Order Dialog: Remaining items after deletion:', remainingItems?.length || 0);

                                              // Calculate new total based on remaining items
                                              let newSubtotal = 0;
                                              let newTax = 0;

                                              if (Array.isArray(remainingItems) && remainingItems.length > 0) {
                                                remainingItems.forEach((remainingItem: any) => {
                                                  const basePrice = Number(remainingItem.unitPrice || 0);
                                                  const quantity = Number(remainingItem.quantity || 0);
                                                  const product = products?.find((p: any) => p.id === remainingItem.productId);

                                                  // Calculate subtotal
                                                  newSubtotal += basePrice * quantity;

                                                  // Calculate tax using Math.floor((after_tax_price - price) * quantity)
                                                  if (
                                                    product?.afterTaxPrice &&
                                                    product.afterTaxPrice !== null &&
                                                    product.afterTaxPrice !== ""
                                                  ) {
                                                    const afterTaxPrice = parseFloat(product.afterTaxPrice);
                                                    const taxPerUnit = afterTaxPrice - basePrice;
                                                    newTax += Math.floor(taxPerUnit * quantity);
                                                  }
                                                });
                                              }
                                              // If no items left, totals should be 0
                                              else {
                                                console.log('📝 Order Dialog: No items left, setting totals to zero');
                                                newSubtotal = 0;
                                                newTax = 0;
                                              }

                                              const newTotal = newSubtotal + newTax;

                                              console.log('💰 Order Dialog: Calculated new totals:', {
                                                newSubtotal,
                                                newTax,
                                                newTotal,
                                                itemsCount: remainingItems?.length || 0
                                              });

                                              // Update order with new totals
                                              apiRequest('PUT', `/api/orders/${existingOrder.id}`, {
                                                subtotal: newSubtotal.toString(),
                                                tax: newTax.toString(),
                                                total: newTotal.toString()
                                              }).then(() => {
                                                console.log('✅ Order Dialog: Order totals updated successfully');

                                                // Force refresh of all related data to ensure UI updates immediately
                                                Promise.all([
                                                  queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
                                                  queryClient.invalidateQueries({ queryKey: ["/api/tables"] }),
                                                  queryClient.invalidateQueries({ queryKey: ["/api/order-items"] }),
                                                  queryClient.invalidateQueries({ queryKey: ["/api/order-items", existingOrder.id] })
                                                ]).then(() => {
                                                  // Force immediate refetch to update table grid display
                                                  return Promise.all([
                                                    queryClient.refetchQueries({ queryKey: ["/api/orders"] }),
                                                    queryClient.refetchQueries({ queryKey: ["/api/tables"] })
                                                  ]);
                                                });
                                              });

                                              console.log('🔄 Order Dialog: All queries refreshed successfully');

                                            } catch (error) {
                                              console.error('❌ Order Dialog: Error recalculating order total:', error);
                                              toast({
                                                title: "Cảnh báo",
                                                description: "Món đã được xóa nhưng có lỗi khi cập nhật tổng tiền",
                                                variant: "destructive",
                                              });
                                            }
                                          }

                                          // Invalidate queries to refresh data
                                          queryClient.invalidateQueries({ queryKey: ["/api/order-items"] });
                                          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                                        })
                                        .catch((error) => {
                                          console.error('Error deleting order item:', error);
                                          // Restore the item if deletion failed
                                          setExistingItems(prev => [...prev.slice(0, index), item, ...prev.slice(index)]);
                                          toast({
                                            title: "Lỗi xóa món",
                                            description: "Không thể xóa món khỏi đơn hàng",
                                            variant: "destructive",
                                          });
                                        });
                                    }
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  {cart.length > 0 && <Separator />}
                  {cart.length > 0 && (
                    <h4 className="text-sm font-medium text-gray-550">
                      {t("orders.newItemsToAdd")}
                    </h4>
                  )}
                </>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{t("tables.noItemsSelected")}</p>
                </div>
              ) : (
                <div
                  className={`${mode === "edit" ? "max-h-[300px]" : "max-h-[520px]"} overflow-y-auto space-y-3`}
                >
                  {cart.map((item) => (
                    <Card key={item.product.id}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm">
                              {item.product.name}
                            </h4>
                            <span className="text-sm font-bold">
                              {Math.floor(
                                Number(item.product.price) * item.quantity
                              ).toLocaleString()}{" "}
                              ₫
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
                              {t("tables.unitPrice")}: {Number(item.product.price).toLocaleString()} ₫
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

        {/* DialogFooter with Summary and Order Button */}
        {(cart.length > 0 || (mode === "edit" && existingItems.length > 0) || (mode === "edit")) && (
          <DialogFooter className="pt-4 pb-2 flex-shrink-0 border-t bg-white">
            <div className="flex items-center justify-between w-full">
              {/* Summary items in horizontal layout */}
              <div className="flex items-center gap-4 text-sm flex-wrap">
                {mode === "edit" && existingItems.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{t("orders.previousItems")}</span>
                      <span className="font-medium">
                        {Math.floor(
                          existingItems
                            .reduce((total, item) => {
                              // Use unitPrice * quantity for existing items (pre-tax amount)
                              const itemSubtotal = Number(item.unitPrice || 0) * Number(item.quantity || 0);
                              return total + itemSubtotal;
                            }, 0)
                        ).toLocaleString()}{" "}
                        ₫
                      </span>
                    </div>
                    {cart.length > 0 && (
                      <div className="w-px h-4 bg-gray-300"></div>
                    )}
                  </>
                )}
                {cart.length > 0 && mode === "edit" && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{t("orders.newItems")}</span>
                      <span className="font-medium">
                        {Math.floor(
                          cart
                            .reduce(
                              (total, item) =>
                                total +
                                Number(item.product.price) * item.quantity,
                              0,
                            )
                        ).toLocaleString()}{" "}
                        ₫
                      </span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{t('orders.subtotal')}</span>
                  <span className="font-medium">
                    {Math.floor(calculateTotal()).toLocaleString()} ₫
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{t('orders.tax')}</span>
                  <span className="font-medium">
                    {Math.floor(calculateTax()).toLocaleString()} ₫
                  </span>
                </div>
                {discount > 0 && (
                  <>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Giảm giá</span>
                      <span className="font-medium text-red-600">
                        -{Math.floor(discount).toLocaleString()} ₫
                      </span>
                    </div>
                  </>
                )}
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-bold">
                    {t('orders.totalAmount')}
                  </span>
                  <span className="font-bold text-lg text-blue-600">
                    {Math.floor(calculateGrandTotal()).toLocaleString()} ₫
                  </span>
                </div>
              </div>

              {/* Action button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={createOrderMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 flex-shrink-0"
                size="lg"
              >
                {createOrderMutation.isPending
                  ? mode === "edit"
                    ? t("orders.updating")
                    : t("tables.placing")
                  : mode === "edit"
                    ? t("orders.updateOrder")
                    : t("tables.placeOrder")}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}