import { create } from 'zustand';

export type Language = 'ko' | 'en' | 'vi';

interface LanguageStore {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  currentLanguage: (typeof window !== 'undefined' ? localStorage.getItem('language') as Language : null) || 'ko',
  setLanguage: (language: Language) => {
    console.log('🌐 언어 변경 실행:', language);
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
      addProductsToStart: 'Add products to get started'
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
      addProductsToStart: 'Thêm sản phẩm để bắt đầu'
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
    // 번역 결과 확인을 위한 디버그 로그 (일부 키만)
    if (key.includes('nav.') || key.includes('common.logout')) {
      console.log(`번역 [${currentLanguage}]: ${key} => ${result}`);
    }
    return result;
  };
  
  return { t, currentLanguage };
};