import { commonTranslations } from './modules/common';
import { navigationTranslations } from './modules/navigation';
import { attendanceTranslations } from './modules/attendance';
import { customersTranslations } from './modules/customers';
import { employeesTranslations } from './modules/employees';
import { inventoryTranslations } from './modules/inventory';
import { notFoundTranslations } from './modules/notFound';
import { ordersTranslations } from './modules/orders';
import { posTranslations } from './modules/pos';
import { reportsTranslations } from './modules/reports';
import { settingsTranslations } from './modules/settings';
import { tablesTranslations } from './modules/tables';
import { einvoiceTranslations } from './modules/einvoice';
import { suppliersTranslations } from './modules/suppliers';
import type { LanguageTranslations } from './types';

export const translations: LanguageTranslations = {
  ko: {
    common: commonTranslations.ko,
    nav: navigationTranslations.ko,
    attendance: attendanceTranslations.ko,
    customers: customersTranslations.ko,
    employees: employeesTranslations.ko,
    inventory: inventoryTranslations.ko,
    notFound: notFoundTranslations.ko,
    orders: ordersTranslations.ko,
    pos: posTranslations.ko,
    reports: reportsTranslations.ko,
    settings: settingsTranslations.ko,
    tables: tablesTranslations.ko,
    einvoice: einvoiceTranslations.ko,
    suppliers: suppliersTranslations.ko,
  },
  en: {
    common: commonTranslations.en,
    nav: navigationTranslations.en,
    attendance: attendanceTranslations.en,
    customers: customersTranslations.en,
    employees: employeesTranslations.en,
    inventory: inventoryTranslations.en,
    notFound: notFoundTranslations.en,
    orders: ordersTranslations.en,
    pos: posTranslations.en,
    reports: reportsTranslations.en,
    settings: settingsTranslations.en,
    tables: tablesTranslations.en,
    einvoice: einvoiceTranslations.en,
    suppliers: suppliersTranslations.en,
  },
  vi: {
    common: {
    // Common
      common: {
        loading: "Đang tải...",
        save: "Lưu",
        cancel: "Hủy",
        delete: "Xóa",
        edit: "Sửa",
        add: "Thêm",
        search: "Tìm kiếm",
        filter: "Lọc",
        back: "Quay lại",
        next: "Tiếp theo",
        previous: "Trước",
        confirm: "Xác nhận",
        success: "Thành công",
        error: "Lỗi",
        warning: "Cảnh báo",
        info: "Thông tin",
        yes: "Có",
        no: "Không",
        items: "mục",
        total: "Tổng cộng",
        subtotal: "Tạm tính",
        tax: "Thuế",
        discount: "Giảm giá",
        date: "Ngày",
        time: "Thời gian",
        status: "Trạng thái",
        active: "Hoạt động",
        inactive: "Không hoạt động",
        name: "Tên",
        description: "Mô tả",
        price: "Giá",
        quantity: "Số lượng",
        actions: "Hành động",
        collapse: "Thu gọn",
        expand: "Mở rộng",
        restaurant: "Nhà hàng",
        noRecords: "Không có bản ghi",
        selectOtherDate: "Vui lòng chọn ngày khác",
        category: "Danh mục",
        // Toast messages
        successTitle: "Thành công",
        errorTitle: "Lỗi",
        warningTitle: "Cảnh báo",
        infoTitle: "Thông tin",
        operationSuccess: "Thao tác thành công",
        operationFailed: "Thao tác thất bại",
        dataLoadError: "Lỗi tải dữ liệu",
        networkError: "Lỗi kết nối mạng",
        validationError: "Lỗi xác thực dữ liệu",
        permissionError: "Không có quyền thực hiện",
        unexpectedError: "Đã xảy ra lỗi không mong muốn",
      },
    },
    nav: navigationTranslations.vi,
    attendance: attendanceTranslations.vi,
    customers: customersTranslations.vi,
    employees: employeesTranslations.vi,
    inventory: inventoryTranslations.vi,
    notFound: notFoundTranslations.vi,
    orders: ordersTranslations.vi,
    pos: posTranslations.vi,
    reports: reportsTranslations.vi,
    settings: {
        ...settingsTranslations.vi,
        storeUpdated: "Thông tin cửa hàng đã được cập nhật",
        updateError: "Có lỗi xảy ra trong quá trình cập nhật",
        updateSuccess: "Cập nhật thành công",
        updateFailed: "Cập nhật thất bại",
        saveSuccess: "Lưu thành công",
        saveFailed: "Lưu thất bại",
    },
    tables: tablesTranslations.vi,
    einvoice: einvoiceTranslations.vi,
    suppliers: suppliersTranslations.vi,
  },
};