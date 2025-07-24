export type Language = 'ko' | 'en' | 'vi';

// Common translations interface
export interface CommonTranslations {
  loading: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  filter: string;
  back: string;
  next: string;
  previous: string;
  confirm: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  yes: string;
  no: string;
  items: string;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  date: string;
  time: string;
  status: string;
  active: string;
  inactive: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  actions: string;
  collapse: string;
  expand: string;
  restaurant: string;
  noRecords: string;
  selectOtherDate: string;
  category: string;
  available: string;
  occupied: string;
  reserved: string;
  maintenance: string;
}

// Navigation translations interface
export interface NavigationTranslations {
  pos: string;
  tables: string;
  inventory: string;
  reports: string;
  employees: string;
  attendance: string;
}

// Reports translations interface
export interface ReportsTranslations {
  title: string;
  description: string;
  dashboard: string;
  dashboardDescription: string;
  salesAnalysis: string;
  menuAnalysis: string;
  tableAnalysis: string;
  backToTables: string;
  
  // Date and time filters
  startDate: string;
  endDate: string;
  refresh: string;
  toDay: string;
  lastWeek: string;
  lastMonth: string;
  custom: string;
  
  // Dashboard metrics
  totalRevenue: string;
  totalOrders: string;
  totalCustomers: string;
  averageOrderValue: string;
  dailyAverage: string;
  activeOrders: string;
  occupiedTables: string;
  monthlyRevenue: string;
  
  // Sales analysis
  analyzeRevenue: string;
  dailySales: string;
  paymentMethods: string;
  hourlyBreakdown: string;
  revenue: string;
  orders: string;
  customers: string;
  cash: string;
  card: string;
  
  // Menu analysis
  productPerformance: string;
  categoryPerformance: string;
  topProducts: string;
  popularItems: string;
  totalSold: string;
  orderCount: string;
  performance: string;
  
  // Table analysis
  tablePerformance: string;
  utilizationRate: string;
  turnoverRate: string;
  averageRevenue: string;
  peakHours: string;
  tableUtilization: string;
  revenuePerTable: string;
  ordersPerTable: string;
  
  // Common report elements
  period: string;
  thisMonth: string;
  noData: string;
  noDataDescription: string;
  loading: string;
  
  // Additional dashboard keys
  periodRevenue: string;
  customerCount: string;
  monthRevenue: string;
  monthAccumulated: string;
  realTimeStatus: string;
  pendingOrders: string;
  count: string;
  performanceMetrics: string;
  salesAchievementRate: string;
  hour: string;
  peakHour: string;
  tableTurnoverRate: string;
  times: string;
  targetAverageDailySales: string;
}

// Settings translations interface
export interface SettingsTranslations {
  title: string;
  description: string;
  storeInfo: string;
  categories: string;
  employees: string;
  payments: string;
  basicInfo: string;
  basicInfoDesc: string;
  contactInfo: string;
  contactInfoDesc: string;
  operationHours: string;
  operationHoursDesc: string;
  storeName: string;
  storeCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  openTime: string;
  closeTime: string;
  categoryManagement: string;
  categoryManagementDesc: string;
  goToCategories: string;
  categoriesRedirect: string;
  employeeManagement: string;
  employeeManagementDesc: string;
  goToEmployees: string;
  goToInventory: string;
  paymentMethodsDesc: string;
  availablePayments: string;
  addPayment: string;
  enabled: string;
  storeUpdated: string;
  updateError: string;
}

// Not Found translations interface
export interface NotFoundTranslations {
  title: string;
  description: string;
  backHome: string;
  backToHome: string;
}

// Main translations interface
export interface OrdersTranslations {
  orderManagement: string;
  orderDetails: string;
  orderNumber: string;
  orderInfo: string;
  orderItems: string;
  orderStatus: string;
  orderTime: string;
  orderStatusUpdated: string;
  orderStatusUpdateFailed: string;
  viewDetails: string;
  confirm: string;
  startCooking: string;
  ready: string;
  served: string;
  table: string;
  customer: string;
  customerCount: string;
  customerName: string;
  noCustomerName: string;
  people: string;
  unknownTable: string;
  unknownProduct: string;
  memo: string;
  totalAmount: string;
  statusAndTime: string;
  status: {
    pending: string;
    confirmed: string;
    preparing: string;
    ready: string;
    served: string;
    paid: string;
    cancelled: string;
  };
}

export interface Translations {
  common: CommonTranslations;
  nav: NavigationTranslations;
  reports: ReportsTranslations;
  settings: SettingsTranslations;
  notFound: NotFoundTranslations;
  orders: OrdersTranslations;
}

// Type-safe translation keys
export type TranslationKey = 
  | `common.${keyof CommonTranslations}`
  | `nav.${keyof NavigationTranslations}`
  | `reports.${keyof ReportsTranslations}`
  | `settings.${keyof SettingsTranslations}`
  | `notFound.${keyof NotFoundTranslations}`;

// Language-specific translations type
export type LanguageTranslations = {
  [K in Language]: Translations;
};