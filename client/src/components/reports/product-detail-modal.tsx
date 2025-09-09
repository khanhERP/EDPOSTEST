
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Tag, DollarSign, Warehouse, Calendar } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
    sku: string;
    price: string;
    stock: number;
    categoryId: number;
    categoryName?: string;
    imageUrl?: string;
    isActive: boolean;
    productType: number;
    trackInventory: boolean;
    taxRate: string;
    priceIncludesTax: boolean;
    afterTaxPrice: string;
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

  if (!product) return null;

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toLocaleString('vi-VN')} ₫`;
  };

  const getProductTypeName = (type: number) => {
    const types = {
      1: "Sản phẩm",
      2: "Combo",
      3: "Dịch vụ",
    };
    return types[type as keyof typeof types] || "Sản phẩm";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Chi tiết sản phẩm
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Image and Basic Info */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg border"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-lg border flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{product.sku}</Badge>
                <Badge 
                  variant={product.isActive ? "default" : "destructive"}
                >
                  {product.isActive ? "Đang bán" : "Ngừng bán"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Loại: {getProductTypeName(product.productType)}
              </p>
            </div>
          </div>

          {/* Product Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pricing Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Thông tin giá
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Giá gốc:</span>
                  <span className="font-medium">{formatCurrency(product.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thuế suất:</span>
                  <span className="font-medium">{product.taxRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Giá đã có thuế:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(product.afterTaxPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bao gồm thuế:</span>
                  <Badge variant={product.priceIncludesTax ? "default" : "secondary"}>
                    {product.priceIncludesTax ? "Có" : "Không"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Inventory Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Warehouse className="w-4 h-4" />
                Thông tin kho
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tồn kho:</span>
                  <span className="font-medium">{product.stock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Theo dõi kho:</span>
                  <Badge variant={product.trackInventory ? "default" : "secondary"}>
                    {product.trackInventory ? "Có" : "Không"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nhóm hàng:</span>
                  <span className="font-medium">
                    {product.categoryName || `Danh mục ${product.categoryId}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Thông tin khác
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-gray-600">ID sản phẩm:</span>
                <span className="font-medium">#{product.id}</span>
              </div>
              {product.createdAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày tạo:</span>
                  <span className="font-medium">
                    {new Date(product.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button 
              onClick={() => {
                window.location.href = `/inventory?productId=${product.id}&action=edit`;
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Chỉnh sửa sản phẩm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
