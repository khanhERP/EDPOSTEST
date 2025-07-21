// 언어 상태 관리
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LanguageStore {
  currentLanguage: 'ko' | 'en' | 'vi';
  setLanguage: (language: 'ko' | 'en' | 'vi') => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      currentLanguage: 'ko',
      setLanguage: (language) => set({ currentLanguage: language }),
    }),
    {
      name: 'edpos-language',
    }
  )
);

// 번역 객체
export const translations = {
  ko: {
    // Common
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
      yes: '예',
      no: '아니오',
      ok: '확인',
      hour: '시간',
      minute: '분',
      collapse: '축소',
      expand: '확장',
      viewReport: '보고서 보기'
    },

    // Navigation
    nav: {
      pos: 'POS',
      tables: '테이블 관리',
      inventory: '재고 관리',
      reports: '매출 분석',
      employees: '직원 관리',
      attendance: '근태 관리',
      settings: '시스템 설정'
    },

    // Tables
    tables: {
      title: '테이블 관리',
      description: '레스토랑 테이블 상태와 주문을 관리합니다.',
      backToPOS: 'POS로 돌아가기',
      tableStatus: '테이블 현황',
      orderManagement: '주문 관리',
      tableSettings: '테이블 설정'
    },

    // Not Found
    notFound: {
      title: '페이지를 찾을 수 없습니다',
      description: '요청하신 페이지가 존재하지 않거나 이동되었습니다.',
      backToHome: '홈으로 돌아가기'
    },

    // Attendance
    attendance: {
      title: '근태 관리',
      description: '직원 출퇴근 및 근무 시간을 관리합니다.',
      clockInOut: '출퇴근',
      attendanceRecords: '근태 기록',
      statistics: '통계',
      employeeSelect: '직원 선택',
      selectEmployee: '출퇴근할 직원을 선택하세요',
      workingTime: '의 근무 시간',
      currentStatus: '현재 상태',
      clockInTime: '출근 시간',
      clockOutTime: '퇴근 시간',
      hours: '시간',
      clockIn: '출근',
      clockOut: '퇴근',
      startBreak: '휴식 시작',
      endBreak: '휴식 종료',
      notes: '메모',
      notesPlaceholder: '근무 메모를 입력하세요'
    },

    // Employees
    employees: {
      title: '직원 관리',
      description: '직원 정보를 등록하고 관리합니다.',
      employeeManagement: '직원 관리',
      manager: '매니저',
      admin: '관리자',
      cashier: '캐셔'
    },

    // Inventory
    inventory: {
      title: '재고 관리',
      description: '제품 재고와 카테고리를 관리합니다.'
    },

    // Reports
    reports: {
      title: '매출 분석',
      description: '매출 현황과 리포트를 확인합니다.',
      itemSalesReport: '품목별 판매 보고서',
      employeeSalesReport: '직원별 판매 보고서',
      dailySalesReport: '일일 매출 보고서',
      detailedSalesReport: '자세한 판매 보고서',
      itemSalesDesc: '제품별 판매량과 매출을 분석합니다',
      employeeSalesDesc: '직원별 판매 성과를 확인합니다',
      dailySalesDesc: '일별 매출 현황을 조회합니다',
      detailedSalesDesc: '상세한 판매 내역을 확인합니다'
    },

    // Settings
    settings: {
      title: '시스템 설정',
      description: '시스템의 다양한 설정을 관리합니다.',
      storeInfo: '매장 정보',
      categories: '품목 관리',
      employees: '직원',
      storeSettings: '매장 설정',
      productManagement: '제품 관리',
      employeeManagement: '직원 관리',
      basicInfo: '기본 정보',
      basicInfoDesc: '매장의 기본 정보를 설정합니다.',
      contactInfo: '연락처 정보',
      contactInfoDesc: '매장의 연락처 정보를 설정합니다.',
      operationHours: '운영 시간',
      operationHoursDesc: '매장의 운영 시간을 설정합니다.',
      storeName: '매장 이름',
      storeNamePlaceholder: '매장 이름을 입력하세요',
      storeCode: '매장 코드',
      storeCodePlaceholder: '매장 코드를 입력하세요',
      taxId: '사업자등록번호',
      taxIdPlaceholder: '사업자등록번호를 입력하세요',
      address: '주소',
      addressPlaceholder: '매장 주소를 입력하세요',
      phone: '전화번호',
      phonePlaceholder: '전화번호를 입력하세요',
      email: '이메일',
      emailPlaceholder: '이메일 주소를 입력하세요',
      openTime: '개점 시간',
      closeTime: '폐점 시간',
      categoryManagement: '품목군 관리',
      categoryManagementDesc: '제품 카테고리와 품목을 관리합니다.',
      categoriesRedirect: '품목 관리는 재고 관리 페이지에서 할 수 있습니다.',
      goToInventory: '재고 관리로 이동',
      employeeManagementDesc: '직원 정보를 등록하고 관리합니다.',
      employeesRedirect: '직원 관리는 직원 관리 페이지에서 할 수 있습니다.',
      goToEmployees: '직원 관리로 이동',
      paymentMethods: '결제 수단 설정',
      paymentMethodsDesc: '사용할 결제 수단을 선택하고 관리합니다.',
      availablePayments: '사용 가능한 결제 수단',
      addPayment: '결제 수단 추가',
      enabled: '사용 중',
      disabled: '사용 안함',
      backToPos: 'POS로 돌아가기',
      payments: {
        cash: '현금',
        creditCard: '신용카드',
        debitCard: '체크카드',
        momo: 'MoMo',
        zalopay: 'ZaloPay',
        vnpay: 'VNPay',
        banking: '인터넷뱅킹',
        shopeepay: 'ShopeePay',
        grabpay: 'GrabPay',
        newPayment: '새 결제 수단'
      },
      storeUpdated: '매장 설정이 업데이트되었습니다',
      updateError: '설정 업데이트 중 오류가 발생했습니다'
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
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      hour: 'Hour',
      minute: 'Minute',
      collapse: 'Collapse',
      expand: 'Expand',
      viewReport: 'View Report'
    },

    // Navigation
    nav: {
      pos: 'POS',
      tables: 'Table Management',
      inventory: 'Inventory',
      reports: 'Reports',
      employees: 'Employees',
      attendance: 'Attendance',
      settings: 'System Settings'
    },

    // Tables
    tables: {
      title: 'Table Management',
      description: 'Manage restaurant table status and orders.',
      backToPOS: 'Back to POS',
      tableStatus: 'Table Status',
      orderManagement: 'Order Management',
      tableSettings: 'Table Settings'
    },

    // Not Found
    notFound: {
      title: 'Page Not Found',
      description: 'The page you requested does not exist or has been moved.',
      backToHome: 'Back to Home'
    },

    // Attendance
    attendance: {
      title: 'Attendance Management',
      description: 'Manage employee clock-in/out and working hours.',
      clockInOut: 'Clock In/Out',
      attendanceRecords: 'Attendance Records',
      statistics: 'Statistics',
      employeeSelect: 'Employee Selection',
      selectEmployee: 'Select an employee to clock in/out',
      workingTime: '\'s working time',
      currentStatus: 'Current Status',
      clockInTime: 'Clock In Time',
      clockOutTime: 'Clock Out Time',
      hours: ' hours',
      clockIn: 'Clock In',
      clockOut: 'Clock Out',
      startBreak: 'Start Break',
      endBreak: 'End Break',
      notes: 'Notes',
      notesPlaceholder: 'Enter work notes'
    },

    // Employees
    employees: {
      title: 'Employee Management',
      description: 'Register and manage employee information.',
      employeeManagement: 'Employee Management',
      manager: 'Manager',
      admin: 'Admin',
      cashier: 'Cashier'
    },

    // Inventory
    inventory: {
      title: 'Inventory Management',
      description: 'Manage product inventory and categories.'
    },

    // Reports
    reports: {
      title: 'Sales Reports',
      description: 'View sales status and reports.',
      itemSalesReport: 'Item Sales Report',
      employeeSalesReport: 'Employee Sales Report',
      dailySalesReport: 'Daily Sales Report',
      detailedSalesReport: 'Detailed Sales Report',
      itemSalesDesc: 'Analyze sales volume and revenue by product',
      employeeSalesDesc: 'Check sales performance by employee',
      dailySalesDesc: 'View daily sales status',
      detailedSalesDesc: 'Check detailed sales records'
    },

    // Settings
    settings: {
      title: 'System Settings',
      description: 'Manage various system settings.',
      storeInfo: 'Store Info',
      categories: 'Categories',
      employees: 'Employees',
      storeSettings: 'Store Settings',
      productManagement: 'Product Management',
      employeeManagement: 'Employee Management',
      basicInfo: 'Basic Information',
      basicInfoDesc: 'Configure basic store information.',
      contactInfo: 'Contact Information',
      contactInfoDesc: 'Configure store contact information.',
      operationHours: 'Operation Hours',
      operationHoursDesc: 'Set store operation hours.',
      storeName: 'Store Name',
      storeNamePlaceholder: 'Enter store name',
      storeCode: 'Store Code',
      storeCodePlaceholder: 'Enter store code',
      taxId: 'Tax ID',
      taxIdPlaceholder: 'Enter tax ID number',
      address: 'Address',
      addressPlaceholder: 'Enter store address',
      phone: 'Phone',
      phonePlaceholder: 'Enter phone number',
      email: 'Email',
      emailPlaceholder: 'Enter email address',
      openTime: 'Open Time',
      closeTime: 'Close Time',
      categoryManagement: 'Category Management',
      categoryManagementDesc: 'Manage product categories and items.',
      categoriesRedirect: 'Category management is available in the Inventory page.',
      goToInventory: 'Go to Inventory',
      employeeManagementDesc: 'Register and manage employee information.',
      employeesRedirect: 'Employee management is available in the Employees page.',
      goToEmployees: 'Go to Employees',
      paymentMethods: 'Payment Methods',
      paymentMethodsDesc: 'Select and manage available payment methods.',
      availablePayments: 'Available Payment Methods',
      addPayment: 'Add Payment Method',
      enabled: 'Enabled',
      disabled: 'Disabled',
      backToPos: 'Back to POS',
      payments: {
        cash: 'Cash',
        creditCard: 'Credit Card',
        debitCard: 'Debit Card',
        momo: 'MoMo',
        zalopay: 'ZaloPay',
        vnpay: 'VNPay',
        banking: 'Internet Banking',
        shopeepay: 'ShopeePay',
        grabpay: 'GrabPay',
        newPayment: 'New Payment Method'
      }
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
      yes: 'Có',
      no: 'Không',
      ok: 'OK',
      hour: 'Giờ',
      minute: 'Phút',
      collapse: 'Thu gọn',
      expand: 'Mở rộng',
      viewReport: 'Xem báo cáo'
    },

    // Điều hướng
    nav: {
      pos: 'POS',
      tables: 'Quản lý bàn',
      inventory: 'Kho hàng',
      reports: 'Báo cáo',
      employees: 'Nhân viên',
      attendance: 'Chấm công',
      settings: 'Cài đặt hệ thống'
    },

    // Tables
    tables: {
      title: 'Quản lý bàn',
      description: 'Quản lý trạng thái bàn và đơn hàng nhà hàng.',
      backToPOS: 'Quay về POS',
      tableStatus: 'Trạng thái bàn',
      orderManagement: 'Quản lý đơn hàng',
      tableSettings: 'Cài đặt bàn'
    },

    // Not Found
    notFound: {
      title: 'Không tìm thấy trang',
      description: 'Trang bạn yêu cầu không tồn tại hoặc đã được chuyển.',
      backToHome: 'Về trang chủ'
    },

    // Attendance
    attendance: {
      title: 'Quản lý chấm công',
      description: 'Quản lý giờ vào/ra và thời gian làm việc của nhân viên.',
      clockInOut: 'Chấm công',
      attendanceRecords: 'Bản ghi chấm công',
      statistics: 'Thống kê',
      employeeSelect: 'Chọn nhân viên',
      selectEmployee: 'Chọn nhân viên để chấm công',
      workingTime: ' thời gian làm việc',
      currentStatus: 'Trạng thái hiện tại',
      clockInTime: 'Giờ vào',
      clockOutTime: 'Giờ ra',
      hours: ' giờ',
      clockIn: 'Chấm công vào',
      clockOut: 'Chấm công ra',
      startBreak: 'Bắt đầu nghỉ',
      endBreak: 'Kết thúc nghỉ',
      notes: 'Ghi chú',
      notesPlaceholder: 'Nhập ghi chú công việc'
    },

    // Employees
    employees: {
      title: 'Quản lý nhân viên',
      description: 'Đăng ký và quản lý thông tin nhân viên.',
      employeeManagement: 'Quản lý nhân viên',
      manager: 'Quản lý',
      admin: 'Quản trị viên',
      cashier: 'Thu ngân'
    },

    // Inventory
    inventory: {
      title: 'Quản lý kho',
      description: 'Quản lý tồn kho sản phẩm và danh mục.'
    },

    // Reports
    reports: {
      title: 'Báo cáo bán hàng',
      description: 'Xem tình trạng bán hàng và báo cáo.',
      itemSalesReport: 'Báo cáo bán hàng theo sản phẩm',
      employeeSalesReport: 'Báo cáo bán hàng theo nhân viên',
      dailySalesReport: 'Báo cáo doanh thu hàng ngày',
      detailedSalesReport: 'Báo cáo bán hàng chi tiết',
      itemSalesDesc: 'Phân tích doanh số và doanh thu theo sản phẩm',
      employeeSalesDesc: 'Kiểm tra hiệu suất bán hàng theo nhân viên',
      dailySalesDesc: 'Xem tình trạng doanh thu hàng ngày',
      detailedSalesDesc: 'Kiểm tra hồ sơ bán hàng chi tiết'
    },

    // Cài đặt
    settings: {
      title: 'Cài đặt hệ thống',
      description: 'Quản lý các cài đặt hệ thống khác nhau.',
      storeInfo: 'Thông tin cửa hàng',
      categories: 'Danh mục',
      employees: 'Nhân viên',
      storeSettings: 'Cài đặt cửa hàng',
      productManagement: 'Quản lý sản phẩm',
      employeeManagement: 'Quản lý nhân viên',
      basicInfo: 'Thông tin cơ bản',
      basicInfoDesc: 'Cấu hình thông tin cơ bản của cửa hàng.',
      contactInfo: 'Thông tin liên hệ',
      contactInfoDesc: 'Cấu hình thông tin liên hệ của cửa hàng.',
      operationHours: 'Giờ hoạt động',
      operationHoursDesc: 'Đặt giờ hoạt động của cửa hàng.',
      storeName: 'Tên cửa hàng',
      storeNamePlaceholder: 'Nhập tên cửa hàng',
      storeCode: 'Mã cửa hàng',
      storeCodePlaceholder: 'Nhập mã cửa hàng',
      taxId: 'Mã số thuế',
      taxIdPlaceholder: 'Nhập mã số thuế',
      address: 'Địa chỉ',
      addressPlaceholder: 'Nhập địa chỉ cửa hàng',
      phone: 'Điện thoại',
      phonePlaceholder: 'Nhập số điện thoại',
      email: 'Email',
      emailPlaceholder: 'Nhập địa chỉ email',
      openTime: 'Giờ mở cửa',
      closeTime: 'Giờ đóng cửa',
      categoryManagement: 'Quản lý danh mục',
      categoryManagementDesc: 'Quản lý danh mục sản phẩm và mặt hàng.',
      categoriesRedirect: 'Quản lý danh mục có sẵn trong trang Kho.',
      goToInventory: 'Đi đến Kho',
      employeeManagementDesc: 'Đăng ký và quản lý thông tin nhân viên.',
      employeesRedirect: 'Quản lý nhân viên có sẵn trong trang Nhân viên.',
      goToEmployees: 'Đi đến Nhân viên',
      paymentMethods: 'Phương thức thanh toán',
      paymentMethodsDesc: 'Chọn và quản lý các phương thức thanh toán có sẵn.',
      availablePayments: 'Phương thức thanh toán có sẵn',
      addPayment: 'Thêm phương thức thanh toán',
      enabled: 'Đã bật',
      disabled: 'Đã tắt',
      backToPos: 'Quay về POS',
      payments: {
        cash: 'Tiền mặt',
        creditCard: 'Thẻ tín dụng',
        debitCard: 'Thẻ ghi nợ',
        momo: 'MoMo',
        zalopay: 'ZaloPay',
        vnpay: 'VNPay',
        banking: 'Ngân hàng trực tuyến',
        shopeepay: 'ShopeePay',
        grabpay: 'GrabPay',
        newPayment: 'Phương thức thanh toán mới'
      }
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
    return result;
  };
  
  return { t, currentLanguage };
};