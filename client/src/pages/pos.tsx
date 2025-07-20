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
  
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    lastReceipt,
    isProcessingCheckout,
    processCheckout
  } = usePOS();

  const handleCheckout = async (paymentData: any) => {
    const receipt = await processCheckout(paymentData);
    if (receipt) {
      setShowReceiptModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <POSHeader />
      
      {/* Right Sidebar */}
      <RightSidebar />
      
      <div className="flex h-screen pt-16 pr-16">
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
          onAddToCart={addToCart}
        />

        {/* Shopping Cart */}
        <ShoppingCart
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          isProcessing={isProcessingCheckout}
        />
      </div>

      {/* Modals */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={lastReceipt}
      />

      <ProductManagerModal
        isOpen={showProductManagerModal}
        onClose={() => setShowProductManagerModal(false)}
      />
    </div>
  );
}
