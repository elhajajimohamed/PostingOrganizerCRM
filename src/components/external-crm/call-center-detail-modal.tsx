'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Calendar,
  DollarSign,
  Tag,
  Users,
  MessageSquare,
  Clock,
  Search,
  Upload,
  CheckSquare,
  Square,
  History,
  Calendar as CalendarIcon,
  Eye,
  Target,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { CallCenter, CallCenterContact, Step, CallLog, Contact } from '@/lib/types/external-crm';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import { formatDuration, parseDuration, isValidDuration } from '@/lib/utils/duration';
import { SummaryManagement } from './summary-management';
import { ClientTopUpsManagement } from './client-top-ups-management';

interface CallCenterDetailModalProps {
  callCenter: CallCenter | null;
  isOpen: boolean;
  onClose: () => void;
  onCallCenterUpdate: (callCenter: CallCenter) => void;
  onSummaryUpdate?: (callCenterId: string, summary: string) => void;
  onCallLogUpdate?: (callCenterId: string) => void;
  onDelete?: (id: string) => void;
}

interface ContactFormData {
  name: string;
  position: string;
  email: string;
  phone: string;
  department: string;
  notes: string;
}

interface StepFormData {
  title: string;
  description: string;
  date: string;
  notes: string;
  priority: 'low' | 'medium' | 'high';
}

const DEPARTMENTS = [
  'Management',
  'HR',
  'Operations',
  'Quality Assurance',
  'Training',
  'IT',
  'Finance',
  'Sales',
  'Customer Service',
  'Other'
];

