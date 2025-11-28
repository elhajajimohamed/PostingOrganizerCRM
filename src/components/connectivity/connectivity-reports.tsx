'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Filter,
  Search,
  Eye,
  RefreshCw
} from 'lucide-react';

interface ConnectivityReportsProps {
  data: {
    overview: {
      totalConnections: number;
      activeConnections: number;
      dataTransfer: number;
      responseTime: number;
      uptime: number;
      lastUpdate: string;
    };
    sections: {
      crm: {
        totalRecords: number;
        activeLeads: number;
        conversionRate: number;
        recentActivity: number;
      };
      accounts: {
        totalAccounts: number;
        activeAccounts: number;
        connectionStatus: 'online' | 'offline' | 'warning';
        lastSync: string;
      };
      groups: {
        totalGroups: number;
        activeGroups: number;
        engagementRate: number;
        recentPosts: number;
      };
      tasks: {
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
      };
      whatsapp: {
        activeSessions: number;
        messagesSent: number;
        successRate: number;
        lastActivity: string;
      };
      calls: {
        totalCalls: number;
        successfulCalls: number;
        averageDuration: number;
        connectionQuality: number;
      };
    };
  };
}

export function ConnectivityReports({ data }: ConnectivityReportsProps) {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [format, setFormat] = useState('pdf');
  const [searchTerm, setSearchTerm] = useState('');

  // Generate report data
  const generateReportData = () => {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      overview: {
        systemUptime: data.overview.uptime,
        averageResponseTime: data.overview.responseTime,
        totalConnections: data.overview.totalConnections,
        activeConnections: data.overview.activeConnections,
        dataTransfer: data.overview.dataTransfer
      },
      sections: {
        crm: {
          totalRecords: data.sections.crm.totalRecords,
          activeLeads: data.sections.crm.activeLeads,
          conversionRate: data.sections.crm.conversionRate,
          recentActivity: data.sections.crm.recentActivity
        },
        accounts: {
          totalAccounts: data.sections.accounts.totalAccounts,
          activeAccounts: data.sections.accounts.activeAccounts,
          connectionStatus: data.sections.accounts.connectionStatus,
          lastSync: data.sections.accounts.lastSync
        },
        groups: {
          totalGroups: data.sections.groups.totalGroups,
          activeGroups: data.sections.groups.activeGroups,
          engagementRate: data.sections.groups.engagementRate,
          recentPosts: data.sections.groups.recentPosts
        },
        whatsapp: {
          activeSessions: data.sections.whatsapp.activeSessions,
          messagesSent: data.sections.whatsapp.messagesSent,
          successRate: data.sections.whatsapp.successRate,
          lastActivity: data.sections.whatsapp.lastActivity
        },
        tasks: {
          totalTasks: data.sections.tasks.totalTasks,
          completedTasks: data.sections.tasks.completedTasks,
          pendingTasks: data.sections.tasks.pendingTasks,
          overdueTasks: data.sections.tasks.overdueTasks
        },
        calls: {
          totalCalls: data.sections.calls.totalCalls,
          successfulCalls: data.sections.calls.successfulCalls,
          averageDuration: data.sections.calls.averageDuration,
          connectionQuality: data.sections.calls.connectionQuality
        }
      }
    };
  };

  // Export functionality
  const handleExport = async () => {
    const reportData = generateReportData();
    
    try {
      if (format === 'json') {
        // Download as JSON
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `connectivity-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Convert to CSV
        const csvData = [
          ['Section', 'Metric', 'Value'],
          ['System', 'Uptime (%)', data.overview.uptime.toString()],
          ['System', 'Response Time (ms)', data.overview.responseTime.toString()],
          ['System', 'Total Connections', data.overview.totalConnections.toString()],
          ['System', 'Active Connections', data.overview.activeConnections.toString()],
          ['CRM', 'Total Records', data.sections.crm.totalRecords.toString()],
          ['CRM', 'Active Leads', data.sections.crm.activeLeads.toString()],
          ['CRM', 'Conversion Rate (%)', data.sections.crm.conversionRate.toString()],
          ['Accounts', 'Total Accounts', data.sections.accounts.totalAccounts.toString()],
          ['Accounts', 'Active Accounts', data.sections.accounts.activeAccounts.toString()],
          ['Groups', 'Total Groups', data.sections.groups.totalGroups.toString()],
          ['Groups', 'Active Groups', data.sections.groups.activeGroups.toString()],
          ['Groups', 'Engagement Rate (%)', data.sections.groups.engagementRate.toString()],
          ['WhatsApp', 'Active Sessions', data.sections.whatsapp.activeSessions.toString()],
          ['WhatsApp', 'Messages Sent', data.sections.whatsapp.messagesSent.toString()],
          ['WhatsApp', 'Success Rate (%)', data.sections.whatsapp.successRate.toString()],
          ['Tasks', 'Total Tasks', data.sections.tasks.totalTasks.toString()],
          ['Tasks', 'Completed Tasks', data.sections.tasks.completedTasks.toString()],
          ['Tasks', 'Pending Tasks', data.sections.tasks.pendingTasks.toString()],
          ['Calls', 'Total Calls', data.sections.calls.totalCalls.toString()],
          ['Calls', 'Successful Calls', data.sections.calls.successfulCalls.toString()],
          ['Calls', 'Connection Quality (%)', data.sections.calls.connectionQuality.toString()]
        ];
        
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `connectivity-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For PDF/HTML, we'll show a preview (in a real app, you'd use a PDF library)
        alert('PDF export would be implemented with a PDF generation library in a production environment');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Mock report templates
  const reportTemplates = [
    {
      id: 'overview',
      name: 'System Overview',
      description: 'Complete system health and performance summary',
      icon: BarChart3,
      lastGenerated: '2025-11-10',
      size: '2.4 MB'
    },
    {
      id: 'detailed',
      name: 'Detailed Analysis',
      description: 'In-depth analysis of all system components',
      icon: TrendingUp,
      lastGenerated: '2025-11-10',
      size: '5.8 MB'
    },
    {
      id: 'compliance',
      name: 'Compliance Report',
      description: 'SLA compliance and uptime statistics',
      icon: FileText,
      lastGenerated: '2025-11-09',
      size: '1.2 MB'
    },
    {
      id: 'trends',
      name: 'Trends Analysis',
      description: 'Historical trends and predictive analytics',
      icon: Calendar,
      lastGenerated: '2025-11-08',
      size: '3.1 MB'
    }
  ];

  // Filter reports based on search
  const filteredReports = reportTemplates.filter(report =>
    !searchTerm || 
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Export Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Connectivity Reports</h2>
          <p className="text-gray-600">Generate and export detailed system reports</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleExport} className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        {/* Report Templates */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Available Report Templates</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <Icon className="w-6 h-6 text-blue-600 mt-1" />
                            <div>
                              <h3 className="font-semibold text-lg">{report.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                                <span>Last: {report.lastGenerated}</span>
                                <span>{report.size}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Reports */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Custom Report</CardTitle>
              <p className="text-gray-600">Create a customized report with specific metrics and time range</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Report Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">System Overview</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="connectivity">Connectivity</SelectItem>
                      <SelectItem value="usage">Usage Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Time Range</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Output Format</label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate & Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <p className="text-gray-600">Previously generated reports and exports</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    name: 'System Overview Report',
                    type: 'PDF',
                    generated: '2025-11-10 14:30',
                    size: '2.4 MB',
                    status: 'completed'
                  },
                  {
                    name: 'Weekly Performance Analysis',
                    type: 'CSV',
                    generated: '2025-11-09 16:45',
                    size: '1.8 MB',
                    status: 'completed'
                  },
                  {
                    name: 'Compliance Report Q3',
                    type: 'PDF',
                    generated: '2025-11-08 09:15',
                    size: '3.2 MB',
                    status: 'completed'
                  },
                  {
                    name: 'Connectivity Trends',
                    type: 'JSON',
                    generated: '2025-11-07 11:20',
                    size: '856 KB',
                    status: 'completed'
                  }
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-gray-600">
                          {report.type} • {report.generated} • {report.size}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-green-600">
                        {report.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">24</div>
            <p className="text-sm text-gray-600">Reports Generated</p>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <p className="text-sm text-gray-600">System Uptime</p>
            <p className="text-xs text-gray-500">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">142ms</div>
            <p className="text-sm text-gray-600">Avg Response Time</p>
            <p className="text-xs text-gray-500">Current month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">1,318</div>
            <p className="text-sm text-gray-600">Active Connections</p>
            <p className="text-xs text-gray-500">Now</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
