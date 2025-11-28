'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CallCenter } from '@/lib/types/external-crm';
import { CallCenterDetailModal } from './call-center-detail-modal';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';
import { formatDuration, parseDuration } from '@/lib/utils/duration';
import {
  Building,
  MapPin,
  Trash2,
  Tag,
  Edit,
  Download,
  Archive,
  Copy,
  Merge,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Phone,
  Eye,
  Plus,
  Calendar,
  MessageSquare
} from 'lucide-react';

interface CallCentersListProps {
  callCenters: CallCenter[];
  onEdit: (callCenter: CallCenter) => void;
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchTag: (ids: string[], tag: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
  onViewDuplicates?: () => void;
}

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800 border-blue-200',
  'Contacted': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Qualified': 'bg-purple-100 text-purple-800 border-purple-200',
  'Proposal': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Negotiation': 'bg-orange-100 text-orange-800 border-orange-200',
  'Closed-Won': 'bg-green-100 text-green-800 border-green-200',
  'Closed-Lost': 'bg-red-100 text-red-800 border-red-200',
  'On-Hold': 'bg-gray-100 text-gray-800 border-gray-200'
};

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

export function CallCentersList({
  callCenters,
  onEdit,
  onDelete,
  onBatchDelete,
  onBatchTag,
  hasMore = false,
  onLoadMore,
  totalCount = 0,
  onViewDuplicates
}: CallCentersListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('quick');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    city: '',
    status: '',
    businessType: '',
    minPositions: '',
    maxPositions: '',
    tags: '',
    minValue: '',
    maxValue: '',
    dateFrom: '',
    dateTo: ''
  });
  const [sort, setSort] = useState({
    field: 'createdAt' as keyof CallCenter,
    direction: 'desc' as 'asc' | 'desc'
  });
  const [potentialDuplicates, setPotentialDuplicates] = useState<{[key: string]: CallCenter[]}>({});
  const [selectedCallCenter, setSelectedCallCenter] = useState<CallCenter | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCallLogDialog, setShowCallLogDialog] = useState(false);
  const [currentCallCenter, setCurrentCallCenter] = useState<CallCenter | null>(null);
  const [callLogData, setCallLogData] = useState({
    outcome: '',
    duration: 0,
    notes: '',
    followUp: 'none',
    disposition: '',
    callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
    callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
    phone_used: '', // Track which phone number was used
    durationInput: '', // Raw input value for duration field
    callbackDate: '',
    meetingDate: '',
    meetingLocation: '',
    competitorName: '',
  });
  const [isSavingCallLog, setIsSavingCallLog] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CallCenter[] | null>(null);
  const [isServerSearching, setIsServerSearching] = useState(false);
  const [dispositions, setDispositions] = useState<{[callCenterId: string]: string | null}>({});

  // Debounced search - client-side for empty search, server-side for actual search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearch = useCallback(async (searchTerm: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        // Server-side search for meaningful terms
        setIsServerSearching(true);
        setIsSearching(true);
        try {
          const response = await fetch(`/api/external-crm/search?q=${encodeURIComponent(searchTerm.trim())}&limit=50`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setSearchResults(data.data.results);
            }
          }
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setIsServerSearching(false);
          setIsSearching(false);
        }
      } else if (searchTerm.trim().length === 0) {
        // Clear search results for empty search
        setSearchResults(null);
        setIsSearching(false);
      } else {
        // Client-side feedback for short terms
        setIsSearching(true);
        setTimeout(() => {
          setIsSearching(false);
        }, 300);
      }
    }, 300); // 300ms delay
  }, []);

  const handleCallCenterClick = (callCenter: CallCenter) => {
    setSelectedCallCenter(callCenter);
    setShowDetailModal(true);
  };

  const handleUpdateCallCenter = (updatedCallCenter: CallCenter) => {
    onEdit(updatedCallCenter);
    setShowDetailModal(false);
    setSelectedCallCenter(null);
  };

  const handleDeleteCallCenterFromModal = (id: string) => {
    onDelete(id);
    setShowDetailModal(false);
    setSelectedCallCenter(null);
  };

  const handleOpenCallLog = (callCenter: CallCenter) => {
    setCurrentCallCenter(callCenter);
    setCallLogData({
      outcome: '',
      duration: 0,
      notes: '',
      followUp: 'none',
      disposition: '',
      callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
      callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
      phone_used: '', // Track which phone number was used
      durationInput: '', // Raw input value for duration field
      callbackDate: '',
      meetingDate: '',
      meetingLocation: '',
      competitorName: '',
    });
    setSaveError('');
    setIsSavingCallLog(false);
    setShowCallLogDialog(true);
  };

  const handleSaveCallLog = async () => {
    if (!currentCallCenter || !callLogData.outcome || !callLogData.notes) return;

    setIsSavingCallLog(true);
    setSaveError('');

    try {
      // Helper function to convert mm/dd/yyyy and time to ISO string, or use now if empty
      const getCallDateTimeISO = (callDateStr?: string, callTimeStr?: string): string => {
        console.log('🔍 [DEBUG] getCallDateTimeISO called with:', { callDateStr, callTimeStr });

        if (!callDateStr || callDateStr.trim() === '') {
          console.log('🔍 [DEBUG] No date provided, using now');
          return new Date().toISOString();
        }

        // Parse mm/dd/yyyy format
        const parts = callDateStr.split('/');
        if (parts.length !== 3) {
          console.warn('Invalid date format, using today:', callDateStr);
          return new Date().toISOString();
        }

        const [month, day, year] = parts.map(p => parseInt(p, 10));
        if (isNaN(month) || isNaN(day) || isNaN(year)) {
          console.warn('Invalid date numbers, using today:', callDateStr);
          return new Date().toISOString();
        }

        // Create date object at midnight local time
        const date = new Date(year, month - 1, day); // month is 0-indexed
        if (isNaN(date.getTime())) {
          console.warn('Invalid date, using today:', callDateStr);
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

      // Save call log
      const response = await fetch('/api/external-crm/daily-calls/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: currentCallCenter.id.toString(),
          callLog: {
            date: getCallDateTimeISO(callLogData.callDate, callLogData.callTime),
            outcome: callLogData.outcome,
            duration: callLogData.duration,
            notes: callLogData.notes,
            followUp: callLogData.followUp,
            disposition: callLogData.disposition,
            phone_used: callLogData.phone_used,
            callTime: callLogData.callTime,
            callbackDate: callLogData.callbackDate,
            meetingDate: callLogData.meetingDate,
            meetingLocation: callLogData.meetingLocation,
            competitorName: callLogData.competitorName,
          },
        }),
      });

      if (response.ok) {
        // Update dispositions state with the new disposition
        setDispositions(prev => ({
          ...prev,
          [currentCallCenter.id.toString()]: callLogData.disposition || null
        }));

        // Reset form state and close dialog
        setCallLogData({
          outcome: '',
          duration: 0,
          notes: '',
          followUp: 'none',
          disposition: '',
          callDate: new Date().toLocaleDateString('en-US'), // Default to today in mm/dd/yyyy format
          callTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to current time
          phone_used: '', // Track which phone number was used
          durationInput: '', // Raw input value for duration field
          callbackDate: '',
          meetingDate: '',
          meetingLocation: '',
          competitorName: '',
        });
        setSaveError('');
        setIsSavingCallLog(false);
        setShowCallLogDialog(false);
        setCurrentCallCenter(null);
      } else {
        const errorData = await response.json();
        console.error('❌ [CALL-LOG] Failed to save call log:', errorData);
        setSaveError(errorData.error || 'Failed to save call log. Please try again.');
      }
    } catch (error) {
      console.error('❌ [CALL-LOG] Error saving call log:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save call log. Please try again.');
    } finally {
      setIsSavingCallLog(false);
    }
  };


  // Use search results if available, otherwise use regular filtering
  const baseCallCenters = searchResults !== null ? searchResults : callCenters;

  const filteredCallCenters = baseCallCenters.filter(callCenter => {
    // Skip search filtering if we already have search results from server
    if (searchResults !== null) {
      // Only apply other filters (country, status, etc.) to search results
      const matchesCountry = !filters.country || filters.country === 'all' || callCenter.country === filters.country;
      const matchesCity = !filters.city || filters.city === 'all' || callCenter.city === filters.city;
      const matchesStatus = !filters.status || filters.status === 'all' || callCenter.status === filters.status;
      const matchesBusinessType = !filters.businessType || filters.businessType === 'all' || callCenter.businessType === filters.businessType;

      // Enhanced filters
      const matchesMinPositions = !filters.minPositions || callCenter.positions >= parseInt(filters.minPositions);
      const matchesMaxPositions = !filters.maxPositions || callCenter.positions <= parseInt(filters.maxPositions);
      const matchesMinValue = !filters.minValue || (callCenter.value || 0) >= parseInt(filters.minValue);
      const matchesMaxValue = !filters.maxValue || (callCenter.value || 0) <= parseInt(filters.maxValue);

      // Tag filtering
      const matchesTags = !filters.tags ||
        callCenter.tags?.some(tag => tag.toLowerCase().includes(filters.tags.toLowerCase()));

      // Date range filtering
      const matchesDateFrom = !filters.dateFrom ||
        new Date(callCenter.createdAt) >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo ||
        new Date(callCenter.createdAt) <= new Date(filters.dateTo);

      return matchesCountry && matchesCity && matchesStatus && matchesBusinessType &&
             matchesMinPositions && matchesMaxPositions && matchesMinValue &&
             matchesMaxValue && matchesTags && matchesDateFrom && matchesDateTo;
    }

    // Original client-side filtering for non-search cases
    const searchTerm = filters.search.toLowerCase();
    const matchesSearch = !filters.search ||
      callCenter.name.toLowerCase().includes(searchTerm) ||
      callCenter.city.toLowerCase().includes(searchTerm) ||
      callCenter.country.toLowerCase().includes(searchTerm) ||
      (callCenter.email && callCenter.email.toLowerCase().includes(searchTerm)) ||
      (callCenter.notes && typeof callCenter.notes === 'string' && callCenter.notes.toLowerCase().includes(searchTerm)) ||
      callCenter.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      callCenter.phones?.some(phone => phone.includes(searchTerm));

    const matchesCountry = !filters.country || filters.country === 'all' || callCenter.country === filters.country;
    const matchesCity = !filters.city || filters.city === 'all' || callCenter.city === filters.city;
    const matchesStatus = !filters.status || filters.status === 'all' || callCenter.status === filters.status;
    const matchesBusinessType = !filters.businessType || filters.businessType === 'all' || callCenter.businessType === filters.businessType;

    // Enhanced filters
    const matchesMinPositions = !filters.minPositions || callCenter.positions >= parseInt(filters.minPositions);
    const matchesMaxPositions = !filters.maxPositions || callCenter.positions <= parseInt(filters.maxPositions);
    const matchesMinValue = !filters.minValue || (callCenter.value || 0) >= parseInt(filters.minValue);
    const matchesMaxValue = !filters.maxValue || (callCenter.value || 0) <= parseInt(filters.maxValue);

    // Tag filtering
    const matchesTags = !filters.tags ||
      callCenter.tags?.some(tag => tag.toLowerCase().includes(filters.tags.toLowerCase()));

    // Date range filtering
    const matchesDateFrom = !filters.dateFrom ||
      new Date(callCenter.createdAt) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo ||
      new Date(callCenter.createdAt) <= new Date(filters.dateTo);

    return matchesSearch && matchesCountry && matchesCity && matchesStatus && matchesBusinessType &&
           matchesMinPositions && matchesMaxPositions && matchesMinValue &&
           matchesMaxValue && matchesTags && matchesDateFrom && matchesDateTo;
  });

  const sortedCallCenters = [...filteredCallCenters].sort((a, b) => {
    const aValue = a[sort.field];
    const bValue = b[sort.field];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sort.direction === 'asc' ? -1 : 1;
    if (bValue == null) return sort.direction === 'asc' ? 1 : -1;

    if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? sortedCallCenters.map(cc => cc.id.toString()) : []);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length > 0) {
      onBatchDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBatchTag = (tag: string) => {
    if (selectedIds.length > 0 && tag) {
      onBatchTag(selectedIds, tag);
      setSelectedIds([]);
    }
  };

  const handleBulkExport = (format: 'csv' | 'json' | 'excel' | 'pdf') => {
    // Get selected call centers data
    const selectedCallCenters = callCenters.filter(cc =>
      selectedIds.includes(cc.id.toString())
    );

    if (selectedCallCenters.length === 0) {
      alert('No call centers selected for export');
      return;
    }

    // Export logic based on format
    switch (format) {
      case 'csv':
        exportToCSV(selectedCallCenters);
        break;
      case 'json':
        exportToJSON(selectedCallCenters);
        break;
      case 'excel':
        exportToExcel(selectedCallCenters);
        break;
      case 'pdf':
        exportToPDF(selectedCallCenters);
        break;
    }

    setSelectedIds([]);
  };

  const exportToCSV = (data: CallCenter[]) => {
    const headers = ['Name', 'Country', 'City', 'Positions', 'Status', 'Phones', 'Emails', 'Website', 'Value', 'Currency'];
    const csvContent = [
      headers.join(','),
      ...data.map(cc => [
        cc.name,
        cc.country,
        cc.city,
        cc.positions,
        cc.status,
        `"${cc.phones.join('; ')}"`,
        `"${cc.emails.join('; ')}"`,
        cc.website,
        cc.value,
        cc.currency
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'call-centers-export.csv', 'text/csv');
  };

  const exportToJSON = (data: CallCenter[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'call-centers-export.json', 'application/json');
  };

  const exportToExcel = (data: CallCenter[]) => {
    // For demo purposes, export as CSV with Excel-compatible format
    const headers = ['Name', 'Country', 'City', 'Positions', 'Status', 'Phones', 'Emails', 'Website', 'Value', 'Currency', 'Notes'];
    const csvContent = [
      headers.join('\t'), // Use tabs for Excel compatibility
      ...data.map(cc => [
        cc.name,
        cc.country,
        cc.city,
        cc.positions,
        cc.status,
        cc.phones.join('; '),
        cc.emails.join('; '),
        cc.website,
        cc.value,
        cc.currency,
        cc.notes
      ].join('\t'))
    ].join('\n');

    downloadFile(csvContent, 'call-centers-export.xls', 'application/vnd.ms-excel');
  };

  const exportToPDF = (data: CallCenter[]) => {
    // For demo purposes, create a simple text-based PDF
    const content = `Call Centers Export Report
Generated: ${new Date().toLocaleString()}

Total Records: ${data.length}

${data.map((cc, index) => `
${index + 1}. ${cc.name}
   Location: ${cc.city}, ${cc.country}
   Status: ${cc.status}
   Positions: ${cc.positions}
   Value: ${cc.value} ${cc.currency}
   Contact: ${cc.phones[0] || 'N/A'}
   ${cc.notes ? `Notes: ${cc.notes}` : ''}
`).join('\n')}`;

    downloadFile(content, 'call-centers-report.txt', 'text/plain');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const uniqueCountries = [...new Set(callCenters.map(cc => cc.country).filter(country => country && country.trim()))].sort();
  const uniqueCities = [...new Set(callCenters.map(cc => cc.city).filter(city => city && city.trim()))].sort();

  // Fetch dispositions for all call centers
  useEffect(() => {
    const fetchDispositions = async () => {
      console.log('🔍 [DISPOSITIONS] Starting to fetch dispositions for', callCenters.length, 'call centers');
      const newDispositions: {[callCenterId: string]: string | null} = {};

      // For all call centers, fetch their call history
      for (const callCenter of callCenters) {
        try {
          console.log(`🔄 [DISPOSITIONS] Fetching call history for ${callCenter.name} (${callCenter.id})`);
          const callHistory = await ExternalCRMSubcollectionsService.getCallHistory(callCenter.id.toString());
          const disposition = callHistory.length > 0 ? (callHistory[0].disposition || null) : null;
          newDispositions[callCenter.id.toString()] = disposition;
          console.log(`📞 [DISPOSITIONS] Call center ${callCenter.name}: ${callHistory.length} calls, latest disposition: ${disposition}`);
        } catch (error) {
          console.error(`❌ [DISPOSITIONS] Error fetching call history for call center ${callCenter.id}:`, error);
          newDispositions[callCenter.id.toString()] = null;
        }
      }

      console.log('✅ [DISPOSITIONS] Finished fetching dispositions:', Object.keys(newDispositions).filter(id => newDispositions[id] !== null).length, 'with dispositions,', Object.keys(newDispositions).filter(id => newDispositions[id] === null).length, 'without');
      setDispositions(newDispositions);
    };

    if (callCenters.length > 0) {
      fetchDispositions();
    }
  }, [callCenters]);

  // Function to refresh disposition for a specific call center
  const refreshDispositionForCallCenter = async (callCenterId: string) => {
    try {
      console.log(`🔄 [DISPOSITIONS] Refreshing disposition for call center ${callCenterId}`);
      const callHistory = await ExternalCRMSubcollectionsService.getCallHistory(callCenterId);
      const disposition = callHistory.length > 0 ? (callHistory[0].disposition || null) : null;
      setDispositions(prev => ({
        ...prev,
        [callCenterId]: disposition
      }));
      console.log(`✅ [DISPOSITIONS] Refreshed disposition for ${callCenterId}: ${disposition}`);
    } catch (error) {
      console.error(`❌ [DISPOSITIONS] Error refreshing disposition for call center ${callCenterId}:`, error);
    }
  };

  // Helper function to get the latest disposition for a call center
  const getLatestDisposition = (callCenter: CallCenter): string | null => {
    return dispositions[callCenter.id.toString()] || null;
  };

  // Helper function to get disposition color
  const getDispositionColor = (disposition: string | null): string => {
    if (!disposition || !DISPOSITION_COLORS[disposition as keyof typeof DISPOSITION_COLORS]) {
      return '#FFFFFF'; // Default white
    }
    return DISPOSITION_COLORS[disposition as keyof typeof DISPOSITION_COLORS];
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
      'noanswer': 'NOANSWER'
    };

    return names[disposition] || disposition.toUpperCase();
  };

  // Check for potential duplicates for a call center
  const checkForDuplicates = async (callCenter: CallCenter) => {
    try {
      console.log(`🔍 [CALL-CENTERS-LIST] Checking for duplicates for: ${callCenter.name}`);

      const response = await fetch(`/api/external-crm/duplicates/individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callCenter)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.duplicates.length > 0) {
          setPotentialDuplicates(prev => ({
            ...prev,
            [callCenter.id]: data.duplicates
          }));
          console.log(`⚠️ [CALL-CENTERS-LIST] Found ${data.duplicates.length} potential duplicates for ${callCenter.name}`);
        }
      }
    } catch (error) {
      console.error(`❌ [CALL-CENTERS-LIST] Error checking duplicates for ${callCenter.name}:`, error);
    }
  };

  // Debug logging
  console.log(`🔍 CallCentersList Debug:`, {
    callCentersCount: callCenters.length,
    hasMore,
    onLoadMore: !!onLoadMore,
    totalCount,
    searchTerm: filters.search,
    isSearching
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex flex-col">
      {/* Enhanced Search and Filters Header */}
      <Card className="mb-8 flex-shrink-0 border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-slate-800">Call Center Directory</CardTitle>
                <p className="text-slate-600 mt-1">Search, filter, and manage your call centers with elegance</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-slate-100/50 backdrop-blur-sm rounded-xl p-1 border border-slate-200/50">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-lg"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="rounded-lg"
                >
                  <Building className="w-4 h-4 mr-2" />
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Global Search */}
          <div className="relative mb-8">
            <div className="relative">
              <Input
                placeholder="Search call centers by name, location, contact info, or tags..."
                value={filters.search}
                onChange={(e) => {
                  const newSearch = e.target.value;
                  setFilters(prev => ({ ...prev, search: newSearch }));
                  // Only trigger UI feedback for client-side filtering
                  debouncedSearch(newSearch);
                }}
                className="pl-16 pr-32 h-14 text-lg border-2 border-slate-200/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 rounded-2xl shadow-lg bg-white/50 backdrop-blur-sm transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-base">🔍</span>
                </div>
              </div>
              {(filters.search || searchResults) && !isSearching && !isServerSearching && (
                <div className="absolute inset-y-0 right-0 pr-24 flex items-center">
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, search: '' }));
                      setSearchResults(null);
                      setIsSearching(false);
                      setIsServerSearching(false);
                    }}
                    className="w-8 h-8 text-slate-400 hover:text-slate-600 transition-colors mr-3 flex items-center justify-center hover:bg-slate-100 rounded-full"
                  >
                    ✕
                  </button>
                </div>
              )}
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-24 flex items-center">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              )}
              <div className="absolute inset-y-0 right-0 pr-6 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="h-11 px-4 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-xl font-medium"
                >
                  <span className="text-sm mr-2">Filters</span>
                  {showAdvancedFilters ? '▲' : '▼'}
                </Button>
              </div>
            </div>

            {/* Enhanced Search hint */}
            <div className="text-center mt-4">
              <div className="inline-flex items-center px-4 py-2 bg-slate-100/50 backdrop-blur-sm rounded-xl border border-slate-200/50">
                <span className="text-slate-600 text-sm">💡</span>
                <span className="text-sm text-slate-600 ml-2">
                  <span className="font-semibold text-slate-700">Pro tip:</span> Use keywords like "Morocco", "Casablanca", or specific company names
                </span>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="space-y-4 border-t border-gray-200 pt-6 animate-in slide-in-from-top-2 duration-300">
              {/* Primary Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}>
                    <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg">
                      <SelectValue placeholder="🌍 All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌍 All Countries</SelectItem>
                      {uniqueCountries.map(country => (
                        <SelectItem key={country} value={country}>📍 {country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
                    <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg">
                      <SelectValue placeholder="🏙️ All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🏙️ All Cities</SelectItem>
                      {uniqueCities.map(city => (
                        <SelectItem key={city} value={city}>🏢 {city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg">
                      <SelectValue placeholder="📊 All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📊 All Statuses</SelectItem>
                      <SelectItem value="New">🆕 New</SelectItem>
                      <SelectItem value="Contacted">📞 Contacted</SelectItem>
                      <SelectItem value="Qualified">✅ Qualified</SelectItem>
                      <SelectItem value="Proposal">📋 Proposal</SelectItem>
                      <SelectItem value="Negotiation">🤝 Negotiation</SelectItem>
                      <SelectItem value="Closed-Won">🎉 Closed-Won</SelectItem>
                      <SelectItem value="Closed-Lost">❌ Closed-Lost</SelectItem>
                      <SelectItem value="On-Hold">⏸️ On-Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Select value={filters.businessType} onValueChange={(value) => setFilters(prev => ({ ...prev, businessType: value }))}>
                    <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg">
                      <SelectValue placeholder="🏢 All Business Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🏢 All Business Types</SelectItem>
                      <SelectItem value="call-center">🏢 Call Center</SelectItem>
                      <SelectItem value="voip-reseller">📞 VoIP Reseller</SelectItem>
                      <SelectItem value="data-vendor">📄 Data Vendor (Files)</SelectItem>
                      <SelectItem value="workspace-rental">🏢 Workspace Rental</SelectItem>
                      <SelectItem value="individual">👤 Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Input
                    placeholder="🏷️ Filter by tags..."
                    value={filters.tags}
                    onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                    className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Input
                    placeholder="👥 Min positions"
                    type="number"
                    value={filters.minPositions}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPositions: e.target.value }))}
                    className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">👥</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    placeholder="👥 Max positions"
                    type="number"
                    value={filters.maxPositions}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPositions: e.target.value }))}
                    className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">👥</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    placeholder="💰 Min value ($)"
                    type="number"
                    value={filters.minValue}
                    onChange={(e) => setFilters(prev => ({ ...prev, minValue: e.target.value }))}
                    className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">💰</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    placeholder="💰 Max value ($)"
                    type="number"
                    value={filters.maxValue}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxValue: e.target.value }))}
                    className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">💰</span>
                  </div>
                </div>
              </div>

              {/* Date Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    placeholder="📅 Created from date"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">📅</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    placeholder="📅 Created to date"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">📅</span>
                  </div>
                </div>
              </div>
            </div>
          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({
                    search: '',
                    country: '',
                    city: '',
                    status: '',
                    businessType: '',
                    minPositions: '',
                    maxPositions: '',
                    tags: '',
                    minValue: '',
                    maxValue: '',
                    dateFrom: '',
                    dateTo: ''
                  });
                  setSearchResults(null);
                  setIsSearching(false);
                  setIsServerSearching(false);
                }}
                className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Clear All Filters
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="font-medium text-gray-900">{filteredCallCenters.length}</span>
                <span>of</span>
                <span className="font-medium text-gray-900">{callCenters.length}</span>
                <span>call centers</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {filteredCallCenters.length > 0 && (
                <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
                  <span className="font-medium text-blue-700">
                    {filteredCallCenters.length} result{filteredCallCenters.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Live data</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Bulk Actions */}
       {selectedIds.length > 0 && (
         <Card key="bulk-actions" className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {selectedIds.length} call center{selectedIds.length !== 1 ? 's' : ''} selected
                </Badge>
                <span className="text-sm text-gray-600">
                  Choose an action to apply to all selected items
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                Clear Selection
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="quick">Quick Actions</TabsTrigger>
                <TabsTrigger value="edit">Bulk Edit</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${selectedIds.length} call centers? This action cannot be undone.`)) {
                        handleBatchDelete();
                      }
                    }}
                    className="flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Input placeholder="Tag name" className="w-32" id="batch-tag" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const tagInput = document.getElementById('batch-tag') as HTMLInputElement;
                        if (tagInput.value) {
                          handleBatchTag(tagInput.value);
                          tagInput.value = '';
                        }
                      }}
                    >
                      <Tag className="w-4 h-4 mr-2" />
                      Add Tag
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('edit')}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Selected
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('export')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="edit" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bulk-status">Update Status</Label>
                    <Select onValueChange={(value) => {
                      if (confirm(`Update status of ${selectedIds.length} call centers to "${value}"?`)) {
                        // Handle bulk status update
                        console.log('Bulk status update:', value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
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
                  </div>

                  <div>
                    <Label htmlFor="bulk-country">Update Country</Label>
                    <Select onValueChange={(value) => {
                      if (confirm(`Update country of ${selectedIds.length} call centers to "${value}"?`)) {
                        console.log('Bulk country update:', value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
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
                  </div>

                  <div>
                    <Label htmlFor="bulk-priority">Set Priority</Label>
                    <Select onValueChange={(value) => {
                      if (confirm(`Set priority for ${selectedIds.length} call centers to "${value}"?`)) {
                        console.log('Bulk priority update:', value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setActiveTab('quick')}>
                    Back to Quick Actions
                  </Button>
                  <Button onClick={() => alert('Bulk edit applied to selected call centers')}>
                    Apply Changes
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkExport('csv')}
                    className="flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as CSV
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkExport('json')}
                    className="flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as JSON
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkExport('pdf')}
                    className="flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as PDF Report
                  </Button>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Export includes: Basic info, contact details, status, value, and interaction history</p>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Archive ${selectedIds.length} call centers?`)) {
                        console.log('Bulk archive');
                      }
                    }}
                    className="flex items-center"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Selected
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Duplicate ${selectedIds.length} call centers?`)) {
                        console.log('Bulk duplicate');
                      }
                    }}
                    className="flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Selected
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Merge ${selectedIds.length} call centers into one?`)) {
                        console.log('Bulk merge');
                      }
                    }}
                    className="flex items-center"
                  >
                    <Merge className="w-4 h-4 mr-2" />
                    Merge Selected
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Reset status of ${selectedIds.length} call centers to "New"?`)) {
                        console.log('Bulk status reset');
                      }
                    }}
                    className="flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Status
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Call Centers Display */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle>
                {searchResults !== null ? 'Search Results' : 'Call Centers'} ({sortedCallCenters.length})
              </CardTitle>
              {searchResults !== null ? (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Search: "{filters.search}" ({filteredCallCenters.length} results)
                </Badge>
              ) : filteredCallCenters.length !== callCenters.length ? (
                <Badge variant="secondary">
                  Filtered: {filteredCallCenters.length} of {callCenters.length}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center space-x-2">
              {onViewDuplicates && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewDuplicates}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Manage Duplicates
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={`${sort.field}-${sort.direction}`}
                onValueChange={(value) => {
                  const [field, direction] = value.split('-');
                  setSort({ field: field as keyof CallCenter, direction: direction as 'asc' | 'desc' });
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="country-asc">Country (A-Z)</SelectItem>
                  <SelectItem value="country-desc">Country (Z-A)</SelectItem>
                  <SelectItem value="city-asc">City (A-Z)</SelectItem>
                  <SelectItem value="city-desc">City (Z-A)</SelectItem>
                  <SelectItem value="positions-asc">Positions (Low-High)</SelectItem>
                  <SelectItem value="positions-desc">Positions (High-Low)</SelectItem>
                  <SelectItem value="value-desc">Value (High-Low)</SelectItem>
                  <SelectItem value="value-asc">Value (Low-High)</SelectItem>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-6" style={{ height: '100%', minHeight: '400px' }}>
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching call centers...</p>
              </div>
            </div>
          ) : sortedCallCenters.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Building className="w-12 h-12 text-blue-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-sm">🔍</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No call centers found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                {callCenters.length === 0
                  ? "Start building your call center database by adding your first entry or importing existing data."
                  : "We couldn't find any call centers matching your current search criteria. Try adjusting your filters or search terms."
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {Object.keys(filters).some(key => filters[key as keyof typeof filters]) && (
                  <Button
                    variant="outline"
                    onClick={() => setFilters({
                      search: '',
                      country: '',
                      city: '',
                      status: '',
                      businessType: '',
                      minPositions: '',
                      maxPositions: '',
                      tags: '',
                      minValue: '',
                      maxValue: '',
                      dateFrom: '',
                      dateTo: ''
                    })}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
                {callCenters.length === 0 && (
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Call Center
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Header with select all */}
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-6 border border-blue-100">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedIds.length === sortedCallCenters.length && sortedCallCenters.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-blue-300"
                  />
                  <div>
                    <span className="font-semibold text-gray-900">Select All Visible</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({selectedIds.length} selected)
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {sortedCallCenters.length} call centers displayed
                </div>
              </div>

              {/* Call Center Items */}
              {viewMode === 'list' ? (
                <div className="space-y-4">
                   {sortedCallCenters.map((callCenter, index) => {
                     const latestDisposition = getLatestDisposition(callCenter);
                     const cardColor = getDispositionColor(latestDisposition);
                     return (
                       <Card
                         key={`${callCenter.id}-${index}`}
                         className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
                         style={{ backgroundColor: cardColor }}
                       >
                         <CardContent className="p-6">
                         <div className="flex items-start justify-between">
                           <div className="flex-1 min-w-0">
                             {/* Header Section */}
                             <div className="flex items-start justify-between mb-3">
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-3 mb-2">
                                   <Checkbox
                                     checked={callCenter.id ? selectedIds.includes(callCenter.id.toString()) : false}
                                     onCheckedChange={(checked: boolean) => callCenter.id && handleSelect(callCenter.id.toString(), checked)}
                                   />
                                   <button
                                     className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer truncate"
                                     onClick={() => handleCallCenterClick(callCenter)}
                                   >
                                     {callCenter.name}
                                   </button>
                                   {potentialDuplicates[callCenter.id] && potentialDuplicates[callCenter.id].length > 0 && (
                                     <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                       <AlertTriangle className="w-3 h-3 mr-1" />
                                       {potentialDuplicates[callCenter.id].length} duplicate{potentialDuplicates[callCenter.id].length !== 1 ? 's' : ''}
                                     </Badge>
                                   )}
                                 </div>

                                 {/* Location */}
                                 <div className="flex items-center text-gray-600 mb-3">
                                   <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                   <span className="text-sm">{callCenter.city}, {callCenter.country}</span>
                                 </div>
                               </div>

                               {/* Status Badge */}
                               <div className="flex items-center gap-2">
                                 <Badge className={`${STATUS_COLORS[callCenter.status as keyof typeof STATUS_COLORS]} text-xs px-3 py-1`}>
                                   {callCenter.status}
                                 </Badge>
                                 {(() => {
                                   const latestDisposition = getLatestDisposition(callCenter);
                                   if (latestDisposition) {
                                     const color = getDispositionColor(latestDisposition);
                                     const displayName = getDispositionDisplayName(latestDisposition);
                                     return (
                                       <div
                                         className="inline-flex items-center px-2 py-1 text-xs font-medium text-white rounded-full border border-white/20 shadow-sm"
                                         style={{ backgroundColor: color }}
                                         title={`Latest disposition: ${displayName}`}
                                       >
                                         {displayName}
                                       </div>
                                     );
                                   }
                                   return null;
                                 })()}
                               </div>
                             </div>

                             {/* Main Content Grid */}
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                               {/* Key Metrics */}
                               <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                   <span className="text-sm font-medium text-gray-700">Positions</span>
                                   <span className="text-lg font-bold text-gray-900">{callCenter.positions}</span>
                                 </div>
                                 {callCenter.businessType && (
                                   <div className="flex items-center justify-between">
                                     <span className="text-sm font-medium text-gray-700">Type</span>
                                     <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                                       {callCenter.businessType === 'call-center' && '🏢 Call Center'}
                                       {callCenter.businessType === 'voip-reseller' && '📞 VoIP Reseller'}
                                       {callCenter.businessType === 'data-vendor' && '📄 Data Vendor'}
                                       {callCenter.businessType === 'workspace-rental' && '🏢 Workspace Rental'}
                                       {callCenter.businessType === 'individual' && '👤 Individual'}
                                     </Badge>
                                   </div>
                                 )}
                                 {callCenter.value && (
                                   <div className="flex items-center justify-between">
                                     <span className="text-sm font-medium text-gray-700">Value</span>
                                     <span className="text-lg font-bold text-green-600">
                                       ${callCenter.value.toLocaleString()} {callCenter.currency}
                                     </span>
                                   </div>
                                 )}
                               </div>

                               {/* Contact Information */}
                               <div className="space-y-2">
                                 {callCenter.phones.length > 0 && (
                                   <div>
                                     <span className="text-sm font-medium text-gray-700 block mb-1">Phone</span>
                                     <p className="text-sm font-mono text-gray-900">{callCenter.phones[0]}</p>
                                   </div>
                                 )}
                                 {callCenter.email && (
                                   <div>
                                     <span className="text-sm font-medium text-gray-700 block mb-1">Email</span>
                                     <p className="text-sm text-blue-600 truncate">{callCenter.email}</p>
                                   </div>
                                 )}
                               </div>

                               {/* Website */}
                               <div className="space-y-2">
                                 {callCenter.website && (
                                   <div>
                                     <span className="text-sm font-medium text-gray-700 block mb-1">Website</span>
                                     <a
                                       href={callCenter.website}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                     >
                                       {callCenter.website}
                                     </a>
                                   </div>
                                 )}
                               </div>
                             </div>

                             {/* Tags */}
                             {callCenter.tags && callCenter.tags.length > 0 && (
                               <div className="flex flex-wrap gap-2 mb-4">
                                 {callCenter.tags.slice(0, 4).map(tag => (
                                   <Badge key={tag} variant="secondary" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                                     {tag}
                                   </Badge>
                                 ))}
                                 {callCenter.tags.length > 4 && (
                                   <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600">
                                     +{callCenter.tags.length - 4} more
                                   </Badge>
                                 )}
                               </div>
                             )}

                             {/* Calling Destinations */}
                             {callCenter.destinations && callCenter.destinations.length > 0 && (
                               <div className="mb-4">
                                 <div className="text-sm font-medium text-gray-700 mb-2">🎯 Calling Destinations</div>
                                 <div className="flex flex-wrap gap-2">
                                   {callCenter.destinations.map((destination, index) => (
                                     <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                                       🌍 {destination}
                                     </Badge>
                                   ))}
                                 </div>
                               </div>
                             )}

                             {/* Action Buttons */}
                             <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                               <div className="flex items-center gap-2">
                                 {callCenter.phone_infos && callCenter.phone_infos.length > 0 && callCenter.phone_infos[0].is_mobile && callCenter.phone_infos[0].whatsapp_confidence >= 0.7 ? (
                                   <Button
                                     asChild
                                     size="sm"
                                     className="bg-green-600 hover:bg-green-700 text-white"
                                   >
                                     <a
                                       href={PhoneDetectionService.getWhatsAppLink(callCenter.phone_infos[0].phone_norm)}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                     >
                                       <Phone className="w-4 h-4 mr-2" />
                                       WhatsApp
                                     </a>
                                   </Button>
                                 ) : (
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     disabled
                                     className="text-gray-400"
                                   >
                                     <Phone className="w-4 h-4 mr-2" />
                                     WhatsApp
                                   </Button>
                                 )}
                                 <Button
                                   className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs"
                                   onClick={() => handleOpenCallLog(callCenter)}
                                 >
                                   <Phone className="w-4 h-4 mr-2" />
                                   Log Call
                                 </Button>
                               </div>

                               <div className="flex items-center gap-2">
                                 <Button variant="ghost" size="sm" onClick={() => onEdit(callCenter)} className="text-gray-600 hover:text-gray-900">
                                   <Edit className="w-4 h-4 mr-2" />
                                   Edit
                                 </Button>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => callCenter.id && onDelete(callCenter.id.toString())}
                                   className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               </div>
                             </div>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                     );
                   })}
                </div>
              ) : (
                /* Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {sortedCallCenters.map((callCenter, index) => {
                     const latestDisposition = getLatestDisposition(callCenter);
                     const cardColor = getDispositionColor(latestDisposition);
                     return (
                       <Card
                         key={`${callCenter.id}-${index}`}
                         className="hover:shadow-xl transition-all duration-300 border-0 shadow-md"
                         style={{ backgroundColor: cardColor }}
                       >
                         <CardContent className="p-6">
                         {/* Header with checkbox and status */}
                         <div className="flex items-start justify-between mb-4">
                           <Checkbox
                             checked={callCenter.id ? selectedIds.includes(callCenter.id.toString()) : false}
                             onCheckedChange={(checked: boolean) => callCenter.id && handleSelect(callCenter.id.toString(), checked)}
                             className="mt-1"
                           />
                           <div className="flex items-center gap-2 ml-auto">
                             <Badge className={`${STATUS_COLORS[callCenter.status as keyof typeof STATUS_COLORS]} text-xs px-3 py-1`}>
                               {callCenter.status}
                             </Badge>
                             {(() => {
                               const latestDisposition = getLatestDisposition(callCenter);
                               if (latestDisposition) {
                                 const color = getDispositionColor(latestDisposition);
                                 const displayName = getDispositionDisplayName(latestDisposition);
                                 return (
                                   <div
                                     className="inline-flex items-center px-2 py-1 text-xs font-medium text-white rounded-full border border-white/20 shadow-sm"
                                     style={{ backgroundColor: color }}
                                     title={`Latest disposition: ${displayName}`}
                                   >
                                     {displayName}
                                   </div>
                                 );
                               }
                               return null;
                             })()}
                           </div>
                         </div>

                         {/* Company Name */}
                         <div className="mb-4">
                           <button
                             className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-left w-full"
                             onClick={() => handleCallCenterClick(callCenter)}
                           >
                             {callCenter.name}
                           </button>
                           {potentialDuplicates[callCenter.id] && potentialDuplicates[callCenter.id].length > 0 && (
                             <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 mt-2">
                               <AlertTriangle className="w-3 h-3 mr-1" />
                               {potentialDuplicates[callCenter.id].length} duplicate{potentialDuplicates[callCenter.id].length !== 1 ? 's' : ''}
                             </Badge>
                           )}
                         </div>

                         {/* Location */}
                         <div className="flex items-center text-gray-600 mb-4">
                           <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                           <span className="text-sm">{callCenter.city}, {callCenter.country}</span>
                         </div>

                         {/* Key Metrics */}
                         <div className="grid grid-cols-2 gap-4 mb-4">
                           <div className="text-center p-3 bg-gray-50 rounded-lg">
                             <div className="text-2xl font-bold text-gray-900">{callCenter.positions}</div>
                             <div className="text-xs text-gray-600 uppercase tracking-wide">Positions</div>
                           </div>
                           {callCenter.businessType ? (
                             <div className="text-center p-3 bg-blue-50 rounded-lg">
                               <div className="text-sm font-bold text-blue-700">
                                 {callCenter.businessType === 'call-center' && '🏢 Call Center'}
                                 {callCenter.businessType === 'voip-reseller' && '📞 VoIP Reseller'}
                                 {callCenter.businessType === 'data-vendor' && '📄 Data Vendor'}
                                 {callCenter.businessType === 'workspace-rental' && '🏢 Workspace Rental'}
                                 {callCenter.businessType === 'individual' && '👤 Individual'}
                               </div>
                               <div className="text-xs text-blue-600 uppercase tracking-wide">Business Type</div>
                             </div>
                           ) : callCenter.value ? (
                             <div className="text-center p-3 bg-green-50 rounded-lg">
                               <div className="text-lg font-bold text-green-600">
                                 ${callCenter.value.toLocaleString()}
                               </div>
                               <div className="text-xs text-green-700 uppercase tracking-wide">
                                 {callCenter.currency}
                               </div>
                             </div>
                           ) : null}
                         </div>

                         {/* Contact Information */}
                         <div className="space-y-3 mb-4">
                           {callCenter.phones.length > 0 && (
                             <div className="flex items-center justify-between">
                               <div>
                                 <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                                 <div className="text-sm font-mono text-gray-900">{callCenter.phones[0]}</div>
                               </div>
                               {callCenter.phone_infos && callCenter.phone_infos.length > 0 && callCenter.phone_infos[0].is_mobile && callCenter.phone_infos[0].whatsapp_confidence >= 0.7 && (
                                 <Button
                                   asChild
                                   size="sm"
                                   className="bg-green-600 hover:bg-green-700 text-white"
                                 >
                                   <a
                                     href={PhoneDetectionService.getWhatsAppLink(callCenter.phone_infos[0].phone_norm)}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                   >
                                     <Phone className="w-4 h-4 mr-2" />
                                     WhatsApp
                                   </a>
                                 </Button>
                               )}
                             </div>
                           )}

                           {callCenter.email && (
                             <div>
                               <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</div>
                               <div className="text-sm text-blue-600 truncate">{callCenter.email}</div>
                             </div>
                           )}

                           {callCenter.website && (
                             <div>
                               <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Website</div>
                               <a
                                 href={callCenter.website}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                               >
                                 {callCenter.website}
                               </a>
                             </div>
                           )}
                         </div>

                         {/* Tags */}
                         {callCenter.tags && callCenter.tags.length > 0 && (
                           <div className="flex flex-wrap gap-2 mb-4">
                             {callCenter.tags.slice(0, 3).map(tag => (
                               <Badge key={tag} variant="secondary" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                                 {tag}
                               </Badge>
                             ))}
                             {callCenter.tags.length > 3 && (
                               <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600">
                                 +{callCenter.tags.length - 3}
                               </Badge>
                             )}
                           </div>
                         )}

                         {/* Calling Destinations */}
                         {callCenter.destinations && callCenter.destinations.length > 0 && (
                           <div className="mb-4">
                             <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">🎯 Calling Destinations</div>
                             <div className="flex flex-wrap gap-2">
                               {callCenter.destinations.map((destination, index) => (
                                 <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                                   🌍 {destination}
                                 </Badge>
                               ))}
                             </div>
                           </div>
                         )}


                         {/* Action Buttons */}
                         <div className="flex gap-2 pt-4 border-t border-gray-100">
                           <Button
                             className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md h-8 rounded-lg px-4 py-1.5 text-xs flex-1"
                             onClick={() => handleOpenCallLog(callCenter)}
                           >
                             <Phone className="w-4 h-4 mr-2" />
                             Log Call
                           </Button>
                           <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(callCenter)}>
                             <Edit className="w-4 h-4 mr-2" />
                             Edit
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => callCenter.id && onDelete(callCenter.id.toString())}
                             className="text-red-600 hover:text-red-700 hover:bg-red-50"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </CardContent>
                     </Card>
                     );
                   })}
                </div>
              )}
            </>
          )}

          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={onLoadMore}
                disabled={isSearching}
                className="px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More Call Centers
                    <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-sm">
                      {callCenters.length} of {totalCount}
                    </span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Show message when all records are loaded */}
          {!hasMore && totalCount > 20 && (
            <div className="text-center mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
              <div className="text-green-800">
                <div className="text-2xl mb-2">🎉</div>
                <p className="text-lg font-semibold">
                  All {totalCount} call centers loaded!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You've reached the end of the list
                </p>
              </div>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Call Center Detail Modal */}
      <CallCenterDetailModal
        callCenter={selectedCallCenter}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCallCenter(null);
        }}
        onCallCenterUpdate={handleUpdateCallCenter}
        onCallLogUpdate={refreshDispositionForCallCenter}
        onSummaryUpdate={async (callCenterId: string, summary: string) => {
          // Handle summary update separately - call API to update just the summary
          try {
            const response = await fetch(`/api/external-crm/call-centers/${callCenterId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                summary: summary.trim(),
                updatedAt: new Date().toISOString()
              })
            });

            if (response.ok) {
              // Update local state
              const updatedCallCenter = callCenters.find(cc => cc.id === callCenterId);
              if (updatedCallCenter) {
                const updated = { ...updatedCallCenter, summary: summary.trim() };
                onEdit(updated);
              }
              console.log('✅ [SUMMARY] Summary updated successfully');
            } else {
              console.error('❌ [SUMMARY] Failed to update summary');
              alert('Failed to save summary');
            }
          } catch (error) {
            console.error('❌ [SUMMARY] Error updating summary:', error);
            alert('Error saving summary');
          }
        }}
        onDelete={handleDeleteCallCenterFromModal}
      />

      {/* Call Log Dialog */}
      <Dialog open={showCallLogDialog} onOpenChange={setShowCallLogDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Call - {currentCallCenter?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Call History Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Call History (0)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No previous calls logged</p>
                </div>
              </CardContent>
            </Card>

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

            {/* Phone Number Selection */}
            {currentCallCenter && currentCallCenter.phones && currentCallCenter.phones.length > 0 && (
              <div>
                <Label htmlFor="phone_used">Phone Number Called *</Label>
                <Select value={callLogData.phone_used} onValueChange={(value) =>
                  setCallLogData(prev => ({ ...prev, phone_used: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select phone number that was called" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCallCenter.phones.map((phone, index) => (
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

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration (mm:ss format)</Label>
              <Input
                id="duration"
                type="text"
                value={callLogData.durationInput || (callLogData.duration ? formatDuration(callLogData.duration) : '')}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setCallLogData(prev => ({ ...prev, durationInput: inputValue }));
                }}
                onBlur={(e) => {
                  // On blur, parse the input and update duration
                  const inputValue = callLogData.durationInput;
                  if (inputValue && inputValue !== '') {
                    const seconds = parseDuration(inputValue);
                    setCallLogData(prev => ({
                      ...prev,
                      duration: seconds,
                      durationInput: seconds > 0 ? formatDuration(seconds) : ''
                    }));
                  } else {
                    setCallLogData(prev => ({
                      ...prev,
                      duration: 0,
                      durationInput: ''
                    }));
                  }
                }}
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

            {/* Error Message */}
            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <div className="text-red-600">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  </div>
                  <p className="text-sm text-red-700">{saveError}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCallLogDialog(false);
                  setSaveError('');
                }}
                disabled={isSavingCallLog}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCallLog}
                disabled={
                  !callLogData.outcome ||
                  !callLogData.notes ||
                  (currentCallCenter?.phones && currentCallCenter.phones.length > 0 && !callLogData.phone_used) ||
                  (callLogData.outcome === 'answered' && !callLogData.disposition) ||
                  isSavingCallLog
                }
              >
                {isSavingCallLog ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Call Log'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
