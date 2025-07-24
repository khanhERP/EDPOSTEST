
import type { MembershipTranslations } from '../types';

export const membershipTranslations: { [key: string]: MembershipTranslations } = {
  ko: {
    title: '멤버십 관리',
    description: '고객 멤버십 등급을 관리하고 혜택을 제공하세요',
    tierGuide: '멤버십 등급 안내',
    customerManagement: '고객 멤버십 관리',
    autoUpgrade: '자동 등급 조정',
    filterByTier: '등급별 필터',
    all: '전체',
    customerId: '고객ID',
    customerName: '고객명',
    currentTier: '현재 등급',
    totalSpent: '총 구매금액',
    visitCount: '방문횟수',
    points: '포인트',
    actions: '액션',
    upgradeAvailable: '승급 가능',
    close: '닫기',
    searchPlaceholder: '고객명 또는 고객ID로 검색...',
    loading: '로딩 중...',
    tiers: {
      silver: '실버',
      gold: '골드',
      vip: 'VIP'
    },
    tierDetails: {
      silver: {
        name: '실버',
        description: '신규 고객을 위한 기본 등급',
        minSpent: '최소 구매금액: ₩0',
        benefits: ['기본 포인트 적립', '생일 할인 5%']
      },
      gold: {
        name: '골드',
        description: '단골 고객을 위한 프리미엄 등급',
        minSpent: '최소 구매금액: ₩300,000',
        benefits: ['포인트 1.5배 적립', '생일 할인 10%', '월 1회 무료 음료']
      },
      vip: {
        name: 'VIP',
        description: 'VIP 고객을 위한 최고 등급',
        minSpent: '최소 구매금액: ₩1,000,000',
        benefits: ['포인트 2배 적립', '생일 할인 20%', '월 2회 무료 음료', '전용 라운지 이용']
      }
    },
    benefitsLabel: '혜택:'
  },
  en: {
    title: 'Membership Management',
    description: 'Manage customer membership tiers and provide benefits',
    tierGuide: 'Membership Tier Guide',
    customerManagement: 'Customer Membership Management',
    autoUpgrade: 'Auto Tier Adjustment',
    filterByTier: 'Filter by Tier',
    all: 'All',
    customerId: 'Customer ID',
    customerName: 'Customer Name',
    currentTier: 'Current Tier',
    totalSpent: 'Total Spent',
    visitCount: 'Visit Count',
    points: 'Points',
    actions: 'Actions',
    upgradeAvailable: 'Upgrade Available',
    close: 'Close',
    searchPlaceholder: 'Search by customer name or ID...',
    loading: 'Loading...',
    tiers: {
      silver: 'Silver',
      gold: 'Gold',
      vip: 'VIP'
    },
    tierDetails: {
      silver: {
        name: 'Silver',
        description: 'Basic tier for new customers',
        minSpent: 'Minimum spent: ₩0',
        benefits: ['Basic point earning', '5% birthday discount']
      },
      gold: {
        name: 'Gold',
        description: 'Premium tier for regular customers',
        minSpent: 'Minimum spent: ₩300,000',
        benefits: ['1.5x point earning', '10% birthday discount', 'Monthly free drink']
      },
      vip: {
        name: 'VIP',
        description: 'Ultimate tier for VIP customers',
        minSpent: 'Minimum spent: ₩1,000,000',
        benefits: ['2x point earning', '20% birthday discount', '2 monthly free drinks', 'Exclusive lounge access']
      }
    },
    benefitsLabel: 'Benefits:'
  },
  vi: {
    title: 'Quản lý thành viên',
    description: 'Quản lý cấp độ thành viên khách hàng và cung cấp quyền lợi',
    tierGuide: 'Hướng dẫn cấp độ thành viên',
    customerManagement: 'Quản lý thành viên khách hàng',
    autoUpgrade: 'Điều chỉnh cấp độ tự động',
    filterByTier: 'Lọc theo cấp độ',
    all: 'Tất cả',
    customerId: 'ID khách hàng',
    customerName: 'Tên khách hàng',
    currentTier: 'Cấp độ hiện tại',
    totalSpent: 'Tổng chi tiêu',
    visitCount: 'Số lần ghé thăm',
    points: 'Điểm',
    actions: 'Hành động',
    upgradeAvailable: 'Có thể nâng cấp',
    close: 'Đóng',
    searchPlaceholder: 'Tìm theo tên hoặc ID khách hàng...',
    loading: 'Đang tải...',
    tiers: {
      silver: 'Bạc',
      gold: 'Vàng',
      vip: 'VIP'
    },
    tierDetails: {
      silver: {
        name: 'Bạc',
        description: 'Cấp độ cơ bản dành cho khách hàng mới',
        minSpent: 'Chi tiêu tối thiểu: ₩0',
        benefits: ['Tích điểm cơ bản', 'Giảm giá sinh nhật 5%']
      },
      gold: {
        name: 'Vàng',
        description: 'Cấp độ cao cấp dành cho khách hàng thân thiết',
        minSpent: 'Chi tiêu tối thiểu: ₩300,000',
        benefits: ['Tích điểm x1.5', 'Giảm giá sinh nhật 10%', 'Đồ uống miễn phí hàng tháng']
      },
      vip: {
        name: 'VIP',
        description: 'Cấp độ cao nhất dành cho khách hàng VIP',
        minSpent: 'Chi tiêu tối thiểu: ₩1,000,000',
        benefits: ['Tích điểm x2', 'Giảm giá sinh nhật 20%', '2 đồ uống miễn phí hàng tháng', 'Truy cập phòng chờ độc quyền']
      }
    },
    benefitsLabel: 'Quyền lợi:'
  }
};
