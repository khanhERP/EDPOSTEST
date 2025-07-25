
export interface POSTranslations {
  title: string;
  cashierName: string;
  beforeWork: string;
  defaultCashier: string;
  currentlyOutOfStock: string;
  outOfStock: string;
  inStock: string;
  addedToCart: string;
  categories: string;
  allCategories: string;
  selectCategory: string;
  product: string;
  products: string;
  cart: string;
  quantity: string;
  totalAmount: string;
  receiptNumber: string;
  transactionId: string;
  customerInfo: string;
  customerName: string;
  customerPhone: string;
  paymentComplete: string;
  thankYou: string;
  receipt: string;
  purchaseHistory: string;
  today: string;
  yesterday: string;
  thisWeek: string;
  thisMonth: string;
  thisYear: string;
  productsAvailable: string;
  gridView: string;
  sortByName: string;
  noProductsFound: string;
  searchProducts: string;
  scanBarcode: string;
  productScanned: string;
  scanFailed: string;
  productNotFound: string;
  addItemsToCart: string;
  emptyCart: string;
  clearCart: string;
  checkout: string;
  payment: string;
  cash: string;
  card: string;
  amountReceived: string;
  change: string;
  paymentMethod: string;
  orderComplete: string;
  printReceipt: string;
  newOrder: string;
  newTransaction: string;
  transactionComplete: string;
  transactionFailed: string;
  productManager: string;
  productName: string;
  sku: string;
  stock: string;
  imageUrl: string;
  isActive: string;
  addProductsToStart: string;
  allProducts: string;
  popular: string;
  lowStock: string;
  stockCount: string;
  price: string;
  category: string;
  description: string;
  barcode: string;
  costPrice: string;
  sellingPrice: string;
  taxRate: string;
  discount: string;
  unit: string;
  supplier: string;
  expiryDate: string;
  batchNumber: string;
  location: string;
  minStock: string;
  maxStock: string;
  reorderPoint: string;
  notes: string;
}

