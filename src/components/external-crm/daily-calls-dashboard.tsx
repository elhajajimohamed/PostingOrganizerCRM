'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyCallCenter, DailyCallSession, CallLog, CallCenter, DailyCallHistory } from '@/lib/types/external-crm';
import { CallCenterDetailModal } from './call-center-detail-modal';
import { CallHistoryPreview } from './call-history-preview';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import { formatDuration, parseDuration, isValidDuration } from '@/lib/utils/duration';
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
  ChevronDown,
  MessageSquare,
  Edit,
  X,
} from 'lucide-react';

interface DailyCallsDashboardProps {
  className?: string;
}

// Disposition color mapping
const DISPOSITION_COLORS = {
  // Positive or Progressing Outcomes (Green family)
  'interested': '#27AE60', // Bright Green
  'quote_requested': '#2ECC71', // Emerald
  'callback': '#1ABC9C', // Green-Blue
  'trial_requested': '#3498DB', // Sky Blue
  'technical_contact': '#2980B9', // Royal Blue
  'meeting_scheduled': '#5D6DFF', // Blue-Purple
  'satisfied': '#16A085', // Teal

  // Neutral / Temporary Blockers (Yellow family)
  'no_budget': '#F1C40F', // Amber
  'competitor': '#D4AC0D', // Mustard
  'not_with_them': '#F7DC6F', // Soft Yellow

  // Operational Issues (Gray family)
  'wrong_number': '#D5D8DC', // Light Gray
  'duplicate': '#A6ACAF', // Medium Gray

  // Hard Negatives (Red family)
  'spam': '#E74C3C', // Bright Red
  'dead': '#922B21', // Dark Red
  'noc': '#000000', // Black
  'closed': '#424949', // Charcoal
  'out': '#2E4053', // Slate Gray
  'abusive': '#7B241C', // Blood Red

  // Uncertain / No Clear Answer (Orange family)
  'nc': '#E67E22', // Orange
  'busy': '#F39C12', // Soft Orange
  'noanswer': '#E57373', // Light Red / Coral
} as const;

