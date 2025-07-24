export type Language = "ko" | "en" | "vi";

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
  paymentMethods: string;
  payments: {
    cash: string;
    creditCard: string;
    debitCard: string;
    momo: string;
    zalopay: string;
    vnpay: string;
    banking: string;
    shopeepay: string;
    grabpay: string;
    newPayment: string;
  };
  disabled: string;
  backToPos: string;
  storeNamePlaceholder: string;
  storeCodePlaceholder: string;
  taxId: string;
  taxIdPlaceholder: string;
  addressPlaceholder: string;
  phonePlaceholder: string;
  emailPlaceholder: string;
}

// Not Found translations interface
export interface NotFoundTranslations {
  title: string;
  description: string;
  backHome: string;
  backToHome: string;
}

// Customers translations interface
export interface CustomersTranslations {
  title: string;
  description: string;
  customerManagement: string;
  addCustomer: string;
  editCustomer: string;
  deleteCustomer: string;
  searchPlaceholder: string;
  customerId: string;
  name: string;
  phone: string;
  email: string;
  visitCount: string;
  totalSpent: string;
  points: string;
  membershipLevel: string;
  status: string;
  totalCustomers: string;
  activeCustomers: string;
  pointsIssued: string;
  averageSpent: string;
  customerFormTitle: string;
  customerFormDesc: string;
  customerAdded: string;
  customerUpdated: string;
  customerDeleted: string;
  customerError: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  emailPlaceholder: string;
  addressPlaceholder: string;
  birthday: string;
  birthdayPlaceholder: string;
  gender: string;
  male: string;
  female: string;
  other: string;
  address: string;
  gold: string;
  silver: string;
  vip: string;
}

// Employees translations interface
export interface EmployeesTranslations {
  title: string;
  description: string;
  employeeManagement: string;
  addEmployee: string;
  editEmployee: string;
  deleteEmployee: string;
  searchPlaceholder: string;
  employeeId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  status: string;
  hireDate: string;
  salary: string;
  department: string;
  position: string;
  employeeFormTitle: string;
  employeeFormDesc: string;
  employeeAdded: string;
  employeeUpdated: string;
  employeeDeleted: string;
  employeeError: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  emailPlaceholder: string;
  salaryPlaceholder: string;
  roles: {
    admin: string;
    manager: string;
    cashier: string;
    kitchen: string;
    server: string;
  };
  active: string;
  inactive: string;
}

// Attendance translations interface
export interface AttendanceTranslations {
  title: string;
  description: string;
  clockInOut: string;
  attendanceRecords: string;
  statistics: string;
  clockIn: string;
  clockOut: string;
  breakStart: string;
  breakEnd: string;
  selectEmployee: string;
  notes: string;
  recordsDescription: string;
  selectedDate: string;
  unknownEmployee: string;
  status: {
    present: string;
    absent: string;
    late: string;
    halfDay: string;
  };
  clockInSuccess: string;
  clockInSuccessDesc: string;
  clockInError: string;
  clockOutSuccess: string;
  clockOutSuccessDesc: string;
  clockOutError: string;
  breakStartSuccess: string;
  breakStartSuccessDesc: string;
  breakStartError: string;
  hours: string;
  minutes: string;
  notesPlaceholder: string;
  workingTime: string;
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
  realTimeOrderStatus: string;
  ordersInProgress: string;
  noActiveOrders: string;
  newOrdersWillAppearHere: string;
  noTableInfo: string;
  noInput: string;
  payment: string;
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

// Inventory translations interface
export interface InventoryTranslations {
  title: string;
  description: string;
  totalProducts: string;
  lowStock: string;
  outOfStock: string;
  totalValue: string;
  searchProducts: string;
  stockStatus: string;
  allStock: string;
  inStock: string;
  productName: string;
  currentStock: string;
  unitPrice: string;
  stockValue: string;
  management: string;
  edit: string;
  stockUpdate: string;
  loading: string;
  noProducts: string;
  uncategorized: string;
  currentStockLabel: string;
  stockUpdateType: string;
  quantity: string;
  notesOptional: string;
  selectUpdateType: string;
  addStock: string;
  subtractStock: string;
  setStock: string;
  quantityInput: string;
  changeReason: string;
  processing: string;
  addNewItem: string;
  newProduct: string;
  productNameLabel: string;
  productNamePlaceholder: string;
  skuLabel: string;
  skuPlaceholder: string;
  priceLabel: string;
  pricePlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  initialStockQuantity: string;
  initialStockPlaceholder: string;
  stockQuantity: string;
  editReason: string;
  addNewStock: string;
  save: string;
  updateType: string;
}

export interface Translations {
  common: CommonTranslations;
  nav: NavigationTranslations;
  reports: ReportsTranslations;
  settings: SettingsTranslations;
  notFound: NotFoundTranslations;
  orders: OrdersTranslations;
  customers: CustomersTranslations;
  employees: EmployeesTranslations;
  attendance: AttendanceTranslations;
  inventory: InventoryTranslations;
}

// Type-safe translation keys
export type TranslationKey =
  | `common.${keyof CommonTranslations}`
  | `nav.${keyof NavigationTranslations}`
  | `reports.${keyof ReportsTranslations}`
  | `settings.${keyof SettingsTranslations}`
  | `notFound.${keyof NotFoundTranslations}`
  | `orders.${keyof OrdersTranslations}`
  | `customers.${keyof CustomersTranslations}`
  | `employees.${keyof EmployeesTranslations}`
  | `attendance.${keyof AttendanceTranslations}`
  | `inventory.${keyof InventoryTranslations}`;

// Language-specific translations type
export interface LanguageTranslations {
  ko: { [key: string]: any };
  en: { [key: string]: any };
  vi: { [key: string]: any };
}