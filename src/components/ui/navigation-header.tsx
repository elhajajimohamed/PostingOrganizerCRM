'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  showBackToDashboard?: boolean;
  children?: React.ReactNode;
}

export function NavigationHeader({
  title,
  subtitle,
  showBackToDashboard = true,
  children
}: NavigationHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-20 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Enhanced Back to Dashboard Button */}
            {showBackToDashboard && (
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-blue-50/30 border-slate-200/60 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300/60 hover:text-blue-700 hover:shadow-lg transition-all duration-200 font-medium rounded-xl"
              >
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
                  </svg>
                </div>
                <span className="hidden sm:inline text-slate-700">Dashboard</span>
              </Button>
            )}

            {/* Enhanced Page Title */}
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">{title}</h1>
              {subtitle && (
                <p className="text-slate-600 mt-1 font-medium">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Enhanced Right side content */}
          <div className="flex items-center gap-4">
            {/* Enhanced User info */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">{user?.displayName || 'User'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                    {user?.role || 'user'}
                  </Badge>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>

            {/* Custom children (like action buttons) */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
