
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Tag, DollarSign, Warehouse, Calendar, Edit3, X, Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
    sku: string;
    price: string | number;
    stock: number;
    categoryId: number;
    categoryName?: string;
    imageUrl?: string;
    isActive: boolean;
    productType: number;
    trackInventory: boolean;
    taxRate: string | number;
    priceIncludesTax: boolean;
    afterTaxPrice: string | number;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  product,
}: ProductDetailModalProps) {
  const { t } = useTranslation();
  const [searchMode, setSearchMode] = useState(false);
  const [searchSku, setSearchSku] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(product);

  // Query to search products by SKU
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/products", "all", "all", searchSku],
    queryFn: async () => {
      if (!searchSku.trim()) return [];
      const response = await fetch(`/api/products/all/all/${encodeURIComponent(searchSku)}`);
      if (!response.ok) throw new Error("Failed to search products");
      return response.json();
    },
    enabled: searchMode && searchSku.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setSelectedProduct(product);
    setSearchMode(false);
    setSearchSku("");
  }, [product, isOpen]);

  if (!selectedProduct && !searchMode) return null;

  const formatCurrency = (amount: string | number) => {
    if (!amount && amount !== 0) return "0 ₫";
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return `${num.toLocaleString('vi-VN')} ₫`;
  };

  const getProductTypeName = (type: number) => {
    const types: Record<number, string> = {
      1: t("reports.product") || "Sản phẩm",
      2: t("reports.combo") || "Combo", 
      3: t("reports.service") || "Dịch vụ",
    };
    return types[type] || types[1];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {t("reports.productDetails") || "Chi tiết sản phẩm"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchMode(!searchMode)}
                className="h-8"
              >
                <Search className="h-4 w-4 mr-1" />
                Tìm kiếm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          {searchMode && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <Label htmlFor="search-sku">Tìm kiếm theo mã SKU</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="search-sku"
                    placeholder="Nhập mã SKU để tìm kiếm..."
                    value={searchSku}
                    onChange={(e) => setSearchSku(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchSku && (
                <div className="space-y-2">
                  <Label>Kết quả tìm kiếm ({searchResults?.length || 0} sản phẩm)</Label>
                  {searchLoading ? (
                    <div className="text-sm text-gray-500">Đang tìm kiếm...</div>
                  ) : searchResults?.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {searchResults.map((product: any) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct({
                              id: product.id,
                              name: product.name,
                              sku: product.sku,
                              price: product.price,
                              stock: product.stock,
                              categoryId: product.categoryId,
                              categoryName: product.categoryName,
                              imageUrl: product.imageUrl,
                              isActive: product.isActive,
                              productType: product.productType,
                              trackInventory: product.trackInventory,
                              taxRate: product.taxRate,
                              priceIncludesTax: product.priceIncludesTax,
                              afterTaxPrice: product.afterTaxPrice,
                              createdAt: product.createdAt,
                              updatedAt: product.updatedAt
                            });
                            setSearchMode(false);
                            setSearchSku("");
                          }}
                          className="w-full text-left p-2 hover:bg-blue-50 rounded border flex items-center gap-3"
                        >
                          <Badge variant="outline">{product.sku}</Badge>
                          <span className="font-medium">{product.name}</span>
                          <span className="text-sm text-gray-500 ml-auto">
                            {formatCurrency(product.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : searchSku.length > 2 ? (
                    <div className="text-sm text-gray-500">Không tìm thấy sản phẩm nào</div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Product Image and Basic Info */}
          {selectedProduct && (
            <>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border flex items-center justify-center shadow-sm ${selectedProduct.imageUrl ? 'hidden' : ''}`}>
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{selectedProduct.sku}</Badge>
                    <Badge 
                      variant={selectedProduct.isActive ? "default" : "destructive"}
                    >
                      {selectedProduct.isActive ? (t("common.active") || "Đang bán") : (t("common.inactive") || "Ngừng bán")}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {t("common.type") || "Loại"}: {getProductTypeName(selectedProduct.productType)}
                  </p>
                </div>
              </div>

              {/* Product Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pricing Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2 border-b pb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    {t("reports.priceInfo") || "Thông tin giá"}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">{t("common.originalPrice") || "Giá gốc"}:</span>
                      <span className="font-medium">{formatCurrency(selectedProduct.price)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">{t("common.taxRate") || "Thuế suất"}:</span>
                      <span className="font-medium">{selectedProduct.taxRate}%</span>
                    </div>
                    <div className="flex justify-between items-center py-1 bg-green-50 px-2 rounded">
                      <span className="text-gray-600">{t("common.afterTaxPrice") || "Giá đã có thuế"}:</span>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(selectedProduct.afterTaxPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">{t("common.includesTax") || "Bao gồm thuế"}:</span>
                      <Badge variant={selectedProduct.priceIncludesTax ? "default" : "secondary"}>
                        {selectedProduct.priceIncludesTax ? (t("common.yes") || "Có") : (t("common.no") || "Không")}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Inventory Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2 border-b pb-2">
                    <Warehouse className="w-4 h-4 text-blue-600" />
                    {t("inventory.inventoryInfo") || "Thông tin kho"}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">{t("common.stock") || "Tồn kho"}:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedProduct.stock}</span>
                        <Badge 
                          variant={selectedProduct.stock > 10 ? "default" : selectedProduct.stock > 0 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {selectedProduct.stock > 10 
                            ? (t("inventory.inStock") || "Đủ hàng") 
                            : selectedProduct.stock > 0 
                              ? (t("inventory.lowStock") || "Sắp hết") 
                              : (t("inventory.outOfStock") || "Hết hàng")
                          }
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">{t("inventory.trackInventory") || "Theo dõi kho"}:</span>
                      <Badge variant={selectedProduct.trackInventory ? "default" : "secondary"}>
                        {selectedProduct.trackInventory ? (t("common.yes") || "Có") : (t("common.no") || "Không")}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">{t("common.category") || "Nhóm hàng"}:</span>
                      <span className="font-medium">
                        {selectedProduct.categoryName || (t("inventory.uncategorized") || "Chưa phân loại")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {t("reports.additionalInfo") || "Thông tin khác"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("common.productId") || "ID sản phẩm"}:</span>
                    <span className="font-medium">#{selectedProduct.id}</span>
                  </div>
                  {selectedProduct.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("common.createdAt") || "Ngày tạo"}:</span>
                      <span className="font-medium">
                        {new Date(selectedProduct.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t("common.close") || "Đóng"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
