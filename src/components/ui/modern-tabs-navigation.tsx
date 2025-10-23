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
   ChevronLeft,
   ChevronRight
 } from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface ModernTabsNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const tabItems: TabItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />
  },
  {
     id: 'call-centers',
     label: 'Call Centers',
     icon: <Building2 className="w-4 h-4" />
   },
   {
     id: 'daily-calls',
     label: 'Daily Calls',
     icon: <PhoneCall className="w-4 h-4" />
   },
  {
    id: 'integrity',
    label: 'Data Integrity',
    icon: <Shield className="w-4 h-4" />
  },
  {
    id: 'suggestions',
    label: 'Lead Generation',
    icon: <Lightbulb className="w-4 h-4" />
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: <DollarSign className="w-4 h-4" />
  },
  {
    id: 'tasks',
    label: "Today's Tasks",
    icon: <CheckSquare className="w-4 h-4" />
  },
  {
    id: 'simulator',
    label: 'Price Simulator',
    icon: <Calculator className="w-4 h-4" />
  },
  {
    id: 'duplicates',
    label: 'Duplicates',
    icon: <Copy className="w-4 h-4" />
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: <Calendar className="w-4 h-4" />
  },
  {
    id: 'posting-crm',
    label: 'Facebook Groups CRM',
    icon: <Users className="w-4 h-4" />
  }
];

export function ModernTabsNavigation({ activeTab, onTabChange, className }: ModernTabsNavigationProps) {
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = (element: HTMLElement) => {
    const canScrollL = element.scrollLeft > 0;
    const canScrollR = element.scrollLeft < element.scrollWidth - element.clientWidth - 10;
    setCanScrollLeft(canScrollL);
    setCanScrollRight(canScrollR);
  };

  const scroll = (direction: 'left' | 'right') => {
    const element = document.getElementById('tabs-scroll-container');
    if (element) {
      const scrollAmount = 200;
      element.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Scroll Buttons */}
      {showScrollButtons && (canScrollLeft || canScrollRight) && (
        <>
          {canScrollLeft && (
            <Button
              variant="outline"
              size="sm"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md border-gray-200 hover:bg-gray-50"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {canScrollRight && (
            <Button
              variant="outline"
              size="sm"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md border-gray-200 hover:bg-gray-50"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </>
      )}

      {/* Tabs Container */}
      <div
        className="relative w-full"
        onMouseEnter={() => setShowScrollButtons(true)}
        onMouseLeave={() => setShowScrollButtons(false)}
      >
        <div
          id="tabs-scroll-container"
          className="flex items-center gap-1 pb-2 overflow-x-auto scrollbar-hide"
          onScroll={(e) => checkScroll(e.currentTarget)}
        >
          {tabItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "flex items-center gap-2 h-10 px-4 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:from-blue-700 hover:to-purple-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <div className={cn(
                  "transition-colors duration-200",
                  isActive ? "text-white" : "text-gray-500"
                )}>
                  {item.icon}
                </div>

                <span className="font-medium text-sm">
                  {item.label}
                </span>

                {item.badge && (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className={cn(
                      "ml-1 text-xs",
                      isActive ? "bg-white/20 text-white border-white/30" : ""
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Active tab indicator line */}
      <div className="h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mt-2" />
    </div>
  );
}