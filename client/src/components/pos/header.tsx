import { useState, useEffect } from "react";
import { ScanBarcode, LogOut, Users, Home, Clock, Utensils, BarChart3, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoPath from "@assets/image_1753015722799.png";

export function POSHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location] = useLocation();
  const [posMenuOpen, setPosMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.pos-dropdown')) {
        setPosMenuOpen(false);
      }
    };

    if (posMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [posMenuOpen]);

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
            <img src={logoPath} alt="EDPOS Logo" className="h-12" />
          </div>
          <div className="text-sm opacity-90">레스토랑 본점</div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-sm opacity-90">Cashier</div>
            <div className="font-medium">John Smith</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Time</div>
            <div className="font-medium">{formatTime(currentTime)}</div>
          </div>
          {/* Navigation Menu */}
          <nav className="flex items-center space-x-4">
            <div className="relative pos-dropdown">
              <button 
                className={`flex items-center px-4 py-2 rounded-full transition-all duration-200 ${
                  ["/", "/pos", "/reports", "/employees", "/attendance"].includes(location)
                    ? "bg-white bg-opacity-20" 
                    : "hover:bg-white hover:bg-opacity-10"
                }`}
                onClick={() => setPosMenuOpen(!posMenuOpen)}
              >
                <ScanBarcode className="w-4 h-4 mr-2" />
                POS 시스템
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
                      기본 POS
                    </button>
                  </Link>
                  
                  <Link href="/">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <Utensils className="w-4 h-4 mr-3" />
                      테이블 관리
                    </button>
                  </Link>
                  
                  <Link href="/reports">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/reports" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <BarChart3 className="w-4 h-4 mr-3" />
                      매출 분석
                    </button>
                  </Link>
                  
                  <div className="border-t border-gray-200 my-2"></div>
                  
                  <Link href="/employees">
                    <button 
                      className={`w-full flex items-center px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                        location === "/employees" ? "bg-green-50 text-green-600" : "text-gray-700"
                      }`}
                      onClick={() => setPosMenuOpen(false)}
                    >
                      <Users className="w-4 h-4 mr-3" />
                      직원 관리
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
                      근태 관리
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
          
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-full transition-all duration-200 flex items-center">
            <LogOut className="mr-2" size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
