
import type { ReportsTranslations } from "../types";

export const reportsTranslations: { [key: string]: ReportsTranslations } = {
  ko: {
    title: "보고서",
    description: "매출 및 운영 보고서를 확인하세요",
    dashboard: "대시보드",
    dashboardDescription: "전체 매출 및 운영 현황을 한눈에 확인하세요",
    salesAnalysis: "매출 분석",
    menuAnalysis: "메뉴 분석",
    tableAnalysis: "테이블 분석",
    backToTables: "테이블로 돌아가기",
    noPaymentData: "결제 데이터가 없습니다.",

    // Date and time filters
    startDate: "시작일",
    endDate: "종료일",
    refresh: "새로고침",
    toDay: "오늘",
    lastWeek: "지난 주",
    thisMonth: "이번 달",
    lastMonth: "지난 달",
    custom: "사용자 지정",

    // Dashboard metrics
    totalRevenue: "총 매출",
    totalOrders: "총 주문",
    totalCustomers: "총 고객",
    totalQuantitySold: "총 판매 수량",
    averageOrderValue: "평균 주문액",
    dailyAverage: "일평균",
    activeOrders: "활성 주문",
    occupiedTables: "사용 중인 테이블",
    monthlyRevenue: "월간 매출",

    // Sales analysis
    analyzeRevenue: "매출 동향과 결제 방법별 분석을 확인하세요",
    dailySales: "일별 매출",
    paymentMethods: "결제 방법",
    hourlyBreakdown: "시간대별 분석",
    revenue: "매출",
    orders: "주문",
    customers: "고객",
    cash: "현금",
    card: "카드",
    credit_card: "신용카드",
    qrbanking: "QR 코드",
    einvoice: "전자 인보이스",

    // Analysis types
    analysisType: "분석 유형",
    analyzeBy: "분석 기준",
    timeAnalysis: "시간",
    productAnalysis: "판매",
    employeeAnalysis: "직원별 판매",
    customerAnalysis: "판매",
    channelAnalysis: "판매",

    // Chart and visual
    chartView: "차트 보기",
    visualRepresentation: "데이터 시각화",

    // Sales chart report
    salesChart: "매출 차트",
    salesChartDescription: "차트를 통한 시각적 매출 분석",
    salesReport: "매출 보고서",
    purchaseReport: "구매 보고서",
    inventoryReport: "재고 보고서",

    // Filter labels
    salesMethod: "판매 방법",
    salesChannel: "판매 채널",
    productFilter: "상품",
    productFilterPlaceholder: "이름 또는 코드로 검색",
    customerFilter: "고객",
    customerFilterPlaceholder: "이름, 전화번호 또는 코드로 검색",

    // Sales chart table columns
    date: "날짜",
    orderNumber: "주문 번호",
    subtotal: "소계",
    discount: "할인",
    tax: "세금",
    total: "합계",
    totalCustomerPayment: "총 고객 결제",

    // Product report columns
    productCode: "상품 코드",
    productName: "상품명",
    unit: "단위",
    quantitySold: "판매 수량",
    totalAmount: "총 금액",
    totalDiscount: "총 할인",
    totalRevenue: "총 매출",
    categoryName: "카테고리",

    // Report titles
    timeSalesReport: "시간별 매출 보고서",
    salesReportByProduct: "상품별 매출 보고서",
    profitByInvoiceReport: "송장별 수익 보고서",
    invoiceDiscountReport: "송장 할인 보고서",
    returnByInvoiceReport: "송장별 반품 보고서",
  },
  en: {
    title: "Reports",
    description: "View sales and operational reports",
    dashboard: "Dashboard",
    dashboardDescription: "Overview of total sales and operational status",
    salesAnalysis: "Sales Analysis",
    menuAnalysis: "Menu Analysis",
    tableAnalysis: "Table Analysis",
    backToTables: "Back to Tables",
    noPaymentData: "There is no payment data.",

    // Date and time filters
    startDate: "Start Date",
    endDate: "End Date",
    refresh: "Refresh",
    toDay: "Today",
    lastWeek: "Last Week",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    custom: "Custom",

    // Dashboard metrics
    totalRevenue: "Total Revenue",
    totalOrders: "Total Orders",
    totalQuantitySold: "Total Quantity Sold",
    totalCustomers: "Total Customers",
    averageOrderValue: "Average Order Value",
    dailyAverage: "Daily Average",
    activeOrders: "Active Orders",
    occupiedTables: "Occupied Tables",
    monthlyRevenue: "Monthly Revenue",

    // Sales analysis
    analyzeRevenue: "Analyze revenue trends and payment method breakdown",
    dailySales: "Daily Sales",
    paymentMethods: "Payment Methods",
    hourlyBreakdown: "Hourly Breakdown",
    revenue: "Revenue",
    orders: "Orders",
    customers: "Customers",
    cash: "Cash",
    card: "Card",
    credit_card: "Credit Card",
    qrbanking: "QR Code",
    einvoice: "E-Invoice",

    // Analysis types
    analysisType: "Analysis Type",
    analyzeBy: "Analyze By",
    timeAnalysis: "Time Analysis",
    productAnalysis: "Product Analysis",
    employeeAnalysis: "Employee Analysis",
    customerAnalysis: "Customer Analysis",
    channelAnalysis: "Channel Analysis",

    // Chart and visual
    chartView: "Chart View",
    visualRepresentation: "Visual representation of data",

    // Sales chart report
    salesChart: "Sales Chart",
    salesChartDescription: "Visual revenue analysis through charts",
    salesReport: "Sales Report",
    purchaseReport: "Purchase Report", 
    inventoryReport: "Inventory Report",

    // Filter labels
    startDate: "Start Date",
    endDate: "End Date",
    salesMethod: "Sales Method",
    salesChannel: "Sales Channel",
    productFilter: "Product",
    productFilterPlaceholder: "Search by name or code",
    customerFilter: "Customer",
    customerFilterPlaceholder: "Search by name, phone or code",

    // Sales chart table columns
    date: "Date",
    orderNumber: "Order Number",
    subtotal: "Subtotal",
    discount: "Discount",
    revenue: "Revenue",
    tax: "Tax",
    total: "Total",
    totalCustomerPayment: "Total Customer Payment",

    // Product report columns
    productCode: "Product Code",
    productName: "Product Name",
    unit: "Unit",
    quantitySold: "Quantity Sold",
    totalAmount: "Total Amount",
    totalDiscount: "Total Discount",
    totalRevenue: "Total Revenue",
    categoryName: "Category",

    // Report titles
    timeSalesReport: "Time Sales Report",
    inventoryReport: "Inventory Report",
    salesReportByProduct: "Sales Report by Product",
    profitByInvoiceReport: "Profit by Invoice Report",
    invoiceDiscountReport: "Invoice Discount Report",
    returnByInvoiceReport: "Return by Invoice Report",
  },
  vi: {
    title: "Báo cáo",
    description: "Xem báo cáo bán hàng và vận hành",
    dashboard: "Bảng điều khiển",
    dashboardDescription: "Tổng quan về doanh thu và tình trạng vận hành",
    salesAnalysis: "Phân tích bán hàng",
    menuAnalysis: "Phân tích thực đơn",
    tableAnalysis: "Phân tích bàn",
    backToTables: "Quay lại bàn",
    noPaymentData: "Không có dữ liệu thanh toán.",

    // Date and time filters
    startDate: "Từ ngày",
    endDate: "Đến ngày",
    refresh: "Làm mới",
    toDay: "Hôm nay",
    lastWeek: "Tuần trước",
    thisMonth: "Tháng này",
    lastMonth: "Tháng trước",
    custom: "Tùy chỉnh",

    // Dashboard metrics
    totalRevenue: "Tổng doanh thu",
    totalOrders: "Tổng đơn hàng",
    totalQuantitySold: "Tổng số lượng sản phẩm đã bán",
    totalCustomers: "Tổng khách hàng",
    averageOrderValue: "Giá trị đơn hàng trung bình",
    dailyAverage: "Trung bình hàng ngày",
    activeOrders: "Đơn hàng đang hoạt động",
    occupiedTables: "Bàn đang sử dụng",
    monthlyRevenue: "Doanh thu tháng",

    // Sales analysis
    analyzeRevenue: "Phân tích xu hướng doanh thu và phương thức thanh toán",
    dailySales: "Doanh số hàng ngày",
    paymentMethods: "Phương thức thanh toán",
    hourlyBreakdown: "Phân tích theo giờ",
    revenue: "Doanh thu",
    orders: "Đơn hàng",
    customers: "Khách hàng",
    cash: "Tiền mặt",
    card: "Thẻ",
    credit_card: "Thẻ tín dụng",
    qrbanking: "Mã QR",
    einvoice: "Hóa đơn điện tử",

    // Analysis types
    analysisType: "Phân tích theo",
    analyzeBy: "Phân tích theo",
    timeAnalysis: "Thời gian",
    productAnalysis: "Sản phẩm",
    employeeAnalysis: "Nhân viên",
    customerAnalysis: "Khách hàng",
    channelAnalysis: "Kênh bán hàng",

    // Chart and visual
    chartView: "Xem biểu đồ",
    visualRepresentation: "Biểu diễn trực quan",

    // Sales chart report
    salesChart: "Biểu đồ bán hàng", 
    salesChartDescription: "Phân tích doanh thu trực quan qua biểu đồ",
    salesReport: "Báo cáo bán hàng",
    purchaseReport: "Báo cáo mua hàng",
    inventoryReport: "Báo cáo tồn kho",

    // Filter labels
    salesMethod: "Phương thức bán hàng",
    salesChannel: "Kênh bán hàng",
    productFilter: "Sản phẩm",
    productFilterPlaceholder: "Tìm theo mã, tên",
    customerFilter: "Khách hàng",
    customerFilterPlaceholder: "Tìm theo tên, số điện thoại hoặc mã",

    // Sales chart table columns
    date: "Ngày",
    orderNumber: "Số đơn bán",
    subtotal: "Thành tiền",
    discount: "Giảm giá",
    revenue: "Doanh thu",
    tax: "Thuế",
    total: "Tổng tiền",
    totalCustomerPayment: "Tổng KH thanh toán",

    // Product report columns
    productCode: "Mã hàng",
    productName: "Tên sản phẩm",
    unit: "Đơn vị",
    quantitySold: "Số lượng bán",
    totalAmount: "Tổng số tiền",
    totalDiscount: "Giảm giá",
    totalRevenue: "Doanh thu",
    categoryName: "Danh mục",

    // Report titles
    timeSalesReport: "Báo cáo bán hàng theo thời gian",
    inventoryReport: "Báo cáo hàng hóa",
    salesReportByProduct: "Báo cáo bán hàng theo sản phẩm",
    profitByInvoiceReport: "Báo cáo lợi nhuận theo hóa đơn",
    invoiceDiscountReport: "Báo cáo giảm giá hóa đơn",
    returnByInvoiceReport: "Báo cáo trả hàng theo hóa đơn",
  },
};