export function CallCenterDetailModal({
  callCenter,
  isOpen,
  onClose,
  onCallCenterUpdate,
  onSummaryUpdate,
  onCallLogUpdate,
  onDelete
}: CallCenterDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCallCenter, setEditedCallCenter] = useState<CallCenter | null>(null);
  const [contacts, setContacts] = useState<CallCenterContact[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showStepForm, setShowStepForm] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [loadingCallHistory, setLoadingCallHistory] = useState(false);
  const [selectedCallLogs, setSelectedCallLogs] = useState<Set<string>>(new Set());
  const [whatsappHistory, setWhatsappHistory] = useState<any[]>([]);
  const [loadingWhatsappHistory, setLoadingWhatsappHistory] = useState(false);
  const [showCallLogForm, setShowCallLogForm] = useState(false);
  const [showClassificationForm, setShowClassificationForm] = useState(false);
  const [editingCallLog, setEditingCallLog] = useState<CallLog | null>(null);
  const [showEditCallLogDialog, setShowEditCallLogDialog] = useState(false);
  const [deletingCallLogId, setDeletingCallLogId] = useState<string | null>(null);
  const [showInsertAnalysisDialog, setShowInsertAnalysisDialog] = useState(false);
  const [manualAnalysisText, setManualAnalysisText] = useState('');
  const [callLogData, setCallLogData] = useState({
    outcome: '',
    duration: 0,
    notes: '',
    followUp: 'none',
    disposition: '' as 'interested' | 'quote_requested' | 'callback' | 'trial_requested' | 'no_budget' | 'technical_contact' | 'competitor' | 'wrong_number' | 'duplicate' | 'spam' | 'satisfied' | 'not_with_them' | 'meeting_scheduled' | 'dead' | 'noc' | 'closed' | 'out' | 'abusive' | 'nc' | 'busy' | 'noanswer' | 'no_answer' | 'not_interested' | 'invalid_number' | 'dnc' | 'manual_override' | '',
    followUpAction: '' as 'dnc' | 'nwt' | 'satisfied' | '',
    callbackDate: '',
    meetingDate: '',
    meetingLocation: '',
    competitorName: '',
    phone_used: '',
    callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
    callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
    // Recording and transcription fields
    recordingUrl: '',
    transcriptionText: '',
    autoAnalysisSummary: '',
    coachFeedback: '',
    hasRecording: false,
    // Quality scoring fields
    accroche_score: undefined as number | undefined,
    discovery_score: undefined as number | undefined,
    value_prop_score: undefined as number | undefined,
    objection_score: undefined as number | undefined,
    closing_score: undefined as number | undefined,
    client_talk_ratio: undefined as number | undefined,
    agent_talk_ratio: undefined as number | undefined,
    // Advanced call result classification fields
    is_argumented: undefined as boolean | undefined,
    decision_maker_reached: undefined as boolean | undefined,
    objection_category: undefined as 'price' | 'email' | 'timing' | 'already_has_provider' | 'bad_number' | 'other' | undefined,
    objection_detail: '',
    refusal_reason: undefined as 'prix_trop_cher' | 'envoyez_un_email' | 'pas_maintenant' | 'deja_un_fournisseur' | 'mauvais_numero' | 'autre' | undefined,
  });
  const [classificationData, setClassificationData] = useState({
    is_argumented: '',
    decision_maker_reached: '',
    objection_category: '',
    objection_detail: '',
    refusal_reason: '',
  });
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: '',
    position: '',
    email: '',
    phone: '',
    department: '',
    notes: ''
  });
  const [stepForm, setStepForm] = useState<StepFormData>({
    title: '',
    description: '',
    date: '',
    notes: '',
    priority: 'medium'
  });

  // Helper function to convert mm/dd/yyyy and time to ISO string, or use now if empty
  const getCallDateTimeISO = (callDateStr?: string, callTimeStr?: string): string => {
    console.log('🔍 [CALL-LOG] getCallDateTimeISO called with date:', callDateStr, 'time:', callTimeStr);

    if (!callDateStr || callDateStr.trim() === '') {
      console.log('🔍 [CALL-LOG] No date provided, using now');
      return new Date().toISOString();
    }

    let year, month, day;

    // Check if the date is in YYYY-MM-DD format (date input) or MM/DD/YYYY format (manual entry)
    if (callDateStr.includes('-')) {
      // YYYY-MM-DD format
      const [yyyy, mm, dd] = callDateStr.split('-');
      year = parseInt(yyyy, 10);
      month = parseInt(mm, 10);
      day = parseInt(dd, 10);
      console.log('🔍 [CALL-LOG] Parsed YYYY-MM-DD format:', { year, month, day });
    } else if (callDateStr.includes('/')) {
      // MM/DD/YYYY format
      const [mm, dd, yyyy] = callDateStr.split('/');
      year = parseInt(yyyy, 10);
      month = parseInt(mm, 10);
      day = parseInt(dd, 10);
      console.log('🔍 [CALL-LOG] Parsed MM/DD/YYYY format:', { year, month, day });
    } else {
      console.warn('🔍 [CALL-LOG] Unrecognized date format, using now:', callDateStr);
      return new Date().toISOString();
    }

    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn('🔍 [CALL-LOG] Invalid date values, using now:', { year, month, day });
      return new Date().toISOString();
    }

    // Default time values - use current time if no time provided
    let hours = new Date().getHours(), minutes = new Date().getMinutes();

    // If time is provided, parse it
    if (callTimeStr && callTimeStr.trim() !== '') {
      console.log('🔍 [CALL-LOG] Parsing time:', callTimeStr);
      const timeParts = callTimeStr.split(':');
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
        console.log('🔍 [CALL-LOG] Parsed hours:', hours, 'minutes:', minutes);

        // Validate time values
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.warn('🔍 [CALL-LOG] Invalid time format, using current time:', callTimeStr);
          hours = new Date().getHours();
          minutes = new Date().getMinutes();
        }
      } else {
        console.log('🔍 [CALL-LOG] Time parts length < 2, using current time');
      }
    } else {
      console.log('🔍 [CALL-LOG] No time provided, using current time');
    }

    console.log('🔍 [CALL-LOG] Final time: hours=', hours, 'minutes=', minutes);

    // Create date object using individual components to ensure local timezone
    // Month is 0-indexed in Date constructor, so subtract 1 from month
    console.log('🔍 [CALL-LOG] Creating date with components: year=', year, 'month=', month-1, 'day=', day, 'hours=', hours, 'minutes=', minutes);

    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    if (isNaN(date.getTime())) {
      console.warn('🔍 [CALL-LOG] Invalid date object, using now:', { year, month, day, hours, minutes });
      return new Date().toISOString();
    }

    const isoString = date.toISOString();
    console.log('🔍 [CALL-LOG] Generated ISO string:', isoString);
    return isoString;
  };

  useEffect(() => {
    if (callCenter) {
      setEditedCallCenter(callCenter);
      // Load contacts from the call center's subcollection
      loadContactsFromCallCenter(callCenter.id);
      // Load steps from the call center's subcollection
      loadStepsFromCallCenter(callCenter.id);
      // Load call history
      loadCallHistory(callCenter.id);
      // Load WhatsApp history
      loadWhatsappHistory(callCenter.id);
      // Reset form states when call center changes
      setStepForm({
        title: '',
        description: '',
        date: '',
        notes: '',
        priority: 'medium'
      });
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
        phone_used: '',
        callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
        callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
        // Recording and transcription fields
        recordingUrl: '',
        transcriptionText: '',
        autoAnalysisSummary: '',
        coachFeedback: '',
        hasRecording: false,
        // Quality scoring fields
        accroche_score: undefined,
        discovery_score: undefined,
        value_prop_score: undefined,
        objection_score: undefined,
        closing_score: undefined,
        client_talk_ratio: undefined,
        agent_talk_ratio: undefined,
        // Advanced call result classification fields
        is_argumented: undefined,
        decision_maker_reached: undefined,
        objection_category: undefined,
        objection_detail: '',
        refusal_reason: undefined,
      });
      setEditingStep(null);
      setShowStepForm(false);
      setShowCallLogForm(false);
    }
  }, [callCenter]);

  const loadContactsFromCallCenter = async (callCenterId: string) => {
    try {
      console.log(`👥 [CONTACTS] Loading contacts for call center: ${callCenterId}`);
      const contactsData = await ExternalCRMSubcollectionsService.getContacts(callCenterId);
      const contactsWithDefaults = contactsData.map((contact: any) => ({
        ...contact,
        department: contact.department || '',
        createdAt: contact.createdAt || new Date().toISOString(),
        updatedAt: contact.updatedAt || new Date().toISOString(),
        phone_info: contact.phone_info || undefined
      } as CallCenterContact));
      setContacts(contactsWithDefaults);
      console.log(`✅ [CONTACTS] Loaded ${contactsWithDefaults.length} contacts for call center`);
    } catch (error) {
      console.error('❌ [CONTACTS] Error loading contacts:', error);
      setContacts([]);
    }
  };

  const loadStepsFromCallCenter = async (callCenterId: string) => {
    try {
      console.log(`📋 [STEPS] Loading steps for call center: ${callCenterId}`);
      const response = await fetch(`/api/external-crm/call-centers/${callCenterId}/steps`);
      if (response.ok) {
        const data = await response.json();
        setSteps(data.steps || []);
        console.log(`✅ [STEPS] Loaded ${data.steps?.length || 0} steps for call center`);
      } else {
        console.error('❌ [STEPS] Failed to load steps from call center');
        setSteps([]);
      }
    } catch (error) {
      console.error('❌ [STEPS] Error loading steps:', error);
      setSteps([]);
    }
  };

  const loadCallHistory = async (callCenterId: string) => {
    try {
      setLoadingCallHistory(true);
      console.log(`📞 [CALL-HISTORY] Loading call history for call center: ${callCenterId}`);
      const callHistoryData = await ExternalCRMSubcollectionsService.getCallHistory(callCenterId);
      setCallHistory(callHistoryData);
      console.log(`✅ [CALL-HISTORY] Loaded ${callHistoryData.length} call logs for call center`);
    } catch (error) {
      console.error('❌ [CALL-HISTORY] Error loading call history:', error);
      setCallHistory([]);
    } finally {
      setLoadingCallHistory(false);
    }
  };

  const loadWhatsappHistory = async (callCenterId: string) => {
    try {
      setLoadingWhatsappHistory(true);
      console.log(`💬 [WHATSAPP-HISTORY] Loading WhatsApp history for call center: ${callCenterId}`);
      
      // Load WhatsApp history from the daily WhatsApp service
      const response = await fetch(`/api/external-crm/daily-whatsapp/history?callCenterId=${callCenterId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWhatsappHistory(data.history || []);
        console.log(`✅ [WHATSAPP-HISTORY] Loaded ${data.history?.length || 0} WhatsApp entries for call center`);
      } else {
        console.error('❌ [WHATSAPP-HISTORY] Failed to load WhatsApp history');
        setWhatsappHistory([]);
      }
    } catch (error) {
      console.error('❌ [WHATSAPP-HISTORY] Error loading WhatsApp history:', error);
      setWhatsappHistory([]);
    } finally {
      setLoadingWhatsappHistory(false);
    }
  };

  const handleSave = async () => {
    if (!editedCallCenter) return;

    try {
      const updatedCallCenter = {
        ...editedCallCenter,
        steps: steps,
        updatedAt: new Date().toISOString()
      };

      onCallCenterUpdate(updatedCallCenter);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating call center:', error);
      alert('Failed to update call center');
    }
  };

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.position) {
      alert('Name and position are required');
      return;
    }

    if (!callCenter) {
      alert('Call center not found');
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

      if (editingContact) {
        // Update existing contact
        await fetch(`/api/external-crm/call-centers/${callCenter.id}/contacts/${editingContact}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData)
        });
        setContacts(prev => prev.map(c => c.id === editingContact ? { ...c, ...contactData } : c));
        setEditingContact(null);
      } else {
        // Create new contact
        const response = await fetch(`/api/external-crm/call-centers/${callCenter.id}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData)
        });
        const result = await response.json();
        const newContact: CallCenterContact = {
          id: result.id,
          ...contactData,
          department: contactForm.department,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setContacts(prev => [...prev, newContact]);
      }

      setContactForm({
        name: '',
        position: '',
        email: '',
        phone: '',
        department: '',
        notes: ''
      });
      setShowContactForm(false);
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact');
    }
  };

  const handleEditContact = (contact: CallCenterContact) => {
    setContactForm({
      name: contact.name,
      position: contact.position,
      email: contact.email,
      phone: contact.phone,
      department: contact.department,
      notes: contact.notes
    });
    setEditingContact(contact.id);
    setShowContactForm(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      await fetch(`/api/external-crm/call-centers/${callCenter.id}/contacts/${contactId}`, {
        method: 'DELETE'
      });
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  const handleStepSubmit = async () => {
    if (!stepForm.title || !stepForm.date) {
      alert('Title and date are required');
      return;
    }

    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      const stepData = {
        title: stepForm.title,
        description: stepForm.description,
        date: stepForm.date,
        completed: false,
        notes: stepForm.notes,
        priority: stepForm.priority
      };

      if (editingStep) {
        // Update existing step
        await ExternalCRMSubcollectionsService.updateStep(callCenter.id.toString(), editingStep, stepData);
        setSteps(prev => prev.map(s => s.id === editingStep ? { ...s, ...stepData } : s));
        setEditingStep(null);
      } else {
        // Create new step
        const stepId = await ExternalCRMSubcollectionsService.addStep(callCenter.id.toString(), stepData);
        const newStep: Step = {
          id: stepId,
          ...stepData
        };
        setSteps(prev => [...prev, newStep]);
      }

      setStepForm({
        title: '',
        description: '',
        date: '',
        notes: '',
        priority: 'medium'
      });
      setShowStepForm(false);
    } catch (error) {
      console.error('Error saving step:', error);
      alert('Failed to save step');
    }
  };

  const handleEditStep = (step: Step) => {
    setStepForm({
      title: step.title,
      description: step.description,
      date: step.date,
      notes: step.notes,
      priority: step.priority || 'medium'
    });
    setEditingStep(step.id);
    setShowStepForm(true);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      await ExternalCRMSubcollectionsService.deleteStep(callCenter.id.toString(), stepId);
      setSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (error) {
      console.error('Error deleting step:', error);
      alert('Failed to delete step');
    }
  };

  const handleToggleStepComplete = async (stepId: string) => {
    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      const step = steps.find(s => s.id === stepId);
      if (!step) return;

      const updatedCompleted = !step.completed;
      await ExternalCRMSubcollectionsService.updateStep(callCenter.id.toString(), stepId, {
        completed: updatedCompleted
      });

      setSteps(prev => prev.map(s =>
        s.id === stepId ? { ...s, completed: updatedCompleted } : s
      ));
    } catch (error) {
      console.error('Error updating step completion:', error);
      alert('Failed to update step status');
    }
  };

  const handleCreateCalendarEvent = async (step: Step) => {
    try {
      const eventData = {
        title: step.title,
        description: step.description,
        date: step.date,
        startTime: '09:00',
        endTime: '10:00',
        type: 'call' as const,
        callCenterId: callCenter?.id || '',
        priority: 'medium' as const,
        status: 'scheduled' as const,
        completed: false,
        notes: step.notes,
        tags: ['step', 'follow-up'],
        attendees: [],
        reminder: {
          enabled: true,
          timing: [{ type: 'days' as const, value: 1 }],
          methods: ['email' as const, 'browser' as const],
          escalation: false,
          snoozeEnabled: true,
          snoozeDuration: 15
        },
        recurring: {
          enabled: false,
          pattern: 'weekly' as const,
          interval: 1,
          daysOfWeek: [],
          endDate: '',
          occurrences: 0,
          exceptions: []
        },
        pipelineStage: '',
        outcome: '',
        followUpRequired: false,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'system'
      };

      const response = await fetch('/api/external-crm/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        alert('Calendar event created successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to create calendar event:', errorData);
        alert('Failed to create calendar event: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      alert('Failed to create calendar event');
    }
  };

  const quickLogCall = async (disposition: string) => {
    if (!callCenter) return;

    try {
      // Quick notes input
      const notes = prompt('Enter call notes (optional):') || '';
      
      // Get the current date and time
      const now = new Date();
      const callDate = now.toLocaleDateString('en-US');
      const callTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      
      // Get default phone number
      const phone_used = callCenter.phones?.[0] || '';
      
      // Convert to ISO format
      const isoDate = getCallDateTimeISO(callDate, callTime);
      
      // Create call log with disposition
      const response = await fetch('/api/external-crm/daily-calls/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: callCenter.id.toString(),
          callLog: {
            date: isoDate,
            outcome: 'answered', // Quick log assumes answered
            duration: 0, // Quick log doesn't track duration
            notes: notes || `Quick call logged - Disposition: ${disposition.replace('_', ' ')}`,
            followUp: 'none',
            disposition: disposition,
            phone_used: phone_used,
          },
        }),
      });

      if (response.ok) {
        // Refresh call history
        loadCallHistory(callCenter.id);
        // Notify parent component about call log update
        if (onCallLogUpdate) {
          onCallLogUpdate(callCenter.id);
        }
        alert(`Call logged successfully! Disposition: ${disposition.replace('_', ' ')}`);
      } else {
        alert('Failed to log call');
      }
    } catch (error) {
      console.error('Error quick logging call:', error);
      alert('Failed to save call log');
    }
  };

  if (!callCenter || !editedCallCenter) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Building className="w-5 h-5" />
              {isEditing ? (
                <Input
                  value={editedCallCenter.name}
                  onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="text-xl font-bold"
                />
              ) : (
                editedCallCenter.name
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {onDelete && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        onDelete(callCenter.id);
                        onClose();
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
            <TabsTrigger value="call-log">Call Log ({callHistory.length})</TabsTrigger>
            <TabsTrigger value="whatsapp-history">WhatsApp History ({whatsappHistory.length})</TabsTrigger>
            <TabsTrigger value="topups">Top-ups</TabsTrigger>
            <TabsTrigger value="summary">Summary ({callCenter?.summary && callCenter.summary.trim().length > 0 ? 1 : 0})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      {isEditing ? (
                        <Select
                          value={editedCallCenter.country}
                          onValueChange={(value: 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon') => setEditedCallCenter(prev => prev ? { ...prev, country: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Morocco">🇲🇦 Morocco</SelectItem>
                            <SelectItem value="Tunisia">🇹🇳 Tunisia</SelectItem>
                            <SelectItem value="Senegal">🇸🇳 Senegal</SelectItem>
                            <SelectItem value="Ivory Coast">🇨🇮 Ivory Coast</SelectItem>
                            <SelectItem value="Guinea">🇬🇳 Guinea</SelectItem>
                            <SelectItem value="Cameroon">🇨🇲 Cameroon</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <MapPin className="w-4 h-4" />
                          {editedCallCenter.country}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="city">City</Label>
                      {isEditing ? (
                        <Input
                          value={editedCallCenter.city}
                          onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, city: e.target.value } : null)}
                        />
                      ) : (
                        <div className="p-2 border rounded">
                          {editedCallCenter.city}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="positions">Positions</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedCallCenter.positions}
                          onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, positions: parseInt(e.target.value) || 0 } : null)}
                        />
                      ) : (
                        <div className="p-2 border rounded">
                          {editedCallCenter.positions} positions
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      {isEditing ? (
                        <Select
                          value={editedCallCenter.status}
                          onValueChange={(value: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost' | 'On-Hold') => setEditedCallCenter(prev => prev ? { ...prev, status: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Qualified">Qualified</SelectItem>
                            <SelectItem value="Proposal">Proposal</SelectItem>
                            <SelectItem value="Negotiation">Negotiation</SelectItem>
                            <SelectItem value="Closed-Won">Closed-Won</SelectItem>
                            <SelectItem value="Closed-Lost">Closed-Lost</SelectItem>
                            <SelectItem value="On-Hold">On-Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`p-2 ${getStatusColor(editedCallCenter.status)}`}>
                          {editedCallCenter.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="value">Value</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedCallCenter.value}
                          onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, value: parseFloat(e.target.value) || 0 } : null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <DollarSign className="w-4 h-4" />
                          {editedCallCenter.value?.toLocaleString()} {editedCallCenter.currency}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="source">Source</Label>
                      <div className="p-2 border rounded">
                        {editedCallCenter.source}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="phones">Phone Numbers</Label>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditedCallCenter(prev => prev ? {
                            ...prev,
                            phones: [...prev.phones, '']
                          } : null)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Phone
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {editedCallCenter.phones.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Input
                                value={phone}
                                onChange={(e) => {
                                  const newPhones = [...editedCallCenter.phones];
                                  newPhones[index] = e.target.value;
                                  setEditedCallCenter(prev => prev ? {
                                    ...prev,
                                    phones: newPhones
                                  } : null);
                                }}
                                placeholder="+212 6XX XXX XXX"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditedCallCenter(prev => prev ? {
                                  ...prev,
                                  phones: prev.phones.filter((_, i) => i !== index)
                                } : null)}
                                disabled={editedCallCenter.phones.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex-1">
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <Phone className="w-4 h-4" />
                                {phone}
                                {editedCallCenter.phone_infos && editedCallCenter.phone_infos[index] && editedCallCenter.phone_infos[index].is_mobile && editedCallCenter.phone_infos[index].whatsapp_confidence >= 0.7 && (
                                  <a
                                    href={PhoneDetectionService.getWhatsAppLink(phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                  >
                                    WhatsApp
                                  </a>
                                )}
                              </div>
                              {/* WhatsApp Status Indicator */}
                              {editedCallCenter.phone_infos && editedCallCenter.phone_infos[index] && (
                                <div className="mt-1 ml-2">
                                  {(() => {
                                    const phoneInfo = editedCallCenter.phone_infos[index];
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
                              
                              {/* Manual "No WhatsApp" Button */}
                              <div className="mt-1 ml-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 px-2"
                                  onClick={async () => {
                                    const phone = editedCallCenter.phones[index];
                                    if (confirm(`Mark ${phone} as "No WhatsApp"? This will exclude this call center from daily WhatsApp suggestions until you add another mobile number.`)) {
                                      try {
                                        const response = await fetch(`/api/external-crm/call-centers/${callCenter.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            no_whatsapp_phones: [...(editedCallCenter.no_whatsapp_phones || []), phone],
                                            updatedAt: new Date().toISOString()
                                          })
                                        });
                                        
                                        if (response.ok) {
                                          // Update local state
                                          setEditedCallCenter(prev => ({
                                            ...prev!,
                                            no_whatsapp_phones: [...(prev?.no_whatsapp_phones || []), phone]
                                          }));
                                          onCallCenterUpdate({
                                            ...editedCallCenter,
                                            no_whatsapp_phones: [...(editedCallCenter.no_whatsapp_phones || []), phone]
                                          });
                                          alert(`${phone} marked as "No WhatsApp". This call center will be excluded from daily WhatsApp suggestions.`);
                                        } else {
                                          alert('Failed to mark phone as "No WhatsApp"');
                                        }
                                      } catch (error) {
                                        console.error('Error marking phone as no WhatsApp:', error);
                                        alert('Error marking phone as "No WhatsApp"');
                                      }
                                    }
                                  }}
                                  disabled={editedCallCenter.no_whatsapp_phones?.includes(phone)}
                                >
                                  {editedCallCenter.no_whatsapp_phones?.includes(phone) ? '🚫 Marked No WhatsApp' : 'Mark as No WhatsApp'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="emails">Email Addresses</Label>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditedCallCenter(prev => prev ? {
                            ...prev,
                            emails: [...prev.emails, '']
                          } : null)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Email
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {editedCallCenter.emails.map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Input
                                value={email}
                                onChange={(e) => {
                                  const newEmails = [...editedCallCenter.emails];
                                  newEmails[index] = e.target.value;
                                  setEditedCallCenter(prev => prev ? {
                                    ...prev,
                                    emails: newEmails
                                  } : null);
                                }}
                                placeholder="contact@company.com"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditedCallCenter(prev => prev ? {
                                  ...prev,
                                  emails: prev.emails.filter((_, i) => i !== index)
                                } : null)}
                                disabled={editedCallCenter.emails.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 p-2 border rounded flex-1">
                              <Mail className="w-4 h-4" />
                              {email}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    {isEditing ? (
                      <Input
                        id="website"
                        value={editedCallCenter.website || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, website: e.target.value } : null)}
                        placeholder="https://www.company.com"
                      />
                    ) : (
                      editedCallCenter.website && (
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <Globe className="w-4 h-4" />
                          <a href={editedCallCenter.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {editedCallCenter.website}
                          </a>
                        </div>
                      )
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    {isEditing ? (
                      <Textarea
                        id="address"
                        value={editedCallCenter.address || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, address: e.target.value } : null)}
                        placeholder="Full address"
                        rows={2}
                      />
                    ) : (
                      editedCallCenter.address && (
                        <div className="p-2 border rounded">
                          {editedCallCenter.address}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tags and Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    {isEditing ? (
                      <Input
                        id="tags"
                        value={editedCallCenter.tags?.join(', ') || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                        } : null)}
                        placeholder="e.g., premium, urgent, high-priority"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {editedCallCenter.tags?.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        )) || <span className="text-gray-500">No tags</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="source">Source</Label>
                    {isEditing ? (
                      <Input
                        id="source"
                        value={editedCallCenter.source || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, source: e.target.value } : null)}
                        placeholder="e.g., Google, Facebook, Referral"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.source || 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    {isEditing ? (
                      <Select
                        value={editedCallCenter.businessType || ''}
                        onValueChange={(value) => setEditedCallCenter(prev => prev ? { ...prev, businessType: value as 'call-center' | 'voip-reseller' | 'data-vendor' | 'workspace-rental' | 'individual' | undefined } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call-center">🏢 Call Center</SelectItem>
                          <SelectItem value="voip-reseller">📞 VoIP Reseller</SelectItem>
                          <SelectItem value="data-vendor">📄 Data Vendor</SelectItem>
                          <SelectItem value="workspace-rental">🏢 Workspace Rental</SelectItem>
                          <SelectItem value="individual">👤 Individual</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.businessType ? (
                          editedCallCenter.businessType === 'call-center' && '🏢 Call Center' ||
                          editedCallCenter.businessType === 'voip-reseller' && '📞 VoIP Reseller' ||
                          editedCallCenter.businessType === 'data-vendor' && '📄 Data Vendor' ||
                          editedCallCenter.businessType === 'workspace-rental' && '🏢 Workspace Rental' ||
                          editedCallCenter.businessType === 'individual' && '👤 Individual' ||
                          editedCallCenter.businessType
                        ) : 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="type">Type</Label>
                    {isEditing ? (
                      <Input
                        id="type"
                        value={editedCallCenter.type || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, type: e.target.value } : null)}
                        placeholder="e.g., Inbound, Outbound, Blended"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.type || 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="competitors">Competitors</Label>
                    {isEditing ? (
                      <Input
                        id="competitors"
                        value={editedCallCenter.competitors?.join(', ') || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          competitors: e.target.value.split(',').map(comp => comp.trim()).filter(comp => comp)
                        } : null)}
                        placeholder="e.g., Company A, Company B"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.competitors?.join(', ') || 'None specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="socialMedia">Social Media</Label>
                    {isEditing ? (
                      <Input
                        id="socialMedia"
                        value={editedCallCenter.socialMedia?.join(', ') || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          socialMedia: e.target.value.split(',').map(sm => sm.trim()).filter(sm => sm)
                        } : null)}
                        placeholder="e.g., https://facebook.com/page, https://linkedin.com/company"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.socialMedia?.join(', ') || 'None specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>🎯 Calling Destinations</Label>
                    {isEditing ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-md">
                        {['USA', 'Canada', 'France', 'Spain', 'Switzerland', 'Italy', 'Germany', 'UK', 'Belgium'].map((destination) => (
                          <div key={destination} className="flex items-center space-x-2">
                            <Checkbox
                              id={`destination-${destination}`}
                              checked={editedCallCenter.destinations?.includes(destination) || false}
                              onCheckedChange={(checked) => {
                                setEditedCallCenter(prev => {
                                  if (!prev) return null;
                                  const currentDestinations = prev.destinations || [];
                                  if (checked) {
                                    return {
                                      ...prev,
                                      destinations: [...currentDestinations, destination]
                                    };
                                  } else {
                                    return {
                                      ...prev,
                                      destinations: currentDestinations.filter(d => d !== destination)
                                    };
                                  }
                                });
                              }}
                            />
                            <Label htmlFor={`destination-${destination}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {destination}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {editedCallCenter.destinations?.map((destination, index) => (
                          <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            🌍 {destination}
                          </Badge>
                        )) || <span className="text-gray-500">No destinations specified</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="markets">Markets</Label>
                    {isEditing ? (
                      <Input
                        id="markets"
                        value={editedCallCenter.markets?.join(', ') || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          markets: e.target.value.split(',').map(market => market.trim()).filter(market => market)
                        } : null)}
                        placeholder="e.g., Morocco, France, Spain"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.markets?.join(', ') || 'None specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="foundDate">Found Date</Label>
                    {isEditing ? (
                      <Input
                        id="foundDate"
                        type="date"
                        value={editedCallCenter.foundDate || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, foundDate: e.target.value } : null)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <Calendar className="w-4 h-4" />
                        {editedCallCenter.foundDate ? new Date(editedCallCenter.foundDate).toLocaleDateString() : 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lastContacted">Last Contacted</Label>
                    {isEditing ? (
                      <Input
                        id="lastContacted"
                        type="date"
                        value={editedCallCenter.lastContacted || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, lastContacted: e.target.value } : null)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <Clock className="w-4 h-4" />
                        {editedCallCenter.lastContacted ? new Date(editedCallCenter.lastContacted).toLocaleDateString() : 'Never'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Created</Label>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Calendar className="w-4 h-4" />
                      {new Date(editedCallCenter.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <Label>Last Updated</Label>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Clock className="w-4 h-4" />
                      {new Date(editedCallCenter.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Contacts ({contacts.length})
              </h3>
              <Button onClick={() => setShowContactForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>

            {contacts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Contacts Added</h3>
                  <p className="text-gray-600 mb-4">
                    Add contacts to track key people at this call center.
                  </p>
                  <Button onClick={() => setShowContactForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Contact
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <Card key={contact.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-gray-400 mt-1" />
                          <div className="flex-1">
                            <h4 className="font-semibold">{contact.name}</h4>
                            <p className="text-sm text-gray-600">{contact.position}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {contact.department && (
                                <Badge variant="outline">
                                  {contact.department}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Added {new Date(contact.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteContact(contact.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                                {contact.phone}
                              </a>
                              {contact.phone_info && contact.phone_info.is_mobile && contact.phone_info.whatsapp_confidence >= 0.7 && (
                                <a
                                  href={PhoneDetectionService.getWhatsAppLink(contact.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </div>
                            {/* WhatsApp Status Indicator for Contact */}
                            {contact.phone_info && (
                              <div className="mt-1 ml-6">
                                {(() => {
                                  const confidence = contact.phone_info.whatsapp_confidence || 0;
                                  
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
                        )}
                      </div>

                      {contact.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                          {contact.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="steps" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Steps ({steps.length})
              </h3>
              <Button onClick={() => setShowStepForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>

            {steps.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Steps Added</h3>
                  <p className="text-gray-600 mb-4">
                    Add steps to track your progress with this call center (calls, meetings, emails, etc.)
                  </p>
                  <Button onClick={() => setShowStepForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Step
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {steps
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((step) => (
                    <Card key={step.id} className={step.completed ? 'bg-green-50 border-green-200' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={step.completed}
                              onChange={() => handleToggleStepComplete(step.id)}
                              className="mt-1"
                              title="Mark step as completed"
                            />
                            <div className="flex-1">
                              <h4 className={`font-semibold ${step.completed ? 'line-through text-gray-500' : ''}`}>
                                {step.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(step.date).toLocaleDateString()}
                                </div>
                                {step.priority && (
                                  <Badge
                                    variant="outline"
                                    className={`${
                                      step.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                                      step.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                      'bg-gray-100 text-gray-800 border-gray-200'
                                    }`}
                                  >
                                    {step.priority.charAt(0).toUpperCase() + step.priority.slice(1)} Priority
                                  </Badge>
                                )}
                                {step.completed && (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreateCalendarEvent(step)}
                              title="Add to Calendar"
                            >
                              <Calendar className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStep(step)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteStep(step.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {step.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                            {step.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="call-log" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Call Log ({callHistory.length})
                  </h3>
                  {selectedCallLogs.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedCallLogs.size} selected
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (selectedCallLogs.size === 0) return;

                          const confirmMessage = `Are you sure you want to delete ${selectedCallLogs.size} call log${selectedCallLogs.size > 1 ? 's' : ''}?`;
                          if (!confirm(confirmMessage)) return;

                          try {
                            const callLogIds = Array.from(selectedCallLogs);
                            await ExternalCRMSubcollectionsService.batchDeleteCallLogs(callCenter!.id.toString(), callLogIds);
                            setSelectedCallLogs(new Set());
                            loadCallHistory(callCenter!.id);
                          } catch (error) {
                            console.error('Error bulk deleting call logs:', error);
                            alert('Failed to delete call logs');
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Bulk Remove
                      </Button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    // Quick log call with full disposition list
                    const disposition = prompt(`Quick Call Disposition for ${callCenter?.name}:\n\n` +
                      `1. INT — Intéressé (wants solution/more info)\n2. REQ — Demande devis (asked for quote)\n3. CALLBK — Rappeler (callback requested)\n4. TRIAL — Veut test/démo (wants trial/demo)\n5. TECH — Contacter la technique (wants technical contact)\n6. MEET — RDV pris/visite (meeting scheduled)\n7. SAT — Je suis satisfait (satisfied customer)\n8. NOQ — Pas de budget (interested but no budget)\n9. COMP — Déjà avec concurrents (uses competitor)\n10. NWT — Not with them (person no longer there)\n11. WRONG — Mauvais numéro (wrong number)\n12. DUP — Duplicate/déjà contacté (already contacted)\n13. SPAM — Ne veut pas être contacté (do not contact)\n14. DEAD — Prospect Dead/Toxic/Manipulative/Rude\n15. NOC — Not a Call Center\n16. CLOSED — Company Closed\n17. OUT — Out of Target\n18. ABUSIVE — Treated you badly (Insults/Aggression)\n19. NC — Non convaincu/Not convinced\n20. BUSY — Occupied/Call me later (no specific time)\n21. NOANSWER — No Answer After Engagement\n\nEnter number (1-21) or click Cancel for full form:`);

                    if (disposition) {
                      const dispositionMap = {
                        '1': 'interested',
                        '2': 'quote_requested',
                        '3': 'callback',
                        '4': 'trial_requested',
                        '5': 'technical_contact',
                        '6': 'meeting_scheduled',
                        '7': 'satisfied',
                        '8': 'no_budget',
                        '9': 'competitor',
                        '10': 'not_with_them',
                        '11': 'wrong_number',
                        '12': 'duplicate',
                        '13': 'spam',
                        '14': 'dead',
                        '15': 'not_call_center',
                        '16': 'closed',
                        '17': 'out_target',
                        '18': 'abusive',
                        '19': 'not_convinced',
                        '20': 'busy',
                        '21': 'no_answer_engaged'
                      };

                      const selectedDisposition = dispositionMap[disposition as keyof typeof dispositionMap];
                      if (selectedDisposition) {
                        quickLogCall(selectedDisposition);
                      } else {
                        setShowCallLogForm(true);
                      }
                    } else {
                      setShowCallLogForm(true);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone w-4 h-4 mr-2" aria-hidden="true">
                    <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>
                  </svg>
                  Log Call
                </button>
              </div>

              {loadingCallHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : callHistory.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Call History</h3>
                    <p className="text-gray-600 mb-4">
                      No calls have been logged for this call center yet.
                    </p>
                    <button
                      onClick={() => setShowCallLogForm(true)}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone w-4 h-4 mr-2" aria-hidden="true">
                        <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>
                      </svg>
                      Log Call
                    </button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Select All checkbox */}
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="select-all-calls"
                      checked={selectedCallLogs.size === callHistory.length && callHistory.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCallLogs(new Set(callHistory.map(call => call.id)));
                        } else {
                          setSelectedCallLogs(new Set());
                        }
                      }}
                    />
                    <Label htmlFor="select-all-calls" className="text-sm font-medium">
                      Select All ({callHistory.length} call{callHistory.length !== 1 ? 's' : ''})
                    </Label>
                  </div>

                  {callHistory
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((callLog) => (
                      <Card key={callLog.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedCallLogs.has(callLog.id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedCallLogs);
                                  if (checked) {
                                    newSelected.add(callLog.id);
                                  } else {
                                    newSelected.delete(callLog.id);
                                  }
                                  setSelectedCallLogs(newSelected);
                                }}
                              />
                              <Badge
                                variant="outline"
                                className={`${
                                  callLog.outcome === 'answered' ? 'bg-green-100 text-green-800 border-green-200' :
                                  callLog.outcome === 'no-answer' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  callLog.outcome === 'busy' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                  callLog.outcome === 'voicemail' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                  'bg-gray-100 text-gray-800 border-gray-200'
                                }`}
                              >
                                {callLog.outcome.replace('-', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(callLog.date).toLocaleDateString()} at {new Date(callLog.date).toLocaleTimeString()}
                              </span>
                            </div>
                            {callLog.duration > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDuration(callLog.duration)}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">{callLog.notes}</p>

                            {callLog.followUp && callLog.followUp !== 'none' && (
                              <div className="flex items-center gap-2 text-xs text-blue-600">
                                <Calendar className="w-3 h-3" />
                                <span>Follow-up: {callLog.followUp.replace('-', ' ')}</span>
                              </div>
                            )}
                          </div>

                          {/* Call Result Classification Section */}
                          <div className="mt-4 border-t pt-4">
                            <details className="group">
                              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                <span className="flex items-center gap-2">
                                  📊 Call Result Classification
                                  {(callLog.is_argumented !== undefined || callLog.decision_maker_reached !== undefined || callLog.objection_category || callLog.refusal_reason) && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      Configured
                                    </Badge>
                                  )}
                                </span>
                                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>

                              <div className="mt-4 space-y-4">
                                {/* Argumentation */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Argumentation</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge
                                        variant={callLog.is_argumented === true ? "default" : callLog.is_argumented === false ? "secondary" : "outline"}
                                        className="text-xs"
                                      >
                                        {callLog.is_argumented === true ? "✅ Argumenté" : callLog.is_argumented === false ? "❌ Non argumenté" : "Not set"}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Decision Maker Reached</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge
                                        variant={callLog.decision_maker_reached === true ? "default" : callLog.decision_maker_reached === false ? "secondary" : "outline"}
                                        className="text-xs"
                                      >
                                        {callLog.decision_maker_reached === true ? "✅ Yes" : callLog.decision_maker_reached === false ? "❌ No" : "Not set"}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Objection */}
                                {callLog.objection_category && (
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Objection Category</Label>
                                    <div className="mt-1">
                                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                        {callLog.objection_category === 'price' && '💰 Price'}
                                        {callLog.objection_category === 'email' && '📧 Email'}
                                        {callLog.objection_category === 'timing' && '⏰ Timing'}
                                        {callLog.objection_category === 'already_has_provider' && '🏢 Already Has Provider'}
                                        {callLog.objection_category === 'bad_number' && '📞 Bad Number'}
                                        {callLog.objection_category === 'other' && '❓ Other'}
                                      </Badge>
                                    </div>
                                    {callLog.objection_detail && (
                                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                                        <strong>Details:</strong> {callLog.objection_detail}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Reason for Refusal */}
                                {callLog.refusal_reason && (
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Reason for Refusal</Label>
                                    <div className="mt-1">
                                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                        {callLog.refusal_reason === 'prix_trop_cher' && '💰 Prix trop cher'}
                                        {callLog.refusal_reason === 'envoyez_un_email' && '📧 Envoyez un email'}
                                        {callLog.refusal_reason === 'pas_maintenant' && '⏰ Pas maintenant'}
                                        {callLog.refusal_reason === 'deja_un_fournisseur' && '🏢 Déjà un fournisseur'}
                                        {callLog.refusal_reason === 'mauvais_numero' && '📞 Mauvais numéro'}
                                        {callLog.refusal_reason === 'autre' && '❓ Autre'}
                                      </Badge>
                                    </div>
                                  </div>
                                )}

                                {/* Edit Classification Button */}
                                <div className="flex justify-end pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Open classification modal/form
                                      setEditingCallLog(callLog);
                                      setClassificationData({
                                        is_argumented: callLog.is_argumented === true ? 'true' : callLog.is_argumented === false ? 'false' : '',
                                        decision_maker_reached: callLog.decision_maker_reached === true ? 'true' : callLog.decision_maker_reached === false ? 'false' : '',
                                        objection_category: callLog.objection_category || '',
                                        objection_detail: callLog.objection_detail || '',
                                        refusal_reason: callLog.refusal_reason || '',
                                      });
                                      setShowClassificationForm(true);
                                    }}
                                    className="text-xs"
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit Classification
                                  </Button>
                                </div>
                              </div>
                            </details>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="whatsapp-history" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  WhatsApp History ({whatsappHistory.length})
                </h3>
              </div>

              {loadingWhatsappHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : whatsappHistory.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No WhatsApp History</h3>
                    <p className="text-gray-600">
                      No WhatsApp messages have been sent to this call center yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {whatsappHistory
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((entry, index) => (
                      <Card key={index} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${
                                  entry.action === 'sent' ? 'bg-green-100 text-green-800 border-green-200' :
                                  entry.action === 'moved_to_sent' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  entry.action === 'moved_back' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  'bg-gray-100 text-gray-800 border-gray-200'
                                }`}
                              >
                                {entry.action.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(entry.date).toLocaleDateString()} at {new Date(entry.date).toLocaleTimeString()}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(entry.date).toLocaleTimeString()}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">{entry.details?.notes || 'No notes'}</p>

                            {entry.details?.message && (
                              <div className="bg-white p-2 rounded border-l-4 border-green-500">
                                <strong>Message sent:</strong>
                                <div className="mt-1 text-xs italic">"{entry.details.message}"</div>
                              </div>
                            )}

                            {entry.details?.reason && (
                              <div className="bg-yellow-50 p-2 rounded border-l-4 border-yellow-500">
                                <strong>Reason:</strong>
                                <div className="mt-1 text-xs text-yellow-800">{entry.details.reason}</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="topups" className="space-y-6">
            <ClientTopUpsManagement
              callCenters={callCenter ? [callCenter] : []}
              onDataChange={() => {
                // Refresh financial data when top-ups are added/updated
                // This will be handled by the parent component
              }}
            />
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <SummaryManagement
              callCenter={callCenter}
              onUpdate={(data: Omit<CallCenter, 'id' | 'createdAt'>) => {
                console.log('🔄 [SUMMARY] Save Summary button clicked, summary:', data.summary?.substring(0, 50) + '...');
                // Handle summary update separately from main call center update
                if (onSummaryUpdate && callCenter) {
                  console.log('✅ [SUMMARY] Using separate summary update function');
                  onSummaryUpdate(callCenter.id, data.summary || '');
                } else {
                  console.log('⚠️ [SUMMARY] Falling back to full call center update');
                  // Fallback to full update if summary update not provided
                  onCallCenterUpdate({
                    ...callCenter,
                    summary: data.summary || ''
                  });
                }
              }}
            />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Activity Log</h3>
                <p className="text-gray-600">
                  Activity tracking will be available in a future update
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedCallCenter.notes || ''}
                    onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    placeholder="Add notes about this call center..."
                    rows={6}
                  />
                ) : (
                  <div className="p-4 border rounded min-h-[150px] bg-gray-50">
                    {editedCallCenter.notes ? (
                      <p className="whitespace-pre-wrap">{editedCallCenter.notes}</p>
                    ) : (
                      <p className="text-gray-500 italic">No notes added yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact Form Modal */}
        {/* Contact Form Modal */}
        <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
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
                <Label htmlFor="contact-department">Department</Label>
                <Select
                  value={contactForm.department}
                  onValueChange={(value) => setContactForm(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Button variant="outline" onClick={() => setShowContactForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleContactSubmit}>
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Step Form Modal */}
        <Dialog open={showStepForm} onOpenChange={setShowStepForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStep ? 'Edit Step' : 'Add New Step'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="step-title">Title *</Label>
                <Input
                  id="step-title"
                  value={stepForm.title}
                  onChange={(e) => setStepForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Call Manager, Send Proposal, Schedule Meeting"
                />
              </div>

              <div>
                <Label htmlFor="step-description">Description</Label>
                <Textarea
                  id="step-description"
                  value={stepForm.description}
                  onChange={(e) => setStepForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what needs to be done..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="step-date">Date *</Label>
                <Input
                  id="step-date"
                  type="date"
                  value={stepForm.date}
                  onChange={(e) => setStepForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="step-priority">Priority</Label>
                <Select
                  value={stepForm.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => setStepForm(prev => ({ ...prev, priority: value }))}
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

              <div>
                <Label htmlFor="step-notes">Notes</Label>
                <Textarea
                  id="step-notes"
                  value={stepForm.notes}
                  onChange={(e) => setStepForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this step..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowStepForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStepSubmit}>
                  {editingStep ? 'Update Step' : 'Add Step'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Call Result Classification Form Modal */}
        <Dialog open={showClassificationForm} onOpenChange={setShowClassificationForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Call Result Classification</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Argumentation */}
              <div>
                <Label className="text-sm font-medium">Argumentation *</Label>
                <Select
                  value={classificationData.is_argumented}
                  onValueChange={(value) => {
                    setClassificationData(prev => ({ ...prev, is_argumented: value }));
                    // Auto-hide objection fields if non-argumenté
                    if (value === 'false') {
                      setClassificationData(prev => ({
                        ...prev,
                        objection_category: '',
                        objection_detail: '',
                        refusal_reason: ''
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select argumentation status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">✅ Argumenté</SelectItem>
                    <SelectItem value="false">❌ Non argumenté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Decision Maker Reached */}
              <div>
                <Label className="text-sm font-medium">Decision Maker Reached *</Label>
                <Select
                  value={classificationData.decision_maker_reached}
                  onValueChange={(value) => setClassificationData(prev => ({ ...prev, decision_maker_reached: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Did you reach the decision maker?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">✅ Yes</SelectItem>
                    <SelectItem value="false">❌ No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Objection Category - Only show if argumenté */}
              {classificationData.is_argumented === 'true' && (
                <div>
                  <Label className="text-sm font-medium">Objection Category</Label>
                  <Select
                    value={classificationData.objection_category}
                    onValueChange={(value) => {
                      setClassificationData(prev => ({ ...prev, objection_category: value }));
                      // Auto-set for bad_number
                      if (value === 'bad_number') {
                        setClassificationData(prev => ({
                          ...prev,
                          refusal_reason: 'mauvais_numero'
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select objection category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price">💰 Price</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="timing">⏰ Timing</SelectItem>
                      <SelectItem value="already_has_provider">🏢 Already Has Provider</SelectItem>
                      <SelectItem value="bad_number">📞 Bad Number</SelectItem>
                      <SelectItem value="other">❓ Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Objection Detail - Only show if category selected */}
              {classificationData.is_argumented === 'true' && classificationData.objection_category && (
                <div>
                  <Label className="text-sm font-medium">Objection Detail</Label>
                  <Textarea
                    value={classificationData.objection_detail}
                    onChange={(e) => setClassificationData(prev => ({ ...prev, objection_detail: e.target.value }))}
                    placeholder="Enter the exact response from the prospect..."
                    rows={3}
                  />
                </div>
              )}

              {/* Reason for Refusal - Only show if argumenté */}
              {classificationData.is_argumented === 'true' && (
                <div>
                  <Label className="text-sm font-medium">Reason for Refusal</Label>
                  <Select
                    value={classificationData.refusal_reason}
                    onValueChange={(value) => setClassificationData(prev => ({ ...prev, refusal_reason: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select refusal reason (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prix_trop_cher">💰 Prix trop cher</SelectItem>
                      <SelectItem value="envoyez_un_email">📧 Envoyez un email</SelectItem>
                      <SelectItem value="pas_maintenant">⏰ Pas maintenant</SelectItem>
                      <SelectItem value="deja_un_fournisseur">🏢 Déjà un fournisseur</SelectItem>
                      <SelectItem value="mauvais_numero">📞 Mauvais numéro</SelectItem>
                      <SelectItem value="autre">❓ Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowClassificationForm(false);
                    setEditingCallLog(null);
                    setClassificationData({
                      is_argumented: '',
                      decision_maker_reached: '',
                      objection_category: '',
                      objection_detail: '',
                      refusal_reason: '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!editingCallLog || !callCenter) return;

                    try {
                      const response = await fetch(`/api/external-crm/daily-calls/call-log/${editingCallLog.id}/classification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          is_argumented: classificationData.is_argumented === 'true',
                          decision_maker_reached: classificationData.decision_maker_reached === 'true',
                          objection_category: classificationData.objection_category || undefined,
                          objection_detail: classificationData.objection_detail || undefined,
                          refusal_reason: classificationData.refusal_reason || undefined,
                        }),
                      });

                      if (response.ok) {
                        setShowClassificationForm(false);
                        setEditingCallLog(null);
                        setClassificationData({
                          is_argumented: '',
                          decision_maker_reached: '',
                          objection_category: '',
                          objection_detail: '',
                          refusal_reason: '',
                        });
                        // Refresh call history
                        loadCallHistory(callCenter.id);
                        alert('Classification updated successfully!');
                      } else {
                        const errorData = await response.json();
                        alert(`Failed to update classification: ${errorData.error || 'Unknown error'}`);
                      }
                    } catch (error) {
                      console.error('Error updating classification:', error);
                      alert('Failed to update classification');
                    }
                  }}
                  disabled={!classificationData.is_argumented || !classificationData.decision_maker_reached}
                >
                  Save Classification
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Call Log Form Modal */}
        <Dialog open={showCallLogForm} onOpenChange={setShowCallLogForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Call - {callCenter?.name}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Analysis</TabsTrigger>
                <TabsTrigger value="quality">Quality Scoring</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
              {/* Call Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="callDate">Call Date (mm/dd/yyyy)</Label>
                  <Input
                    type="text"
                    id="callDate"
                    value={callLogData.callDate}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, callDate: e.target.value }))}
                    placeholder="mm/dd/yyyy"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter date in mm/dd/yyyy format
                  </p>
                </div>
                <div>
                  <Label htmlFor="callTime">Call Time (HH:MM format)</Label>
                  <Input
                    type="text"
                    id="callTime"
                    value={callLogData.callTime}
                    onChange={(e) => {
                      console.log('🔍 [CALL-LOG] Time input changed from', callLogData.callTime, 'to', e.target.value);
                      setCallLogData(prev => ({ ...prev, callTime: e.target.value }));
                    }}
                    placeholder="HH:MM"
                    pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter time in HH:MM format (24-hour). Leave as current time to use now
                  </p>
                </div>
              </div>

              {/* Phone Number Selection */}
              {callCenter.phones && callCenter.phones.length > 0 && (
                <div>
                  <Label htmlFor="phone_used">Phone Number Called</Label>
                  <Select value={callLogData.phone_used} onValueChange={(value) =>
                    setCallLogData(prev => ({ ...prev, phone_used: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phone number that was called" />
                    </SelectTrigger>
                    <SelectContent>
                      {callCenter.phones.map((phone, index) => (
                        <SelectItem key={index} value={phone}>
                          {phone} {index === 0 ? '(Primary)' : `(${index + 1})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which phone number was used for this call
                  </p>
                </div>
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
                    <SelectItem value="answering-machine">Answering Machine</SelectItem>
                    <SelectItem value="wrong-number">Wrong Number</SelectItem>
                    <SelectItem value="callback-requested">Callback Requested</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Call Disposition - Only show for answered calls */}
              {callLogData.outcome === 'answered' && (
                <div>
                  <Label htmlFor="disposition">Call Disposition *</Label>
                  <Select value={callLogData.disposition} onValueChange={(value) =>
                    setCallLogData(prev => ({ ...prev, disposition: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select disposition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interested">INT — Intéressé (wants solution/more info)</SelectItem>
                      <SelectItem value="quote_requested">REQ — Demande devis (asked for quote)</SelectItem>
                      <SelectItem value="callback">CALLBK — Rappeler (callback requested)</SelectItem>
                      <SelectItem value="trial_requested">TRIAL — Veut test/démo (wants trial/demo)</SelectItem>
                      <SelectItem value="technical_contact">TECH — Contacter la technique (wants technical contact)</SelectItem>
                      <SelectItem value="meeting_scheduled">MEET — RDV pris/visite (meeting scheduled)</SelectItem>
                      <SelectItem value="satisfied">SAT — Je suis satisfait (satisfied customer)</SelectItem>
                      <SelectItem value="no_budget">NOQ — Pas de budget (interested but no budget)</SelectItem>
                      <SelectItem value="competitor">COMP — Déjà avec concurrents (uses competitor)</SelectItem>
                      <SelectItem value="not_with_them">NWT — Not with them (person no longer there)</SelectItem>
                      <SelectItem value="wrong_number">WRONG — Mauvais numéro (wrong number)</SelectItem>
                      <SelectItem value="duplicate">DUP — Duplicate/déjà contacté (already contacted)</SelectItem>
                      <SelectItem value="spam">SPAM — Ne veut pas être contacté (do not contact)</SelectItem>
                      <SelectItem value="dead">DEAD — Prospect Dead/Toxic/Manipulative/Rude</SelectItem>
                      <SelectItem value="not_call_center">NOC — Not a Call Center</SelectItem>
                      <SelectItem value="closed">CLOSED — Company Closed</SelectItem>
                      <SelectItem value="out_target">OUT — Out of Target</SelectItem>
                      <SelectItem value="abusive">ABUSIVE — Treated you badly (Insults/Aggression)</SelectItem>
                      <SelectItem value="not_convinced">NC — Non convaincu/Not convinced</SelectItem>
                      <SelectItem value="busy">BUSY — Occupied/Call me later (no specific time)</SelectItem>
                      <SelectItem value="no_answer_engaged">NOANSWER — No Answer After Engagement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Duration */}
              <div>
                <Label htmlFor="duration">Duration (mm:ss format)</Label>
                <input
                  type="text"
                  id="duration"
                  value={callLogData.duration ? formatDuration(callLogData.duration) : ''}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Validate the input format
                    if (inputValue === '' || isValidDuration(inputValue)) {
                      const seconds = inputValue === '' ? 0 : parseDuration(inputValue);
                      setCallLogData(prev => ({ ...prev, duration: seconds }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter duration in mm:ss format (e.g., 4:05 for 4 minutes 5 seconds)"
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
                  onClick={() => setShowCallLogForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!callCenter || !callLogData.outcome || !callLogData.notes || (callLogData.outcome === 'answered' && !callLogData.disposition)) return;

                    try {
                      console.log('🔍 [CALL-LOG] Submitting call log with data:', {
                        callDate: callLogData.callDate,
                        callTime: callLogData.callTime,
                        outcome: callLogData.outcome,
                        duration: callLogData.duration,
                        notes: callLogData.notes,
                        followUp: callLogData.followUp,
                        disposition: callLogData.disposition,
                        phone_used: callLogData.phone_used,
                      });

                      const isoDate = getCallDateTimeISO(callLogData.callDate, callLogData.callTime);
                      console.log('🔍 [CALL-LOG] Generated ISO date:', isoDate);

                      // Save call log
                      const response = await fetch('/api/external-crm/daily-calls/call-log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          callCenterId: callCenter.id.toString(),
                          callLog: {
                            date: isoDate,
                            outcome: callLogData.outcome,
                            duration: callLogData.duration,
                            notes: callLogData.notes,
                            followUp: callLogData.followUp,
                            disposition: callLogData.disposition,
                            phone_used: callLogData.phone_used,
                          },
                        }),
                      });

                      if (response.ok) {

                        // Reset form and close
                        setCallLogData({
                          outcome: '',
                          duration: 0,
                          notes: '',
                          followUp: 'none',
                          disposition: '',
                          callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
                          callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
                          phone_used: '', // Track which phone number was used
                        });
                        setShowCallLogForm(false);

                        // Refresh call history
                        loadCallHistory(callCenter.id);

                        // Notify parent component about call log update
                        if (onCallLogUpdate) {
                          onCallLogUpdate(callCenter.id);
                        }

                        alert('Call logged successfully!');
                      } else {
                        alert('Failed to log call');
                      }
                    } catch (error) {
                      console.error('Error saving call log:', error);
                      alert('Failed to save call log');
                    }
                  }}
                  disabled={!callLogData.outcome || !callLogData.notes || (callLogData.outcome === 'answered' && !callLogData.disposition)}
                >
                  Save Call Log
                </Button>
              </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6">
                {/* Recording Section */}
                <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic w-5 h-5" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                      Recording
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    {callLogData.recordingUrl ? (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>
                            <span className="font-medium text-green-800">Recording uploaded</span>
                          </div>
                          <audio controls className="w-full">
                            <source src={callLogData.recordingUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // TODO: Implement replace recording functionality
                            alert('Replace recording functionality to be implemented');
                          }}
                          className="w-full"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw mr-2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
                          Replace Recording
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload mx-auto text-gray-400 mb-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                          <p className="text-gray-600 mb-2">Upload MP3 recording</p>
                          <p className="text-sm text-gray-500 mb-4">Drag and drop or click to browse (max 20MB)</p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement file upload functionality
                              alert('File upload functionality to be implemented');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                            Upload Recording
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="quality" className="space-y-6">
                <div className="text-center py-8 text-gray-500">
                  <p>Quality scoring features will be available in a future update</p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function getStatusColor(status: string) {
  const colors = {
    'New': 'bg-blue-100 text-blue-800 border-blue-200',
    'Contacted': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Qualified': 'bg-purple-100 text-purple-800 border-purple-200',
    'Proposal': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Negotiation': 'bg-orange-100 text-orange-800 border-orange-200',
    'Closed-Won': 'bg-green-100 text-green-800 border-green-200',
    'Closed-Lost': 'bg-red-100 text-red-800 border-red-200',
    'On-Hold': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[status as keyof typeof colors] || colors.New;
}
