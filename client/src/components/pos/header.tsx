import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ScanBarcode, Users, Home, Clock, Utensils, BarChart3, ChevronDown, Package, Settings as SettingsIcon, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logoPath from "@assets/EDPOS_1753091767028.png";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { type StoreSettings, type Employee, type AttendanceRecord } from "@shared/schema";
import {
  PieChart
} from "lucide-react";
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Calendar,
  TrendingUp,
  DollarSign,
  FileText as ReportsIcon,
  ShoppingCart as CartIcon,
  FileText,
  ShoppingCart,
  Package2,
  UserCheck,
  Truck,
} from "lucide-react";

export function POSHeader() {
  const { t } = useTranslation();
  const [posMenuOpen, setPosMenuOpen] = useState(false);
  const [reportsSubmenuOpen, setReportsSubmenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location] = useLocation();
  const [submenuTimer, setSubmenuTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch store settings
  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ['/api/store-settings'],
  });

  // Fetch employees
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  // Fetch today's attendance records  
  const todayDate = new Date().toISOString().split('T')[0];
  const { data: todayAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', todayDate],
    queryFn: async () => {
      const response = await fetch(`/api/attendance?date=${todayDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      return response.json();
    },
  });

  // Find current working cashier
  const getCurrentCashier = () => {
    if (!employees || !todayAttendance) return null;

    // Get cashiers who are currently clocked in (have clock in but no clock out)
    const workingCashiers = todayAttendance
      .filter(record => record.clockIn && !record.clockOut)
      .map(record => {
        const employee = employees.find(emp => emp.id === record.employeeId);
        return employee && employee.role === 'cashier' ? employee : null;
      })
      .filter(Boolean);

    return workingCashiers.length > 0 ? workingCashiers[0] : null;
  };

  const currentCashier = getCurrentCashier();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle submenu timing
  const handleReportsMouseEnter = () => {
    if (submenuTimer) {
      clearTimeout(submenuTimer);
      setSubmenuTimer(null);
    }
    setReportsSubmenuOpen(true);
  };

  const handleReportsMouseLeave = () => {
    // Don't set timer here, let the container handle it
  };

  const handleSubmenuMouseEnter = () => {
    if (submenuTimer) {
      clearTimeout(submenuTimer);
      setSubmenuTimer(null);
    }
  };

  const handleSubmenuMouseLeave = () => {
    // Don't set timer here, let the container handle it
  };

  const handleReportsContainerMouseLeave = () => {
    const timer = setTimeout(() => {
      setReportsSubmenuOpen(false);
    }, 300);
    setSubmenuTimer(timer);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.pos-dropdown')) {
        setPosMenuOpen(false);
        setReportsSubmenuOpen(false);
      }
    };

    if (posMenuOpen || reportsSubmenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [posMenuOpen, reportsSubmenuOpen]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (submenuTimer) {
        clearTimeout(submenuTimer);
      }
    };
  }, [submenuTimer]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <header className="bg-green-500 text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <img 
              src={logoPath} 
              alt="EDPOS Logo" 
              className="h-12 cursor-pointer" 
              onClick={() => window.location.href = '/pos'}
            />
          </div>
          <div className="opacity-90 font-semibold text-[20px]">{storeSettings?.storeName || t('common.restaurant')}</div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-sm opacity-90">{t('pos.cashierName')}</div>
            <div className="font-medium">
              {currentCashier ? currentCashier.name : t('pos.beforeWork')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">{t('common.time')}</div>
            <div className="font-medium">{formatTime(currentTime)}</div>
          </div>
          {/* Navigation Menu */}
          <nav className="flex items-center space-x-4">
            <div className="relative pos-dropdown">
              <button 
                className={`flex items-center px-4 py-2 rounded-full transition-all duration-200 ${
                  ["/", "/pos", "/tables", "/inventory", "/reports", "/employees", "/attendance", "/suppliers", "/settings"].includes(location)
                    ? "bg-white bg-opacity-20" 
                    : "hover:bg-white hover:bg-opacity-10"
                }`}
                onClick={() => setPosMenuOpen(!posMenuOpen)}
              >
                <ScanBarcode className="w-4 h-4 mr-2" />
                {t('nav.pos')}
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${posMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {posMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-48 z-50">
                  <Link href="/pos">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/pos" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <Home className="w-4 h-4 mr-3" />
                      {t('nav.pos')}
                    </button>
                  </Link>

                  <div className="border-t border-gray-200 my-2"></div>

                  <Link href="/tables">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/tables" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <Utensils className="w-4 h-4 mr-3" />
                      {t('nav.tables')}
                    </button>
                  </Link>

                  <Link href="/inventory">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/inventory" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <Package className="w-4 h-4 mr-3" />
                      {t('nav.inventory')}
                    </button>
                  </Link>
                    <div 
                      className="relative"
                      onMouseLeave={handleReportsContainerMouseLeave}
                    >
                      <button
                        className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                          location === "/reports" ? "bg-green-50 text-green-600" : "text-gray-700"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setReportsSubmenuOpen(!reportsSubmenuOpen);
                        }}
                        onMouseEnter={handleReportsMouseEnter}
                      >
                        <BarChart3 className="w-4 h-4 mr-3" />
                        {t('nav.reports')}
                        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${reportsSubmenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {reportsSubmenuOpen && (
                        <div 
                          className="absolute top-0 right-full mr-0.5 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-48 z-50 max-w-xs sm:max-w-none"
                        >
                          <Link href="/reports?tab=overview">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=overview" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t('reports.dashboard')}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=sales">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=sales" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t('reports.salesAnalysis')}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=saleschart">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=saleschart" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <PieChart className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t('reports.salesReport')}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=menu">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=menu" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <PieChart className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t('reports.menuAnalysis')}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=table">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=table" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <Utensils className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t('reports.tableAnalysis')}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=endofday">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=endofday" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t('reports.endOfDayReport')}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=order">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=order" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t("reports.orderReport")}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=inventory">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=inventory" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t("reports.inventoryReport")}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=customer">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=customer" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t("reports.customerReport")}</span>
                            </button>
                          </Link>
                          <Link href="/reports?tab=supplier">
                            <button
                              className={`w-full flex items-center px-3 sm:px-4 py-2 text-left hover:bg-green-50 hover:text-green-600 transition-colors text-sm sm:text-base ${
                                location === "/reports" && window.location.search === "?tab=supplier" ? "bg-green-50 text-green-600" : "text-gray-700 hover:text-green-600"
                              }`}
                              onClick={() => {
                                setReportsSubmenuOpen(false);
                                setPosMenuOpen(false);
                              }}
                            >
                              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="truncate">{t("reports.supplierReport")}</span>
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>

                  <div className="border-t border-gray-200 my-2"></div>

                  <Link href="/employees">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/employees" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <Users className="w-4 h-4 mr-3" />
                      {t('nav.employees')}
                    </button>
                  </Link>

                  <Link href="/attendance">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/attendance" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <Clock className="w-4 h-4 mr-3" />
                      {t('nav.attendance')}
                    </button>
                  </Link>

                  <Link href="/suppliers">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/suppliers" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <Building2 className="w-4 h-4 mr-3" />
                      {t('nav.suppliers')}
                    </button>
                  </Link>

                  <div className="border-t border-gray-200 my-2"></div>

                  <Link href="/settings">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/settings" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <SettingsIcon className="w-4 h-4 mr-3" />
                      {t('settings.title')}
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}