'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CallCenter, Step, Contact } from '@/lib/types/external-crm';
import { CrossSectionStepsService, CrossSectionContactsService } from '@/lib/services/external-crm-service';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  DollarSign,
  Phone,
  Calendar,
  Target,
  Activity,
  Globe,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Mail,
  Wifi,
  Server,
  Database,
  Zap,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Filter,
  Search,
  Settings,
  Bell,
  Monitor,
  Cpu,
  HardDrive,
  Network,
  Signal,
  WifiOff,
  ChevronRight,
  ExternalLink,
  FileText,
  Table,
  PieChart as PieChartIcon,
  TrendingDown as TrendingDownIcon,
  BarChart as BarChartIcon,
  BarChart
} from 'lucide-react';

interface CallCentersDashboardProps {
  callCenters: CallCenter[];
  loading?: boolean;
  totalCount?: number;
  user?: any; // Add user prop to check authentication
}

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800 border-blue-200',
  'Contacted': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Qualified': 'bg-purple-100 text-purple-800 border-purple-200',
  'Proposal': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Negotiation': 'bg-orange-100 text-orange-800 border-orange-200',
  'Closed-Won': 'bg-green-100 text-green-800 border-green-200',
  'Closed-Lost': 'bg-red-100 text-red-800 border-red-200',
  'On-Hold': 'bg-gray-100 text-gray-800 border-gray-200'
};

const STATUS_ORDER = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost', 'On-Hold'];

