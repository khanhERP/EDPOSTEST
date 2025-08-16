import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  FileText,
  Calendar,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  BarChart3,
  Search,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export function SalesChartReport() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [analysisType, setAnalysisType] = useState("time");
  const [concernType, setConcernType] = useState("time");

  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [salesMethod, setSalesMethod] = useState("all");
  const [salesChannel, setSalesChannel] = useState("all");

  // Additional filters from legacy reports
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [productType, setProductType] = useState("all");
  const [customerStatus, setCustomerStatus] = useState("all");

  // Pagination state for product report
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(15);

  // Customer Report with Pagination State
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(15);

  // Data queries with dynamic filtering
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", startDate, endDate, salesMethod, salesChannel, analysisType, concernType, selectedEmployee],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${startDate}/${endDate}/${salesMethod}/${salesChannel}/${analysisType}/${concernType}/${selectedEmployee}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!(startDate && endDate), // Only fetch when dates are available
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders", startDate, endDate, selectedEmployee, salesChannel, salesMethod, analysisType, concernType],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${startDate}/${endDate}/${selectedEmployee}/${salesChannel}/${salesMethod}/${analysisType}/${concernType}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!(startDate && endDate), // Only fetch when dates are available
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products", selectedCategory, productType, productSearch],
    queryFn: async () => {
      const response = await fetch(`/api/products/${selectedCategory}/${productType}/${productSearch || ''}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers", customerSearch, customerStatus],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerSearch || ''}/${customerStatus || 'all'}`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    staleTime: 5 * 60 * 1000,
  });

  // Utility functions
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ₫`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: t("common.cash"),
      card: t("common.creditCard"),
      creditCard: t("common.creditCard"),
      credit_card: t("common.creditCard"),
      debitCard: t("common.debitCard"),
      debit_card: t("common.debitCard"),
      transfer: t("common.transfer"),
      einvoice: t("reports.einvoice"),
      momo: t("common.momo"),
      zalopay: t("common.zalopay"),
      vnpay: t("common.vnpay"),
      qrCode: t("common.qrCode"),
      shopeepay: t("common.shopeepay"),
      grabpay: t("common.grabpay"),
      mobile: "Mobile",
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getReportTitle = () => {
    switch (analysisType) {
      case "time":
        const concernTypes = {
          time: t("reports.timeSalesReport"),
          profit: t("reports.profitByInvoiceReport"),
          discount: t("reports.invoiceDiscountReport"),
          return: t("reports.returnByInvoiceReport"),
          employee: t("reports.employeeSalesReport"),
        };
        return (
          concernTypes[concernType as keyof typeof concernTypes] ||
          t("reports.salesReport")
        );
      case "product":
        return t("reports.inventoryReport");
      case "employee":
        return t("reports.employeeSalesReport");
      case "customer":
        return t("reports.customerSalesReport");
      case "channel":
        return t("reports.channelSalesReport");
      default:
        return t("reports.salesReport");
    }
  };

  // State for expandable rows
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>(
    {},
  );

  // Pagination state for sales report
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Legacy Sales Report Component Logic
  const renderSalesReport = () => {
    if (!transactions || !Array.isArray(transactions)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const transactionDateOnly = new Date(transactionDate);
      transactionDateOnly.setHours(0, 0, 0, 0);

      const isInRange =
        transactionDateOnly >= start && transactionDateOnly <= end;
      return isInRange;
    });

    const dailySales: {
      [date: string]: { revenue: number; orders: number; customers: number };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );

      const year = transactionDate.getFullYear();
      const month = (transactionDate.getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const day = transactionDate.getDate().toString().padStart(2, "0");
      const date = `${year}-${month}-${day}`;

      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, orders: 0, customers: 0 };
      }

      dailySales[date].revenue += Number(transaction.total || 0);
      dailySales[date].orders += 1;
      dailySales[date].customers += 1;
    });

    const paymentMethods: {
      [method: string]: { count: number; revenue: number };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const method = transaction.paymentMethod || "cash";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, revenue: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].revenue += Number(transaction.total);
    });

    const totalRevenue = filteredTransactions.reduce(
      (sum: number, transaction: any) => sum + Number(transaction.total),
      0,
    );
    const totalOrders = filteredTransactions.length;
    const totalCustomers = filteredTransactions.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return (
      <>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.totalRevenue")}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("reports.totalOrders")}
                  </p>
                  <p className="text-2xl font-bold">{totalOrders}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.averageOrderValue")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(averageOrderValue)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("reports.totalCustomers")}
                </p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Sales */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.dailySales")}</CardTitle>
            <CardDescription>{t("reports.analyzeRevenue")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="text-center border-r bg-green-50 w-12"
                      rowSpan={2}
                    ></TableHead>
                    <TableHead
                      className="text-center border-r bg-green-50 min-w-[120px]"
                      rowSpan={2}
                    >
                      {t("reports.date")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r min-w-[100px]"
                      rowSpan={2}
                    >
                      {t("reports.orderNumber")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r min-w-[140px]"
                      rowSpan={2}
                    >
                      {t("reports.subtotal")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r min-w-[120px]"
                      rowSpan={2}
                    >
                      {t("reports.discount")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r min-w-[140px]"
                      rowSpan={2}
                    >
                      {t("reports.revenue")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r min-w-[120px]"
                      rowSpan={2}
                    >
                      {t("reports.tax")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r min-w-[140px]"
                      rowSpan={2}
                    >
                      {t("reports.total")}
                    </TableHead>
                    <TableHead
                      className="text-center border-r bg-blue-50 min-w-[200px]"
                      colSpan={(() => {
                        // Get all unique payment methods from transactions
                        const allPaymentMethods = new Set();
                        if (
                          filteredTransactions &&
                          Array.isArray(filteredTransactions)
                        ) {
                          filteredTransactions.forEach((transaction: any) => {
                            const method = transaction.paymentMethod || "cash";
                            allPaymentMethods.add(method);
                          });
                        }
                        return allPaymentMethods.size + 1; // +1 for total column
                      })()}
                    >
                      {t("reports.totalCustomerPayment")}
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    {(() => {
                      // Get all unique payment methods from transactions
                      const allPaymentMethods = new Set();
                      if (
                        filteredTransactions &&
                        Array.isArray(filteredTransactions)
                      ) {
                        filteredTransactions.forEach((transaction: any) => {
                          const method = transaction.paymentMethod || "cash";
                          allPaymentMethods.add(method);
                        });
                      }

                      const paymentMethodsArray =
                        Array.from(allPaymentMethods).sort();

                      return (
                        <>
                          {paymentMethodsArray.map((method: any) => (
                            <TableHead
                              key={method}
                              className="text-center border-r bg-blue-50 min-w-[130px]"
                            >
                              {getPaymentMethodLabel(method)}
                            </TableHead>
                          ))}
                          <TableHead className="text-center bg-blue-50 min-w-[150px]">
                            {t("reports.totalCustomerPayment")}
                          </TableHead>
                        </>
                      );
                    })()}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(dailySales).length > 0 ? (
                    (() => {
                      const sortedEntries = Object.entries(dailySales).sort(
                        ([a], [b]) =>
                          new Date(b).getTime() - new Date(a).getTime(),
                      );
                      const totalPages = Math.ceil(
                        sortedEntries.length / pageSize,
                      );
                      const startIndex = (currentPage - 1) * pageSize;
                      const endIndex = startIndex + pageSize;
                      const paginatedEntries = sortedEntries.slice(
                        startIndex,
                        endIndex,
                      );

                      return paginatedEntries.map(([date, data]) => {
                        const paymentAmount = data.revenue * 1.05; // Thành tiền (bao gồm thuế và phí)
                        const discount = data.revenue * 0.05; // Giảm giá (5% trung bình)
                        const actualRevenue = paymentAmount - discount; // Doanh thu = Thành tiền - Giảm giá
                        const tax = actualRevenue * 0.1; // Thuế tính trên doanh thu
                        const customerPayment = actualRevenue; // Khách thanh toán = doanh thu

                        // Get transactions for this date
                        const dateTransactions = filteredTransactions.filter(
                          (transaction: any) => {
                            const transactionDate = new Date(
                              transaction.createdAt || transaction.created_at,
                            );
                            const year = transactionDate.getFullYear();
                            const month = (transactionDate.getMonth() + 1)
                              .toString()
                              .padStart(2, "0");
                            const day = transactionDate
                              .getDate()
                              .toString()
                              .padStart(2, "0");
                            const transactionDateStr = `${year}-${month}-${day}`;
                            return transactionDateStr === date;
                          },
                        );

                        const isExpanded = expandedRows[date] || false;

                        return (
                          <>
                            <TableRow key={date} className="hover:bg-gray-50">
                              <TableCell className="text-center border-r w-12">
                                <button
                                  onClick={() =>
                                    setExpandedRows((prev) => ({
                                      ...prev,
                                      [date]: !prev[date],
                                    }))
                                  }
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                                >
                                  {isExpanded ? "−" : "+"}
                                </button>
                              </TableCell>
                              <TableCell className="font-medium text-center border-r bg-green-50 min-w-[120px] px-4">
                                {formatDate(date)}
                              </TableCell>
                              <TableCell className="text-center border-r min-w-[100px] px-4">
                                {data.orders.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right border-r min-w-[140px] px-4">
                                {formatCurrency(paymentAmount)}
                              </TableCell>
                              <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                                {formatCurrency(discount)}
                              </TableCell>
                              <TableCell className="text-right border-r text-green-600 font-medium min-w-[140px] px-4">
                                {formatCurrency(actualRevenue)}
                              </TableCell>
                              <TableCell className="text-right border-r min-w-[120px] px-4">
                                {formatCurrency(tax)}
                              </TableCell>
                              <TableCell className="text-right border-r font-bold text-blue-600 min-w-[140px] px-4">
                                {formatCurrency(actualRevenue)}
                              </TableCell>
                              {(() => {
                                // Group transactions by payment method for this date
                                const paymentMethods: {
                                  [method: string]: number;
                                } = {};
                                dateTransactions.forEach((transaction: any) => {
                                  const method =
                                    transaction.paymentMethod || "cash";
                                  paymentMethods[method] =
                                    (paymentMethods[method] || 0) +
                                    Number(transaction.total);
                                });

                                // Get all unique payment methods from all transactions
                                const allPaymentMethods = new Set();
                                if (
                                  filteredTransactions &&
                                  Array.isArray(filteredTransactions)
                                ) {
                                  filteredTransactions.forEach(
                                    (transaction: any) => {
                                      const method =
                                        transaction.paymentMethod || "cash";
                                      allPaymentMethods.add(method);
                                    },
                                  );
                                }

                                const paymentMethodsArray =
                                  Array.from(allPaymentMethods).sort();
                                const totalCustomerPayment = Object.values(
                                  paymentMethods,
                                ).reduce(
                                  (sum: number, amount: number) => sum + amount,
                                  0,
                                );

                                return (
                                  <>
                                    {paymentMethodsArray.map((method: any) => {
                                      const amount =
                                        paymentMethods[method] || 0;
                                      return (
                                        <TableCell
                                          key={method}
                                          className="text-right border-r font-medium min-w-[130px] px-4"
                                        >
                                          {amount > 0
                                            ? formatCurrency(amount)
                                            : "-"}
                                        </TableCell>
                                      );
                                    })}
                                    <TableCell className="text-right font-bold text-green-600 min-w-[150px] px-4">
                                      {formatCurrency(totalCustomerPayment)}
                                    </TableCell>
                                  </>
                                );
                              })()}
                            </TableRow>

                            {/* Expanded order details */}
                            {isExpanded &&
                              dateTransactions.length > 0 &&
                              dateTransactions.map(
                                (transaction: any, index: number) => (
                                  <TableRow
                                    key={`${date}-${transaction.id || index}`}
                                    className="bg-blue-50/50 border-l-4 border-l-blue-400"
                                  >
                                    <TableCell className="text-center border-r bg-blue-50 w-12">
                                      <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                        └
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-center border-r bg-blue-50 text-blue-600 text-sm min-w-[120px] px-4">
                                      {new Date(
                                        transaction.createdAt ||
                                          transaction.created_at,
                                      ).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      <div className="text-xs text-gray-500 font-normal">
                                        {getPaymentMethodLabel(
                                          transaction.paymentMethod,
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center border-r text-sm min-w-[100px] px-4">
                                      #
                                      {transaction.transactionId ||
                                        `TXN-${index + 1}`}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-sm min-w-[140px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total) * 1.05,
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-red-600 text-sm min-w-[120px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total) * 1.05 * 0.05,
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[140px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total),
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total) * 0.1,
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[140px] px-4">
                                      {formatCurrency(
                                        Number(transaction.total),
                                      )}
                                    </TableCell>
                                    {(() => {
                                      const transactionMethod =
                                        transaction.paymentMethod || "cash";
                                      const amount = Number(transaction.total);

                                      // Get all unique payment methods from all transactions
                                      const allPaymentMethods = new Set();
                                      if (
                                        filteredTransactions &&
                                        Array.isArray(filteredTransactions)
                                      ) {
                                        filteredTransactions.forEach(
                                          (transaction: any) => {
                                            const method =
                                              transaction.paymentMethod ||
                                              "cash";
                                            allPaymentMethods.add(method);
                                          },
                                        );
                                      }

                                      const paymentMethodsArray =
                                        Array.from(allPaymentMethods).sort();

                                      return (
                                        <>
                                          {paymentMethodsArray.map(
                                            (method: any) => (
                                              <TableCell
                                                key={method}
                                                className="text-right border-r text-sm min-w-[130px] px-4"
                                              >
                                                {transactionMethod === method
                                                  ? formatCurrency(amount)
                                                  : "-"}
                                              </TableCell>
                                            ),
                                          )}
                                          <TableCell className="text-right font-bold text-green-600 text-sm min-w-[150px] px-4">
                                            {formatCurrency(amount)}
                                          </TableCell>
                                        </>
                                      );
                                    })()}
                                  </TableRow>
                                ),
                              )}
                          </>
                        );
                      });
                    })()
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-gray-500 py-8"
                      >
                        {t("reports.noDataDescription")}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Summary Row */}
                  {Object.entries(dailySales).length > 0 && (
                    <TableRow className="bg-gray-100 font-bold border-t-2">
                      <TableCell className="text-center border-r w-12"></TableCell>
                      <TableCell className="text-center border-r bg-green-100 min-w-[120px] px-4">
                        {t("common.total")}
                      </TableCell>
                      <TableCell className="text-center border-r min-w-[100px] px-4">
                        {Object.values(dailySales).reduce((sum, data) => sum + data.orders, 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right border-r min-w-[140px] px-4">
                        {formatCurrency(
                          Object.values(dailySales).reduce(
                            (sum, data) => sum + data.revenue * 1.05,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                        {formatCurrency(
                          Object.values(dailySales).reduce(
                            (sum, data) => sum + data.revenue * 1.05 * 0.05,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r text-green-600 min-w-[140px] px-4">
                        {formatCurrency(
                          Object.values(dailySales).reduce(
                            (sum, data) => sum + data.revenue,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r min-w-[120px] px-4">
                        {formatCurrency(
                          Object.values(dailySales).reduce(
                            (sum, data) => sum + data.revenue * 0.1,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right border-r text-blue-600 min-w-[140px] px-4">
                        {formatCurrency(
                          Object.values(dailySales).reduce(
                            (sum, data) => sum + data.revenue,
                            0,
                          ),
                        )}
                      </TableCell>
                      {(() => {
                        // Calculate total payment methods across all dates
                        const totalPaymentMethods: {
                          [method: string]: number;
                        } = {};
                        filteredTransactions.forEach((transaction: any) => {
                          const method = transaction.paymentMethod || "cash";
                          totalPaymentMethods[method] =
                            (totalPaymentMethods[method] || 0) +
                            Number(transaction.total);
                        });

                        // Get all unique payment methods from all transactions
                        const allPaymentMethods = new Set();
                        filteredTransactions.forEach((transaction: any) => {
                          const method = transaction.paymentMethod || "cash";
                          allPaymentMethods.add(method);
                        });

                        const paymentMethodsArray =
                          Array.from(allPaymentMethods).sort();
                        const grandTotal = Object.values(
                          totalPaymentMethods,
                        ).reduce(
                          (sum: number, amount: number) => sum + amount,
                          0,
                        );

                        return (
                          <>
                            {paymentMethodsArray.map((method: any) => {
                              const total = totalPaymentMethods[method] || 0;
                              return (
                                <TableCell
                                  key={method}
                                  className="text-right border-r font-bold text-green-600 min-w-[130px] px-4"
                                >
                                  {total > 0 ? formatCurrency(total) : "-"}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-bold text-green-600 text-xl min-w-[150px] px-4">
                              {formatCurrency(grandTotal)}
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {Object.entries(dailySales).length > 0 && (
              <div className="flex items-center justify-between space-x-6 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{t("common.show")}</p>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm font-medium">{t("common.rows")}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">
                    {t("common.page")} {currentPage} /{" "}
                    {Math.ceil(Object.entries(dailySales).length / pageSize)}
                  </p>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      «
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            prev + 1,
                            Math.ceil(
                              Object.entries(dailySales).length / pageSize,
                            ),
                          ),
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(Object.entries(dailySales).length / pageSize)
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ›
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.ceil(
                            Object.entries(dailySales).length / pageSize,
                          ),
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(Object.entries(dailySales).length / pageSize)
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  // Legacy Inventory Report Component Logic
  const renderInventoryReport = () => {
    const getFilteredProducts = () => {
      if (!products || !Array.isArray(products)) return [];

      return products.filter((product: any) => {
        const searchMatch =
          !productSearch ||
          product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (product.sku &&
            product.sku.toLowerCase().includes(productSearch.toLowerCase()));

        const categoryMatch =
          selectedCategory === "all" ||
          product.categoryId?.toString() === selectedCategory;

        const typeMatch =
          productType === "all" ||
          (productType === "combo" && product.productType === 3) ||
          (productType === "product" && product.productType === 1) ||
          (productType === "service" && product.productType === 2);

        return searchMatch && categoryMatch && typeMatch;
      });
    };

    const getSalesData = () => {
      const filteredProducts = getFilteredProducts();
      if (!filteredProducts.length) return [];

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const productSales: {
        [productId: string]: {
          quantity: number;
          totalAmount: number;
          discount: number;
          revenue: number;
        };
      } = {};

      // Process transaction items from transactions
      if (transactions && Array.isArray(transactions)) {
        const filteredTransactions = transactions.filter((transaction: any) => {
          const transactionDate = new Date(
            transaction.createdAt || transaction.created_at,
          );
          const transactionDateOnly = new Date(transactionDate);
          transactionDateOnly.setHours(0, 0, 0, 0);
          return transactionDateOnly >= start && transactionDateOnly <= end;
        });

        filteredTransactions.forEach((transaction: any) => {
          if (transaction.items && Array.isArray(transaction.items)) {
            transaction.items.forEach((item: any) => {
              const productId = item.productId?.toString();
              if (!productId) return;

              // Check if this product is in our filtered products list
              const product = filteredProducts.find(
                (p) => p.id.toString() === productId,
              );
              if (!product) return;

              if (!productSales[productId]) {
                productSales[productId] = {
                  quantity: 0,
                  totalAmount: 0,
                  discount: 0,
                  revenue: 0,
                };
              }

              const quantity = Number(item.quantity || 0);
              const total = Number(item.total || 0);
              const unitPrice = Number(item.price || 0);
              const totalAmount = quantity * unitPrice;
              const discount = totalAmount - total;

              productSales[productId].quantity += quantity;
              productSales[productId].totalAmount += totalAmount;
              productSales[productId].discount += discount;
              productSales[productId].revenue += total;
            });
          }
        });
      }

      // Process order items from orders
      if (orders && Array.isArray(orders)) {
        const filteredOrders = orders.filter((order: any) => {
          const orderDate = new Date(
            order.orderedAt || order.created_at || order.createdAt,
          );
          const orderDateOnly = new Date(orderDate);
          orderDateOnly.setHours(0, 0, 0, 0);
          return (
            orderDateOnly >= start &&
            orderDateOnly <= end &&
            order.status === "paid"
          );
        });

        filteredOrders.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const productId = item.productId?.toString();
              if (!productId) return;

              // Check if this product is in our filtered products list
              const product = filteredProducts.find(
                (p) => p.id.toString() === productId,
              );
              if (!product) return;

              if (!productSales[productId]) {
                productSales[productId] = {
                  quantity: 0,
                  totalAmount: 0,
                  discount: 0,
                  revenue: 0,
                };
              }

              const quantity = Number(item.quantity || 0);
              const total = Number(item.total || 0);
              const unitPrice = Number(item.unitPrice || 0);
              const totalAmount = quantity * unitPrice;
              const discount = totalAmount - total;

              productSales[productId].quantity += quantity;
              productSales[productId].totalAmount += totalAmount;
              productSales[productId].discount += discount;
              productSales[productId].revenue += total;
            });
          }
        });
      }

      return filteredProducts
        .map((product: any) => {
          const sales = productSales[product.id.toString()] || {
            quantity: 0,
            totalAmount: 0,
            discount: 0,
            revenue: 0,
          };

          // Chỉ hiển thị sản phẩm có dữ liệu bán hàng hoặc hiển thị tất cả nếu không có bộ lọc tìm kiếm
          if (
            sales.quantity === 0 &&
            (productSearch ||
              selectedCategory !== "all" ||
              productType !== "all")
          ) {
            return null;
          }

          // Tìm category name
          const categoryName =
            categories && Array.isArray(categories)
              ? categories.find((cat) => cat.id === product.categoryId)?.name ||
                ""
              : "";

          return {
            productCode: product.sku || "",
            productName: product.name || "",
            unit: "", // Đơn vị tính - để trống vì không có trong database
            quantitySold: sales.quantity,
            totalAmount: sales.totalAmount,
            discount: sales.discount,
            revenue: sales.revenue,
            categoryName: categoryName,
          };
        })
        .filter((item) => item !== null);
    };

    const data = getSalesData();
    const totalPages = Math.ceil(data.length / productPageSize);
    const startIndex = (productCurrentPage - 1) * productPageSize;
    const endIndex = startIndex + productPageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("reports.salesReportByProduct")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead>{t("reports.unit")}</TableHead>
                <TableHead className="text-center">{t("reports.quantitySold")}</TableHead>
                <TableHead className="text-right">{t("reports.totalAmount")}</TableHead>
                <TableHead className="text-right">{t("reports.discount")}</TableHead>
                <TableHead className="text-right">{t("reports.revenue")}</TableHead>
                <TableHead>{t("reports.categoryName")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-center">
                      {item.quantitySold}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.discount)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell>{item.categoryName}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-500 italic"
                  >
                    {t("reports.noDataDescription")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls for Product Report */}
          {data.length > 0 && (
            <>
              <div className="flex items-center justify-between space-x-6 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{t("common.show")}</p>
                  <Select
                    value={productPageSize.toString()}
                    onValueChange={(value) => {
                      setProductPageSize(Number(value));
                      setProductCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm font-medium">{t("common.rows")}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">
                    {t("common.page")} {productCurrentPage} / {totalPages}
                  </p>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setProductCurrentPage(1)}
                      disabled={productCurrentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      «
                    </button>
                    <button
                      onClick={() =>
                        setProductCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={productCurrentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setProductCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages),
                        )
                      }
                      disabled={productCurrentPage === totalPages}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setProductCurrentPage(totalPages)}
                      disabled={productCurrentPage === totalPages}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Employee Report with Pagination State
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(15);

  // Legacy Employee Report Component Logic
  const renderEmployeeReport = () => {
    if (!transactions || !Array.isArray(transactions)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      const dateMatch = transactionDate >= start && transactionDate <= end;

      const employeeMatch =
        selectedEmployee === "all" ||
        transaction.cashierName === selectedEmployee ||
        transaction.employeeId?.toString() === selectedEmployee ||
        transaction.cashierName?.includes(selectedEmployee);

      return dateMatch && employeeMatch;
    });

    // Group transactions by employee and extract payment methods
    const employeeData: {
      [employeeKey: string]: {
        employeeCode: string;
        employeeName: string;
        orderCount: number;
        revenue: number;
        tax: number;
        total: number;
        paymentMethods: { [method: string]: number };
      };
    } = {};

    // Get all unique payment methods from filtered transactions
    const allPaymentMethods = new Set<string>();
    filteredTransactions.forEach((transaction: any) => {
      const method = transaction.paymentMethod || "cash";
      allPaymentMethods.add(method);
    });

    filteredTransactions.forEach((transaction: any) => {
      const employeeCode = transaction.employeeId || "EMP-000";
      const employeeName = transaction.cashierName || transaction.employeeName || "Unknown";
      const employeeKey = `${employeeCode}-${employeeName}`;

      if (!employeeData[employeeKey]) {
        employeeData[employeeKey] = {
          employeeCode,
          employeeName,
          orderCount: 0,
          revenue: 0,
          tax: 0,
          total: 0,
          paymentMethods: {},
        };

        // Initialize payment methods for each employee
        allPaymentMethods.forEach(method => {
          employeeData[employeeKey].paymentMethods[method] = 0;
        });
      }

      const transactionTotal = Number(transaction.total || 0);
      const transactionTax = transactionTotal * 0.1; // 10% tax
      const transactionRevenue = transactionTotal - transactionTax;

      employeeData[employeeKey].orderCount += 1;
      employeeData[employeeKey].revenue += transactionRevenue;
      employeeData[employeeKey].tax += transactionTax;
      employeeData[employeeKey].total += transactionTotal;

      // Add to payment method total
      const paymentMethod = transaction.paymentMethod || "cash";
      employeeData[employeeKey].paymentMethods[paymentMethod] += transactionTotal;
    });

    const data = Object.values(employeeData).sort((a, b) => b.total - a.total);

    // Pagination logic
    const totalPages = Math.ceil(data.length / employeePageSize);
    const startIndex = (employeeCurrentPage - 1) * employeePageSize;
    const endIndex = startIndex + employeePageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    const paymentMethodsArray = Array.from(allPaymentMethods).sort();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("reports.employeeSalesReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="text-center border-r bg-green-50 w-12"
                    rowSpan={2}
                  ></TableHead>
                  <TableHead
                    className="text-center border-r bg-green-50 min-w-[120px]"
                    rowSpan={2}
                  >
                    {t("reports.employeeCode")}
                  </TableHead>
                  <TableHead
                    className="text-center border-r bg-green-50 min-w-[150px]"
                    rowSpan={2}
                  >
                    {t("reports.seller")}
                  </TableHead>
                  <TableHead
                    className="text-center border-r min-w-[100px]"
                    rowSpan={2}
                  >
                    {t("reports.orders")}
                  </TableHead>
                  <TableHead
                    className="text-right border-r min-w-[140px]"
                    rowSpan={2}
                  >
                    {t("reports.revenue")}
                  </TableHead>
                  <TableHead
                    className="text-right border-r min-w-[120px]"
                    rowSpan={2}
                  >
                    {t("reports.tax")}
                  </TableHead>
                  <TableHead
                    className="text-right border-r min-w-[140px]"
                    rowSpan={2}
                  >
                    {t("reports.total")}
                  </TableHead>
                  <TableHead
                    className="text-center border-r bg-blue-50 min-w-[200px]"
                    colSpan={paymentMethodsArray.length + 1}
                  >
                    {t("reports.totalCustomerPayment")}
                  </TableHead>
                </TableRow>
                <TableRow>
                  {paymentMethodsArray.map((method) => (
                    <TableHead key={method} className="text-center border-r bg-blue-50 min-w-[130px]">
                      {getPaymentMethodLabel(method)}
                    </TableHead>
                  ))}
                  <TableHead className="text-center bg-blue-50 min-w-[150px]">
                    {t("common.total")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => {
                    const isExpanded = expandedRows[`emp-${item.employeeCode}`] || false;
                    const employeeTransactions = filteredTransactions.filter((transaction: any) => {
                      const employeeCode = transaction.employeeId || "EMP-000";
                      const employeeName = transaction.cashierName || transaction.employeeName || "Unknown";
                      const employeeKey = `${employeeCode}-${employeeName}`;
                      return employeeKey === `${item.employeeCode}-${item.employeeName}`;
                    });

                    return (
                      <>
                        <TableRow key={`${item.employeeCode}-${index}`} className="hover:bg-gray-50">
                          <TableCell className="text-center border-r w-12">
                            <button
                              onClick={() =>
                                setExpandedRows((prev) => ({
                                  ...prev,
                                  [`emp-${item.employeeCode}`]: !prev[`emp-${item.employeeCode}`],
                                }))
                              }
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                            >
                              {isExpanded ? "−" : "+"}
                            </button>
                          </TableCell>
                          <TableCell className="text-center border-r bg-green-50 font-medium min-w-[120px] px-4">
                            {item.employeeCode}
                          </TableCell>
                          <TableCell className="text-center border-r bg-green-50 font-medium min-w-[150px] px-4">
                            {item.employeeName}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[100px] px-4">
                            {item.orderCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right border-r text-green-600 font-medium min-w-[140px] px-4">
                            {formatCurrency(item.revenue)}
                          </TableCell>
                          <TableCell className="text-right border-r min-w-[120px] px-4">
                            {formatCurrency(item.tax)}
                          </TableCell>
                          <TableCell className="text-right border-r font-bold text-blue-600 min-w-[140px] px-4">
                            {formatCurrency(item.total)}
                          </TableCell>
                          {paymentMethodsArray.map((method) => {
                            const amount = item.paymentMethods[method] || 0;
                            return (
                              <TableCell key={method} className="text-right border-r font-medium min-w-[130px] px-4">
                                {amount > 0 ? formatCurrency(amount) : "-"}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-bold text-green-600 min-w-[150px] px-4">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded order details */}
                        {isExpanded &&
                          employeeTransactions.length > 0 &&
                          employeeTransactions.map(
                            (transaction: any, transactionIndex: number) => (
                              <TableRow
                                key={`${item.employeeCode}-transaction-${transaction.id || transactionIndex}`}
                                className="bg-blue-50/50 border-l-4 border-l-blue-400"
                              >
                                <TableCell className="text-center border-r bg-blue-50 w-12">
                                  <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                    └
                                  </div>
                                </TableCell>
                                <TableCell className="text-center border-r text-blue-600 text-sm min-w-[120px] px-4">
                                  {transaction.transactionId || `TXN-${transaction.id}`}
                                </TableCell>
                                <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                  {new Date(transaction.createdAt || transaction.created_at).toLocaleDateString("vi-VN")} {" "}
                                  {new Date(transaction.createdAt || transaction.created_at).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </TableCell>
                                <TableCell className="text-center border-r text-sm min-w-[100px] px-4">1</TableCell>
                                <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[140px] px-4">
                                  {formatCurrency(Number(transaction.total) - Number(transaction.total) * 0.1)}
                                </TableCell>
                                <TableCell className="text-right border-r text-sm min-w-[120px] px-4">
                                  {formatCurrency(Number(transaction.total) * 0.1)}
                                </TableCell>
                                <TableCell className="text-right border-r font-bold text-blue-600 text-sm min-w-[140px] px-4">
                                  {formatCurrency(Number(transaction.total))}
                                </TableCell>
                                {paymentMethodsArray.map((method) => {
                                  const transactionMethod = transaction.paymentMethod || "cash";
                                  const amount = transactionMethod === method ? Number(transaction.total) : 0;
                                  return (
                                    <TableCell key={method} className="text-right border-r text-sm min-w-[130px] px-4">
                                      {amount > 0 ? formatCurrency(amount) : "-"}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-right font-bold text-green-600 text-sm min-w-[150px] px-4">
                                  {formatCurrency(Number(transaction.total))}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                      </>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7 + paymentMethodsArray.length} className="text-center text-gray-500 py-8">
                      {t("reports.noDataDescription")}
                    </TableCell>
                  </TableRow>
                )}

                {/* Summary Row */}
                {data.length > 0 && (
                  <TableRow className="bg-gray-100 font-bold border-t-2">
                    <TableCell className="text-center border-r w-12"></TableCell>
                    <TableCell className="text-center border-r bg-green-100 min-w-[120px] px-4">
                      {t("common.total")}
                    </TableCell>
                    <TableCell className="text-center border-r bg-green-100 min-w-[150px] px-4">
                      {data.length} {t("reports.employee")}
                    </TableCell>
                    <TableCell className="text-center border-r min-w-[100px] px-4">
                      {data.reduce((sum, item) => sum + item.orderCount, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right border-r text-green-600 min-w-[140px] px-4">
                      {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
                    </TableCell>
                    <TableCell className="text-right border-r min-w-[120px] px-4">
                      {formatCurrency(data.reduce((sum, item) => sum + item.tax, 0))}
                    </TableCell>
                    <TableCell className="text-right border-r text-blue-600 min-w-[140px] px-4">
                      {formatCurrency(data.reduce((sum, item) => sum + item.total, 0))}
                    </TableCell>
                    {paymentMethodsArray.map((method) => {
                      const total = data.reduce((sum, item) => sum + (item.paymentMethods[method] || 0), 0);
                      return (
                        <TableCell key={method} className="text-right border-r font-bold text-green-600 min-w-[130px] px-4">
                          {total > 0 ? formatCurrency(total) : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-bold text-green-600 text-xl min-w-[150px] px-4">
                      {formatCurrency(data.reduce((sum, item) => sum + item.total, 0))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls for Employee Report */}
          {data.length > 0 && (
            <div className="flex items-center justify-between space-x-6 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("common.show")}</p>
                <Select
                  value={employeePageSize.toString()}
                  onValueChange={(value) => {
                    setEmployeePageSize(Number(value));
                    setEmployeeCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm font-medium">{t("common.rows")}</p>
              </div>

              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {employeeCurrentPage} / {totalPages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEmployeeCurrentPage(1)}
                    disabled={employeeCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setEmployeeCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={employeeCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setEmployeeCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={employeeCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setEmployeeCurrentPage(totalPages)}
                    disabled={employeeCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Customer Report with Pagination State
  // const [customerCurrentPage, setCustomerCurrentPage] = useState(1); // Moved up
  // const [customerPageSize, setCustomerPageSize] = useState(15); // Moved up

  // Legacy Customer Report Component Logic
  const renderCustomerReport = () => {
    if (!orders || !Array.isArray(orders)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(
        order.orderedAt || order.created_at || order.createdAt,
      );
      const dateMatch = orderDate >= start && orderDate <= end;

      const customerMatch =
        !customerSearch ||
        (order.customerName &&
          order.customerName
            .toLowerCase()
            .includes(customerSearch.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.includes(customerSearch)) ||
        (order.customerId &&
          order.customerId.toString().includes(customerSearch));

      // Status filter logic
      let statusMatch = true;
      if (customerStatus !== "all") {
        const orderTotal = Number(order.total || 0);
        const customerId = order.customerId;

        switch (customerStatus) {
          case "active":
            // Customer has recent orders (within last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            statusMatch = orderDate >= thirtyDaysAgo;
            break;
          case "inactive":
            // Customer hasn't ordered in last 30 days
            const thirtyDaysAgoInactive = new Date();
            thirtyDaysAgoInactive.setDate(thirtyDaysAgoInactive.getDate() - 30);
            statusMatch = orderDate < thirtyDaysAgoInactive;
            break;
          case "vip":
            // VIP customers with orders > 500,000 VND
            statusMatch = orderTotal >= 500000;
            break;
          case "new":
            // New customers (first order within date range)
            statusMatch = customerId && customerId !== "guest";
            break;
          default:
            statusMatch = true;
        }
      }

      return dateMatch && customerMatch && statusMatch && order.status === "paid";
    });

    const customerData: {
      [customerId: string]: {
        customerId: string;
        customerName: string;
        customerGroup: string;
        orders: number;
        totalAmount: number;
        discount: number;
        revenue: number;
        status: string;
        orderDetails: any[];
      };
    } = {};

    filteredOrders.forEach((order: any) => {
      const customerId = order.customerId || "guest";
      const customerName = order.customerName || t("common.walkInCustomer");

      if (!customerData[customerId]) {
        customerData[customerId] = {
          customerId: customerId === "guest" ? "KL-001" : customerId,
          customerName: customerName,
          customerGroup: t("common.regularCustomer"), // Default group
          orders: 0,
          totalAmount: 0,
          discount: 0,
          revenue: 0,
          status: t("reports.active"),
          orderDetails: [],
        };
      }

      const orderTotal = Number(order.total);
      const orderSubtotal = Number(order.subtotal || orderTotal * 1.1); // Calculate subtotal if not available
      const orderDiscount = orderSubtotal - orderTotal;

      customerData[customerId].orders += 1;
      customerData[customerId].totalAmount += orderSubtotal;
      customerData[customerId].discount += orderDiscount;
      customerData[customerId].revenue += orderTotal;
      customerData[customerId].orderDetails.push(order);

      // Determine customer group based on total spending
      if (customerData[customerId].revenue >= 1000000) {
        customerData[customerId].customerGroup = t("reports.vip");
      } else if (customerData[customerId].revenue >= 500000) {
        customerData[customerId].customerGroup = t("common.goldCustomer");
      }
    });

    const data = Object.values(customerData).sort(
      (a, b) => b.revenue - a.revenue,
    );

    // Pagination logic
    const totalPages = Math.ceil(data.length / customerPageSize);
    const startIndex = (customerCurrentPage - 1) * customerPageSize;
    const endIndex = startIndex + customerPageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("reports.customerSalesReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="text-center border-r bg-green-50 w-12"
                    rowSpan={1}
                  ></TableHead>
                  <TableHead className="text-center border-r bg-green-50 min-w-[120px]">
                    {t("reports.customerId")}
                  </TableHead>
                  <TableHead className="text-center border-r bg-green-50 min-w-[150px]">
                    {t("reports.customerName")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[100px]">
                    {t("reports.orders")}
                  </TableHead>
                  <TableHead className="text-center border-r min-w-[130px]">
                    {t("common.customerGroup")}
                  </TableHead>
                  <TableHead className="text-right border-r min-w-[140px]">
                    {t("reports.totalAmount")}
                  </TableHead>
                  <TableHead className="text-right border-r min-w-[120px]">
                    {t("reports.discount")}
                  </TableHead>
                  <TableHead className="text-right border-r min-w-[140px]">
                    {t("reports.revenue")}
                  </TableHead>
                  <TableHead className="text-center min-w-[100px]">
                    {t("reports.status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => {
                    const isExpanded = expandedRows[item.customerId] || false;

                    return (
                      <>
                        <TableRow key={`${item.customerId}-${index}`} className="hover:bg-gray-50">
                          <TableCell className="text-center border-r w-12">
                            <button
                              onClick={() =>
                                setExpandedRows((prev) => ({
                                  ...prev,
                                  [item.customerId]: !prev[item.customerId],
                                }))
                              }
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-sm"
                            >
                              {isExpanded ? "−" : "+"}
                            </button>
                          </TableCell>
                          <TableCell className="text-center border-r bg-green-50 font-medium min-w-[120px] px-4">
                            {item.customerId}
                          </TableCell>
                          <TableCell className="text-center border-r bg-green-50 min-w-[150px] px-4">
                            {item.customerName}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[100px] px-4">
                            {item.orders}
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[130px] px-4">
                            <Badge variant={item.customerGroup === t("reports.vip") ? "default" : "secondary"}>
                              {item.customerGroup}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right border-r min-w-[140px] px-4">
                            {formatCurrency(item.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                            {formatCurrency(item.discount)}
                          </TableCell>
                          <TableCell className="text-right border-r text-green-600 font-medium min-w-[140px] px-4">
                            {formatCurrency(item.revenue)}
                          </TableCell>
                          <TableCell className="text-center min-w-[100px] px-4">
                            <Badge variant={item.status === t("reports.active") ? "default" : "secondary"}>
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>

                        {/* Expanded order details */}
                        {isExpanded &&
                          item.orderDetails.length > 0 &&
                          item.orderDetails.map(
                            (order: any, orderIndex: number) => (
                              <TableRow
                                key={`${item.customerId}-order-${order.id || orderIndex}`}
                                className="bg-blue-50/50 border-l-4 border-l-blue-400"
                              >
                                <TableCell className="text-center border-r bg-blue-50 w-12">
                                  <div className="w-8 h-6 flex items-center justify-center text-blue-600 text-xs">
                                    └
                                  </div>
                                </TableCell>
                                <TableCell className="text-center border-r text-blue-600 text-sm min-w-[120px] px-4">
                                  {order.orderNumber || `ORD-${order.id}`}
                                </TableCell>
                                <TableCell className="text-center border-r text-sm min-w-[150px] px-4">
                                  {new Date(order.orderedAt || order.created_at).toLocaleDateString("vi-VN")}
                                </TableCell>
                                <TableCell className="text-center border-r text-sm min-w-[100px] px-4">1</TableCell>
                                <TableCell className="text-center border-r text-sm min-w-[130px] px-4">
                                  {getPaymentMethodLabel(order.paymentMethod)}
                                </TableCell>
                                <TableCell className="text-right border-r text-sm min-w-[140px] px-4">
                                  {formatCurrency(Number(order.subtotal || Number(order.total) * 1.1))}
                                </TableCell>
                                <TableCell className="text-right border-r text-red-600 text-sm min-w-[120px] px-4">
                                  {formatCurrency((Number(order.subtotal || Number(order.total) * 1.1) - Number(order.total)))}
                                </TableCell>
                                <TableCell className="text-right border-r text-green-600 font-medium text-sm min-w-[140px] px-4">
                                  {formatCurrency(Number(order.total))}
                                </TableCell>
                                <TableCell className="text-center text-sm min-w-[100px] px-4">
                                  <Badge variant={order.status === "paid" ? "default" : "secondary"} className="text-xs">
                                    {order.status === "paid" ? t("common.paid") : order.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                      </>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500">
                      {t("reports.noDataDescription")}
                    </TableCell>
                  </TableRow>
                )}

                {/* Summary Row */}
                {data.length > 0 && (
                  <TableRow className="bg-gray-100 font-bold border-t-2">
                    <TableCell className="text-center border-r w-12"></TableCell>
                    <TableCell className="text-center border-r bg-green-100 min-w-[120px] px-4">
                      {t("common.total")}
                    </TableCell>
                    <TableCell className="text-center border-r bg-green-100 min-w-[150px] px-4">
                      {data.length} khách hàng
                    </TableCell>
                    <TableCell className="text-center border-r min-w-[100px] px-4">
                      {data.reduce((sum, item) => sum + item.orders, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center border-r min-w-[130px] px-4"></TableCell>
                    <TableCell className="text-right border-r min-w-[140px] px-4">
                      {formatCurrency(data.reduce((sum, item) => sum + item.totalAmount, 0))}
                    </TableCell>
                    <TableCell className="text-right border-r text-red-600 min-w-[120px] px-4">
                      {formatCurrency(data.reduce((sum, item) => sum + item.discount, 0))}
                    </TableCell>
                    <TableCell className="text-right border-r text-green-600 min-w-[140px] px-4">
                      {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
                    </TableCell>
                    <TableCell className="text-center min-w-[100px] px-4"></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls for Customer Report */}
          {data.length > 0 && (
            <div className="flex items-center justify-between space-x-6 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("common.show")}</p>
                <Select
                  value={customerPageSize.toString()}
                  onValueChange={(value) => {
                    setCustomerPageSize(Number(value));
                    setCustomerCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm font-medium">{t("common.rows")}</p>
              </div>

              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t("common.page")} {customerCurrentPage} / {totalPages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCustomerCurrentPage(1)}
                    disabled={customerCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCustomerCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={customerCurrentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCustomerCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={customerCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCustomerCurrentPage(totalPages)}
                    disabled={customerCurrentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Legacy Sales Channel Report Component Logic
  const renderSalesChannelReport = () => {
    if (!transactions || !Array.isArray(transactions)) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.loading")}...</div>
        </div>
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      const dateMatch = transactionDate >= start && transactionDate <= end;

      const channelMatch =
        salesChannel === "all" ||
        transaction.salesChannel === salesChannel ||
        (salesChannel === "direct" &&
          (!transaction.salesChannel ||
            transaction.salesChannel === "Direct")) ||
        (salesChannel === "other" &&
          transaction.salesChannel &&
          transaction.salesChannel !== "Direct");

      return dateMatch && channelMatch;
    });

    const channelData: {
      [channel: string]: {
        salesChannel: string;
        revenue: number;
        returnValue: number;
        netRevenue: number;
        orders: number;
        totalProducts: number;
        commission: number;
        netProfit: number;
        totalCost: number;
        grossProfit: number;
      };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const channel = transaction.salesChannel || "Direct";

      if (!channelData[channel]) {
        channelData[channel] = {
          salesChannel: channel,
          revenue: 0,
          returnValue: 0,
          netRevenue: 0,
          orders: 0,
          totalProducts: 0,
          commission: 0,
          netProfit: 0,
          totalCost: 0,
          grossProfit: 0,
        };
      }

      const amount = Number(transaction.total);
      channelData[channel].orders += 1;

      if (amount > 0) {
        channelData[channel].revenue += amount;
        channelData[channel].totalCost += amount * 0.6;

        const commissionRate = channel === "Direct" ? 0 : 0.05;
        channelData[channel].commission += amount * commissionRate;
      } else {
        channelData[channel].returnValue += Math.abs(amount);
      }

      const items = transaction.items || [];
      items.forEach((item: any) => {
        channelData[channel].totalProducts += Number(item.quantity || 1);
      });
    });

    Object.values(channelData).forEach((data) => {
      data.netRevenue = data.revenue - data.returnValue;
      data.grossProfit = data.netRevenue - data.totalCost;
      data.netProfit = data.grossProfit - data.commission;
    });

    const data = Object.values(channelData).sort(
      (a, b) => b.netRevenue - a.netRevenue,
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("reports.channelSalesReport")}
          </CardTitle>
          <CardDescription>
            {t("reports.fromDate")}: {formatDate(startDate)} -{" "}
            {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.salesChannel")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.orders")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.totalProducts")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.commission")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.grossProfit")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netProfit")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.map((item, index) => (
                  <TableRow key={`${item.salesChannel}-${index}`}>
                    <TableCell className="font-medium">
                      {item.salesChannel}
                    </TableCell>
                    <TableCell className="text-center">{item.orders}</TableCell>
                    <TableCell className="text-center">
                      {item.totalProducts}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.returnValue)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.netRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(item.commission)}
                    </TableCell>
                    <TableCell className="text-right text-purple-600">
                      {formatCurrency(item.grossProfit)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(item.netProfit)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500">
                    {t("reports.noDataDescription")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  // Chart configurations for each analysis type
  const chartConfig = {
    revenue: {
      label: t("reports.revenue"),
      color: "#10b981",
    },
    netRevenue: {
      label: t("reports.netRevenue"),
      color: "#3b82f6",
    },
    returnValue: {
      label: t("reports.returnValue"),
      color: "#ef4444",
    },
    quantity: {
      label: t("reports.quantity"),
      color: "#f59e0b",
    },
    profit: {
      label: t("reports.profit"),
      color: "#8b5cf6",
    },
  };

  // Get chart data based on analysis type
  const getChartData = () => {
    switch (analysisType) {
      case "time":
        if (!transactions || !Array.isArray(transactions)) return [];

        const filteredTransactions = transactions.filter((transaction: any) => {
          const transactionDate = new Date(
            transaction.createdAt || transaction.created_at,
          );
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          const transactionDateOnly = new Date(transactionDate);
          transactionDateOnly.setHours(0, 0, 0, 0);
          return transactionDateOnly >= start && transactionDateOnly <= end;
        });

        const dailySales: {
          [date: string]: { revenue: number; orders: number };
        } = {};

        filteredTransactions.forEach((transaction: any) => {
          const transactionDate = new Date(
            transaction.createdAt || transaction.created_at,
          );
          const year = transactionDate.getFullYear();
          const month = (transactionDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          const day = transactionDate.getDate().toString().padStart(2, "0");
          const date = `${day}/${month}`;

          if (!dailySales[date]) {
            dailySales[date] = { revenue: 0, orders: 0 };
          }
          dailySales[date].revenue += Number(transaction.total || 0);
          dailySales[date].orders += 1;
        });

        return Object.entries(dailySales)
          .map(([date, data]) => ({
            name: date,
            revenue: data.revenue,
            orders: data.orders,
          }))
          .slice(0, 10);

      case "product":
        if (
          !products ||
          !Array.isArray(products) ||
          !orders ||
          !Array.isArray(orders)
        )
          return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredOrders = orders.filter((order: any) => {
          const orderDate = new Date(order.orderedAt || order.created_at);
          return (
            orderDate >= start && orderDate <= end && order.status === "paid"
          );
        });

        const productSales: {
          [productId: string]: { quantity: number; revenue: number };
        } = {};

        filteredOrders.forEach((order: any) => {
          const orderTotal = Number(order.total);
          const availableProducts = products.filter((p) => p.price > 0);

          if (availableProducts.length === 0) return;

          const orderProductCount = Math.min(
            Math.floor(Math.random() * 3) + 1,
            availableProducts.length,
          );
          const selectedProducts = availableProducts
            .sort(() => 0.5 - Math.random())
            .slice(0, orderProductCount);
          const totalSelectedPrice = selectedProducts.reduce(
            (sum, p) => sum + (p.price || 0),
            0,
          );

          selectedProducts.forEach((product: any) => {
            const productId = product.id.toString();
            if (!productSales[productId]) {
              productSales[productId] = { quantity: 0, revenue: 0 };
            }

            const proportion =
              totalSelectedPrice > 0
                ? (product.price || 0) / totalSelectedPrice
                : 1 / selectedProducts.length;
            const productRevenue = orderTotal * proportion;
            const quantity = Math.max(
              1,
              Math.floor(productRevenue / (product.price || 1)),
            );

            productSales[productId].quantity += quantity;
            productSales[productId].revenue += productRevenue;
          });
        });

        return products
          .map((product: any) => {
            const sales = productSales[product.id.toString()] || {
              quantity: 0,
              revenue: 0,
            };
            return {
              name:
                product.name.length > 15
                  ? product.name.substring(0, 15) + "..."
                  : product.name,
              revenue: sales.revenue,
              quantity: sales.quantity,
            };
          })
          .filter((item) => item.quantity > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

      case "employee":
        if (!transactions || !Array.isArray(transactions)) return [];

        const empStart = new Date(startDate);
        const empEnd = new Date(endDate);
        empEnd.setHours(23, 59, 59, 999);

        const empFilteredTransactions = transactions.filter(
          (transaction: any) => {
            const transactionDate = new Date(
              transaction.createdAt || transaction.created_at,
            );
            return transactionDate >= empStart && transactionDate <= empEnd;
          },
        );

        const employeeData: {
          [cashier: string]: { revenue: number; orders: number };
        } = {};

        empFilteredTransactions.forEach((transaction: any) => {
          const cashier =
            transaction.cashierName || transaction.employeeName || "Unknown";
          if (!employeeData[cashier]) {
            employeeData[cashier] = { revenue: 0, orders: 0 };
          }

          const amount = Number(transaction.total);
          if (amount > 0) {
            employeeData[cashier].revenue += amount;
            employeeData[cashier].orders += 1;
          }
        });

        return Object.entries(employeeData)
          .map(([name, data]) => ({
            name: name.length > 10 ? name.substring(0, 10) + "..." : name,
            revenue: data.revenue,
            orders: data.orders,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

      case "customer":
        if (!orders || !Array.isArray(orders)) return [];

        const custStart = new Date(startDate);
        const custEnd = new Date(endDate);
        custEnd.setHours(23, 59, 59, 999);

        const custFilteredOrders = orders.filter((order: any) => {
          const orderDate = new Date(
            order.orderedAt || order.created_at || order.createdAt,
          );
          return (
            orderDate >= custStart &&
            orderDate <= custEnd &&
            order.status === "paid"
          );
        });

        const customerData: {
          [customerId: string]: {
            revenue: number;
            orders: number;
            customerName: string;
          };
        } = {};

        custFilteredOrders.forEach((order: any) => {
          const customerId = order.customerId || "guest";
          const customerName = order.customerName || "Khách lẻ";

          if (!customerData[customerId]) {
            customerData[customerId] = { revenue: 0, orders: 0, customerName };
          }

          const orderTotal = Number(order.total);
          customerData[customerId].revenue += orderTotal;
          customerData[customerId].orders += 1;
        });

        return Object.entries(customerData)
          .map(([id, data]) => ({
            name:
              data.customerName.length > 12
                ? data.customerName.substring(0, 12) + "..."
                : data.customerName,
            revenue: data.revenue,
            orders: data.orders,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

      case "channel":
        if (!transactions || !Array.isArray(transactions)) return [];

        const channelStart = new Date(startDate);
        const channelEnd = new Date(endDate);
        channelEnd.setHours(23, 59, 59, 999);

        const channelFilteredTransactions = transactions.filter(
          (transaction: any) => {
            const transactionDate = new Date(
              transaction.createdAt || transaction.created_at,
            );
            return (
              transactionDate >= channelStart && transactionDate <= channelEnd
            );
          },
        );

        const channelData: {
          [channel: string]: { revenue: number; orders: number };
        } = {};

        channelFilteredTransactions.forEach((transaction: any) => {
          const channel = transaction.salesChannel || "Direct";

          if (!channelData[channel]) {
            channelData[channel] = { revenue: 0, orders: 0 };
          }

          const amount = Number(transaction.total);
          if (amount > 0) {
            channelData[channel].revenue += amount;
            channelData[channel].orders += 1;
          }
        });

        return Object.entries(channelData)
          .map(([name, data]) => ({
            name: name,
            revenue: data.revenue,
            orders: data.orders,
          }))
          .sort((a, b) => b.revenue - a.revenue);

      default:
        return [];
    }
  };

  // Chart rendering component
  const renderChart = () => {
    const chartData = getChartData();

    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">{t("reports.noDataDescription")}</div>
        </div>
      );
    }

    return (
      <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-white/90 text-sm font-normal">
                {t("reports.chartView")}
              </div>
              <div className="text-white font-semibold">{getReportTitle()}</div>
            </div>
          </CardTitle>
          <CardDescription className="text-blue-100 mt-2">
            {t("reports.visualRepresentation")} - {t("reports.fromDate")}:{" "}
            {formatDate(startDate)} {t("reports.toDate")}: {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 bg-white/80 backdrop-blur-sm">
          <div className="h-[450px] w-full bg-white/90 rounded-xl border-0 shadow-lg p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20 rounded-xl"></div>
            <ChartContainer
              config={chartConfig}
              className="h-full w-full relative z-10"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.6}
                      />
                    </linearGradient>
                    <linearGradient
                      id="ordersGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.6}
                      />
                    </linearGradient>
                    <linearGradient
                      id="quantityGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop
                        offset="95%"
                        stopColor="#f59e0b"
                        stopOpacity={0.6}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-gray-200 shadow-lg">
                            <p className="font-semibold text-gray-800 mb-2">
                              {label}
                            </p>
                            {payload.map((entry, index) => {
                              const translatedName =
                                entry.dataKey === "revenue"
                                  ? t("reports.revenue")
                                  : entry.dataKey === "orders"
                                    ? t("reports.orders")
                                    : entry.dataKey === "quantity"
                                      ? t("reports.quantity")
                                      : entry.name;
                              return (
                                <p
                                  key={index}
                                  className="text-sm"
                                  style={{ color: entry.color }}
                                >
                                  {translatedName}:{" "}
                                  {entry.dataKey === "revenue" ||
                                  entry.dataKey === "netRevenue"
                                    ? formatCurrency(Number(entry.value))
                                    : entry.value}
                                </p>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Revenue bar - always show */}
                  <Bar
                    dataKey="revenue"
                    fill="url(#revenueGradient)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />

                  {/* Additional bars based on analysis type */}
                  {analysisType === "time" && (
                    <Bar
                      dataKey="orders"
                      fill="url(#ordersGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  )}

                  {analysisType === "product" && (
                    <Bar
                      dataKey="quantity"
                      fill="url(#quantityGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  )}

                  {(analysisType === "employee" ||
                    analysisType === "customer" ||
                    analysisType === "channel") && (
                    <Bar
                      dataKey="orders"
                      fill="url(#ordersGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Main render component function
  const renderReportContent = () => {
    switch (analysisType) {
      case "time":
        return <div className="space-y-6">{renderSalesReport()}</div>;
      case "product":
        return renderInventoryReport();
      case "employee":
        return renderEmployeeReport();
      case "customer":
        return renderCustomerReport();
      case "channel":
        return renderSalesChannelReport();
      default:
        return renderSalesReport();
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          {/* Main Filter Row */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Analysis Type */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {t("reports.analyzeBy")}
              </Label>
              <Select
                value={analysisType}
                onValueChange={(value) => {
                  setAnalysisType(value);
                  if (value !== "time") {
                    setConcernType("sales");
                  } else {
                    setConcernType("time");
                  }
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">
                    {t("reports.timeAnalysis")}
                  </SelectItem>
                  <SelectItem value="product">
                    {t("reports.productAnalysis")}
                  </SelectItem>
                  <SelectItem value="employee">
                    {t("reports.employeeAnalysis")}
                  </SelectItem>
                  <SelectItem value="customer">
                    {t("reports.customerAnalysis")}
                  </SelectItem>
                  <SelectItem value="channel">
                    {t("reports.channelAnalysis")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {t("reports.startDate")}
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                {t("reports.endDate")}
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Secondary Filter Row - Show based on analysis type */}
          {analysisType === "employee" && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Tìm kiếm nhân viên
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm theo tên nhân viên"
                    value={selectedEmployee === "all" ? "" : selectedEmployee}
                    onChange={(e) =>
                      setSelectedEmployee(e.target.value || "all")
                    }
                    className="pl-10 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {analysisType === "customer" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.customerFilter")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={t("reports.customerFilterPlaceholder")}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.status")}
                </Label>
                <Select value={customerStatus} onValueChange={setCustomerStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="active">{t("reports.active")}</SelectItem>
                    <SelectItem value="inactive">{t("reports.inactive")}</SelectItem>
                    <SelectItem value="vip">{t("reports.vip")}</SelectItem>
                    <SelectItem value="new">{t("reports.newCustomer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {analysisType === "product" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.productFilter")}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm theo tên hoặc mã"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Loại hàng
                </Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="combo">Combo-Đóng gói</SelectItem>
                    <SelectItem value="product">Hàng hóa</SelectItem>
                    <SelectItem value="service">Dịch vụ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Nhóm hàng
                </Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Nhóm hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {categories &&
                      Array.isArray(categories) &&
                      categories.map((category: any) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {analysisType === "channel" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.salesMethod")}
                </Label>
                <Select value={salesMethod} onValueChange={setSalesMethod}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="no_delivery">
                      {t("reports.noDelivery")}
                    </SelectItem>
                    <SelectItem value="delivery">
                      {t("reports.delivery")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("reports.salesChannel")}
                </Label>
                <Select value={salesChannel} onValueChange={setSalesChannel}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="direct">
                      {t("reports.direct")}
                    </SelectItem>
                    <SelectItem value="other">{t("reports.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {getReportTitle()}
            </CardTitle>
            <CardDescription>
              {t("reports.salesChartDescription")}
            </CardDescription>
          </CardHeader>
        </Card>

        {transactionsLoading || ordersLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t("reports.loading")}...</div>
          </div>
        ) : (
          <>
            {/* Chart Display */}
            {renderChart()}

            {/* Data Tables */}
            {renderReportContent()}
          </>
        )}
      </div>
    </div>
  );
}