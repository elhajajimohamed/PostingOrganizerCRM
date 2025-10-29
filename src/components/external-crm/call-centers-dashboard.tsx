'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Mail
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

  // Load real dashboard statistics and cross-section data
  useEffect(() => {
    // Only load data if user is authenticated and not loading
    if (!user?.uid) {
      console.log('📊 Dashboard: Waiting for user authentication...');
      return;
    }

    console.log('📊 Dashboard: User authenticated, loading data...');
    console.log('📊 Dashboard: User object:', user);

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
        const [stepsData, contactsData] = await Promise.all([
          CrossSectionStepsService.getAllSteps({
            dateRange: {
              start: new Date().toISOString().split('T')[0],
              end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Next 7 days
            },
            completed: false
          }),
          CrossSectionContactsService.getAllContacts()
        ]);

        setAllSteps(stepsData.steps.slice(0, 10) as Array<Step & { callCenterId: string; callCenterName?: string }>);
        setAllContacts(contactsData.contacts.slice(0, 10) as Array<Contact & { callCenterId: string; callCenterName?: string }>);
      } catch (error) {
        console.error('Error loading cross-section data:', error);
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
                  ${stats.totalValue.toLocaleString()}
                </p>
                <p className="text-sm text-purple-600 flex items-center mt-1">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Won: ${stats.wonValue.toLocaleString()}
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

      {/* Status Distribution */}
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