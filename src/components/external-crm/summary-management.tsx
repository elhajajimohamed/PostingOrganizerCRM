'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CallCenter } from '@/lib/types/external-crm';
import { FileText, Save, Edit2 } from 'lucide-react';

interface SummaryManagementProps {
  callCenter: CallCenter;
  onUpdate: (data: Omit<CallCenter, 'id' | 'createdAt'>) => void;
}

export function SummaryManagement({ callCenter, onUpdate }: SummaryManagementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(callCenter.summary || '');

  const handleSave = () => {
    onUpdate({
      ...callCenter,
      summary: summary.trim()
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSummary(callCenter.summary || '');
    setIsEditing(false);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <span>Summary of All Processes</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Document all interactions, processes, and important information about this call center
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter detailed summary of all processes with this call center..."
              rows={12}
              className="w-full border-purple-200 focus:border-purple-400 focus:ring-purple-400/20"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-purple-200 hover:bg-purple-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Summary
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {summary ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {summary}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No summary yet</p>
                <p className="text-sm">Add a summary to document all processes and interactions with this call center.</p>
              </div>
            )}
            <div className="flex justify-center">
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {summary ? 'Edit Summary' : 'Add Summary'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
