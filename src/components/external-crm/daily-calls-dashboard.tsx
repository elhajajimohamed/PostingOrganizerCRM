'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DailyCallCenter, DailyCallSession, CallLog, CallCenter } from '@/lib/types/external-crm';
import { CallCenterDetailModal } from './call-center-detail-modal';
import { CallHistoryPreview } from './call-history-preview';
import {
  Phone,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Building,
  Users,
  Plus,
  RefreshCw,
  Eye,
  ArrowLeft,
} from 'lucide-react';

interface DailyCallsDashboardProps {
  className?: string;
}

export function DailyCallsDashboard({ className }: DailyCallsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [selectedForToday, setSelectedForToday] = useState<DailyCallCenter[]>([]);
  const [alreadyCalled, setAlreadyCalled] = useState<DailyCallCenter[]>([]);
  const [session, setSession] = useState<DailyCallSession | null>(null);
  const [selectedCallCenterIds, setSelectedCallCenterIds] = useState<string[]>([]);
  const [selectedAlreadyCalledIds, setSelectedAlreadyCalledIds] = useState<string[]>([]);
  const [showCallLogDialog, setShowCallLogDialog] = useState(false);
  const [currentCallCenter, setCurrentCallCenter] = useState<DailyCallCenter | null>(null);
  const [callLogData, setCallLogData] = useState({
    outcome: '',
    duration: 0,
    notes: '',
    followUp: 'none',
    steps: [] as Array<{ title: string; description: string; priority: string }>,
    stepDate: new Date().toISOString().split('T')[0],
  });
  const [isLoadingCallList, setIsLoadingCallList] = useState(false);
  const [selectedCallCenter, setSelectedCallCenter] = useState<CallCenter | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadTodayCallList();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTodayCallList = async () => {
    // Prevent multiple simultaneous requests
    if (isLoadingCallList) return;

    try {
      setIsLoadingCallList(true);
      console.log('🔄 [DAILY-CALLS-UI] Loading today call list...');

      const response = await fetch('/api/external-crm/daily-calls?action=generate');

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [DAILY-CALLS-UI] API response received:', data);

        if (data.success) {
          setSelectedForToday(data.data.selectedForToday || []);
          setAlreadyCalled(data.data.alreadyCalled || []);
          setSession(data.data.session);

          console.log('📊 [DAILY-CALLS-UI] Data loaded:', {
            selectedCount: data.data.selectedForToday?.length || 0,
            alreadyCalledCount: data.data.alreadyCalled?.length || 0,
          });
        } else {
          console.error('❌ [DAILY-CALLS-UI] API returned error:', data.error);
        }
      } else {
        console.error('❌ [DAILY-CALLS-UI] API request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [DAILY-CALLS-UI] Error loading today call list:', error);
    } finally {
      setLoading(false);
      setIsLoadingCallList(false);
    }
  };

  const handleCheckboxChange = (callCenterId: string, checked: boolean) => {
    if (checked) {
      setSelectedCallCenterIds(prev => [...prev, callCenterId]);
    } else {
      setSelectedCallCenterIds(prev => prev.filter(id => id !== callCenterId));
    }
  };

  const handleAlreadyCalledCheckboxChange = (callCenterId: string, checked: boolean) => {
    if (checked) {
      setSelectedAlreadyCalledIds(prev => [...prev, callCenterId]);
    } else {
      setSelectedAlreadyCalledIds(prev => prev.filter(id => id !== callCenterId));
    }
  };

  const handleMoveToCalled = async () => {
    if (selectedCallCenterIds.length === 0) return;

    try {
      const response = await fetch('/api/external-crm/daily-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callCenterIds: selectedCallCenterIds }),
      });

      if (response.ok) {
        // Move selected call centers to already called list
        const movedCallCenters = selectedForToday.filter(dailyCC =>
          selectedCallCenterIds.includes(dailyCC.callCenter.id.toString())
        );

        setAlreadyCalled(prev => [...prev, ...movedCallCenters]);
        setSelectedForToday(prev =>
          prev.filter(dailyCC => !selectedCallCenterIds.includes(dailyCC.callCenter.id.toString()))
        );
        setSelectedCallCenterIds([]);
      }
    } catch (error) {
      console.error('Error moving call centers to already called:', error);
    }
  };

  const handleMoveBackToToday = async () => {
    if (selectedAlreadyCalledIds.length === 0) return;

    try {
      const response = await fetch('/api/external-crm/daily-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move_back', callCenterIds: selectedAlreadyCalledIds }),
      });

      if (response.ok) {
        // Move selected call centers back to today's list
        const movedCallCenters = alreadyCalled.filter(dailyCC =>
          selectedAlreadyCalledIds.includes(dailyCC.callCenter.id.toString())
        );

        setSelectedForToday(prev => [...prev, ...movedCallCenters]);
        setAlreadyCalled(prev =>
          prev.filter(dailyCC => !selectedAlreadyCalledIds.includes(dailyCC.callCenter.id.toString()))
        );
        setSelectedAlreadyCalledIds([]);
      }
    } catch (error) {
      console.error('Error moving call centers back to today:', error);
    }
  };

  const handleOpenCallLog = (dailyCallCenter: DailyCallCenter) => {
    setCurrentCallCenter(dailyCallCenter);
    setCallLogData({
      outcome: '',
      duration: 0,
      notes: '',
      followUp: '',
      steps: [],
      stepDate: new Date().toISOString().split('T')[0],
    });
    setShowCallLogDialog(true);
  };

  const handleSaveCallLog = async () => {
    if (!currentCallCenter || !callLogData.outcome || !callLogData.notes) return;

    try {
      console.log('📞 [CALL-LOG] Starting to save call log and steps...');

      // Save call log first
      const callLogResponse = await fetch('/api/external-crm/daily-calls/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: currentCallCenter.callCenter.id.toString(),
          callLog: {
            date: new Date().toISOString(),
            outcome: callLogData.outcome,
            duration: callLogData.duration,
            notes: callLogData.notes,
            followUp: callLogData.followUp,
          },
        }),
      });

      if (!callLogResponse.ok) {
        const errorData = await callLogResponse.json();
        console.error('❌ [CALL-LOG] Failed to save call log:', errorData);
        alert(`Failed to save call log: ${errorData.error || 'Unknown error'}`);
        return;
      }

      console.log('✅ [CALL-LOG] Call log saved successfully');

      // Create steps if any were added
      if (callLogData.steps.length > 0) {
        console.log(`📋 [STEPS] Creating ${callLogData.steps.length} steps...`);

        for (const step of callLogData.steps) {
          if (!step.title.trim()) {
            console.warn('⚠️ [STEPS] Skipping step with empty title');
            continue;
          }

          try {
            console.log(`📝 [STEPS] Creating step: "${step.title}"`);

            // Use the existing step creation service which handles calendar integration
            const stepResponse = await fetch('/api/external-crm/daily-calls/steps', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callCenterId: currentCallCenter.callCenter.id.toString(),
                step: {
                  title: step.title.trim(),
                  description: step.description || '',
                  date: callLogData.stepDate,
                  completed: false,
                  notes: `Created from call log: ${callLogData.notes}`,
                },
              }),
            });

            if (!stepResponse.ok) {
              const errorData = await stepResponse.json();
              console.error('❌ [STEPS] Failed to create step:', step.title, errorData);
              alert(`Failed to create step "${step.title}": ${errorData.error || 'Unknown error'}`);
            } else {
              const result = await stepResponse.json();
              console.log(`✅ [STEPS] Step "${step.title}" created successfully with ID: ${result.stepId}`);
              // Note: Calendar event is already created by the step creation service, no need to duplicate
            }
          } catch (error) {
            console.error('❌ [STEPS] Error creating step:', step.title, error);
            alert(`Error creating step "${step.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else {
        console.log('📋 [STEPS] No steps to create');
      }

      console.log('🎉 [CALL-LOG] Call log and steps saved successfully');
      alert('Call log and steps saved successfully!');

      setShowCallLogDialog(false);
      setCurrentCallCenter(null);
      // Refresh the call list to update call counts
      loadTodayCallList();
    } catch (error) {
      console.error('❌ [CALL-LOG] Error saving call log:', error);
      alert(`Error saving call log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddStep = () => {
    setCallLogData(prev => ({
      ...prev,
      steps: [...prev.steps, { title: '', description: '', priority: 'medium' }]
    }));
  };

  const handleUpdateStep = (index: number, field: string, value: string) => {
    setCallLogData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const handleRemoveStep = (index: number) => {
    setCallLogData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const handleRefresh = async () => {
    if (!isLoadingCallList) {
      await loadTodayCallList();
    }
  };

  const handleViewDetails = (dailyCallCenter: DailyCallCenter) => {
    setSelectedCallCenter(dailyCallCenter.callCenter);
    setShowDetailModal(true);
  };

  const handleUpdateCallCenter = async (updatedCallCenter: CallCenter) => {
    // Update the call center in our local state
    setSelectedForToday(prev =>
      prev.map(dailyCC =>
        dailyCC.callCenter.id === updatedCallCenter.id
          ? { ...dailyCC, callCenter: updatedCallCenter }
          : dailyCC
      )
    );
    setAlreadyCalled(prev =>
      prev.map(dailyCC =>
        dailyCC.callCenter.id === updatedCallCenter.id
          ? { ...dailyCC, callCenter: updatedCallCenter }
          : dailyCC
      )
    );
    setSelectedCallCenter(null);
    setShowDetailModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Daily Calls</h2>
            <p className="text-blue-100 mt-1">
              {selectedForToday.length} call centers to call today • {alreadyCalled.length} already called
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoadingCallList}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingCallList ? 'animate-spin' : ''}`} />
              {isLoadingCallList ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Call Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Call Centers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-blue-600" />
                Today's Call Centers ({selectedForToday.length})
              </div>
              {selectedCallCenterIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleMoveToCalled}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Move to Called ({selectedCallCenterIds.length})
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedForToday.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No call centers selected for today.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleRefresh}
                >
                  Generate Call List
                </Button>
              </div>
            ) : (
              selectedForToday.map((dailyCC) => (
                <div
                  key={dailyCC.callCenter.id}
                  className={`p-4 border rounded-lg transition-all ${
                    dailyCC.needsNewPhoneNumber
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedCallCenterIds.includes(dailyCC.callCenter.id.toString())}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(dailyCC.callCenter.id.toString(), checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm truncate">
                          {dailyCC.callCenter.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {dailyCC.needsNewPhoneNumber && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Add Phone
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {dailyCC.callCount} calls
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {dailyCC.callCenter.city}, {dailyCC.callCenter.country}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {dailyCC.callCenter.positions} positions
                        </div>
                        {dailyCC.lastCalledDate && (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Last called: {new Date(dailyCC.lastCalledDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {dailyCC.callCenter.phones?.slice(0, 2).map((phone, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {phone}
                          </Badge>
                        ))}
                        {dailyCC.callCenter.phones && dailyCC.callCenter.phones.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{dailyCC.callCenter.phones.length - 2} more
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleViewDetails(dailyCC)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleOpenCallLog(dailyCC)}
                        >
                          Log Call
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Call Center Detail Modal */}
        <CallCenterDetailModal
          callCenter={selectedCallCenter}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onUpdate={handleUpdateCallCenter}
        />

        {/* Already Called Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Already Called Today ({alreadyCalled.length})
              </div>
              {selectedAlreadyCalledIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleMoveBackToToday}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Move Back to Today ({selectedAlreadyCalledIds.length})
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alreadyCalled.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No calls completed yet today.</p>
              </div>
            ) : (
              alreadyCalled.map((dailyCC) => (
                <div
                  key={dailyCC.callCenter.id}
                  className={`p-4 border rounded-lg ${
                    dailyCC.needsNewPhoneNumber
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedAlreadyCalledIds.includes(dailyCC.callCenter.id.toString())}
                      onCheckedChange={(checked) =>
                        handleAlreadyCalledCheckboxChange(dailyCC.callCenter.id.toString(), checked as boolean)
                      }
                      className="mt-1"
                    />
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm truncate">
                          {dailyCC.callCenter.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {dailyCC.needsNewPhoneNumber && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Add Phone
                            </Badge>
                          )}
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Called Today
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {dailyCC.callCenter.city}, {dailyCC.callCenter.country}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {dailyCC.callCenter.positions} positions
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewDetails(dailyCC)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Log Dialog */}
      <Dialog open={showCallLogDialog} onOpenChange={setShowCallLogDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Log Call - {currentCallCenter?.callCenter.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Call History Section */}
            {currentCallCenter && (
              <CallHistoryPreview callCenterId={currentCallCenter.callCenter.id.toString()} />
            )}
            {/* Call Outcome */}
            <div>
              <Label htmlFor="outcome">Call Outcome *</Label>
              <Select value={callLogData.outcome} onValueChange={(value) =>
                setCallLogData(prev => ({ ...prev, outcome: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="no-answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="wrong-number">Wrong Number</SelectItem>
                  <SelectItem value="callback-requested">Callback Requested</SelectItem>
                  <SelectItem value="answering-machine">Answering Machine</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <input
                type="number"
                id="duration"
                value={callLogData.duration}
                onChange={(e) =>
                  setCallLogData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                placeholder="0"
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes *</Label>
              <Textarea
                id="notes"
                value={callLogData.notes}
                onChange={(e) =>
                  setCallLogData(prev => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Enter detailed call notes..."
                rows={4}
              />
            </div>

            {/* Follow Up */}
            <div>
              <Label htmlFor="followUp">Follow Up Required</Label>
              <Select value={callLogData.followUp} onValueChange={(value) =>
                setCallLogData(prev => ({ ...prev, followUp: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select follow up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No follow up needed</SelectItem>
                  <SelectItem value="callback">Schedule callback</SelectItem>
                  <SelectItem value="email">Send email</SelectItem>
                  <SelectItem value="meeting">Schedule meeting</SelectItem>
                  <SelectItem value="send-materials">Send materials</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Steps Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium">Steps to Add to Calendar</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddStep}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {/* Step Date */}
              <div className="mb-4">
                <Label htmlFor="stepDate">Step Date</Label>
                <input
                  type="date"
                  id="stepDate"
                  value={callLogData.stepDate}
                  onChange={(e) =>
                    setCallLogData(prev => ({ ...prev, stepDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  title="Select date for calendar steps"
                />
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                {callLogData.steps.map((step, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium">Step {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStep(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`step-title-${index}`}>Title *</Label>
                        <input
                          type="text"
                          id={`step-title-${index}`}
                          value={step.title}
                          onChange={(e) => handleUpdateStep(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Step title"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`step-priority-${index}`}>Priority</Label>
                        <Select
                          value={step.priority}
                          onValueChange={(value) => handleUpdateStep(index, 'priority', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Label htmlFor={`step-description-${index}`}>Description</Label>
                      <Textarea
                        id={`step-description-${index}`}
                        value={step.description}
                        onChange={(e) => handleUpdateStep(index, 'description', e.target.value)}
                        placeholder="Step description..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}

                {callLogData.steps.length === 0 && (
                  <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No steps added yet</p>
                    <p className="text-sm">Steps will be added to your calendar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCallLogDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCallLog}
                disabled={!callLogData.outcome || !callLogData.notes}
              >
                Save Call Log & Add Steps
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}