
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import type { Customer, InsertCustomer } from "@shared/schema";
import { z } from "zod";

const customerFormSchema = z.object({
  customerId: z.string().optional(),
  name: z.string().min(1, "이름은 필수입니다"),
  phone: z.string().optional(),
  email: z.string().email("올바른 이메일 형식이 아닙니다").optional().or(z.literal("")),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  membershipLevel: z.enum(["Silver", "Gold", "VIP"]).optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export function CustomerFormModal({ isOpen, onClose, customer }: CustomerFormModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customerId: customer?.customerId || "",
      name: customer?.name || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
      dateOfBirth: customer?.dateOfBirth || "",
      membershipLevel: customer?.membershipLevel || "Silver",
      notes: customer?.notes || "",
      status: customer?.status || "active",
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      form.reset({
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        dateOfBirth: customer.dateOfBirth || "",
        membershipLevel: customer.membershipLevel || "Silver",
        notes: customer.notes || "",
        status: customer.status || "active",
      });
    } else {
      form.reset({
        customerId: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        dateOfBirth: "",
        membershipLevel: "Silver",
        notes: "",
        status: "active",
      });
    }
  }, [customer, form]);

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: t('common.success'),
        description: customer ? "고객 정보가 업데이트되었습니다." : "새 고객이 추가되었습니다.",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "고객 정보 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("PUT", `/api/customers/${customer!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: t('common.success'),
        description: "고객 정보가 업데이트되었습니다.",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "고객 정보 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    if (customer) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? t('customers.editCustomer') : t('customers.addCustomer')}</DialogTitle>
          <DialogDescription>
            {customer ? t('customers.customerFormDesc') : t('customers.customerFormDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.customerId')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={t('common.autoGenerated')} 
                        disabled={!!customer}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.name')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('customers.namePlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.phone')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('customers.phonePlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.email')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder={t('customers.emailPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('customers.address')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('customers.addressPlaceholder')} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.birthday')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="membershipLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.membershipLevel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Silver">Silver</SelectItem>
                        <SelectItem value="Gold">Gold</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('customers.status')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t('common.active')}</SelectItem>
                      <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('common.notesPlaceholder')} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {customer ? t('common.update') : t('common.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