// Disposition descriptions and CRM actions
const DISPOSITION_INFO = {
  // Positive or Progressing Outcomes
  'interested': {
    description: '✔ Customer wants solution or more info',
    crmActions: [
      'Create follow-up task',
      'Moves to Prospect stage',
      'Exclude from daily suggestions until next step is completed'
    ]
  },
  'quote_requested': {
    description: '✔ Asked for a quotation',
    crmActions: [
      'Create "Prepare Quote" task',
      'Exclude until quote is delivered',
      'Schedule follow-up call'
    ]
  },
  'callback': {
    description: '✔ Prospect asked to call back at a specific time',
    crmActions: [
      'Create callback task',
      'Exclude from suggestions until callback time'
    ]
  },
  'trial_requested': {
    description: '✔ Wants to try/demo your VoIP',
    crmActions: [
      'Provision trial',
      'Create 48h review task',
      'Exclude until review is done'
    ]
  },
  'technical_contact': {
    description: '✔ Wants to speak to technical team',
    crmActions: [
      'Create meeting task',
      'Exclude until the meeting ends'
    ]
  },
  'meeting_scheduled': {
    description: '✔ Meeting booked',
    crmActions: [
      'Create calendar event',
      'Exclude until meeting is done',
      'Then manual follow-up'
    ]
  },
  'satisfied': {
    description: '✔ Already using your service, satisfied',
    crmActions: [
      'Schedule satisfaction check in 30 days',
      'Do NOT include in daily call suggestions'
    ]
  },

  // Neutral / Temporary Blockers
  'no_budget': {
    description: '✔ Interested but no money right now',
    crmActions: [
      'Follow-up in 90 days',
      'Exclude until then'
    ]
  },
  'competitor': {
    description: '✔ Uses competitor today',
    crmActions: [
      'Tag competitor',
      'Follow-up in 180 days',
      'Exclude until then'
    ]
  },
  'not_with_them': {
    description: '✔ The person you asked for left the company',
    crmActions: [
      'Notify: "Add new contact"',
      'Keep company in suggestions AFTER new contact is added'
    ]
  },

  // Operational Issues
  'wrong_number': {
    description: '❌ Number incorrect',
    crmActions: [
      'Notify: "Add new number"',
      'Exclude until a new number is added'
    ]
  },
  'duplicate': {
    description: '❌ Already called earlier',
    crmActions: [
      'Exclude for 13 days'
    ]
  },

  // Hard Negatives
  'spam': {
    description: '❌ They don\'t want calls',
    crmActions: [
      'Exclude for 365 days',
      '(You may allow revival after 1 year)'
    ]
  },
  'dead': {
    description: '❌ Prospect who wastes your time, insults, manipulates, lies, or clearly has no seriousness',
    crmActions: [
      'Exclude forever from suggestions',
      'Add tag "DEAD_LEAD"',
      'Optional 2nd phone number test ONCE if needed',
      'If same behavior → permanent delete'
    ]
  },
  'noc': {
    description: '❌ Not relevant to your business',
    crmActions: [
      'Exclude forever',
      'Tag as NOC',
      'No follow-up tasks ever again'
    ]
  },
  'closed': {
    description: '❌ Business no longer operating',
    crmActions: [
      'Exclude forever',
      'Tag CLOSED',
      'Archive automatically'
    ]
  },
  'out': {
    description: '❌ Not a call center + Not BPO + Not reseller (ex: restaurant, transport company)',
    crmActions: [
      'Exclude forever',
      'Tag OUT_TARGET'
    ]
  },
  'abusive': {
    description: '❌ Toxic interactions',
    crmActions: [
      'Exclude forever',
      'Tag ABUSIVE'
    ]
  },

  // Uncertain / No Clear Answer
  'nc': {
    description: '❌ They understood but aren\'t interested now',
    crmActions: [
      'Follow-up in 120 days',
      'Exclude until then'
    ]
  },
  'busy': {
    description: '❌ They said "I\'m busy, call later"',
    crmActions: [
      'Exclude for 7 days',
      'Create soft follow-up'
    ]
  },
  'noanswer': {
    description: '❌ They were engaged before but now silent',
    crmActions: [
      'After 5 unanswered calls:',
      '→ Notification: "Add more phone numbers"',
      'Exclude for 7 days each time'
    ]
  }
} as const;

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
    disposition: '' as 'interested' | 'quote_requested' | 'callback' | 'trial_requested' | 'no_budget' | 'technical_contact' | 'competitor' | 'wrong_number' | 'duplicate' | 'spam' | 'satisfied' | 'not_with_them' | 'meeting_scheduled' | 'dead' | 'noc' | 'closed' | 'out' | 'abusive' | 'nc' | 'busy' | 'noanswer' | '',
    followUpAction: '' as 'dnc' | 'nwt' | 'satisfied' | '',
    callbackDate: '',
    meetingDate: '',
    meetingLocation: '',
    competitorName: '',
    callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
    callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
  });
  const [isLoadingCallList, setIsLoadingCallList] = useState(false);
  const [selectedCallCenter, setSelectedCallCenter] = useState<CallCenter | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [callHistory, setCallHistory] = useState<DailyCallHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [pendingDisposition, setPendingDisposition] = useState<{
    callCenter: DailyCallCenter;
    outcome: string;
    duration: number;
    notes: string;
  } | null>(null);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    positions: '',
    businessType: '',
    phones: '',
    emails: '',
    website: '',
    address: '',
    source: '',
    tags: '',
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [savingCallLog, setSavingCallLog] = useState(false);

  // Helper function to convert phones field to array
  const getPhoneArray = (phones: any): string[] => {
    if (!phones) return [];
    if (Array.isArray(phones)) return phones;
    if (typeof phones === 'string') return phones.split(';').map(p => p.trim()).filter(p => p);
    return [];
  };

  // Helper function to combine date and time into ISO string
  const getCallDateTimeISO = (callDateStr?: string, callTimeStr?: string): string => {
    let date: Date;

    // Parse date (mm/dd/yyyy format)
    if (callDateStr && callDateStr.trim() !== '') {
      const parts = callDateStr.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts.map(p => parseInt(p, 10));
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
          date = new Date(year, month - 1, day); // month is 0-indexed
          if (isNaN(date.getTime())) {
            console.warn('Invalid date, using today:', callDateStr);
            date = new Date();
          }
        } else {
          console.warn('Invalid date numbers, using today:', callDateStr);
          date = new Date();
        }
      } else {
        console.warn('Invalid date format, using today:', callDateStr);
        date = new Date();
      }
    } else {
      date = new Date();
    }

    // Parse and apply time (HH:MM format)
    if (callTimeStr && callTimeStr.trim() !== '') {
      const timeParts = callTimeStr.split(':');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);

        if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          date.setHours(hours, minutes, 0, 0); // Set hours, minutes, seconds=0, milliseconds=0
        } else {
          console.warn('Invalid time format, keeping current time:', callTimeStr);
        }
      } else {
        console.warn('Invalid time format, keeping current time:', callTimeStr);
      }
    }

    return date.toISOString();
  };

  useEffect(() => {
    loadTodayCallList();
    loadCallHistory();
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

        // Log history for each moved call center
        for (const callCenter of movedCallCenters) {
          await fetch('/api/external-crm/daily-calls/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callCenterId: callCenter.callCenter.id,
              callCenterName: callCenter.callCenter.name,
              action: 'moved_to_called',
              details: {},
            }),
          });
        }

        setSelectedCallCenterIds([]);
        loadCallHistory(); // Refresh history
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

        // Log history for each moved back call center
        for (const callCenter of movedCallCenters) {
          await fetch('/api/external-crm/daily-calls/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callCenterId: callCenter.callCenter.id,
              callCenterName: callCenter.callCenter.name,
              action: 'moved_back_to_today',
              details: {},
            }),
          });
        }

        setSelectedAlreadyCalledIds([]);
        loadCallHistory(); // Refresh history
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
      followUp: 'none',
      disposition: '',
      followUpAction: '',
      callbackDate: '',
      meetingDate: '',
      meetingLocation: '',
      competitorName: '',
      callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
      callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
    });
    setShowCallLogDialog(true);
  };

  const handleManualOverride = async (dailyCallCenter: DailyCallCenter, reason: string) => {
    if (!reason.trim()) {
      alert('Please provide a reason for the manual override');
      return;
    }

    try {
      // Log the manual override
      await fetch('/api/external-crm/daily-calls/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: dailyCallCenter.callCenter.id,
          callCenterName: dailyCallCenter.callCenter.name,
          action: 'manual_override',
          details: {
            override_reason: reason,
            override_by_agent: 'current_user', // TODO: Get actual user
            filter_bypassed: '15_day_cool_off', // Could be configurable
          },
        }),
      });

      // Add to today's list despite filters
      setSelectedForToday(prev => [...prev, dailyCallCenter]);

      alert(`Manual override applied: ${reason}`);
    } catch (error) {
      console.error('Error applying manual override:', error);
      alert('Failed to apply manual override');
    }
  };

  const handleQuickCall = (dailyCallCenter: DailyCallCenter) => {
    // Open call log dialog for quick logging
    handleOpenCallLog(dailyCallCenter);
  };

  const handleMarkDNC = async (dailyCallCenter: DailyCallCenter) => {
    if (confirm(`Mark ${dailyCallCenter.callCenter.name} as Do Not Call?`)) {
      // Log DNC action
      await fetch('/api/external-crm/daily-calls/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: dailyCallCenter.callCenter.id,
          callCenterName: dailyCallCenter.callCenter.name,
          action: 'marked_dnc',
          details: { dnc_reason: 'Manual DNC mark' },
        }),
      });

      // Move to already called
      setSelectedCallCenterIds([dailyCallCenter.callCenter.id.toString()]);
      await handleMoveToCalled();
    }
  };

  const handleMarkInvalid = async (dailyCallCenter: DailyCallCenter) => {
    if (confirm(`Mark phone number as invalid for ${dailyCallCenter.callCenter.name}?`)) {
      // Log invalid number action
      await fetch('/api/external-crm/daily-calls/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: dailyCallCenter.callCenter.id,
          callCenterName: dailyCallCenter.callCenter.name,
          action: 'marked_invalid',
          details: { invalid_reason: 'Manual invalid mark' },
        }),
      });

      // Move to already called
      setSelectedCallCenterIds([dailyCallCenter.callCenter.id.toString()]);
      await handleMoveToCalled();
    }
  };

  const handleUseNextNumber = (dailyCallCenter: DailyCallCenter) => {
    // Cycle to next phone number
    const phoneCount = dailyCallCenter.callCenter.phones?.length || 0;
    if (phoneCount > 1) {
      const nextIndex = ((dailyCallCenter.phone_index || 0) + 1) % phoneCount;
      // Update local state
      setSelectedForToday(prev =>
        prev.map(cc =>
          cc.callCenter.id === dailyCallCenter.callCenter.id
            ? { ...cc, phone_index: nextIndex }
            : cc
        )
      );
    }
  };

  const handleSaveCallLog = async () => {
    console.log('📞 [CALL-LOG] Save button clicked');
    console.log('📞 [CALL-LOG] Current data:', {
      currentCallCenter: !!currentCallCenter,
      outcome: callLogData.outcome,
      notes: callLogData.notes,
      duration: callLogData.duration
    });
    
    if (!currentCallCenter) {
      console.error('❌ [CALL-LOG] No call center selected');
      alert('No call center selected');
      return;
    }
    
    if (!callLogData.outcome) {
      console.error('❌ [CALL-LOG] No outcome selected');
      alert('Please select a call outcome');
      return;
    }
    
    if (!callLogData.notes) {
      console.error('❌ [CALL-LOG] No notes provided');
      alert('Please enter call notes');
      return;
    }

    setSavingCallLog(true);
    try {
      console.log('📞 [CALL-LOG] Starting to save call log and steps...');

      // Determine disposition based on outcome if not set
      let disposition = callLogData.disposition;
      if (!disposition) {
        switch (callLogData.outcome) {
          case 'answered':
            disposition = 'interested'; // Default for answered calls
            break;
          case 'no-answer':
          case 'busy':
          case 'voicemail':
          case 'answering-machine':
            disposition = 'not_with_them';
            break;
          case 'wrong-number':
            disposition = 'wrong_number';
            break;
          case 'callback-requested':
            disposition = 'callback';
            break;
          case 'rejected':
            disposition = 'competitor';
            break;
          default:
            disposition = 'not_with_them';
        }
      }

      console.log('📞 [CALL-LOG] Disposition determined:', disposition);

      // Force disposition selection for answered calls only if no disposition is set
      if (callLogData.outcome === 'answered' && !callLogData.disposition) {
        console.log('📞 [CALL-LOG] Need to select disposition for answered call');
        setPendingDisposition({
          callCenter: currentCallCenter,
          outcome: callLogData.outcome,
          duration: callLogData.duration,
          notes: callLogData.notes,
        });
        setShowDispositionDialog(true);
        setSavingCallLog(false);
        return;
      }

      // Save directly for other outcomes or when disposition is already set
      console.log('📞 [CALL-LOG] Saving directly...');
      await saveCallLogDirect(disposition);
    } catch (error) {
      console.error('❌ [CALL-LOG] Error saving call log:', error);
      alert(`Error saving call log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingCallLog(false);
    }
  };

  const saveCallLogWithDisposition = async (disposition: string) => {
    if (!currentCallCenter || !pendingDisposition) return;

    try {
      // Save call log first
      const callLogResponse = await fetch('/api/external-crm/daily-calls/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: currentCallCenter.callCenter.id.toString(),
          callLog: {
            date: getCallDateTimeISO(callLogData.callDate, callLogData.callTime),
            outcome: pendingDisposition.outcome,
            duration: pendingDisposition.duration,
            notes: pendingDisposition.notes,
            followUp: callLogData.followUp,
            disposition: disposition,
            phone_used: currentCallCenter.callCenter.phones?.[currentCallCenter.phone_index || 0],
            phone_index: currentCallCenter.phone_index || 0,
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

      // Handle automatic actions based on disposition
      await handleDispositionActions(disposition, currentCallCenter);

      // Auto-move call center from "Today's Call Centers" to "Already Called Today"
      console.log('🔄 [CALL-LOG] Auto-moving call center to already called list...');
      
      // Move the call center to already called list
      setSelectedForToday(prev => prev.filter(dailyCC => dailyCC.callCenter.id !== currentCallCenter.callCenter.id));
      setAlreadyCalled(prev => [...prev, currentCallCenter]);
      
      // Update session to reflect the move
      const callCenterId = currentCallCenter.callCenter.id.toString();
      try {
        await fetch('/api/external-crm/daily-calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callCenterIds: [callCenterId] }),
        });
        console.log('✅ [CALL-LOG] Session updated successfully');
      } catch (sessionError) {
        console.warn('⚠️ [CALL-LOG] Failed to update session, but call log was saved:', sessionError);
      }

      // Log the call action to history
      await fetch('/api/external-crm/daily-calls/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: currentCallCenter.callCenter.id,
          callCenterName: currentCallCenter.callCenter.name,
          action: 'call_logged',
          details: {
            outcome: pendingDisposition.outcome,
            duration: pendingDisposition.duration,
            notes: pendingDisposition.notes,
            disposition: disposition,
          },
        }),
      });

      alert('Call log and steps saved successfully! Call center moved to "Already Called Today" list.');

      setShowCallLogDialog(false);
      setShowDispositionDialog(false);
      setCurrentCallCenter(null);
      setPendingDisposition(null);

      // Refresh the call list and history
      loadTodayCallList();
      loadCallHistory();
    } catch (error) {
      console.error('❌ [CALL-LOG] Error saving call log:', error);
      alert(`Error saving call log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const saveCallLogDirect = async (disposition: string) => {
    if (!currentCallCenter) return;

    try {
      console.log('📞 [CALL-LOG-DIRECT] Saving call log directly...');

      const requestBody = {
        callCenterId: currentCallCenter.callCenter.id.toString(),
        callLog: {
          date: getCallDateTimeISO(callLogData.callDate, callLogData.callTime),
          outcome: callLogData.outcome,
          duration: callLogData.duration,
          notes: callLogData.notes,
          followUp: callLogData.followUp,
          disposition: disposition,
          phone_used: currentCallCenter.callCenter.phones?.[currentCallCenter.phone_index || 0],
          phone_index: currentCallCenter.phone_index || 0,
        },
      };

      console.log('📞 [CALL-LOG-DIRECT] Request body to be sent:', requestBody);
      console.log('📞 [CALL-LOG-DIRECT] JSON.stringify result:', JSON.stringify(requestBody));
      console.log('📞 [CALL-LOG-DIRECT] JSON length:', JSON.stringify(requestBody).length);

      // Save call log directly
      const callLogResponse = await fetch('/api/external-crm/daily-calls/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: currentCallCenter.callCenter.id.toString(),
          callLog: {
            date: getCallDateTimeISO(callLogData.callDate, callLogData.callTime),
            outcome: callLogData.outcome,
            duration: callLogData.duration,
            notes: callLogData.notes,
            followUp: callLogData.followUp,
            disposition: disposition,
            phone_used: currentCallCenter.callCenter.phones?.[currentCallCenter.phone_index || 0],
            phone_index: currentCallCenter.phone_index || 0,
          },
        }),
      });

      if (!callLogResponse.ok) {
        const errorData = await callLogResponse.json();
        console.error('❌ [CALL-LOG-DIRECT] Failed to save call log:', errorData);
        alert(`Failed to save call log: ${errorData.error || 'Unknown error'}`);
        return;
      }

      console.log('✅ [CALL-LOG-DIRECT] Call log saved successfully');

      // Handle automatic actions based on disposition
      await handleDispositionActions(disposition, currentCallCenter);

      // Auto-move call center from "Today's Call Centers" to "Already Called Today"
      console.log('🔄 [CALL-LOG-DIRECT] Auto-moving call center to already called list...');
      
      // Move the call center to already called list
      setSelectedForToday(prev => prev.filter(dailyCC => dailyCC.callCenter.id !== currentCallCenter.callCenter.id));
      setAlreadyCalled(prev => [...prev, currentCallCenter]);
      
      // Update session to reflect the move
      const callCenterId = currentCallCenter.callCenter.id.toString();
      try {
        await fetch('/api/external-crm/daily-calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callCenterIds: [callCenterId] }),
        });
        console.log('✅ [CALL-LOG-DIRECT] Session updated successfully');
      } catch (sessionError) {
        console.warn('⚠️ [CALL-LOG-DIRECT] Failed to update session, but call log was saved:', sessionError);
      }

      // Log the call action to history
      await fetch('/api/external-crm/daily-calls/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: currentCallCenter.callCenter.id,
          callCenterName: currentCallCenter.callCenter.name,
          action: 'call_logged',
          details: {
            outcome: callLogData.outcome,
            duration: callLogData.duration,
            notes: callLogData.notes,
            disposition: disposition,
          },
        }),
      });

      alert('Call log saved successfully! Call center moved to "Already Called Today" list.');

      // Reset form and close dialog
      setShowCallLogDialog(false);
      setCurrentCallCenter(null);
      setCallLogData({
        outcome: '',
        duration: 0,
        notes: '',
        followUp: 'none',
        disposition: '',
        followUpAction: '',
        callbackDate: '',
        meetingDate: '',
        meetingLocation: '',
        competitorName: '',
        callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
        callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
      });

      // Refresh the call list and history
      loadTodayCallList();
      loadCallHistory();
    } catch (error) {
      console.error('❌ [CALL-LOG-DIRECT] Error saving call log:', error);
      alert(`Error saving call log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDispositionActions = async (disposition: string, callCenter: DailyCallCenter) => {
    switch (disposition) {
      // Positive or Progressing Outcomes
      case 'interested':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Follow up on interest',
              description: 'Customer showed interest - follow up within 24 hours',
              date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from interested disposition',
              priority: 'high',
            },
          }),
        });
        break;

      case 'quote_requested':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Prepare and send quote',
              description: 'Customer requested a quotation',
              date: new Date().toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from quote requested disposition',
              priority: 'high',
            },
          }),
        });
        break;

      case 'callback':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Customer requested callback',
              description: 'Customer asked to be called back',
              date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from callback disposition',
              priority: 'medium',
            },
          }),
        });
        break;

      case 'trial_requested':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Set up trial/demo',
              description: 'Customer wants to try/demo VoIP service',
              date: new Date().toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from trial requested disposition',
              priority: 'high',
            },
          }),
        });
        break;

      case 'technical_contact':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Book technical meeting',
              description: 'Customer wants to speak to technical team',
              date: new Date().toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from technical contact disposition',
              priority: 'high',
            },
          }),
        });
        break;

      case 'meeting_scheduled':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Meeting scheduled',
              description: 'Meeting booked with customer',
              date: new Date().toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from meeting scheduled disposition',
              priority: 'high',
            },
          }),
        });
        break;

      case 'satisfied':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Satisfaction check',
              description: 'Schedule satisfaction check in 30 days',
              date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from satisfied disposition',
              priority: 'low',
            },
          }),
        });
        break;

      // Neutral / Temporary Blockers
      case 'no_budget':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Follow-up on budget',
              description: 'Interested but no budget - follow-up in 90 days',
              date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from no budget disposition',
              priority: 'low',
            },
          }),
        });
        break;

      case 'competitor':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Competitor follow-up',
              description: 'Uses competitor - follow-up in 180 days',
              date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from competitor disposition',
              priority: 'low',
            },
          }),
        });
        break;

      case 'not_with_them':
        // Show notification to add new contact (handled in UI)
        break;

      // Operational Issues
      case 'wrong_number':
        // Show notification to add new number (handled in UI)
        break;

      case 'duplicate':
        // Exclude for 13 days (handled by scoring system)
        break;

      // Hard Negatives
      case 'spam':
        await fetch('/api/external-crm/daily-calls/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id,
            callCenterName: callCenter.callCenter.name,
            action: 'marked_dnc',
            details: { dnc_reason: 'Disposition marked as spam' },
          }),
        });
        break;

      case 'dead':
        await fetch('/api/external-crm/daily-calls/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id,
            callCenterName: callCenter.callCenter.name,
            action: 'marked_dnc',
            details: { dnc_reason: 'Disposition marked as dead/toxic lead' },
          }),
        });
        break;

      case 'noc':
        await fetch('/api/external-crm/daily-calls/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id,
            callCenterName: callCenter.callCenter.name,
            action: 'marked_dnc',
            details: { dnc_reason: 'Disposition marked as not a call center' },
          }),
        });
        break;

      case 'closed':
        await fetch('/api/external-crm/daily-calls/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id,
            callCenterName: callCenter.callCenter.name,
            action: 'marked_dnc',
            details: { dnc_reason: 'Disposition marked as company closed' },
          }),
        });
        break;

      case 'out':
        await fetch('/api/external-crm/daily-calls/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id,
            callCenterName: callCenter.callCenter.name,
            action: 'marked_dnc',
            details: { dnc_reason: 'Disposition marked as out of target' },
          }),
        });
        break;

      case 'abusive':
        await fetch('/api/external-crm/daily-calls/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id,
            callCenterName: callCenter.callCenter.name,
            action: 'marked_dnc',
            details: { dnc_reason: 'Disposition marked as abusive' },
          }),
        });
        break;

      // Uncertain / No Clear Answer
      case 'nc':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Follow-up - not convinced',
              description: 'Customer understood but not interested now - follow-up in 120 days',
              date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from not convinced disposition',
              priority: 'low',
            },
          }),
        });
        break;

      case 'busy':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Soft follow-up',
              description: 'Customer was busy - call back in 7 days',
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from busy disposition',
              priority: 'low',
            },
          }),
        });
        break;

      case 'noanswer':
        // After 5 unanswered calls, show notification to add more numbers (handled in UI)
        break;

      // Legacy cases
      case 'no_answer':
      case 'not_interested':
        await fetch('/api/external-crm/daily-calls/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id.toString(),
            step: {
              title: 'Pause outreach - not interested',
              description: 'Customer indicated not interested - pause for 60 days',
              date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              completed: false,
              notes: 'Auto-created from not interested disposition',
              priority: 'low',
            },
          }),
        });
        break;

      case 'invalid_number':
        await fetch('/api/external-crm/daily-calls/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id,
            callCenterName: callCenter.callCenter.name,
            action: 'marked_invalid',
            details: { invalid_reason: 'Disposition marked as invalid number' },
          }),
        });
        break;

      case 'dnc':
        await fetch('/api/external-crm/daily-calls/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: callCenter.callCenter.id,
            callCenterName: callCenter.callCenter.name,
            action: 'marked_dnc',
            details: { dnc_reason: 'Disposition marked as DNC' },
          }),
        });
        break;
    }
  };

  const handleContactSubmit = async () => {
    if (!currentCallCenter || !contactForm.name || !contactForm.position) {
      alert('Name and position are required');
      return;
    }

    try {
      const contactData = {
        name: contactForm.name,
        position: contactForm.position,
        email: contactForm.email,
        phone: contactForm.phone,
        notes: contactForm.notes,
        lastContact: new Date().toISOString()
      };

      const response = await fetch(`/api/external-crm/call-centers/${currentCallCenter.callCenter.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });

      if (response.ok) {
        alert('Contact added successfully!');
        setShowContactDialog(false);
        setContactForm({
          name: '',
          position: '',
          email: '',
          phone: '',
          notes: ''
        });
      } else {
        alert('Failed to add contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact');
    }
  };

  const handleWhatsApp = (dailyCallCenter: DailyCallCenter) => {
    // Use the current phone number based on phone_index
    const currentPhoneIndex = dailyCallCenter.phone_index || 0;
    const currentPhone = dailyCallCenter.callCenter.phones?.[currentPhoneIndex];
    
    if (currentPhone) {
      const cleanPhone = currentPhone.replace(/\s+/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else {
      alert('No phone number available');
    }
  };

  const handleEdit = (dailyCallCenter: DailyCallCenter) => {
    setCurrentCallCenter(dailyCallCenter);
    setFormData({
      name: dailyCallCenter.callCenter.name || '',
      country: dailyCallCenter.callCenter.country || '',
      city: dailyCallCenter.callCenter.city || '',
      positions: dailyCallCenter.callCenter.positions?.toString() || '',
      businessType: dailyCallCenter.callCenter.businessType || '',
      phones: dailyCallCenter.callCenter.phones?.join(', ') || '',
      emails: dailyCallCenter.callCenter.emails?.join(', ') || '',
      website: dailyCallCenter.callCenter.website || '',
      address: dailyCallCenter.callCenter.address || '',
      source: dailyCallCenter.callCenter.source || '',
      tags: dailyCallCenter.callCenter.tags?.join(', ') || '',
      notes: dailyCallCenter.callCenter.notes || '',
      priority: 'medium'
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!currentCallCenter) return;

    try {
      const updateData = {
        name: formData.name,
        country: formData.country,
        city: formData.city,
        positions: parseInt(formData.positions) || 0,
        businessType: formData.businessType,
        phones: formData.phones.split(',').map(p => p.trim()).filter(p => p),
        emails: formData.emails.split(',').map(e => e.trim()).filter(e => e),
        website: formData.website,
        address: formData.address,
        source: formData.source,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        notes: formData.notes,
        priority: formData.priority,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`/api/external-crm/call-centers/${currentCallCenter.callCenter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        alert('Call center updated successfully!');
        setShowEditDialog(false);
        setCurrentCallCenter(null);
        setFormData({
          name: '',
          country: '',
          city: '',
          positions: '',
          businessType: '',
          phones: '',
          emails: '',
          website: '',
          address: '',
          source: '',
          tags: '',
          notes: '',
          priority: 'medium'
        });
        // Refresh the call list
        loadTodayCallList();
      } else {
        alert('Failed to update call center');
      }
    } catch (error) {
      console.error('Error updating call center:', error);
      alert('Failed to update call center');
    }
  };



  const loadCallHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch('/api/external-crm/daily-calls/history?limit=100');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCallHistory(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading call history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRefresh = async () => {
    if (!isLoadingCallList) {
      await loadTodayCallList();
      await loadCallHistory();
    }
  };

  const handleRegenerateList = async () => {
    if (isLoadingCallList) return;

    if (confirm('This will replace the current daily calls list with a new one. Continue?')) {
      try {
        setIsLoadingCallList(true);
        console.log('🔄 [DAILY-CALLS-UI] Regenerating call list...');

        const response = await fetch('/api/external-crm/daily-calls?action=regenerate');

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [DAILY-CALLS-UI] Regenerate API response received:', data);

          if (data.success) {
            setSelectedForToday(data.data.selectedForToday || []);
            setAlreadyCalled(data.data.alreadyCalled || []);
            setSession(data.data.session);

            console.log('📊 [DAILY-CALLS-UI] New list generated:', {
              selectedCount: data.data.selectedForToday?.length || 0,
              alreadyCalledCount: data.data.alreadyCalled?.length || 0,
            });

            alert('New daily calls list generated successfully!');
          } else {
            console.error('❌ [DAILY-CALLS-UI] Regenerate API returned error:', data.error);
            alert(`Failed to regenerate list: ${data.error || 'Unknown error'}`);
          }
        } else {
          console.error('❌ [DAILY-CALLS-UI] Regenerate API request failed:', response.status, response.statusText);
          alert('Failed to regenerate daily calls list');
        }
      } catch (error) {
        console.error('❌ [DAILY-CALLS-UI] Error regenerating call list:', error);
        alert(`Error regenerating call list: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoadingCallList(false);
      }
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

  const handleRemoveFromSuggestions = async (dailyCallCenter: DailyCallCenter) => {
    if (confirm(`Remove "${dailyCallCenter.callCenter.name}" from daily suggestions? This call center will be excluded from future daily call lists.`)) {
      try {
        // Mark the call center as excluded from daily suggestions
        const response = await fetch(`/api/external-crm/call-centers/${dailyCallCenter.callCenter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exclude_from_daily_suggestions: true,
            updatedAt: new Date().toISOString()
          })
        });

        if (response.ok) {
          // Remove from current list immediately
          setSelectedForToday(prev =>
            prev.filter(dailyCC => dailyCC.callCenter.id !== dailyCallCenter.callCenter.id)
          );

          alert(`"${dailyCallCenter.callCenter.name}" has been removed from daily suggestions.`);
        } else {
          alert('Failed to remove call center from suggestions');
        }
      } catch (error) {
        console.error('Error removing call center from suggestions:', error);
        alert('Failed to remove call center from suggestions');
      }
    }
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
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Daily Progress</span>
                <span>{alreadyCalled.length}/{selectedForToday.length + alreadyCalled.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${selectedForToday.length + alreadyCalled.length > 0 ? (alreadyCalled.length / (selectedForToday.length + alreadyCalled.length)) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerateList}
              disabled={isLoadingCallList}
              className="bg-orange-600/20 text-white border-orange-500/30 hover:bg-orange-600/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingCallList ? 'animate-spin' : ''}`} />
              {isLoadingCallList ? 'Generating...' : 'Generate Another List'}
            </Button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          >
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Call History ({callHistory.length})
            <ChevronDown
              className={`w-4 h-4 ml-auto transition-transform ${isHistoryCollapsed ? '' : 'rotate-180'}`}
            />
          </CardTitle>
        </CardHeader>
        {!isHistoryCollapsed && (
          <CardContent>
          {loadingHistory ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No call history yet.</p>
              <p className="text-sm">Actions will appear here as you work with call centers.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {callHistory.map((entry) => (
                <div key={entry.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.action === 'call_logged' && '📞 Call Logged'}
                        {entry.action === 'moved_to_called' && '✅ Moved to Called'}
                        {entry.action === 'moved_back_to_today' && '↩️ Moved Back'}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">
                        {entry.callCenterName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {entry.details && (
                    <div className="text-sm text-gray-600 space-y-1">
                      {entry.details.outcome && (
                        <div><strong>Outcome:</strong> {entry.details.outcome}</div>
                      )}
                      {entry.details.duration && (
                        <div><strong>Duration:</strong> {formatDuration(entry.details.duration)}</div>
                      )}
                      {entry.details.notes && (
                        <div><strong>Notes:</strong> {entry.details.notes}</div>
                      )}
                      {entry.details.followUp && entry.details.followUp !== 'none' && (
                        <div><strong>Follow-up:</strong> {entry.details.followUp}</div>
                      )}
                      {entry.details.steps && entry.details.steps.length > 0 && (
                        <div><strong>Steps added:</strong> {entry.details.steps.length}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        )}
      </Card>

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
                            Last called: {new Date(dailyCC.lastCalledDate).toLocaleDateString()} ({dailyCC.daysSinceLastCall} days ago)
                          </div>
                        )}
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          Attempts: {dailyCC.attempts_last_15_days || 0} (15d), {dailyCC.attempts_last_90_days || 0} (90d)
                        </div>
                        {dailyCC.computed_score && (
                          <div
                            className="flex items-center font-medium text-blue-600 cursor-help"
                            title={`Score Breakdown:
• Mobile Available: ${(dailyCC.score_breakdown?.mobile_available || 0) * 100} points (30% weight)
• Days Since Last Call: ${(dailyCC.score_breakdown?.days_since_last_call || 0) * 100} points (20% weight)
• Positions Count: ${(dailyCC.score_breakdown?.positions_count || 0) * 100} points (15% weight)
• Lead Quality: ${(dailyCC.score_breakdown?.lead_quality_score || 0) * 100} points (15% weight)
• Company Size: ${(dailyCC.score_breakdown?.company_size_score || 0) * 100} points (10% weight)
• Recent Attempts: ${(dailyCC.score_breakdown?.recent_attempts_penalty || 0) * 100} points (5% weight)
• Business Hours: ${(dailyCC.score_breakdown?.business_hours_score || 0) * 100} points (5% weight)
• Total Score: ${dailyCC.computed_score.toFixed(1)}/100`}
                          >
                            Score: {dailyCC.computed_score.toFixed(1)}
                            <span className="ml-1 text-xs">ⓘ</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mb-3">
                        {dailyCC.callCenter.phones?.slice(0, 2).map((phone, index) => {
                          const phoneIndex = (dailyCC.phone_index || 0) + index;
                          const phoneInfo = dailyCC.callCenter.phone_infos?.[phoneIndex];
                          return (
                            <div key={index} className="space-y-1">
                              <Badge
                                variant="outline"
                                className={`text-xs ${phoneIndex === (dailyCC.phone_index || 0) ? 'border-blue-500 bg-blue-50' : ''}`}
                              >
                                {phone} {phoneInfo?.is_mobile ? '(Mobile)' : '(Fixed)'}
                                {dailyCC.callCenter.phones && dailyCC.callCenter.phones.length > 1 && (
                                  <span className="ml-1 text-gray-500">
                                    ({phoneIndex + 1}/{dailyCC.callCenter.phones.length})
                                  </span>
                                )}
                              </Badge>
                              {/* WhatsApp Status Indicator */}
                              {phoneInfo && (
                                <div className="ml-1">
                                  {(() => {
                                    const confidence = phoneInfo.whatsapp_confidence || 0;
                                    
                                    if (confidence >= 0.7) {
                                      return (
                                        <div className="flex items-center gap-1 text-xs text-green-600">
                                          <span className="text-green-500">✅</span>
                                          <span>WhatsApp Available</span>
                                        </div>
                                      );
                                    } else if (confidence < 0.4) {
                                      return (
                                        <div className="flex items-center gap-1 text-xs text-red-600">
                                          <span className="text-red-500">❌</span>
                                          <span>WhatsApp Unlikely</span>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                                          <span className="text-yellow-500">⚠️</span>
                                          <span>WhatsApp Unknown</span>
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {dailyCC.callCenter.phones && dailyCC.callCenter.phones.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{dailyCC.callCenter.phones.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Badge for attempt penalty */}
                      {dailyCC.badge_type === 'attempt_penalty' && dailyCC.badge_reason && (
                        <div className="mb-3">
                          <Badge
                            variant="destructive"
                            className="text-xs cursor-pointer"
                            onClick={() => {
                              // Show call history modal
                              setCurrentCallCenter(dailyCC);
                              setShowCallLogDialog(true);
                            }}
                            title="Click to view call history"
                          >
                            {dailyCC.badge_reason}
                          </Badge>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleQuickCall(dailyCC)}
                          title="Log a call"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>

                        {getPhoneArray(dailyCC.callCenter.phones).some(phone => {
                          const phoneInfo = dailyCC.callCenter.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => handleWhatsApp(dailyCC)}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                        ) : getPhoneArray(dailyCC.callCenter.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => handleWhatsApp(dailyCC)}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                        ) : null}

                        {/* Mark as No WhatsApp Button */}
                        {dailyCC.callCenter.no_whatsapp_phones && dailyCC.callCenter.no_whatsapp_phones.length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            title="This call center is excluded from WhatsApp suggestions"
                            disabled
                          >
                            🚫 No WhatsApp
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            onClick={async () => {
                              const currentPhone = dailyCC.callCenter.phones?.[dailyCC.phone_index || 0];
                              if (confirm(`Mark ${currentPhone} as "No WhatsApp"? This will exclude this call center from daily WhatsApp suggestions until you add another mobile number.`)) {
                                try {
                                  const response = await fetch(`/api/external-crm/call-centers/${dailyCC.callCenter.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      no_whatsapp_phones: [...(dailyCC.callCenter.no_whatsapp_phones || []), currentPhone],
                                      updatedAt: new Date().toISOString()
                                    })
                                  });
                                  
                                  if (response.ok) {
                                    alert(`${currentPhone} marked as "No WhatsApp". This call center will be excluded from daily WhatsApp suggestions.`);
                                    // Reload the call list to reflect changes
                                    await loadTodayCallList();
                                  } else {
                                    alert('Failed to mark phone as "No WhatsApp"');
                                  }
                                } catch (error) {
                                  console.error('Error marking phone as no WhatsApp:', error);
                                  alert('Error marking phone as "No WhatsApp"');
                                }
                              }
                            }}
                            title="Mark current phone as having no WhatsApp"
                          >
                            🚫 No WhatsApp
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCurrentCallCenter(dailyCC);
                            setContactForm({
                              name: '',
                              position: '',
                              email: '',
                              phone: '',
                              notes: ''
                            });
                            setShowContactDialog(true);
                          }}
                          title="Add contact"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(dailyCC)}
                          title="Edit call center"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>

                        {dailyCC.callCenter.phones && dailyCC.callCenter.phones.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUseNextNumber(dailyCC)}
                            title="Use next phone number"
                          >
                            Next #
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(dailyCC)}
                          title="View details"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                          onClick={() => handleRemoveFromSuggestions(dailyCC)}
                          title="Remove from daily suggestions"
                        >
                          <X className="w-3 h-3" />
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

        {/* Removed WhatsApp section - moved to Daily WhatsApp dashboard */}

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

                      <div className="flex gap-2">
                        {getPhoneArray(dailyCC.callCenter.phones).some(phone => {
                          const phoneInfo = dailyCC.callCenter.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => handleWhatsApp(dailyCC)}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                        ) : getPhoneArray(dailyCC.callCenter.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => handleWhatsApp(dailyCC)}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(dailyCC)}
                          title="Edit call center"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleViewDetails(dailyCC)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </div>
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
            {/* Call Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="callDate">Call Date (mm/dd/yyyy)</Label>
                <Input
                  type="text"
                  id="callDate"
                  value={callLogData.callDate || new Date().toLocaleDateString('en-US')}
                  onChange={(e) => setCallLogData(prev => ({ ...prev, callDate: e.target.value }))}
                  placeholder="mm/dd/yyyy"
                  pattern="[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}"
                  title="Please enter date in mm/dd/yyyy format"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use today's date ({new Date().toLocaleDateString('en-US')})
                </p>
              </div>
              <div>
                <Label htmlFor="callTime">Call Time (HH:MM)</Label>
                <Input
                  type="time"
                  id="callTime"
                  value={callLogData.callTime || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                  onChange={(e) => setCallLogData(prev => ({ ...prev, callTime: e.target.value }))}
                  title="Please enter time in HH:MM format (24-hour)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use current time ({new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })})
                </p>
              </div>
            </div>

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

            {callLogData.outcome === 'answered' && (
              <div>
                <Label htmlFor="disposition">Call Disposition *</Label>
                <Select value={callLogData.disposition} onValueChange={(value: any) =>
                  setCallLogData(prev => ({ ...prev, disposition: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select disposition" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Positive or Progressing Outcomes */}
                    <SelectItem value="interested">INT — Intéressé (wants solution/more info)</SelectItem>
                    <SelectItem value="quote_requested">REQ — Demande devis (asked for quote)</SelectItem>
                    <SelectItem value="callback">CALLBK — Rappeler (callback requested)</SelectItem>
                    <SelectItem value="trial_requested">TRIAL — Veut test/démo (wants trial/demo)</SelectItem>
                    <SelectItem value="technical_contact">TECH — Contacter la technique (wants technical contact)</SelectItem>
                    <SelectItem value="meeting_scheduled">MEET — RDV pris/visite (meeting scheduled)</SelectItem>
                    <SelectItem value="satisfied">SAT — Je suis satisfait (satisfied customer)</SelectItem>

                    {/* Neutral / Temporary Blockers */}
                    <SelectItem value="no_budget">NOQ — Pas de budget (interested but no budget)</SelectItem>
                    <SelectItem value="competitor">COMP — Déjà avec concurrents (uses competitor)</SelectItem>
                    <SelectItem value="not_with_them">NWT — Not with them (person no longer there)</SelectItem>

                    {/* Operational Issues */}
                    <SelectItem value="wrong_number">WRONG — Mauvais numéro (wrong number)</SelectItem>
                    <SelectItem value="duplicate">DUP — Duplicate/déjà contacté (already contacted)</SelectItem>

                    {/* Hard Negatives */}
                    <SelectItem value="spam">SPAM — Ne veut pas être contacté (do not contact)</SelectItem>
                    <SelectItem value="dead">DEAD — Prospect Dead/Toxic/Manipulative/Rude</SelectItem>
                    <SelectItem value="noc">NOC — Not a Call Center</SelectItem>
                    <SelectItem value="closed">CLOSED — Company Closed</SelectItem>
                    <SelectItem value="out">OUT — Out of Target</SelectItem>
                    <SelectItem value="abusive">ABUSIVE — Treated you badly (Insults/Aggression)</SelectItem>

                    {/* Uncertain / No Clear Answer */}
                    <SelectItem value="nc">NC — Non convaincu/Not convinced</SelectItem>
                    <SelectItem value="busy">BUSY — Occupied/Call me later (no specific time)</SelectItem>
                    <SelectItem value="noanswer">NOANSWER — No Answer After Engagement</SelectItem>
                  </SelectContent>
                </Select>

                {/* Disposition Tips & Recommendations */}
                {callLogData.disposition && DISPOSITION_INFO[callLogData.disposition as keyof typeof DISPOSITION_INFO] && (
                  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-semibold text-blue-800 mb-2">💡 Disposition Tips & Recommendations:</div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-blue-700">
                        {DISPOSITION_INFO[callLogData.disposition as keyof typeof DISPOSITION_INFO].description}
                      </div>
                      <div className="text-sm text-blue-600">
                        <div className="font-medium mb-1">CRM Actions:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {DISPOSITION_INFO[callLogData.disposition as keyof typeof DISPOSITION_INFO].crmActions.map((action, index) => (
                            <li key={index} className="text-xs">{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp Message Template */}
                {callLogData.disposition && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-800">💬 WhatsApp Template:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const templates = {
                            // Positive or Progressing Outcomes
                            interested: `Merci, [Prénom]. Je vous envoie l'offre tout de suite. Préférez-vous PDF ou lien ?`,
                            quote_requested: `Parfait — je prépare votre devis et vous l'envoie d'ici [heures]. Y a-t-il quelque chose de particulier (nombre postes, pays d'appel) ?`,
                            callback: `Très bien, je vous rappelle le [date] à [heure]. À tout de suite.`,
                            trial_requested: `Super — j'active le test et vous envoie les accès sous 1h. On se fixe un point après 7 jours ?`,
                            technical_contact: `Très bien — pouvez-vous me donner le contact technique (nom + téléphone) pour que notre ingénieur l'appelle ?`,
                            meeting_scheduled: `Parfait — RDV confirmé le [date] à [heure]. Je vous envoie l'adresse et le rappel.`,
                            satisfied: `Merci pour le retour ! Je reviens vers vous dans 30 jours pour vérifier que tout va bien.`,

                            // Neutral / Temporary Blockers
                            no_budget: `Je comprends. On peut se recontacter dans [mois] pour voir votre budget ?`,
                            competitor: `Merci pour l'info — si jamais vous envisagez un test ou comparaison, je peux vous préparer un mini audit gratuit. Ça vous va ?`,
                            not_with_them: `Merci — pouvez-vous me donner le bon contact pour que je mette à jour nos dossiers ?`,

                            // Operational Issues
                            wrong_number: `Désolé pour le dérangement. Je vais mettre à jour nos informations. Merci.`,
                            duplicate: `Je vois que nous avons déjà parlé. Je vais vérifier nos notes et vous recontacte si nécessaire.`,

                            // Hard Negatives
                            spam: `Je comprends. Je ne vous contacterai plus. Bonne journée.`,
                            dead: `Je comprends. Merci pour votre temps.`,
                            noc: `Je vois, merci pour la clarification.`,
                            closed: `Je comprends, merci pour l'information.`,
                            out: `Je vois, merci pour la précision.`,
                            abusive: `Je comprends. Au revoir.`,

                            // Uncertain / No Clear Answer
                            nc: `Je comprends votre position. Si jamais vous changez d'avis, n'hésitez pas à nous contacter.`,
                            busy: `Très bien, je vous rappelle dans quelques jours. Bonne journée.`,
                            noanswer: `Je comprends que vous êtes occupé. Je vais essayer de vous joindre à un autre moment.`
                          };
                          const template = templates[callLogData.disposition as keyof typeof templates];
                          if (template) {
                            navigator.clipboard.writeText(template);
                            alert('WhatsApp template copied to clipboard!');
                          }
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        📋 Copy
                      </Button>
                    </div>
                    <div className="text-sm text-green-700 whitespace-pre-line">
                      {callLogData.disposition === 'interested' && `Merci, [Prénom]. Je vous envoie l'offre tout de suite. Préférez-vous PDF ou lien ?`}
                      {callLogData.disposition === 'quote_requested' && `Parfait — je prépare votre devis et vous l'envoie d'ici [heures]. Y a-t-il quelque chose de particulier (nombre postes, pays d'appel) ?`}
                      {callLogData.disposition === 'callback' && `Très bien, je vous rappelle le [date] à [heure]. À tout de suite.`}
                      {callLogData.disposition === 'trial_requested' && `Super — j'active le test et vous envoie les accès sous 1h. On se fixe un point après 7 jours ?`}
                      {callLogData.disposition === 'no_budget' && `Je comprends. On peut se recontacter dans [mois] pour voir votre budget ?`}
                      {callLogData.disposition === 'technical_contact' && `Très bien — pouvez-vous me donner le contact technique (nom + téléphone) pour que notre ingénieur l'appelle ?`}
                      {callLogData.disposition === 'competitor' && `Merci pour l'info — si jamais vous envisagez un test ou comparaison, je peux vous préparer un mini audit gratuit. Ça vous va ?`}
                      {callLogData.disposition === 'satisfied' && `Merci pour le retour ! Je reviens vers vous dans 30 jours pour vérifier que tout va bien.`}
                      {callLogData.disposition === 'not_with_them' && `Merci — pouvez-vous me donner le bon contact pour que je mette à jour nos dossiers ?`}
                      {callLogData.disposition === 'meeting_scheduled' && `Parfait — RDV confirmé le [date] à [heure]. Je vous envoie l'adresse et le rappel.`}
                    </div>
                  </div>
                )}

                {/* Additional Fields Based on Disposition */}
                {callLogData.disposition === 'callback' && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="callbackDate">Callback Date & Time</Label>
                      <input
                        type="datetime-local"
                        id="callbackDate"
                        value={callLogData.callbackDate || ''}
                        onChange={(e) => setCallLogData(prev => ({ ...prev, callbackDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                )}

                {callLogData.disposition === 'meeting_scheduled' && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="meetingDate">Meeting Date & Time</Label>
                      <input
                        type="datetime-local"
                        id="meetingDate"
                        value={callLogData.meetingDate || ''}
                        onChange={(e) => setCallLogData(prev => ({ ...prev, meetingDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meetingLocation">Meeting Location</Label>
                      <input
                        type="text"
                        id="meetingLocation"
                        value={callLogData.meetingLocation || ''}
                        onChange={(e) => setCallLogData(prev => ({ ...prev, meetingLocation: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Office address or virtual meeting link"
                      />
                    </div>
                  </div>
                )}

                {callLogData.disposition === 'competitor' && (
                  <div className="mt-3">
                    <Label htmlFor="competitorName">Competitor Name</Label>
                    <input
                      type="text"
                      id="competitorName"
                      value={callLogData.competitorName || ''}
                      onChange={(e) => setCallLogData(prev => ({ ...prev, competitorName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Which competitor are they using?"
                    />
                  </div>
                )}

                {/* Automation Preview */}
                {callLogData.disposition && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-sm font-medium text-blue-800 mb-2">⚙️ Automation Preview:</div>
                    <div className="text-sm text-blue-700 space-y-1">
                      {/* Positive or Progressing Outcomes */}
                      {callLogData.disposition === 'interested' && (
                        <>
                          <div>• Tag: lead:interested</div>
                          <div>• Create task: "Envoyer proposition" (due in 1 day)</div>
                          <div>• Move to pipeline stage: Prospect</div>
                          <div>• Reminder in 7 days if no signature</div>
                        </>
                      )}
                      {callLogData.disposition === 'quote_requested' && (
                        <>
                          <div>• Create step: "Send quote" (today)</div>
                          <div>• Follow-up reminder in 3 days</div>
                        </>
                      )}
                      {callLogData.disposition === 'callback' && (
                        <>
                          <div>• Create calendar step at specified datetime</div>
                          <div>• Exclude from daily suggestions until callback</div>
                        </>
                      )}
                      {callLogData.disposition === 'trial_requested' && (
                        <>
                          <div>• Tag: trial:active</div>
                          <div>• Create trial step</div>
                          <div>• Provision trial credentials</div>
                          <div>• Reappear after 14 days with "trial review"</div>
                        </>
                      )}
                      {callLogData.disposition === 'technical_contact' && (
                        <>
                          <div>• Tag: "meeting with mehdi"</div>
                          <div>• Create step: "Book Teams meeting"</div>
                        </>
                      )}
                      {callLogData.disposition === 'meeting_scheduled' && (
                        <>
                          <div>• Create calendar step with location</div>
                          <div>• Exclude from suggestions until meeting result</div>
                        </>
                      )}
                      {callLogData.disposition === 'satisfied' && (
                        <>
                          <div>• Tag: satisfied</div>
                          <div>• Reminder in 30 days</div>
                        </>
                      )}

                      {/* Neutral / Temporary Blockers */}
                      {callLogData.disposition === 'no_budget' && (
                        <>
                          <div>• Tag: followup:budget</div>
                          <div>• Schedule follow-up in 90 days</div>
                        </>
                      )}
                      {callLogData.disposition === 'competitor' && (
                        <>
                          <div>• Tag: competitor:{callLogData.competitorName || 'name'}</div>
                          <div>• Schedule follow-up in 180 days</div>
                        </>
                      )}
                      {callLogData.disposition === 'not_with_them' && (
                        <>
                          <div>• Show notification: "Ajouter nouveau contact"</div>
                        </>
                      )}

                      {/* Operational Issues */}
                      {callLogData.disposition === 'wrong_number' && (
                        <>
                          <div>• Tag: wrong_number</div>
                          <div>• Show notification: "Ajouter autre numéro"</div>
                        </>
                      )}
                      {callLogData.disposition === 'duplicate' && (
                        <>
                          <div>• Flag as duplicate</div>
                          <div>• Exclude for 13 days</div>
                        </>
                      )}

                      {/* Hard Negatives */}
                      {callLogData.disposition === 'spam' && (
                        <>
                          <div>• Tag: SPAM</div>
                          <div>• Exclude for 365 days</div>
                        </>
                      )}
                      {callLogData.disposition === 'dead' && (
                        <>
                          <div>• Tag: DEAD_LEAD</div>
                          <div>• Exclude forever</div>
                          <div>• Optional: Test 2nd phone once</div>
                        </>
                      )}
                      {callLogData.disposition === 'noc' && (
                        <>
                          <div>• Tag: NOC</div>
                          <div>• Exclude forever</div>
                          <div>• No follow-up tasks ever</div>
                        </>
                      )}
                      {callLogData.disposition === 'closed' && (
                        <>
                          <div>• Tag: CLOSED</div>
                          <div>• Exclude forever</div>
                          <div>• Archive automatically</div>
                        </>
                      )}
                      {callLogData.disposition === 'out' && (
                        <>
                          <div>• Tag: OUT_TARGET</div>
                          <div>• Exclude forever</div>
                        </>
                      )}
                      {callLogData.disposition === 'abusive' && (
                        <>
                          <div>• Tag: ABUSIVE</div>
                          <div>• Exclude forever</div>
                          <div>• Banned permanently</div>
                        </>
                      )}

                      {/* Uncertain / No Clear Answer */}
                      {callLogData.disposition === 'nc' && (
                        <>
                          <div>• Tag: followup:not_convinced</div>
                          <div>• Schedule follow-up in 120 days</div>
                        </>
                      )}
                      {callLogData.disposition === 'busy' && (
                        <>
                          <div>• Tag: followup:busy</div>
                          <div>• Exclude for 7 days</div>
                          <div>• Create soft follow-up</div>
                        </>
                      )}
                      {callLogData.disposition === 'noanswer' && (
                        <>
                          <div>• After 5 unanswered calls:</div>
                          <div>• Show notification: "Add more phone numbers"</div>
                          <div>• Exclude for 7 days each time</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration (mm:ss format)</Label>
              <Input
                id="duration"
                type="text"
                value={callLogData.duration ? formatDuration(callLogData.duration) : ''}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === '') {
                    setCallLogData(prev => ({ ...prev, duration: 0 }));
                  } else {
                    const seconds = parseDuration(inputValue);
                    setCallLogData(prev => ({ ...prev, duration: seconds }));
                  }
                }}
                placeholder="Enter duration in mm:ss format (e.g., 4:05 for 4 minutes 5 seconds)"
                className="focus:ring-2 focus:ring-blue-500"
              />
              {callLogData.duration > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Equivalent: {callLogData.duration} seconds
                </div>
              )}
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
                disabled={!callLogData.outcome || !callLogData.notes || savingCallLog}
              >
                {savingCallLog ? 'Saving...' : 'Save Call Log'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disposition Selection Dialog */}
      <Dialog open={showDispositionDialog} onOpenChange={setShowDispositionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Call Disposition</DialogTitle>
            <p className="text-sm text-gray-600">
              Since the call was answered, please select the appropriate disposition:
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              onClick={() => saveCallLogWithDisposition('interested')}
              className="w-full justify-start"
              variant="outline"
            >
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Interested - Create follow-up step
            </Button>
            <Button
              onClick={() => saveCallLogWithDisposition('callback')}
              className="w-full justify-start"
              variant="outline"
            >
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              Callback Requested - Schedule callback
            </Button>
            <Button
              onClick={() => saveCallLogWithDisposition('no_answer')}
              className="w-full justify-start"
              variant="outline"
            >
              <Phone className="w-4 h-4 mr-2 text-orange-600" />
              No Answer - Increment attempt count
            </Button>
            <Button
              onClick={() => saveCallLogWithDisposition('not_interested')}
              className="w-full justify-start"
              variant="outline"
            >
              <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
              Not Interested - Pause 60 days
            </Button>
            <Button
              onClick={() => saveCallLogWithDisposition('invalid_number')}
              className="w-full justify-start"
              variant="outline"
            >
              <AlertTriangle className="w-4 h-4 mr-2 text-gray-600" />
              Invalid Number - Mark as invalid
            </Button>
            <Button
              onClick={() => saveCallLogWithDisposition('dnc')}
              className="w-full justify-start"
              variant="outline"
            >
              <AlertTriangle className="w-4 h-4 mr-2 text-red-700" />
              Do Not Call - Mark as DNC
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Form Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact - {currentCallCenter?.callCenter.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-name">Name *</Label>
                <Input
                  id="contact-name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="contact-position">Position *</Label>
                <Input
                  id="contact-position"
                  value={contactForm.position}
                  onChange={(e) => setContactForm(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Job title"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@company.com"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+212-6-12-34-56-78"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                value={contactForm.notes}
                onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this contact..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowContactDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleContactSubmit}>
                Add Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Call Center Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Call Center - {currentCallCenter?.callCenter.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label htmlFor="edit-businessType">Business Type</Label>
                <Select value={formData.businessType} onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call-center">Call Center</SelectItem>
                    <SelectItem value="voip-reseller">VoIP Reseller</SelectItem>
                    <SelectItem value="data-vendor">Data Vendor</SelectItem>
                    <SelectItem value="workspace-rental">Workspace Rental</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-country">Country *</Label>
                <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morocco">Morocco</SelectItem>
                    <SelectItem value="Tunisia">Tunisia</SelectItem>
                    <SelectItem value="Senegal">Senegal</SelectItem>
                    <SelectItem value="Ivory Coast">Ivory Coast</SelectItem>
                    <SelectItem value="Guinea">Guinea</SelectItem>
                    <SelectItem value="Cameroon">Cameroon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-city">City *</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="edit-positions">Positions</Label>
                <Input
                  id="edit-positions"
                  type="number"
                  value={formData.positions}
                  onChange={(e) => setFormData(prev => ({ ...prev, positions: e.target.value }))}
                  placeholder="Number of positions"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phones">Phone Numbers</Label>
                <Input
                  id="edit-phones"
                  value={formData.phones}
                  onChange={(e) => setFormData(prev => ({ ...prev, phones: e.target.value }))}
                  placeholder="+212-6-12-34-56-78, +212-6-98-76-54-32"
                />
              </div>
              <div>
                <Label htmlFor="edit-emails">Email Addresses</Label>
                <Input
                  id="edit-emails"
                  value={formData.emails}
                  onChange={(e) => setFormData(prev => ({ ...prev, emails: e.target.value }))}
                  placeholder="email1@company.com, email2@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}>
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

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address"
              />
            </div>

            <div>
              <Label htmlFor="edit-source">Source</Label>
              <Input
                id="edit-source"
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                placeholder="Lead source"
              />
            </div>

            <div>
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Comma separated tags"
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
