import { create } from 'zustand';

export type Language = 'ko' | 'en' | 'vi';

interface LanguageStore {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  currentLanguage: 'ko' as Language,
  setLanguage: (language: Language) => set({ currentLanguage: language }),
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
      items: '개'
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
      addProductsToStart: '시작하려면 상품을 추가하세요'
    },
    
    // 테이블 관리
    tables: {
      title: '테이블 관리',
      tableNumber: '테이블 번호',
      capacity: '수용 인원',
      available: '사용 가능',
      occupied: '사용 중',
      reserved: '예약됨',
      maintenance: '정비 중',
      qrCode: 'QR 코드',
      addTable: '테이블 추가',
      editTable: '테이블 편집',
      deleteTable: '테이블 삭제'
    },
    
    // 재고 관리
    inventory: {
      title: '재고 관리',
      addProduct: '상품 추가',
      editProduct: '상품 편집',
      updateStock: '재고 업데이트',
      stockHistory: '재고 이력',
      lowStock: '부족한 재고',
      totalProducts: '총 상품',
      totalValue: '총 가치',
      categoriesCount: '카테고리 수',
      add: '추가',
      subtract: '차감',
      set: '설정',
      notes: '메모'
    },
    
    // 직원 관리
    employees: {
      title: '직원 관리',
      addEmployee: '직원 추가',
      editEmployee: '직원 편집',
      employeeId: '직원 ID',
      email: '이메일',
      phone: '전화번호',
      role: '역할',
      manager: '매니저',
      cashier: '계산원',
      admin: '관리자',
      hireDate: '입사일',
      active: '활성',
      inactive: '비활성'
    },
    
    // 출근 관리
    attendance: {
      title: '출근 관리',
      clockIn: '출근',
      clockOut: '퇴근',
      break: '휴식',
      startBreak: '휴식 시작',
      endBreak: '휴식 종료',
      totalHours: '총 시간',
      overtime: '초과 근무',
      present: '출근',
      absent: '결근',
      late: '지각',
      halfDay: '반차',
      todaysAttendance: '오늘의 출근',
      attendanceHistory: '출근 이력',
      attendanceStats: '출근 통계'
    },
    
    // 보고서
    reports: {
      title: '보고서',
      dashboard: '대시보드',
      salesReport: '매출 보고서',
      menuReport: '메뉴 보고서',
      tableReport: '테이블 보고서',
      dailySales: '일일 매출',
      monthlySales: '월간 매출',
      topProducts: '인기 상품',
      revenue: '매출',
      transactions: '거래',
      averageOrder: '평균 주문',
      popularItems: '인기 메뉴',
      tableUtilization: '테이블 이용률',
      peakHours: '피크 시간',
      totalRevenue: '총 매출',
      totalOrders: '총 주문',
      averageOrderValue: '평균 주문 금액'
    },
    
    // 주문 관리
    orders: {
      title: '주문 관리',
      orderNumber: '주문 번호',
      customerName: '고객명',
      customerCount: '고객 수',
      pending: '대기 중',
      confirmed: '확인됨',
      preparing: '준비 중',
      ready: '준비 완료',
      served: '서빙 완료',
      paid: '결제 완료',
      cancelled: '취소됨',
      orderedAt: '주문 시간',
      servedAt: '서빙 시간',
      paidAt: '결제 시간',
      paymentStatus: '결제 상태',
      createOrder: '주문 생성',
      updateOrder: '주문 업데이트'
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
      items: 'items'
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
      cart: 'Cart',
      emptyCart: 'Cart is empty',
      clearCart: 'Clear Cart',
      processPayment: 'Process Payment',
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
      addProductsToStart: 'Add products to get started'
    },
    
    // Table Management
    tables: {
      title: 'Table Management',
      tableNumber: 'Table Number',
      capacity: 'Capacity',
      available: 'Available',
      occupied: 'Occupied',
      reserved: 'Reserved',
      maintenance: 'Maintenance',
      qrCode: 'QR Code',
      addTable: 'Add Table',
      editTable: 'Edit Table',
      deleteTable: 'Delete Table'
    },
    
    // Inventory Management
    inventory: {
      title: 'Inventory Management',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      updateStock: 'Update Stock',
      stockHistory: 'Stock History',
      lowStock: 'Low Stock',
      totalProducts: 'Total Products',
      totalValue: 'Total Value',
      categoriesCount: 'Categories',
      add: 'Add',
      subtract: 'Subtract',
      set: 'Set',
      notes: 'Notes'
    },
    
    // Employee Management
    employees: {
      title: 'Employee Management',
      addEmployee: 'Add Employee',
      editEmployee: 'Edit Employee',
      employeeId: 'Employee ID',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      manager: 'Manager',
      cashier: 'Cashier',
      admin: 'Admin',
      hireDate: 'Hire Date',
      active: 'Active',
      inactive: 'Inactive'
    },
    
    // Attendance Management
    attendance: {
      title: 'Attendance Management',
      clockIn: 'Clock In',
      clockOut: 'Clock Out',
      break: 'Break',
      startBreak: 'Start Break',
      endBreak: 'End Break',
      totalHours: 'Total Hours',
      overtime: 'Overtime',
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      halfDay: 'Half Day',
      todaysAttendance: "Today's Attendance",
      attendanceHistory: 'Attendance History',
      attendanceStats: 'Attendance Stats'
    },
    
    // Reports
    reports: {
      title: 'Reports',
      dashboard: 'Dashboard',
      salesReport: 'Sales Report',
      menuReport: 'Menu Report',
      tableReport: 'Table Report',
      dailySales: 'Daily Sales',
      monthlySales: 'Monthly Sales',
      topProducts: 'Top Products',
      revenue: 'Revenue',
      transactions: 'Transactions',
      averageOrder: 'Average Order',
      popularItems: 'Popular Items',
      tableUtilization: 'Table Utilization',
      peakHours: 'Peak Hours',
      totalRevenue: 'Total Revenue',
      totalOrders: 'Total Orders',
      averageOrderValue: 'Average Order Value'
    },
    
    // Order Management
    orders: {
      title: 'Order Management',
      orderNumber: 'Order Number',
      customerName: 'Customer Name',
      customerCount: 'Customer Count',
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready',
      served: 'Served',
      paid: 'Paid',
      cancelled: 'Cancelled',
      orderedAt: 'Ordered At',
      servedAt: 'Served At',
      paidAt: 'Paid At',
      paymentStatus: 'Payment Status',
      createOrder: 'Create Order',
      updateOrder: 'Update Order'
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
      items: 'mặt hàng'
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
      clearCart: 'Xóa giỏ hàng',
      processPayment: 'Xử lý thanh toán',
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
      addProductsToStart: 'Thêm sản phẩm để bắt đầu'
    },
    
    // Quản lý bàn
    tables: {
      title: 'Quản lý bàn',
      tableNumber: 'Số bàn',
      capacity: 'Sức chứa',
      available: 'Có sẵn',
      occupied: 'Đang sử dụng',
      reserved: 'Đã đặt',
      maintenance: 'Bảo trì',
      qrCode: 'Mã QR',
      addTable: 'Thêm bàn',
      editTable: 'Sửa bàn',
      deleteTable: 'Xóa bàn'
    },
    
    // Quản lý kho
    inventory: {
      title: 'Quản lý kho',
      addProduct: 'Thêm sản phẩm',
      editProduct: 'Sửa sản phẩm',
      updateStock: 'Cập nhật kho',
      stockHistory: 'Lịch sử kho',
      lowStock: 'Sắp hết hàng',
      totalProducts: 'Tổng sản phẩm',
      totalValue: 'Tổng giá trị',
      categoriesCount: 'Số danh mục',
      add: 'Thêm',
      subtract: 'Trừ',
      set: 'Đặt',
      notes: 'Ghi chú'
    },
    
    // Quản lý nhân viên
    employees: {
      title: 'Quản lý nhân viên',
      addEmployee: 'Thêm nhân viên',
      editEmployee: 'Sửa nhân viên',
      employeeId: 'Mã nhân viên',
      email: 'Email',
      phone: 'Điện thoại',
      role: 'Vai trò',
      manager: 'Quản lý',
      cashier: 'Thu ngân',
      admin: 'Quản trị',
      hireDate: 'Ngày thuê',
      active: 'Hoạt động',
      inactive: 'Không hoạt động'
    },
    
    // Quản lý chấm công
    attendance: {
      title: 'Quản lý chấm công',
      clockIn: 'Vào ca',
      clockOut: 'Ra ca',
      break: 'Nghỉ',
      startBreak: 'Bắt đầu nghỉ',
      endBreak: 'Kết thúc nghỉ',
      totalHours: 'Tổng giờ',
      overtime: 'Làm thêm',
      present: 'Có mặt',
      absent: 'Vắng mặt',
      late: 'Muộn',
      halfDay: 'Nửa ngày',
      todaysAttendance: 'Chấm công hôm nay',
      attendanceHistory: 'Lịch sử chấm công',
      attendanceStats: 'Thống kê chấm công'
    },
    
    // Báo cáo
    reports: {
      title: 'Báo cáo',
      dashboard: 'Bảng điều khiển',
      salesReport: 'Báo cáo bán hàng',
      menuReport: 'Báo cáo menu',
      tableReport: 'Báo cáo bàn',
      dailySales: 'Doanh thu hàng ngày',
      monthlySales: 'Doanh thu hàng tháng',
      topProducts: 'Sản phẩm bán chạy',
      revenue: 'Doanh thu',
      transactions: 'Giao dịch',
      averageOrder: 'Đơn hàng trung bình',
      popularItems: 'Món phổ biến',
      tableUtilization: 'Tỷ lệ sử dụng bàn',
      peakHours: 'Giờ cao điểm',
      totalRevenue: 'Tổng doanh thu',
      totalOrders: 'Tổng đơn hàng',
      averageOrderValue: 'Giá trị đơn hàng trung bình'
    },
    
    // Quản lý đơn hàng
    orders: {
      title: 'Quản lý đơn hàng',
      orderNumber: 'Số đơn hàng',
      customerName: 'Tên khách hàng',
      customerCount: 'Số khách',
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang chuẩn bị',
      ready: 'Sẵn sàng',
      served: 'Đã phục vụ',
      paid: 'Đã thanh toán',
      cancelled: 'Đã hủy',
      orderedAt: 'Thời gian đặt',
      servedAt: 'Thời gian phục vụ',
      paidAt: 'Thời gian thanh toán',
      paymentStatus: 'Trạng thái thanh toán',
      createOrder: 'Tạo đơn hàng',
      updateOrder: 'Cập nhật đơn hàng'
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
    
    return value || key;
  };
  
  return { t, currentLanguage };
};