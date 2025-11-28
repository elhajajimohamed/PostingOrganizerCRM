'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CallLog } from '@/lib/types/external-crm';
import { formatDuration } from '@/lib/utils/duration';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

interface CallHistoryManagementProps {
  callCenterId: string;
}

const OUTCOME_OPTIONS = [
  'Connected',
  'No Answer',
  'Busy',
  'Wrong Number',
  'Voicemail',
  'Meeting Scheduled',
  'Follow-up Needed',
  'Not Interested',
  'Callback Requested',
  'Sale Made',
  'Other'
];

export function CallHistoryManagement({ callCenterId }: CallHistoryManagementProps) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCallLog, setEditingCallLog] = useState<CallLog | undefined>();
  const [formData, setFormData] = useState({
    date: '',
    duration: 0,
    outcome: '',
    notes: '',
    followUp: '',
  });

  useEffect(() => {
    loadCallLogs();
  }, [callCenterId]);

  const loadCallLogs = async () => {
    try {
      const data = await ExternalCRMSubcollectionsService.getCallHistory(callCenterId);
      setCallLogs(data);
    } catch (error) {
      console.error('Error loading call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCallLog) {
        await ExternalCRMSubcollectionsService.updateCallLog(callCenterId, editingCallLog.id, formData);
        setCallLogs(prev => prev.map(c => c.id === editingCallLog.id ? { ...c, ...formData } : c));
      } else {
        const callLogId = await ExternalCRMSubcollectionsService.addCallLog(callCenterId, formData);
        const newCallLog: CallLog = {
          id: callLogId,
          ...formData,
        };
        setCallLogs(prev => [newCallLog, ...prev]); // Add to beginning since sorted by date desc
      }

      setShowForm(false);
      setEditingCallLog(undefined);
      resetForm();
    } catch (error) {
      console.error('Error saving call log:', error);
    }
  };

  const handleEdit = (callLog: CallLog) => {
    setEditingCallLog(callLog);
    setFormData({
      date: callLog.date,
      duration: callLog.duration,
      outcome: callLog.outcome,
      notes: callLog.notes,
      followUp: callLog.followUp,
    });
    setShowForm(true);
  };

  const handleDelete = async (callLogId: string) => {
    if (!confirm('Are you sure you want to delete this call log?')) return;

    try {
      await ExternalCRMSubcollectionsService.deleteCallLog(callCenterId, callLogId);
      setCallLogs(prev => prev.filter(c => c.id !== callLogId));
    } catch (error) {
      console.error('Error deleting call log:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0], // Today's date
      duration: 0,
      outcome: '',
      notes: '',
      followUp: '',
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCallLog(undefined);
    resetForm();
  };


  if (loading) {
    return <div className="text-center py-8">Loading call history...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Call History ({callLogs.length})</h3>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingCallLog(undefined); }}>
              Log Call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCallLog ? 'Edit Call Log' : 'Log New Call'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="outcome">Outcome *</Label>
                <Select value={formData.outcome} onValueChange={(value) => setFormData(prev => ({ ...prev, outcome: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTCOME_OPTIONS.map(outcome => (
                      <SelectItem key={outcome} value={outcome}>
                        {outcome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Details about the call..."
                />
              </div>

              <div>
                <Label htmlFor="followUp">Follow-up Action</Label>
                <Textarea
                  id="followUp"
                  value={formData.followUp}
                  onChange={(e) => setFormData(prev => ({ ...prev, followUp: e.target.value }))}
                  rows={2}
                  placeholder="Next steps or follow-up actions..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCallLog ? 'Update' : 'Log'} Call
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {callLogs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No calls logged yet. Log your first call to track communication history.
            </CardContent>
          </Card>
        ) : (
          callLogs.map(callLog => (
            <Card key={callLog.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="font-semibold">
                        {new Date(callLog.date).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-gray-600">
                        Duration: {formatDuration(callLog.duration)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        callLog.outcome === 'Connected' ? 'bg-green-100 text-green-800' :
                        callLog.outcome === 'Meeting Scheduled' ? 'bg-blue-100 text-blue-800' :
                        callLog.outcome === 'Sale Made' ? 'bg-purple-100 text-purple-800' :
                        callLog.outcome === 'No Answer' || callLog.outcome === 'Busy' ? 'bg-yellow-100 text-yellow-800' :
                        callLog.outcome === 'Not Interested' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {callLog.outcome}
                      </span>
                    </div>
                    {callLog.notes && (
                      <p className="text-sm text-gray-700 mb-2">{callLog.notes}</p>
                    )}
                    {callLog.followUp && (
                      <p className="text-sm text-blue-600 italic">
                        <span className="font-medium">Follow-up:</span> {callLog.followUp}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(callLog)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(callLog.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
