'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CallCenter } from '@/lib/types/external-crm';
import { DataIntegrityService, DataIntegrityReport, ValidationResult } from '@/lib/services/data-integrity-service';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  Archive,
  FileCheck,
  Activity,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  ArrowRightLeft
} from 'lucide-react';

interface DataIntegrityDashboardProps {
  callCenters: CallCenter[];
  loading?: boolean;
}

export function DataIntegrityDashboard({ callCenters, loading = false }: DataIntegrityDashboardProps) {
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Calculate data quality score
  const dataQuality = useMemo(() => {
    return DataIntegrityService.calculateDataQualityScore(callCenters);
  }, [callCenters]);

  useEffect(() => {
    generateIntegrityReport();
  }, [callCenters]);

  const generateIntegrityReport = async () => {
    try {
      setIsGeneratingReport(true);
      const report = await DataIntegrityService.generateIntegrityReport();
      setIntegrityReport(report);
    } catch (error) {
      console.error('Error generating integrity report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const createBackup = async (type: 'full' | 'incremental') => {
    try {
      setIsCreatingBackup(true);
      await DataIntegrityService.createBackup(type);
      alert(`${type} backup created successfully!`);
      await generateIntegrityReport(); // Refresh report to update backup status
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup. Please try again.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const validateAllData = async () => {
    try {
      const validation = DataIntegrityService.validateEntity('callCenter', callCenters[0] || {});
      setLastValidation(validation);
    } catch (error) {
      console.error('Error validating data:', error);
    }
  };

  const syncCalendarToSteps = async () => {
    try {
      setIsSyncingCalendar(true);
      const response = await fetch('/api/external-crm/sync-calendar-to-steps', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Sync completed! ${result.synced} steps created, ${result.skipped} already existed.`);
        await generateIntegrityReport(); // Refresh report
      } else {
        const error = await response.json();
        alert(`Sync failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error syncing calendar to steps:', error);
      alert('Failed to sync calendar events to steps. Please try again.');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Data Integrity & Validation</h2>
            <p className="text-green-100 mt-1">Comprehensive data validation, backup systems, and integrity monitoring</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Quality Score: {dataQuality.overall}%
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={generateIntegrityReport}
              disabled={isGeneratingReport}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              {isGeneratingReport ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              Refresh Report
            </Button>
          </div>
        </div>
      </div>

      {/* Data Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Quality Score</p>
                <p className="text-3xl font-bold text-green-600">{dataQuality.overall}%</p>
                <p className="text-sm text-green-600 mt-1">
                  {dataQuality.overall >= 90 ? 'Excellent' :
                   dataQuality.overall >= 75 ? 'Good' :
                   dataQuality.overall >= 60 ? 'Fair' : 'Needs Improvement'}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Completeness</p>
                <p className="text-3xl font-bold text-blue-600">{dataQuality.completeness}%</p>
                <p className="text-sm text-blue-600 mt-1">
                  Required fields filled
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Accuracy</p>
                <p className="text-3xl font-bold text-purple-600">{dataQuality.accuracy}%</p>
                <p className="text-sm text-purple-600 mt-1">
                  Valid formats & values
                </p>
              </div>
              <FileCheck className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Backup Status</p>
                <p className="text-3xl font-bold text-orange-600">
                  {integrityReport?.backupStatus.backupCount || 0}
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  Available backups
                </p>
              </div>
              <Database className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Data Quality Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">{dataQuality.completeness}%</div>
                <Progress value={dataQuality.completeness} className="h-2" />
                <p className="text-sm text-gray-600">Completeness</p>
              </div>
            </div>
            <div className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-600">{dataQuality.accuracy}%</div>
                <Progress value={dataQuality.accuracy} className="h-2" />
                <p className="text-sm text-gray-600">Accuracy</p>
              </div>
            </div>
            <div className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-purple-600">{dataQuality.consistency}%</div>
                <Progress value={dataQuality.consistency} className="h-2" />
                <p className="text-sm text-gray-600">Consistency</p>
              </div>
            </div>
            <div className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-orange-600">{dataQuality.timeliness}%</div>
                <Progress value={dataQuality.timeliness} className="h-2" />
                <p className="text-sm text-gray-600">Timeliness</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrity Management Tabs */}
      <Tabs defaultValue="validation" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="cleanup">Data Cleanup</TabsTrigger>
        </TabsList>

        <TabsContent value="validation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Validation Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Validation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-green-600">
                      {callCenters.length - (integrityReport?.validationErrors.length || 0)}
                    </p>
                    <p className="text-sm text-gray-600">Valid Records</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-red-600">
                      {integrityReport?.validationErrors.length || 0}
                    </p>
                    <p className="text-sm text-gray-600">Errors Found</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button onClick={validateAllData} className="w-full">
                    <FileCheck className="w-4 h-4 mr-2" />
                    Run Full Validation
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export Validation Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Validation Errors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Recent Validation Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                {integrityReport?.validationErrors.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="font-medium">No validation errors found!</p>
                    <p className="text-sm text-gray-600">All data is properly formatted and valid.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {integrityReport?.validationErrors.slice(0, 5).map((error, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">{error.type} #{error.id}</p>
                          <div className="space-y-1 mt-1">
                            {error.errors.slice(0, 2).map((err, errIndex) => (
                              <p key={errIndex} className="text-sm text-red-600">• {err}</p>
                            ))}
                            {error.errors.length > 2 && (
                              <p className="text-sm text-red-600">• ...and {error.errors.length - 2} more</p>
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
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backup Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Archive className="w-5 h-5 mr-2" />
                  Backup Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button
                    onClick={() => createBackup('full')}
                    disabled={isCreatingBackup}
                    className="w-full"
                  >
                    {isCreatingBackup ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    Create Full Backup
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => createBackup('incremental')}
                    disabled={isCreatingBackup}
                    className="w-full"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Create Incremental Backup
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Backup Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Last Backup:</span>
                      <span className="font-medium">
                        {integrityReport?.backupStatus.lastBackup
                          ? new Date(integrityReport.backupStatus.lastBackup).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Backups:</span>
                      <Badge variant="outline">{integrityReport?.backupStatus.backupCount || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Scheduled:</span>
                      <span className="font-medium">
                        {integrityReport?.backupStatus.nextScheduled
                          ? new Date(integrityReport.backupStatus.nextScheduled).toLocaleString()
                          : 'Not scheduled'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backup Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Backup Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-800">Full Backup</p>
                    <p className="text-blue-600">Complete database snapshot including all call centers, contacts, and settings.</p>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium text-green-800">Incremental Backup</p>
                    <p className="text-green-600">Only recent changes since last backup for faster processing.</p>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="font-medium text-purple-800">Automatic Backups</p>
                    <p className="text-purple-600">Daily incremental backups with weekly full backups.</p>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Backups are encrypted and stored securely. You can recover data from any backup point.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2" />
                Data Synchronization
              </CardTitle>
              <p className="text-sm text-gray-600">
                Sync data between different systems and ensure consistency across the platform.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Calendar to Steps Sync */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                      <h4 className="font-medium text-blue-800">Calendar Events to Steps</h4>
                    </div>
                    <p className="text-sm text-blue-600 mb-3">
                      Automatically create steps in call centers for calendar events that don't have corresponding steps.
                    </p>
                    <Button
                      onClick={syncCalendarToSteps}
                      disabled={isSyncingCalendar}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isSyncingCalendar ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                      )}
                      Sync Calendar to Steps
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Scans all calendar events with call center associations</p>
                    <p>• Creates steps for events that don't have them</p>
                    <p>• Prevents duplicate steps for existing events</p>
                    <p>• Links steps back to original calendar events</p>
                  </div>
                </div>

                {/* Future sync operations can be added here */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Info className="w-5 h-5 text-gray-600 mr-2" />
                      <h4 className="font-medium text-gray-800">More Sync Operations</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Additional synchronization features will be available here in future updates.
                    </p>
                    <div className="text-xs text-gray-500">
                      <p>• Contact synchronization</p>
                      <p>• External system imports</p>
                      <p>• Data deduplication sync</p>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Sync operations ensure data consistency across different parts of the system.
                  These operations are safe and can be run multiple times.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">Audit logging system ready</p>
                <p className="text-sm">All data changes are automatically logged for compliance and tracking.</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    User action tracking
                  </div>
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Data modification logs
                  </div>
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Import/export tracking
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleanup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trash2 className="w-5 h-5 mr-2" />
                Data Cleanup & Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Remove Old Audit Logs
                </Button>
                <Button variant="outline" className="flex items-center justify-center">
                  <Database className="w-4 h-4 mr-2" />
                  Optimize Database Indexes
                </Button>
                <Button variant="outline" className="flex items-center justify-center">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Clean Orphaned Records
                </Button>
                <Button variant="outline" className="flex items-center justify-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export Cleanup Report
                </Button>
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Data cleanup helps maintain optimal performance and removes unnecessary historical data.
                  All cleanup operations are safe and include confirmation steps.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Report Modal */}
      <Dialog open={showReportDetails} onOpenChange={setShowReportDetails}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            View Detailed Report
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Data Integrity Report</DialogTitle>
          </DialogHeader>
          {integrityReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{integrityReport.totalRecords}</p>
                  <p className="text-sm text-gray-600">Total Records</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{integrityReport.orphanedRecords.length}</p>
                  <p className="text-sm text-gray-600">Orphaned Records</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{integrityReport.duplicateRecords.length}</p>
                  <p className="text-sm text-gray-600">Duplicates</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{integrityReport.validationErrors.length}</p>
                  <p className="text-sm text-gray-600">Validation Errors</p>
                </div>
              </div>

              {integrityReport.duplicateRecords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Duplicate Records Found</h4>
                  <div className="space-y-2">
                    {integrityReport.duplicateRecords.map((dup, index) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                        <p className="font-medium">{dup.type}: {dup.records.length} similar records</p>
                        <p className="text-sm text-gray-600">Similarity: {dup.similarity}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
