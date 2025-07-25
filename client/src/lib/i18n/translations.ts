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
  },
  vi: {
    common: commonTranslations.vi,
    nav: navigationTranslations.vi,
    attendance: attendanceTranslations.vi,
    customers: customersTranslations.vi,
    employees: employeesTranslations.vi,
    inventory: inventoryTranslations.vi,
    notFound: notFoundTranslations.vi,
    orders: ordersTranslations.vi,
    pos: posTranslations.vi,
    reports: reportsTranslations.vi,
    settings: settingsTranslations.vi,
    tables: tablesTranslations.vi,
  },
};