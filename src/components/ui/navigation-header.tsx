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
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Back to Dashboard Button */}
            {showBackToDashboard && (
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 hover:text-blue-700 hover:shadow-md transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
                </svg>
                <span className="hidden sm:inline">🏠 Dashboard</span>
                <span className="sm:hidden">🏠</span>
              </Button>
            )}

            {/* Page Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side content */}
          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                    {user?.role}
                  </Badge>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                {user?.displayName?.charAt(0).toUpperCase() || '?'}
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