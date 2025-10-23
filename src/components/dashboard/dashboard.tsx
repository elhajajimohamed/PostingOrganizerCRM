'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealtimeAccounts, useRealtimeGroups, useRealtimeTemplates, useRealtimeTasks, useRealtimePostHistory } from '@/lib/hooks/use-realtime-data';
import { MediaService } from '@/lib/services/media-service';
import { PostHistoryService } from '@/lib/services/post-history-service';
import { LiveScheduledTasks } from '@/components/scheduling/live-scheduled-tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mediaCount, setMediaCount] = useState(0);
  const [mediaLoading, setMediaLoading] = useState(true);
  const { data: accounts } = useRealtimeAccounts();
  const { data: groups } = useRealtimeGroups();
  const { data: templates } = useRealtimeTemplates();
  const { data: tasks } = useRealtimeTasks(user?.uid);
  const { data: postHistory } = useRealtimePostHistory(50);

  // Load media count
  useEffect(() => {
    const loadMediaCount = async () => {
      if (!user?.uid) return;

      try {
        setMediaLoading(true);
        const media = await MediaService.getMediaByUser(user.uid);
        setMediaCount(media.length);
      } catch (error) {
        console.error('Failed to load media count:', error);
      } finally {
        setMediaLoading(false);
      }
    };

    loadMediaCount();
  }, [user?.uid]);

  // Calculate statistics
  const accountsCount = accounts?.length || 0;
  const groupsCount = groups?.length || 0;
  const templatesCount = templates?.length || 0;
  const pendingTasksCount = tasks?.filter(task => task.status === 'pending').length || 0;

  // Get real post history count for this week
  const [thisWeekPostsCount, setThisWeekPostsCount] = useState(0);

  useEffect(() => {
    const loadPostHistoryCount = async () => {
      try {
        const stats = await PostHistoryService.getPostHistoryStats();
        setThisWeekPostsCount(stats.thisWeek);
      } catch (error) {
        console.error('Error loading post history stats:', error);
        // Fallback to real-time data if service fails
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const count = postHistory?.filter(post =>
          post.timestamp && post.timestamp >= weekAgo
        ).length || 0;
        setThisWeekPostsCount(count);
      }
    };

    loadPostHistoryCount();
  }, [postHistory]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Posting Organizer CRM
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-lg">Welcome back, {user?.displayName}!</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                {user?.role}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('/settings')}
                className="text-xs sm:text-sm"
              >
                <span className="mr-2">⚙️</span>
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs sm:text-sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Accounts Card */}
          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200"
            onClick={() => navigateTo('/accounts')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('/accounts')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-blue-800 group-hover:text-blue-900">
                <span className="text-2xl mr-3" role="img" aria-label="Mobile phone">📱</span>
                Facebook Accounts
              </CardTitle>
              <CardDescription className="text-blue-600">Manage your Facebook accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 tabular-nums">{accountsCount}</div>
              <p className="text-sm text-blue-700">Active accounts</p>
            </CardContent>
          </Card>

          {/* Groups Card */}
          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200"
            onClick={() => navigateTo('/groups')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('/groups')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-green-800 group-hover:text-green-900">
                <span className="text-2xl mr-3" role="img" aria-label="People group">👥</span>
                Facebook Groups
              </CardTitle>
              <CardDescription className="text-green-600">Organize your target groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 tabular-nums">{groupsCount}</div>
              <p className="text-sm text-green-700">Total groups</p>
            </CardContent>
          </Card>

          {/* Templates Card */}
          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md bg-gradient-to-br from-orange-50 to-amber-100 hover:from-orange-100 hover:to-amber-200"
            onClick={() => navigateTo('/templates')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('/templates')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-orange-800 group-hover:text-orange-900">
                <span className="text-2xl mr-3" role="img" aria-label="Document">📝</span>
                Templates
              </CardTitle>
              <CardDescription className="text-orange-600">Reusable posting templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900 tabular-nums">{templatesCount}</div>
              <p className="text-sm text-orange-700">Available templates</p>
            </CardContent>
          </Card>

          {/* Tasks Card */}
          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md bg-gradient-to-br from-slate-50 to-gray-100 hover:from-slate-100 hover:to-gray-200"
            onClick={() => navigateTo('/tasks')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('/tasks')}
          >
            <CardHeader>
              <CardTitle className="flex items-center text-slate-800 group-hover:text-slate-900">
                <span className="text-2xl mr-3" role="img" aria-label="Clipboard">📋</span>
                Today's Tasks
              </CardTitle>
              <CardDescription>Scheduled posting tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{pendingTasksCount}</div>
              <p className="text-sm text-slate-700">Pending tasks</p>
            </CardContent>
          </Card>

          {/* Media Card */}
          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-100 hover:from-purple-100 hover:to-pink-200"
            onClick={() => navigateTo('/media')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('/media')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-purple-800 group-hover:text-purple-900">
                <span className="text-2xl mr-3" role="img" aria-label="Image">🖼️</span>
                Media Library
              </CardTitle>
              <CardDescription className="text-purple-600">Images and videos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 tabular-nums">
                {mediaLoading ? (
                  <Skeleton className="h-8 w-16 bg-purple-200" />
                ) : (
                  mediaCount
                )}
              </div>
              <p className="text-sm text-purple-700">Total media files</p>
              {mediaCount > 0 && (
                <div className="mt-2 text-xs text-purple-600 flex items-center">
                  <span className="mr-1">✅</span>
                  Ready to use
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post History Card */}
          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md bg-gradient-to-br from-indigo-50 to-blue-100 hover:from-indigo-100 hover:to-blue-200"
            onClick={() => navigateTo('/post-history')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('/post-history')}
          >
            <CardHeader>
              <CardTitle className="flex items-center text-indigo-800 group-hover:text-indigo-900">
                <span className="text-2xl mr-3" role="img" aria-label="History">📈</span>
                Post History
              </CardTitle>
              <CardDescription>Recent posting activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-900 tabular-nums">{thisWeekPostsCount}</div>
              <p className="text-sm text-indigo-700">Posts this week</p>
            </CardContent>
          </Card>

          {/* Call Center CRM Card */}
          <Card
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md bg-gradient-to-br from-red-50 to-pink-100 hover:from-red-100 hover:to-pink-200"
            onClick={() => navigateTo('/external-crm')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('/external-crm')}
          >
            <CardHeader>
              <CardTitle className="flex items-center text-red-800 group-hover:text-red-900">
                <span className="text-2xl mr-3" role="img" aria-label="Phone">📞</span>
                Call Center CRM
              </CardTitle>
              <CardDescription className="text-red-600">Manage call center operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900 tabular-nums">CRM</div>
              <p className="text-sm text-red-700">Call center management</p>
            </CardContent>
          </Card>
        </div>

        {/* Live Scheduled Tasks Section */}
        <div className="mt-6 sm:mt-8">
          <LiveScheduledTasks
            userId={user?.uid}
            showHeader={true}
            maxTasks={20}
          />
        </div>

        {/* Automatic Scheduling Quick Access */}
        <Card className="mt-6 border-0 shadow-md bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-slate-800">
              <span className="text-xl mr-2" role="img" aria-label="Robot">🤖</span>
              Automatic Scheduling
            </CardTitle>
            <CardDescription className="text-slate-600">
              Generate daily posting tasks with smart rotation between accounts, groups, and content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="font-bold text-blue-600 text-lg">{accountsCount}</div>
                <div className="text-blue-700 text-sm">Accounts</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="font-bold text-green-600 text-lg">{groupsCount}</div>
                <div className="text-green-700 text-sm">Groups</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="font-bold text-purple-600 text-lg">{templatesCount}</div>
                <div className="text-purple-700 text-sm">Templates</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="font-bold text-orange-600 text-lg">{mediaCount}</div>
                <div className="text-orange-700 text-sm">Media</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="font-bold text-red-600 text-lg">CRM</div>
                <div className="text-red-700 text-sm">Call Centers</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                onClick={() => navigateTo('/scheduling')}
              >
                <span className="mr-2">⚡</span>
                Open Scheduler
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-slate-300 hover:bg-slate-50"
                onClick={() => navigateTo('/scheduling')}
              >
                <span className="mr-2">⚙️</span>
                Configure
              </Button>
            </div>

            {/* Quick Generate Button (only show if we have minimum data) */}
            {accountsCount > 0 && groupsCount > 0 && templatesCount > 0 && (
              <Button
                variant="secondary"
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const result = await fetch('/api/generate-test-schedule', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user?.uid })
                    });
                    const data = await result.json();

                    if (data.success) {
                      // Show success message instead of alert
                      setError(null);
                      // Refresh the page data
                      window.location.reload();
                    } else {
                      setError(data.error || 'Failed to generate schedule');
                    }
                  } catch (error) {
                    setError('Error generating test schedule');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                <span className="mr-2">🚀</span>
                {isLoading ? 'Generating...' : 'Generate Test Schedule (5 Tasks)'}
              </Button>
            )}

            {/* Status Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {accountsCount === 0 || groupsCount === 0 || templatesCount === 0 ? (
              <Alert variant="warning">
                <AlertDescription>
                  <strong>Setup Required:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {!accountsCount && <li>Add Facebook accounts to get started</li>}
                    {!groupsCount && <li>Add Facebook groups for posting targets</li>}
                    {!templatesCount && <li>Create text templates for your posts</li>}
                    {mediaCount === 0 && <li>Add media files (optional but recommended)</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="success">
                <AlertDescription>
                  <strong>Ready to generate tasks!</strong> Click "Open Scheduler" to create your daily posting schedule.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}