export const posTranslations: { [key: string]: POSTranslations } = {
  ko: {
    title: 'POS 시스템',
    cashierName: '계산원 이름',
    beforeWork: '근무자 출근전',
    defaultCashier: '김담당자',
    currentlyOutOfStock: '현재 품절입니다',
    outOfStock: '품절',
    inStock: '재고 있음',
    addedToCart: '장바구니에 추가됨',
    categories: '카테고리',
    allCategories: '전체',
    selectCategory: '카테고리 선택',
    product: '상품',
    products: '상품',
    cart: '장바구니',
    quantity: '수량',
    totalAmount: '총 금액',
    receiptNumber: '영수증 번호',
    transactionId: '거래 ID',
    customerInfo: '고객 정보',
    customerName: '고객명',
    customerPhone: '고객 전화번호',
    paymentComplete: '결제 완료',
    thankYou: '감사합니다',
    receipt: '영수증',
    purchaseHistory: '구매 내역',
    today: '오늘',
    yesterday: '어제',
    thisWeek: '이번 주',
    thisMonth: '이번 달',
    thisYear: '올해',
    productsAvailable: '개 상품 사용 가능',
    gridView: '그리드 보기',
    sortByName: '이름순 정렬',
    noProductsFound: '상품을 찾을 수 없습니다',
    searchProducts: '상품 검색...',
    scanBarcode: '바코드 스캔',
    productScanned: '상품 스캔됨',
    scanFailed: '스캔 실패',
    productNotFound: '상품을 찾을 수 없습니다',
    addItemsToCart: '상품을 장바구니에 추가하여 시작하세요',
    emptyCart: '장바구니가 비어있습니다',
    clearCart: '장바구니 비우기',
    checkout: '결제',
    payment: '결제',
    cash: '현금',
    card: '카드',
    amountReceived: '받은 금액',
    change: '거스름돈',
    paymentMethod: '결제 방법',
    orderComplete: '주문 완료',
    printReceipt: '영수증 출력',
    newOrder: '새 주문',
    newTransaction: '새 거래',
    transactionComplete: '거래 완료',
    transactionFailed: '거래 실패',
    productManager: '상품 관리',
    productName: '상품명',
    sku: 'SKU',
    stock: '재고',
    imageUrl: '이미지 URL',
    isActive: '활성 상태',
    addProductsToStart: '시작하려면 상품을 추가하세요',
    allProducts: '모든 상품',
    popular: '인기',
    lowStock: '재고 부족',
    stockCount: '재고 수량',
    price: '가격',
    category: '카테고리',
    description: '설명',
    barcode: '바코드',
    costPrice: '원가',
    sellingPrice: '판매가',
    taxRate: '세율',
    discount: '할인',
    unit: '단위',
    supplier: '공급업체',
    expiryDate: '유효기간',
    batchNumber: '배치 번호',
    location: '위치',
    minStock: '최소 재고',
    maxStock: '최대 재고',
    reorderPoint: '재주문 시점',
    notes: '메모',
  },
  en: {
    title: 'POS System',
    cashierName: 'Cashier Name',
    beforeWork: 'Before Work Start',
    defaultCashier: 'Default Cashier',
    currentlyOutOfStock: 'Currently out of stock',
    outOfStock: 'Out of Stock',
    inStock: 'In Stock',
    addedToCart: 'Added to cart',
    categories: 'Categories',
    allCategories: 'All',
    selectCategory: 'Select Category',
    product: 'Product',
    products: 'Products',
    cart: 'Cart',
    quantity: 'Quantity',
    totalAmount: 'Total Amount',
    receiptNumber: 'Receipt Number',
    transactionId: 'Transaction ID',
    customerInfo: 'Customer Info',
    customerName: 'Customer Name',
    customerPhone: 'Customer Phone',
    paymentComplete: 'Payment Complete',
    thankYou: 'Thank You',
    receipt: 'Receipt',
    purchaseHistory: 'Purchase History',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    productsAvailable: 'products available',
    gridView: 'Grid View',
    sortByName: 'Sort by Name',
    noProductsFound: 'No products found',
    searchProducts: 'Search products...',
    scanBarcode: 'Scan Barcode',
    productScanned: 'Product Scanned',
    scanFailed: 'Scan Failed',
    productNotFound: 'Product not found',
    addItemsToCart: 'Add items to cart to get started',
    emptyCart: 'Your cart is empty',
    clearCart: 'Clear Cart',
    checkout: 'Checkout',
    payment: 'Payment',
    cash: 'Cash',
    card: 'Card',
    amountReceived: 'Amount Received',
    change: 'Change',
    paymentMethod: 'Payment Method',
    orderComplete: 'Order Complete',
    printReceipt: 'Print Receipt',
    newOrder: 'New Order',
    newTransaction: 'New Transaction',
    transactionComplete: 'Transaction Complete',
    transactionFailed: 'Transaction Failed',
    productManager: 'Product Manager',
    productName: 'Product Name',
    sku: 'SKU',
    stock: 'Stock',
    imageUrl: 'Image URL',
    isActive: 'Active',
    addProductsToStart: 'Add products to get started',
    allProducts: 'All Products',
    popular: 'Popular',
    lowStock: 'Low Stock',
    stockCount: 'Stock Count',
    price: 'Price',
    category: 'Category',
    description: 'Description',
    barcode: 'Barcode',
    costPrice: 'Cost Price',
    sellingPrice: 'Selling Price',
    taxRate: 'Tax Rate',
    discount: 'Discount',
    unit: 'Unit',
    supplier: 'Supplier',
    expiryDate: 'Expiry Date',
    batchNumber: 'Batch Number',
    location: 'Location',
    minStock: 'Min Stock',
    maxStock: 'Max Stock',
    reorderPoint: 'Reorder Point',
    notes: 'Notes',
  },
  vi: {
    title: 'Hệ thống POS',
    cashierName: 'Tên thu ngân',
    beforeWork: 'Trước khi làm việc',
    defaultCashier: 'Thu ngân mặc định',
    currentlyOutOfStock: 'Hiện tại hết hàng',
    outOfStock: 'Hết hàng',
    inStock: 'Còn hàng',
    addedToCart: 'Đã thêm vào giỏ',
    categories: 'Danh mục',
    allCategories: 'Tất cả',
    selectCategory: 'Chọn danh mục',
    product: 'Sản phẩm',
    products: 'Sản phẩm',
    cart: 'Giỏ hàng',
    quantity: 'Số lượng',
    totalAmount: 'Tổng tiền',
    receiptNumber: 'Số hóa đơn',
    transactionId: 'Mã giao dịch',
    customerInfo: 'Thông tin khách hàng',
    customerName: 'Tên khách hàng',
    customerPhone: 'Số điện thoại khách hàng',
    paymentComplete: 'Thanh toán hoàn tất',
    thankYou: 'Cảm ơn bạn',
    receipt: 'Hóa đơn',
    purchaseHistory: 'Lịch sử mua hàng',
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    thisWeek: 'Tuần này',
    thisMonth: 'Tháng này',
    thisYear: 'Năm nay',
    productsAvailable: 'sản phẩm có sẵn',
    gridView: 'Xem dạng lưới',
    sortByName: 'Sắp xếp theo tên',
    noProductsFound: 'Không tìm thấy sản phẩm',
    searchProducts: 'Tìm kiếm sản phẩm...',
    scanBarcode: 'Quét mã vạch',
    productScanned: 'Đã quét sản phẩm',
    scanFailed: 'Quét thất bại',
    productNotFound: 'Không tìm thấy sản phẩm',
    addItemsToCart: 'Thêm sản phẩm vào giỏ để bắt đầu',
    emptyCart: 'Giỏ hàng trống',
    clearCart: 'Xóa giỏ hàng',
    checkout: 'Thanh toán',
    payment: 'Thanh toán',
    cash: 'Tiền mặt',
    card: 'Thẻ',
    amountReceived: 'Số tiền nhận',
    change: 'Tiền thối',
    paymentMethod: 'Phương thức thanh toán',
    orderComplete: 'Đơn hàng hoàn tất',
    printReceipt: 'In hóa đơn',
    newOrder: 'Đơn hàng mới',
    newTransaction: 'Giao dịch mới',
    transactionComplete: 'Giao dịch hoàn tất',
    transactionFailed: 'Giao dịch thất bại',
    productManager: 'Quản lý sản phẩm',
    productName: 'Tên sản phẩm',
    sku: 'SKU',
    stock: 'Tồn kho',
    imageUrl: 'URL hình ảnh',
    isActive: 'Hoạt động',
    addProductsToStart: 'Thêm sản phẩm để bắt đầu',
    allProducts: 'Tất cả sản phẩm',
    popular: 'Phổ biến',
    lowStock: 'Tồn kho thấp',
    stockCount: 'Số lượng tồn kho',
    price: 'Giá',
    category: 'Danh mục',
    description: 'Mô tả',
    barcode: 'Mã vạch',
    costPrice: 'Giá gốc',
    sellingPrice: 'Giá bán',
    taxRate: 'Thuế suất',
    discount: 'Giảm giá',
    unit: 'Đơn vị',
    supplier: 'Nhà cung cấp',
    expiryDate: 'Ngày hết hạn',
    batchNumber: 'Số lô',
    location: 'Vị trí',
    minStock: 'Tồn kho tối thiểu',
    maxStock: 'Tồn kho tối đa',
    reorderPoint: 'Điểm đặt hàng lại',
    notes: 'Ghi chú',
  },
};
