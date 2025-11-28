'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Search } from 'lucide-react';
import { Phone, Mail, MessageSquare, Plus, Upload, Trash2, Edit, CheckSquare, Square, History, Calendar as CalendarIcon, Eye, Target, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ProspectionService } from '@/lib/services/prospection-service';
import { ExternalCRMService, ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';
import { formatDuration, parseDuration, isValidDuration } from '@/lib/utils/duration';
import { matchProspectsToCallCenters, getCallCentersWithActiveAbsence, ProspectMatch, checkProspectInCallCenters, CallCenterMatch } from '@/lib/utils/prospect-matching';
import { CallCenter } from '@/lib/types/external-crm';

// Predefined destination options for calling destinations
export const DESTINATION_OPTIONS = [
  'USA',
  'Canada',
  'France',
  'Spain',
  'Switzerland',
  'Italy',
  'Germany',
  'UK',
  'Belgium'
];

// Disposition color mapping (same as in call-centers-list.tsx)
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

// Helper function to get disposition color
const getDispositionColor = (disposition: string | null): string => {
  if (!disposition || !DISPOSITION_COLORS[disposition as keyof typeof DISPOSITION_COLORS]) {
    return '#FFFFFF'; // Default white
  }
  return DISPOSITION_COLORS[disposition as keyof typeof DISPOSITION_COLORS];
};

// Helper function to get the latest disposition for a prospect
const getLatestDisposition = (prospect: Prospect): string | null => {
  if (!prospect.callHistory || prospect.callHistory.length === 0) {
    return null;
  }
  // Get the most recent call log (assuming they're sorted by date descending)
  const latestCall = prospect.callHistory[0];
  return latestCall.disposition || null;
};

// Helper function to get disposition display name
const getDispositionDisplayName = (disposition: string | null): string => {
  if (!disposition) return '';

  const names: Record<string, string> = {
    'interested': 'INT',
    'quote_requested': 'REQ',
    'callback': 'CALLBK',
    'trial_requested': 'TRIAL',
    'technical_contact': 'TECH',
    'meeting_scheduled': 'MEET',
    'satisfied': 'SAT',
    'no_budget': 'NOQ',
    'competitor': 'COMP',
    'not_with_them': 'NWT',
    'wrong_number': 'WRONG',
    'duplicate': 'DUP',
    'spam': 'SPAM',
    'dead': 'DEAD',
    'noc': 'NOC',
    'closed': 'CLOSED',
    'out': 'OUT',
    'abusive': 'ABUSIVE',
    'nc': 'NC',
    'busy': 'BUSY',
    'noanswer': 'NOANSWER',
    'inp': 'INP'
  };

  return names[disposition] || disposition.toUpperCase();
};

interface Prospect {
   id: string;
   name: string;
   country: string;
   city: string;
   positions: number;
   businessType: 'call-center' | 'voip-reseller' | 'data-vendor' | 'workspace-rental' | 'individual';
   phones: string[];
   phone_infos?: any[];
   emails: string[];
   website: string;
   address?: string;
   source?: string;
   tags: string[];
   notes: string;
   createdAt: string;
   updatedAt: string;
   // When the prospect was added
   addedDate: string; // Date when prospect was added to system
   // Status within prospects system
   status: 'active' | 'added_to_crm' | 'archived' | 'pending' | 'contacted' | 'qualified' | 'not_interested' | 'invalid';
   priority: 'low' | 'medium' | 'high';
   // New destinations field for calling destinations (multiple selection)
   destinations?: string[];
   // Contact tracking
   contactAttempts?: number;
   lastContacted?: string;
   contacts?: Contact[];
   callHistory?: CallLog[];
   // DNC/DND/DP fields
   dnc?: boolean; // Do Not Call
   dnd?: boolean; // Do Not Disturb
   dp?: boolean; // Dead Prospect
   dncDescription?: string;
   dndDescription?: string;
   dpDescription?: string;
}

interface Contact {
  id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  notes: string;
  // Personalization fields for rapport building
  personal_details?: string;
  rapport_tags?: string[];
  // Pattern interrupt fields
  pattern_interrupt_used?: boolean;
  pattern_interrupt_note?: string;
}

interface CallLog {
    id: string;
    date: string;
    duration: number;
    outcome: string;
    notes: string;
    followUp: string;
    // Call time field for tracking specific time of call
    callTime?: string;
    // Enhanced call log fields
    disposition?: 'interested' | 'quote_requested' | 'callback' | 'trial_requested' | 'no_budget' | 'technical_contact' | 'competitor' | 'wrong_number' | 'duplicate' | 'spam' | 'satisfied' | 'not_with_them' | 'meeting_scheduled' | 'dead' | 'noc' | 'closed' | 'out' | 'abusive' | 'nc' | 'busy' | 'noanswer' | 'no_answer' | 'not_interested' | 'invalid_number' | 'dnc' | 'manual_override';
    phone_used?: string;
    phone_index?: number;
    attempts_count?: number;
    override_reason?: string;
    override_by_agent?: string;
    // Follow-up actions for answered calls
    followUpAction?: 'dnc' | 'nwt' | 'satisfied';
    followUpDate?: string; // When to show again
    followUpNotification?: string; // Notification message to show
    // Recording and transcription fields
    recordingUrl?: string | null;
    transcriptionText?: string | null;
    autoAnalysisSummary?: string | null;
    coachFeedback?: string | null;
    hasRecording?: boolean;
    // Quality scoring fields
    accroche_score?: number; // 1-5
    discovery_score?: number; // 1-5
    value_prop_score?: number; // 1-5
    objection_score?: number; // 1-5
    closing_score?: number; // 1-5
    client_talk_ratio?: number; // 0-100 percentage
    agent_talk_ratio?: number; // 0-100 percentage (derived as 100 - client_talk_ratio)
    // Advanced call result classification fields
    is_argumented?: boolean; // True = argumenté, False = non argumenté
    decision_maker_reached?: boolean; // True/False
    objection_category?: 'price' | 'email' | 'timing' | 'already_has_provider' | 'bad_number' | 'other'; // ENUM values
    objection_detail?: string; // Free text for exact prospect response
    refusal_reason?: 'prix_trop_cher' | 'envoyez_un_email' | 'pas_maintenant' | 'deja_un_fournisseur' | 'mauvais_numero' | 'autre'; // ENUM values
    // Personalization fields for rapport building (added to call log)
    personal_details?: string;
    rapport_tags?: string[];
    // Pattern interrupt fields (added to call log)
    pattern_interrupt_used?: boolean;
    pattern_interrupt_note?: string;
  }

export default function ProspectionPage() {
  const [allProspects, setAllProspects] = useState<Prospect[]>([]);
  const [todayProspects, setTodayProspects] = useState<Prospect[]>([]);
  const [contactedToday, setContactedToday] = useState<Prospect[]>([]);
  const [linkedinProspects, setLinkedinProspects] = useState<Prospect[]>([]);
  const [combinedProspects, setCombinedProspects] = useState<Prospect[]>([]);
  const [allProspectsCount, setAllProspectsCount] = useState(0);
  const [duplicateGroups, setDuplicateGroups] = useState<{ [key: string]: Prospect[] }>({});
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [selectedDuplicateProspects, setSelectedDuplicateProspects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingContactedToday, setLoadingContactedToday] = useState(false);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  
  // Call centers and matching states for absence management
  const [callCenters, setCallCenters] = useState<CallCenter[]>([]);
  const [prospectMatches, setProspectMatches] = useState<Map<string, ProspectMatch | null>>(new Map());
  const [callCenterMatches, setCallCenterMatches] = useState<Map<string, CallCenterMatch | null>>(new Map());
  const [loadingCallCenters, setLoadingCallCenters] = useState(false);

  // Search and filter states for All Prospects tab
  const [searchTerm, setSearchTerm] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'contacted' | 'not-contacted'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [hasPhoneFilter, setHasPhoneFilter] = useState<'all' | 'has-phone' | 'no-phone'>('all');

  // Daily target tracking
  const [dailyTarget] = useState(10); // Target: 10 contacted prospects per day
  const [dailyProgress, setDailyProgress] = useState(0);
  
  // Duplicate detection status
  const [duplicateDetectionStatus, setDuplicateDetectionStatus] = useState<'loading' | 'working' | 'no-data' | 'error'>('loading');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressText, setImportProgressText] = useState('');
  const [showCallLogDialog, setShowCallLogDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [deletingProspectId, setDeletingProspectId] = useState<string | null>(null);
  const [editingCallLog, setEditingCallLog] = useState<CallLog | null>(null);
  const [showEditCallLogDialog, setShowEditCallLogDialog] = useState(false);
  const [deletingCallLogId, setDeletingCallLogId] = useState<string | null>(null);
  const [showInsertAnalysisDialog, setShowInsertAnalysisDialog] = useState(false);
  const [manualAnalysisText, setManualAnalysisText] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    positions: '',
    businessType: '',
    phones: [''],
    emails: [''],
    website: '',
    address: '',
    source: '',
    tags: '',
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    destinations: [] as string[],
    dnc: false,
    dnd: false,
    dp: false,
    dncDescription: '',
    dndDescription: '',
    dpDescription: ''
  });

  const [callLogData, setCallLogData] = useState({
    outcome: '',
    duration: 0,
    notes: '',
    followUp: 'none',
    disposition: '' as 'interested' | 'quote_requested' | 'callback' | 'trial_requested' | 'no_budget' | 'technical_contact' | 'competitor' | 'wrong_number' | 'duplicate' | 'spam' | 'satisfied' | 'not_with_them' | 'meeting_scheduled' | '',
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
    // Personalization fields for rapport building (added to call log)
    personal_details: '',
    rapport_tags: [] as string[],
    // Pattern interrupt fields (added to call log)
    pattern_interrupt_used: false,
    pattern_interrupt_note: '',
  });

  const [durationInputValue, setDurationInputValue] = useState('');
  const [editDurationInputValue, setEditDurationInputValue] = useState('');

  const [contactData, setContactData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    notes: '',
    // Personalization fields
    personal_details: '',
    rapport_tags: [] as string[],
    // Pattern interrupt fields
    pattern_interrupt_used: false,
    pattern_interrupt_note: ''
  });

  const [importData, setImportData] = useState('');

  // Helper function to convert phones field to array
  const getPhoneArray = (phones: any): string[] => {
    if (!phones) return [];
    if (Array.isArray(phones)) return phones;
    if (typeof phones === 'string') return phones.split(';').map(p => p.trim()).filter(p => p);
    return [];
  };

  // Helper function to convert emails field to array
  const getEmailArray = (emails: any): string[] => {
    if (!emails) return [];
    if (Array.isArray(emails)) return emails;
    if (typeof emails === 'string') return emails.split(';').map(e => e.trim()).filter(e => e);
    return [];
  };

  // Helper function to convert mm/dd/yyyy and time to ISO string, or use now if empty
  const getCallDateTimeISO = (callDateStr?: string, callTimeStr?: string): string => {
    if (!callDateStr || callDateStr.trim() === '') {
      return new Date().toISOString();
    }
    
    // Parse mm/dd/yyyy format
    const parts = callDateStr.split('/');
    if (parts.length !== 3) {
      console.warn('Invalid date format, using now:', callDateStr);
      return new Date().toISOString();
    }
    
    const [month, day, year] = parts.map(p => parseInt(p, 10));
    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      console.warn('Invalid date numbers, using now:', callDateStr);
      return new Date().toISOString();
    }
    
    // Default time values
    let hours = 0, minutes = 0;
    
    // If time is provided, parse it
    if (callTimeStr && callTimeStr.trim() !== '') {
      const timeParts = callTimeStr.split(':');
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
        
        // Validate time values
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.warn('Invalid time format, using 00:00:', callTimeStr);
          hours = 0;
          minutes = 0;
        }
      }
    }
    
    // Create date object with time and convert to ISO
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0); // month is 0-indexed
    if (isNaN(date.getTime())) {
      console.warn('Invalid date, using now:', callDateStr);
      return new Date().toISOString();
    }
    
    return date.toISOString();
  };

  useEffect(() => {
    loadAllProspects();
    loadTodayProspects();
    loadContactedToday();
    loadLinkedinProspects();
    loadDuplicates();
    loadCallCenters();
  }, [selectedDate]);

  // Direct test of matching after data loads
  useEffect(() => {
    const testMatching = async () => {
      if (allProspects.length > 0 && callCenters.length > 0) {
        console.log('🧪 Direct test: Testing matching for', allProspects.length, 'prospects against', callCenters.length, 'call centers');
        
        // Test matching for Informafrik specifically
        const informafrik = allProspects.find(p => p.name.toLowerCase().includes('informafrik'));
        if (informafrik) {
          console.log('🧪 Found Informafrik:', informafrik.name, informafrik.phones);
          const match = checkProspectInCallCenters(informafrik.name, informafrik.phones, callCenters);
          console.log('🧪 Direct test match result:', match);
        }
        
        // Update matches
        updateCallCenterMatches();
      }
    };

    testMatching();
  }, [allProspects, callCenters]);

  // Update matches when prospects or call centers change
  const updateProspectMatches = () => {
    const matches = matchProspectsToCallCenters(
      allProspects.map(p => ({ id: p.id, name: p.name, phones: p.phones })),
      callCenters
    );
    setProspectMatches(matches);
  };

  // Update call center matches for badge display
  const updateCallCenterMatches = () => {
    console.log('🔍 updateCallCenterMatches called with', allProspects.length, 'prospects and', callCenters.length, 'call centers');
    
    // Enhanced debugging for call centers data
    if (callCenters.length === 0) {
      console.warn('⚠️ WARNING: No call centers loaded! The "ALREADY IN CALL CENTERS" badge will not work.');
    } else {
      console.log('✅ Call centers loaded:', callCenters.length);
      console.log('📋 Sample call center data:', {
        name: callCenters[0]?.name,
        phones: callCenters[0]?.phones,
        hasPhones: (callCenters[0]?.phones || []).length > 0
      });
    }
    
    const matches = new Map<string, CallCenterMatch | null>();
    let matchCount = 0;
    
    for (const prospect of allProspects) {
      const match = checkProspectInCallCenters(prospect.name, prospect.phones, callCenters);
      matches.set(prospect.id, match);

      // Enhanced debug logging for ALL prospects to identify matching issues
      if (match) {
        matchCount++;
        console.log(`🎯 DUPLICATE DETECTED: "${prospect.name}" matches call center "${match.callCenter.name}" via ${match.matchType}`);
      }
      
      // Special debugging for prospects with similar names to Informafrik
      if (prospect.name.toLowerCase().includes('informafrik') || prospect.name.toLowerCase().includes('info') || prospect.name.toLowerCase().includes('afrik')) {
        console.log(`🔍 Debug similar prospect:`, {
          id: prospect.id,
          name: prospect.name,
          phones: prospect.phones,
          hasMatch: !!match,
          matchDetails: match ? { callCenterName: match.callCenter.name, matchType: match.matchType } : null
        });
      }
    }
    
    console.log(`🎯 DUPLICATE DETECTION SUMMARY:`, {
      totalProspects: allProspects.length,
      totalCallCenters: callCenters.length,
      matchesFound: matchCount,
      matchPercentage: ((matchCount / allProspects.length) * 100).toFixed(1) + '%'
    });
    
    setCallCenterMatches(matches);
  };

  useEffect(() => {
    console.log('🔍 useEffect triggered:', allProspects.length, 'prospects,', callCenters.length, 'call centers');
    if (allProspects.length > 0 && callCenters.length > 0) {
      console.log('🔍 Calling updateProspectMatches and updateCallCenterMatches');
      updateProspectMatches();
      updateCallCenterMatches();
    } else {
      console.log('🔍 Conditions not met - prospects:', allProspects.length, 'callCenters:', callCenters.length);
    }
  }, [allProspects, callCenters]);

  // Calculate combined prospects and count
  useEffect(() => {
    const combined = [...todayProspects, ...contactedToday, ...linkedinProspects];
    const unique = combined.filter((prospect, index, self) =>
      index === self.findIndex(p => p.id === prospect.id)
    );
    setCombinedProspects(unique);
    setAllProspectsCount(unique.length);
  }, [todayProspects, contactedToday, linkedinProspects]);

  // Filtered prospects based on current tab, search term, and contact filter
  const currentFilteredProspects = useMemo(() => {
    let prospects: Prospect[];
    switch (activeTab) {
      case 'today':
        prospects = todayProspects;
        break;
      case 'contacted':
        prospects = contactedToday;
        break;
      case 'linkedin':
        prospects = linkedinProspects;
        break;
      case 'all':
        prospects = allProspects;
        break;
      default:
        prospects = [];
    }

    // Only apply search and filter for the 'all' tab
    if (activeTab === 'all') {
      return prospects.filter(prospect => {
        // Search filter
        const matchesSearch = !searchTerm ||
          prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prospect.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getPhoneArray(prospect.phones).some(phone => phone.includes(searchTerm)) ||
          getEmailArray(prospect.emails).some(email => email.toLowerCase().includes(searchTerm.toLowerCase()));

        // Contact status filter
        const matchesContactFilter = contactFilter === 'all' ||
          (contactFilter === 'contacted' && prospect.lastContacted) ||
          (contactFilter === 'not-contacted' && !prospect.lastContacted);

        // Country filter
        const matchesCountryFilter = countryFilter === 'all' || prospect.country === countryFilter;

        // Has phone filter
        const hasPhone = getPhoneArray(prospect.phones).length > 0;
        const matchesHasPhoneFilter = hasPhoneFilter === 'all' ||
          (hasPhoneFilter === 'has-phone' && hasPhone) ||
          (hasPhoneFilter === 'no-phone' && !hasPhone);

        return matchesSearch && matchesContactFilter && matchesCountryFilter && matchesHasPhoneFilter;
      });
    } else {
      return prospects;
    }
  }, [activeTab, todayProspects, contactedToday, linkedinProspects, combinedProspects, searchTerm, contactFilter, countryFilter, hasPhoneFilter]);

  const loadAllProspects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/prospection/all');
      const data = await response.json();
      setAllProspects(data.prospects || []);
    } catch (error) {
      console.error('Error loading prospects:', error);
    }
    setIsLoading(false);
  };

  const loadTodayProspects = async () => {
    try {
      const response = await fetch(`/api/prospection?date=${selectedDate}&tab=today`);
      const data = await response.json();
      setTodayProspects(data.prospects || []);
    } catch (error) {
      console.error('Error loading today prospects:', error);
    }
  };

  const loadContactedToday = async () => {
    setLoadingContactedToday(true);
    try {
      const response = await fetch(`/api/prospection?date=${selectedDate}&tab=contacted`);
      const data = await response.json();
      setContactedToday(data.prospects || []);
    } catch (error) {
      console.error('Error loading contacted prospects:', error);
    }
    setLoadingContactedToday(false);
  };

  const loadLinkedinProspects = async () => {
    try {
      const response = await fetch('/api/prospection/linkedin');
      const data = await response.json();
      setLinkedinProspects(data.prospects || []);
    } catch (error) {
      console.error('Error loading LinkedIn prospects:', error);
    }
  };

  const loadDuplicates = async () => {
    setLoadingDuplicates(true);
    try {
      const response = await fetch('/api/prospection/duplicates');
      const data = await response.json();
      setDuplicateGroups(data.duplicates || {});
    } catch (error) {
      console.error('Error loading duplicates:', error);
    }
    setLoadingDuplicates(false);
  };

  const loadCallCenters = async () => {
    setLoadingCallCenters(true);
    setDuplicateDetectionStatus('loading');
    
    try {
      console.log('🔍 Loading call centers for duplicate detection...');
      
      // Load ALL call centers for matching (not paginated)
      const response = await fetch('/api/external-crm?all=true');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Enhanced API response debugging
      console.log('🔍 API Response Details:', {
        success: data.success,
        hasData: !!data.data,
        hasCallCenters: !!data.callCenters,
        dataLength: data.data?.length,
        callCentersLength: data.callCenters?.length,
        total: data.total
      });
      
      // FIX: The API returns 'data' field, not 'callCenters'
      const callCentersArray = data.data || data.callCenters || [];
      
      if (!Array.isArray(callCentersArray)) {
        console.error('❌ ERROR: Call centers data is not an array!', typeof callCentersArray);
        setCallCenters([]);
        setDuplicateDetectionStatus('error');
        return;
      }
      
      setCallCenters(callCentersArray);
      console.log(`✅ Loaded ${callCentersArray.length} call centers for duplicate detection`);
      
      // Enhanced debugging of call center data structure
      if (callCentersArray.length > 0) {
        const sample = callCentersArray[0];
        console.log('📋 Sample Call Center Structure:', {
          id: sample.id,
          name: sample.name,
          phones: sample.phones,
          phonesType: typeof sample.phones,
          phonesIsArray: Array.isArray(sample.phones),
          hasPhones: (sample.phones || []).length > 0,
          country: sample.country,
          city: sample.city
        });
        
        // Log a few more samples to check data consistency
        if (callCentersArray.length > 1) {
          console.log('📋 Second Sample:', {
            name: callCentersArray[1]?.name,
            phones: callCentersArray[1]?.phones,
            hasPhones: (callCentersArray[1]?.phones || []).length > 0
          });
        }
        
        // Check for data quality issues
        const centersWithPhones = callCentersArray.filter(cc => (cc.phones || []).length > 0).length;
        console.log(`📊 Data Quality Check:`, {
          totalCenters: callCentersArray.length,
          centersWithPhones: centersWithPhones,
          centersWithoutPhones: callCentersArray.length - centersWithPhones
        });
        
        setDuplicateDetectionStatus('working');
      } else {
        console.warn('⚠️ WARNING: No call centers found in database!');
        setDuplicateDetectionStatus('no-data');
      }
      
    } catch (error) {
      console.error('❌ ERROR loading call centers:', error);
      console.error('❌ This means the "ALREADY IN CALL CENTERS" badge will not work!');
      setCallCenters([]);
      setDuplicateDetectionStatus('error');
    }
    setLoadingCallCenters(false);
  };

  const handleAddProspect = async () => {
    try {
      const prospectData = {
        ...formData,
        positions: parseInt(formData.positions) || 0,
        phones: formData.phones.filter(p => p.trim()),
        emails: formData.emails.filter(e => e.trim()),
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        addedDate: new Date().toISOString().split('T')[0],
        prospectDate: selectedDate,
        status: 'pending' as const,
        contactAttempts: 0
      };

      const response = await fetch('/api/prospection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospectData)
      });

      if (response.ok) {
        setShowAddForm(false);
        resetForm();
        loadAllProspects();
        loadTodayProspects();
      }
    } catch (error) {
      console.error('Error adding prospect:', error);
    }
  };

  const handleImportProspects = async () => {
    setImporting(true);
    setImportProgress(0);
    setImportProgressText('Starting import...');

    try {
      let prospects;

      if (importFile) {
        setImportProgressText('Reading file...');
        setImportProgress(25);
        const fileContent = await importFile.text();
        setImportProgressText('Parsing data...');
        setImportProgress(50);
        prospects = JSON.parse(fileContent);
      } else {
        setImportProgressText('Parsing data...');
        setImportProgress(25);
        prospects = JSON.parse(importData);
      }

      setImportProgressText('Validating data...');
      setImportProgress(75);
      setImportProgressText(`Preparing to import ${prospects.length} prospects...`);
      setImportProgress(85);

      const response = await fetch('/api/prospection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects, date: selectedDate })
      });

      if (response.ok) {
        setImportProgressText('Importing data to database...');
        setImportProgress(95);
        setShowImportDialog(false);
        setImportData('');
        setImportFile(null);
        setImportProgressText('Import completed successfully!');
        setImportProgress(100);
        loadAllProspects();
        loadTodayProspects();
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Error importing prospects:', error);
      setImportProgressText('Import failed. Please try again.');
    } finally {
      setTimeout(() => {
        setImporting(false);
        setImportProgress(0);
        setImportProgressText('');
      }, 2000);
    }
  };

  // Function to parse raw LinkedIn data into standard prospect format
  const parseRawLinkedinData = (rawData: string): any[] => {
    const prospects: any[] = [];
    const lines = rawData.split('\n').filter(line => line.trim());

    let currentProspect: any = null;
    let collectingNotes = false;
    let notesBuffer = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and UI elements
      if (!line ||
          line.includes('Suivre') ||
          line.includes('J\'aime') ||
          line.includes('Commenter') ||
          line.includes('Republier') ||
          line.includes('Envoyer') ||
          line.includes('Post du fil d\'actualité') ||
          line.includes('like') ||
          line.includes('commentaire') ||
          line.includes('republication') ||
          line.startsWith('View ') ||
          line.startsWith('Lien graphique')) {
        continue;
      }

      // Check if this is a new prospect (starts with a name pattern)
      if (line.match(/^[A-Za-zÀ-ÿ\s\-&]+(?:\([^)]+\))?\s*[•\-]/) ||
          line.match(/^[A-Za-zÀ-ÿ\s\-&]+(?:\([^)]+\))?\s*[•\-]/) ||
          (line.includes('•') && !line.includes('Il y a') && !line.includes('Visible de tous'))) {

        // Save previous prospect if exists
        if (currentProspect && currentProspect.name) {
          if (notesBuffer.trim()) {
            currentProspect.notes = notesBuffer.trim();
          }
          prospects.push(currentProspect);
        }

        // Start new prospect
        currentProspect = {
          name: '',
          country: 'Morocco',
          city: 'Casablanca',
          positions: 0,
          businessType: 'call-center',
          phones: [],
          emails: [],
          website: '',
          address: '',
          source: 'linkedin',
          tags: ['linkedin'],
          notes: '',
          status: 'active',
          priority: 'medium',
          contactAttempts: 0
        };

        collectingNotes = false;
        notesBuffer = '';

        // Extract name from the line
        const nameMatch = line.match(/^([A-Za-zÀ-ÿ\s\-&]+(?:\([^)]+\))?)/);
        if (nameMatch) {
          currentProspect.name = nameMatch[1].trim();
        }
      }
      // Extract phone numbers
      else if (line.match(/WhatsApp:\s*\d+/) || line.match(/Phone:\s*\d+/) || line.match(/\d{9,}/)) {
        const phoneMatch = line.match(/(\d{9,})/);
        if (phoneMatch && !currentProspect.phones.includes(phoneMatch[1])) {
          currentProspect.phones.push(phoneMatch[1]);
        }
      }
      // Extract emails
      else if (line.includes('@') && line.includes('.')) {
        const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch && !currentProspect.emails.includes(emailMatch[1])) {
          currentProspect.emails.push(emailMatch[1]);
        }
      }
      // Extract location/city
      else if (line.includes('Casablanca') || line.includes('Marrakech') || line.includes('Rabat') ||
               line.includes('Tanger') || line.includes('Agadir') || line.includes('Meknès') ||
               line.includes('Fès') || line.includes('Oujda') || line.includes('Kénitra')) {
        const cityMatch = line.match(/(Casablanca|Marrakech|Rabat|Tanger|Agadir|Meknès|Fès|Oujda|Kénitra)/);
        if (cityMatch) {
          currentProspect.city = cityMatch[1];
        }
      }
      // Extract salary information or other details
      else if (line.includes('DH') || line.includes('€') || line.includes('Salaire') ||
               line.includes('Contrat') || line.includes('CDI') || line.includes('CDD') ||
               line.includes('expérience') || line.includes('année')) {
        if (!collectingNotes) {
          collectingNotes = true;
          notesBuffer = line;
        } else {
          notesBuffer += ' ' + line;
        }
      }
      // Continue collecting notes
      else if (collectingNotes || (currentProspect && line.length > 10)) {
        if (!collectingNotes) {
          collectingNotes = true;
          notesBuffer = line;
        } else {
          notesBuffer += ' ' + line;
        }
      }
    }

    // Add the last prospect
    if (currentProspect && currentProspect.name) {
      if (notesBuffer.trim()) {
        currentProspect.notes = notesBuffer.trim();
      }
      prospects.push(currentProspect);
    }

    return prospects;
  };

  const handleImportLinkedinProspects = async () => {
    setImporting(true);
    setImportProgress(0);
    setImportProgressText('Starting LinkedIn import...');

    try {
      let prospects;

      if (importFile) {
        setImportProgressText('Reading LinkedIn file...');
        setImportProgress(25);
        const fileContent = await importFile.text();
        setImportProgressText('Parsing LinkedIn data...');
        setImportProgress(50);

        // Try to parse as JSON first, if it fails, parse as raw LinkedIn data
        try {
          prospects = JSON.parse(fileContent);
        } catch (jsonError) {
          prospects = parseRawLinkedinData(fileContent);
        }
      } else {
        setImportProgressText('Parsing LinkedIn data...');
        setImportProgress(25);

        // Try to parse as JSON first, if it fails, parse as raw LinkedIn data
        try {
          prospects = JSON.parse(importData);
        } catch (jsonError) {
          prospects = parseRawLinkedinData(importData);
        }
      }

      setImportProgressText('Validating LinkedIn data...');
      setImportProgress(75);
      setImportProgressText(`Preparing to import ${prospects.length} LinkedIn prospects...`);
      setImportProgress(85);

      const response = await fetch('/api/prospection/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects })
      });

      if (response.ok) {
        setImportProgressText('Importing LinkedIn data to database...');
        setImportProgress(95);
        setShowImportDialog(false);
        setImportData('');
        setImportFile(null);
        setImportProgressText('LinkedIn import completed successfully!');
        setImportProgress(100);
        loadAllProspects();
        loadLinkedinProspects();
      } else {
        throw new Error('LinkedIn import failed');
      }
    } catch (error) {
      console.error('Error importing LinkedIn prospects:', error);
      setImportProgressText('LinkedIn import failed. Please try again.');
    } finally {
      setTimeout(() => {
        setImporting(false);
        setImportProgress(0);
        setImportProgressText('');
      }, 2000);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportData(''); // Clear textarea when file is selected
    }
  };

  const handleMarkAsContacted = async (prospect: Prospect) => {
    try {
      // Update prospect status to 'contacted' and track daily progress
      await ProspectionService.updateProspect(prospect.id, { 
        status: 'contacted',
        lastContacted: new Date().toISOString(),
        contactAttempts: (prospect.contactAttempts || 0) + 1
      });
      
      setSuccessMessage(`"${prospect.name}" marked as contacted!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Reload both lists
      loadTodayProspects();
      loadContactedToday();
      
    } catch (error) {
      console.error('Error marking as contacted:', error);
    }
  };

  const handleAddToCRM = async (prospect: Prospect) => {
    try {
      console.log('🔍 Add to CRM clicked for prospect:', prospect.name, prospect.id);

      // Create call center data from prospect
      const callCenterData = {
        name: prospect.name,
        country: prospect.country as any,
        city: prospect.city,
        positions: prospect.positions,
        businessType: prospect.businessType,
        phones: prospect.phones,
        phone_infos: prospect.phone_infos,
        emails: prospect.emails,
        website: prospect.website,
        address: prospect.address,
        source: prospect.source,
        tags: prospect.tags,
        notes: prospect.notes,
        status: 'New' as const,
        value: 0,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
        lastContacted: null,
        // Link back to the original prospect for bidirectional sync
        prospectId: prospect.id
      };

      // Create call center in external CRM
      const callCenterId = await ExternalCRMService.createCallCenter(callCenterData);
      console.log('✅ Call center created with ID:', callCenterId);

      // Transfer call logs from prospect to call center
      if (prospect.callHistory && prospect.callHistory.length > 0) {
        console.log(`📞 Transferring ${prospect.callHistory.length} call logs to call center ${callCenterId}`);
      
        let transferredCount = 0;
        let failedCount = 0;
      
        for (const callLog of prospect.callHistory) {
          try {
            // Remove the id field as it's auto-generated for the new call log
            const { id, ...callLogData } = callLog;
      
            // Ensure date is in the correct format for CRM
            const crmCallLogData = {
              ...callLogData,
              date: callLogData.date || new Date().toISOString()
            };
      
            await ExternalCRMSubcollectionsService.addCallLog(callCenterId.toString(), crmCallLogData);
            console.log(`✅ Transferred call log: ${callLog.outcome} on ${callLog.date}`);
            transferredCount++;
          } catch (callLogError) {
            console.error('❌ Error transferring call log:', callLogError);
            console.error('❌ Call log data that failed:', callLog);
            failedCount++;
            // Continue with other call logs even if one fails
          }
        }
      
        console.log(`✅ Successfully transferred ${transferredCount} call logs for prospect "${prospect.name}"${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
      }

      // Update prospect status to indicate it was added to CRM
      await ProspectionService.updateProspect(prospect.id, {
        status: 'added_to_crm' as any
      });

      setSuccessMessage(`"${prospect.name}" has been added to the Call Centers CRM with ${prospect.callHistory?.length || 0} call logs!`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reload prospects
      await loadAllProspects();

    } catch (error) {
      console.error('❌ Error adding to CRM:', error);
      setSuccessMessage('Error adding prospect to CRM');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleBulkContacted = async () => {
    try {
      // Determine which prospect array to use based on current tab
      const currentProspectArray = activeTab === 'all' ? allProspects :
                                   activeTab === 'today' ? todayProspects :
                                   activeTab === 'contacted' ? contactedToday : allProspects;

      for (const prospectId of selectedProspects) {
        const prospect = currentProspectArray.find(p => p.id === prospectId);
        if (prospect) {
          await ProspectionService.updateProspect(prospect.id, {
            status: 'contacted',
            lastContacted: new Date().toISOString(),
            contactAttempts: (prospect.contactAttempts || 0) + 1
          });
        }
      }
      
      setSelectedProspects([]);
      setSuccessMessage(`${selectedProspects.length} prospects marked as contacted!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Reload all relevant lists
      loadAllProspects();
      loadTodayProspects();
      loadContactedToday();
      
    } catch (error) {
      console.error('❌ Error marking prospects as contacted:', error);
      setSuccessMessage('Error marking prospects as contacted');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleBulkAddToCRM = async () => {
    try {
      console.log('🔍 Bulk Add to CRM clicked for prospects:', selectedProspects);

      let totalCallLogsTransferred = 0;

      for (const prospectId of selectedProspects) {
        const prospect = allProspects.find(p => p.id === prospectId);
        if (prospect) {
          const callCenterData = {
            name: prospect.name,
            country: prospect.country as any,
            city: prospect.city,
            positions: prospect.positions,
            businessType: prospect.businessType,
            phones: prospect.phones,
            phone_infos: prospect.phone_infos,
            emails: prospect.emails,
            website: prospect.website,
            address: prospect.address,
            source: prospect.source,
            tags: prospect.tags,
            notes: prospect.notes,
            status: 'New' as const,
            value: 0,
            currency: 'USD',
            updatedAt: new Date().toISOString(),
            lastContacted: null,
            // Link back to the original prospect for bidirectional sync
            prospectId: prospect.id
          };

          const callCenterId = await ExternalCRMService.createCallCenter(callCenterData);
          console.log('✅ Call center created with ID:', callCenterId);

          // Transfer call logs from prospect to call center
          if (prospect.callHistory && prospect.callHistory.length > 0) {
            console.log(`📞 Transferring ${prospect.callHistory.length} call logs to call center ${callCenterId}`);

            for (const callLog of prospect.callHistory) {
              try {
                // Remove the id field as it's auto-generated for the new call log
                const { id, ...callLogData } = callLog;

                // Ensure date is in the correct format for CRM
                const crmCallLogData = {
                  ...callLogData,
                  date: callLogData.date || new Date().toISOString()
                };

                await ExternalCRMSubcollectionsService.addCallLog(callCenterId.toString(), crmCallLogData);
                totalCallLogsTransferred++;
                console.log(`✅ Transferred call log: ${callLog.outcome} on ${callLog.date}`);
              } catch (callLogError) {
                console.error('❌ Error transferring call log:', callLogError);
                console.error('❌ Call log data that failed:', callLog);
                // Continue with other call logs even if one fails
              }
            }

            console.log(`✅ Successfully transferred call logs for prospect "${prospect.name}"`);
          }

          await ProspectionService.updateProspect(prospect.id, {
            status: 'added_to_crm' as any
          });
        }
      }

      setSelectedProspects([]);
      setSuccessMessage(`${selectedProspects.length} prospects added to Call Centers CRM with ${totalCallLogsTransferred} call logs transferred!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadAllProspects();

    } catch (error) {
      console.error('❌ Error adding prospects to CRM:', error);
      setSuccessMessage('Error adding prospects to CRM');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await ProspectionService.bulkDeleteProspects(selectedProspects);

      setSelectedProspects([]);
      setSuccessMessage(`${selectedProspects.length} prospects deleted successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reload all lists
      loadAllProspects();
      loadTodayProspects();
      loadContactedToday();

    } catch (error) {
      console.error('❌ Error deleting prospects:', error);
      setSuccessMessage('Error deleting prospects');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleBulkDeleteDuplicates = async () => {
    try {
      await ProspectionService.bulkDeleteProspects(selectedDuplicateProspects);

      setSelectedDuplicateProspects([]);
      setSuccessMessage(`${selectedDuplicateProspects.length} duplicate prospects deleted successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reload all lists and duplicates
      loadAllProspects();
      loadTodayProspects();
      loadContactedToday();
      loadDuplicates();

    } catch (error) {
      console.error('❌ Error deleting duplicate prospects:', error);
      setSuccessMessage('Error deleting duplicate prospects');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleUpdateProspect = async (prospectId: string) => {
    try {
      const prospectData = {
        ...formData,
        positions: parseInt(formData.positions) || 0,
        phones: formData.phones.filter(p => p.trim()),
        emails: formData.emails.filter(e => e.trim()),
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      };

      const response = await fetch(`/api/prospection/${prospectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospectData)
      });

      if (response.ok) {
        setEditingProspect(null);
        resetForm();
        loadAllProspects();
        loadTodayProspects();
      }
    } catch (error) {
      console.error('Error updating prospect:', error);
    }
  };

  const handleMoveBackToPending = async (prospect: Prospect) => {
    try {
      // Update prospect status back to 'pending'
      const response = await fetch('/api/prospection/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: prospect.id,
          status: 'pending',
          lastContacted: null
        })
      });

      if (response.ok) {
        setSuccessMessage(`"${prospect.name}" moved back to "Today's Prospects"!`);
        setTimeout(() => setSuccessMessage(null), 5000);
        
        // Reload both lists
        loadAllProspects();
        loadTodayProspects();
        loadContactedToday();
      } else {
        throw new Error('Failed to update prospect status');
      }
    } catch (error) {
      console.error('Error moving prospect back:', error);
      setSuccessMessage(`Error: Failed to move "${prospect.name}" back`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleDeleteProspect = async (prospectId: string) => {
    try {
      const response = await fetch(`/api/prospection/${prospectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowDeleteDialog(false);
        setDeletingProspectId(null);
        loadAllProspects();
        loadTodayProspects();
        loadContactedToday();
        setSuccessMessage('Prospect deleted successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error deleting prospect:', error);
    }
  };

  const handleCallLog = async () => {
    if (!selectedProspect || !callLogData.outcome || !callLogData.notes) {
      console.error('Missing required fields: prospect, outcome, or notes');
      return;
    }

    setIsLoading(true);
    try {
      // Determine disposition based on outcome if not set
      let disposition = callLogData.disposition;
      if (!disposition) {
        switch (callLogData.outcome) {
          case 'answered':
            disposition = 'interested';
            break;
          case 'no-answer':
          case 'busy':
          case 'voicemail':
            disposition = 'callback';
            break;
          case 'callback':
            disposition = 'callback';
            break;
          default:
            disposition = '';
        }
      }

      const callLogPayload = {
        date: getCallDateTimeISO(callLogData.callDate, callLogData.callTime),
        outcome: callLogData.outcome,
        duration: callLogData.duration || 0,
        notes: callLogData.notes,
        followUp: callLogData.followUp,
        disposition: disposition,
        callbackDate: callLogData.callbackDate,
        meetingDate: callLogData.meetingDate,
        meetingLocation: callLogData.meetingLocation,
        competitorName: callLogData.competitorName,
        // Recording and transcription fields
        recordingUrl: callLogData.recordingUrl,
        transcriptionText: callLogData.transcriptionText,
        autoAnalysisSummary: callLogData.autoAnalysisSummary,
        coachFeedback: callLogData.coachFeedback,
        hasRecording: callLogData.hasRecording,
        // Advanced call result classification fields
        is_argumented: callLogData.is_argumented,
        decision_maker_reached: callLogData.decision_maker_reached,
        objection_category: callLogData.objection_category,
        objection_detail: callLogData.objection_detail,
        refusal_reason: callLogData.refusal_reason,
      };

      console.log('📞 Saving call log for prospect:', selectedProspect.id);
      console.log('📞 Call log payload:', callLogPayload);

      const response = await fetch(`/api/prospection/${selectedProspect.id}/call-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callLogPayload)
      });

      const responseData = await response.json();
      
      if (response.ok) {
        console.log('✅ Call log saved successfully');
        
        // Automatically move prospect from "Today's Prospects" to "Contacted Today"
        if (selectedProspect) {
          try {
            await ProspectionService.updateProspect(selectedProspect.id, {
              status: 'contacted',
              lastContacted: getCallDateTimeISO(callLogData.callDate, callLogData.callTime),
              contactAttempts: (selectedProspect.contactAttempts || 0) + 1
            });
            
            console.log('📱 Prospect automatically moved to contacted list');
          } catch (error) {
            console.error('❌ Error updating prospect status:', error);
          }
        }
        
        // Create calendar event for callback if disposition is callback and date is set
        if (callLogData.disposition === 'callback' && callLogData.callbackDate) {
          try {
            const callbackDate = new Date(callLogData.callbackDate);
            const calendarEvent: any = {
              title: `Callback: ${selectedProspect.name}`,
              description: `Follow-up call for prospect ${selectedProspect.name}. Notes: ${callLogData.notes}`,
              date: callbackDate.toISOString().split('T')[0], // YYYY-MM-DD format
              time: callbackDate.toTimeString().slice(0, 5), // HH:MM format
              type: 'call',
              callCenterName: selectedProspect.name,
              relatedType: 'callLog',
              relatedId: responseData.id, // Use the call log ID from the response
              color: '#3B82F6' // Blue color for callbacks
            };

            // Only include optional fields if they have values
            if (callLogData.meetingLocation && callLogData.meetingLocation.trim()) {
              calendarEvent.location = callLogData.meetingLocation.trim();
            }

            const calendarResponse = await fetch('/api/external-crm/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(calendarEvent)
            });

            if (calendarResponse.ok) {
              console.log('✅ Calendar event created for callback');

              // Add step to prospect
              try {
                const stepData = {
                  title: `Callback Scheduled: ${selectedProspect.name}`,
                  description: `Follow-up call scheduled for ${callbackDate.toLocaleDateString()} at ${callbackDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Notes: ${callLogData.notes}`,
                  date: callbackDate.toISOString().split('T')[0],
                  completed: false,
                  priority: 'high' as const
                };

                await ProspectionService.addStep(selectedProspect.id, stepData);
                console.log('✅ Step added to prospect for callback');
              } catch (stepError) {
                console.error('❌ Error adding step to prospect:', stepError);
              }

              // Also try to add step to call center if it exists with matching name
              try {
                const callCenters = await ExternalCRMService.getCallCenters({}, { field: 'createdAt', direction: 'desc' }, 0, 1000);
                const matchingCallCenter = callCenters.find(cc => cc.name.toLowerCase() === selectedProspect.name.toLowerCase());

                if (matchingCallCenter) {
                  const stepData = {
                    title: `Callback Scheduled: ${selectedProspect.name}`,
                    description: `Follow-up call scheduled for ${callbackDate.toLocaleDateString()} at ${callbackDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Notes: ${callLogData.notes}`,
                    date: callbackDate.toISOString().split('T')[0],
                    completed: false,
                    priority: 'high' as const,
                    notes: callLogData.notes
                  };

                  await ExternalCRMSubcollectionsService.addStep(matchingCallCenter.id.toString(), stepData);
                  console.log(`✅ Step also added to call center ${matchingCallCenter.name} for callback`);
                }
              } catch (centerStepError) {
                console.error('❌ Error adding step to call center:', centerStepError);
              }
            } else {
              console.error('❌ Failed to create calendar event for callback');
            }
          } catch (calendarError) {
            console.error('❌ Error creating calendar event:', calendarError);
          }
        }

        setShowCallLogDialog(false);
        resetCallLogForm();
        loadAllProspects();
        loadTodayProspects();
        loadContactedToday();
        setSuccessMessage('Call log saved successfully! Prospect moved to contacted list.');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error('❌ API Error:', responseData);
        setSuccessMessage(`Error saving call log: ${responseData.error || 'Unknown error'}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error('❌ Error adding call log:', error);
      setSuccessMessage('Error saving call log. Please try again.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!selectedProspect) return;

    try {
      const response = await fetch(`/api/prospection/${selectedProspect.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });

      if (response.ok) {
        setShowContactDialog(false);
        resetContactForm();
        loadAllProspects();
      }
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleEditCallLog = async () => {
    if (!editingCallLog || !selectedProspect) {
      console.error('Missing required fields: editingCallLog or selectedProspect');
      return;
    }

    setIsLoading(true);
    try {
      // Determine disposition based on outcome if not set
      let disposition = callLogData.disposition;
      if (!disposition) {
        switch (callLogData.outcome) {
          case 'answered':
            disposition = 'interested';
            break;
          case 'no-answer':
          case 'busy':
          case 'voicemail':
            disposition = 'callback';
            break;
          case 'callback':
            disposition = 'callback';
            break;
          default:
            disposition = '';
        }
      }

      const updateData = {
        date: getCallDateTimeISO(callLogData.callDate),
        outcome: callLogData.outcome,
        duration: callLogData.duration || 0,
        notes: callLogData.notes,
        followUp: callLogData.followUp,
        disposition: disposition,
        callbackDate: callLogData.callbackDate,
        meetingDate: callLogData.meetingDate,
        meetingLocation: callLogData.meetingLocation,
        competitorName: callLogData.competitorName,
        // Recording and transcription fields
        recordingUrl: callLogData.recordingUrl,
        transcriptionText: callLogData.transcriptionText,
        autoAnalysisSummary: callLogData.autoAnalysisSummary,
        coachFeedback: callLogData.coachFeedback,
        hasRecording: callLogData.hasRecording,
        // Advanced call result classification fields
        is_argumented: callLogData.is_argumented,
        decision_maker_reached: callLogData.decision_maker_reached,
        objection_category: callLogData.objection_category,
        objection_detail: callLogData.objection_detail,
        refusal_reason: callLogData.refusal_reason,
      };

      console.log('📞 Updating call log:', editingCallLog.id);
      console.log('📞 Update data:', updateData);

      const response = await fetch(`/api/prospection/${selectedProspect.id}/call-log/${editingCallLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const responseData = await response.json();
      
      if (response.ok) {
        console.log('✅ Call log updated successfully');
        setShowEditCallLogDialog(false);
        setEditingCallLog(null);
        resetCallLogForm();
        loadAllProspects();
        setSuccessMessage('Call log updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error('❌ API Error:', responseData);
        setSuccessMessage(`Error updating call log: ${responseData.error || 'Unknown error'}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error('❌ Error updating call log:', error);
      setSuccessMessage('Error updating call log. Please try again.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCallLog = async () => {
    if (!deletingCallLogId || !selectedProspect) {
      console.error('Missing required fields: deletingCallLogId or selectedProspect');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🗑️ Deleting call log:', deletingCallLogId);

      const response = await fetch(`/api/prospection/${selectedProspect.id}/call-log/${deletingCallLogId}`, {
        method: 'DELETE'
      });

      const responseData = await response.json();
      
      if (response.ok) {
        console.log('✅ Call log deleted successfully');
        setDeletingCallLogId(null);
        loadAllProspects();
        setSuccessMessage('Call log deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error('❌ API Error:', responseData);
        setSuccessMessage(`Error deleting call log: ${responseData.error || 'Unknown error'}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error('❌ Error deleting call log:', error);
      setSuccessMessage('Error deleting call log. Please try again.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditCallLog = (callLog: CallLog) => {
    setEditingCallLog(callLog);
    setCallLogData({
      outcome: callLog.outcome || '',
      duration: callLog.duration || 0,
      notes: callLog.notes || '',
      followUp: 'none',
      disposition: (callLog as any).disposition || '',
      followUpAction: (callLog as any).followUpAction || '',
      callbackDate: (callLog as any).callbackDate || '',
      meetingDate: (callLog as any).meetingDate || '',
      meetingLocation: (callLog as any).meetingLocation || '',
      competitorName: (callLog as any).competitorName || '',
      phone_used: callLog.phone_used || '',
      callDate: callLog.date ? new Date(callLog.date).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
      callTime: callLog.date ? new Date(callLog.date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      // Recording and transcription fields
      recordingUrl: callLog.recordingUrl || '',
      transcriptionText: callLog.transcriptionText || '',
      autoAnalysisSummary: callLog.autoAnalysisSummary || '',
      coachFeedback: callLog.coachFeedback || '',
      hasRecording: callLog.hasRecording || false,
      // Quality scoring fields
      accroche_score: callLog.accroche_score,
      discovery_score: callLog.discovery_score,
      value_prop_score: callLog.value_prop_score,
      objection_score: callLog.objection_score,
      closing_score: callLog.closing_score,
      client_talk_ratio: callLog.client_talk_ratio,
      agent_talk_ratio: callLog.agent_talk_ratio,
      // Advanced call result classification fields
      is_argumented: callLog.is_argumented,
      decision_maker_reached: callLog.decision_maker_reached,
      objection_category: callLog.objection_category,
      objection_detail: callLog.objection_detail || '',
      refusal_reason: callLog.refusal_reason,
      // Personalization fields for rapport building (added to call log)
      personal_details: callLog.personal_details || '',
      rapport_tags: callLog.rapport_tags || [],
      // Pattern interrupt fields (added to call log)
      pattern_interrupt_used: callLog.pattern_interrupt_used || false,
      pattern_interrupt_note: callLog.pattern_interrupt_note || '',
    });
    setEditDurationInputValue(callLog.duration ? formatDuration(callLog.duration) : '');
    setShowEditCallLogDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      country: '',
      city: '',
      positions: '',
      businessType: '',
      phones: [''],
      emails: [''],
      website: '',
      address: '',
      source: '',
      tags: '',
      notes: '',
      priority: 'medium',
      destinations: [],
      dnc: false,
      dnd: false,
      dp: false,
      dncDescription: '',
      dndDescription: '',
      dpDescription: ''
    });
  };

  const resetCallLogForm = () => {
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
      // Personalization fields for rapport building (added to call log)
      personal_details: '',
      rapport_tags: [] as string[],
      // Pattern interrupt fields (added to call log)
      pattern_interrupt_used: false,
      pattern_interrupt_note: '',
    });
    setDurationInputValue('');
    setEditDurationInputValue('');
  };

  const resetContactForm = () => {
    setContactData({
      name: '',
      position: '',
      phone: '',
      email: '',
      notes: '',
      // Personalization fields
      personal_details: '',
      rapport_tags: [],
      // Pattern interrupt fields
      pattern_interrupt_used: false,
      pattern_interrupt_note: ''
    });
  };

  const addPhoneField = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, '']
    }));
  };

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, '']
    }));
  };

  const updatePhoneField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.map((phone, i) => i === index ? value : phone)
    }));
  };

  const updateEmailField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((email, i) => i === index ? value : email)
    }));
  };

  const removePhoneField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index)
    }));
  };

  const removeEmailField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  const toggleProspectSelection = (prospectId: string) => {
    setSelectedProspects(prev =>
      prev.includes(prospectId)
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    );
  };

  const toggleDuplicateProspectSelection = (prospectId: string) => {
    setSelectedDuplicateProspects(prev =>
      prev.includes(prospectId)
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    );
  };

  const selectAllProspects = () => {
    setSelectedProspects(todayProspects.map(p => p.id));
  };

  const deselectAllProspects = () => {
    setSelectedProspects([]);
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const sendEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  const makeCall = (phone: string) => {
    window.open(`tel:${phone}`, '_blank');
  };

  const getBusinessTypeColor = (type: string) => {
    switch (type) {
      case 'call-center': return 'bg-blue-100 text-blue-800';
      case 'voip-reseller': return 'bg-green-100 text-green-800';
      case 'data-vendor': return 'bg-purple-100 text-purple-800';
      case 'workspace-rental': return 'bg-orange-100 text-orange-800';
      case 'individual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-gray-100 text-gray-800';
      case 'added_to_crm': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-red-100 text-red-800';
      case 'contacted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentProspects = activeTab === 'today' ? todayProspects :
                           activeTab === 'contacted' ? contactedToday :
                           activeTab === 'linkedin' ? linkedinProspects :
                           activeTab === 'all' ? combinedProspects : [];

  return (
    <div className="container mx-auto p-6">
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
          <CheckSquare className="w-5 h-5 mr-2" />
          {successMessage}
        </div>
      )}
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Prospection</h1>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Daily Target Card */}
      <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Daily Target</h3>
                <p className="text-sm text-gray-600">
                  {selectedDate ? format(new Date(selectedDate), 'MMMM d, yyyy') : 'Select a date'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                {contactedToday.length}<span className="text-lg text-gray-500">/10</span>
              </div>
              <div className="text-sm text-gray-600">prospects contacted</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round((contactedToday.length / 10) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min((contactedToday.length / 10) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          {contactedToday.length >= 10 ? (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckSquare className="w-5 h-5" />
                <span className="font-medium">Daily target achieved! 🎉</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <Target className="w-5 h-5" />
                <span className="text-sm">
                  {10 - contactedToday.length} more prospects to reach your daily goal
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons Section */}
      <div className="flex gap-2 mb-6">
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import JSON
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Prospects from JSON</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Upload JSON File</label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                <div className="text-xs text-gray-500 mb-2">Or paste JSON data below:</div>
                <Textarea
                  placeholder="Paste your JSON data here..."
                  value={importData}
                  onChange={(e) => {
                    setImportData(e.target.value);
                    setImportFile(null);
                  }}
                  rows={8}
                  disabled={importing}
                />
              </div>

              {importing && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="w-full" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">{importProgressText || 'Processing...'}</p>
                    <p className="text-sm text-gray-500">{Math.round(importProgress)}%</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowImportDialog(false);
                  setImportData('');
                  setImportFile(null);
                  setImporting(false);
                  setImportProgress(0);
                  setImportProgressText('');
                }} disabled={importing}>
                  Cancel
                </Button>
                <Button onClick={handleImportProspects} disabled={(!importData && !importFile) || importing}>
                  {importing ? 'Importing...' : 'Import Prospects'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Prospect
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Prospect</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Type *</label>
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
                  <label className="block text-sm font-medium mb-1">Country *</label>
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
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Positions</label>
                  <Input
                    type="number"
                    value={formData.positions}
                    onChange={(e) => setFormData(prev => ({ ...prev, positions: e.target.value }))}
                    placeholder="Number of positions"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Numbers *</label>
                {formData.phones.map((phone, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={phone}
                      onChange={(e) => updatePhoneField(index, e.target.value)}
                      placeholder="Phone number"
                    />
                    {formData.phones.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePhoneField(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPhoneField}>
                  Add Phone
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Addresses</label>
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={email}
                      onChange={(e) => updateEmailField(index, e.target.value)}
                      placeholder="Email address"
                    />
                    {formData.emails.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmailField(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addEmailField}>
                  Add Email
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Website</label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
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
                <label className="block text-sm font-medium mb-1">Calling Destinations (Multiple Selection)</label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {DESTINATION_OPTIONS.map((destination) => (
                    <div key={destination} className="flex items-center space-x-2">
                      <Checkbox
                        id={`destination-${destination}`}
                        checked={formData.destinations.includes(destination)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              destinations: [...prev.destinations, destination]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              destinations: prev.destinations.filter(d => d !== destination)
                            }));
                          }
                        }}
                      />
                      <label
                        htmlFor={`destination-${destination}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {destination}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <Input
                    placeholder="Or add custom destination..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const customDestination = e.currentTarget.value.trim();
                        if (!formData.destinations.includes(customDestination)) {
                          setFormData(prev => ({
                            ...prev,
                            destinations: [...prev.destinations, customDestination]
                          }));
                        }
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                {formData.destinations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.destinations.map((destination) => (
                      <Badge
                        key={destination}
                        variant="secondary"
                        className="text-xs"
                      >
                        {destination}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              destinations: prev.destinations.filter(d => d !== destination)
                            }));
                          }}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="Lead source"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Comma separated tags"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
 
              {/* DNC/DND/DP Section */}
              <div className="space-y-4 border-t pt-4">
                <label className="block text-sm font-medium mb-2">Prospect Status</label>
 
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dnc"
                      checked={formData.dnc}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dnc: !!checked }))}
                    />
                    <label htmlFor="dnc" className="text-sm font-medium">
                      DNC - Do Not Call
                    </label>
                  </div>
                  {formData.dnc && (
                    <Textarea
                      value={formData.dncDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, dncDescription: e.target.value }))}
                      placeholder="Reason for DNC (e.g., requested not to be contacted, wrong number, etc.)"
                      rows={2}
                      className="ml-6"
                    />
                  )}
 
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dnd"
                      checked={formData.dnd}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dnd: !!checked }))}
                    />
                    <label htmlFor="dnd" className="text-sm font-medium">
                      DND - Do Not Disturb
                    </label>
                  </div>
                  {formData.dnd && (
                    <Textarea
                      value={formData.dndDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, dndDescription: e.target.value }))}
                      placeholder="Reason for DND (e.g., busy period, requested quiet time, etc.)"
                      rows={2}
                      className="ml-6"
                    />
                  )}
 
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dp"
                      checked={formData.dp}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dp: !!checked }))}
                    />
                    <label htmlFor="dp" className="text-sm font-medium">
                      DP - Dead Prospect
                    </label>
                  </div>
                  {formData.dp && (
                    <Textarea
                      value={formData.dpDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, dpDescription: e.target.value }))}
                      placeholder="Reason for DP (e.g., business closed, no longer interested, etc.)"
                      rows={2}
                      className="ml-6"
                    />
                  )}
                </div>
              </div>
 
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProspect}>
                  Add Prospect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="today">Today's Prospects ({todayProspects.length})</TabsTrigger>
          <TabsTrigger value="contacted">Contacted Today ({contactedToday.length})</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn Prospects ({linkedinProspects.length})</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates ({Object.keys(duplicateGroups).length})</TabsTrigger>
          <TabsTrigger value="all">All Prospects ({allProspects.length})</TabsTrigger>
        </TabsList>

        {/* Duplicate Detection Status Notification */}
        {duplicateDetectionStatus === 'no-data' && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">No Call Centers Data</h3>
                <p className="text-sm text-yellow-700">
                  The "ALREADY IN CALL CENTERS" badge cannot work because no call centers were found in the database. 
                  This means duplicates might not be detected.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {duplicateDetectionStatus === 'error' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Duplicate Detection Error</h3>
                <p className="text-sm text-red-700">
                  There was an error loading call centers data. The "ALREADY IN CALL CENTERS" badge may not work correctly.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {duplicateDetectionStatus === 'working' && (
          <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <p className="text-xs text-green-700">
                Duplicate detection active: {callCenters.length} call centers loaded
              </p>
            </div>
          </div>
        )}
        
        {duplicateDetectionStatus === 'loading' && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-blue-700">
                Loading call centers for duplicate detection...
              </p>
            </div>
          </div>
        )}

        <TabsContent value="today" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm text-gray-600">
              {linkedinProspects.length} LinkedIn prospects
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs"
                  onClick={() => setSelectedProspects(linkedinProspects.map(p => p.id))}
                  disabled={linkedinProspects.length === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-check-big w-4 h-4 mr-2" aria-hidden="true">
                    <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"></path>
                    <path d="m9 11 3 3L22 4"></path>
                  </svg>
                  Select All
                </button>
                {selectedProspects.length > 0 && (
                  <button
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs"
                    onClick={() => setSelectedProspects([])}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square w-4 h-4 mr-2" aria-hidden="true">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                    </svg>
                    Deselect All
                  </button>
                )}
              </div>
            </div>
          </div>

          {selectedProspects.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedProspects.length} prospects selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkContacted}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Mark as Contacted ({selectedProspects.length})
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete All ({selectedProspects.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Prospects</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedProspects.length} selected prospects? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="text-center py-8">Loading prospects...</div>
          ) : currentFilteredProspects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No prospects for {selectedDate ? format(new Date(selectedDate), 'MMMM d, yyyy') : 'Selected date'}</p>
                <p className="text-sm text-gray-400 mt-2">Add prospects or import from JSON to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {currentFilteredProspects.map((prospect) => (
                <Card key={prospect.id} className={`relative ${
                  prospect.dnc ? 'border-red-500 bg-red-50' :
                  prospect.dnd ? 'border-yellow-500 bg-yellow-50' :
                  prospect.dp ? 'border-gray-500 bg-gray-50' :
                  getPhoneArray(prospect.phones).length === 0 ? 'border-blue-500 bg-blue-50' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProspects.includes(prospect.id)}
                          onCheckedChange={() => toggleProspectSelection(prospect.id)}
                        />
                        <div>
                          <CardTitle className="text-lg">{prospect.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getBusinessTypeColor(prospect.businessType)}>
                              {prospect.businessType.replace('-', ' ')}
                            </Badge>
                            <Badge className={getPriorityColor(prospect.priority)}>
                              {prospect.priority}
                            </Badge>
                            {getLatestDisposition(prospect) && (
                              <Badge
                                className="text-white font-medium"
                                style={{ backgroundColor: getDispositionColor(getLatestDisposition(prospect)) }}
                              >
                                {getDispositionDisplayName(getLatestDisposition(prospect))}
                              </Badge>
                            )}
                            {getPhoneArray(prospect.phones).length === 0 && (
                              <Badge variant="destructive">
                                add a number
                              </Badge>
                            )}
                            {callCenterMatches.get(prospect.id) && (
                              <Badge className="bg-red-600 text-white font-bold border-red-700 animate-pulse">
                                ALREADY IN CALL CENTERS
                              </Badge>
                            )}
                            {/* Direct test badge for Informafrik */}
                            {prospect.name.toLowerCase().includes('informafrik') && (
                              <Badge className="bg-orange-600 text-white animate-pulse">
                                INFORMAFRIK TEST
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {getPhoneArray(prospect.phones).some(phone => {
                          const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => {
                              const mobilePhone = getPhoneArray(prospect.phones).find(phone => {
                                const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                                return phoneInfo?.is_mobile;
                              });
                              if (mobilePhone) openWhatsApp(mobilePhone);
                            }}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : getPhoneArray(prospect.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => {
                              openWhatsApp(getPhoneArray(prospect.phones)[0]);
                            }}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : null}

                        {getEmailArray(prospect.emails).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmail(getEmailArray(prospect.emails)[0])}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}

                        {getPhoneArray(prospect.phones).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeCall(getPhoneArray(prospect.phones)[0])}
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}

                        <button
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowCallLogDialog(true);
                          }}
                          title="Log Call"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone w-4 h-4 mr-2" aria-hidden="true">
                            <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>
                          </svg>
                          Log Call
                        </button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowContactDialog(true);
                          }}
                          title="Add Contact"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProspect(prospect);
                            setFormData({
                              name: prospect.name,
                              country: prospect.country,
                              city: prospect.city,
                              positions: prospect.positions.toString(),
                              businessType: prospect.businessType,
                              phones: prospect.phones,
                              emails: prospect.emails,
                              website: prospect.website,
                              address: prospect.address || '',
                              source: prospect.source || '',
                              tags: prospect.tags.join(', '),
                              notes: prospect.notes,
                              priority: prospect.priority,
                              destinations: prospect.destinations || [],
                              dnc: prospect.dnc || false,
                              dnd: prospect.dnd || false,
                              dp: prospect.dp || false,
                              dncDescription: prospect.dncDescription || '',
                              dndDescription: prospect.dndDescription || '',
                              dpDescription: prospect.dpDescription || ''
                            });
                            setShowEditDialog(true);
                          }}
                          title="Edit Prospect"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingProspectId(prospect.id)}
                              title="Delete Prospect"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{prospect.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProspect(prospect.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleMarkAsContacted(prospect)}
                          title="Mark as Contacted"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAddToCRM(prospect)}
                          title="Add to CRM"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Location:</span> {prospect.city}, {prospect.country}
                      </div>
                      {prospect.positions > 0 && (
                        <div>
                          <span className="font-medium">Positions:</span> {prospect.positions}
                        </div>
                      )}
                      {getPhoneArray(prospect.phones).length > 0 && (
                        <div>
                          <span className="font-medium">Phones:</span> {getPhoneArray(prospect.phones).join(', ')}
                        </div>
                      )}
                      {getEmailArray(prospect.emails).length > 0 && (
                        <div>
                          <span className="font-medium">Emails:</span> {getEmailArray(prospect.emails).join(', ')}
                        </div>
                      )}
                      {prospect.website && (
                        <div>
                          <span className="font-medium">Website:</span> <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{prospect.website}</a>
                        </div>
                      )}
                    </div>
                    {prospect.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Notes:</span> {prospect.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacted" className="space-y-4">
          {selectedProspects.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedProspects.length} prospects selected
                  </span>
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete All ({selectedProspects.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Prospects</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedProspects.length} selected prospects? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm text-gray-600">
              {contactedToday.length} prospects contacted on {selectedDate ? format(new Date(selectedDate), 'MMMM d, yyyy') : 'Selected date'}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProspects(currentFilteredProspects.map(p => p.id))}
                  disabled={currentFilteredProspects.length === 0}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select All
                </Button>
                {selectedProspects.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProspects([])}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Deselect All
                  </Button>
                )}
              </div>
              <Progress value={(contactedToday.length / 10) * 100} className="w-48" />
              <div className="text-xs text-gray-500 mt-1">{contactedToday.length}/10 daily target</div>
            </div>
          </div>

          {loadingContactedToday ? (
            <div className="text-center py-8">Loading contacted prospects...</div>
          ) : currentFilteredProspects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No prospects contacted on {selectedDate ? format(new Date(selectedDate), 'MMMM d, yyyy') : 'Selected date'}</p>
                <p className="text-sm text-gray-400 mt-2">Contact some prospects from "Today's Prospects" to see them here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {currentFilteredProspects.map((prospect) => (
                <Card key={prospect.id} className={`relative ${
                  prospect.dnc ? 'border-red-500 bg-red-50' :
                  prospect.dnd ? 'border-yellow-500 bg-yellow-50' :
                  prospect.dp ? 'border-gray-500 bg-gray-50' :
                  getPhoneArray(prospect.phones).length === 0 ? 'border-blue-500 bg-blue-50' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProspects.includes(prospect.id)}
                          onCheckedChange={() => toggleProspectSelection(prospect.id)}
                        />
                        <div>
                          <CardTitle className="text-lg">{prospect.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getBusinessTypeColor(prospect.businessType)}>
                              {prospect.businessType.replace('-', ' ')}
                            </Badge>
                            <Badge className={getStatusColor(prospect.status)}>
                              {prospect.status}
                            </Badge>
                            {getLatestDisposition(prospect) && (
                              <Badge
                                className="text-white font-medium"
                                style={{ backgroundColor: getDispositionColor(getLatestDisposition(prospect)) }}
                              >
                                {getDispositionDisplayName(getLatestDisposition(prospect))}
                              </Badge>
                            )}
                            {callCenterMatches.get(prospect.id) && (
                              <Badge className="bg-red-600 text-white font-bold border-red-700 animate-pulse">
                                ALREADY IN CALL CENTERS
                              </Badge>
                            )}
                            {/* Direct test badge for Informafrik */}
                            {prospect.name.toLowerCase().includes('informafrik') && (
                              <Badge className="bg-orange-600 text-white animate-pulse">
                                INFORMAFRIK TEST
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs"
                          onClick={() => toggleProspectSelection(prospect.id)}
                          title="Select Prospect"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-check-big w-4 h-4 mr-2" aria-hidden="true">
                            <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"></path>
                            <path d="m9 11 3 3L22 4"></path>
                          </svg>
                          Select
                        </button>

                        {getPhoneArray(prospect.phones).some(phone => {
                          const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => {
                              const mobilePhone = getPhoneArray(prospect.phones).find(phone => {
                                const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                                return phoneInfo?.is_mobile;
                              });
                              if (mobilePhone) openWhatsApp(mobilePhone);
                            }}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : getPhoneArray(prospect.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => {
                              openWhatsApp(getPhoneArray(prospect.phones)[0]);
                            }}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : null}

                        {getEmailArray(prospect.emails).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmail(getEmailArray(prospect.emails)[0])}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}

                        {getPhoneArray(prospect.phones).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeCall(getPhoneArray(prospect.phones)[0])}
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowCallLogDialog(true);
                          }}
                          title="Log Call"
                        >
                          <History className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowContactDialog(true);
                          }}
                          title="Add Contact"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProspect(prospect);
                            setFormData({
                              name: prospect.name,
                              country: prospect.country,
                              city: prospect.city,
                              positions: prospect.positions.toString(),
                              businessType: prospect.businessType,
                              phones: prospect.phones,
                              emails: prospect.emails,
                              website: prospect.website,
                              address: prospect.address || '',
                              source: prospect.source || '',
                              tags: prospect.tags.join(', '),
                              notes: prospect.notes,
                              priority: prospect.priority,
                              destinations: prospect.destinations || [],
                              dnc: prospect.dnc || false,
                              dnd: prospect.dnd || false,
                              dp: prospect.dp || false,
                              dncDescription: prospect.dncDescription || '',
                              dndDescription: prospect.dndDescription || '',
                              dpDescription: prospect.dpDescription || ''
                            });
                            setShowEditDialog(true);
                          }}
                          title="Edit Prospect"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingProspectId(prospect.id)}
                              title="Delete Prospect"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{prospect.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProspect(prospect.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleMoveBackToPending(prospect)}
                          title="Move Back to Today's Prospects"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Square className="w-4 h-4" />
                        </Button>

                        {prospect.status !== 'added_to_crm' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAddToCRM(prospect)}
                            title="Add to CRM"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Location:</span> {prospect.city}, {prospect.country}
                      </div>
                      {prospect.positions > 0 && (
                        <div>
                          <span className="font-medium">Positions:</span> {prospect.positions}
                        </div>
                      )}
                      {getPhoneArray(prospect.phones).length > 0 && (
                        <div>
                          <span className="font-medium">Phones:</span> {getPhoneArray(prospect.phones).join(', ')}
                        </div>
                      )}
                      {getEmailArray(prospect.emails).length > 0 && (
                        <div>
                          <span className="font-medium">Emails:</span> {getEmailArray(prospect.emails).join(', ')}
                        </div>
                      )}
                    </div>
                    {prospect.lastContacted && (
                      <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                        <span className="font-medium text-green-700">Contacted:</span> {format(new Date(prospect.lastContacted), 'MMM d, yyyy HH:mm')}
                      </div>
                    )}
                    {prospect.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Notes:</span> {prospect.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="linkedin" className="space-y-4">
          {/* Import LinkedIn Prospects Button */}
          <div className="flex gap-2 mb-6">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Import LinkedIn Prospects
                </Button>
              </DialogTrigger>

              <button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs"
                onClick={() => setSelectedProspects(linkedinProspects.map(p => p.id))}
                disabled={linkedinProspects.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-check-big w-4 h-4 mr-2" aria-hidden="true">
                  <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"></path>
                  <path d="m9 11 3 3L22 4"></path>
                </svg>
                Select All LinkedIn Prospects
              </button>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import LinkedIn Prospects from JSON</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Upload JSON File</label>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="mb-2"
                    />
                    <div className="text-xs text-gray-500 mb-2">Or paste JSON data below (standard prospect format):</div>
                    <Textarea
                      placeholder="Paste your LinkedIn prospects JSON data here (standard prospect structure)..."
                      value={importData}
                      onChange={(e) => {
                        setImportData(e.target.value);
                        setImportFile(null);
                      }}
                      rows={8}
                      disabled={importing}
                    />
                  </div>

                  {importing && (
                    <div className="space-y-2">
                      <Progress value={importProgress} className="w-full" />
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">{importProgressText || 'Processing...'}</p>
                        <p className="text-sm text-gray-500">{Math.round(importProgress)}%</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setShowImportDialog(false);
                      setImportData('');
                      setImportFile(null);
                      setImporting(false);
                      setImportProgress(0);
                      setImportProgressText('');
                    }} disabled={importing}>
                      Cancel
                    </Button>
                    <Button onClick={handleImportLinkedinProspects} disabled={(!importData && !importFile) || importing}>
                      {importing ? 'Importing...' : 'Import LinkedIn Prospects'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {selectedProspects.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedProspects.length} prospects selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkContacted}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Mark as Contacted ({selectedProspects.length})
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete All ({selectedProspects.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Prospects</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedProspects.length} selected prospects? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="text-center py-8">Loading LinkedIn prospects...</div>
          ) : currentFilteredProspects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No LinkedIn prospects found</p>
                <p className="text-sm text-gray-400 mt-2">Import LinkedIn prospects from JSON to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {currentFilteredProspects.map((prospect) => (
                <Card key={prospect.id} className={`relative ${
                  prospect.dnc ? 'border-red-500 bg-red-50' :
                  prospect.dnd ? 'border-yellow-500 bg-yellow-50' :
                  prospect.dp ? 'border-gray-500 bg-gray-50' :
                  getPhoneArray(prospect.phones).length === 0 ? 'border-blue-500 bg-blue-50' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProspects.includes(prospect.id)}
                          onCheckedChange={() => toggleProspectSelection(prospect.id)}
                        />
                        <div>
                          <CardTitle className="text-lg">{prospect.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getBusinessTypeColor(prospect.businessType)}>
                              {prospect.businessType.replace('-', ' ')}
                            </Badge>
                            <Badge className={getPriorityColor(prospect.priority)}>
                              {prospect.priority}
                            </Badge>
                            <Badge className={getStatusColor(prospect.status)}>
                              {prospect.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              LinkedIn
                            </Badge>
                            {getLatestDisposition(prospect) && (
                              <Badge
                                className="text-white font-medium"
                                style={{ backgroundColor: getDispositionColor(getLatestDisposition(prospect)) }}
                              >
                                {getDispositionDisplayName(getLatestDisposition(prospect))}
                              </Badge>
                            )}
                            {getPhoneArray(prospect.phones).length === 0 && (
                              <Badge variant="destructive" className="bg-red-500 text-white">
                                add a number
                              </Badge>
                            )}
                            {callCenterMatches.get(prospect.id) && (
                              <Badge className="bg-red-600 text-white font-bold border-red-700 animate-pulse">
                                ALREADY IN CALL CENTERS
                              </Badge>
                            )}
                            {/* Direct test badge for Informafrik */}
                            {prospect.name.toLowerCase().includes('informafrik') && (
                              <Badge className="bg-orange-600 text-white animate-pulse">
                                INFORMAFRIK TEST
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {getPhoneArray(prospect.phones).some(phone => {
                          const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => {
                              const mobilePhone = getPhoneArray(prospect.phones).find(phone => {
                                const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                                return phoneInfo?.is_mobile;
                              });
                              if (mobilePhone) openWhatsApp(mobilePhone);
                            }}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : getPhoneArray(prospect.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => {
                              openWhatsApp(getPhoneArray(prospect.phones)[0]);
                            }}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : null}

                        {getEmailArray(prospect.emails).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmail(getEmailArray(prospect.emails)[0])}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}

                        {getPhoneArray(prospect.phones).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeCall(getPhoneArray(prospect.phones)[0])}
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowCallLogDialog(true);
                          }}
                          title="Log Call"
                        >
                          <History className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowContactDialog(true);
                          }}
                          title="Add Contact"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProspect(prospect);
                            setFormData({
                              name: prospect.name,
                              country: prospect.country,
                              city: prospect.city,
                              positions: prospect.positions.toString(),
                              businessType: prospect.businessType,
                              phones: prospect.phones,
                              emails: prospect.emails,
                              website: prospect.website,
                              address: prospect.address || '',
                              source: prospect.source || '',
                              tags: prospect.tags.join(', '),
                              notes: prospect.notes,
                              priority: prospect.priority,
                              destinations: prospect.destinations || [],
                              dnc: prospect.dnc || false,
                              dnd: prospect.dnd || false,
                              dp: prospect.dp || false,
                              dncDescription: prospect.dncDescription || '',
                              dndDescription: prospect.dndDescription || '',
                              dpDescription: prospect.dpDescription || ''
                            });
                            setShowEditDialog(true);
                          }}
                          title="Edit Prospect"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingProspectId(prospect.id)}
                              title="Delete Prospect"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{prospect.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProspect(prospect.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleMarkAsContacted(prospect)}
                          title="Mark as Contacted"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </Button>

                        {prospect.status !== 'added_to_crm' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAddToCRM(prospect)}
                            title="Add to CRM"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Location:</span> {prospect.city}, {prospect.country}
                      </div>
                      {prospect.positions > 0 && (
                        <div>
                          <span className="font-medium">Positions:</span> {prospect.positions}
                        </div>
                      )}
                      {getPhoneArray(prospect.phones).length > 0 && (
                        <div>
                          <span className="font-medium">Phones:</span> {getPhoneArray(prospect.phones).join(', ')}
                        </div>
                      )}
                      {getEmailArray(prospect.emails).length > 0 && (
                        <div>
                          <span className="font-medium">Emails:</span> {getEmailArray(prospect.emails).join(', ')}
                        </div>
                      )}
                      {prospect.website && (
                        <div>
                          <span className="font-medium">Website:</span> <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{prospect.website}</a>
                        </div>
                      )}
                    </div>
                    {prospect.lastContacted && (
                      <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                        <span className="font-medium text-green-700">Contacted:</span> {format(new Date(prospect.lastContacted), 'MMM d, yyyy HH:mm')}
                      </div>
                    )}
                    {prospect.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Notes:</span> {prospect.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          {selectedDuplicateProspects.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedDuplicateProspects.length} duplicate prospects selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedDuplicateProspects([])}
                      variant="outline"
                      size="sm"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Deselect All
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected ({selectedDuplicateProspects.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Duplicate Prospects</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedDuplicateProspects.length} selected duplicate prospects? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleBulkDeleteDuplicates}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingDuplicates ? (
            <div className="text-center py-8">Loading duplicates...</div>
          ) : Object.keys(duplicateGroups).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No duplicate prospects found</p>
                <p className="text-sm text-gray-400 mt-2">Duplicates are detected based on matching names or phone numbers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(duplicateGroups).map(([groupKey, prospects]) => (
                <Card key={groupKey} className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <CardTitle className="text-lg text-orange-800">
                        Duplicate Group: {groupKey.startsWith('name_') ? 'Same Name' : 'Same Phone'}
                      </CardTitle>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700">
                        {prospects.length} duplicates
                      </Badge>
                    </div>
                    <p className="text-sm text-orange-600 mt-1">
                      {groupKey.startsWith('name_')
                        ? `Name: "${prospects[0].name}"`
                        : `Phone: "${groupKey.replace('phone_', '')}"`
                      }
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {prospects.map((prospect) => (
                        <Card key={prospect.id} className={`border-l-4 border-l-blue-400 bg-white ${
                          getPhoneArray(prospect.phones).length === 0 ? 'border-blue-500 bg-blue-50' : ''
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedDuplicateProspects.includes(prospect.id)}
                                  onCheckedChange={() => toggleDuplicateProspectSelection(prospect.id)}
                                />
                                <div>
                                  <h4 className="font-medium text-gray-900">{prospect.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={getBusinessTypeColor(prospect.businessType)}>
                                      {prospect.businessType.replace('-', ' ')}
                                    </Badge>
                                    <Badge className={getStatusColor(prospect.status)}>
                                      {prospect.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProspect(prospect);
                                    setShowCallLogDialog(true);
                                  }}
                                  title="Log Call"
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingProspect(prospect);
                                    setFormData({
                                      name: prospect.name,
                                      country: prospect.country,
                                      city: prospect.city,
                                      positions: prospect.positions.toString(),
                                      businessType: prospect.businessType,
                                      phones: prospect.phones,
                                      emails: prospect.emails,
                                      website: prospect.website,
                                      address: prospect.address || '',
                                      source: prospect.source || '',
                                      tags: prospect.tags.join(', '),
                                      notes: prospect.notes,
                                      priority: prospect.priority,
                                      destinations: prospect.destinations || [],
                                      dnc: prospect.dnc || false,
                                      dnd: prospect.dnd || false,
                                      dp: prospect.dp || false,
                                      dncDescription: prospect.dncDescription || '',
                                      dndDescription: prospect.dndDescription || '',
                                      dpDescription: prospect.dpDescription || ''
                                    });
                                    setShowEditDialog(true);
                                  }}
                                  title="Edit Prospect"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setDeletingProspectId(prospect.id)}
                                      title="Delete Prospect"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{prospect.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteProspect(prospect.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mt-3">
                              <div>
                                <span className="font-medium">Location:</span> {prospect.city}, {prospect.country}
                              </div>
                              {prospect.positions > 0 && (
                                <div>
                                  <span className="font-medium">Positions:</span> {prospect.positions}
                                </div>
                              )}
                              {getPhoneArray(prospect.phones).length > 0 && (
                                <div>
                                  <span className="font-medium">Phones:</span> {getPhoneArray(prospect.phones).join(', ')}
                                </div>
                              )}
                              {getEmailArray(prospect.emails).length > 0 && (
                                <div>
                                  <span className="font-medium">Emails:</span> {getEmailArray(prospect.emails).join(', ')}
                                </div>
                              )}
                            </div>
                            {prospect.lastContacted && (
                              <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                                <span className="font-medium text-green-700">Contacted:</span> {format(new Date(prospect.lastContacted), 'MMM d, yyyy HH:mm')}
                              </div>
                            )}
                            {prospect.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                <span className="font-medium">Notes:</span> {prospect.notes}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">

          {/* Search and Filter Controls */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search prospects by name, company, city, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={contactFilter} onValueChange={(value) => setContactFilter(value as 'all' | 'contacted' | 'not-contacted')}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by contact status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prospects</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="not-contacted">Not Contacted Yet</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      <SelectItem value="Morocco">Morocco</SelectItem>
                      <SelectItem value="Tunisia">Tunisia</SelectItem>
                      <SelectItem value="Senegal">Senegal</SelectItem>
                      <SelectItem value="Ivory Coast">Ivory Coast</SelectItem>
                      <SelectItem value="Guinea">Guinea</SelectItem>
                      <SelectItem value="Cameroon">Cameroon</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={hasPhoneFilter} onValueChange={(value) => setHasPhoneFilter(value as 'all' | 'has-phone' | 'no-phone')}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Phone Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prospects</SelectItem>
                      <SelectItem value="has-phone">Has Phone</SelectItem>
                      <SelectItem value="no-phone">No Phone</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchTerm || contactFilter !== 'all' || countryFilter !== 'all' || hasPhoneFilter !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setContactFilter('all');
                        setCountryFilter('all');
                        setHasPhoneFilter('all');
                      }}
                      size="sm"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
              {(searchTerm || contactFilter !== 'all' || countryFilter !== 'all' || hasPhoneFilter !== 'all') && (
                <div className="mt-3 text-sm text-gray-600">
                  Showing {currentFilteredProspects.length} of {combinedProspects.length} prospects
                  {searchTerm && ` matching "${searchTerm}"`}
                  {contactFilter !== 'all' && ` (${contactFilter === 'contacted' ? 'contacted' : 'not contacted yet'})`}
                  {countryFilter !== 'all' && ` in ${countryFilter}`}
                  {hasPhoneFilter !== 'all' && ` (${hasPhoneFilter === 'has-phone' ? 'has phone' : 'no phone'})`}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedProspects.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedProspects.length} prospects selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkContacted}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Mark as Contacted ({selectedProspects.length})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end mb-4">
            {selectedProspects.length === currentFilteredProspects.length && currentFilteredProspects.length > 0 ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedProspects([])}>
                  <Square className="w-4 h-4 mr-2" />
                  Deselect All
                </Button>
                {selectedProspects.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All ({selectedProspects.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Prospects</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedProspects.length} selected prospects? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedProspects(currentFilteredProspects.map(p => p.id))}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select All
                </Button>
                {selectedProspects.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All ({selectedProspects.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Prospects</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedProspects.length} selected prospects? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading prospects...</div>
          ) : currentFilteredProspects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">
                  {combinedProspects.length === 0 ? 'No prospects found' : 'No prospects match your filters'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {combinedProspects.length === 0
                    ? 'Add prospects or import from JSON to get started'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {currentFilteredProspects.map((prospect) => (
                <Card key={prospect.id} className={`relative ${
                  prospect.dnc ? 'border-red-500 bg-red-50' :
                  prospect.dnd ? 'border-yellow-500 bg-yellow-50' :
                  prospect.dp ? 'border-gray-500 bg-gray-50' :
                  getPhoneArray(prospect.phones).length === 0 ? 'border-blue-500 bg-blue-50' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProspects.includes(prospect.id)}
                          onCheckedChange={() => toggleProspectSelection(prospect.id)}
                        />
                        <div>
                          <CardTitle className="text-lg">{prospect.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getBusinessTypeColor(prospect.businessType)}>
                              {prospect.businessType.replace('-', ' ')}
                            </Badge>
                            <Badge className={getPriorityColor(prospect.priority)}>
                              {prospect.priority}
                            </Badge>
                            <Badge className={getStatusColor(prospect.status)}>
                              {prospect.status.replace('_', ' ')}
                            </Badge>
                            {prospect.addedDate && (
                              <Badge variant="outline">
                                Added: {format(new Date(prospect.addedDate), 'MMM d, yyyy')}
                              </Badge>
                            )}
                            {getLatestDisposition(prospect) && (
                              <Badge
                                className="text-white font-medium"
                                style={{ backgroundColor: getDispositionColor(getLatestDisposition(prospect)) }}
                              >
                                {getDispositionDisplayName(getLatestDisposition(prospect))}
                              </Badge>
                            )}
                            {callCenterMatches.get(prospect.id) && (
                              <Badge className="bg-red-600 text-white font-bold border-red-700 animate-pulse">
                                ALREADY IN CALL CENTERS
                              </Badge>
                            )}
                            {/* Direct test badge for Informafrik */}
                            {prospect.name.toLowerCase().includes('informafrik') && (
                              <Badge className="bg-orange-600 text-white animate-pulse">
                                INFORMAFRIK TEST
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {getPhoneArray(prospect.phones).some(phone => {
                          const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => {
                              const mobilePhone = getPhoneArray(prospect.phones).find(phone => {
                                const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                                return phoneInfo?.is_mobile;
                              });
                              if (mobilePhone) openWhatsApp(mobilePhone);
                            }}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : getPhoneArray(prospect.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => {
                              openWhatsApp(getPhoneArray(prospect.phones)[0]);
                            }}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : null}

                        {getEmailArray(prospect.emails).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmail(getEmailArray(prospect.emails)[0])}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}

                        {getPhoneArray(prospect.phones).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeCall(getPhoneArray(prospect.phones)[0])}
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowCallLogDialog(true);
                          }}
                          title="Log Call"
                        >
                          <History className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setShowContactDialog(true);
                          }}
                          title="Add Contact"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProspect(prospect);
                            setFormData({
                              name: prospect.name,
                              country: prospect.country,
                              city: prospect.city,
                              positions: prospect.positions.toString(),
                              businessType: prospect.businessType,
                              phones: prospect.phones,
                              emails: prospect.emails,
                              website: prospect.website,
                              address: prospect.address || '',
                              source: prospect.source || '',
                              tags: prospect.tags.join(', '),
                              notes: prospect.notes,
                              priority: prospect.priority,
                              destinations: prospect.destinations || [],
                              dnc: prospect.dnc || false,
                              dnd: prospect.dnd || false,
                              dp: prospect.dp || false,
                              dncDescription: prospect.dncDescription || '',
                              dndDescription: prospect.dndDescription || '',
                              dpDescription: prospect.dpDescription || ''
                            });
                            setShowEditDialog(true);
                          }}
                          title="Edit Prospect"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingProspectId(prospect.id)}
                              title="Delete Prospect"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{prospect.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProspect(prospect.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleMarkAsContacted(prospect)}
                          title="Mark as Contacted"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </Button>

                        {prospect.status !== 'added_to_crm' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAddToCRM(prospect)}
                            title="Add to CRM"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Location:</span> {prospect.city}, {prospect.country}
                      </div>
                      {prospect.positions > 0 && (
                        <div>
                          <span className="font-medium">Positions:</span> {prospect.positions}
                        </div>
                      )}
                      {getPhoneArray(prospect.phones).length > 0 && (
                        <div>
                          <span className="font-medium">Phones:</span> {getPhoneArray(prospect.phones).join(', ')}
                        </div>
                      )}
                      {getEmailArray(prospect.emails).length > 0 && (
                        <div>
                          <span className="font-medium">Emails:</span> {getEmailArray(prospect.emails).join(', ')}
                        </div>
                      )}
                      {prospect.website && (
                        <div>
                          <span className="font-medium">Website:</span> <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{prospect.website}</a>
                        </div>
                      )}
                    </div>
                    {prospect.lastContacted && (
                      <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                        <span className="font-medium text-green-700">Contacted:</span> {format(new Date(prospect.lastContacted), 'MMM d, yyyy HH:mm')}
                      </div>
                    )}
                    {prospect.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Notes:</span> {prospect.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Call Log Dialog */}
      <Dialog open={showCallLogDialog} onOpenChange={setShowCallLogDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Call - {selectedProspect?.name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic-info" className="w-full">
           <TabsList className="grid w-full grid-cols-4">
             <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
             <TabsTrigger value="call-classification">Call Classification</TabsTrigger>
             <TabsTrigger value="recording-analysis">Recording & Analysis</TabsTrigger>
             <TabsTrigger value="quality-scoring">Quality Scoring</TabsTrigger>
           </TabsList>

            <TabsContent value="basic-info" className="space-y-6 mt-6">
            {/* Call History Section */}
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex flex-col space-y-1.5 p-6">
                <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history w-5 h-5" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>Call History ({selectedProspect?.callHistory?.length || 0})</div>
              </div>
              <div className="p-6 pt-0">
                {selectedProspect?.callHistory && selectedProspect.callHistory.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedProspect.callHistory.slice(-5).reverse().map((call, index) => (
                      <div key={call.id || index} className="text-sm p-2 bg-white rounded border relative group">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{format(new Date(call.date), 'MMM d, yyyy \'at\' h:mm a')}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {call.outcome}
                            </Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setSelectedProspect(selectedProspect);
                                  openEditCallLog(call);
                                }}
                                title="Edit Call Log"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => setDeletingCallLogId(call.id || `call-${index}`)}
                                    title="Delete Call Log"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Call Log</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this call log? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteCallLog}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-600 mt-1">
                          {call.notes ? call.notes.substring(0, 100) + (call.notes.length > 100 ? '...' : '') : 'No notes'}
                        </div>
                        {call.phone_used && (
                          <div className="text-xs text-gray-500 mt-1">
                            📞 {call.phone_used}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square w-8 h-8 mx-auto mb-2 text-gray-400" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path></svg>
                    <p className="text-sm">No previous calls logged</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="callDate">Call Date (mm/dd/yyyy)</Label>
                <Input
                  id="callDate"
                  type="text"
                  value={callLogData.callDate}
                  onChange={(e) => setCallLogData(prev => ({ ...prev, callDate: e.target.value }))}
                  placeholder="mm/dd/yyyy"
                  pattern="[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}"
                  title="Please enter date in mm/dd/yyyy format"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use today's date ({new Date().toLocaleDateString('en-US')})</p>
              </div>
              <div>
                <Label htmlFor="callTime">Call Time (HH:MM)</Label>
                <Input
                  id="callTime"
                  type="time"
                  value={callLogData.callTime}
                  onChange={(e) => setCallLogData(prev => ({ ...prev, callTime: e.target.value }))}
                  title="Please enter time in HH:MM format (24-hour)"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use current time ({new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })})</p>
              </div>
            </div>

            {selectedProspect && getPhoneArray(selectedProspect.phones).length > 0 && (
              <div>
                <Label htmlFor="phone_used">Phone Number Called *</Label>
                <Select
                  value={callLogData.phone_used}
                  onValueChange={(value) => setCallLogData(prev => ({ ...prev, phone_used: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select phone number that was called" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPhoneArray(selectedProspect.phones).map((phone, index) => (
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

            <div>
              <Label htmlFor="duration">Duration (mm:ss format)</Label>
              <input
                type="text"
                id="duration"
                value={durationInputValue}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setDurationInputValue(inputValue);
                  const seconds = inputValue === '' ? 0 : parseDuration(inputValue);
                  setCallLogData(prev => ({ ...prev, duration: seconds }));
                }}
                onBlur={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue && !isValidDuration(inputValue)) {
                    // Reset to formatted value if invalid
                    const formatted = callLogData.duration ? formatDuration(callLogData.duration) : '';
                    setDurationInputValue(formatted);
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
                    <SelectItem value="busy">BUSY — Occupé/Call me later (no specific time)</SelectItem>
                    <SelectItem value="noanswer">NOANSWER — No Answer After Engagement</SelectItem>
                    <SelectItem value="inp">INP — I'm not the person who handles this (he could be just HR or assistant...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Additional Fields Based on Disposition */}
            {callLogData.disposition === 'callback' && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="callbackDate">Callback Date & Time</Label>
                  <Input
                    id="callbackDate"
                    type="datetime-local"
                    value={callLogData.callbackDate || ''}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, callbackDate: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {callLogData.disposition === 'meeting_scheduled' && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="meetingDate">Meeting Date & Time</Label>
                  <Input
                    id="meetingDate"
                    type="datetime-local"
                    value={callLogData.meetingDate || ''}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, meetingDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="meetingLocation">Meeting Location</Label>
                  <Input
                    id="meetingLocation"
                    value={callLogData.meetingLocation || ''}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, meetingLocation: e.target.value }))}
                    placeholder="Location or link"
                  />
                </div>
              </div>
            )}

            {callLogData.disposition === 'competitor' && (
              <div className="mt-3">
                <Label htmlFor="competitorName">Competitor Name</Label>
                <Input
                  id="competitorName"
                  value={callLogData.competitorName || ''}
                  onChange={(e) => setCallLogData(prev => ({ ...prev, competitorName: e.target.value }))}
                  placeholder="Competitor name"
                />
              </div>
            )}

            {/* Follow-up Field */}
            <div>
              <Label htmlFor="notes">Follow-up Actions</Label>
              <Textarea
                id="notes"
                value={callLogData.notes}
                onChange={(e) =>
                  setCallLogData(prev => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Additional notes and next steps..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCallLogDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCallLog}
                disabled={!callLogData.outcome || !callLogData.notes || isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Call Log'}
              </Button>
            </div>
            </TabsContent>

            <TabsContent value="call-classification" className="space-y-6 mt-6">
              {/* Call Result Classification Section */}
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-3 w-5 h-5" aria-hidden="true"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
                    Call Result Classification
                  </div>
                  <p className="text-sm text-slate-600">Advanced call analysis for performance tracking</p>
                </div>
                <div className="p-6 pt-0 space-y-6">
                  {/* Argumentation */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Argumentation</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_argumented"
                        checked={callLogData.is_argumented || false}
                        onCheckedChange={(checked) => setCallLogData(prev => ({ ...prev, is_argumented: !!checked }))}
                      />
                      <Label htmlFor="is_argumented" className="text-sm font-normal">
                        Argumenté (Call involved argumentation/discussion)
                      </Label>
                    </div>
                  </div>

                  {/* Decision Maker Reached */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Decision Maker</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="decision_maker_reached"
                        checked={callLogData.decision_maker_reached || false}
                        onCheckedChange={(checked) => setCallLogData(prev => ({ ...prev, decision_maker_reached: !!checked }))}
                      />
                      <Label htmlFor="decision_maker_reached" className="text-sm font-normal">
                        Décideur atteint (Decision maker was reached)
                      </Label>
                    </div>
                  </div>

                  {/* Objection Tracking */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Objection Tracking</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="objection_category" className="text-sm">Objection Category</Label>
                        <Select
                          value={callLogData.objection_category || ''}
                          onValueChange={(value) => setCallLogData(prev => ({ ...prev, objection_category: value as any }))}
                          disabled={!callLogData.is_argumented}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select objection category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="price">Price</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="timing">Timing</SelectItem>
                            <SelectItem value="already_has_provider">Already Has Provider</SelectItem>
                            <SelectItem value="bad_number">Bad Number</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="objection_detail" className="text-sm">Objection Detail</Label>
                        <Textarea
                          id="objection_detail"
                          value={callLogData.objection_detail || ''}
                          onChange={(e) => setCallLogData(prev => ({ ...prev, objection_detail: e.target.value }))}
                          placeholder="Exact response from prospect..."
                          rows={2}
                          disabled={!callLogData.objection_category}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reason for Refusal */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Reason for Refusal</Label>
                    <div>
                      <Label htmlFor="refusal_reason" className="text-sm">Refusal Reason</Label>
                      <Select
                        value={callLogData.refusal_reason || ''}
                        onValueChange={(value) => {
                          const refusalReason = value as any;
                          setCallLogData(prev => ({
                            ...prev,
                            refusal_reason: refusalReason,
                            // Auto-set fields for bad_number
                            is_argumented: refusalReason === 'mauvais_numero' ? false : prev.is_argumented,
                            decision_maker_reached: refusalReason === 'mauvais_numero' ? false : prev.decision_maker_reached,
                            objection_category: refusalReason === 'mauvais_numero' ? 'bad_number' : prev.objection_category,
                          }));
                        }}
                        disabled={!callLogData.is_argumented}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select refusal reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prix_trop_cher">Prix trop cher</SelectItem>
                          <SelectItem value="envoyez_un_email">Envoyez un email</SelectItem>
                          <SelectItem value="pas_maintenant">Pas maintenant</SelectItem>
                          <SelectItem value="deja_un_fournisseur">Déjà un fournisseur</SelectItem>
                          <SelectItem value="mauvais_numero">Mauvais numéro</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Classification Summary</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div>Argumentation: {callLogData.is_argumented ? '✅ Argumenté' : '❌ Non argumenté'}</div>
                      <div>Decision Maker: {callLogData.decision_maker_reached ? '✅ Reached' : '❌ Not reached'}</div>
                      {callLogData.objection_category && (
                        <div>Objection: {callLogData.objection_category.replace('_', ' ')}</div>
                      )}
                      {callLogData.refusal_reason && (
                        <div>Refusal: {callLogData.refusal_reason.replace('_', ' ')}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recording-analysis" className="space-y-6 mt-6">
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

              {/* Transcription Section */}
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-5 h-5" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                    Transcription
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste transcription text here..."
                      value={callLogData.transcriptionText}
                      onChange={(e) => setCallLogData(prev => ({ ...prev, transcriptionText: e.target.value }))}
                      rows={6}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // TODO: Implement paste/import functionality
                          navigator.clipboard.readText().then(text => {
                            setCallLogData(prev => ({ ...prev, transcriptionText: text }));
                          }).catch(err => {
                            alert('Failed to paste from clipboard');
                          });
                        }}
                        className="flex-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard mr-2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>
                        Paste Transcription
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // TODO: Implement import functionality
                          alert('Import functionality to be implemented');
                        }}
                        className="flex-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                        Import
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Analysis Section */}
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain w-5 h-5" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path></svg>
                    AI Analysis
                  </div>
                </div>
                <div className="p-6 pt-0">
                  {callLogData.autoAnalysisSummary ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain text-blue-600"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path></svg>
                          <span className="font-medium text-blue-800">AI Analysis Generated</span>
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {callLogData.autoAnalysisSummary}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // TODO: Implement regenerate analysis functionality
                          alert('Regenerate analysis functionality to be implemented');
                        }}
                        className="w-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw mr-2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
                        Regenerate Analysis
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center py-6 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain mx-auto text-gray-400 mb-4"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path></svg>
                        <p className="text-sm">No AI analysis generated yet</p>
                        <p className="text-xs text-gray-400 mt-1">Generate analysis from transcription</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            // TODO: Implement AI analysis functionality
                            alert('AI analysis functionality to be implemented');
                          }}
                          className="flex-1"
                          disabled={!callLogData.transcriptionText}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain mr-2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path></svg>
                          Generate AI Analysis
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setManualAnalysisText(callLogData.autoAnalysisSummary || '');
                            setShowInsertAnalysisDialog(true);
                          }}
                          className="flex-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard mr-2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>
                          Insert Analyses
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Coach Feedback Section */}
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-5 h-5" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    Coach Feedback
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Add internal coach notes and feedback..."
                      value={callLogData.coachFeedback}
                      onChange={(e) => setCallLogData(prev => ({ ...prev, coachFeedback: e.target.value }))}
                      rows={4}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500">
                      These notes are for internal coaching purposes only
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quality-scoring" className="space-y-6 mt-6">
              {/* Quality Scoring Section */}
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-5 h-5" aria-hidden="true"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon></svg>
                    Quality Scoring
                  </div>
                  <p className="text-sm text-slate-600">Rate the call quality using Soufiane's methodology</p>
                </div>
                <div className="p-6 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Accroche Score */}
                    <div>
                      <Label htmlFor="accroche_score">Accroche Score (1-5) *</Label>
                      <Select
                        value={callLogData.accroche_score?.toString() || ''}
                        onValueChange={(value) => setCallLogData(prev => ({ ...prev, accroche_score: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rate accroche quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Below Average</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                          <SelectItem value="4">4 - Good</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">How well did you hook the prospect's attention?</p>
                    </div>

                    {/* Discovery Score */}
                    <div>
                      <Label htmlFor="discovery_score">Discovery Score (1-5) *</Label>
                      <Select
                        value={callLogData.discovery_score?.toString() || ''}
                        onValueChange={(value) => setCallLogData(prev => ({ ...prev, discovery_score: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rate discovery quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Below Average</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                          <SelectItem value="4">4 - Good</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">How well did you understand their needs?</p>
                    </div>

                    {/* Value Proposition Score */}
                    <div>
                      <Label htmlFor="value_prop_score">Value Proposition Score (1-5) *</Label>
                      <Select
                        value={callLogData.value_prop_score?.toString() || ''}
                        onValueChange={(value) => setCallLogData(prev => ({ ...prev, value_prop_score: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rate value proposition delivery" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Below Average</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                          <SelectItem value="4">4 - Good</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">How effectively did you present your value?</p>
                    </div>

                    {/* Objection Handling Score */}
                    <div>
                      <Label htmlFor="objection_score">Objection Handling Score (1-5) *</Label>
                      <Select
                        value={callLogData.objection_score?.toString() || ''}
                        onValueChange={(value) => setCallLogData(prev => ({ ...prev, objection_score: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rate objection handling" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Below Average</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                          <SelectItem value="4">4 - Good</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">How well did you handle objections?</p>
                    </div>

                    {/* Closing Score */}
                    <div>
                      <Label htmlFor="closing_score">Closing Score (1-5) *</Label>
                      <Select
                        value={callLogData.closing_score?.toString() || ''}
                        onValueChange={(value) => setCallLogData(prev => ({ ...prev, closing_score: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rate closing attempt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Below Average</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                          <SelectItem value="4">4 - Good</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">How effectively did you attempt to close?</p>
                    </div>

                    {/* Talk Time Ratios */}
                    <div className="md:col-span-2">
                      <Label>Talk-Time Ratios (%)</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label htmlFor="client_talk_ratio" className="text-sm">Client Talk Ratio</Label>
                          <Input
                            id="client_talk_ratio"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={callLogData.client_talk_ratio || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setCallLogData(prev => ({
                                ...prev,
                                client_talk_ratio: value,
                                agent_talk_ratio: value ? 100 - value : undefined
                              }));
                            }}
                            placeholder="62.5"
                          />
                          <p className="text-xs text-gray-500 mt-1">Percentage of time client spoke</p>
                        </div>
                        <div>
                          <Label htmlFor="agent_talk_ratio" className="text-sm">Agent Talk Ratio</Label>
                          <Input
                            id="agent_talk_ratio"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={callLogData.agent_talk_ratio || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setCallLogData(prev => ({
                                ...prev,
                                agent_talk_ratio: value,
                                client_talk_ratio: value ? 100 - value : undefined
                              }));
                            }}
                            placeholder="37.5"
                          />
                          <p className="text-xs text-gray-500 mt-1">Percentage of time agent spoke</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement auto-calculation from transcription
                            alert('Auto-calculation from transcription to be implemented');
                          }}
                          disabled={!callLogData.transcriptionText}
                        >
                          Auto-Calculate from Transcription
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCallLogData(prev => ({
                              ...prev,
                              client_talk_ratio: undefined,
                              agent_talk_ratio: undefined
                            }));
                          }}
                        >
                          Clear Ratios
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Average Score Display */}
                  {(callLogData.accroche_score && callLogData.discovery_score && callLogData.value_prop_score &&
                    callLogData.objection_score && callLogData.closing_score) && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calculator text-blue-600"><rect width="16" height="20" x="4" y="2" rx="2"></rect><line x1="8" x2="16" y1="6" y2="6"></line><line x1="8" x2="16" y1="10" y2="10"></line><line x1="8" x2="16" y1="14" y2="14"></line><line x1="8" x2="16" y1="18" y2="18"></line></svg>
                        <span className="font-medium text-blue-800">Average Quality Score</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        {((callLogData.accroche_score + callLogData.discovery_score + callLogData.value_prop_score +
                           callLogData.objection_score + callLogData.closing_score) / 5).toFixed(1)} / 5.0
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        Based on all 5 quality metrics
                      </p>
                    </div>
                  )}

                  {/* Save Quality Scores Button */}
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reset quality scoring fields
                        setCallLogData(prev => ({
                          ...prev,
                          accroche_score: undefined,
                          discovery_score: undefined,
                          value_prop_score: undefined,
                          objection_score: undefined,
                          closing_score: undefined,
                          client_talk_ratio: undefined,
                          agent_talk_ratio: undefined
                        }));
                      }}
                    >
                      Clear Scores
                    </Button>
                    <div className="text-sm text-gray-600">
                      Quality scores will be saved when you save the call log above.
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Contact - {selectedProspect?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={contactData.name}
                  onChange={(e) => setContactData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Position</label>
                <Input
                  value={contactData.position}
                  onChange={(e) => setContactData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Job position"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={contactData.phone}
                  onChange={(e) => setContactData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  value={contactData.email}
                  onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea
                value={contactData.notes}
                onChange={(e) => setContactData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Contact notes..."
                rows={3}
              />
            </div>

            {/* Personalization & Pattern Interrupts Section */}
            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-semibold mb-4">Personalization & Pattern Interrupts</h3>

              {/* Personal Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Personal Notes (human details)</label>
                  <Textarea
                    value={contactData.personal_details}
                    onChange={(e) => setContactData(prev => ({ ...prev, personal_details: e.target.value }))}
                    placeholder="Dog's name, what they like, joke they made..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Rapport Tags</label>
                  <Input
                    value={contactData.rapport_tags.join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                      setContactData(prev => ({ ...prev, rapport_tags: tags }));
                    }}
                    placeholder="football, dog, French accent..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated tags for easy filtering</p>
                </div>
              </div>

              {/* Pattern Interrupt */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pattern_interrupt_used"
                    checked={contactData.pattern_interrupt_used}
                    onCheckedChange={(checked) => setContactData(prev => ({
                      ...prev,
                      pattern_interrupt_used: !!checked,
                      pattern_interrupt_note: !checked ? '' : prev.pattern_interrupt_note
                    }))}
                  />
                  <label htmlFor="pattern_interrupt_used" className="text-sm font-medium">
                    Was a pattern interrupt used?
                  </label>
                </div>

                {contactData.pattern_interrupt_used && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Which pattern interrupt?</label>
                    <Textarea
                      value={contactData.pattern_interrupt_note}
                      onChange={(e) => setContactData(prev => ({ ...prev, pattern_interrupt_note: e.target.value }))}
                      placeholder="Humor: 'I promise I'm nice today'..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowContactDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddContact}>
                Add Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Call Log Dialog */}
      <Dialog open={showEditCallLogDialog} onOpenChange={setShowEditCallLogDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Call Log - {selectedProspect?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
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

            {/* Transcription Section */}
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex flex-col space-y-1.5 p-6">
                <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-5 h-5" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                  Transcription
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste transcription text here..."
                    value={callLogData.transcriptionText}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, transcriptionText: e.target.value }))}
                    rows={6}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement paste/import functionality
                        navigator.clipboard.readText().then(text => {
                          setCallLogData(prev => ({ ...prev, transcriptionText: text }));
                        }).catch(err => {
                          alert('Failed to paste from clipboard');
                        });
                      }}
                      className="flex-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard mr-2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>
                      Paste Transcription
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement import functionality
                        alert('Import functionality to be implemented');
                      }}
                      className="flex-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                      Import
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis Section */}
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex flex-col space-y-1.5 p-6">
                <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain w-5 h-5" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path></svg>
                  AI Analysis
                </div>
              </div>
              <div className="p-6 pt-0">
                {callLogData.autoAnalysisSummary ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain text-blue-600"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path></svg>
                        <span className="font-medium text-blue-800">AI Analysis Generated</span>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {callLogData.autoAnalysisSummary}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement regenerate analysis functionality
                        alert('Regenerate analysis functionality to be implemented');
                      }}
                      className="w-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw mr-2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
                      Regenerate Analysis
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-6 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain mx-auto text-gray-400 mb-4"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path></svg>
                      <p className="text-sm">No AI analysis generated yet</p>
                      <p className="text-xs text-gray-400 mt-1">Generate analysis from transcription</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // TODO: Implement AI analysis functionality
                          alert('AI analysis functionality to be implemented');
                        }}
                        className="flex-1"
                        disabled={!callLogData.transcriptionText}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain mr-2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 4.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path><path d="M19.5 2A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-4.96-.44V4.5A2.5 2.5 0 0 1 14.5 2Z"></path></svg>
                        Generate AI Analysis
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setManualAnalysisText(callLogData.autoAnalysisSummary || '');
                          setShowInsertAnalysisDialog(true);
                        }}
                        className="flex-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard mr-2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>
                        Insert Analyses
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coach Feedback Section */}
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex flex-col space-y-1.5 p-6">
                <div className="text-lg font-semibold leading-none tracking-tight text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-5 h-5" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  Coach Feedback
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Add internal coach notes and feedback..."
                    value={callLogData.coachFeedback}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, coachFeedback: e.target.value }))}
                    rows={4}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">
                    These notes are for internal coaching purposes only
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="editCallDate">Call Date (mm/dd/yyyy)</Label>
                <Input
                  id="editCallDate"
                  type="text"
                  value={callLogData.callDate}
                  onChange={(e) => setCallLogData(prev => ({ ...prev, callDate: e.target.value }))}
                  placeholder="11/12/2025"
                  pattern="^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/([0-9]{4})$"
                  title="Date in mm/dd/yyyy format (e.g., 11/12/2025). Leave empty to use today's date."
                />
                <div className="text-xs text-gray-500 mt-1">
                  Leave empty to use today's date ({new Date().toLocaleDateString('en-US')})
                </div>
              </div>

              <div>
                <Label htmlFor="editCallTime">Call Time (HH:MM)</Label>
                <Input
                  id="editCallTime"
                  type="time"
                  value={callLogData.callTime}
                  onChange={(e) => setCallLogData(prev => ({ ...prev, callTime: e.target.value }))}
                  placeholder="14:30"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Leave empty to use current time ({new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="editPhoneUsed">Phone Number Called *</Label>
                <Select
                  value={callLogData.phone_used}
                  onValueChange={(value) => setCallLogData(prev => ({ ...prev, phone_used: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select phone number" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPhoneArray(selectedProspect?.phones).map((phone, index) => (
                      <SelectItem key={index} value={phone}>
                        {phone} {index === 0 ? '(Primary)' : `(${index + 1})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500 mt-1">
                  Select the phone number you called
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="editOutcome">Call Outcome *</Label>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="editDuration">Duration (mm:ss format)</Label>
                <Input
                  id="editDuration"
                  type="text"
                  value={editDurationInputValue}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setEditDurationInputValue(inputValue);
                    const seconds = inputValue === '' ? 0 : parseDuration(inputValue);
                    setCallLogData(prev => ({ ...prev, duration: seconds }));
                  }}
                  onBlur={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue && !isValidDuration(inputValue)) {
                      // Reset to formatted value if invalid
                      const formatted = callLogData.duration ? formatDuration(callLogData.duration) : '';
                      setEditDurationInputValue(formatted);
                    }
                  }}
                  placeholder="Enter duration in mm:ss format (e.g., 4:05)"
                />
                {callLogData.duration > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Equivalent: {callLogData.duration} seconds
                  </div>
                )}
              </div>
            </div>

            {callLogData.outcome === 'answered' && (
              <div>
                <Label htmlFor="editDisposition">Call Disposition *</Label>
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
                    <SelectItem value="busy">BUSY — Occupé/Call me later (no specific time)</SelectItem>
                    <SelectItem value="noanswer">NOANSWER — No Answer After Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Additional Fields Based on Disposition */}
            {callLogData.disposition === 'callback' && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="editCallbackDate">Callback Date & Time</Label>
                  <Input
                    id="editCallbackDate"
                    type="datetime-local"
                    value={callLogData.callbackDate || ''}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, callbackDate: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {callLogData.disposition === 'meeting_scheduled' && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="editMeetingDate">Meeting Date & Time</Label>
                  <Input
                    id="editMeetingDate"
                    type="datetime-local"
                    value={callLogData.meetingDate || ''}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, meetingDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="editMeetingLocation">Meeting Location</Label>
                  <Input
                    id="editMeetingLocation"
                    value={callLogData.meetingLocation || ''}
                    onChange={(e) => setCallLogData(prev => ({ ...prev, meetingLocation: e.target.value }))}
                    placeholder="Location or link"
                  />
                </div>
              </div>
            )}

            {callLogData.disposition === 'competitor' && (
              <div className="mt-3">
                <Label htmlFor="editCompetitorName">Competitor Name</Label>
                <Input
                  id="editCompetitorName"
                  value={callLogData.competitorName || ''}
                  onChange={(e) => setCallLogData(prev => ({ ...prev, competitorName: e.target.value }))}
                  placeholder="Competitor name"
                />
              </div>
            )}

            {/* Notes Field */}
            <div>
              <Label htmlFor="editNotes">Notes *</Label>
              <Textarea
                id="editNotes"
                value={callLogData.notes}
                onChange={(e) =>
                  setCallLogData(prev => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Enter detailed call notes..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowEditCallLogDialog(false);
                setEditingCallLog(null);
                resetCallLogForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleEditCallLog}
                disabled={!callLogData.outcome || !callLogData.notes || isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Call Log'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Prospect Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Business Type *</label>
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
                <label className="block text-sm font-medium mb-1">Country *</label>
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
                <label className="block text-sm font-medium mb-1">City *</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Positions</label>
                <Input
                  type="number"
                  value={formData.positions}
                  onChange={(e) => setFormData(prev => ({ ...prev, positions: e.target.value }))}
                  placeholder="Number of positions"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone Numbers *</label>
              {formData.phones.map((phone, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={phone}
                    onChange={(e) => updatePhoneField(index, e.target.value)}
                    placeholder="Phone number"
                  />
                  {formData.phones.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePhoneField(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addPhoneField}>
                Add Phone
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email Addresses</label>
              {formData.emails.map((email, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={email}
                    onChange={(e) => updateEmailField(index, e.target.value)}
                    placeholder="Email address"
                  />
                  {formData.emails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEmailField(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addEmailField}>
                Add Email
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
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
              <label className="block text-sm font-medium mb-1">Calling Destinations (Multiple Selection)</label>
              <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {DESTINATION_OPTIONS.map((destination) => (
                  <div key={destination} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-destination-${destination}`}
                      checked={formData.destinations.includes(destination)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            destinations: [...prev.destinations, destination]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            destinations: prev.destinations.filter(d => d !== destination)
                          }));
                        }
                      }}
                    />
                    <label
                      htmlFor={`edit-destination-${destination}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {destination}
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Input
                  placeholder="Or add custom destination..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const customDestination = e.currentTarget.value.trim();
                      if (!formData.destinations.includes(customDestination)) {
                        setFormData(prev => ({
                          ...prev,
                          destinations: [...prev.destinations, customDestination]
                        }));
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              {formData.destinations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.destinations.map((destination) => (
                    <Badge
                      key={destination}
                      variant="secondary"
                      className="text-xs"
                    >
                      {destination}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            destinations: prev.destinations.filter(d => d !== destination)
                          }));
                        }}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>


            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                placeholder="Lead source"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Comma separated tags"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            {/* DNC/DND/DP Section */}
            <div className="space-y-4 border-t pt-4">
              <label className="block text-sm font-medium mb-2">Prospect Status</label>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-dnc"
                    checked={formData.dnc}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dnc: !!checked }))}
                  />
                  <label htmlFor="edit-dnc" className="text-sm font-medium">
                    DNC - Do Not Call
                  </label>
                </div>
                {formData.dnc && (
                  <Textarea
                    value={formData.dncDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, dncDescription: e.target.value }))}
                    placeholder="Reason for DNC (e.g., requested not to be contacted, wrong number, etc.)"
                    rows={2}
                    className="ml-6"
                  />
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-dnd"
                    checked={formData.dnd}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dnd: !!checked }))}
                  />
                  <label htmlFor="edit-dnd" className="text-sm font-medium">
                    DND - Do Not Disturb
                  </label>
                </div>
                {formData.dnd && (
                  <Textarea
                    value={formData.dndDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, dndDescription: e.target.value }))}
                    placeholder="Reason for DND (e.g., busy period, requested quiet time, etc.)"
                    rows={2}
                    className="ml-6"
                  />
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-dp"
                    checked={formData.dp}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dp: !!checked }))}
                  />
                  <label htmlFor="edit-dp" className="text-sm font-medium">
                    DP - Dead Prospect
                  </label>
                </div>
                {formData.dp && (
                  <Textarea
                    value={formData.dpDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, dpDescription: e.target.value }))}
                    placeholder="Reason for DP (e.g., business closed, no longer interested, etc.)"
                    rows={2}
                    className="ml-6"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                setEditingProspect(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingProspect) {
                    handleUpdateProspect(editingProspect.id);
                  }
                }}
              >
                Update Prospect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insert Analysis Dialog */}
      <Dialog open={showInsertAnalysisDialog} onOpenChange={setShowInsertAnalysisDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Insert AI Analysis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manualAnalysis">Analysis Text</Label>
              <Textarea
                id="manualAnalysis"
                value={manualAnalysisText}
                onChange={(e) => setManualAnalysisText(e.target.value)}
                placeholder="Paste or type your AI analysis here..."
                rows={15}
                className="w-full mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInsertAnalysisDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setCallLogData(prev => ({ ...prev, autoAnalysisSummary: manualAnalysisText }));
                  setShowInsertAnalysisDialog(false);
                  setManualAnalysisText('');
                }}
              >
                Insert Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
