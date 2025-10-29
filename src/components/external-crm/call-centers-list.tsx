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
  Calendar
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
  onSearch?: (searchTerm: string) => void;
  onSearchComplete?: () => void;
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

export function CallCentersList({
  callCenters,
  onEdit,
  onDelete,
  onBatchDelete,
  onBatchTag,
  hasMore = false,
  onLoadMore,
  totalCount = 0,
  onViewDuplicates,
  onSearch,
  onSearchComplete
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
    steps: [] as Array<{ title: string; description: string; priority: string }>,
    stepDate: new Date().toISOString().split('T')[0],
  });
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      if (onSearch) {
        await onSearch(searchTerm);
      }
      setIsSearching(false);
      if (onSearchComplete) {
        onSearchComplete();
      }
    }, 300); // 300ms delay
  }, [onSearch, onSearchComplete]);

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
    onDelete(parseInt(id));
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
      steps: [],
      stepDate: new Date().toISOString().split('T')[0],
    });
    setShowCallLogDialog(true);
  };

  const handleSaveCallLog = async () => {
    if (!currentCallCenter || !callLogData.outcome || !callLogData.notes) return;

    try {
      // Save call log
      const response = await fetch('/api/external-crm/daily-calls/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: currentCallCenter.id.toString(),
          callLog: {
            date: new Date().toISOString(),
            outcome: callLogData.outcome,
            duration: callLogData.duration,
            notes: callLogData.notes,
            followUp: callLogData.followUp,
          },
        }),
      });

      if (response.ok) {
        // Create steps in calendar if any were added
        if (callLogData.steps.length > 0) {
          for (const step of callLogData.steps) {
            try {
              const stepResponse = await fetch('/api/external-crm/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: step.title,
                  description: step.description,
                  date: callLogData.stepDate,
                  startTime: '09:00',
                  endTime: '10:00',
                  type: 'call',
                  callCenterId: currentCallCenter.id.toString(),
                  priority: step.priority || 'medium',
                  status: 'scheduled',
                  completed: false,
                  notes: `Created from call log: ${callLogData.notes}`,
                  tags: ['step', 'call-log'],
                  attendees: [],
                  reminder: {
                    enabled: true,
                    timing: [{ type: 'minutes', value: 15 }],
                    methods: ['email', 'browser'],
                    escalation: false,
                    snoozeEnabled: true,
                    snoozeDuration: 5
                  },
                  recurring: {
                    enabled: false,
                    pattern: 'weekly',
                    interval: 1,
                    daysOfWeek: [],
                    endDate: '',
                    occurrences: 0,
                    exceptions: []
                  },
                  followUpRequired: false,
                  outcome: '',
                  createdBy: 'system',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  lastModifiedBy: 'system'
                }),
              });

              if (!stepResponse.ok) {
                console.error('Failed to create calendar event for step:', step.title);
              }
            } catch (error) {
              console.error('Error creating calendar event for step:', error);
            }
          }
        }

        setShowCallLogDialog(false);
        setCurrentCallCenter(null);
      }
    } catch (error) {
      console.error('Error saving call log:', error);
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

  const filteredCallCenters = callCenters.filter(callCenter => {
    // Enhanced global search
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

    return matchesSearch && matchesCountry && matchesCity && matchesStatus &&
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
    <div className="flex flex-col h-full">
      {/* Enhanced Search and Filters Header */}
      <Card className="mb-6 flex-shrink-0 border-0 shadow-lg bg-gradient-to-r from-white to-gray-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Call Center Directory</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Search, filter, and manage your call centers</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-white rounded-lg p-1 shadow-sm">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-md"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="rounded-md"
                >
                  <Building className="w-4 h-4 mr-2" />
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Search */}
          <div className="relative mb-6">
            <div className="relative">
              <Input
                placeholder="Search call centers by name, location, contact info, or tags..."
                value={filters.search}
                onChange={(e) => {
                  const newSearch = e.target.value;
                  setFilters(prev => ({ ...prev, search: newSearch }));
                  // Trigger debounced search in parent component
                  debouncedSearch(newSearch);
                }}
                className="pl-14 pr-28 h-14 text-lg border-3 border-blue-300 focus:border-blue-500 rounded-2xl shadow-lg bg-white focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm">🔍</span>
                </div>
              </div>
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              )}
              {filters.search && !isSearching && (
                <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, search: '' }));
                      debouncedSearch('');
                    }}
                    className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors mr-3 flex items-center justify-center hover:bg-gray-100 rounded-full"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="absolute inset-y-0 right-0 pr-20 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="h-10 px-4 text-gray-600 hover:text-gray-900 hover:bg-blue-50 transition-colors rounded-xl font-medium"
                >
                  <span className="text-sm mr-2">Filters</span>
                  {showAdvancedFilters ? '▲' : '▼'}
                </Button>
              </div>
            </div>

            {/* Search hint */}
            <div className="text-center mt-3">
              <p className="text-sm text-gray-500">
                💡 <span className="font-medium">Pro tip:</span> Use keywords like "Morocco", "Casablanca", or specific company names
              </p>
            </div>
          </div>

          {/* Advanced Filters - Collapsible */}
          {showAdvancedFilters && (
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
          )}

          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  search: '',
                  country: '',
                  city: '',
                  status: '',
                  minPositions: '',
                  maxPositions: '',
                  tags: '',
                  minValue: '',
                  maxValue: '',
                  dateFrom: '',
                  dateTo: ''
                })}
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
              <CardTitle>Call Centers ({sortedCallCenters.length})</CardTitle>
              {filteredCallCenters.length !== callCenters.length && (
                <Badge variant="secondary">
                  Filtered: {filteredCallCenters.length} of {callCenters.length}
                </Badge>
              )}
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
                   {sortedCallCenters.map((callCenter, index) => (
                     <Card key={`${callCenter.id}-${index}`} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                       <CardContent className="p-6">
                         <div className="flex items-start justify-between">
                           <div className="flex-1 min-w-0">
                             {/* Header Section */}
                             <div className="flex items-start justify-between mb-3">
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-3 mb-2">
                                   <Checkbox
                                     checked={selectedIds.includes(callCenter.id.toString())}
                                     onCheckedChange={(checked: boolean) => handleSelect(callCenter.id.toString(), checked)}
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
                               <Badge className={`${STATUS_COLORS[callCenter.status as keyof typeof STATUS_COLORS]} text-xs px-3 py-1`}>
                                 {callCenter.status}
                               </Badge>
                             </div>

                             {/* Main Content Grid */}
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                               {/* Key Metrics */}
                               <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                   <span className="text-sm font-medium text-gray-700">Positions</span>
                                   <span className="text-lg font-bold text-gray-900">{callCenter.positions}</span>
                                 </div>
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

                             {/* Action Buttons */}
                             <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                               <div className="flex items-center gap-2">
                                 {callCenter.phones.length > 0 && callCenter.phone_infos && callCenter.phone_infos[0] && callCenter.phone_infos[0].is_mobile && callCenter.phone_infos[0].whatsapp_confidence >= 0.7 ? (
                                   <Button
                                     asChild
                                     size="sm"
                                     className="bg-green-600 hover:bg-green-700 text-white"
                                   >
                                     <a
                                       href={PhoneDetectionService.getWhatsAppLink(callCenter.phones[0])}
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
                                 <Button variant="outline" size="sm" onClick={() => handleOpenCallLog(callCenter)}>
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
                                   onClick={() => onDelete(callCenter.id.toString())}
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
                  ))}
                </div>
              ) : (
                /* Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {sortedCallCenters.map((callCenter, index) => (
                     <Card key={`${callCenter.id}-${index}`} className="hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white">
                       <CardContent className="p-6">
                         {/* Header with checkbox and status */}
                         <div className="flex items-start justify-between mb-4">
                           <Checkbox
                             checked={selectedIds.includes(callCenter.id.toString())}
                             onCheckedChange={(checked: boolean) => handleSelect(callCenter.id.toString(), checked)}
                             className="mt-1"
                           />
                           <Badge className={`${STATUS_COLORS[callCenter.status as keyof typeof STATUS_COLORS]} text-xs px-3 py-1 ml-auto`}>
                             {callCenter.status}
                           </Badge>
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
                           {callCenter.value && (
                             <div className="text-center p-3 bg-green-50 rounded-lg">
                               <div className="text-lg font-bold text-green-600">
                                 ${callCenter.value.toLocaleString()}
                               </div>
                               <div className="text-xs text-green-700 uppercase tracking-wide">
                                 {callCenter.currency}
                               </div>
                             </div>
                           )}
                         </div>

                         {/* Contact Information */}
                         <div className="space-y-3 mb-4">
                           {callCenter.phones.length > 0 && (
                             <div className="flex items-center justify-between">
                               <div>
                                 <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                                 <div className="text-sm font-mono text-gray-900">{callCenter.phones[0]}</div>
                               </div>
                               {callCenter.phone_infos && callCenter.phone_infos[0] && callCenter.phone_infos[0].is_mobile && callCenter.phone_infos[0].whatsapp_confidence >= 0.7 && (
                                 <Button
                                   asChild
                                   size="sm"
                                   className="bg-green-600 hover:bg-green-700 text-white"
                                 >
                                   <a
                                     href={PhoneDetectionService.getWhatsAppLink(callCenter.phones[0])}
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

                         {/* Action Buttons */}
                         <div className="flex gap-2 pt-4 border-t border-gray-100">
                           <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenCallLog(callCenter)}>
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
                             onClick={() => onDelete(callCenter.id.toString())}
                             className="text-red-600 hover:text-red-700 hover:bg-red-50"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </CardContent>
                     </Card>
                  ))}
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
        onUpdate={handleUpdateCallCenter}
        onDelete={handleDeleteCallCenterFromModal}
      />

      {/* Call Log Dialog */}
      <Dialog open={showCallLogDialog} onOpenChange={setShowCallLogDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Log Call - {currentCallCenter?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
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