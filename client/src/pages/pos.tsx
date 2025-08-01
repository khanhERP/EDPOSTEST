import { useState } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { CategorySidebar } from "@/components/pos/category-sidebar";
import { ProductGrid } from "@/components/pos/product-grid";
import { ShoppingCart } from "@/components/pos/shopping-cart";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { ProductManagerModal } from "@/components/pos/product-manager-modal";
import { usePOS } from "@/hooks/use-pos";

export default function POSPage() {
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showProductManagerModal, setShowProductManagerModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCartItems, setLastCartItems] = useState<any[]>([]);

  const {
    cart,
    orders,
    activeOrderId,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    createNewOrder,
    switchOrder,
    removeOrder,
    lastReceipt,
    isProcessingCheckout,
    processCheckout
  } = usePOS();

  const handleCheckout = async (paymentData: any) => {
    console.log("=== POS PAGE CHECKOUT DEBUG ===");
    console.log("Cart before checkout:", cart);
    console.log("Cart length:", cart.length);
    console.log("Cart items structure:", cart.map(item => ({
      id: item.id,
      name: item.name,
      price: typeof item.price,
      quantity: typeof item.quantity,
      sku: item.sku,
      taxRate: item.taxRate
    })));

    if (cart.length === 0) {
      console.error("❌ Cart is empty, cannot proceed with checkout");
      alert("Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.");
      return;
    }

    // Save cart items before checkout (BEFORE cart gets cleared)
    const cartItemsBeforeCheckout = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      quantity: item.quantity,
      sku: item.sku || `ITEM${String(item.id).padStart(3, '0')}`,
      taxRate: typeof item.taxRate === 'string' ? parseFloat(item.taxRate) : (item.taxRate || 10)
    }));

    console.log("✅ Cart items saved before checkout:", cartItemsBeforeCheckout);
    
    // Set cart items IMMEDIATELY before processing checkout
    setLastCartItems(cartItemsBeforeCheckout);

    // Double-check validation
    if (!cartItemsBeforeCheckout || cartItemsBeforeCheckout.length === 0) {
      console.error("❌ Failed to save cart items before checkout");
      alert("Lỗi: Không thể lưu thông tin sản phẩm. Vui lòng thử lại.");
      return;
    }

    // Additional validation for each item
    const invalidItems = cartItemsBeforeCheckout.filter(item => 
      !item.id || !item.name || !item.price || item.price <= 0 || !item.quantity || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      console.error("❌ Invalid items found:", invalidItems);
      alert("Có sản phẩm không hợp lệ trong giỏ hàng. Vui lòng kiểm tra lại.");
      return;
    }

    console.log("✅ All cart items validated successfully");

    const receipt = await processCheckout(paymentData);
    if (receipt) {
      console.log("✅ Receipt processed successfully");
      console.log("✅ Final lastCartItems set to:", cartItemsBeforeCheckout);
      console.log("✅ lastCartItems length:", cartItemsBeforeCheckout.length);
      
      setShowReceiptModal(true);
    } else {
      console.error("❌ Failed to process checkout");
      alert("Lỗi thanh toán. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-green-50 grocery-bg">
      {/* Header */}
      <POSHeader />

      {/* Right Sidebar */}
      <RightSidebar />

      <div className="main-content flex h-screen pt-16">
        {/* Category Sidebar */}
        <CategorySidebar
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenProductManager={() => setShowProductManagerModal(true)}
          onAddToCart={addToCart}
        />

        {/* Product Grid */}
        <ProductGrid
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onAddToCart={(product) => addToCart(product)}
        />

        {/* Shopping Cart */}
        <ShoppingCart
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          isProcessing={isProcessingCheckout}
          orders={orders}
          activeOrderId={activeOrderId}
          onCreateNewOrder={createNewOrder}
          onSwitchOrder={switchOrder}
          onRemoveOrder={removeOrder}
        />
      </div>

      {/* Modals */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          console.log("🔴 Closing receipt modal");
          setShowReceiptModal(false);
        }}
        receipt={lastReceipt}
        cartItems={lastCartItems}
      />

      <ProductManagerModal
        isOpen={showProductManagerModal}
        onClose={() => setShowProductManagerModal(false)}
      />
    </div>
  );
}