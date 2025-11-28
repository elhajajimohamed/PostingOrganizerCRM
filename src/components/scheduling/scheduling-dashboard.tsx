'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SettingsService } from '@/lib/services/settings-service';
import { SchedulingService } from '@/lib/services/scheduling-service';
import { TaskService } from '@/lib/services/task-service';
import { NotificationService } from '@/lib/services/notification-service';
import { ImportService } from '@/lib/services/import-service';
import { RampUpService } from '@/lib/services/ramp-up-service';
import { GroupStateService } from '@/lib/services/group-state-service';
import { Settings, Notification, ImportResult, EnhancedSchedulingConfig } from '@/lib/types';

interface SchedulingDashboardProps {
  userId: string;
}

export function SchedulingDashboard({ userId }: SchedulingDashboardProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{
    combinations: Array<{
      template: { title: string };
      media?: { name: string };
      group: { name: string };
      account: { name: string };
      scheduledTime: Date;
    }>;
    stats: {
      totalGroups: number;
      availableGroups: number;
      activeAccounts: number;
      totalTemplates: number;
      totalMedia: number;
    };
    validation: { valid: boolean; errors: string[]; warnings: string[] };
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'notifications' | 'import' | 'rampup' | 'monitor' | 'auto'>('config');

  // Enhanced form state for scheduling configuration
  const [formData, setFormData] = useState<EnhancedSchedulingConfig>({
    enabled: false,
    postsPerDay: 20,
    startHour: 9,
    endHour: 18,
    minIntervalMinutes: 30,
    maxGroupsPerAccount: 5,
    autoGenerate: false,
    global_group_cooldown_hours: 72,
    max_group_posts_per_24h: 1,
    cross_account_spacing_minutes: 180,
    duplicate_content_window_days: 7,
    baseline_min_interval: 30,
    interval_variation_pct: 20,
    group_usage_threshold: 2,
    usage_window_days: 7,
    global_usage_threshold: 5,
    global_window_days: 14,
    staleness_days: 21,
    initial_ramp_delay_hours: 48,
    ramp_week1_max_posts: 1,
    ramp_week2_max_posts: 1,
  });

  // Additional state for new features
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [rampUpStats, setRampUpStats] = useState<{
    totalGroupsInRampUp: number;
    groupsByPhase: Record<string, number>;
    recentlyGraduated: number;
  } | null>(null);
  const [schedulingStatus, setSchedulingStatus] = useState<{
    isEnabled: boolean;
    autoGenerate: boolean;
    todayTaskCount: number;
    lastRunDate?: Date;
    nextScheduledRun?: Date;
    configuration: any;
  } | null>(null);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [groupStateSummary, setGroupStateSummary] = useState<{
    totalGroups: number;
    groupsInCooldown: number;
    groupsAtDailyLimit: number;
    avgPostsPerGroup: number;
    cooldownGroups: Array<{
      name: string;
      lastPostAt?: Date;
      inCooldown: boolean;
      nextAvailableAt?: Date;
    }>;
  } | null>(null);

  useEffect(() => {
    loadSettings();
    loadSchedulingStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = await SettingsService.getSettings();
      setSettings(currentSettings);

      if (currentSettings?.scheduling) {
        setFormData(currentSettings.scheduling);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulingStatus = async () => {
    try {
      const status = await SchedulingService.getSchedulingStatus();
      setSchedulingStatus(status);
    } catch (error) {
      console.error('Error loading scheduling status:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);

      // Validate configuration
      const validation = SettingsService.validateSchedulingConfig(formData);
      if (!validation.valid) {
        alert(`Configuration errors:\n${validation.errors.join('\n')}`);
        return;
      }

      await SettingsService.updateSchedulingConfig(formData, userId);

      // Update local settings
      if (settings) {
        setSettings({
          ...settings,
          scheduling: formData,
        });
      }

      alert('Scheduling configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePreview = async () => {
    try {
      setGenerating(true);
      const previewData = await SettingsService.previewSchedule(formData);
      setPreview(previewData);
      setActiveTab('preview');
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error generating preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!confirm('This will generate new tasks for today. Continue?')) {
      return;
    }

    try {
      setGenerating(true);
      await TaskService.generateScheduledTasks(userId, formData.postsPerDay);
      alert('Tasks generated successfully!');
      window.location.reload(); // Refresh to show new tasks
    } catch (error) {
      console.error('Error generating tasks:', error);
      alert('Error generating tasks');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleScheduling = async () => {
    try {
      await SettingsService.toggleScheduling(!formData.enabled, userId);
      setFormData({ ...formData, enabled: !formData.enabled });
      alert(`Scheduling ${!formData.enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling scheduling:', error);
      alert('Error updating scheduling status');
    }
  };

  const handleRunAutomaticScheduling = async () => {
    if (!confirm('This will run the automatic scheduling process and generate tasks for today. Continue?')) {
      return;
    }

    try {
      setAutoScheduling(true);
      const result = await SchedulingService.runAutomaticScheduling(userId);

      if (result.success) {
        alert(`✅ Success! Generated ${result.taskIds.length} tasks for today.\n\nStats:\n- Successful posts: ${result.stats.successfulPosts}\n- Skipped duplicates: ${result.stats.skippedDueToDuplicate}\n- Total candidates: ${result.stats.totalCandidates}`);

        // Refresh status and tasks
        await loadSchedulingStatus();
        window.location.reload(); // Refresh to show new tasks
      } else {
        alert(`❌ Failed: ${result.warnings.join(', ')}`);
      }
    } catch (error) {
      console.error('Error running automatic scheduling:', error);
      alert('Error running automatic scheduling');
    } finally {
      setAutoScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading scheduling dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automatic Scheduling</h1>
          <p className="text-muted-foreground">
            Configure and monitor automatic post scheduling
          </p>
        </div>
        <Badge variant={formData.enabled ? 'default' : 'secondary'}>
          {formData.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg overflow-x-auto">
        {[
          { id: 'auto', label: '🤖 Auto Schedule' },
          { id: 'config', label: 'Configuration' },
          { id: 'preview', label: 'Preview' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'import', label: 'Import/Export' },
          { id: 'rampup', label: 'Ramp-up' },
          { id: 'monitor', label: 'Monitor' },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as 'config' | 'preview' | 'notifications' | 'import' | 'rampup' | 'monitor' | 'auto')}
            className="flex-1 min-w-0"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduling Configuration</CardTitle>
            <CardDescription>
              Configure how the automatic scheduling system should work
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postsPerDay">Posts per Day</Label>
                <Input
                  id="postsPerDay"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.postsPerDay}
                  onChange={(e) =>
                    setFormData({ ...formData, postsPerDay: parseInt(e.target.value) || 20 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxGroupsPerAccount">Max Groups per Account</Label>
                <Input
                  id="maxGroupsPerAccount"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.maxGroupsPerAccount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxGroupsPerAccount: parseInt(e.target.value) || 5 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startHour">Start Hour (24h)</Label>
                <Input
                  id="startHour"
                  type="number"
                  min="0"
                  max="23"
                  value={formData.startHour}
                  onChange={(e) =>
                    setFormData({ ...formData, startHour: parseInt(e.target.value) || 9 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endHour">End Hour (24h)</Label>
                <Input
                  id="endHour"
                  type="number"
                  min="0"
                  max="23"
                  value={formData.endHour}
                  onChange={(e) =>
                    setFormData({ ...formData, endHour: parseInt(e.target.value) || 18 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minIntervalMinutes">Min Interval (minutes)</Label>
                <Input
                  id="minIntervalMinutes"
                  type="number"
                  min="5"
                  max="240"
                  value={formData.minIntervalMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, minIntervalMinutes: parseInt(e.target.value) || 30 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baselineMinInterval">Baseline Min Interval</Label>
                <Input
                  id="baselineMinInterval"
                  type="number"
                  min="5"
                  max="240"
                  value={formData.baseline_min_interval}
                  onChange={(e) =>
                    setFormData({ ...formData, baseline_min_interval: parseInt(e.target.value) || 30 })
                  }
                />
              </div>
            </div>

            {/* Enhanced Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Enhanced Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="globalGroupCooldown">Global Group Cooldown (hours)</Label>
                  <Input
                    id="globalGroupCooldown"
                    type="number"
                    min="1"
                    max="168"
                    value={formData.global_group_cooldown_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, global_group_cooldown_hours: parseInt(e.target.value) || 72 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxGroupPostsPer24h">Max Posts per Group (24h)</Label>
                  <Input
                    id="maxGroupPostsPer24h"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_group_posts_per_24h}
                    onChange={(e) =>
                      setFormData({ ...formData, max_group_posts_per_24h: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crossAccountSpacing">Cross-account Spacing (minutes)</Label>
                  <Input
                    id="crossAccountSpacing"
                    type="number"
                    min="60"
                    max="480"
                    value={formData.cross_account_spacing_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, cross_account_spacing_minutes: parseInt(e.target.value) || 180 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duplicateContentWindow">Duplicate Content Window (days)</Label>
                  <Input
                    id="duplicateContentWindow"
                    type="number"
                    min="1"
                    max="30"
                    value={formData.duplicate_content_window_days}
                    onChange={(e) =>
                      setFormData({ ...formData, duplicate_content_window_days: parseInt(e.target.value) || 7 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intervalVariation">Interval Variation (%)</Label>
                  <Input
                    id="intervalVariation"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.interval_variation_pct}
                    onChange={(e) =>
                      setFormData({ ...formData, interval_variation_pct: parseInt(e.target.value) || 20 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stalenessDays">Staleness Days</Label>
                  <Input
                    id="stalenessDays"
                    type="number"
                    min="7"
                    max="90"
                    value={formData.staleness_days}
                    onChange={(e) =>
                      setFormData({ ...formData, staleness_days: parseInt(e.target.value) || 21 })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Ramp-up Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ramp-up Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialRampDelay">Initial Ramp Delay (hours)</Label>
                  <Input
                    id="initialRampDelay"
                    type="number"
                    min="24"
                    max="168"
                    value={formData.initial_ramp_delay_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, initial_ramp_delay_hours: parseInt(e.target.value) || 48 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rampWeek1MaxPosts">Week 1 Max Posts</Label>
                  <Input
                    id="rampWeek1MaxPosts"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.ramp_week1_max_posts}
                    onChange={(e) =>
                      setFormData({ ...formData, ramp_week1_max_posts: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rampWeek2MaxPosts">Week 2 Max Posts</Label>
                  <Input
                    id="rampWeek2MaxPosts"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.ramp_week2_max_posts}
                    onChange={(e) =>
                      setFormData({ ...formData, ramp_week2_max_posts: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoGenerate"
                  checked={formData.autoGenerate}
                  onChange={(e) =>
                    setFormData({ ...formData, autoGenerate: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="autoGenerate">Auto-generate tasks daily</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSaveConfig} disabled={saving}>
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>

              <Button variant="outline" onClick={handleGeneratePreview} disabled={generating}>
                {generating ? 'Generating...' : 'Generate Preview'}
              </Button>

              <Button variant="outline" onClick={handleGenerateTasks} disabled={generating}>
                Generate Today's Tasks
              </Button>

              <Button
                variant={formData.enabled ? 'destructive' : 'default'}
                onClick={handleToggleScheduling}
              >
                {formData.enabled ? 'Disable' : 'Enable'} Scheduling
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automatic Scheduling Tab */}
      {activeTab === 'auto' && (
        <div className="space-y-6">
          {/* Quick Setup Guide */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <span className="text-xl mr-2">🚀</span>
                Quick Setup Guide
              </CardTitle>
              <CardDescription className="text-blue-700">
                Get your automatic scheduling system running in minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <div className="font-medium">Add Facebook Accounts</div>
                      <div className="text-sm text-muted-foreground">Add at least 1 account (3+ recommended)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <div className="font-medium">Add Facebook Groups</div>
                      <div className="text-sm text-muted-foreground">Add groups your accounts have joined</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <div className="font-medium">Create Text Templates</div>
                      <div className="text-sm text-muted-foreground">Write content to post in groups</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <div className="font-medium">Configure Safety Settings</div>
                      <div className="text-sm text-muted-foreground">Set posting intervals and limits</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</div>
                    <div>
                      <div className="font-medium">Enable Auto-Scheduling</div>
                      <div className="text-sm text-muted-foreground">Turn on automatic task generation</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">6</div>
                    <div>
                      <div className="font-medium">Generate Tasks</div>
                      <div className="text-sm text-muted-foreground">Create daily posting schedule</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>🤖 Automatic Scheduling Status</CardTitle>
              <CardDescription>
                Monitor and control the automatic task scheduling system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className={`text-2xl font-bold ${schedulingStatus?.isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                    {schedulingStatus?.isEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </div>
                  <div className="text-sm text-muted-foreground">Scheduling Status</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className={`text-2xl font-bold ${schedulingStatus?.autoGenerate ? 'text-green-600' : 'text-yellow-600'}`}>
                    {schedulingStatus?.autoGenerate ? '🤖 Auto' : '👤 Manual'}
                  </div>
                  <div className="text-sm text-muted-foreground">Generation Mode</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {schedulingStatus?.todayTaskCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Today's Tasks</div>
                </div>
              </div>

              {/* Last Run Information */}
              {schedulingStatus?.lastRunDate && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">Last Run</div>
                      <div className="text-sm text-blue-700">
                        {schedulingStatus.lastRunDate.toLocaleDateString()} at {schedulingStatus.lastRunDate.toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant="default">Completed</Badge>
                  </div>
                </div>
              )}

              {/* Next Scheduled Run */}
              {schedulingStatus?.nextScheduledRun && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-green-900">Next Scheduled Run</div>
                      <div className="text-sm text-green-700">
                        Today at {schedulingStatus.nextScheduledRun.toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant="secondary">Scheduled</Badge>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleRunAutomaticScheduling}
                  disabled={autoScheduling || !schedulingStatus?.isEnabled}
                  className="flex-1 min-w-48"
                >
                  {autoScheduling ? '🚀 Running...' : '🚀 Run Automatic Scheduling'}
                </Button>

                <Button
                  variant="outline"
                  onClick={loadSchedulingStatus}
                  className="flex-1 min-w-48"
                >
                  🔄 Refresh Status
                </Button>
              </div>

              {!schedulingStatus?.isEnabled && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-yellow-800">
                    <strong>⚠️ Scheduling Disabled</strong>
                    <p className="mt-1 text-sm">
                      Enable scheduling in the Configuration tab to use automatic task generation.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduling Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Scheduling Statistics</CardTitle>
              <CardDescription>
                Overview of scheduling performance and safety metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {schedulingStatus?.configuration?.postsPerDay || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Posts/Day Target</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {schedulingStatus?.configuration?.maxGroupsPerAccount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Max Groups/Account</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {schedulingStatus?.configuration?.global_group_cooldown_hours || 0}h
                  </div>
                  <div className="text-sm text-muted-foreground">Group Cooldown</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {schedulingStatus?.configuration?.duplicate_content_window_days || 0}d
                  </div>
                  <div className="text-sm text-muted-foreground">Duplicate Window</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safety Features */}
          <Card>
            <CardHeader>
              <CardTitle>🛡️ Safety & Spam Prevention</CardTitle>
              <CardDescription>
                Built-in protection measures to prevent account restrictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="text-green-600 text-xl">✅</div>
                    <div>
                      <div className="font-medium">Account Rate Limiting</div>
                      <div className="text-sm text-muted-foreground">Respects Facebook's posting limits</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="text-green-600 text-xl">✅</div>
                    <div>
                      <div className="font-medium">Group Cooldown</div>
                      <div className="text-sm text-muted-foreground">Prevents spam in same groups</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="text-green-600 text-xl">✅</div>
                    <div>
                      <div className="font-medium">Duplicate Detection</div>
                      <div className="text-sm text-muted-foreground">Avoids repeated content</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 text-xl">⚡</div>
                    <div>
                      <div className="font-medium">Smart Rotation</div>
                      <div className="text-sm text-muted-foreground">Rotates accounts, groups & content</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 text-xl">⚡</div>
                    <div>
                      <div className="font-medium">Time Variation</div>
                      <div className="text-sm text-muted-foreground">Random intervals prevent patterns</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 text-xl">⚡</div>
                    <div>
                      <div className="font-medium">Ramp-up Protection</div>
                      <div className="text-sm text-muted-foreground">Gradual posting for new groups</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Preview</CardTitle>
            <CardDescription>
              Preview of the generated schedule for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Validation Results */}
            {preview.validation && (
              <div className="mb-6">
                {preview.validation.errors.length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-800">
                      <strong>Errors:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {preview.validation.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {preview.validation.warnings.length > 0 && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-yellow-800">
                      <strong>Warnings:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {preview.validation.warnings.map((warning: string, index: number) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            {preview.stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {preview.stats.totalGroups}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Groups</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {preview.stats.availableGroups}
                  </div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {preview.stats.activeAccounts}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Accounts</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {preview.stats.totalTemplates}
                  </div>
                  <div className="text-sm text-muted-foreground">Templates</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {preview.stats.totalMedia}
                  </div>
                  <div className="text-sm text-muted-foreground">Media Files</div>
                </div>
              </div>
            )}

            {/* Schedule Preview */}
            {preview.combinations && preview.combinations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Generated Schedule</h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {preview.combinations.map((combo, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {combo.template.title}
                          {combo.media && ` + ${combo.media.name}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {combo.group.name} ({combo.account.name})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          {combo.scheduledTime.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              System notifications and alerts for content refresh and usage tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={async () => {
                  try {
                    const config = await SettingsService.getSchedulingConfig();
                    if (config) {
                      await NotificationService.runNotificationChecks(config);
                      alert('Notification checks completed');
                      // Refresh notifications
                      const notifs = await NotificationService.getNotifications(20);
                      setNotifications(notifs);
                    }
                  } catch (error) {
                    alert('Error running notification checks');
                  }
                }}
              >
                Run Notification Checks
              </Button>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Recent Notifications</h3>
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border rounded-lg ${
                          notification.read ? 'bg-muted' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                notification.type === 'error' ? 'destructive' :
                                notification.type === 'warning' ? 'default' : 'secondary'
                              }>
                                {notification.type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {notification.created_at.toLocaleDateString()}
                              </span>
                            </div>
                            <div className="font-medium">{notification.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {notification.message}
                            </div>
                          </div>
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (notification.id) {
                                  NotificationService.markNotificationAsRead(notification.id);
                                  setNotifications(notifs =>
                                    notifs.map(n =>
                                      n.id === notification.id ? { ...n, read: true } : n
                                    )
                                  );
                                }
                              }}
                            >
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import/Export Tab */}
      {activeTab === 'import' && (
        <Card>
          <CardHeader>
            <CardTitle>Import/Export Groups</CardTitle>
            <CardDescription>
              Import groups with deduplication and export group assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Import Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Import Groups</h3>
              <div className="space-y-2">
                <Label htmlFor="importFile">Select CSV/JSON file</Label>
                <Input
                  id="importFile"
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>

              <Button
                onClick={async () => {
                  if (!importFile) {
                    alert('Please select a file first');
                    return;
                  }

                  try {
                    const text = await importFile.text();
                    let groups;

                    if (importFile.name.endsWith('.json')) {
                      groups = JSON.parse(text);
                    } else {
                      // Basic CSV parsing (you might want to use a proper CSV library)
                      const lines = text.split('\n').slice(1); // Skip header
                      groups = lines.map(line => {
                        const [fb_group_id, name, url, tags, language, account_id] = line.split(',');
                        return {
                          fb_group_id,
                          name,
                          url,
                          tags: tags ? tags.split(';') : [],
                          language,
                          account_id,
                        };
                      }).filter(g => g.fb_group_id);
                    }

                    const validation = ImportService.validateImportData(groups);
                    if (!validation.valid) {
                      alert(`Validation errors:\n${validation.errors.join('\n')}`);
                      return;
                    }

                    const preview = await ImportService.previewImport(groups);
                    if (confirm(`Import Preview:\nAdded: ${preview.wouldAdd}\nUpdated: ${preview.wouldUpdate}\nSkipped: ${preview.wouldSkip}\nErrors: ${preview.wouldError}\n\nProceed?`)) {
                      const result = await ImportService.importGroups(groups);
                      setImportResult(result);
                    }
                  } catch (error) {
                    alert(`Import error: ${error}`);
                  }
                }}
              >
                Import Groups
              </Button>

              {importResult && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{importResult.added}</div>
                      <div className="text-sm">Added</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                      <div className="text-sm">Updated</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                      <div className="text-sm">Skipped</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                      <div className="text-sm">Errors</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Export Group Assignments</h3>
              <Button
                onClick={async () => {
                  try {
                    const exportData = await ImportService.exportGroupAssignments();
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `group-assignments-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    alert(`Export error: ${error}`);
                  }
                }}
              >
                Export Group Assignments
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ramp-up Tab */}
      {activeTab === 'rampup' && (
        <Card>
          <CardHeader>
            <CardTitle>Ramp-up Management</CardTitle>
            <CardDescription>
              Monitor and manage groups in ramp-up period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={async () => {
                try {
                  const stats = await RampUpService.getRampUpStats();
                  setRampUpStats(stats);
                } catch (error) {
                  alert(`Error loading ramp-up stats: ${error}`);
                }
              }}
            >
              Load Ramp-up Statistics
            </Button>

            {rampUpStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {rampUpStats.totalGroupsInRampUp}
                  </div>
                  <div className="text-sm text-muted-foreground">Groups in Ramp-up</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Object.keys(rampUpStats.groupsByPhase).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Phases</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {rampUpStats.recentlyGraduated}
                  </div>
                  <div className="text-sm text-muted-foreground">Recently Graduated</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Ramp-up Phases</h3>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Initial Delay</div>
                  <div className="text-sm text-muted-foreground">
                    {formData.initial_ramp_delay_hours} hours before first post
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Week 1</div>
                  <div className="text-sm text-muted-foreground">
                    Max {formData.ramp_week1_max_posts} post(s) with 48+ hour spacing
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Week 2</div>
                  <div className="text-sm text-muted-foreground">
                    Max {formData.ramp_week2_max_posts} post(s) per 48-72 hours
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monitor Tab */}
       {activeTab === 'monitor' && (
         <div className="space-y-6">
           {/* Global Coordination Status */}
           <Card>
             <CardHeader>
               <CardTitle>Global Coordination Status</CardTitle>
               <CardDescription>
                 Monitor cross-account and cross-group coordination to prevent spam and maintain safety
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
               <Button
                 onClick={async () => {
                   try {
                     // Refresh global coordination stats
                     const stats = await SchedulingService.getSchedulingStats();
                     setPreview(prev => prev ? { ...prev, stats } : null);

                     // Get group state summary
                     const groupStates = await GroupStateService.getGroupStateSummary();
                     setGroupStateSummary(groupStates);
                   } catch (error) {
                     alert(`Error loading coordination stats: ${error}`);
                   }
                 }}
               >
                 Refresh Global Status
               </Button>

               {/* Global Coordination Metrics */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-blue-600">
                     {groupStateSummary?.totalGroups || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">Total Groups</div>
                 </div>

                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-green-600">
                     {groupStateSummary?.groupsInCooldown || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">In Cooldown</div>
                 </div>

                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-orange-600">
                     {groupStateSummary?.groupsAtDailyLimit || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">At Daily Limit</div>
                 </div>

                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-purple-600">
                     {groupStateSummary?.avgPostsPerGroup || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">Avg Posts/Group</div>
                 </div>
               </div>

               {/* Group Cooldown Status */}
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold">Group Cooldown Status</h3>
                 <div className="space-y-2 max-h-64 overflow-y-auto">
                   {groupStateSummary?.cooldownGroups.map((group, index) => (
                     <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                       <div className="flex-1">
                         <div className="font-medium">{group.name}</div>
                         <div className="text-sm text-muted-foreground">
                           Last post: {group.lastPostAt ? new Date(group.lastPostAt).toLocaleString() : 'Never'}
                         </div>
                       </div>
                       <div className="text-right">
                         <Badge variant={group.inCooldown ? 'destructive' : 'default'}>
                           {group.inCooldown ? 'In Cooldown' : 'Available'}
                         </Badge>
                         {group.inCooldown && group.nextAvailableAt && (
                           <div className="text-xs text-muted-foreground mt-1">
                             Available: {new Date(group.nextAvailableAt).toLocaleTimeString()}
                           </div>
                         )}
                       </div>
                     </div>
                   )) || (
                     <div className="text-center py-4 text-muted-foreground">
                       No groups in cooldown
                     </div>
                   )}
                 </div>
               </div>

               {/* Cross-Account Coordination */}
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold">Cross-Account Coordination</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-4 border rounded-lg">
                     <div className="font-medium mb-2">Current Configuration</div>
                     <div className="space-y-2 text-sm">
                       <div>Global Cooldown: {formData.global_group_cooldown_hours}h</div>
                       <div>Cross-Account Spacing: {formData.cross_account_spacing_minutes}m</div>
                       <div>Max Posts/Group/Day: {formData.max_group_posts_per_24h}</div>
                       <div>Duplicate Window: {formData.duplicate_content_window_days}d</div>
                     </div>
                   </div>

                   <div className="p-4 border rounded-lg">
                     <div className="font-medium mb-2">Safety Metrics</div>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span>Spam Prevention:</span>
                         <Badge variant="default">Active</Badge>
                       </div>
                       <div className="flex justify-between">
                         <span>Duplicate Detection:</span>
                         <Badge variant="default">Active</Badge>
                       </div>
                       <div className="flex justify-between">
                         <span>Rate Limiting:</span>
                         <Badge variant="default">Active</Badge>
                       </div>
                       <div className="flex justify-between">
                         <span>Cross-Account Sync:</span>
                         <Badge variant="default">Active</Badge>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* System Health */}
           <Card>
             <CardHeader>
               <CardTitle>System Health</CardTitle>
               <CardDescription>
                 Overall system status and recent activity
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-primary">
                     {preview?.stats.totalGroups || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">Total Groups</div>
                 </div>

                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-green-600">
                     {preview?.stats.availableGroups || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">Available</div>
                 </div>

                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-blue-600">
                     {preview?.stats.activeAccounts || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">Active Accounts</div>
                 </div>

                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-purple-600">
                     {preview?.stats.totalTemplates || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">Templates</div>
                 </div>

                 <div className="text-center p-4 bg-muted rounded-lg">
                   <div className="text-2xl font-bold text-orange-600">
                     {preview?.stats.totalMedia || 0}
                   </div>
                   <div className="text-sm text-muted-foreground">Media Files</div>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
       )}
    </div>
  );
}
