'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CallLog } from '@/lib/types/external-crm';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';
import { formatDuration } from '@/lib/utils/duration';
import { MessageSquare, Clock, Calendar, History } from 'lucide-react';

interface CallHistoryPreviewProps {
  callCenterId: string;
}

export function CallHistoryPreview({ callCenterId }: CallHistoryPreviewProps) {
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCallHistory();
  }, [callCenterId]);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      const history = await ExternalCRMSubcollectionsService.getCallHistory(callCenterId);
      setCallHistory(history);
    } catch (error) {
      console.error('Error loading call history:', error);
      setCallHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Call History ({callHistory.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {callHistory.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No previous calls logged</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {callHistory
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5) // Show only last 5 calls
              .map((callLog) => (
                <div key={callLog.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${
                      callLog.outcome === 'answered' ? 'bg-green-100 text-green-800 border-green-200' :
                      callLog.outcome === 'no-answer' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      callLog.outcome === 'busy' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                      callLog.outcome === 'voicemail' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    {callLog.outcome.replace('-', ' ').toUpperCase()}
                  </Badge>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(callLog.date).toLocaleDateString()}
                      {callLog.duration > 0 && (
                        <>
                          <Clock className="w-3 h-3" />
                          {formatDuration(callLog.duration)}
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 truncate">{callLog.notes}</p>
                  </div>
                </div>
              ))}

            {callHistory.length > 5 && (
              <div className="text-center text-xs text-gray-500 pt-2 border-t">
                And {callHistory.length - 5} more previous calls...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
