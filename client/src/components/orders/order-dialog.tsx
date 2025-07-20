import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const queryClient = useQueryClient();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => apiRequest('/api/orders', orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "주문 완료",
        description: "주문이 성공적으로 접수되었습니다.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "주문 실패",
        description: "주문 접수에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const filteredProducts = products ? (products as Product[]).filter((product: Product) =>
    !selectedCategory || product.categoryId === selectedCategory
  ) : [];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const updateItemNotes = (productId: number, notes: string) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (Number(item.product.price) * item.quantity), 0);
  };

  const handleSubmitOrder = () => {
    if (!table || cart.length === 0) return;

    const subtotal = calculateTotal();
    const tax = subtotal * 0.1; // 10% 세금
    const total = subtotal + tax;

    const orderNumber = `ORD-${Date.now()}`;

    const orderData = {
      order: {
        orderNumber,
        tableId: table.id,
        customerName: customerName || null,
        customerCount,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: "pending",
        paymentStatus: "pending",
        notes: null,
      },
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: (Number(item.product.price) * item.quantity).toFixed(2),
        notes: item.notes || null,
      })),
    };

    createOrderMutation.mutate(orderData);
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
            {table.tableNumber} 테이블 주문
          </DialogTitle>
          <DialogDescription>
            테이블 정원: {table.capacity}명 | 메뉴를 선택하여 주문하세요
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
                    <Label htmlFor="customerName">고객명 (선택사항)</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="고객명을 입력하세요"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerCount">인원수</Label>
                    <Input
                      id="customerCount"
                      type="number"
                      min={1}
                      max={table.capacity}
                      value={customerCount}
                      onChange={(e) => setCustomerCount(parseInt(e.target.value) || 1)}
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
                전체
              </Button>
              {Array.isArray(categories) && categories.map((category: Category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
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
                <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3" onClick={() => addToCart(product)}>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{product.sku}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-blue-600">₩{Number(product.price).toLocaleString()}</span>
                        <Badge variant={Number(product.stock) > 0 ? "default" : "destructive"}>
                          재고 {product.stock}
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
              <h3 className="text-lg font-semibold">주문 내역</h3>
              <Badge variant="secondary">{cart.length}개 상품</Badge>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>선택된 메뉴가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-80">
                {cart.map((item) => (
                  <Card key={item.product.id}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-sm">{item.product.name}</h4>
                          <span className="text-sm font-bold">
                            ₩{(Number(item.product.price) * item.quantity).toLocaleString()}
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
                          placeholder="특별 요청사항"
                          value={item.notes || ""}
                          onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
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
                    <span>소계</span>
                    <span>₩{calculateTotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>세금 (10%)</span>
                    <span>₩{Math.round(calculateTotal() * 0.1).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>총합</span>
                    <span>₩{Math.round(calculateTotal() * 1.1).toLocaleString()}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmitOrder} 
                  className="w-full"
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? "주문 중..." : "주문하기"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}