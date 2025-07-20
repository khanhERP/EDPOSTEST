import { useQuery } from "@tanstack/react-query";
import { Grid3X3, List, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface ProductGridProps {
  selectedCategory: number | "all";
  searchQuery: string;
  onAddToCart: (productId: number) => void;
}

export function ProductGrid({ selectedCategory, searchQuery, onAddToCart }: ProductGridProps) {
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", { category: selectedCategory, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory.toString());
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock`,
        variant: "destructive",
      });
      return;
    }

    onAddToCart(product.id);
    toast({
      title: "Added to Cart",
      description: `${product.name} added to cart`,
    });
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: "Out of Stock", color: "text-red-500" };
    if (stock <= 5) return { text: `${stock} in stock`, color: "text-red-500" };
    if (stock <= 10) return { text: `${stock} in stock`, color: "text-orange-500" };
    return { text: `${stock} in stock`, color: "text-green-600" };
  };

  const getPopularBadge = (productName: string) => {
    // Mock logic for popular products
    const popularProducts = ["Premium Coffee", "Fresh Orange Juice"];
    return popularProducts.includes(productName);
  };

  const getLowStockBadge = (stock: number) => {
    return stock <= 5 && stock > 0;
  };

  if (isLoading) {
    return (
      <main className="flex-1 flex flex-col">
        <div className="bg-white p-4 border-b pos-border">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-material animate-pulse">
                <div className="w-full h-32 bg-gray-200 rounded-t-lg"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const getCategoryName = () => {
    if (selectedCategory === "all") return "All Products";
    // This would ideally come from the categories query
    const categoryNames: Record<number, string> = {
      1: "Beverages",
      2: "Snacks", 
      3: "Electronics",
      4: "Household",
      5: "Personal Care"
    };
    return categoryNames[selectedCategory as number] || "Products";
  };

  return (
    <main className="flex-1 flex flex-col">
      <div className="bg-white p-4 border-b pos-border flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium pos-text-primary">{getCategoryName()}</h2>
          <p className="text-sm pos-text-secondary">{products.length} products available</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="flex items-center">
            <Grid3X3 className="mr-2" size={16} />
            Grid View
          </Button>
          <Button variant="outline" size="sm" className="flex items-center">
            <ArrowUpDown className="mr-2" size={16} />
            Sort by Name
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Grid3X3 size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium pos-text-secondary mb-2">No products found</h3>
            <p className="pos-text-tertiary">
              {searchQuery ? "Try adjusting your search terms" : "No products available in this category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              const isPopular = getPopularBadge(product.name);
              const isLowStock = getLowStockBadge(product.stock);
              
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-material hover:shadow-material-lg transition-all duration-200 overflow-hidden cursor-pointer relative"
                  onClick={() => handleAddToCart(product)}
                >
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                      <Grid3X3 className="text-gray-400" size={24} />
                    </div>
                  )}
                  
                  <div className="p-3">
                    <h3 className="font-medium pos-text-primary mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-sm pos-text-secondary mb-2">SKU: {product.sku}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">${product.price}</span>
                      <span className={`text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </div>
                  </div>
                  
                  {/* Badges */}
                  {isPopular && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                  {isLowStock && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Low Stock
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
