'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Note: Table components not available, using basic HTML table instead
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CallCenter } from '@/lib/types/external-crm';
import { FinancialAnalyticsService, ClientConsumption, ClientTopup, FinancialReport } from '@/lib/services/financial-analytics-service';
import { ClientTopUpsManagement } from './client-top-ups-management';
import {
  TrendingUp,
  Users,
  Euro,
  Target,
  AlertTriangle,
  Crown,
  TrendingDown,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Calendar,
  MapPin
} from 'lucide-react';

interface FinancialAnalyticsDashboardProps {
  callCenters: CallCenter[];
  loading: boolean;
}

export function FinancialAnalyticsDashboard({ callCenters, loading }: FinancialAnalyticsDashboardProps) {
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('current-month');

  // Calculate financial metrics
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(true);

  useEffect(() => {
    const loadFinancialData = async () => {
      setLoadingFinancial(true);
      try {
        const data = await FinancialAnalyticsService.generateFinancialReport(callCenters);
        setFinancialData(data);
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoadingFinancial(false);
      }
    };
    loadFinancialData();
  }, [callCenters]);

  // Filter clients based on current filters
  const filteredClients = useMemo(() => {
    return financialData.clients.filter(client => {
      const matchesCountry = countryFilter === 'all' || client.country === countryFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'all' || client.paymentMethod === paymentMethodFilter;
      const matchesSearch = client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCountry && matchesPaymentMethod && matchesSearch;
    });
  }, [financialData.clients, countryFilter, paymentMethodFilter, searchTerm]);

  const getCommissionRateText = (rate: number) => {
    return `${(rate * 100).toFixed(0)}%`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading || loadingFinancial || !financialData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Financial Analytics</h2>
          <p className="text-gray-600">Track client top-ups, consumption, and commission performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="MAD">MAD</SelectItem>
              <SelectItem value="XOF">XOF</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Client Tracking</TabsTrigger>
          <TabsTrigger value="topups">Top-ups</TabsTrigger>
          <TabsTrigger value="insights">Country Insights</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Dashboard Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Monthly Target Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Monthly Target Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Turnover</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {FinancialAnalyticsService.formatCurrency(financialData.overview.currentTurnover, selectedCurrency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Target</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {FinancialAnalyticsService.formatCurrency(financialData.overview.monthlyTarget, selectedCurrency)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{financialData.overview.progressPercentage.toFixed(1)}%</span>
                </div>
                <Progress
                  value={financialData.overview.progressPercentage}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Commission Rate</p>
                  <p className="text-xl font-semibold text-green-600">
                    {getCommissionRateText(financialData.overview.commissionRate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Commission Amount</p>
                  <p className="text-xl font-semibold text-green-600">
                    {FinancialAnalyticsService.formatCurrency(financialData.overview.commissionAmount, selectedCurrency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="w-8 h-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Consumption</p>
                    <p className="text-2xl font-bold">
                      {FinancialAnalyticsService.formatCurrency(financialData.performance.totalConsumption, selectedCurrency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Estimated Margin</p>
                    <p className="text-2xl font-bold">
                      {FinancialAnalyticsService.formatCurrency(financialData.performance.estimatedMargin, selectedCurrency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Clients</p>
                    <p className="text-2xl font-bold">{financialData.performance.activeClientsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Top-up</p>
                    <p className="text-2xl font-bold">
                      {FinancialAnalyticsService.formatCurrency(financialData.performance.averageTopupPerClient, selectedCurrency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {financialData.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Client Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {financialData.alerts.map((alert) => (
                    <Alert key={alert.clientId}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{alert.clientName}</strong>: {alert.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rankings */}
          <Card>
            <CardHeader>
              <CardTitle>Client Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {financialData.rankings.topSpender && (
                  <div className="flex items-center p-4 border rounded-lg">
                    <Crown className="w-8 h-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="font-semibold">🥇 Top Spender</p>
                      <p className="text-sm text-gray-600">{financialData.rankings.topSpender.clientName}</p>
                      <p className="text-sm font-medium">
                        {FinancialAnalyticsService.formatCurrency(financialData.rankings.topSpender.totalConsumptionEUR, selectedCurrency)}
                      </p>
                    </div>
                  </div>
                )}

                {financialData.rankings.risingClient && (
                  <div className="flex items-center p-4 border rounded-lg">
                    <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
                    <div>
                      <p className="font-semibold">🥈 Rising Client</p>
                      <p className="text-sm text-gray-600">{financialData.rankings.risingClient.clientName}</p>
                      <p className="text-sm font-medium">
                        {FinancialAnalyticsService.formatCurrency(financialData.rankings.risingClient.totalTopupEUR, selectedCurrency)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Tracking */}
        <TabsContent value="clients" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {FinancialAnalyticsService.getCountryOptions().map((country) => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {FinancialAnalyticsService.getPaymentMethodOptions().map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date Range</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current-month">Current Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                      <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Table */}
          <Card>
            <CardHeader>
              <CardTitle>Client Ranking ({filteredClients.length} clients)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Rank</th>
                      <th className="text-left p-3 font-medium">Client Name</th>
                      <th className="text-left p-3 font-medium">Total Consumption</th>
                      <th className="text-left p-3 font-medium">Total Top-up</th>
                      <th className="text-left p-3 font-medium">Payment Method</th>
                      <th className="text-left p-3 font-medium">Last Top-up</th>
                      <th className="text-left p-3 font-medium">Country</th>
                      <th className="text-left p-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client, index) => (
                      <tr key={client.clientId} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{client.clientName}</td>
                        <td className="p-3">
                          {FinancialAnalyticsService.formatCurrency(client.totalConsumptionEUR, selectedCurrency)}
                        </td>
                        <td className="p-3">
                          {FinancialAnalyticsService.formatCurrency(client.totalTopupEUR, selectedCurrency)}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{client.paymentMethod}</Badge>
                        </td>
                        <td className="p-3">{new Date(client.lastTopupDate).toLocaleDateString()}</td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {client.country}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs truncate">{client.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top-ups Management */}
        <TabsContent value="topups" className="space-y-6">
          <ClientTopUpsManagement callCenters={callCenters} />
        </TabsContent>

        {/* Country Insights */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                Country Consumption Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialData.countryInsights.map((insight) => (
                  <div key={insight.country} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="font-medium">{insight.country}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold">
                        {FinancialAnalyticsService.formatCurrency(insight.consumption, selectedCurrency)}
                      </span>
                      <Badge variant="secondary">
                        {insight.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-sm text-gray-600">
                  Total monthly consumption across all countries: {' '}
                  <span className="font-semibold">
                    {FinancialAnalyticsService.formatCurrency(
                      financialData.countryInsights.reduce((sum, insight) => sum + insight.consumption, 0),
                      selectedCurrency
                    )}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Commission Tiers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>≥ 20,000 €</span>
                    <Badge>5%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>≥ 10,000 €</span>
                    <Badge>4%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>≥ 6,000 €</span>
                    <Badge>3%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>≥ 3,000 €</span>
                    <Badge>3%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded bg-gray-50">
                    <span>&lt; 3,000 €</span>
                    <Badge variant="secondary">0%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>December 2024</span>
                    <span className="font-semibold">2,800 €</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>November 2024</span>
                    <span className="font-semibold">3,200 €</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>October 2024</span>
                    <span className="font-semibold">2,600 €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}