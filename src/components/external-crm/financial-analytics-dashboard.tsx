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
import { CallCenterDetailModal } from './call-center-detail-modal';
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
  const [selectedMonth, setSelectedMonth] = useState('2025-11'); // Default to November 2025
  const [availableMonths, setAvailableMonths] = useState<string[]>(['2025-11']);

  // Calculate financial metrics
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(true);
  const [allCallCenters, setAllCallCenters] = useState<CallCenter[]>([]);

  // Call center detail modal state
  const [selectedCallCenter, setSelectedCallCenter] = useState<CallCenter | null>(null);
  const [showCallCenterModal, setShowCallCenterModal] = useState(false);

  // Top-ups detail modal state
  const [showTopUpsModal, setShowTopUpsModal] = useState(false);
  const [allTopUps, setAllTopUps] = useState<ClientTopup[]>([]);
  const [loadingTopUps, setLoadingTopUps] = useState(false);
  const [selectedTopUps, setSelectedTopUps] = useState<Set<string>>(new Set());
  const [editingTopUp, setEditingTopUp] = useState<ClientTopup | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const loadFinancialData = async () => {
      setLoadingFinancial(true);
      try {
        // Fetch all call centers for both financial calculations and UI display
        const response = await fetch('/api/external-crm?all=true');
        const data = await response.json();
        const allCenters = data.data || [];
        setAllCallCenters(allCenters);

        // Load available months
        const months = await FinancialAnalyticsService.getAvailableMonths();
        setAvailableMonths(months);

        const financialReport = await FinancialAnalyticsService.generateFinancialReport(allCenters, selectedMonth);
        setFinancialData(financialReport);
      } catch (error) {
        console.error('Error loading financial data:', error);
        // Set fallback data on error
        setFinancialData({
          overview: {
            monthlyTarget: 3000,
            currentTurnover: 0,
            commissionRate: 0,
            commissionAmount: 0,
            progressPercentage: 0
          },
          clients: [],
          countryInsights: [],
          performance: {
            totalConsumption: 0,
            estimatedMargin: 0,
            averageTopupPerClient: 0,
            activeClientsCount: 0
          },
          alerts: [],
          rankings: {
            topSpender: null,
            risingClient: null
          }
        });
      } finally {
        setLoadingFinancial(false);
      }
    };
    loadFinancialData();
  }, [selectedMonth]);

  // Refresh financial data when top-ups are added/updated
  const refreshFinancialData = async () => {
    try {
      const data = await FinancialAnalyticsService.generateFinancialReport(callCenters, selectedMonth);
      setFinancialData(data);
    } catch (error) {
      console.error('Error refreshing financial data:', error);
    }
  };

  // Handle opening call center detail modal
  const handleCallCenterClick = (callCenter: CallCenter) => {
    setSelectedCallCenter(callCenter);
    setShowCallCenterModal(true);
  };

  // Handle call center update from modal
  const handleCallCenterUpdate = (updatedCallCenter: CallCenter) => {
    // Refresh financial data after call center update
    refreshFinancialData();
  };

  // Handle opening top-ups detail modal
  const handleTotalConsumptionClick = async () => {
    setLoadingTopUps(true);
    setSelectedTopUps(new Set()); // Reset selections
    try {
      const response = await fetch('/api/external-crm/top-ups');
      const result = await response.json();
      if (result.success) {
        setAllTopUps(result.data);
        setShowTopUpsModal(true);
      }
    } catch (error) {
      console.error('Error fetching top-ups:', error);
    } finally {
      setLoadingTopUps(false);
    }
  };

  // Handle selecting/deselecting top-ups
  const handleTopUpSelect = (topUpId: string, checked: boolean) => {
    const newSelected = new Set(selectedTopUps);
    if (checked) {
      newSelected.add(topUpId);
    } else {
      newSelected.delete(topUpId);
    }
    setSelectedTopUps(newSelected);
  };

  // Handle selecting all top-ups
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTopUps(new Set(allTopUps.map(t => t.id)));
    } else {
      setSelectedTopUps(new Set());
    }
  };

  // Handle editing a top-up
  const handleEditTopUp = (topUp: ClientTopup) => {
    setEditingTopUp(topUp);
    setShowEditModal(true);
  };

  // Handle deleting a single top-up
  const handleDeleteTopUp = async (topUpId: string) => {
    if (!confirm('Are you sure you want to delete this top-up?')) return;

    try {
      const response = await fetch(`/api/external-crm/top-ups/${topUpId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        // Refresh the data
        await refreshTopUpsData();
        refreshFinancialData();
      } else {
        alert('Failed to delete top-up');
      }
    } catch (error) {
      console.error('Error deleting top-up:', error);
      alert('Error deleting top-up');
    }
  };

  // Handle deleting selected top-ups
  const handleDeleteSelected = async () => {
    if (selectedTopUps.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTopUps.size} top-up(s)?`)) return;

    try {
      const deletePromises = Array.from(selectedTopUps).map(id =>
        fetch(`/api/external-crm/top-ups/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === selectedTopUps.size) {
        setSelectedTopUps(new Set());
        await refreshTopUpsData();
        refreshFinancialData();
      } else {
        alert(`Failed to delete ${selectedTopUps.size - successCount} top-up(s)`);
      }
    } catch (error) {
      console.error('Error deleting top-ups:', error);
      alert('Error deleting top-ups');
    }
  };

  // Handle saving edited top-up
  const handleSaveTopUp = async (updatedTopUp: ClientTopup) => {
    try {
      const response = await fetch(`/api/external-crm/top-ups/${updatedTopUp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTopUp),
      });
      const result = await response.json();
      if (result.success) {
        setShowEditModal(false);
        setEditingTopUp(null);
        await refreshTopUpsData();
        refreshFinancialData();
      } else {
        alert('Failed to update top-up');
      }
    } catch (error) {
      console.error('Error updating top-up:', error);
      alert('Error updating top-up');
    }
  };

  // Refresh top-ups data
  const refreshTopUpsData = async () => {
    try {
      const response = await fetch('/api/external-crm/top-ups');
      const result = await response.json();
      if (result.success) {
        setAllTopUps(result.data);
      }
    } catch (error) {
      console.error('Error refreshing top-ups:', error);
    }
  };

  // Filter clients based on current filters
  const filteredClients = useMemo(() => {
    if (!financialData) return [];
    return financialData.clients.filter(client => {
      const matchesCountry = countryFilter === 'all' || client.country === countryFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'all' || client.paymentMethod === paymentMethodFilter;
      const matchesSearch = (client.clientName && client.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (client.notes && client.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesCountry && matchesPaymentMethod && matchesSearch;
    });
  }, [financialData, countryFilter, paymentMethodFilter, searchTerm]);

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
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((monthId) => (
                <SelectItem key={monthId} value={monthId}>
                  {new Date(parseInt(monthId.split('-')[0]), parseInt(monthId.split('-')[1]) - 1)
                    .toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                {new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1)
                  .toLocaleDateString('en-US', { year: 'numeric', month: 'long' })} Target Progress (3,000 €)
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Monthly Data:</strong> Showing top-ups for {new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1)
                    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} only. 
                  Closed-Won Call Centers are automatically included with 3% commission.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Commission Rate</p>
                  <p className="text-xl font-semibold text-green-600">
                    {getCommissionRateText(financialData.overview.commissionRate)}
                  </p>
                  <p className="text-xs text-gray-500">Always 3% for Closed-Won clients</p>
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
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={handleTotalConsumptionClick}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="w-8 h-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Consumption</p>
                    <p className="text-2xl font-bold">
                      {FinancialAnalyticsService.formatCurrency(financialData.performance.totalConsumption, selectedCurrency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Click to view all top-ups</p>
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
          {/* Closed-Won Call Centers Summary */}
          {allCallCenters.filter(cc => cc.status === 'Closed-Won').length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Crown className="w-5 h-5 mr-2" />
                  Closed-Won Call Centers ({allCallCenters.filter(cc => cc.status === 'Closed-Won').length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCallCenters.filter(cc => cc.status === 'Closed-Won').map(cc => (
                    <div
                      key={cc.id}
                      className="bg-white p-4 rounded-lg border border-green-200 cursor-pointer hover:shadow-md transition-shadow duration-200"
                      onClick={() => handleCallCenterClick(cc)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-800">{cc.name}</h4>
                        <Badge variant="default" className="bg-green-600">Closed-Won</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{cc.city}, {cc.country}</p>
                        <p>{cc.positions} positions</p>
                        <p className="text-green-700 font-medium">
                          Click to manage top-ups
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Note:</strong> These call centers are automatically included in your monthly target calculations.
                    Commission is calculated at 3% on their top-ups, even before reaching the 3,000€ target.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
                  <label className="block text-sm font-medium mb-2">Target Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((monthId) => (
                        <SelectItem key={monthId} value={monthId}>
                          {new Date(parseInt(monthId.split('-')[0]), parseInt(monthId.split('-')[1]) - 1)
                            .toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Table */}
          <Card>
            <CardHeader>
              <CardTitle>Closed-Won Client Ranking ({filteredClients.length} clients)</CardTitle>
              <p className="text-sm text-gray-600">Only showing clients with Closed-Won call centers</p>
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
          <ClientTopUpsManagement callCenters={callCenters} onDataChange={refreshFinancialData} />
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

      {/* Call Center Detail Modal */}
      {selectedCallCenter && (
        <CallCenterDetailModal
          callCenter={selectedCallCenter}
          isOpen={showCallCenterModal}
          onClose={() => {
            setShowCallCenterModal(false);
            setSelectedCallCenter(null);
          }}
          onCallCenterUpdate={handleCallCenterUpdate}
        />
      )}

      {/* Top-ups Detail Modal */}
      {showTopUpsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">All Top-ups Details</h2>
                <button
                  onClick={() => setShowTopUpsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Bulk Actions */}
              {selectedTopUps.size > 0 && (
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {selectedTopUps.size} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                  >
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {loadingTopUps ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading top-ups...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {allTopUps.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No top-ups found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-medium">
                              <input
                                type="checkbox"
                                checked={selectedTopUps.size === allTopUps.length && allTopUps.length > 0}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="rounded"
                                aria-label="Select all top-ups"
                              />
                            </th>
                            <th className="text-left p-3 font-medium">Client</th>
                            <th className="text-left p-3 font-medium">Amount</th>
                            <th className="text-left p-3 font-medium">Payment Method</th>
                            <th className="text-left p-3 font-medium">Date</th>
                            <th className="text-left p-3 font-medium">Country</th>
                            <th className="text-left p-3 font-medium">Notes</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTopUps.map((topup) => (
                            <tr key={topup.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={selectedTopUps.has(topup.id)}
                                  onChange={(e) => handleTopUpSelect(topup.id, e.target.checked)}
                                  className="rounded"
                                  aria-label={`Select top-up for ${topup.clientName}`}
                                />
                              </td>
                              <td className="p-3 font-medium">{topup.clientName}</td>
                              <td className="p-3">
                                <span className={topup.amountEUR < 0 ? 'text-red-600' : 'text-green-600'}>
                                  {FinancialAnalyticsService.formatCurrency(topup.amountEUR, selectedCurrency)}
                                </span>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline">{topup.paymentMethod}</Badge>
                              </td>
                              <td className="p-3">{new Date(topup.date).toLocaleDateString()}</td>
                              <td className="p-3">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {topup.country}
                                </div>
                              </td>
                              <td className="p-3 max-w-xs truncate">{topup.notes}</td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditTopUp(topup)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteTopUp(topup.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Top-up Modal */}
      {showEditModal && editingTopUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Edit Top-up</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Amount (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingTopUp.amountEUR}
                  onChange={(e) => setEditingTopUp({
                    ...editingTopUp,
                    amountEUR: parseFloat(e.target.value) || 0
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <Select
                  value={editingTopUp.paymentMethod}
                  onValueChange={(value) => setEditingTopUp({
                    ...editingTopUp,
                    paymentMethod: value as ClientTopup['paymentMethod']
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FinancialAnalyticsService.getPaymentMethodOptions().map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input
                  type="date"
                  value={editingTopUp.date.split('T')[0]}
                  onChange={(e) => setEditingTopUp({
                    ...editingTopUp,
                    date: e.target.value + 'T12:00:00.000Z'
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <Select
                  value={editingTopUp.country}
                  onValueChange={(value) => setEditingTopUp({
                    ...editingTopUp,
                    country: value as ClientTopup['country']
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FinancialAnalyticsService.getCountryOptions().map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <Input
                  value={editingTopUp.notes || ''}
                  onChange={(e) => setEditingTopUp({
                    ...editingTopUp,
                    notes: e.target.value
                  })}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTopUp(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSaveTopUp(editingTopUp)}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
