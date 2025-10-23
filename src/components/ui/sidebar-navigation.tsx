'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
   LayoutDashboard,
   Building2,
   Map,
   Shield,
   Lightbulb,
   Phone,
   PhoneCall,
   DollarSign,
   CheckSquare,
   Calculator,
   Copy,
   Users,
   Calendar,
   Menu,
   X
 } from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SidebarNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
     id: 'call-centers',
     label: 'Call Centers',
     icon: <Building2 className="w-5 h-5" />
   },
   {
     id: 'daily-calls',
     label: 'Daily Calls',
     icon: <PhoneCall className="w-5 h-5" />
   },
  {
    id: 'geographic',
    label: 'Geographic',
    icon: <Map className="w-5 h-5" />
  },
  {
    id: 'integrity',
    label: 'Data Integrity',
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: 'suggestions',
    label: 'Lead Generation',
    icon: <Lightbulb className="w-5 h-5" />
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: <DollarSign className="w-5 h-5" />
  },
  {
    id: 'tasks',
    label: "Today's Tasks",
    icon: <CheckSquare className="w-5 h-5" />
  },
  {
    id: 'simulator',
    label: 'Price Simulator',
    icon: <Calculator className="w-5 h-5" />
  },
  {
    id: 'duplicates',
    label: 'Duplicates',
    icon: <Copy className="w-5 h-5" />
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: <Calendar className="w-5 h-5" />
  },
  {
    id: 'posting-crm',
    label: 'Facebook Groups CRM',
    icon: <Users className="w-5 h-5" />
  }
];

export function SidebarNavigation({ activeTab, onTabChange, className }: SidebarNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "flex h-full bg-white border-r border-gray-200 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 w-full">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-gray-900">Call Center CRM</h2>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 h-8 w-8"
        >
          {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10 px-3 transition-all duration-200",
                isActive && "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm",
                isCollapsed && "px-0 justify-center"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <div className={cn(
                "transition-colors duration-200",
                isActive ? "text-blue-600" : "text-gray-500"
              )}>
                {item.icon}
              </div>

              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isActive ? "text-blue-700" : "text-gray-700"
                  )}>
                    {item.label}
                  </span>

                  {item.badge && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              )}

              {isActive && !isCollapsed && (
                <div className="w-1 h-6 bg-blue-600 rounded-full ml-2" />
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            © 2024 Call Center CRM
          </div>
        </div>
      )}
    </div>
  );
}