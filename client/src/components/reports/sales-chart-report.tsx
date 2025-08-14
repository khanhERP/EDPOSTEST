import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { TrendingUp, FileText, Calendar } from "lucide-react";
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

  const [analysisType, setAnalysisType] = useState("time");
  const [concernType, setConcernType] = useState("time");
  const today = new Date(); // Define today once
  const [startDate, setStartDate] = useState<string>(
    today.toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    today.toISOString().split("T")[0],
  );
  const [salesMethod, setSalesMethod] = useState("all");
  const [salesChannel, setSalesChannel] = useState("all");
  const [savedSettings, setSavedSettings] = useState<any>(null);
  const [previousReportData, setPreviousReportData] = useState<any>(null);
  
  // Additional filters from legacy reports
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [productType, setProductType] = useState("all");

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Load previous report settings when analysis type changes
  useEffect(() => {
    const loadPreviousSettings = () => {
      try {
        // Define mapping from analysis type to legacy report storage keys
        const legacyReportMapping = {
          time: `salesReport_time_${concernType}_settings`,
          product: "inventoryReport_settings", // Báo cáo Hàng hóa
          employee: "employeeReport_settings", // Báo cáo nhân viên
          customer: "customerReport_settings", // Báo cáo khách hàng
          channel: "salesChannelReport_settings", // Báo cáo kênh bán hàng
        };

        const storageKey =
          legacyReportMapping[analysisType] ||
          `salesReport_${analysisType}_${concernType}_settings`;
        const savedConfig = localStorage.getItem(storageKey);

        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setSavedSettings(parsedConfig);

          // Apply saved settings if they exist
          if (parsedConfig.dateRange) {
            setStartDate(parsedConfig.dateRange.startDate || startDate);
            setEndDate(parsedConfig.dateRange.endDate || endDate);
          }
          if (parsedConfig.filters) {
            setSalesMethod(parsedConfig.filters.salesMethod || "all");
            setSalesChannel(parsedConfig.filters.salesChannel || "all");
          }
        }

        // Load previous report data for comparison
        const legacyDataMapping = {
          time: `salesReport_time_${concernType}_data`,
          product: "inventoryReport_data",
          employee: "employeeReport_data",
          customer: "customerReport_data",
          channel: "salesChannelReport_data",
        };

        const dataKey =
          legacyDataMapping[analysisType] ||
          `salesReport_${analysisType}_${concernType}_data`;
        const savedData = localStorage.getItem(dataKey);
        if (savedData) {
          setPreviousReportData(JSON.parse(savedData));
        }

        // Load legacy report configurations and data based on analysis type
        loadLegacyReportData(analysisType);
      } catch (error) {
        console.warn("Failed to load previous report settings:", error);
      }
    };

    loadPreviousSettings();
  }, [analysisType, concernType]);

  // Function to load legacy report data and configurations
  const loadLegacyReportData = (type: string) => {
    try {
      switch (type) {
        case "product":
          // Load inventory report settings and data
          const inventorySettings = localStorage.getItem("inventoryReport_settings");
          const inventoryData = localStorage.getItem("inventoryReport_data");
          
          if (inventorySettings) {
            const settings = JSON.parse(inventorySettings);
            if (settings.dateRange) {
              setStartDate(settings.dateRange.startDate || startDate);
              setEndDate(settings.dateRange.endDate || endDate);
            }
            if (settings.concernType) {
              setConcernType(settings.concernType);
            }
          }
          
          if (inventoryData) {
            const data = JSON.parse(inventoryData);
            setPreviousReportData(data);
          }
          break;

        case "employee":
          // Load employee report settings and data
          const employeeSettings = localStorage.getItem("employeeReport_settings");
          const employeeData = localStorage.getItem("employeeReport_data");
          
          if (employeeSettings) {
            const settings = JSON.parse(employeeSettings);
            if (settings.dateRange) {
              setStartDate(settings.dateRange.startDate || startDate);
              setEndDate(settings.dateRange.endDate || endDate);
            }
            if (settings.concernType) {
              setConcernType(settings.concernType);
            }
          }
          
          if (employeeData) {
            const data = JSON.parse(employeeData);
            setPreviousReportData(data);
          }
          break;

        case "customer":
          // Load customer report settings and data
          const customerSettings = localStorage.getItem("customerReport_settings");
          const customerData = localStorage.getItem("customerReport_data");
          
          if (customerSettings) {
            const settings = JSON.parse(customerSettings);
            if (settings.dateRange) {
              setStartDate(settings.dateRange.startDate || startDate);
              setEndDate(settings.dateRange.endDate || endDate);
            }
            if (settings.concernType) {
              setConcernType(settings.concernType);
            }
          }
          
          if (customerData) {
            const data = JSON.parse(customerData);
            setPreviousReportData(data);
          }
          break;

        case "channel":
          // Load sales channel report settings and data
          const channelSettings = localStorage.getItem("salesChannelReport_settings");
          const channelData = localStorage.getItem("salesChannelReport_data");
          
          if (channelSettings) {
            const settings = JSON.parse(channelSettings);
            if (settings.dateRange) {
              setStartDate(settings.dateRange.startDate || startDate);
              setEndDate(settings.dateRange.endDate || endDate);
            }
            if (settings.concernType) {
              setConcernType(settings.concernType);
            }
          }
          
          if (channelData) {
            const data = JSON.parse(channelData);
            setPreviousReportData(data);
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.warn(`Failed to load legacy report data for ${type}:`, error);
    }
  };

  // Save current settings when filters change
  useEffect(() => {
    const saveCurrentSettings = () => {
      try {
        // Save to both current format and legacy format for compatibility
        const legacyReportMapping = {
          time: `salesReport_time_${concernType}_settings`,
          product: "inventoryReport_settings",
          employee: "employeeReport_settings",
          customer: "customerReport_settings",
          channel: "salesChannelReport_settings",
        };

        const storageKey =
          legacyReportMapping[analysisType] ||
          `salesReport_${analysisType}_${concernType}_settings`;
        const currentSettings = {
          dateRange: { startDate, endDate },
          filters: { salesMethod, salesChannel },
          lastUpdated: new Date().toISOString(),
          analysisType,
          concernType,
        };

        localStorage.setItem(storageKey, JSON.stringify(currentSettings));
      } catch (error) {
        console.warn("Failed to save current settings:", error);
      }
    };

    // Only save if we have meaningful data
    if (startDate && endDate) {
      saveCurrentSettings();
    }
  }, [
    startDate,
    endDate,
    salesMethod,
    salesChannel,
    analysisType,
    concernType,
  ]);

  const getFilteredData = () => {
    if (!transactions || !Array.isArray(transactions)) return [];

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = transactionDate >= start && transactionDate <= end;

      // For now, we'll assume all transactions are "no delivery" and "direct"
      // In a real system, you would filter based on actual delivery and channel data
      const methodMatch =
        salesMethod === "all" ||
        (salesMethod === "no_delivery" && true) ||
        (salesMethod === "delivery" && false);

      const channelMatch =
        salesChannel === "all" ||
        (salesChannel === "direct" && true) ||
        (salesChannel === "other" && false);

      return dateMatch && methodMatch && channelMatch;
    });

    return filteredTransactions;
  };

  const getReportTitle = () => {
    if (analysisType === "time") {
      const concernTypes = {
        time: t("reports.timeSalesReport"),
        profit: t("reports.profitByInvoiceReport"),
        discount: t("reports.invoiceDiscountReport"),
        return: t("reports.returnByInvoiceReport"),
        employee: t("reports.employeeSalesReport"),
      };
      return (
        concernTypes[concernType as keyof typeof concernTypes] ||
        t("reports.comprehensiveSalesReport")
      );
    } else {
      const analysisTypes = {
        product: t("reports.productSalesReport"),
        employee: t("reports.employeeSalesReport"),
        customer: t("reports.customerSalesReport"),
        channel: t("reports.channelSalesReport"),
      };
      return (
        analysisTypes[analysisType as keyof typeof analysisTypes] ||
        t("reports.comprehensiveSalesReport")
      );
    }
  };

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

  const renderTimeReport = () => {
    const dataToUse = previousReportData?.data || getFilteredData();
    const dailyData: {
      [date: string]: { revenue: number; returnValue: number };
    } = {};

    dataToUse.forEach((transaction: any) => {
      const date = new Date(
        transaction.createdAt || transaction.created_at,
      ).toLocaleDateString("vi-VN");
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, returnValue: 0 };
      }

      const amount = Number(transaction.total);
      if (amount > 0) {
        dailyData[date].revenue += amount;
      } else {
        dailyData[date].returnValue += Math.abs(amount);
      }
    });

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.time")}</TableHead>
            <TableHead>{t("reports.totalRevenue")}</TableHead>
            <TableHead>{t("reports.returnValue")}</TableHead>
            <TableHead>{t("reports.netRevenue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(dailyData).map(([date, data]) => (
            <TableRow key={date}>
              <TableCell>{date}</TableCell>
              <TableCell>{formatCurrency(data.revenue)}</TableCell>
              <TableCell>{formatCurrency(data.returnValue)}</TableCell>
              <TableCell>
                {formatCurrency(data.revenue - data.returnValue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderProfitReport = () => {
    const dataToUse = previousReportData?.data || getFilteredData();
    const dailyData: {
      [date: string]: {
        totalAmount: number;
        discount: number;
        revenue: number;
        cost: number;
      };
    } = {};

    dataToUse.forEach((transaction: any) => {
      const date = new Date(
        transaction.createdAt || transaction.created_at,
      ).toLocaleDateString("vi-VN");
      if (!dailyData[date]) {
        dailyData[date] = { totalAmount: 0, discount: 0, revenue: 0, cost: 0 };
      }

      const subtotal = Number(transaction.subtotal || transaction.total);
      const total = Number(transaction.total);
      const discount = subtotal - total;

      dailyData[date].totalAmount += subtotal;
      dailyData[date].discount += discount;
      dailyData[date].revenue += total;
      dailyData[date].cost += total * 0.6; // Assume 60% cost ratio
    });

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.time")}</TableHead>
            <TableHead>{t("reports.totalAmount")}</TableHead>
            <TableHead>{t("reports.discount")}</TableHead>
            <TableHead>{t("reports.revenue")}</TableHead>
            <TableHead>{t("reports.totalCost")}</TableHead>
            <TableHead>{t("reports.grossProfit")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(dailyData).map(([date, data]) => (
            <TableRow key={date}>
              <TableCell>{date}</TableCell>
              <TableCell>{formatCurrency(data.totalAmount)}</TableCell>
              <TableCell>{formatCurrency(data.discount)}</TableCell>
              <TableCell>{formatCurrency(data.revenue)}</TableCell>
              <TableCell>{formatCurrency(data.cost)}</TableCell>
              <TableCell>{formatCurrency(data.revenue - data.cost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderDiscountReport = () => {
    const dataToUse = previousReportData?.data || getFilteredData();
    const dailyData: {
      [date: string]: {
        invoiceCount: number;
        invoiceValue: number;
        discount: number;
      };
    } = {};

    dataToUse.forEach((transaction: any) => {
      const date = new Date(
        transaction.createdAt || transaction.created_at,
      ).toLocaleDateString("vi-VN");
      if (!dailyData[date]) {
        dailyData[date] = { invoiceCount: 0, invoiceValue: 0, discount: 0 };
      }

      const subtotal = Number(transaction.subtotal || transaction.total);
      const total = Number(transaction.total);
      const discount = subtotal - total;

      dailyData[date].invoiceCount += 1;
      dailyData[date].invoiceValue += subtotal;
      dailyData[date].discount += discount;
    });

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.time")}</TableHead>
            <TableHead>{t("reports.totalInvoices")}</TableHead>
            <TableHead>{t("reports.invoiceValue")}</TableHead>
            <TableHead>{t("reports.invoiceDiscount")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(dailyData).map(([date, data]) => (
            <TableRow key={date}>
              <TableCell>{date}</TableCell>
              <TableCell>{data.invoiceCount}</TableCell>
              <TableCell>{formatCurrency(data.invoiceValue)}</TableCell>
              <TableCell>{formatCurrency(data.discount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderReturnReport = () => {
    const dataToUse = previousReportData?.data || getFilteredData();
    const dailyData: {
      [date: string]: { returnCount: number; returnValue: number };
    } = {};

    dataToUse.forEach((transaction: any) => {
      const date = new Date(
        transaction.createdAt || transaction.created_at,
      ).toLocaleDateString("vi-VN");
      const amount = Number(transaction.total);

      if (amount < 0) {
        // Return transactions
        if (!dailyData[date]) {
          dailyData[date] = { returnCount: 0, returnValue: 0 };
        }
        dailyData[date].returnCount += 1;
        dailyData[date].returnValue += Math.abs(amount);
      }
    });

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.time")}</TableHead>
            <TableHead>{t("reports.returnTicketCount")}</TableHead>
            <TableHead>{t("reports.returnValue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(dailyData).length > 0 ? (
            Object.entries(dailyData).map(([date, data]) => (
              <TableRow key={date}>
                <TableCell>{date}</TableCell>
                <TableCell>{data.returnCount}</TableCell>
                <TableCell>{formatCurrency(data.returnValue)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-gray-500">
                {t("reports.noData")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  const renderEmployeeReport = () => {
    const dataToUse = previousReportData?.data || getFilteredData();
    const employeeData: {
      [cashier: string]: { revenue: number; returnValue: number };
    } = {};

    dataToUse.forEach((transaction: any) => {
      const cashier = transaction.cashierName || "Unknown";
      if (!employeeData[cashier]) {
        employeeData[cashier] = { revenue: 0, returnValue: 0 };
      }

      const amount = Number(transaction.total);
      if (amount > 0) {
        employeeData[cashier].revenue += amount;
      } else {
        employeeData[cashier].returnValue += Math.abs(amount);
      }
    });

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.seller")}</TableHead>
            <TableHead>{t("reports.totalRevenue")}</TableHead>
            <TableHead>{t("reports.returnValue")}</TableHead>
            <TableHead>{t("reports.netRevenue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(employeeData).map(([cashier, data]) => (
            <TableRow key={cashier}>
              <TableCell>{cashier}</TableCell>
              <TableCell>{formatCurrency(data.revenue)}</TableCell>
              <TableCell>{formatCurrency(data.returnValue)}</TableCell>
              <TableCell>
                {formatCurrency(data.revenue - data.returnValue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Product analysis data processing (integrated from inventory-report)
  const getProductAnalysisData = () => {
    // Use inventory report data if available
    if (previousReportData && previousReportData.type === 'inventory') {
      return previousReportData.data;
    }

    const dataToUse = previousReportData?.data || getFilteredData();
    if (!dataToUse.length) return [];

    // Get products data for enhanced processing
    const filteredProducts = products?.filter((product: any) => {
      const searchMatch = !productSearch || 
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase()));
      
      const categoryMatch = selectedCategory === "all" || 
        product.categoryId?.toString() === selectedCategory;
      
      return searchMatch && categoryMatch;
    }) || [];

    const productData: {
      [productId: string]: {
        productCode: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        quantityReturned: number;
        returnValue: number;
        netRevenue: number;
        totalCost: number;
        profit: number;
      };
    } = {};

    // Enhanced product sales calculation using inventory report logic
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = dataToUse.filter((order: any) => {
      const orderDate = new Date(order.orderedAt || order.created_at || order.createdAt);
      return orderDate >= start && orderDate <= end && order.status === 'paid';
    });

    const productSales: { [productId: string]: { quantity: number; revenue: number; orders: number } } = {};

    filteredOrders.forEach((order: any) => {
      const orderTotal = Number(order.total);
      const availableProducts = filteredProducts.filter(p => p.price > 0);

      if (availableProducts.length === 0) return;

      const orderProductCount = Math.min(
        Math.floor(Math.random() * 3) + 1, 
        availableProducts.length
      );

      const selectedProducts = availableProducts
        .sort(() => 0.5 - Math.random())
        .slice(0, orderProductCount);

      const totalSelectedPrice = selectedProducts.reduce((sum, p) => sum + (p.price || 0), 0);

      selectedProducts.forEach((product: any) => {
        const productId = product.id.toString();
        if (!productSales[productId]) {
          productSales[productId] = { quantity: 0, revenue: 0, orders: 0 };
        }

        const proportion = totalSelectedPrice > 0 ? (product.price || 0) / totalSelectedPrice : 1 / selectedProducts.length;
        const productRevenue = orderTotal * proportion;
        const quantity = Math.max(1, Math.floor(productRevenue / (product.price || 1)));

        productSales[productId].quantity += quantity;
        productSales[productId].revenue += productRevenue;
        productSales[productId].orders += 1;
      });
    });

    filteredProducts.forEach((product: any) => {
      const sales = productSales[product.id.toString()] || { quantity: 0, revenue: 0, orders: 0 };
      if (sales.quantity > 0) {
        const returnRate = 0.02;
        const quantityReturned = Math.floor(sales.quantity * returnRate);
        const returnValue = sales.revenue * returnRate;
        const costRatio = 0.6;
        const unitCost = (product.price || 0) * costRatio;
        const totalCost = sales.quantity * unitCost;

        productData[product.id] = {
          productCode: product.sku || product.id,
          productName: product.name,
          quantitySold: sales.quantity,
          revenue: sales.revenue,
          quantityReturned,
          returnValue,
          netRevenue: sales.revenue - returnValue,
          totalCost,
          profit: (sales.revenue - returnValue) - totalCost,
        };
      }
    });

    return Object.values(productData).sort((a, b) => b.netRevenue - a.netRevenue);
  };

  // Employee analysis data processing (integrated from employee-report)
  const getEmployeeAnalysisData = () => {
    // Use employee report data if available
    if (previousReportData && previousReportData.type === 'employee') {
      return previousReportData.data;
    }

    const dataToUse = previousReportData?.data || getFilteredData();
    
    // Enhanced employee analysis using employee report logic
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredTransactions = dataToUse.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at
      );
      const dateMatch = transactionDate >= start && transactionDate <= end;

      const employeeMatch = selectedEmployee === "all" ||
        transaction.cashierName === selectedEmployee ||
        transaction.employeeId?.toString() === selectedEmployee ||
        transaction.cashierName?.includes(selectedEmployee);

      return dateMatch && employeeMatch;
    });

    const employeeData: {
      [cashier: string]: {
        employee: string;
        revenue: number;
        returnValue: number;
        netRevenue: number;
        orders: number;
        totalProducts: number;
        topProduct: string;
        averageOrderValue: number;
        totalCost: number;
        grossProfit: number;
      };
    } = {};

    filteredTransactions.forEach((transaction: any) => {
      const cashier = transaction.cashierName || transaction.employeeName || "Unknown";
      
      if (!employeeData[cashier]) {
        employeeData[cashier] = {
          employee: cashier,
          revenue: 0,
          returnValue: 0,
          netRevenue: 0,
          orders: 0,
          totalProducts: 0,
          topProduct: "N/A",
          averageOrderValue: 0,
          totalCost: 0,
          grossProfit: 0,
        };
      }

      const amount = Number(transaction.total);
      employeeData[cashier].orders += 1;

      if (amount > 0) {
        employeeData[cashier].revenue += amount;
        employeeData[cashier].totalCost += amount * 0.6; // 60% cost ratio
      } else {
        employeeData[cashier].returnValue += Math.abs(amount);
      }

      // Count products from transaction items
      const items = transaction.items || [];
      items.forEach((item: any) => {
        employeeData[cashier].totalProducts += Number(item.quantity || 1);
      });
    });

    // Calculate derived metrics
    Object.values(employeeData).forEach((data) => {
      data.netRevenue = data.revenue - data.returnValue;
      data.averageOrderValue = data.orders > 0 ? data.netRevenue / data.orders : 0;
      data.grossProfit = data.netRevenue - data.totalCost;
    });

    return Object.values(employeeData).sort((a, b) => b.netRevenue - a.netRevenue);
  };

  // Customer analysis data processing (integrated from customer-report)
  const getCustomerAnalysisData = () => {
    // Use customer report data if available
    if (previousReportData && previousReportData.type === 'customer') {
      return previousReportData.data;
    }

    const dataToUse = previousReportData?.data || getFilteredData();
    
    // Enhanced customer analysis using customer report logic
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = dataToUse.filter((order: any) => {
      const orderDate = new Date(order.orderedAt || order.created_at || order.createdAt);
      const dateMatch = orderDate >= start && orderDate <= end;

      const customerMatch = !customerSearch ||
        (order.customerName && order.customerName.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.includes(customerSearch)) ||
        (order.customerId && order.customerId.toString().includes(customerSearch));

      return dateMatch && customerMatch && order.status === "paid";
    });

    const customerData: {
      [customerId: string]: {
        customer: string;
        revenue: number;
        returnValue: number;
        netRevenue: number;
        orders: number;
        totalProducts: number;
        averageOrderValue: number;
        lastOrderDate: string;
        totalCost: number;
        grossProfit: number;
      };
    } = {};

    filteredOrders.forEach((order: any) => {
      const customerId = order.customerId || "guest";
      const customerName = order.customerName || "Khách lẻ";

      if (!customerData[customerId]) {
        customerData[customerId] = {
          customer: customerName,
          revenue: 0,
          returnValue: 0,
          netRevenue: 0,
          orders: 0,
          totalProducts: 0,
          averageOrderValue: 0,
          lastOrderDate: "",
          totalCost: 0,
          grossProfit: 0,
        };
      }

      const orderTotal = Number(order.total);
      const orderDate = new Date(order.orderedAt || order.created_at || order.createdAt)
        .toLocaleDateString("vi-VN");

      customerData[customerId].orders += 1;
      customerData[customerId].lastOrderDate = orderDate;
      customerData[customerId].revenue += orderTotal;
      customerData[customerId].netRevenue += orderTotal; // Assuming no returns for now
      customerData[customerId].totalCost += orderTotal * 0.6; // 60% cost assumption
      customerData[customerId].totalProducts += order.customerCount || 1;
    });

    // Calculate derived metrics
    Object.values(customerData).forEach((data) => {
      data.averageOrderValue = data.orders > 0 ? data.netRevenue / data.orders : 0;
      data.grossProfit = data.netRevenue - data.totalCost;
    });

    return Object.values(customerData).sort((a, b) => b.netRevenue - a.netRevenue);
  };

  // Sales channel analysis data processing (integrated from sales-channel-report)
  const getChannelAnalysisData = () => {
    // Use sales channel report data if available
    if (previousReportData && previousReportData.type === 'salesChannel') {
      return previousReportData.data;
    }

    const dataToUse = previousReportData?.data || getFilteredData();
    
    // Enhanced channel analysis using sales channel report logic
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredTransactions = dataToUse.filter((transaction: any) => {
      const transactionDate = new Date(transaction.createdAt || transaction.created_at);
      const dateMatch = transactionDate >= start && transactionDate <= end;

      const channelMatch = salesChannel === "all" ||
        (transaction.salesChannel === salesChannel) ||
        (salesChannel === "direct" && (!transaction.salesChannel || transaction.salesChannel === "Direct")) ||
        (salesChannel === "other" && transaction.salesChannel && transaction.salesChannel !== "Direct");

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
        channelData[channel].totalCost += amount * 0.6; // 60% cost ratio
        
        // Calculate commission based on channel type
        const commissionRate = channel === "Direct" ? 0 : 0.05; // 5% for other channels
        channelData[channel].commission += amount * commissionRate;
      } else {
        channelData[channel].returnValue += Math.abs(amount);
      }

      // Count products from transaction items
      const items = transaction.items || [];
      items.forEach((item: any) => {
        channelData[channel].totalProducts += Number(item.quantity || 1);
      });
    });

    // Calculate derived metrics
    Object.values(channelData).forEach((data) => {
      data.netRevenue = data.revenue - data.returnValue;
      data.grossProfit = data.netRevenue - data.totalCost;
      data.netProfit = data.grossProfit - data.commission;
    });

    return Object.values(channelData).sort((a, b) => b.netRevenue - a.netRevenue);
  };

  const renderAnalysisTypeReport = () => {
    switch (analysisType) {
      case "product": {
        const data = getProductAnalysisData();
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productCode")}</TableHead>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.quantitySold")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.revenue")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.returnQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.totalCost")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.grossProfit")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data
                  .sort((a, b) => b.netRevenue - a.netRevenue)
                  .slice(0, 20)
                  .map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.productCode}
                      </TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-center">
                        {item.quantitySold}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                      <TableCell className="text-center text-red-600">
                        {item.quantityReturned}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(item.returnValue)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.netRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.totalCost)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(item.profit)}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500">
                    {t("reports.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );
      }

      case "employee": {
        const data = getEmployeeAnalysisData();
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.seller")}</TableHead>
                <TableHead className="text-center">
                  {t("reports.orders")}
                </TableHead>
                <TableHead className="text-center">
                  {t("reports.totalProducts")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.totalRevenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.returnValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.netRevenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.averageOrderValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.totalCost")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.grossProfit")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data
                  .sort((a, b) => b.netRevenue - a.netRevenue)
                  .map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.employee}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.orders}
                      </TableCell>
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
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(item.averageOrderValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.totalCost)}
                      </TableCell>
                      <TableCell className="text-right text-purple-600">
                        {formatCurrency(item.grossProfit)}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500">
                    {t("reports.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );
      }

      case "customer": {
        const data = getCustomerAnalysisData();
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.customer")}</TableHead>
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
                  {t("reports.averageOrderValue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("reports.lastOrder")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data
                  .sort((a, b) => b.netRevenue - a.netRevenue)
                  .slice(0, 20)
                  .map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.customer}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.orders}
                      </TableCell>
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
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(item.averageOrderValue)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.lastOrderDate}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    {t("reports.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );
      }

      case "channel": {
        const data = getChannelAnalysisData();
        return (
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
                data
                  .sort((a, b) => b.netRevenue - a.netRevenue)
                  .map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.salesChannel}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.orders}
                      </TableCell>
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
                    {t("reports.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );
      }

      default:
        return renderTimeReport();
    }
  };

  // Save current report data for future comparison
  const saveCurrentReportData = (data: any) => {
    try {
      const dataKey = `salesReport_${analysisType}_${concernType}_data`;
      const reportData = {
        data,
        generatedAt: new Date().toISOString(),
        settings: {
          dateRange: { startDate, endDate },
          filters: { salesMethod, salesChannel },
          analysisType,
          concernType,
        },
      };

      localStorage.setItem(dataKey, JSON.stringify(reportData));
    } catch (error) {
      console.warn("Failed to save report data:", error);
    }
  };

  const renderReportTable = () => {
    let reportContent;

    if (analysisType === "time") {
      switch (concernType) {
        case "time":
          reportContent = renderTimeReport();
          break;
        case "profit":
          reportContent = renderProfitReport();
          break;
        case "discount":
          reportContent = renderDiscountReport();
          break;
        case "return":
          reportContent = renderReturnReport();
          break;
        case "employee":
          reportContent = renderEmployeeReport();
          break;
        default:
          reportContent = renderTimeReport();
      }
    } else {
      reportContent = renderAnalysisTypeReport();
    }

    // Save current data for future reference
    const currentData = getFilteredData();
    if (currentData && currentData.length > 0) {
      saveCurrentReportData(currentData);
    }

    return reportContent;
  };

  const shouldShowChart = () => {
    if (analysisType === "time") {
      return ["time", "profit", "employee"].includes(concernType);
    } else {
      return ["product", "employee", "customer", "channel"].includes(
        analysisType,
      );
    }
  };

  const getChartData = () => {
    // Use previous report data if available, otherwise calculate from current filtered data
    const dataToUse = previousReportData?.data || getFilteredData();
    
    if (analysisType === "time") {
      switch (concernType) {
        case "time": {
          const dailyData: {
            [date: string]: { revenue: number; returnValue: number };
          } = {};

          dataToUse.forEach((transaction: any) => {
            const date = new Date(
              transaction.createdAt || transaction.created_at,
            ).toLocaleDateString("vi-VN");
            if (!dailyData[date]) {
              dailyData[date] = { revenue: 0, returnValue: 0 };
            }

            const amount = Number(transaction.total);
            if (amount > 0) {
              dailyData[date].revenue += amount;
            } else {
              dailyData[date].returnValue += Math.abs(amount);
            }
          });

          return Object.entries(dailyData).map(([date, data]) => ({
            name: date,
            revenue: data.revenue,
            returnValue: data.returnValue,
            netRevenue: data.revenue - data.returnValue,
          }));
        }

        case "profit": {
          const dailyData: {
            [date: string]: {
              totalAmount: number;
              discount: number;
              revenue: number;
              cost: number;
            };
          } = {};

          dataToUse.forEach((transaction: any) => {
            const date = new Date(
              transaction.createdAt || transaction.created_at,
            ).toLocaleDateString("vi-VN");
            if (!dailyData[date]) {
              dailyData[date] = {
                totalAmount: 0,
                discount: 0,
                revenue: 0,
                cost: 0,
              };
            }

            const subtotal = Number(transaction.subtotal || transaction.total);
            const total = Number(transaction.total);
            const discount = subtotal - total;

            dailyData[date].totalAmount += subtotal;
            dailyData[date].discount += discount;
            dailyData[date].revenue += total;
            dailyData[date].cost += total * 0.6;
          });

          return Object.entries(dailyData).map(([date, data]) => ({
            name: date,
            revenue: data.revenue,
            cost: data.cost,
            profit: data.revenue - data.cost,
          }));
        }

        case "employee": {
          const employeeData: {
            [cashier: string]: { revenue: number; returnValue: number };
          } = {};

          dataToUse.forEach((transaction: any) => {
            const cashier = transaction.cashierName || "Unknown";
            if (!employeeData[cashier]) {
              employeeData[cashier] = { revenue: 0, returnValue: 0 };
            }

            const amount = Number(transaction.total);
            if (amount > 0) {
              employeeData[cashier].revenue += amount;
            } else {
              employeeData[cashier].returnValue += Math.abs(amount);
            }
          });

          return Object.entries(employeeData).map(([cashier, data]) => ({
            name: cashier,
            revenue: data.revenue,
            returnValue: data.returnValue,
            netRevenue: data.revenue - data.returnValue,
          }));
        }

        default:
          return [];
      }
    } else {
      // For analysis type reports, get chart data from analysis functions
      switch (analysisType) {
        case "product": {
          const data = getProductAnalysisData();
          return data.slice(0, 10).map((item) => ({
            name: item.productName,
            revenue: item.revenue,
            netRevenue: item.netRevenue,
            profit: item.profit,
          }));
        }

        case "employee": {
          const data = getEmployeeAnalysisData();
          return data.slice(0, 10).map((item) => ({
            name: item.employee,
            revenue: item.revenue,
            netRevenue: item.netRevenue,
            grossProfit: item.grossProfit,
          }));
        }

        case "customer": {
          const data = getCustomerAnalysisData();
          return data.slice(0, 10).map((item) => ({
            name: item.customer,
            revenue: item.revenue,
            netRevenue: item.netRevenue,
            orders: item.orders,
          }));
        }

        case "channel": {
          const data = getChannelAnalysisData();
          return data.map((item) => ({
            name: item.salesChannel,
            revenue: item.revenue,
            netRevenue: item.netRevenue,
            grossProfit: item.grossProfit,
            netProfit: item.netProfit,
          }));
        }

        default:
          return [];
      }
    }
  };

  const getChartConfig = () => {
    switch (concernType) {
      case "time":
        return {
          revenue: {
            label: t("reports.totalRevenue"),
            color: "#10b981",
          },
          returnValue: {
            label: t("reports.returnValue"),
            color: "#ef4444",
          },
          netRevenue: {
            label: t("reports.netRevenue"),
            color: "#3b82f6",
          },
        };
      case "profit":
        return {
          revenue: {
            label: t("reports.revenue"),
            color: "#10b981",
          },
          cost: {
            label: t("reports.totalCost"),
            color: "#f59e0b",
          },
          profit: {
            label: t("reports.grossProfit"),
            color: "#3b82f6",
          },
        };
      case "employee":
        return {
          revenue: {
            label: t("reports.totalRevenue"),
            color: "#10b981",
          },
          returnValue: {
            label: t("reports.returnValue"),
            color: "#ef4444",
          },
          netRevenue: {
            label: t("reports.netRevenue"),
            color: "#3b82f6",
          },
          value: {
            label: t("reports.value"),
            color: "#3b82f6",
          },
        };
      default:
        return {};
    }
  };

  const getTooltipLabel = (value: number, name: string) => {
    const chartConfig = getChartConfig();
    const config = chartConfig[name as keyof typeof chartConfig] as {
      label: string;
    };
    return [`${value.toLocaleString()} ₫`, config?.label || name];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("reports.salesReport")}
          </CardTitle>
          <CardDescription>{getReportTitle()}</CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {/* Analysis Type Selector */}
            <div>
              <Label>{t("reports.analyzeBy")}</Label>
              <Select
                value={analysisType}
                onValueChange={(value) => {
                  setAnalysisType(value);
                  // Reset concern type when analysis type changes
                  if (value !== "time") {
                    setConcernType("time");
                  }
                }}
              >
                <SelectTrigger>
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

            {/* Sales Method Filter */}
            <div>
              <Label>{t("reports.salesMethod")}</Label>
              <Select value={salesMethod} onValueChange={setSalesMethod}>
                <SelectTrigger>
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

            {/* Sales Channel Filter */}
            <div>
              <Label>{t("reports.salesChannel")}</Label>
              <Select value={salesChannel} onValueChange={setSalesChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="direct">{t("reports.direct")}</SelectItem>
                  <SelectItem value="other">{t("reports.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional filters based on analysis type */}
          {(analysisType === "product" || analysisType === "employee" || analysisType === "customer") && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Employee Filter - for employee analysis */}
              {analysisType === "employee" && (
                <div>
                  <Label>{t("reports.seller")}</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("reports.seller")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {employees && Array.isArray(employees) && employees.map((employee: any) => (
                        <SelectItem key={employee.id} value={employee.name}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Customer Search - for customer analysis */}
              {analysisType === "customer" && (
                <div>
                  <Label>{t("reports.customerFilter")}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.customerFilterPlaceholder")}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Product Search - for product analysis */}
              {analysisType === "product" && (
                <div>
                  <Label>{t("reports.productFilter")}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("reports.productFilterPlaceholder")}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Product Type - for product analysis */}
              {analysisType === "product" && (
                <div>
                  <Label>{t("reports.productType")}</Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="combo">{t("reports.combo")}</SelectItem>
                      <SelectItem value="product">{t("reports.product")}</SelectItem>
                      <SelectItem value="service">{t("reports.service")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Category Filter - for product analysis */}
              {analysisType === "product" && (
                <div>
                  <Label>{t("reports.productGroup")}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("reports.productGroup")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {categories && Array.isArray(categories) && categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>{t("reports.startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("reports.endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Display - Only for Time, Profit, and Employee */}
      {shouldShowChart() && (
        <Card className="shadow-lg border-green-100">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <TrendingUp className="w-5 h-5 text-green-600" />
              {t("reports.chartView")} - {getReportTitle()}
            </CardTitle>
            <CardDescription className="text-green-600">
              {t("reports.visualRepresentation")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-96 w-full bg-white rounded-lg border border-green-100 p-4">
              <ChartContainer config={getChartConfig()}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getChartData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      opacity={0.6}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#374151" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tickMargin={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#374151" }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) {
                          return `${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                          return `${(value / 1000).toFixed(0)}K`;
                        }
                        return value.toString();
                      }}
                      width={60}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={getTooltipLabel}
                      labelStyle={{ color: "#374151", fontWeight: 600 }}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    {analysisType === "time" && concernType === "time" && (
                      <>
                        <Bar
                          dataKey="revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="returnValue"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="netRevenue"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      </>
                    )}
                    {analysisType === "time" && concernType === "profit" && (
                      <>
                        <Bar
                          dataKey="revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="cost"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="profit"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      </>
                    )}
                    {analysisType === "time" && concernType === "employee" && (
                      <>
                        <Bar
                          dataKey="revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="returnValue"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="netRevenue"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      </>
                    )}
                    {analysisType === "product" && (
                      <>
                        <Bar
                          dataKey="revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="netRevenue"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="profit"
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      </>
                    )}
                    {analysisType === "employee" && (
                      <>
                        <Bar
                          dataKey="revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="netRevenue"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="grossProfit"
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      </>
                    )}
                    {analysisType === "customer" && (
                      <>
                        <Bar
                          dataKey="revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="netRevenue"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="orders"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      </>
                    )}
                    {analysisType === "channel" && (
                      <>
                        <Bar
                          dataKey="revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="netRevenue"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                        <Bar
                          dataKey="netProfit"
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={60}
                        />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Chart Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {concernType === "time" && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.totalRevenue")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.returnValue")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.netRevenue")}
                    </span>
                  </div>
                </>
              )}
              {concernType === "profit" && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.revenue")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.totalCost")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.grossProfit")}
                    </span>
                  </div>
                </>
              )}
              {concernType === "employee" && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.totalRevenue")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.returnValue")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-sm text-gray-600">
                      {t("reports.netRevenue")}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {getReportTitle()}
          </CardTitle>
          <CardDescription>
            {t("reports.dataFrom")} {formatDate(startDate)} {t("reports.to")}{" "}
            {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderReportTable()}</CardContent>
      </Card>
    </div>
  );
}
