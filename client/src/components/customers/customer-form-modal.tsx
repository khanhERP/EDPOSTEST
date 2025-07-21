
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Save } from "lucide-react";

const customerFormSchema = z.object({
  name: z.string().min(1, "고객명은 필수입니다"),
  phone: z.string().min(1, "전화번호는 필수입니다"),
  email: z.string().email("올바른 이메일 형식이 아닙니다").optional().or(z.literal("")),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  grade: z.enum(["bronze", "silver", "gold", "vip"]),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface Customer {
  id: number;
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birthDate?: string;
  grade: "bronze" | "silver" | "gold" | "vip";
  totalSpent: number;
  visitCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  mode: "create" | "edit";
}

export function CustomerFormModal({ isOpen, onClose, customer, mode }: CustomerFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      birthDate: "",
      grade: "bronze",
      notes: "",
    },
  });

  useEffect(() => {
    if (customer && mode === "edit") {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
        birthDate: customer.birthDate || "",
        grade: customer.grade,
        notes: customer.notes || "",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        email: "",
        address: "",
        birthDate: "",
        grade: "bronze",
        notes: "",
      });
    }
  }, [customer, mode, form]);

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("POST", "/api/customers", {
        ...data,
        customerId: `CUS${String(Date.now()).slice(-6)}`,
        totalSpent: 0,
        visitCount: 0,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "성공",
        description: "고객이 성공적으로 등록되었습니다.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "고객 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("PUT", `/api/customers/${customer?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "성공",
        description: "고객 정보가 성공적으로 수정되었습니다.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "고객 정보 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = (data: CustomerFormData) => {
    if (mode === "edit" && customer) {
      updateCustomerMutation.mutate(data);
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const getGradeLabel = (grade: string) => {
    switch (grade) {
      case "bronze": return "브론즈";
      case "silver": return "실버";
      case "gold": return "골드";
      case "vip": return "VIP";
      default: return "브론즈";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            {mode === "edit" ? "고객 정보 수정" : "새 고객 등록"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>고객명 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="고객명을 입력하세요" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>전화번호 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="010-0000-0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="example@email.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>주소</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="주소를 입력하세요" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>생년월일</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>등급</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="등급을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bronze">브론즈</SelectItem>
                        <SelectItem value="silver">실버</SelectItem>
                        <SelectItem value="gold">골드</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="고객 관련 메모사항" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {mode === "edit" ? "수정" : "등록"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
