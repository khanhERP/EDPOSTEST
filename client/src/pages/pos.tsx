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

    // Prepare cart items with proper data types and validation
    const cartItemsBeforeCheckout = cart.map(item => {
      // Ensure price is a number
      let itemPrice = item.price;
      if (typeof itemPrice === 'string') {
        itemPrice = parseFloat(itemPrice);
      }
      if (isNaN(itemPrice) || itemPrice <= 0) {
        itemPrice = 0;
      }

      // Ensure quantity is a positive integer
      let itemQuantity = item.quantity;
      if (typeof itemQuantity === 'string') {
        itemQuantity = parseInt(itemQuantity);
      }
      if (isNaN(itemQuantity) || itemQuantity <= 0) {
        itemQuantity = 1;
      }

      // Ensure taxRate is a number
      let itemTaxRate = item.taxRate;
      if (typeof itemTaxRate === 'string') {
        itemTaxRate = parseFloat(itemTaxRate);
      }
      if (isNaN(itemTaxRate)) {
        itemTaxRate = 10; // Default 10%
      }

      return {
        id: item.id,
        name: item.name || `Product ${item.id}`,
        price: itemPrice,
        quantity: itemQuantity,
        sku: item.sku || `ITEM${String(item.id).padStart(3, '0')}`,
        taxRate: itemTaxRate
      };
    });

    console.log("✅ Processed cart items:", cartItemsBeforeCheckout);

    // Validate processed items
    const invalidItems = cartItemsBeforeCheckout.filter(item => 
      !item.id || !item.name || item.price <= 0 || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      console.error("❌ Invalid items found after processing:", invalidItems);
      alert("Có sản phẩm không hợp lệ trong giỏ hàng. Vui lòng kiểm tra lại.");
      return;
    }

    // Set cart items before checkout to ensure they're available for receipt modal
    setLastCartItems([...cartItemsBeforeCheckout]); // Use spread to ensure new array reference

    console.log("✅ Cart items validation passed, processing checkout...");

    try {
      const receipt = await processCheckout(paymentData);
      if (receipt) {
        console.log("✅ Receipt processed successfully");
        console.log("✅ Opening receipt modal with cartItems:", cartItemsBeforeCheckout.length, "items");
        setShowReceiptModal(true);
      } else {
        console.error("❌ Failed to process checkout - no receipt returned");
        alert("Lỗi thanh toán. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("❌ Checkout process failed:", error);
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