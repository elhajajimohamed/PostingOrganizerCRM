'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Step, CallLog, Recharge } from '@/lib/types/external-crm';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';
import { formatDuration } from '@/lib/utils/duration';
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  CheckCircle,
  Circle,
  DollarSign,
  Calendar,
  Clock,
  MessageSquare,
  Target,
  TrendingUp
} from 'lucide-react';

interface InteractionHistoryProps {
  callCenterId: string;
  callCenterName: string;
}

export function InteractionHistory({ callCenterId, callCenterName }: InteractionHistoryProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('steps');

  // Selection state for call logs
  const [selectedCallLogs, setSelectedCallLogs] = useState<string[]>([]);

  // Form states
  const [showStepForm, setShowStepForm] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [showRechargeForm, setShowRechargeForm] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | undefined>();
  const [editingCall, setEditingCall] = useState<CallLog | undefined>();
  const [editingRecharge, setEditingRecharge] = useState<Recharge | undefined>();

  // Form data states
  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    completed: false,
    notes: ''
  });

  const [callForm, setCallForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    duration: 0,
    outcome: '',
    notes: '',
    followUp: ''
  });

  const [rechargeForm, setRechargeForm] = useState({
    amount: 0,
    currency: 'MAD',
    date: new Date().toISOString().split('T')[0],
    method: '',
    notes: ''
  });

  useEffect(() => {
    loadAllData();
  }, [callCenterId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [stepsData, callsData, rechargesData] = await Promise.all([
        ExternalCRMSubcollectionsService.getSteps(callCenterId),
        ExternalCRMSubcollectionsService.getCallHistory(callCenterId),
        ExternalCRMSubcollectionsService.getRecharges(callCenterId)
      ]);

      setSteps(stepsData);
      setCallHistory(callsData);
      setRecharges(rechargesData);
    } catch (error) {
      console.error('Error loading interaction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingStep) {
        await ExternalCRMSubcollectionsService.updateStep(callCenterId, editingStep.id, stepForm);
      } else {
        await ExternalCRMSubcollectionsService.addStep(callCenterId, stepForm);
      }

      await loadAllData();
      setShowStepForm(false);
      setEditingStep(undefined);
      resetStepForm();
    } catch (error) {
      console.error('Error saving step:', error);
    }
  };

  // Helper function to convert mm/dd/yyyy and time to ISO string, or use now if empty
  const getCallDateTimeISO = (callDateStr?: string, callTimeStr?: string): string => {
    console.log('🔍 [DEBUG] getCallDateTimeISO called with:', { callDateStr, callTimeStr });

    if (!callDateStr || callDateStr.trim() === '') {
      console.log('🔍 [DEBUG] No date provided, using now');
      return new Date().toISOString();
    }

    // Parse date assuming it's already in yyyy-mm-dd format from date input
    const date = new Date(callDateStr);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format, using now:', callDateStr);
      return new Date().toISOString();
    }

    // Default time values - use current time if no time provided
    let hours = new Date().getHours(), minutes = new Date().getMinutes();
    console.log('🔍 [DEBUG] Initial time values:', { hours, minutes });

    // If time is provided, parse it
    if (callTimeStr && callTimeStr.trim() !== '') {
      const timeParts = callTimeStr.split(':');
      console.log('🔍 [DEBUG] Time parts:', timeParts);
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
        console.log('🔍 [DEBUG] Parsed time:', { hours, minutes });

        // Validate time values
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.warn('Invalid time format, using current time:', callTimeStr);
          hours = new Date().getHours();
          minutes = new Date().getMinutes();
        }
      } else {
        console.log('No valid time format, using current time');
      }
    } else {
      console.log('No time provided, using current time');
    }

    // Set the time on the date object
    date.setHours(hours, minutes, 0, 0);
    const isoString = date.toISOString();
    console.log('🔍 [DEBUG] Final date and ISO:', { date: date.toString(), isoString });

    return isoString;
  };

  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log('🔍 [DEBUG] handleCallSubmit - callForm:', callForm);
      const isoDate = getCallDateTimeISO(callForm.date, callForm.time);
      console.log('🔍 [DEBUG] handleCallSubmit - isoDate:', isoDate);
      const callLogData = {
        ...callForm,
        callTime: callForm.time, // Save the time as callTime for display
        date: isoDate
      };
      console.log('🔍 [DEBUG] handleCallSubmit - callLogData:', callLogData);

      if (editingCall) {
        await ExternalCRMSubcollectionsService.updateCallLog(callCenterId, editingCall.id, callLogData);
      } else {
        await ExternalCRMSubcollectionsService.addCallLog(callCenterId, callLogData);
      }

      await loadAllData();
      setShowCallForm(false);
      setEditingCall(undefined);
      resetCallForm();
    } catch (error) {
      console.error('Error saving call log:', error);
    }
  };

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRecharge) {
        await ExternalCRMSubcollectionsService.updateRecharge(callCenterId, editingRecharge.id, rechargeForm);
      } else {
        await ExternalCRMSubcollectionsService.addRecharge(callCenterId, rechargeForm);
      }

      await loadAllData();
      setShowRechargeForm(false);
      setEditingRecharge(undefined);
      resetRechargeForm();
    } catch (error) {
      console.error('Error saving recharge:', error);
    }
  };

  const resetStepForm = () => {
    setStepForm({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      completed: false,
      notes: ''
    });
  };

  const resetCallForm = () => {
    setCallForm({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      duration: 0,
      outcome: '',
      notes: '',
      followUp: ''
    });
  };

  const resetRechargeForm = () => {
    setRechargeForm({
      amount: 0,
      currency: 'MAD',
      date: new Date().toISOString().split('T')[0],
      method: '',
      notes: ''
    });
  };

  const handleEditStep = (step: Step) => {
    setEditingStep(step);
    setStepForm({
      title: step.title,
      description: step.description,
      date: step.date,
      completed: step.completed,
      notes: step.notes
    });
    setShowStepForm(true);
  };

  const handleEditCall = (call: CallLog) => {
    setEditingCall(call);
    setCallForm({
      date: call.date,
      time: call.callTime || new Date(call.date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      duration: call.duration,
      outcome: call.outcome,
      notes: call.notes,
      followUp: call.followUp
    });
    setShowCallForm(true);
  };

  const handleEditRecharge = (recharge: Recharge) => {
    setEditingRecharge(recharge);
    setRechargeForm({
      amount: recharge.amount,
      currency: recharge.currency,
      date: recharge.date,
      method: recharge.method,
      notes: recharge.notes
    });
    setShowRechargeForm(true);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    try {
      await ExternalCRMSubcollectionsService.deleteStep(callCenterId, stepId);
      await loadAllData();
    } catch (error) {
      console.error('Error deleting step:', error);
    }
  };

  const handleDeleteCall = async (callId: string) => {
    if (!confirm('Are you sure you want to delete this call log?')) return;

    try {
      await ExternalCRMSubcollectionsService.deleteCallLog(callCenterId, callId);
      await loadAllData();
    } catch (error) {
      console.error('Error deleting call log:', error);
    }
  };

  const handleDeleteRecharge = async (rechargeId: string) => {
    if (!confirm('Are you sure you want to delete this recharge record?')) return;

    try {
      await ExternalCRMSubcollectionsService.deleteRecharge(callCenterId, rechargeId);
      await loadAllData();
    } catch (error) {
      console.error('Error deleting recharge:', error);
    }
  };

  // Selection handlers for call logs
  const handleSelectCallLog = (callLogId: string, checked: boolean) => {
    if (checked) {
      setSelectedCallLogs(prev => [...prev, callLogId]);
    } else {
      setSelectedCallLogs(prev => prev.filter(id => id !== callLogId));
    }
  };

  const handleSelectAllCallLogs = (checked: boolean) => {
    if (checked) {
      setSelectedCallLogs(callHistory.map(call => call.id));
    } else {
      setSelectedCallLogs([]);
    }
  };

  const handleBulkDeleteCallLogs = async () => {
    if (selectedCallLogs.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedCallLogs.length} call log${selectedCallLogs.length > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;

    try {
      await ExternalCRMSubcollectionsService.batchDeleteCallLogs(callCenterId, selectedCallLogs);
      setSelectedCallLogs([]);
      await loadAllData();
    } catch (error) {
      console.error('Error bulk deleting call logs:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-4/5"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Interaction History - {callCenterName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="steps" className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Progress Steps ({steps.length})
            </TabsTrigger>
            <TabsTrigger value="calls" className="flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              Call History ({callHistory.length})
            </TabsTrigger>
            <TabsTrigger value="recharges" className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Recharges ({recharges.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Sales Pipeline Steps</h3>
              <Dialog open={showStepForm} onOpenChange={(open) => {
                if (!open) {
                  setShowStepForm(false);
                  setEditingStep(undefined);
                  resetStepForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setShowStepForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingStep ? 'Edit Step' : 'Add Progress Step'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleStepSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="stepTitle">Step Title *</Label>
                      <Input
                        id="stepTitle"
                        value={stepForm.title}
                        onChange={(e) => setStepForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Initial Contact, Demo Scheduled, etc."
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="stepDescription">Description</Label>
                      <Textarea
                        id="stepDescription"
                        value={stepForm.description}
                        onChange={(e) => setStepForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detailed description of this step..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="stepDate">Target Date</Label>
                      <Input
                        id="stepDate"
                        type="date"
                        value={stepForm.date}
                        onChange={(e) => setStepForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="completed"
                        checked={stepForm.completed}
                        onCheckedChange={(checked) => setStepForm(prev => ({ ...prev, completed: !!checked }))}
                      />
                      <Label htmlFor="completed">Mark as completed</Label>
                    </div>

                    <div>
                      <Label htmlFor="stepNotes">Notes</Label>
                      <Textarea
                        id="stepNotes"
                        value={stepForm.notes}
                        onChange={(e) => setStepForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes..."
                        rows={2}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit">
                        {editingStep ? 'Update Step' : 'Add Step'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowStepForm(false);
                          setEditingStep(undefined);
                          resetStepForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No progress steps defined yet.</p>
                <p className="text-sm">Add steps to track your sales pipeline progress.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {step.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${step.completed ? 'line-through text-gray-500' : ''}`}>
                          {step.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditStep(step)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteStep(step.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {step.description && (
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(step.date).toLocaleDateString()}
                        </span>
                        {step.completed && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Completed
                          </Badge>
                        )}
                      </div>
                      {step.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">{step.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calls" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h3 className="font-semibold">Call History & Notes</h3>
                {selectedCallLogs.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {selectedCallLogs.length} selected
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteCallLogs}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Bulk Remove
                    </Button>
                  </div>
                )}
              </div>
              <Dialog open={showCallForm} onOpenChange={(open) => {
                if (!open) {
                  setShowCallForm(false);
                  setEditingCall(undefined);
                  resetCallForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setShowCallForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Log Call
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCall ? 'Edit Call Log' : 'Log New Call'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCallSubmit} className="space-y-4">
                    <div>
                       <Label htmlFor="callDate">Call Date *</Label>
                       <Input
                         id="callDate"
                         type="date"
                         value={callForm.date}
                         onChange={(e) => setCallForm(prev => ({ ...prev, date: e.target.value }))}
                         required
                       />
                     </div>

                     <div>
                       <Label htmlFor="callTime">Call Time (HH:MM format)</Label>
                       <Input
                         id="callTime"
                         type="text"
                         value={callForm.time}
                         onChange={(e) => setCallForm(prev => ({ ...prev, time: e.target.value }))}
                         placeholder="HH:MM"
                         pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                       />
                       <p className="text-xs text-gray-500 mt-1">
                         Enter time in HH:MM format (24-hour). Leave as current time to use now
                       </p>
                     </div>

                     <div>
                       <Label htmlFor="duration">Duration (mm:ss format)</Label>
                       <Input
                         id="duration"
                         type="text"
                         value={callForm.duration ? formatDuration(callForm.duration) : ''}
                         onChange={(e) => {
                           const inputValue = e.target.value;
                           if (inputValue === '') {
                             setCallForm(prev => ({ ...prev, duration: 0 }));
                           } else {
                             const seconds = parseDuration(inputValue);
                             setCallForm(prev => ({ ...prev, duration: seconds }));
                           }
                         }}
                         placeholder="Enter duration in mm:ss format (e.g., 4:05 for 4 minutes 5 seconds)"
                       />
                       {callForm.duration > 0 && (
                         <div className="text-xs text-gray-500 mt-1">
                           Equivalent: {callForm.duration} seconds
                         </div>
                       )}
                     </div>

                    <div>
                      <Label htmlFor="outcome">Call Outcome</Label>
                      <Select value={callForm.outcome} onValueChange={(value) => setCallForm(prev => ({ ...prev, outcome: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="connected">Connected</SelectItem>
                          <SelectItem value="voicemail">Voicemail</SelectItem>
                          <SelectItem value="no-answer">No Answer</SelectItem>
                          <SelectItem value="busy">Busy</SelectItem>
                          <SelectItem value="wrong-number">Wrong Number</SelectItem>
                          <SelectItem value="callback-requested">Callback Requested</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="callNotes">Call Notes</Label>
                      <Textarea
                        id="callNotes"
                        value={callForm.notes}
                        onChange={(e) => setCallForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Notes from the call..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="followUp">Follow-up Actions</Label>
                      <Textarea
                        id="followUp"
                        value={callForm.followUp}
                        onChange={(e) => setCallForm(prev => ({ ...prev, followUp: e.target.value }))}
                        placeholder="Required follow-up actions..."
                        rows={2}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit">
                        {editingCall ? 'Update Call' : 'Log Call'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCallForm(false);
                          setEditingCall(undefined);
                          resetCallForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {callHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No call history yet.</p>
                <p className="text-sm">Start logging your calls to track communication history.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select All checkbox */}
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="select-all-calls"
                    checked={selectedCallLogs.length === callHistory.length && callHistory.length > 0}
                    onCheckedChange={handleSelectAllCallLogs}
                  />
                  <Label htmlFor="select-all-calls" className="text-sm font-medium">
                    Select All ({callHistory.length} call{callHistory.length !== 1 ? 's' : ''})
                  </Label>
                </div>

                {callHistory.map(call => (
                  <div key={call.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <Checkbox
                        checked={selectedCallLogs.includes(call.id)}
                        onCheckedChange={(checked) => handleSelectCallLog(call.id, !!checked)}
                      />
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      <Phone className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={call.outcome === 'connected' ? 'default' : 'secondary'}>
                            {call.outcome}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(call.date).toLocaleDateString()} at {call.callTime || 'N/A'}
                          </span>
                          {call.duration > 0 && (
                            <span className="text-sm text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(call.duration)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCall(call)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteCall(call.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {call.notes && (
                        <p className="text-sm text-gray-600 mt-2">{call.notes}</p>
                      )}
                      {call.followUp && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                          <p className="font-medium text-yellow-800">Follow-up needed:</p>
                          <p className="text-yellow-700">{call.followUp}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recharges" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Financial Transactions</h3>
              <Dialog open={showRechargeForm} onOpenChange={(open) => {
                if (!open) {
                  setShowRechargeForm(false);
                  setEditingRecharge(undefined);
                  resetRechargeForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setShowRechargeForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRecharge ? 'Edit Transaction' : 'Add Financial Transaction'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleRechargeSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="rechargeAmount">Amount *</Label>
                      <Input
                        id="rechargeAmount"
                        type="number"
                        step="0.01"
                        value={rechargeForm.amount}
                        onChange={(e) => setRechargeForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="rechargeCurrency">Currency</Label>
                      <Select value={rechargeForm.currency} onValueChange={(value) => setRechargeForm(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAD">MAD (Morocco)</SelectItem>
                          <SelectItem value="XOF">XOF (West Africa)</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="rechargeDate">Transaction Date *</Label>
                      <Input
                        id="rechargeDate"
                        type="date"
                        value={rechargeForm.date}
                        onChange={(e) => setRechargeForm(prev => ({ ...prev, date: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="rechargeMethod">Payment Method</Label>
                      <Input
                        id="rechargeMethod"
                        value={rechargeForm.method}
                        onChange={(e) => setRechargeForm(prev => ({ ...prev, method: e.target.value }))}
                        placeholder="Bank transfer, cash, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="rechargeNotes">Notes</Label>
                      <Textarea
                        id="rechargeNotes"
                        value={rechargeForm.notes}
                        onChange={(e) => setRechargeForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Transaction notes..."
                        rows={2}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit">
                        {editingRecharge ? 'Update Transaction' : 'Add Transaction'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowRechargeForm(false);
                          setEditingRecharge(undefined);
                          resetRechargeForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {recharges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No transactions yet.</p>
                <p className="text-sm">Track payments, refunds, and other activities.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recharges.map(recharge => (
                  <div key={recharge.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">
                            {recharge.amount.toLocaleString()} {recharge.currency}
                          </span>
                          <Badge variant="outline">{recharge.method}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(recharge.date).toLocaleDateString()}
                        </p>
                        {recharge.notes && (
                          <p className="text-sm text-gray-500 mt-1">{recharge.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditRecharge(recharge)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteRecharge(recharge.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Financial Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Transactions</p>
                      <p className="font-semibold">{recharges.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Amount</p>
                      <p className="font-semibold">
                        {recharges.reduce((sum, r) => sum + r.amount, 0).toLocaleString()} MAD
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">This Month</p>
                      <p className="font-semibold">
                        {recharges.filter(r => {
                          const rechargeDate = new Date(r.date);
                          const now = new Date();
                          return rechargeDate.getMonth() === now.getMonth() &&
                                 rechargeDate.getFullYear() === now.getFullYear();
                        }).length} transactions
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Avg Amount</p>
                      <p className="font-semibold">
                        {recharges.length > 0
                          ? Math.round(recharges.reduce((sum, r) => sum + r.amount, 0) / recharges.length).toLocaleString()
                          : 0
                        } MAD
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
