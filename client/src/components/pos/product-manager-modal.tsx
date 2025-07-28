import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Plus, Upload, Download, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  insertProductSchema,
  type Product,
  type Category,
} from "@shared/schema";
import { z } from "zod";
import { useTranslation } from "@/lib/i18n";
import { BulkImportModal } from "./bulk-import-modal";
import * as XLSX from "xlsx";

interface ProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const productFormSchema = insertProductSchema.extend({
  categoryId: z.number().min(1, "Category is required"),
});

export function ProductManagerModal({
  isOpen,
  onClose,
}: ProductManagerModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isOpen,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: isOpen,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowAddForm(false);
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<z.infer<typeof productFormSchema>>;
    }) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: "",
      stock: 0,
      categoryId: 0,
      imageUrl: "",
    },
  });

  const onSubmit = (data: z.infer<typeof productFormSchema>) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl || "",
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t("tables.confirmDeleteProduct"))) {
      deleteProductMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    form.reset();
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  const exportProductsToExcel = () => {
    const exportData = [
      [
        "STT",
        "Tên sản phẩm",
        "SKU",
        "Danh mục",
        "Giá bán",
        "Tồn kho",
        "Hình ảnh (URL)",
      ],
    ];

    products.forEach((product, index) => {
      exportData.push([
        index + 1,
        product.name,
        product.sku,
        getCategoryName(product.categoryId),
        parseFloat(product.price),
        product.stock,
        product.imageUrl || "",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Auto-fit column widths
    const colWidths = [
      { wch: 5 }, // STT
      { wch: 25 }, // Tên sản phẩm
      { wch: 15 }, // SKU
      { wch: 15 }, // Danh mục
      { wch: 12 }, // Giá bán
      { wch: 10 }, // Tồn kho
      { wch: 30 }, // Hình ảnh URL
    ];
    ws["!cols"] = colWidths;

    // Style header row
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "059669" } }, // Green background
        alignment: { horizontal: "center" },
      };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách sản phẩm");

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    XLSX.writeFile(wb, `danh_sach_san_pham_${timestamp}.xlsx`);

    toast({
      title: "Thành công",
      description: `Đã xuất ${products.length} sản phẩm ra file Excel`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {t("tables.productManagement")}
            {/* <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={20} />
            </Button> */}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {!showAddForm ? (
            <>
              <div className="flex space-x-4 mb-6">
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium transition-colors duration-200"
                >
                  <Plus className="mr-2" size={16} />
                  {t("tables.addNewProduct")}
                </Button>
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-700 hover:bg-orange-100 hover:border-orange-600"
                  onClick={() => setShowBulkImport(true)}
                >
                  <Upload className="mr-2" size={16} />
                  {t("tables.bulkImport")}
                </Button>
                <Button
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-100 hover:border-green-600"
                  onClick={exportProductsToExcel}
                >
                  <Download className="mr-2" size={16} />
                  {t("tables.export")}
                </Button>
              </div>

              <div className="bg-gray-50 rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-8 text-center">{t("tables.loading")}</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium pos-text-primary">
                          {t("tables.product")}
                        </th>
                        <th className="text-left py-3 px-4 font-medium pos-text-primary">
                          {t("tables.sku")}
                        </th>
                        <th className="text-left py-3 px-4 font-medium pos-text-primary">
                          {t("tables.category")}
                        </th>
                        <th className="text-left py-3 px-4 font-medium pos-text-primary">
                          {t("tables.price")}
                        </th>
                        <th className="text-left py-3 px-4 font-medium pos-text-primary">
                          {t("tables.stock")}
                        </th>
                        <th className="text-left py-3 px-4 font-medium pos-text-primary">
                          {t("tables.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {products.map((product) => (
                        <tr
                          key={product.id}
                          className="border-b border-gray-200"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                              )}
                              <span className="font-medium">
                                {product.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 pos-text-secondary">
                            {product.sku}
                          </td>
                          <td className="py-3 px-4 pos-text-secondary">
                            {getCategoryName(product.categoryId)}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(parseFloat(product.price))}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                product.stock > 10
                                  ? "bg-green-600 text-white"
                                  : product.stock > 5
                                    ? "bg-orange-500 text-white"
                                    : product.stock > 0
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-400 text-white"
                              }`}
                            >
                              {product.stock}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(product)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(product.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium">
                  {editingProduct
                    ? t("tables.editProduct")
                    : t("tables.addNewProduct")}
                </h3>
                {/* <Button variant="ghost" onClick={resetForm}>
                  <X size={16} />
                </Button> */}
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("tables.productName")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("tables.productNamePlaceholder")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("tables.sku")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("tables.skuPlaceholder")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("tables.price")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder={t("tables.pricePlaceholder")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("tables.stock")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder={t("tables.stockPlaceholder")}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("tables.category")}</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("tables.selectCategory")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("tables.imageUrlOptional")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("tables.imageUrl")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      {t("tables.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createProductMutation.isPending ||
                        updateProductMutation.isPending
                      }
                      className="bg-green-600 hover:bg-green-700 text-white font-medium transition-colors duration-200"
                    >
                      {editingProduct
                        ? t("tables.updateProduct")
                        : t("tables.createProduct")}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>

        <BulkImportModal
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
