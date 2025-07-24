import { commonTranslations } from './modules/common';
import { navigationTranslations } from './modules/navigation';
import { reportsTranslations } from './modules/reports';
import { settingsTranslations } from './modules/settings';
import { notFoundTranslations } from './modules/notFound';
import { ordersTranslations } from './modules/orders';
import { customersTranslations } from './modules/customers';
import { employeesTranslations } from './modules/employees';
import { attendanceTranslations } from './modules/attendance';
import { membershipTranslations } from './modules/membership';
import type { LanguageTranslations } from './types';

export const translations: LanguageTranslations = {
  ko: {
    common: commonTranslations.ko,
    nav: navigationTranslations.ko,
    reports: reportsTranslations.ko,
    settings: settingsTranslations.ko,
    notFound: notFoundTranslations.ko,
    orders: ordersTranslations.ko,
    customers: customersTranslations.ko,
    employees: employeesTranslations.ko,
    attendance: attendanceTranslations.ko,
    membership: membershipTranslations.ko,
  },
  en: {
    common: commonTranslations.en,
    nav: navigationTranslations.en,
    reports: reportsTranslations.en,
    settings: settingsTranslations.en,
    notFound: notFoundTranslations.en,
    orders: ordersTranslations.en,
    customers: customersTranslations.en,
    employees: employeesTranslations.en,
    attendance: attendanceTranslations.en,
    membership: membershipTranslations.en,
  },
  vi: {
    common: commonTranslations.vi,
    nav: navigationTranslations.vi,
    reports: reportsTranslations.vi,
    settings: settingsTranslations.vi,
    notFound: notFoundTranslations.vi,
    orders: ordersTranslations.vi,
    customers: customersTranslations.vi,
    employees: employeesTranslations.vi,
    attendance: attendanceTranslations.vi,
    membership: membershipTranslations.vi,
  },
};