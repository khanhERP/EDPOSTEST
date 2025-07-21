import { create } from 'zustand';

export type Language = 'ko' | 'en' | 'vi';

interface LanguageStore {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  currentLanguage: (typeof window !== 'undefined' ? localStorage.getItem('language') as Language : null) || 'ko',
  setLanguage: (language: Language) => {
    console.log('🌐 언어 변경:', language);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
    }
    set({ currentLanguage: language });
  },
}));

export const translations = {
  ko: {
    // 공통
    common: {
      loading: '로딩 중...',
      save: '저장',
      cancel: '취소',
      edit: '편집',
      delete: '삭제',
      add: '추가',
      search: '검색',
      confirm: '확인',
      close: '닫기',
      submit: '제출',
      back: '뒤로',
      next: '다음',
      previous: '이전',
      select: '선택',
      total: '총액',
      subtotal: '소계',
      tax: '세금',
      change: '거스름돈',
      quantity: '수량',
      price: '가격',
      name: '이름',
      description: '설명',
      category: '카테고리',
      status: '상태',
      date: '날짜',
      time: '시간',
      actions: '작업',
      success: '성공',
      error: '오류',
      warning: '경고',
      info: '정보',
      restaurant: '레스토랑 본점',
      logout: '로그아웃',
      items: '개',
      collapse: '접기',
      products: '상품'
    },
    
    // 네비게이션
    nav: {
      pos: 'POS',
      tables: '테이블',
      inventory: '재고',
      employees: '직원',
      attendance: '출근',
      reports: '보고서'
    },
    
    // POS 시스템
    pos: {
      title: 'POS 시스템',
      allCategories: '전체 카테고리',
      addToCart: '장바구니 담기',
      cart: '장바구니',
      emptyCart: '장바구니가 비어있습니다',
      clearCart: '모두 삭제',
      checkout: '결제',
      cash: '현금',
      card: '카드',
      mobile: '모바일',
      cashierName: '계산원',
      amountReceived: '받은 금액',
      paymentMethod: '결제 방법',
      printReceipt: '영수증 출력',
      newTransaction: '새 거래',
      outOfStock: '재고 없음',
      transactionComplete: '거래 완료',
      transactionFailed: '거래 실패',
      productManager: '상품 관리',
      productName: '상품명',
      sku: 'SKU',
      stock: '재고',
      imageUrl: '이미지 URL',
      isActive: '활성 상태',
      addProductsToStart: '시작하려면 상품을 추가하세요',
      searchProducts: '상품 검색...',
      scanBarcode: '바코드 스캔',
      categories: '카테고리',
      allProducts: '모든 상품',
      productScanned: '상품 스캔됨',
      scanFailed: '스캔 실패',
      productNotFound: '상품을 찾을 수 없습니다',
      currentlyOutOfStock: '현재 품절입니다',
      inStock: '재고',
      addItemsToCart: '상품을 장바구니에 추가하세요'
    },
    
    // 테이블 관리
    tables: {
      title: '테이블 관리',
      description: '매장 테이블과 주문을 관리합니다.',
      backToPOS: 'POS로 돌아가기',
      tableStatus: '테이블 현황',
      orderManagement: '주문 관리',
      tableSettings: '테이블 설정',
      people: '명',
      available: '사용 가능',
      occupied: '사용 중',
      reserved: '예약됨',
      outOfService: '사용 불가',
      cleanupComplete: '정리완료'
    },
    
    // 재고 관리
    inventory: {
      title: '재고 관리',
      description: '상품 재고를 관리하고 재고 현황을 확인합니다.',
      addProduct: '상품 추가',
      searchProducts: '상품 검색...',
      lowStock: '재고 부족',
      outOfStock: '품절',
      inStock: '재고 있음',
      allStock: '전체',
      stockUpdate: '재고 수정',
      quantity: '수량',
      notes: '메모'
    },
    
    // 직원 관리
    employees: {
      title: '직원 관리',
      description: '직원 정보를 관리하고 추가/수정할 수 있습니다.',
      addEmployee: '직원 추가',
      employeeManagement: '직원 관리'
    },
    
    // 근태 관리
    attendance: {
      title: '근태 관리',
      description: '직원 출퇴근 기록과 근무시간을 관리합니다.',
      clockInOut: '출퇴근',
      attendanceRecords: '근태 기록',
      statistics: '통계'
    },
    
    // 매출 분석
    reports: {
      title: '매출 분석',
      description: '매출 현황과 운영 지표를 분석합니다.',
      backToTables: '테이블로 돌아가기',
      dashboard: '대시보드',
      salesAnalysis: '매출 분석',
      menuAnalysis: '메뉴 분석',
      tableAnalysis: '테이블 분석'
    }
  },
  
  en: {
    // Common
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      add: 'Add',
      search: 'Search',
      confirm: 'Confirm',
      close: 'Close',
      submit: 'Submit',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      select: 'Select',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      change: 'Change',
      quantity: 'Quantity',
      price: 'Price',
      name: 'Name',
      description: 'Description',
      category: 'Category',
      status: 'Status',
      date: 'Date',
      time: 'Time',
      actions: 'Actions',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
      restaurant: 'Main Restaurant',
      logout: 'Logout',
      items: 'items',
      collapse: 'Collapse',
      products: 'Products'
    },
    
    // Navigation
    nav: {
      pos: 'POS',
      tables: 'Tables',
      inventory: 'Inventory',
      employees: 'Employees',
      attendance: 'Attendance',
      reports: 'Reports'
    },
    
    // POS System
    pos: {
      title: 'POS System',
      allCategories: 'All Categories',
      addToCart: 'Add to Cart',
      cart: 'Shopping Cart',
      emptyCart: 'Cart is empty',
      clearCart: 'Clear All',
      checkout: 'Checkout',
      cash: 'Cash',
      card: 'Card',
      mobile: 'Mobile',
      cashierName: 'Cashier',
      amountReceived: 'Amount Received',
      paymentMethod: 'Payment Method',
      printReceipt: 'Print Receipt',
      newTransaction: 'New Transaction',
      outOfStock: 'Out of Stock',
      transactionComplete: 'Transaction Complete',
      transactionFailed: 'Transaction Failed',
      productManager: 'Product Manager',
      productName: 'Product Name',
      sku: 'SKU',
      stock: 'Stock',
      imageUrl: 'Image URL',
      isActive: 'Active Status',
      addProductsToStart: 'Add products to get started',
      searchProducts: 'Search products...',
      scanBarcode: 'Scan Barcode',
      categories: 'Categories',
      allProducts: 'All Products',
      productScanned: 'Product Scanned',
      scanFailed: 'Scan Failed',
      productNotFound: 'Product not found',
      currentlyOutOfStock: 'is currently out of stock',
      inStock: 'in stock',
      addItemsToCart: 'Add items to cart'
    },
    
    // Table Management
    tables: {
      title: 'Table Management',
      description: 'Manage restaurant tables and orders.',
      backToPOS: 'Back to POS',
      tableStatus: 'Table Status',
      orderManagement: 'Order Management',
      tableSettings: 'Table Settings',
      people: 'people',
      available: 'Available',
      occupied: 'Occupied',
      reserved: 'Reserved',
      outOfService: 'Out of Service',
      cleanupComplete: 'Cleanup Complete'
    },
    
    // Inventory Management
    inventory: {
      title: 'Inventory Management',
      description: 'Manage product inventory and check stock status.',
      addProduct: 'Add Product',
      searchProducts: 'Search products...',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
      allStock: 'All',
      stockUpdate: 'Stock Update',
      quantity: 'Quantity',
      notes: 'Notes'
    },
    
    // Employee Management
    employees: {
      title: 'Employee Management',
      description: 'Manage employee information and add/edit staff.',
      addEmployee: 'Add Employee',
      employeeManagement: 'Employee Management'
    },
    
    // Attendance Management
    attendance: {
      title: 'Attendance Management',
      description: 'Manage employee clock-in/out records and work hours.',
      clockInOut: 'Clock In/Out',
      attendanceRecords: 'Attendance Records',
      statistics: 'Statistics'
    },
    
    // Sales Reports
    reports: {
      title: 'Sales Analysis',
      description: 'Analyze sales performance and operational metrics.',
      backToTables: 'Back to Tables',
      dashboard: 'Dashboard',
      salesAnalysis: 'Sales Analysis',
      menuAnalysis: 'Menu Analysis',
      tableAnalysis: 'Table Analysis'
    }
  },
  
  vi: {
    // Chung
    common: {
      loading: 'Đang tải...',
      save: 'Lưu',
      cancel: 'Hủy',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      add: 'Thêm',
      search: 'Tìm kiếm',
      confirm: 'Xác nhận',
      close: 'Đóng',
      submit: 'Gửi',
      back: 'Quay lại',
      next: 'Tiếp theo',
      previous: 'Trước',
      select: 'Chọn',
      total: 'Tổng cộng',
      subtotal: 'Tạm tính',
      tax: 'Thuế',
      change: 'Tiền thối',
      quantity: 'Số lượng',
      price: 'Giá',
      name: 'Tên',
      description: 'Mô tả',
      category: 'Danh mục',
      status: 'Trạng thái',
      date: 'Ngày',
      time: 'Thời gian',
      actions: 'Hành động',
      success: 'Thành công',
      error: 'Lỗi',
      warning: 'Cảnh báo',
      info: 'Thông tin',
      restaurant: 'Nhà hàng chính',
      logout: 'Đăng xuất',
      items: 'mặt hàng',
      collapse: 'Thu gọn',
      products: 'Sản phẩm'
    },
    
    // Điều hướng
    nav: {
      pos: 'POS',
      tables: 'Bàn',
      inventory: 'Kho',
      employees: 'Nhân viên',
      attendance: 'Chấm công',
      reports: 'Báo cáo'
    },
    
    // Hệ thống POS
    pos: {
      title: 'Hệ thống POS',
      allCategories: 'Tất cả danh mục',
      addToCart: 'Thêm vào giỏ',
      cart: 'Giỏ hàng',
      emptyCart: 'Giỏ hàng trống',
      clearCart: 'Xóa tất cả',
      checkout: 'Thanh toán',
      cash: 'Tiền mặt',
      card: 'Thẻ',
      mobile: 'Di động',
      cashierName: 'Thu ngân',
      amountReceived: 'Số tiền nhận',
      paymentMethod: 'Phương thức thanh toán',
      printReceipt: 'In hóa đơn',
      newTransaction: 'Giao dịch mới',
      outOfStock: 'Hết hàng',
      transactionComplete: 'Giao dịch hoàn tất',
      transactionFailed: 'Giao dịch thất bại',
      productManager: 'Quản lý sản phẩm',
      productName: 'Tên sản phẩm',
      sku: 'SKU',
      stock: 'Tồn kho',
      imageUrl: 'URL hình ảnh',
      isActive: 'Trạng thái hoạt động',
      addProductsToStart: 'Thêm sản phẩm để bắt đầu',
      searchProducts: 'Tìm kiếm sản phẩm...',
      scanBarcode: 'Quét mã vạch',
      categories: 'Danh mục',
      allProducts: 'Tất cả sản phẩm',
      productScanned: 'Đã quét sản phẩm',
      scanFailed: 'Quét thất bại',
      productNotFound: 'Không tìm thấy sản phẩm',
      currentlyOutOfStock: 'hiện đang hết hàng',
      inStock: 'còn hàng',
      addItemsToCart: 'Thêm sản phẩm vào giỏ hàng'
    },
    
    // Quản lý bàn
    tables: {
      title: 'Quản lý bàn',
      description: 'Quản lý bàn và đơn hàng trong nhà hàng.',
      backToPOS: 'Quay lại POS',
      tableStatus: 'Tình trạng bàn',
      orderManagement: 'Quản lý đơn hàng',
      tableSettings: 'Cài đặt bàn',
      people: 'người',
      available: 'Có sẵn',
      occupied: 'Đang sử dụng',
      reserved: 'Đã đặt',
      outOfService: 'Ngưng hoạt động',
      cleanupComplete: 'Dọn dẹp xong'
    },
    
    // Quản lý kho
    inventory: {
      title: 'Quản lý kho',
      description: 'Quản lý kho hàng sản phẩm và kiểm tra tình trạng tồn kho.',
      addProduct: 'Thêm sản phẩm',
      searchProducts: 'Tìm kiếm sản phẩm...',
      lowStock: 'Tồn kho thấp',
      outOfStock: 'Hết hàng',
      inStock: 'Còn hàng',
      allStock: 'Tất cả',
      stockUpdate: 'Cập nhật tồn kho',
      quantity: 'Số lượng',
      notes: 'Ghi chú'
    },
    
    // Quản lý nhân viên
    employees: {
      title: 'Quản lý nhân viên',
      description: 'Quản lý thông tin nhân viên và thêm/sửa nhân viên.',
      addEmployee: 'Thêm nhân viên',
      employeeManagement: 'Quản lý nhân viên'
    },
    
    // Quản lý chấm công
    attendance: {
      title: 'Quản lý chấm công',
      description: 'Quản lý bản ghi chấm công và giờ làm việc của nhân viên.',
      clockInOut: 'Chấm công',
      attendanceRecords: 'Bản ghi chấm công',
      statistics: 'Thống kê'
    },
    
    // Báo cáo bán hàng
    reports: {
      title: 'Phân tích doanh thu',
      description: 'Phân tích hiệu suất bán hàng và chỉ số hoạt động.',
      backToTables: 'Quay lại bàn',
      dashboard: 'Bảng điều khiển',
      salesAnalysis: 'Phân tích doanh thu',
      menuAnalysis: 'Phân tích thực đơn',
      tableAnalysis: 'Phân tích bàn'
    }
  }
};

export const useTranslation = () => {
  const { currentLanguage } = useLanguageStore();
  
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = (translations as any)[currentLanguage];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    const result = value || key;
    // 필요시 디버그 로그 활성화
    // console.log(`번역 [${currentLanguage}]: ${key} => ${result}`);
    return result;
  };
  
  return { t, currentLanguage };
};