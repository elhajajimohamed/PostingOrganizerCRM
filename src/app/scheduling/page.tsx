'use client';

import { useAuth } from '@/lib/auth-context';
import { SchedulingDashboard } from '@/components/scheduling/scheduling-dashboard';
import { NavigationHeader } from '@/components/ui/navigation-header';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SchedulingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only redirect if we're not loading and user is definitely not authenticated
    if (!loading && !user && isClient) {
      router.push('/');
    }
  }, [user, loading, router, isClient]);

  // Show loading while auth is being determined
  if (loading || !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user after loading, don't render anything (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <NavigationHeader
        title="Auto Scheduling"
        subtitle="Generate and manage automated posting schedules"
      />
      <div className="max-w-7xl mx-auto p-8">
        <SchedulingDashboard userId={user.uid} />
      </div>
    </div>
  );
}