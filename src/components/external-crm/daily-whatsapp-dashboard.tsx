'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyWhatsAppSuggestion, CallCenter, DailyWhatsAppHistory } from '@/lib/types/external-crm';
import { CallCenterDetailModal } from './call-center-detail-modal';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import {
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Building,
  Users,
  RefreshCw,
  Eye,
  Send,
  Timer,
  ArrowLeft,
  Trash2,
  X,
} from 'lucide-react';

interface DailyWhatsAppDashboardProps {
  className?: string;
}

export function DailyWhatsAppDashboard({ className }: DailyWhatsAppDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<DailyWhatsAppSuggestion[]>([]);
  const [sentToday, setSentToday] = useState<DailyWhatsAppSuggestion[]>([]);
  const [whatsappHistory, setWhatsappHistory] = useState<DailyWhatsAppHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSentIds, setSelectedSentIds] = useState<string[]>([]);
  const [selectedToRemoveIds, setSelectedToRemoveIds] = useState<string[]>([]);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<DailyWhatsAppSuggestion | null>(null);
  const [sendMessage, setSendMessage] = useState('');
  const [selectedCallCenter, setSelectedCallCenter] = useState<CallCenter | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadWhatsAppSuggestions();
    loadWhatsAppHistory();
  }, []);

  const loadWhatsAppSuggestions = async (forceRegenerate = false) => {
    try {
      setLoading(true);
      console.log(`🔄 [DAILY-WHATSAPP] ${forceRegenerate ? 'Regenerating' : 'Loading'} WhatsApp suggestions...`);

      const action = forceRegenerate ? 'regenerate' : 'generate';
      const response = await fetch(`/api/external-crm/daily-whatsapp?action=${action}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [DAILY-WHATSAPP] API response received:', data);

        if (data.success) {
          setSuggestions(data.data.suggestions || []);
          setSentToday(data.data.sentToday || []);

          console.log('📊 [DAILY-WHATSAPP] Data loaded:', {
            suggestionsCount: data.data.suggestions?.length || 0,
            sentTodayCount: data.data.sentToday?.length || 0,
            sessionId: data.data.session?.id,
          });
        } else {
          console.error('❌ [DAILY-WHATSAPP] API returned error:', data.error);
        }
      } else {
        console.error('❌ [DAILY-WHATSAPP] API request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP] Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (callCenterId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, callCenterId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== callCenterId));
    }
  };

  const handleSentCheckboxChange = (callCenterId: string, checked: boolean) => {
    if (checked) {
      setSelectedSentIds(prev => [...prev, callCenterId]);
    } else {
      setSelectedSentIds(prev => prev.filter(id => id !== callCenterId));
    }
  };

  const handleRemoveCheckboxChange = (callCenterId: string, checked: boolean) => {
    if (checked) {
      setSelectedToRemoveIds(prev => [...prev, callCenterId]);
    } else {
      setSelectedToRemoveIds(prev => prev.filter(id => id !== callCenterId));
    }
  };

  const handleRemoveSuggestions = async () => {
    if (selectedToRemoveIds.length === 0) return;

    try {
      console.log('🔄 [DAILY-WHATSAPP-UI] Removing suggestions:', selectedToRemoveIds);

      const response = await fetch('/api/external-crm/daily-whatsapp/remove-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callCenterIds: selectedToRemoveIds }),
      });

      if (response.ok) {
        // Remove from local state
        setSuggestions(prev => prev.filter(s => !selectedToRemoveIds.includes(s.callCenter.id)));
        setSelectedToRemoveIds([]);

        console.log('✅ [DAILY-WHATSAPP-UI] Successfully removed suggestions');
        loadWhatsAppHistory(); // Refresh history
        loadWhatsAppSuggestions(); // Refresh to get updated session data
      } else {
        const errorData = await response.json();
        console.error('❌ [DAILY-WHATSAPP-UI] Failed to remove suggestions:', errorData);
        alert(`Failed to remove suggestions: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP-UI] Error removing suggestions:', error);
      alert(`Error removing suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendWhatsApp = (suggestion: DailyWhatsAppSuggestion) => {
    setCurrentSuggestion(suggestion);
    setSendMessage(`Hello! I'm interested in your call center services. Could we discuss potential collaboration?`);
    setShowSendDialog(true);
  };

  const loadWhatsAppHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch('/api/external-crm/daily-whatsapp/history?limit=100');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWhatsappHistory(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading WhatsApp history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleConfirmSend = async () => {
    if (!currentSuggestion || !sendMessage.trim()) return;

    try {
      // Log the WhatsApp send
      const response = await fetch('/api/external-crm/daily-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          callCenterId: currentSuggestion.callCenter.id,
          message: sendMessage.trim(),
          scheduledTime: currentSuggestion.scheduledTime,
        }),
      });

      if (response.ok) {
        // Log to history
        await fetch('/api/external-crm/daily-whatsapp/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callCenterId: currentSuggestion.callCenter.id,
            callCenterName: currentSuggestion.callCenter.name,
            action: 'whatsapp_sent',
            details: {
              message: sendMessage.trim(),
              scheduledTime: currentSuggestion.scheduledTime,
              whatsappLink: currentSuggestion.whatsappLink,
            },
            userId: null, // Add userId field
          }),
        });

        // Move to sent today (handled by API now)
        setSentToday(prev => [...prev, currentSuggestion]);
        setSuggestions(prev => prev.filter(s => s.callCenter.id !== currentSuggestion.callCenter.id));
        setSelectedIds(prev => prev.filter(id => id !== currentSuggestion.callCenter.id));

        setShowSendDialog(false);
        setCurrentSuggestion(null);
        setSendMessage('');
        loadWhatsAppHistory(); // Refresh history
        loadWhatsAppSuggestions(); // Refresh suggestions to get updated session data
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
    }
  };

  const handleMoveToSentToday = async () => {
    if (selectedIds.length === 0) return;

    try {
      console.log('🔄 [DAILY-WHATSAPP] Moving call centers to sent today:', selectedIds);
      
      // Call the service to move call centers to sent today
      const response = await fetch('/api/external-crm/daily-whatsapp/move-to-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterIds: selectedIds
        }),
      });

      if (response.ok) {
        // Log to history for each moved call center
        for (const callCenterId of selectedIds) {
          const suggestion = suggestions.find(s => s.callCenter.id === callCenterId);
          if (suggestion) {
            await fetch('/api/external-crm/daily-whatsapp/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callCenterId: suggestion.callCenter.id,
                callCenterName: suggestion.callCenter.name,
                action: 'moved_to_sent',
                details: {
                  reason: 'Manual move to sent today'
                },
                userId: null,
              }),
            });
          }
        }

        setSelectedIds([]);
        loadWhatsAppHistory(); // Refresh history
        loadWhatsAppSuggestions(); // Refresh suggestions to get updated session data
        console.log('✅ [DAILY-WHATSAPP] Successfully moved call centers to sent today');
      } else {
        console.error('❌ [DAILY-WHATSAPP] Failed to move call centers to sent today:', response.statusText);
      }
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP] Error moving call centers to sent today:', error);
    }
  };

  const handleMoveBackToSuggestions = async () => {
    if (selectedSentIds.length === 0) return;

    try {
      console.log('🔄 [DAILY-WHATSAPP] Moving call centers back to suggestions:', selectedSentIds);
      
      // Call the service to move call centers back to suggestions
      const response = await fetch('/api/external-crm/daily-whatsapp/move-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterIds: selectedSentIds
        }),
      });

      if (response.ok) {
        // Log to history for each moved back call center
        for (const callCenterId of selectedSentIds) {
          const suggestion = sentToday.find(s => s.callCenter.id === callCenterId);
          if (suggestion) {
            await fetch('/api/external-crm/daily-whatsapp/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callCenterId: suggestion.callCenter.id,
                callCenterName: suggestion.callCenter.name,
                action: 'moved_back_to_suggestions',
                details: {
                  reason: 'Manual move back to suggestions'
                },
                userId: null,
              }),
            });
          }
        }

        setSelectedSentIds([]);
        loadWhatsAppHistory(); // Refresh history
        loadWhatsAppSuggestions(); // Refresh suggestions to get updated session data
        console.log('✅ [DAILY-WHATSAPP] Successfully moved call centers back to suggestions');
      } else {
        console.error('❌ [DAILY-WHATSAPP] Failed to move call centers back to suggestions:', response.statusText);
      }
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP] Error moving call centers back to suggestions:', error);
    }
  };

  const handleBulkSend = async () => {
    if (selectedIds.length === 0) return;

    try {
      const selectedSuggestions = suggestions.filter(s =>
        selectedIds.includes(s.callCenter.id)
      );

      for (const suggestion of selectedSuggestions) {
        const response = await fetch('/api/external-crm/daily-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            callCenterId: suggestion.callCenter.id,
            message: `Hello! I'm interested in your call center services. Could we discuss potential collaboration?`,
            scheduledTime: suggestion.scheduledTime,
          }),
        });

        if (response.ok) {
          // Log to history
          await fetch('/api/external-crm/daily-whatsapp/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callCenterId: suggestion.callCenter.id,
              callCenterName: suggestion.callCenter.name,
              action: 'bulk_whatsapp_sent',
              details: {
                message: `Hello! I'm interested in your call center services. Could we discuss potential collaboration?`,
                scheduledTime: suggestion.scheduledTime,
                whatsappLink: suggestion.whatsappLink,
              },
              userId: null, // Add userId field
            }),
          });

          setSentToday(prev => [...prev, suggestion]);
          setSuggestions(prev => prev.filter(s => s.callCenter.id !== suggestion.callCenter.id));
        }
      }

      setSelectedIds([]);
      loadWhatsAppHistory(); // Refresh history
      loadWhatsAppSuggestions(); // Refresh suggestions to get updated session data
    } catch (error) {
      console.error('Error bulk sending WhatsApp:', error);
    }
  };

  const handleRegenerateList = async () => {
    if (loading) return;

    if (confirm('This will replace the current WhatsApp suggestions with a new list. Continue?')) {
      try {
        setLoading(true);
        console.log('🔄 [DAILY-WHATSAPP-UI] Regenerating WhatsApp suggestions...');

        const response = await fetch('/api/external-crm/daily-whatsapp?action=regenerate');

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [DAILY-WHATSAPP-UI] Regenerate API response received:', data);

          if (data.success) {
            setSuggestions(data.data.suggestions || []);
            setSentToday(data.data.sentToday || []);

            console.log('📊 [DAILY-WHATSAPP-UI] New suggestions generated:', {
              suggestionsCount: data.data.suggestions?.length || 0,
              sentTodayCount: data.data.sentToday?.length || 0,
            });

            alert('New WhatsApp suggestions generated successfully!');
          } else {
            console.error('❌ [DAILY-WHATSAPP-UI] Regenerate API returned error:', data.error);
            alert(`Failed to regenerate suggestions: ${data.error || 'Unknown error'}`);
          }
        } else {
          console.error('❌ [DAILY-WHATSAPP-UI] Regenerate API request failed:', response.status, response.statusText);
          alert('Failed to regenerate WhatsApp suggestions');
        }
      } catch (error) {
        console.error('❌ [DAILY-WHATSAPP-UI] Error regenerating suggestions:', error);
        alert(`Error regenerating suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewDetails = (suggestion: DailyWhatsAppSuggestion) => {
    setSelectedCallCenter(suggestion.callCenter);
    setShowDetailModal(true);
  };

  const handleUpdateCallCenter = async (updatedCallCenter: CallCenter) => {
    // Update the call center in our local state
    setSuggestions(prev =>
      prev.map(s =>
        s.callCenter.id === updatedCallCenter.id
          ? { ...s, callCenter: updatedCallCenter }
          : s
      )
    );
    setSentToday(prev =>
      prev.map(s =>
        s.callCenter.id === updatedCallCenter.id
          ? { ...s, callCenter: updatedCallCenter }
          : s
      )
    );
    setSelectedCallCenter(null);
    setShowDetailModal(false);
  };

  const formatTimeUntilSend = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatScheduledTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 ${className}`}>
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Daily WhatsApp</h2>
            <p className="text-green-100 text-lg mb-4">
              {suggestions.length} suggestions • {sentToday.length} sent today
            </p>
            {/* Performance Metrics */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
                <span className="font-medium">Sent today:</span>
                <span className="ml-1 font-bold">{sentToday.length}/10</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
                <span className="font-medium">Reply rate:</span>
                <span className="ml-1 font-bold">0%</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
                <span className="font-medium">Avg delay:</span>
                <span className="ml-1 font-bold">2.3h</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadWhatsAppSuggestions(true)}
              disabled={loading}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30 disabled:opacity-50 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerateList}
              disabled={loading}
              className="bg-orange-600/20 text-white border-orange-500/30 hover:bg-orange-600/30 disabled:opacity-50 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Generate Another List'}
            </Button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
            WhatsApp History ({whatsappHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-green-600" />
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : whatsappHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No WhatsApp history yet.</p>
              <p className="text-sm">Actions will appear here as you send WhatsApp messages.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {whatsappHistory.map((entry) => (
                <div key={entry.id} className="p-4 border rounded-lg bg-green-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground text-xs">
                        {entry.action === 'whatsapp_sent' && '📱 WhatsApp Sent'}
                        {entry.action === 'bulk_whatsapp_sent' && '📤 Bulk WhatsApp Sent'}
                        {entry.action === 'scheduled' && '⏰ Scheduled'}
                        {entry.action === 'moved_to_sent' && '✅ Moved to Sent'}
                        {entry.action === 'moved_back_to_suggestions' && '↩️ Moved Back'}
                        {entry.action === 'removed' && '🗑️ Removed'}
                      </div>
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
                      {entry.details.message && (
                        <div className="bg-white p-2 rounded border-l-4 border-green-500">
                          <strong>Message sent:</strong>
                          <div className="mt-1 text-xs italic">"{entry.details.message}"</div>
                        </div>
                      )}
                      {entry.details.scheduledTime && (
                        <div><strong>Scheduled:</strong> {new Date(entry.details.scheduledTime).toLocaleTimeString()}</div>
                      )}
                      {entry.details.reason && (
                        <div><strong>Reason:</strong> {entry.details.reason}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced WhatsApp Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Suggestions */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-3">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                WhatsApp Suggestions ({suggestions.length})
              </div>
              <div className="flex space-x-2">
                {selectedIds.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleMoveToSentToday}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Move to Sent Today ({selectedIds.length})
                  </Button>
                )}
                {selectedToRemoveIds.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleRemoveSuggestions}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove ({selectedToRemoveIds.length})
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {suggestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-slate-600 font-medium mb-2">No WhatsApp suggestions available</p>
                <p className="text-slate-500 text-sm mb-4">Generate new suggestions to get started</p>
                <Button
                  variant="outline"
                  onClick={() => loadWhatsAppSuggestions(true)}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  Generate Suggestions
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.callCenter.id}
                    className="group p-4 border border-slate-200/60 rounded-2xl bg-white/50 backdrop-blur-sm transition-all duration-200 hover:border-green-200 hover:shadow-lg hover:bg-white/80"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex flex-col space-y-2">
                        <Checkbox
                          checked={selectedIds.includes(suggestion.callCenter.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Uncheck remove if checking move-to-sent
                              setSelectedToRemoveIds(prev => prev.filter(id => id !== suggestion.callCenter.id));
                            }
                            handleCheckboxChange(suggestion.callCenter.id, checked as boolean);
                          }}
                          title="Mark for move to sent today"
                          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                        <Checkbox
                          checked={selectedToRemoveIds.includes(suggestion.callCenter.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Uncheck move-to-sent if checking remove
                              setSelectedIds(prev => prev.filter(id => id !== suggestion.callCenter.id));
                            }
                            handleRemoveCheckboxChange(suggestion.callCenter.id, checked as boolean);
                          }}
                          title="Mark for removal"
                          className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-slate-800 truncate pr-2">
                            {suggestion.callCenter.name}
                          </h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <Timer className="w-3 h-3 mr-1" />
                              {formatTimeUntilSend(suggestion.timeUntilSend)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.daysSinceLastWhatsApp}d ago
                            </Badge>
                            {suggestion.priorityBadge && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {suggestion.priorityBadge}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 mb-4">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                            {suggestion.callCenter.city}, {suggestion.callCenter.country}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-slate-400" />
                            Scheduled: {formatScheduledTime(suggestion.scheduledTime)}
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-slate-400" />
                            {suggestion.callCenter.positions} positions
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                            onClick={() => handleSendWhatsApp(suggestion)}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Send WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(suggestion)}
                            className="border-slate-200 hover:bg-slate-50"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sent Today */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-green-100">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mr-3">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                Sent Today ({sentToday.length})
              </div>
              {selectedSentIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleMoveBackToSuggestions}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Move Back ({selectedSentIds.length})
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {sentToday.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-slate-600 font-medium mb-2">No WhatsApp messages sent yet</p>
                <p className="text-slate-500 text-sm">Messages sent today will appear here</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sentToday.map((suggestion) => (
                  <div
                    key={suggestion.callCenter.id}
                    className="p-4 border border-green-200/60 rounded-2xl bg-gradient-to-r from-emerald-50/50 to-green-50/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:from-emerald-50/70 hover:to-green-50/70"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={selectedSentIds.includes(suggestion.callCenter.id)}
                            onCheckedChange={(checked) =>
                              handleSentCheckboxChange(suggestion.callCenter.id, checked as boolean)
                            }
                            className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-slate-800 truncate pr-2">
                                {suggestion.callCenter.name}
                              </h3>
                              <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs">
                                Sent Today
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600 mb-4">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                {suggestion.callCenter.city}, {suggestion.callCenter.country}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                Sent at: {formatScheduledTime(suggestion.scheduledTime)}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleViewDetails(suggestion)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Center Detail Modal */}
      <CallCenterDetailModal
        callCenter={selectedCallCenter}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onUpdate={handleUpdateCallCenter}
      />

      {/* Send WhatsApp Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Send WhatsApp to {currentSuggestion?.callCenter.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Message
              </label>
              <Textarea
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                placeholder="Enter your WhatsApp message..."
                rows={4}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Scheduled Time</span>
              </div>
              <p className="text-sm text-blue-700">
                This message will be sent at {currentSuggestion && formatScheduledTime(currentSuggestion.scheduledTime)}
                ({currentSuggestion && formatTimeUntilSend(currentSuggestion.timeUntilSend)} from now)
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleConfirmSend();
                  // Open WhatsApp after confirming send with user's message
                  if (currentSuggestion && sendMessage.trim()) {
                    const whatsappUrl = PhoneDetectionService.getWhatsAppLink(
                      currentSuggestion.callCenter.phones?.[0] || '',
                      sendMessage.trim()
                    );
                    window.open(whatsappUrl, '_blank');
                  }
                }}
                disabled={!sendMessage.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
