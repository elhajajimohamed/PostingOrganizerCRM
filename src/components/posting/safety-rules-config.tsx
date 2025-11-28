'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PostingTaskService } from '@/lib/services/posting-task-service';
import { SafetyRules } from '@/lib/types';
import { Settings, Save } from 'lucide-react';

interface SafetyRulesConfigProps {
  onClose: () => void;
}

export function SafetyRulesConfig({ onClose }: SafetyRulesConfigProps) {
  const [rules, setRules] = useState<SafetyRules>({
    delayBetweenPostsMinutes: { min: 3, max: 7 },
    groupCooldownDays: 15,
    maxPostsPerAccountPerDay: 5,
    maxPostsPerGroupPerDay: 1,
    avoidRecentWarnings: true,
    updatedAt: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const currentRules = await PostingTaskService.getSafetyRules();
      setRules(currentRules);
    } catch (error) {
      console.error('Failed to load safety rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await PostingTaskService.updateSafetyRules({
        delayBetweenPostsMinutes: rules.delayBetweenPostsMinutes,
        groupCooldownDays: rules.groupCooldownDays,
        maxPostsPerAccountPerDay: rules.maxPostsPerAccountPerDay,
        maxPostsPerGroupPerDay: rules.maxPostsPerGroupPerDay,
        avoidRecentWarnings: rules.avoidRecentWarnings,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save safety rules:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Daily Safety Rules Configuration
        </CardTitle>
        <CardDescription>
          Configure safety limits to prevent Facebook bans and ensure smart posting rotation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delay Between Posts */}
        <div className="space-y-3">
          <Label className="text-base font-medium">⏱️ Delay Between Posts (minutes)</Label>
          <p className="text-sm text-gray-600">
            Random delay between posts per account to avoid detection
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-delay" className="text-sm">Minimum</Label>
              <Input
                id="min-delay"
                type="number"
                value={rules.delayBetweenPostsMinutes.min}
                onChange={(e) => setRules(prev => ({
                  ...prev,
                  delayBetweenPostsMinutes: {
                    ...prev.delayBetweenPostsMinutes,
                    min: parseInt(e.target.value) || 0
                  }
                }))}
                min="1"
                max="60"
              />
            </div>
            <div>
              <Label htmlFor="max-delay" className="text-sm">Maximum</Label>
              <Input
                id="max-delay"
                type="number"
                value={rules.delayBetweenPostsMinutes.max}
                onChange={(e) => setRules(prev => ({
                  ...prev,
                  delayBetweenPostsMinutes: {
                    ...prev.delayBetweenPostsMinutes,
                    max: parseInt(e.target.value) || 0
                  }
                }))}
                min="1"
                max="60"
              />
            </div>
          </div>
        </div>

        {/* Group Cooldown */}
        <div className="space-y-3">
          <Label className="text-base font-medium">🧩 Group Cooldown Period (days)</Label>
          <p className="text-sm text-gray-600">
            Don't post in the same group within this many days
          </p>
          <Input
            type="number"
            value={rules.groupCooldownDays}
            onChange={(e) => setRules(prev => ({
              ...prev,
              groupCooldownDays: parseInt(e.target.value) || 1
            }))}
            min="1"
            max="365"
          />
        </div>

        {/* Max Posts Per Account Per Day */}
        <div className="space-y-3">
          <Label className="text-base font-medium">📵 Max Posts Per Account Per Day</Label>
          <p className="text-sm text-gray-600">
            Maximum number of posts allowed per Facebook account daily
          </p>
          <Input
            type="number"
            value={rules.maxPostsPerAccountPerDay}
            onChange={(e) => setRules(prev => ({
              ...prev,
              maxPostsPerAccountPerDay: parseInt(e.target.value) || 1
            }))}
            min="1"
            max="20"
          />
        </div>

        {/* Max Posts Per Group Per Day */}
        <div className="space-y-3">
          <Label className="text-base font-medium">🚫 Max Posts Per Group Per Day</Label>
          <p className="text-sm text-gray-600">
            Maximum number of posts allowed in the same group daily
          </p>
          <Input
            type="number"
            value={rules.maxPostsPerGroupPerDay}
            onChange={(e) => setRules(prev => ({
              ...prev,
              maxPostsPerGroupPerDay: parseInt(e.target.value) || 1
            }))}
            min="1"
            max="5"
          />
        </div>

        {/* Avoid Recent Warnings */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">🚨 Avoid Groups With Recent Warnings</Label>
            <p className="text-sm text-gray-600">
              Skip groups that have received warnings or rejections recently
            </p>
          </div>
          <Checkbox
            checked={rules.avoidRecentWarnings}
            onCheckedChange={(checked: boolean) => setRules(prev => ({
              ...prev,
              avoidRecentWarnings: checked
            }))}
          />
        </div>

        {/* Summary */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">📋 Current Configuration Summary</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Post delays: {rules.delayBetweenPostsMinutes.min}-{rules.delayBetweenPostsMinutes.max} minutes</li>
            <li>• Group cooldown: {rules.groupCooldownDays} days</li>
            <li>• Max posts per account: {rules.maxPostsPerAccountPerDay} per day</li>
            <li>• Max posts per group: {rules.maxPostsPerGroupPerDay} per day</li>
            <li>• Avoid warning groups: {rules.avoidRecentWarnings ? 'Enabled' : 'Disabled'}</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Rules'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
