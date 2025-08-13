import { useQuery } from "@tanstack/react-query";
import { Search, BarChart3, Settings, Coffee, Cookie, Smartphone, Home, User, Grid3X3, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import type { Category, Product } from "@shared/schema";

interface CategorySidebarProps {
  selectedCategory: number | "all";
  onCategorySelect: (categoryId: number | "all") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenProductManager: () => void;
  onOpenInvoiceManager: () => void;
  onAddToCart: (productId: number) => void;
}

const categoryIcons = {
  "Beverages": Coffee,
  "Snacks": Cookie,
  "Electronics": Smartphone,
  "Household": Home,
  "Personal Care": User,
};

export function CategorySidebar({
  selectedCategory,
  onCategorySelect,
  searchQuery,
  onSearchChange,
  onOpenProductManager,
  onOpenInvoiceManager,
  onAddToCart
}: CategorySidebarProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products/active"],
  });

  const getProductCountForCategory = (categoryId: number | "all") => {
    if (categoryId === "all") return products.length;
    return products.filter((p: Product) => p.categoryId === categoryId).length;
  };

  const handleBarcodeScan = () => {
    // Simulate barcode scanning
    const sampleSkus = ["BEV001", "BEV002", "SNK001", "ELC001"];
    const randomSku = sampleSkus[Math.floor(Math.random() * sampleSkus.length)];
    
    fetch(`/api/products/barcode/${randomSku}`)
      .then(res => res.json())
      .then(product => {
        if (product.id) {
          onAddToCart(product.id);
          toast({
            title: t('pos.productScanned'),
            description: `${product.name} ${t('pos.addedToCart')}`,
          });
        }
      })
      .catch(() => {
        toast({
          title: t('pos.scanFailed'),
          description: t('pos.productNotFound'),
          variant: "destructive",
        });
      });
  };

  return (
    <aside className="w-64 bg-white shadow-material border-r pos-border flex flex-col">
      <div className="p-4 border-b pos-border mt-2">
        <div className="relative mb-3">
          <Input
            type="text"
            placeholder={t('pos.searchProducts')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        </div>
        <Button 
          onClick={handleBarcodeScan}
          className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center rounded-xl"
        >
          <BarChart3 className="mr-2" size={16} />
          {t('pos.scanBarcode')}
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="font-medium pos-text-primary mb-3">{t('pos.categories')}</h3>
          <div className="space-y-2">
            <button
              onClick={() => onCategorySelect("all")}
              className={`w-full text-left px-3 py-2 rounded-xl transition-colors duration-200 flex items-center justify-between ${
                selectedCategory === "all" 
                  ? "bg-green-50 text-green-600 border-l-4 border-green-500" 
                  : "hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center">
                <Grid3X3 className="w-5 mr-2 text-gray-500" size={16} />
                {t('pos.allProducts')}
              </span>
              <span className="text-xs bg-gray-200 pos-text-secondary px-2 py-1 rounded-full">
                {getProductCountForCategory("all")}
              </span>
            </button>
            
            {categories.map((category) => {
              const IconComponent = categoryIcons[category.name as keyof typeof categoryIcons] || Grid3X3;
              const isSelected = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors duration-200 flex items-center justify-between ${
                    isSelected 
                      ? "bg-green-50 text-green-600 border-l-4 border-green-500" 
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center">
                    <IconComponent className="w-5 mr-2 text-gray-500" size={16} />
                    {category.name}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isSelected 
                      ? "bg-green-500 text-white" 
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    {getProductCountForCategory(category.id)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t pos-border space-y-3">
        <Button 
          onClick={onOpenProductManager}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center rounded-xl"
        >
          <Settings className="mr-2" size={16} />
          {t('pos.manageProducts')}
        </Button>
        <Button 
          onClick={onOpenInvoiceManager}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center rounded-xl"
        >
          <Receipt className="mr-2" size={16} />
          {t('pos.manageInvoices')}
        </Button>
      </div>
    </aside>
  );
}
