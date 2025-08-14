import { useState } from "react";
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
  const [dateRange, setDateRange] = useState("today");
  const today = new Date(); // Define today once
  const [startDate, setStartDate] = useState<string>(
    today.toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    today.toISOString().split("T")[0],
  );
  const [salesMethod, setSalesMethod] = useState("all");
  const [salesChannel, setSalesChannel] = useState("all");

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();

    switch (range) {
      case "today":
        setStartDate(today.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "week":
        // Tuần trước: từ thứ 2 tuần trước đến chủ nhật tuần trước
        const currentDayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        const daysToLastMonday =
          currentDayOfWeek === 0 ? 13 : currentDayOfWeek + 6; // Nếu hôm nay là CN thì lùi 13 ngày, không thì lùi (ngày hiện tại + 6)
        const lastWeekMonday = new Date(
          today.getTime() - daysToLastMonday * 24 * 60 * 60 * 1000,
        );
        const lastWeekSunday = new Date(
          lastWeekMonday.getTime() + 6 * 24 * 60 * 60 * 1000,
        );

        setStartDate(lastWeekMonday.toISOString().split("T")[0]);
        setEndDate(lastWeekSunday.toISOString().split("T")[0]);
        break;
      case "month":
        // Tháng trước: từ ngày 1 tháng trước đến ngày cuối tháng trước
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Tính tháng trước
        const lastMonthYear = month === 0 ? year - 1 : year;
        const lastMonth = month === 0 ? 11 : month - 1;
        
        // Ngày đầu tháng trước
        const lastMonthStart = new Date(lastMonthYear, lastMonth, 1);
        // Ngày cuối tháng trước
        const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0);

        // Format thành YYYY-MM-DD
        const startDateStr = `${lastMonthStart.getFullYear()}-${(lastMonthStart.getMonth() + 1).toString().padStart(2, "0")}-${lastMonthStart.getDate().toString().padStart(2, "0")}`;
        const endDateStr = `${lastMonthEnd.getFullYear()}-${(lastMonthEnd.getMonth() + 1).toString().padStart(2, "0")}-${lastMonthEnd.getDate().toString().padStart(2, "0")}`;

        setStartDate(startDateStr);
        setEndDate(endDateStr);
        break;
      case "custom":
        // Luôn set ngày hiện tại khi chọn tùy chỉnh
        const customCurrentDate = new Date().toISOString().split("T")[0];
        setStartDate(customCurrentDate);
        setEndDate(customCurrentDate);
        break;
    }
  };

  const getFilteredData = () => {
    if (!transactions || !Array.isArray(transactions)) return [];

    const filteredTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(
        transaction.createdAt || transaction.created_at,
      );

      // Chuyển về ngày local để so sánh chính xác
      const transactionDateStr = `${transactionDate.getFullYear()}-${(transactionDate.getMonth() + 1).toString().padStart(2, "0")}-${transactionDate.getDate().toString().padStart(2, "0")}`;
      
      const isInRange = transactionDateStr >= startDate && transactionDateStr <= endDate;

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

      return isInRange && methodMatch && channelMatch;
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
    const filteredData = getFilteredData();
    const dailyData: {
      [date: string]: { revenue: number; returnValue: number };
    } = {};

    filteredData.forEach((transaction: any) => {
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
    const filteredData = getFilteredData();
    const dailyData: {
      [date: string]: {
        totalAmount: number;
        discount: number;
        revenue: number;
        cost: number;
      };
    } = {};

    filteredData.forEach((transaction: any) => {
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
    const filteredData = getFilteredData();
    const dailyData: {
      [date: string]: {
        invoiceCount: number;
        invoiceValue: number;
        discount: number;
      };
    } = {};

    filteredData.forEach((transaction: any) => {
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
    const filteredData = getFilteredData();
    const dailyData: { [date: string]: { returnCount: number; returnValue: number } } = {};

    filteredData.forEach((transaction: any) => {
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
    const filteredData = getFilteredData();
    const employeeData: {
      [cashier: string]: { revenue: number; returnValue: number };
    } = {};

    filteredData.forEach((transaction: any) => {
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

  const renderAnalysisTypeReport = () => {
    const filteredData = getFilteredData();

    switch (analysisType) {
      case "product": {
        // Product sales analysis with comprehensive data
        const productData: {
          [productName: string]: { 
            revenue: number; 
            quantity: number; 
            cost: number;
            returnQuantity: number;
            returnValue: number;
          };
        } = {};

        filteredData.forEach((transaction: any) => {
          const items = transaction.items || [];
          items.forEach((item: any) => {
            const productName = item.productName || item.name || "Unknown Product";
            if (!productData[productName]) {
              productData[productName] = { 
                revenue: 0, 
                quantity: 0, 
                cost: 0,
                returnQuantity: 0,
                returnValue: 0
              };
            }
            
            const itemTotal = Number(item.total || item.price * item.quantity);
            const itemQuantity = Number(item.quantity || 1);
            
            if (itemTotal > 0) {
              productData[productName].revenue += itemTotal;
              productData[productName].quantity += itemQuantity;
              productData[productName].cost += itemTotal * 0.6; // Assume 60% cost ratio
            } else {
              productData[productName].returnValue += Math.abs(itemTotal);
              productData[productName].returnQuantity += itemQuantity;
            }
          });
        });

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.productName")}</TableHead>
                <TableHead>{t("reports.quantitySold")}</TableHead>
                <TableHead>{t("reports.returnQuantity")}</TableHead>
                <TableHead>{t("reports.revenue")}</TableHead>
                <TableHead>{t("reports.returnValue")}</TableHead>
                <TableHead>{t("reports.netRevenue")}</TableHead>
                <TableHead>{t("reports.grossProfit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(productData)
                .sort(([,a], [,b]) => (b.revenue - b.returnValue) - (a.revenue - a.returnValue))
                .map(([productName, data]) => (
                <TableRow key={productName}>
                  <TableCell className="font-medium">{productName}</TableCell>
                  <TableCell>{data.quantity}</TableCell>
                  <TableCell className="text-red-600">{data.returnQuantity}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(data.revenue)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(data.returnValue)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(data.revenue - data.returnValue)}
                  </TableCell>
                  <TableCell className="text-blue-600">
                    {formatCurrency((data.revenue - data.returnValue) - data.cost)}
                  </TableCell>
                </TableRow>
              ))}
              {Object.keys(productData).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    {t("reports.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );
      }

      case "employee": {
        // Employee performance analysis with product sales breakdown
        const employeeData: {
          [cashier: string]: { 
            revenue: number; 
            returnValue: number;
            orders: number;
            productsSold: { [product: string]: number };
            topProduct: string;
            totalProducts: number;
          };
        } = {};

        filteredData.forEach((transaction: any) => {
          const cashier = transaction.cashierName || "Unknown";
          if (!employeeData[cashier]) {
            employeeData[cashier] = { 
              revenue: 0, 
              returnValue: 0, 
              orders: 0,
              productsSold: {},
              topProduct: "",
              totalProducts: 0
            };
          }

          const amount = Number(transaction.total);
          employeeData[cashier].orders += 1;

          if (amount > 0) {
            employeeData[cashier].revenue += amount;
          } else {
            employeeData[cashier].returnValue += Math.abs(amount);
          }

          // Track products sold by this employee
          const items = transaction.items || [];
          items.forEach((item: any) => {
            const productName = item.productName || item.name || "Unknown Product";
            const quantity = Number(item.quantity || 1);
            
            if (!employeeData[cashier].productsSold[productName]) {
              employeeData[cashier].productsSold[productName] = 0;
            }
            employeeData[cashier].productsSold[productName] += quantity;
            employeeData[cashier].totalProducts += quantity;
          });
        });

        // Calculate top product for each employee
        Object.entries(employeeData).forEach(([cashier, data]) => {
          let maxQuantity = 0;
          let topProduct = "";
          
          Object.entries(data.productsSold).forEach(([product, quantity]) => {
            if (quantity > maxQuantity) {
              maxQuantity = quantity;
              topProduct = product;
            }
          });
          
          data.topProduct = topProduct || "N/A";
        });

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.seller")}</TableHead>
                <TableHead>{t("reports.orders")}</TableHead>
                <TableHead>{t("reports.totalProducts")}</TableHead>
                <TableHead>{t("reports.topProduct")}</TableHead>
                <TableHead>{t("reports.totalRevenue")}</TableHead>
                <TableHead>{t("reports.returnValue")}</TableHead>
                <TableHead>{t("reports.netRevenue")}</TableHead>
                <TableHead>{t("reports.averageOrderValue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(employeeData)
                .sort(([,a], [,b]) => (b.revenue - b.returnValue) - (a.revenue - a.returnValue))
                .map(([cashier, data]) => {
                  const netRevenue = data.revenue - data.returnValue;
                  const avgOrderValue = data.orders > 0 ? netRevenue / data.orders : 0;
                  
                  return (
                    <TableRow key={cashier}>
                      <TableCell className="font-medium">{cashier}</TableCell>
                      <TableCell>{data.orders}</TableCell>
                      <TableCell>{data.totalProducts}</TableCell>
                      <TableCell className="text-sm">{data.topProduct}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(data.revenue)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(data.returnValue)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(netRevenue)}</TableCell>
                      <TableCell className="text-blue-600">{formatCurrency(avgOrderValue)}</TableCell>
                    </TableRow>
                  );
                })}
              {Object.keys(employeeData).length === 0 && (
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

      case "customer": {
        // Customer analysis with detailed purchase behavior
        const customerData: {
          [customer: string]: { 
            revenue: number; 
            orders: number;
            returnValue: number;
            totalProducts: number;
            avgOrderValue: number;
            lastOrderDate: string;
            loyaltyPoints: number;
          };
        } = {};

        filteredData.forEach((transaction: any) => {
          const customer = transaction.customerName || transaction.customerPhone || "Walk-in Customer";
          if (!customerData[customer]) {
            customerData[customer] = { 
              revenue: 0, 
              orders: 0,
              returnValue: 0,
              totalProducts: 0,
              avgOrderValue: 0,
              lastOrderDate: "",
              loyaltyPoints: 0
            };
          }

          const amount = Number(transaction.total);
          const orderDate = new Date(transaction.createdAt || transaction.created_at).toLocaleDateString("vi-VN");
          
          customerData[customer].orders += 1;
          customerData[customer].lastOrderDate = orderDate;

          if (amount > 0) {
            customerData[customer].revenue += amount;
            customerData[customer].loyaltyPoints += Math.floor(amount / 1000); // 1 point per 1000 VND
          } else {
            customerData[customer].returnValue += Math.abs(amount);
          }

          // Count products purchased
          const items = transaction.items || [];
          items.forEach((item: any) => {
            customerData[customer].totalProducts += Number(item.quantity || 1);
          });
        });

        // Calculate average order value
        Object.entries(customerData).forEach(([customer, data]) => {
          const netRevenue = data.revenue - data.returnValue;
          data.avgOrderValue = data.orders > 0 ? netRevenue / data.orders : 0;
        });

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.customer")}</TableHead>
                <TableHead>{t("reports.orders")}</TableHead>
                <TableHead>{t("reports.totalProducts")}</TableHead>
                <TableHead>{t("reports.revenue")}</TableHead>
                <TableHead>{t("reports.returnValue")}</TableHead>
                <TableHead>{t("reports.netRevenue")}</TableHead>
                <TableHead>{t("reports.averageOrderValue")}</TableHead>
                <TableHead>{t("reports.lastOrder")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(customerData)
                .sort(([,a], [,b]) => (b.revenue - b.returnValue) - (a.revenue - a.returnValue))
                .map(([customer, data]) => {
                  const netRevenue = data.revenue - data.returnValue;
                  
                  return (
                    <TableRow key={customer}>
                      <TableCell className="font-medium">{customer}</TableCell>
                      <TableCell>{data.orders}</TableCell>
                      <TableCell>{data.totalProducts}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(data.revenue)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(data.returnValue)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(netRevenue)}</TableCell>
                      <TableCell className="text-blue-600">{formatCurrency(data.avgOrderValue)}</TableCell>
                      <TableCell className="text-sm">{data.lastOrderDate}</TableCell>
                    </TableRow>
                  );
                })}
              {Object.keys(customerData).length === 0 && (
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
        // Sales channel analysis with comprehensive metrics
        const channelData: {
          [channel: string]: { 
            revenue: number; 
            orders: number;
            returnValue: number;
            totalProducts: number;
            avgOrderValue: number;
            commission: number;
            netProfit: number;
          };
        } = {};

        filteredData.forEach((transaction: any) => {
          const channel = transaction.salesChannel || "Direct";
          if (!channelData[channel]) {
            channelData[channel] = { 
              revenue: 0, 
              orders: 0,
              returnValue: 0,
              totalProducts: 0,
              avgOrderValue: 0,
              commission: 0,
              netProfit: 0
            };
          }

          const amount = Number(transaction.total);
          channelData[channel].orders += 1;

          if (amount > 0) {
            channelData[channel].revenue += amount;
            // Calculate commission based on channel type
            const commissionRate = channel === "Direct" ? 0 : 0.05; // 5% for other channels
            channelData[channel].commission += amount * commissionRate;
          } else {
            channelData[channel].returnValue += Math.abs(amount);
          }

          // Count products sold through this channel
          const items = transaction.items || [];
          items.forEach((item: any) => {
            channelData[channel].totalProducts += Number(item.quantity || 1);
          });
        });

        // Calculate metrics
        Object.entries(channelData).forEach(([channel, data]) => {
          const netRevenue = data.revenue - data.returnValue;
          data.avgOrderValue = data.orders > 0 ? netRevenue / data.orders : 0;
          data.netProfit = netRevenue - data.commission - (netRevenue * 0.6); // Subtract commission and cost
        });

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.salesChannel")}</TableHead>
                <TableHead>{t("reports.orders")}</TableHead>
                <TableHead>{t("reports.totalProducts")}</TableHead>
                <TableHead>{t("reports.revenue")}</TableHead>
                <TableHead>{t("reports.returnValue")}</TableHead>
                <TableHead>{t("reports.netRevenue")}</TableHead>
                <TableHead>{t("reports.commission")}</TableHead>
                <TableHead>{t("reports.netProfit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(channelData)
                .sort(([,a], [,b]) => (b.revenue - b.returnValue) - (a.revenue - a.returnValue))
                .map(([channel, data]) => {
                  const netRevenue = data.revenue - data.returnValue;
                  
                  return (
                    <TableRow key={channel}>
                      <TableCell className="font-medium">{channel}</TableCell>
                      <TableCell>{data.orders}</TableCell>
                      <TableCell>{data.totalProducts}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(data.revenue)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(data.returnValue)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(netRevenue)}</TableCell>
                      <TableCell className="text-orange-600">{formatCurrency(data.commission)}</TableCell>
                      <TableCell className="text-blue-600">{formatCurrency(data.netProfit)}</TableCell>
                    </TableRow>
                  );
                })}
              {Object.keys(channelData).length === 0 && (
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

      default:
        return renderTimeReport();
    }
  };

  const renderReportTable = () => {
    if (analysisType === "time") {
      switch (concernType) {
        case "time":
          return renderTimeReport();
        case "profit":
          return renderProfitReport();
        case "discount":
          return renderDiscountReport();
        case "return":
          return renderReturnReport();
        case "employee":
          return renderEmployeeReport();
        default:
          return renderTimeReport();
      }
    } else {
      return renderAnalysisTypeReport();
    }
  };

  const shouldShowChart = () => {
    if (analysisType === "time") {
      return ["time", "profit", "employee"].includes(concernType);
    } else {
      return ["product", "employee", "customer", "channel"].includes(analysisType);
    }
  };

  const getChartData = () => {
    const filteredData = getFilteredData();

    switch (concernType) {
      case "time": {
        const dailyData: {
          [date: string]: { revenue: number; returnValue: number };
        } = {};

        filteredData.forEach((transaction: any) => {
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

        filteredData.forEach((transaction: any) => {
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

        filteredData.forEach((transaction: any) => {
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
          <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-5 gap-4">
            {/* Analysis Type Selector */}
            <div>
              <Label>{t("reports.analyzeBy")}: </Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">{t("reports.timeAnalysis")}</SelectItem>
                  <SelectItem value="product">{t("reports.productAnalysis")}</SelectItem>
                  <SelectItem value="employee">{t("reports.employeeAnalysis")}</SelectItem>
                  <SelectItem value="customer">{t("reports.customerAnalysis")}</SelectItem>
                  <SelectItem value="channel">{t("reports.channelAnalysis")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Selector */}
            <div>
              <Label>{t("reports.dateRange")}</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("reports.toDay")}</SelectItem>
                  <SelectItem value="week">{t("reports.lastWeek")}</SelectItem>
                  <SelectItem value="month">{t("reports.lastMonth")}</SelectItem>
                  <SelectItem value="custom">{t("reports.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Concerns Filter - Only show for time analysis */}
            {analysisType === "time" && (
              <div>
                <Label>{t("reports.concernType")}</Label>
                <Select value={concernType} onValueChange={setConcernType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">
                      {t("reports.timeReport")}
                    </SelectItem>
                    <SelectItem value="profit">
                      {t("reports.profitReport")}
                    </SelectItem>
                    <SelectItem value="discount">
                      {t("reports.discountReport")}
                    </SelectItem>
                    <SelectItem value="return">
                      {t("reports.returnReport")}
                    </SelectItem>
                    <SelectItem value="employee">
                      {t("reports.employeeReport")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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

          {/* Custom Date Range - Only show when custom is selected */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          )}
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
                    {concernType === "time" && (
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
                    {concernType === "profit" && (
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
                    {concernType === "employee" && (
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