
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Plus, Trash2, TestTube, Wifi, Usb, Bluetooth } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PrinterConfig {
  id: number;
  name: string;
  printerType: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  macAddress?: string;
  paperWidth: number;
  printSpeed: number;
  isEmployee: boolean;
  isKitchen: boolean;
  isActive: boolean;
}

export function PrinterConfigModal({ isOpen, onClose }: PrinterConfigModalProps) {
  const [selectedConfig, setSelectedConfig] = useState<PrinterConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    printerType: "thermal",
    connectionType: "usb",
    ipAddress: "",
    port: 9100,
    macAddress: "",
    paperWidth: 80,
    printSpeed: 100,
    isEmployee: false,
    isKitchen: false,
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch printer configurations
  const { data: printerConfigs = [], isLoading } = useQuery({
    queryKey: ["/api/printer-configs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/printer-configs");
      return response.json();
    },
    enabled: isOpen,
  });

  // Create printer config mutation
  const createConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await apiRequest("POST", "/api/printer-configs", configData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printer-configs"] });
      toast({ title: "Thành công", description: "Đã thêm cấu hình máy in" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể thêm cấu hình máy in", variant: "destructive" });
    },
  });

  // Update printer config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/printer-configs/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printer-configs"] });
      toast({ title: "Thành công", description: "Đã cập nhật cấu hình máy in" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể cập nhật cấu hình máy in", variant: "destructive" });
    },
  });

  // Delete printer config mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/printer-configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printer-configs"] });
      toast({ title: "Thành công", description: "Đã xóa cấu hình máy in" });
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể xóa cấu hình máy in", variant: "destructive" });
    },
  });

  // Test printer connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/printer-configs/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Kết nối thành công" : "Kết nối thất bại",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể kiểm tra kết nối", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      printerType: "thermal",
      connectionType: "usb",
      ipAddress: "",
      port: 9100,
      macAddress: "",
      paperWidth: 80,
      printSpeed: 100,
      isEmployee: false,
      isKitchen: false,
      isActive: true,
    });
    setSelectedConfig(null);
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedConfig) {
      updateConfigMutation.mutate({ id: selectedConfig.id, data: formData });
    } else {
      createConfigMutation.mutate(formData);
    }
  };

  const handleEdit = (config: PrinterConfig) => {
    setSelectedConfig(config);
    setFormData({
      name: config.name,
      printerType: config.printerType,
      connectionType: config.connectionType,
      ipAddress: config.ipAddress || "",
      port: config.port || 9100,
      macAddress: config.macAddress || "",
      paperWidth: config.paperWidth,
      printSpeed: config.printSpeed,
      isEmployee: config.isEmployee,
      isKitchen: config.isKitchen,
      isActive: config.isActive,
    });
    setIsEditing(true);
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case "network": return <Wifi className="h-4 w-4" />;
      case "bluetooth": return <Bluetooth className="h-4 w-4" />;
      default: return <Usb className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Cấu hình máy in
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Printer Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {isEditing ? "Chỉnh sửa máy in" : "Thêm máy in mới"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Tên máy in</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Máy in quầy 1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="printerType">Loại máy in</Label>
                  <Select value={formData.printerType} onValueChange={(value) => setFormData({ ...formData, printerType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">Thermal (Nhiệt)</SelectItem>
                      <SelectItem value="inkjet">Inkjet (Phun mực)</SelectItem>
                      <SelectItem value="laser">Laser</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="connectionType">Loại kết nối</Label>
                  <Select value={formData.connectionType} onValueChange={(value) => setFormData({ ...formData, connectionType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usb">USB</SelectItem>
                      <SelectItem value="network">Mạng (Network)</SelectItem>
                      <SelectItem value="bluetooth">Bluetooth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.connectionType === "network" && (
                  <>
                    <div>
                      <Label htmlFor="ipAddress">Địa chỉ IP</Label>
                      <Input
                        id="ipAddress"
                        value={formData.ipAddress}
                        onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                        placeholder="192.168.1.100"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="port">Cổng (Port)</Label>
                      <Input
                        id="port"
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 9100 })}
                      />
                    </div>
                  </>
                )}

                {formData.connectionType === "bluetooth" && (
                  <div>
                    <Label htmlFor="macAddress">Địa chỉ MAC</Label>
                    <Input
                      id="macAddress"
                      value={formData.macAddress}
                      onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                      placeholder="00:11:22:33:44:55"
                    />
                  </div>
                )}

                

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isEmployee"
                    checked={formData.isEmployee}
                    onCheckedChange={(checked) => setFormData({ ...formData, isEmployee: checked })}
                  />
                  <Label htmlFor="isEmployee">Máy in nhân viên</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isKitchen"
                    checked={formData.isKitchen}
                    onCheckedChange={(checked) => setFormData({ ...formData, isKitchen: checked })}
                  />
                  <Label htmlFor="isKitchen">Máy in bếp</Label>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
                    className="flex-1"
                  >
                    {isEditing ? "Cập nhật" : "Thêm mới"}
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Hủy
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Printer List */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách máy in</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Đang tải...</div>
              ) : printerConfigs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Printer className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có cấu hình máy in nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {printerConfigs.map((config: PrinterConfig) => (
                    <div key={config.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getConnectionIcon(config.connectionType)}
                          <div>
                            <div className="font-medium">{config.name}</div>
                            <div className="text-sm text-gray-500">
                              {config.printerType} - {config.connectionType}
                              {config.connectionType === "network" && config.ipAddress && (
                                <span> ({config.ipAddress}:{config.port})</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {config.isEmployee && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Nhân viên</span>
                          )}
                          {config.isKitchen && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Bếp</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => testConnectionMutation.mutate(config.id)}
                          disabled={testConnectionMutation.isPending}
                        >
                          <TestTube className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(config)}
                        >
                          Sửa
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteConfigMutation.mutate(config.id)}
                          disabled={deleteConfigMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