export function CallCentersDashboard({ callCenters, loading = false, totalCount = 0, user }: CallCentersDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [allSteps, setAllSteps] = useState<Array<Step & { callCenterId: string; callCenterName?: string }>>([]);
  const [allContacts, setAllContacts] = useState<Array<Contact & { callCenterId: string; callCenterName?: string }>>([]);
  const [loadingCrossSection, setLoadingCrossSection] = useState(false);
  const [realStats, setRealStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Real-time connectivity and system monitoring states
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'analytics' | 'reports' | 'activity'>('overview');
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '6h' | '24h' | '7d'>('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [detailedView, setDetailedView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState<'all' | 'crm' | 'accounts' | 'groups' | 'tasks' | 'whatsapp' | 'calls'>('all');
  
  // Real-time connectivity data
  const [connectivityData, setConnectivityData] = useState({
    crm: { status: 'connected', uptime: 99.8, responseTime: 142, activeConnections: 1318 },
    accounts: { status: 'connected', uptime: 99.9, responseTime: 89, activeConnections: 1247 },
    groups: { status: 'connected', uptime: 99.7, responseTime: 156, activeConnections: 456 },
    tasks: { status: 'connected', uptime: 99.6, responseTime: 203, activeConnections: 89 },
    whatsapp: { status: 'warning', uptime: 98.4, responseTime: 445, activeConnections: 23 },
    calls: { status: 'connected', uptime: 99.5, responseTime: 178, activeConnections: 67 }
  });
  
  const [systemMetrics, setSystemMetrics] = useState({
    systemHealth: 98.7,
    activeUsers: 127,
    totalRequests: 15420,
    errorRate: 0.3,
    memoryUsage: 67,
    cpuUsage: 34,
    diskUsage: 45,
    networkLatency: 12
  });
  
  const [realTimeActivity, setRealTimeActivity] = useState([
    { id: 1, type: 'connection', message: 'New call center added: TechCall Morocco', timestamp: new Date(), level: 'info' as const },
    { id: 2, type: 'task', message: 'Task completed: Contact Premium Solutions', timestamp: new Date(Date.now() - 120000), level: 'success' as const },
    { id: 3, type: 'warning', message: 'WhatsApp session timeout detected', timestamp: new Date(Date.now() - 300000), level: 'warning' as const },
    { id: 4, type: 'data', message: 'Database sync completed: 1,318 records', timestamp: new Date(Date.now() - 600000), level: 'success' as const },
    { id: 5, type: 'error', message: 'Failed to connect to external API', timestamp: new Date(Date.now() - 900000), level: 'error' as const }
  ]);
  
  // Enhanced chart data with all new metrics
  const [chartData, setChartData] = useState({
    statusDistribution: [
      { name: 'New', value: 1313, color: '#3B82F6' },
      { name: 'Proposal', value: 3, color: '#4F46E5' },
      { name: 'Contacted', value: 1, color: '#06B6D4' },
      { name: 'Negotiation', value: 1, color: '#F97316' }
    ],
    countryDistribution: [
      { name: 'Morocco', value: 1070, color: '#10B981' },
      { name: 'Tunisia', value: 203, color: '#F59E0B' },
      { name: 'Senegal', value: 40, color: '#8B5CF6' },
      { name: 'France', value: 2, color: '#EF4444' },
      { name: 'Others', value: 3, color: '#6B7280' }
    ],
    performanceOverTime: [
      { time: '00:00', calls: 45, tasks: 12, contacts: 8 },
      { time: '04:00', calls: 23, tasks: 6, contacts: 3 },
      { time: '08:00', calls: 89, tasks: 18, contacts: 15 },
      { time: '12:00', calls: 156, tasks: 34, contacts: 28 },
      { time: '16:00', calls: 203, tasks: 45, contacts: 39 },
      { time: '20:00', calls: 178, tasks: 38, contacts: 31 }
    ],
    dailyActivity: [
      { date: '2025-11-03', newCenters: 15, statusUpdates: 42, contacts: 28, calls: 156 },
      { date: '2025-11-04', newCenters: 8, statusUpdates: 38, contacts: 34, calls: 203 },
      { date: '2025-11-05', newCenters: 12, statusUpdates: 45, contacts: 41, calls: 178 },
      { date: '2025-11-06', newCenters: 18, statusUpdates: 52, contacts: 38, calls: 234 },
      { date: '2025-11-07', newCenters: 9, statusUpdates: 41, contacts: 29, calls: 167 },
      { date: '2025-11-08', newCenters: 14, statusUpdates: 48, contacts: 35, calls: 189 },
      { date: '2025-11-09', newCenters: 11, statusUpdates: 39, contacts: 33, calls: 145 },
      { date: '2025-11-10', newCenters: 7, statusUpdates: 35, contacts: 26, calls: 198 }
    ],
    businessTypeDistribution: [
      { name: 'Call Centers', value: 567, color: '#3B82F6' },
      { name: 'VOIP Resellers', value: 234, color: '#10B981' },
      { name: 'Telemarketing', value: 189, color: '#F59E0B' },
      { name: 'Customer Service', value: 156, color: '#8B5CF6' },
      { name: 'Sales Support', value: 89, color: '#EF4444' },
      { name: 'Support Services', value: 83, color: '#06B6D4' }
    ],
    positionsDistribution: [
      { positions: '1-5', count: 456, percentage: 34.6 },
      { positions: '6-10', count: 389, percentage: 29.5 },
      { positions: '11-20', count: 267, percentage: 20.3 },
      { positions: '21-50', count: 134, percentage: 10.2 },
      { positions: '51+', count: 72, percentage: 5.4 }
    ],
    weeklyTrends: {
      thisWeek: { added: 67, updated: 312, contacted: 189, proposals: 23 },
      lastWeek: { added: 54, updated: 278, contacted: 156, proposals: 19 },
      lastMonth: { added: 234, updated: 1245, contacted: 678, proposals: 89 }
    },
    conversionFunnel: [
      { stage: 'New', count: 1313, conversion: 100, color: '#3B82F6' },
      { stage: 'Contacted', count: 47, conversion: 3.6, color: '#06B6D4' },
      { stage: 'Qualified', count: 23, conversion: 1.8, color: '#8B5CF6' },
      { stage: 'Proposal', count: 12, conversion: 0.9, color: '#F59E0B' },
      { stage: 'Negotiation', count: 5, conversion: 0.4, color: '#F97316' },
      { stage: 'Closed Won', count: 2, conversion: 0.2, color: '#10B981' }
    ]
  });

  // Enhanced metrics data
  const [enhancedMetrics, setEnhancedMetrics] = useState({
    activityStats: {
      totalActivities: 2456,
      todayActivities: 89,
      weekActivities: 456,
      monthActivities: 1234,
      averageResponseTime: 2.4, // hours
      activitiesByType: {
        calls: 890,
        emails: 567,
        meetings: 234,
        tasks: 456,
        updates: 309
      }
    },
    performanceStats: {
      efficiencyScore: 87,
      successRate: 94.2,
      qualityScore: 91.7,
      productivityIndex: 89.3,
      growthRate: 12.5
    },
    userEngagement: {
      activeUsers: 127,
      peakUsers: 145,
      sessionDuration: 24.5, // minutes
      pageViews: 15678,
      uniqueVisitors: 456
    },
    systemPerformance: {
      apiResponse: 156, // ms
      databaseQueries: 245,
      errorRate: 0.3,
      uptime: 99.8,
      loadTime: 1.2 // seconds
    }
  });
  
  // Add new activity
  const addActivity = useCallback((type: string, message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setRealTimeActivity(prev => [
      {
        id: Date.now(),
        type,
        message,
        timestamp: new Date(),
        level
      },
      ...prev.slice(0, 19) // Keep only last 20 activities
    ]);
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // Simulate real-time data updates
      setSystemMetrics(prev => ({
        ...prev,
        activeUsers: Math.floor(Math.random() * 50) + 100,
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 10) + 1,
        errorRate: Math.max(0, Math.min(2, prev.errorRate + (Math.random() - 0.5) * 0.1)),
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 2)),
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 3)),
        diskUsage: Math.max(0, Math.min(100, prev.diskUsage + (Math.random() - 0.5) * 1)),
        networkLatency: Math.max(1, Math.min(50, prev.networkLatency + (Math.random() - 0.5) * 2))
      }));
      
      // Simulate connectivity status changes
      setConnectivityData(prev => ({
        crm: { ...prev.crm, responseTime: Math.max(50, Math.min(300, prev.crm.responseTime + (Math.random() - 0.5) * 20)) },
        accounts: { ...prev.accounts, responseTime: Math.max(30, Math.min(200, prev.accounts.responseTime + (Math.random() - 0.5) * 15)) },
        groups: { ...prev.groups, responseTime: Math.max(80, Math.min(400, prev.groups.responseTime + (Math.random() - 0.5) * 25)) },
        tasks: { ...prev.tasks, responseTime: Math.max(100, Math.min(500, prev.tasks.responseTime + (Math.random() - 0.5) * 30)) },
        whatsapp: { ...prev.whatsapp, responseTime: Math.max(200, Math.min(800, prev.whatsapp.responseTime + (Math.random() - 0.5) * 50)) },
        calls: { ...prev.calls, responseTime: Math.max(80, Math.min(400, prev.calls.responseTime + (Math.random() - 0.5) * 25)) }
      }));
      
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Load real dashboard statistics and cross-section data
  useEffect(() => {
    // Check if we're in development with auth bypass
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
    const shouldBypassAuth = isDevelopment && bypassAuth;
    
    console.log('📊 Dashboard: Auth check - user.uid:', user?.uid, 'shouldBypassAuth:', shouldBypassAuth);

    // Load data if user is authenticated OR if we're bypassing auth
    if (!user?.uid && !shouldBypassAuth) {
      console.log('📊 Dashboard: Waiting for user authentication...');
      return;
    }

    console.log('📊 Dashboard: Proceeding to load data (authenticated or bypassing auth)...');

    const loadDashboardData = async () => {
      setLoadingStats(true);
      try {
        // Load real statistics from Firebase
        console.log('📊 Dashboard: Loading statistics from /api/external-crm/dashboard');
        const statsResponse = await fetch('/api/external-crm/dashboard');
        console.log('📊 Dashboard: Response status:', statsResponse.status);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('📊 Dashboard: Statistics data received:', statsData);
          setRealStats(statsData);
          console.log('📊 Real dashboard statistics loaded:', statsData);
        } else {
          const errorText = await statsResponse.text();
          console.error('📊 Dashboard: Failed to load dashboard statistics:', statsResponse.status, statsResponse.statusText, errorText);
          // Don't set realStats to null, keep previous data if available
        }
      } catch (error) {
        console.error('📊 Dashboard: Error loading dashboard statistics:', error);
        // Don't set realStats to null, keep previous data if available
      } finally {
        setLoadingStats(false);
      }
    };

    const loadCrossSectionData = async () => {
      if (callCenters.length === 0) return;

      setLoadingCrossSection(true);
      try {
        // Use API routes instead of direct Firebase service calls
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const [stepsResponse, contactsResponse] = await Promise.all([
          fetch(`/api/external-crm/steps?dateStart=${today}&dateEnd=${nextWeek}&completed=false`),
          fetch('/api/external-crm/contacts')
        ]);

        if (stepsResponse.ok && contactsResponse.ok) {
          const [stepsData, contactsData] = await Promise.all([
            stepsResponse.json(),
            contactsResponse.json()
          ]);

          setAllSteps(stepsData.steps.slice(0, 10) as Array<Step & { callCenterId: string; callCenterName?: string }>);
          setAllContacts(contactsData.contacts.slice(0, 10) as Array<Contact & { callCenterId: string; callCenterName?: string }>);
          console.log('✅ Cross-section data loaded via API routes');
        } else {
          throw new Error('API routes returned error responses');
        }
      } catch (error) {
        console.error('Error loading cross-section data via API:', error);
        console.log('🔄 Cross-section API failed, setting empty arrays to prevent loading issues');
        // Set empty arrays on error to prevent infinite loading
        setAllSteps([]);
        setAllContacts([]);
      } finally {
        setLoadingCrossSection(false);
      }
    };

    loadDashboardData();
    loadCrossSectionData();
  }, [callCenters, user?.uid]);

  // Auto-refresh for enhanced metrics
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setEnhancedMetrics(prev => ({
        ...prev,
        activityStats: {
          ...prev.activityStats,
          todayActivities: prev.activityStats.todayActivities + Math.floor(Math.random() * 3),
          weekActivities: prev.activityStats.weekActivities + Math.floor(Math.random() * 5)
        },
        performanceStats: {
          ...prev.performanceStats,
          efficiencyScore: Math.max(70, Math.min(100, prev.performanceStats.efficiencyScore + (Math.random() - 0.5) * 2)),
          successRate: Math.max(80, Math.min(100, prev.performanceStats.successRate + (Math.random() - 0.5) * 1)),
          productivityIndex: Math.max(70, Math.min(100, prev.performanceStats.productivityIndex + (Math.random() - 0.5) * 1.5))
        },
        userEngagement: {
          ...prev.userEngagement,
          activeUsers: Math.floor(Math.random() * 50) + 100,
          pageViews: prev.userEngagement.pageViews + Math.floor(Math.random() * 10) + 1
        },
        systemPerformance: {
          ...prev.systemPerformance,
          apiResponse: Math.max(50, Math.min(500, prev.systemPerformance.apiResponse + (Math.random() - 0.5) * 20)),
          errorRate: Math.max(0, Math.min(2, prev.systemPerformance.errorRate + (Math.random() - 0.5) * 0.1))
        }
      }));
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Use real statistics from Firebase if available, otherwise fall back to calculated stats
  const stats = useMemo(() => {
    console.log('📊 Dashboard: Calculating stats, realStats available:', !!realStats, realStats);
    if (realStats) {
      console.log('📊 Dashboard: Using real stats:', realStats);
      return {
        total: realStats.totalCallCenters,
        active: realStats.activeCallCenters,
        newThisMonth: realStats.newThisMonth,
        totalValue: realStats.totalValue,
        wonValue: realStats.wonValue,
        avgPositions: realStats.avgPositions,
        statusCounts: realStats.statusCounts,
        countryCounts: realStats.countryCounts,
        conversionRate: realStats.conversionRate,
        isPartialData: false
      };
    }

    // Fallback to calculated stats if real stats not available
    const total = totalCount > 0 ? totalCount : callCenters.length;
    const loadedActive = callCenters.filter(cc => !['Closed-Won', 'Closed-Lost', 'On-Hold'].includes(cc.status)).length;
    const loadedNewThisMonth = callCenters.filter(cc => {
      const createdDate = new Date(cc.createdAt);
      const now = new Date();
      const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 30;
    }).length;

    const loadedTotalValue = callCenters.reduce((sum, cc) => sum + (cc.value || 0), 0);
    const loadedWonValue = callCenters.filter(cc => cc.status === 'Closed-Won').reduce((sum, cc) => sum + (cc.value || 0), 0);
    const loadedAvgPositions = callCenters.length > 0 ? Math.round(callCenters.reduce((sum, cc) => sum + cc.positions, 0) / callCenters.length) : 0;

    const statusCounts = callCenters.reduce((acc, cc) => {
      acc[cc.status] = (acc[cc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const countryCounts = callCenters.reduce((acc, cc) => {
      acc[cc.country] = (acc[cc.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const loadedTotalLeads = callCenters.filter(cc => cc.status !== 'Closed-Lost').length;
    const loadedWonDeals = callCenters.filter(cc => cc.status === 'Closed-Won').length;
    const loadedConversionRate = loadedTotalLeads > 0 ? Math.round((loadedWonDeals / loadedTotalLeads) * 100) : 0;

    return {
      total,
      active: totalCount > 0 ? Math.round((loadedActive / callCenters.length) * total) : loadedActive,
      newThisMonth: totalCount > 0 ? Math.round((loadedNewThisMonth / callCenters.length) * total) : loadedNewThisMonth,
      totalValue: totalCount > 0 ? Math.round((loadedTotalValue / callCenters.length) * total) : loadedTotalValue,
      wonValue: totalCount > 0 ? Math.round((loadedWonValue / callCenters.length) * total) : loadedWonValue,
      avgPositions: loadedAvgPositions,
      statusCounts,
      countryCounts,
      conversionRate: loadedConversionRate,
      isPartialData: totalCount > callCenters.length
    };
  }, [callCenters, totalCount, realStats]);

  // Export data functionality - moved after stats declaration
  const exportData = useCallback((format: 'json' | 'csv' | 'pdf') => {
    const data = {
      timestamp: new Date().toISOString(),
      stats,
      systemMetrics,
      connectivityData,
      chartData,
      realTimeActivity
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvContent = [
        'Metric,Value,Unit',
        `Total Call Centers,${stats.total},count`,
        `Active Centers,${stats.active},count`,
        `System Health,${systemMetrics.systemHealth},%`,
        `Active Users,${systemMetrics.activeUsers},count`,
        `Response Time (CRM),${connectivityData.crm.responseTime},ms`,
        `Error Rate,${systemMetrics.errorRate},%`
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
    
    addActivity('export', `Data exported as ${format.toUpperCase()}`, 'success');
  }, [stats, systemMetrics, connectivityData, chartData, realTimeActivity, addActivity]);

  // Performance metrics - use real data if available
  const performanceMetrics = useMemo(() => {
    if (realStats) {
      return realStats.performanceMetrics;
    }

    // Fallback to calculated metrics
    const now = new Date();
    const periodDays = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90;

    const recentCallCenters = callCenters.filter(cc => {
      const createdDate = new Date(cc.createdAt);
      const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= periodDays;
    });

    const recentWins = recentCallCenters.filter(cc => cc.status === 'Closed-Won').length;
    const recentValue = recentCallCenters.filter(cc => cc.status === 'Closed-Won').reduce((sum, cc) => sum + (cc.value || 0), 0);

    return {
      recentAdditions: recentCallCenters.length,
      recentWins,
      recentValue,
      avgDealSize: recentWins > 0 ? Math.round(recentValue / recentWins) : 0
    };
  }, [callCenters, selectedPeriod, realStats]);

  if (loading || loadingStats) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-lg p-6 text-white">
          <div className="animate-pulse">
            <div className="h-6 bg-white/20 rounded mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-2/3"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Call Centers Dashboard</h2>
            <p className="text-blue-100 mt-1">Real-time analytics and performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter')}
              className="bg-white/20 text-white border-white/30 rounded px-3 py-2 text-sm"
              title="Select time period for dashboard metrics"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-100">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Connectivity Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              System Health & Connectivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(connectivityData).map(([service, data]) => (
                <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      data.status === 'connected' ? 'bg-green-500' : 
                      data.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium capitalize">{service}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-500">{data.responseTime}ms</span>
                    <span className="text-gray-500">{data.uptime}%</span>
                    <Badge variant={data.status === 'connected' ? 'default' : data.status === 'warning' ? 'secondary' : 'destructive'}>
                      {data.activeConnections} active
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cpu className="w-5 h-5 mr-2" />
              System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">System Health</span>
                <span className="text-sm font-medium">{systemMetrics.systemHealth.toFixed(1)}%</span>
              </div>
              <Progress value={systemMetrics.systemHealth} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Memory Usage</span>
                <span className="text-sm font-medium">{systemMetrics.memoryUsage.toFixed(1)}%</span>
              </div>
              <Progress value={systemMetrics.memoryUsage} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">CPU Usage</span>
                <span className="text-sm font-medium">{systemMetrics.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={systemMetrics.cpuUsage} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Users</span>
                <span className="text-sm font-medium">{systemMetrics.activeUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Call Centers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +{stats.newThisMonth} this month
                </p>
              </div>
              <Building className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Centers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
                <p className="text-sm text-blue-600 mt-1">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Potential</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${(stats.totalValue + (realStats?.totalTopups || 0)).toLocaleString()}
                </p>
                <p className="text-sm text-purple-600 flex items-center mt-1">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Won: ${stats.wonValue.toLocaleString()} | Top-ups: ${(realStats?.totalTopups || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats.conversionRate}%</p>
                <p className="text-sm text-orange-600 mt-1">
                  Avg {stats.avgPositions} positions per center
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance This {selectedPeriod === 'week' ? 'Week' : selectedPeriod === 'month' ? 'Month' : 'Quarter'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-blue-600 mr-3" />
                <span className="font-medium">New Centers Added</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {performanceMetrics.recentAdditions}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span className="font-medium">Deals Won</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {performanceMetrics.recentWins}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-purple-600 mr-3" />
                <span className="font-medium">Revenue Generated</span>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                ${performanceMetrics.recentValue.toLocaleString()}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center">
                <Award className="w-5 h-5 text-orange-600 mr-3" />
                <span className="font-medium">Avg Deal Size</span>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                ${performanceMetrics.avgDealSize.toLocaleString()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.countryCounts)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .slice(0, 6)
              .map(([country, count], index) => (
                <div key={country || `country-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium">{country}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${((count as number) / stats.total) * 100}%` }}
                      ></div>
                    </div>
                    <Badge variant="outline">{count as number}</Badge>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Daily Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>New Centers</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>Status Updates</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span>Contacts</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <span>Calls</span>
                </div>
              </div>
              <div className="h-64 overflow-y-auto">
                {chartData.dailyActivity.slice(0, 5).map((day, index) => (
                  <div key={index} className="mb-3 p-3 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{new Date(day.date).toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-blue-600 font-semibold">{day.newCenters}</div>
                        <div className="text-gray-500">New</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 font-semibold">{day.statusUpdates}</div>
                        <div className="text-gray-500">Updates</div>
                      </div>
                      <div className="text-center">
                        <div className="text-purple-600 font-semibold">{day.contacts}</div>
                        <div className="text-gray-500">Contacts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-orange-600 font-semibold">{day.calls}</div>
                        <div className="text-gray-500">Calls</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (day.calls / 250) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2" />
              Business Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartData.businessTypeDistribution.map((type, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: type.color }}
                    ></div>
                    <span className="text-sm font-medium">{type.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: type.color,
                          width: `${(type.value / 567) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold">{type.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-3xl font-bold text-gray-900">{enhancedMetrics.activityStats.totalActivities.toLocaleString()}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +{enhancedMetrics.activityStats.todayActivities} today
                </p>
              </div>
              <Activity className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency Score</p>
                <p className="text-3xl font-bold text-gray-900">{enhancedMetrics.performanceStats.efficiencyScore}%</p>
                <p className="text-sm text-blue-600 mt-1">
                  Success Rate: {enhancedMetrics.performanceStats.successRate}%
                </p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="text-3xl font-bold text-gray-900">{enhancedMetrics.userEngagement.pageViews.toLocaleString()}</p>
                <p className="text-sm text-purple-600 mt-1">
                  {enhancedMetrics.userEngagement.activeUsers} active users
                </p>
              </div>
              <Eye className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Response</p>
                <p className="text-3xl font-bold text-gray-900">{enhancedMetrics.systemPerformance.apiResponse}ms</p>
                <p className="text-sm text-orange-600 mt-1">
                  Uptime: {enhancedMetrics.systemPerformance.uptime}%
                </p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions Distribution and Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="w-5 h-5 mr-2" />
              Positions Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartData.positionsDistribution.map((pos, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{pos.positions}</span>
                    <span className="text-sm text-gray-500">positions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                        style={{ width: `${pos.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{pos.count}</div>
                      <div className="text-xs text-gray-500">{pos.percentage}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="w-5 h-5 mr-2" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartData.conversionFunnel.map((stage, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      ></div>
                      <span className="font-medium">{stage.stage}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold">{stage.count}</span>
                      <span className="text-sm text-gray-500">({stage.conversion}%)</span>
                    </div>
                  </div>
                  {index < chartData.conversionFunnel.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trends and Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Weekly Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{chartData.weeklyTrends.thisWeek.added}</div>
                  <div className="text-sm text-gray-600">This Week Added</div>
                  <div className="text-xs text-green-600">+{((chartData.weeklyTrends.thisWeek.added - chartData.weeklyTrends.lastWeek.added) / chartData.weeklyTrends.lastWeek.added * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{chartData.weeklyTrends.thisWeek.contacted}</div>
                  <div className="text-sm text-gray-600">This Week Contacted</div>
                  <div className="text-xs text-green-600">+{((chartData.weeklyTrends.thisWeek.contacted - chartData.weeklyTrends.lastWeek.contacted) / chartData.weeklyTrends.lastWeek.contacted * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{chartData.weeklyTrends.thisWeek.proposals}</div>
                  <div className="text-sm text-gray-600">This Week Proposals</div>
                  <div className="text-xs text-green-600">+{((chartData.weeklyTrends.thisWeek.proposals - chartData.weeklyTrends.lastWeek.proposals) / chartData.weeklyTrends.lastWeek.proposals * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                <div>Last Week: {chartData.weeklyTrends.lastWeek.added} added, {chartData.weeklyTrends.lastWeek.contacted} contacted</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Activity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(enhancedMetrics.activityStats.activitiesByType).map(([type, count], index) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
                const color = colors[index % colors.length];
                const percentage = ((count as number) / enhancedMetrics.activityStats.totalActivities * 100).toFixed(1);
                return (
                  <div key={type} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${color}`}></div>
                      <span className="text-sm font-medium capitalize">{type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${color}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{count as number}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution Enhanced */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Pipeline Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {STATUS_ORDER.map((status, index) => {
              const count = stats.statusCounts[status] || 0;
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

              return (
                <div key={`status-${status}-${index}`} className="text-center">
                  <div className="relative mb-2">
                    <div className="w-16 h-16 mx-auto rounded-full border-4 border-gray-100 flex items-center justify-center"
                         style={{ background: `conic-gradient(${getStatusColor(status)} ${percentage * 3.6}deg, #f3f4f6 0deg)` }}>
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-700">{count}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${STATUS_COLORS[status as keyof typeof STATUS_COLORS]} text-xs`}>
                    {status}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{percentage}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Table className="w-5 h-5 mr-2" />
              Top Performing Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Metric</th>
                    <th className="text-right p-2">Value</th>
                    <th className="text-right p-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">Average Response Time</td>
                    <td className="p-2 text-right font-semibold">{enhancedMetrics.activityStats.averageResponseTime}h</td>
                    <td className="p-2 text-right text-green-600">-0.2h</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Quality Score</td>
                    <td className="p-2 text-right font-semibold">{enhancedMetrics.performanceStats.qualityScore}%</td>
                    <td className="p-2 text-right text-green-600">+1.2%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Productivity Index</td>
                    <td className="p-2 text-right font-semibold">{enhancedMetrics.performanceStats.productivityIndex}%</td>
                    <td className="p-2 text-right text-green-600">+0.8%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Session Duration</td>
                    <td className="p-2 text-right font-semibold">{enhancedMetrics.userEngagement.sessionDuration}min</td>
                    <td className="p-2 text-right text-green-600">+2.1min</td>
                  </tr>
                  <tr>
                    <td className="p-2">Database Queries</td>
                    <td className="p-2 text-right font-semibold">{enhancedMetrics.systemPerformance.databaseQueries}</td>
                    <td className="p-2 text-right text-red-600">+12</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Recent System Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {realTimeActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.level === 'success' ? 'bg-green-500' :
                    activity.level === 'warning' ? 'bg-yellow-500' :
                    activity.level === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          activity.level === 'success' ? 'border-green-200 text-green-700' :
                          activity.level === 'warning' ? 'border-yellow-200 text-yellow-700' :
                          activity.level === 'error' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700'
                        }`}
                      >
                        {activity.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Real-time Activity Feed
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-50' : ''}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData('json')}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {realTimeActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.level === 'success' ? 'bg-green-500' :
                  activity.level === 'warning' ? 'bg-yellow-500' :
                  activity.level === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {callCenters
              .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
              .slice(0, 5)
              .map((callCenter, index) => (
                <div key={callCenter.id || `callcenter-${index}-${callCenter.name}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-sm">{callCenter.name}</p>
                      <p className="text-xs text-gray-500">{callCenter.city}, {callCenter.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={STATUS_COLORS[callCenter.status as keyof typeof STATUS_COLORS]}>
                      {callCenter.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(callCenter.updatedAt || callCenter.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Section Integration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Steps Across All Call Centers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Recent Steps ({allSteps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCrossSection ? (
              <div className="text-center py-4 text-gray-500">Loading steps...</div>
            ) : allSteps.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No recent steps found across call centers.
              </div>
            ) : (
              <div className="space-y-3">
                {allSteps.map(step => (
                  <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{step.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {step.callCenterName || 'Unknown'}
                        </Badge>
                      </div>
                      {step.description && (
                        <p className="text-xs text-gray-600 mb-1">{step.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        📅 {new Date(step.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Create calendar event from step
                          CrossSectionStepsService.createCalendarEventFromStep(step, step.callCenterName)
                            .then(() => {
                              alert('Calendar event created!');
                              // Refresh the steps list to show updated status
                              window.location.reload();
                            })
                            .catch(error => alert('Failed to create calendar event: ' + error.message));
                        }}
                        title="Add to Calendar"
                      >
                        <Calendar className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Contacts Across All Call Centers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Recent Contacts ({allContacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCrossSection ? (
              <div className="text-center py-4 text-gray-500">Loading contacts...</div>
            ) : allContacts.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No recent contacts found across call centers.
              </div>
            ) : (
              <div className="space-y-3">
                {allContacts.map(contact => (
                  <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{contact.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {contact.callCenterName || 'Unknown'}
                        </Badge>
                      </div>
                      {contact.position && (
                        <p className="text-xs text-gray-600 mb-1">{contact.position}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                            {contact.phone_info && contact.phone_info.is_mobile && contact.phone_info.whatsapp_confidence >= 0.7 && (
                              <a
                                href={PhoneDetectionService.getWhatsAppLink(contact.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-1 py-0.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                              >
                                WA
                              </a>
                            )}
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to get status color for progress circles
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'New': '#3B82F6',
    'Contacted': '#06B6D4',
    'Qualified': '#8B5CF6',
    'Proposal': '#4F46E5',
    'Negotiation': '#F97316',
    'Closed-Won': '#10B981',
    'Closed-Lost': '#EF4444',
    'On-Hold': '#6B7280'
  };
  return colors[status] || '#6B7280';
}
