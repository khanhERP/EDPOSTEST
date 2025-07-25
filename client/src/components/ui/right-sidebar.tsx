import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Utensils, 
  Users, 
  Clock, 
  BarChart3, 
  Settings, 
  ChevronRight,
  ChevronLeft,
  Menu,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: string;
}

// Menu items will be translated using the hook inside the component

export function RightSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [location] = useLocation();
  const { t } = useTranslation();

  const menuItems: MenuItem[] = [
    {
      icon: Home,
      label: t('nav.pos'),
      href: "/pos",
    },
    {
      icon: Utensils,
      label: t('nav.tables'),
      href: "/tables",
    },
    {
      icon: Package,
      label: t('nav.inventory'),
      href: "/inventory",
    },
    {
      icon: BarChart3,
      label: t('nav.reports'),
      href: "/reports",
    },
    {
      icon: Users,
      label: t('nav.employees'),
      href: "/employees",
    },
    {
      icon: Clock,
      label: t('nav.attendance'),
      href: "/attendance",
    },
    {
      icon: Settings,
      label: t('settings.title'),
      href: "/settings",
    },
  ];

  // Update CSS custom property for responsive margin
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width', 
      isExpanded ? '256px' : '64px'
    );
  }, [isExpanded]);

  

  return (
    <div className={cn(
      "fixed left-0 top-16 bottom-0 bg-white border-r border-green-200 shadow-lg transition-all duration-300 z-40",
      isExpanded ? "w-64" : "w-16"
    )}>
      {/* Toggle Button */}
      <div className="p-4 border-b border-green-200 bg-green-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isExpanded) {
              setIsNavCollapsed(true);
              setIsExpanded(false);
            } else {
              setIsExpanded(true);
              // Keep nav collapsed when reopening
            }
          }}
          className="w-full flex items-center justify-center"
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>{t('common.collapse')}</span>
            </>
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <nav className="py-4 group">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          const showText = isExpanded && !isNavCollapsed;
          
          return (
            <div 
              key={item.href}
              className={cn(
                "relative",
                isNavCollapsed && "group-hover:w-64"
              )}
            >
              <Link href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-[calc(100%-16px)] justify-start mb-1 mx-2 hover:shadow-sm transition-all duration-200",
                    showText ? "px-3" : "px-2",
                    isActive && "bg-green-50 text-green-600 border-l-2 border-green-500",
                    isNavCollapsed && "group-hover:w-[calc(256px-16px)]"
                  )}
                >
                  <Icon className={cn("w-5 h-5", showText && "mr-3")} />
                  {showText && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {isNavCollapsed && (
                    <span className="opacity-0 group-hover:opacity-100 ml-3 font-medium transition-opacity duration-200 absolute left-8 whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                  {showText && item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {item.badge}
                    </span>
                  )}
                </Button>
              </Link>
              {/* Add separator after first item (기본 POS) and before employee section */}
              {(index === 0 || index === 3) && showText && (
                <div className="border-t border-gray-200 my-3 mx-4"></div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      {isExpanded && !isNavCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-green-200 bg-green-50">
          <div className="text-sm text-gray-500 text-center">
            <div className="font-medium">EDPOS System</div>
            <div className="text-xs opacity-75">v1.0.0</div>
          </div>
        </div>
      )}
    </div>
  );
}