'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, Download, FileText, BarChart3, Users, Phone, MessageSquare, CheckSquare, Calendar, Target, TrendingUp, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface ReportData {
  period: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  prospects: {
    total: number;
    contacted: number;
    byStatus: Record<string, number>;
    byBusinessType: Record<string, number>;
  };
  callLogs: {
    total: number;
    successful: number;
    byOutcome: Record<string, number>;
    byDisposition: Record<string, number>;
  };
  dailyTasks: {
    total: number;
    completed: number;
    pending: number;
  };
  groupsPosting: {
    totalSessions: number;
    sessionsByStatus: Record<string, number>;
    totalPlans: number;
    plansByStatus: Record<string, number>;
    totalTasks: number;
    tasksByStatus: Record<string, number>;
    completionRate: number;
    groupsUsed: number;
    accountsUsed: number;
    averageTasksPerDay: number;
  };
  dailyWhatsApp: {
    total: number;
    sent: number;
    selected: number;
  };
  callCentersActivity: {
    total: number;
    withNotes: number;
  };
  calendarEvents: {
    total: number;
    completed: number;
    byType: Record<string, number>;
  };
  topProspects: Array<{
    name: string;
    businessType: string;
    attempts: number;
  }>;
  recentCalls: Array<{
    prospectName: string;
    outcome: string;
    disposition: string;
    date: string;
  }>;
  productivityScore: number;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDayOfMonth.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🔍 Generating report for dates:', startDate, endDate);
      const response = await fetch(`/api/reports/generate?startDate=${startDate}&endDate=${endDate}`);
      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Report data received:', data);
      setReportData(data);
      console.log('✅ Report data set successfully');
    } catch (error) {
      console.error('❌ Error generating report:', error);
      alert(`Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    try {
      const response = await fetch('/api/reports/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prospection-report-${reportData.startDate}-to-${reportData.endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error exporting PDF. Please try again.');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'contacted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'added_to_crm': return 'bg-purple-100 text-purple-800';
      case 'invalid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBusinessTypeColor = (type: string) => {
    switch (type) {
      case 'call-center': return 'bg-blue-100 text-blue-800';
      case 'individual': return 'bg-gray-100 text-gray-800';
      case 'voip-reseller': return 'bg-green-100 text-green-800';
      case 'data-vendor': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Reports</h1>
              <p className="text-sm text-gray-600 hidden sm:block">Generate comprehensive prospection activity reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Report Generator */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generate Report
              </CardTitle>
              <CardDescription>
                Select a date range to generate a comprehensive prospection activity report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={generateReport}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </Button>
                  {reportData && (
                    <Button
                      variant="outline"
                      onClick={exportToPDF}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Display */}
          {isGenerating ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-lg p-6 text-white">
                <div className="animate-pulse">
                  <div className="h-6 bg-white/20 rounded mb-2"></div>
                  <div className="h-4 bg-white/20 rounded w-2/3"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 animate-pulse">
                    <div className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating your comprehensive report...</p>
              </div>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Report Header */}
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">📊 Propection Activity Report</h2>
                      <p className="text-gray-600 mt-1">
                        Period: {format(new Date(reportData.startDate), 'MMMM d, yyyy')} - {format(new Date(reportData.endDate), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Report Generated: {format(new Date(reportData.generatedAt), 'MMMM d, yyyy \'at\' h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">{reportData.productivityScore}/100</div>
                      <div className="text-sm text-gray-600">Productivity Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="prospects">Prospects</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="groups">Groups Posting</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{reportData.prospects.total}</div>
                            <div className="text-sm text-gray-600">Total Prospects</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Phone className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{reportData.callLogs.successful}</div>
                            <div className="text-sm text-gray-600">Successful Calls</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{reportData.dailyWhatsApp.sent}</div>
                            <div className="text-sm text-gray-600">WhatsApp Sent</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <CheckSquare className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{reportData.calendarEvents.completed}</div>
                            <div className="text-sm text-gray-600">Tasks Completed</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Progress Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Contact Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Prospects Contacted</span>
                            <span>{reportData.prospects.contacted}/{reportData.prospects.total}</span>
                          </div>
                          <Progress value={(reportData.prospects.contacted / reportData.prospects.total) * 100} className="h-3" />
                          <div className="text-sm text-gray-600">
                            {Math.round((reportData.prospects.contacted / reportData.prospects.total) * 100)}% contact rate
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Call Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Successful Calls</span>
                            <span>{reportData.callLogs.successful}/{reportData.callLogs.total}</span>
                          </div>
                          <Progress value={(reportData.callLogs.successful / reportData.callLogs.total) * 100} className="h-3" />
                          <div className="text-sm text-gray-600">
                            {Math.round((reportData.callLogs.successful / reportData.callLogs.total) * 100)}% success rate
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="prospects" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>👥 Prospects Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Prospects Added:</span>
                          <Badge variant="secondary">{reportData.prospects.total}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Contacted Prospects:</span>
                          <Badge className="bg-green-100 text-green-800">
                            {reportData.prospects.contacted} ({Math.round((reportData.prospects.contacted / reportData.prospects.total) * 100)}%)
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Status Breakdown:</h4>
                          <div className="space-y-1">
                            {Object.entries(reportData.prospects.byStatus).map(([status, count]) => (
                              <div key={status} className="flex justify-between items-center">
                                <Badge className={getStatusColor(status)}>{status.replace('_', ' ')}</Badge>
                                <span className="text-sm">{count} ({Math.round((count / reportData.prospects.total) * 100)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Business Types:</h4>
                          <div className="space-y-1">
                            {Object.entries(reportData.prospects.byBusinessType).map(([type, count]) => (
                              <div key={type} className="flex justify-between items-center">
                                <Badge className={getBusinessTypeColor(type)}>{type.replace('-', ' ')}</Badge>
                                <span className="text-sm">{count} ({Math.round((count / reportData.prospects.total) * 100)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>🔥 Top Performing Prospects</CardTitle>
                        <CardDescription>Most contacted prospects</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {reportData.topProspects.map((prospect, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">{prospect.name}</div>
                                <Badge className={getBusinessTypeColor(prospect.businessType)} variant="outline">
                                  {prospect.businessType.replace('-', ' ')}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">{prospect.attempts}</div>
                                <div className="text-sm text-gray-600">attempts</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>📞 Call Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Calls Made:</span>
                          <Badge variant="secondary">{reportData.callLogs.total}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Successful Calls:</span>
                          <Badge className="bg-green-100 text-green-800">
                            {reportData.callLogs.successful} ({Math.round((reportData.callLogs.successful / reportData.callLogs.total) * 100)}%)
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Call Outcomes:</h4>
                          <div className="space-y-1">
                            {Object.entries(reportData.callLogs.byOutcome).map(([outcome, count]) => (
                              <div key={outcome} className="flex justify-between items-center">
                                <span className="text-sm">{outcome.replace('_', ' ')}</span>
                                <span className="text-sm font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Call Dispositions:</h4>
                          <div className="space-y-1">
                            {Object.entries(reportData.callLogs.byDisposition).map(([disposition, count]) => (
                              <div key={disposition} className="flex justify-between items-center">
                                <span className="text-sm">{disposition.replace('_', ' ')}</span>
                                <span className="text-sm font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>📞 Recent Call Activity</CardTitle>
                        <CardDescription>Latest call interactions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {reportData.recentCalls.map((call, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">{call.prospectName}</div>
                                <div className="text-sm text-gray-600">
                                  {call.outcome} • {call.disposition}
                                </div>
                              </div>
                              <div className="text-right text-sm text-gray-600">
                                {format(new Date(call.date), 'MMM d')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">📋 Daily Tasks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-medium">{reportData.dailyTasks.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Completed:</span>
                            <span className="font-medium text-green-600">{reportData.dailyTasks.completed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending:</span>
                            <span className="font-medium text-orange-600">{reportData.dailyTasks.pending}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">📢 Groups Posting</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Weekly Plans:</span>
                            <span className="font-medium">{reportData.groupsPosting.totalPlans}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Tasks:</span>
                            <span className="font-medium">{reportData.groupsPosting.totalTasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Completion Rate:</span>
                            <span className="font-medium text-green-600">{reportData.groupsPosting.completionRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Groups Used:</span>
                            <span className="font-medium">{reportData.groupsPosting.groupsUsed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accounts Used:</span>
                            <span className="font-medium">{reportData.groupsPosting.accountsUsed}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">💬 WhatsApp Campaign</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Sessions:</span>
                            <span className="font-medium">{reportData.dailyWhatsApp.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Messages Sent:</span>
                            <span className="font-medium text-green-600">{reportData.dailyWhatsApp.sent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Selected:</span>
                            <span className="font-medium">{reportData.dailyWhatsApp.selected}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>📢 Groups Posting Overview</CardTitle>
                        <CardDescription>Weekly plans and task completion statistics</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{reportData.groupsPosting.totalPlans}</div>
                            <div className="text-sm text-gray-600">Weekly Plans</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{reportData.groupsPosting.totalTasks}</div>
                            <div className="text-sm text-gray-600">Total Tasks</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Plan Status Breakdown:</h4>
                          <div className="space-y-1">
                            {Object.entries(reportData.groupsPosting.plansByStatus).map(([status, count]) => (
                              <div key={status} className="flex justify-between items-center">
                                <Badge variant="outline">{status}</Badge>
                                <span className="text-sm">{count} plans</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Task Status Breakdown:</h4>
                          <div className="space-y-1">
                            {Object.entries(reportData.groupsPosting.tasksByStatus).map(([status, count]) => (
                              <div key={status} className="flex justify-between items-center">
                                <Badge variant="outline">{status}</Badge>
                                <span className="text-sm">{count} tasks</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>📊 Performance Metrics</CardTitle>
                        <CardDescription>Completion rates and resource utilization</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Task Completion Rate</span>
                              <span className="font-medium">{reportData.groupsPosting.completionRate}%</span>
                            </div>
                            <Progress value={reportData.groupsPosting.completionRate} className="h-3" />
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="text-center">
                              <div className="text-xl font-bold text-purple-600">{reportData.groupsPosting.groupsUsed}</div>
                              <div className="text-sm text-gray-600">Groups Used</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-indigo-600">{reportData.groupsPosting.accountsUsed}</div>
                              <div className="text-sm text-gray-600">Accounts Used</div>
                            </div>
                          </div>

                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-800">{reportData.groupsPosting.averageTasksPerDay}</div>
                            <div className="text-sm text-gray-600">Average Tasks Per Day</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>📈 Groups Posting Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                              Generated {reportData.groupsPosting.totalPlans} weekly posting plans
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-green-600" />
                            <span className="text-sm">
                              {reportData.groupsPosting.completionRate}% task completion rate
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            <span className="text-sm">
                              Utilized {reportData.groupsPosting.groupsUsed} Facebook groups
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm">
                              Used {reportData.groupsPosting.accountsUsed} Facebook accounts
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-600" />
                            <span className="text-sm">
                              {reportData.groupsPosting.averageTasksPerDay} tasks posted daily on average
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                              {reportData.groupsPosting.totalTasks} total posting tasks executed
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>📈 Productivity Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-blue-600 mb-2">{reportData.productivityScore}/100</div>
                          <div className="text-sm text-gray-600">Overall Productivity Score</div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Contact Rate</span>
                              <span>{Math.round((reportData.prospects.contacted / reportData.prospects.total) * 100)}%</span>
                            </div>
                            <Progress value={(reportData.prospects.contacted / reportData.prospects.total) * 100} className="h-2" />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Call Success Rate</span>
                              <span>{Math.round((reportData.callLogs.successful / reportData.callLogs.total) * 100)}%</span>
                            </div>
                            <Progress value={(reportData.callLogs.successful / reportData.callLogs.total) * 100} className="h-2" />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Calendar Completion</span>
                              <span>{Math.round((reportData.calendarEvents.completed / reportData.calendarEvents.total) * 100)}%</span>
                            </div>
                            <Progress value={(reportData.calendarEvents.completed / reportData.calendarEvents.total) * 100} className="h-2" />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Documentation Rate</span>
                              <span>{Math.round((reportData.callCentersActivity.withNotes / reportData.callCentersActivity.total) * 100)}%</span>
                            </div>
                            <Progress value={(reportData.callCentersActivity.withNotes / reportData.callCentersActivity.total) * 100} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>🏢 Call Centers Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total with Activity:</span>
                          <Badge variant="secondary">{reportData.callCentersActivity.total}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">With Notes:</span>
                          <Badge className="bg-green-100 text-green-800">
                            {reportData.callCentersActivity.withNotes} ({Math.round((reportData.callCentersActivity.withNotes / reportData.callCentersActivity.total) * 100)}%)
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">📅 Calendar Events</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Total Events:</span>
                              <span className="font-medium">{reportData.calendarEvents.total}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Completed:</span>
                              <span className="font-medium text-green-600">{reportData.calendarEvents.completed}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-2">
                              Event Types: {Object.entries(reportData.calendarEvents.byType).map(([type, count]) => `${type}: ${count}`).join(', ')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>🎯 Key Achievements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                              Contacted {reportData.prospects.contacted} out of {reportData.prospects.total} prospects ({Math.round((reportData.prospects.contacted / reportData.prospects.total) * 100)}% contact rate)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="text-sm">
                              Made {reportData.callLogs.successful} successful calls out of {reportData.callLogs.total} attempts ({Math.round((reportData.callLogs.successful / reportData.callLogs.total) * 100)}% success rate)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-purple-600" />
                            <span className="text-sm">
                              Sent {reportData.dailyWhatsApp.sent} WhatsApp messages across {reportData.dailyWhatsApp.total} sessions
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-orange-600" />
                            <span className="text-sm">
                              Completed {reportData.calendarEvents.completed} out of {reportData.calendarEvents.total} calendar events ({Math.round((reportData.calendarEvents.completed / reportData.calendarEvents.total) * 100)}% completion)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm">
                              {reportData.callCentersActivity.withNotes} call centers with detailed notes ({Math.round((reportData.callCentersActivity.withNotes / reportData.callCentersActivity.total) * 100)}% documentation rate)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                              Overall productivity score: {reportData.productivityScore}/100
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}