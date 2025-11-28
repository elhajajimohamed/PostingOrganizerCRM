'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, PhoneDetectionConfig } from '@/lib/types';
import { SettingsService } from '@/lib/services/settings-service';
import { useAuth } from '@/lib/auth-context';
import { PhoneDetectionService, COUNTRY_RULES } from '@/lib/services/phone-detection-service';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

interface SettingsFormProps {
  onSuccess?: () => void;
}

export function SettingsForm({ onSuccess }: SettingsFormProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [formData, setFormData] = useState({
    maxPostsPerHour: 5,
    cooldownMinutes: 60,
  });
  const [browsers, setBrowsers] = useState<string[]>(['Chrome', 'Firefox', 'Edge', 'Safari', 'Opera', 'Other']);
  const [newBrowser, setNewBrowser] = useState('');
  const [bulkBrowsers, setBulkBrowsers] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [phoneDetectionConfig, setPhoneDetectionConfig] = useState<PhoneDetectionConfig>({
    countryRules: COUNTRY_RULES || {}
  });
  const [migratingPhoneDetection, setMigratingPhoneDetection] = useState(false);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const currentSettings = await SettingsService.getSettings();
        if (currentSettings) {
          setSettings(currentSettings);
          setFormData({
            maxPostsPerHour: currentSettings.maxPostsPerHour,
            cooldownMinutes: currentSettings.cooldownMinutes,
          });
          console.log('Loading browsers from settings:', currentSettings.browsers);
          setBrowsers(currentSettings.browsers && currentSettings.browsers.length > 0
            ? currentSettings.browsers
            : ['Chrome', 'Firefox', 'Edge', 'Safari', 'Opera', 'Other']);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setValidationErrors([]);

    // Validate settings
    const validation = SettingsService.validateSettings(formData);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setSaving(false);
      return;
    }

    try {
      await SettingsService.updateSettings(formData, user.uid);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: numValue,
    }));

    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleAddBrowser = () => {
    if (newBrowser.trim() && !browsers.includes(newBrowser.trim())) {
      setBrowsers(prev => [...prev, newBrowser.trim()]);
      setNewBrowser('');
    }
  };

  const handleBulkAddBrowsers = () => {
    if (!bulkBrowsers.trim()) return;

    console.log('Processing bulk browsers input:', bulkBrowsers);
    const browserList = bulkBrowsers
      .split(',')
      .map(browser => browser.trim())
      .filter(browser => browser.length > 0 && !browsers.includes(browser));

    console.log('Filtered browser list:', browserList);

    if (browserList.length > 0) {
      const newBrowsers = [...browsers, ...browserList];
      console.log('New complete browser list:', newBrowsers);
      setBrowsers(newBrowsers);
      setBulkBrowsers('');

      // Show success message
      const message = `✅ Added ${browserList.length} browser(s): ${browserList.join(', ')}`;
      alert(message);
    } else {
      alert('ℹ️ No new browsers to add. Check for duplicates or empty entries.');
    }
  };

  const handleRemoveBrowser = (browserToRemove: string) => {
    if (browsers.length > 1) {
      setBrowsers(prev => prev.filter(browser => browser !== browserToRemove));
    }
  };

  const handleSaveBrowsers = async () => {
    if (!user) return;

    setSaving(true);
    setError('');

    try {
      console.log('Saving browsers:', browsers);
      await SettingsService.updateBrowserSettings(browsers, user.uid);
      console.log('Browsers saved successfully');
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to save browsers:', err);
      setError(err.message || 'Failed to save browser settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMigratePhoneDetection = async () => {
    setMigratingPhoneDetection(true);
    setError('');

    try {
      console.log('🔄 Starting phone detection migration...');

      const response = await fetch('/api/external-crm/migrate-phone-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Remove timeout for large migrations - let it run as long as needed
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Migration completed:', result.data);
        alert(`✅ Phone detection migration completed!\n\nMigrated: ${result.data.migrated} call centers\nErrors: ${result.data.errors}`);
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Migration failed');
      }
    } catch (err: any) {
      console.error('❌ Phone detection migration failed:', err);

      if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
        setError('Migration is taking longer than expected. Please check the browser console for progress updates.');
      } else {
        setError(err.message || 'Failed to migrate phone detection');
      }
    } finally {
      setMigratingPhoneDetection(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const exportData = await SettingsService.exportAllData();

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `posting-organizer-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">⚙️</div>
          <h3 className="text-lg font-semibold mb-2">Settings not available</h3>
          <p className="text-gray-600">Unable to load application settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Application Settings</h2>
        <p className="text-gray-600">Configure posting rules and system preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posting Rules</CardTitle>
          <CardDescription>
            Configure rate limits and cooldown periods for posting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="maxPostsPerHour">Max Posts Per Hour</Label>
                <Input
                  id="maxPostsPerHour"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxPostsPerHour}
                  onChange={(e) => handleChange('maxPostsPerHour', e.target.value)}
                  required
                />
                <p className="text-sm text-gray-600">
                  Maximum number of posts allowed per account per hour (1-100)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldownMinutes">Cooldown Period (Minutes)</Label>
                <Input
                  id="cooldownMinutes"
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.cooldownMinutes}
                  onChange={(e) => handleChange('cooldownMinutes', e.target.value)}
                  required
                />
                <p className="text-sm text-gray-600">
                  Minimum time between posts for the same account (1-1440 minutes)
                </p>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export application data for backup or analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Current Settings</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Max Posts/Hour:</span>
                  <span className="ml-2 font-medium">{settings.maxPostsPerHour}</span>
                </div>
                <div>
                  <span className="text-gray-600">Cooldown:</span>
                  <span className="ml-2 font-medium">{settings.cooldownMinutes} minutes</span>
                </div>
                <div>
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="ml-2">
                    {settings.updatedAt?.toLocaleDateString()} {settings.updatedAt?.toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Updated By:</span>
                  <span className="ml-2">{settings.updatedBy || 'System'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Exporting...' : 'Export All Data (JSON)'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Examples</CardTitle>
          <CardDescription>
            Understanding how the posting rules work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900">Rate Limiting</h4>
              <p className="text-blue-800">
                With max {formData.maxPostsPerHour} posts per hour, an account can post up to {formData.maxPostsPerHour} times
                within any 60-minute window. After reaching this limit, posting will be blocked until
                the oldest post in that window expires.
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-green-900">Cooldown Period</h4>
              <p className="text-green-800">
                The {formData.cooldownMinutes}-minute cooldown ensures at least {formData.cooldownMinutes} minutes pass
                between consecutive posts from the same account, preventing spam-like behavior.
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-yellow-900">Combined Rules</h4>
              <p className="text-yellow-800">
                Both rules apply simultaneously. An account must satisfy both the hourly rate limit
                AND the cooldown period before it can post again.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Browser Configuration</CardTitle>
          <CardDescription>
            Manage the list of browsers available for Facebook accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Single Browser Add */}
            <div className="flex gap-2">
              <Input
                placeholder="Add new browser"
                value={newBrowser}
                onChange={(e) => setNewBrowser(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddBrowser()}
              />
              <Button onClick={handleAddBrowser} disabled={!newBrowser.trim()}>
                Add Browser
              </Button>
            </div>

            {/* Bulk Browser Import */}
            <div className="space-y-2">
              <Label>Bulk Import Browsers</Label>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Chrome, Firefox, Edge, Safari, Opera, Brave, Vivaldi"
                  value={bulkBrowsers}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkBrowsers(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button onClick={handleBulkAddBrowsers} disabled={!bulkBrowsers.trim()}>
                  Add Multiple
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Enter multiple browsers separated by commas. Duplicates will be ignored.
              </p>

              {/* Quick Examples */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Quick Examples:</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkBrowsers('Chrome, Firefox, Edge, Safari, Opera')}
                    className="text-xs h-6"
                  >
                    Basic 5
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkBrowsers('Chrome, Firefox, Edge, Safari, Opera, Brave, Vivaldi, Tor')}
                    className="text-xs h-6"
                  >
                    Extended 8
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkBrowsers('Chrome, Firefox, Safari')}
                    className="text-xs h-6"
                  >
                    Mobile 3
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Configured Browsers</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {browsers.map((browser) => (
                  <div
                    key={browser}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm font-medium">{browser}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBrowser(browser)}
                      disabled={browsers.length === 1}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              {browsers.length === 1 && (
                <p className="text-sm text-gray-500">
                  At least one browser must be configured
                </p>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={handleSaveBrowsers} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Browser Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phone Detection Configuration</CardTitle>
          <CardDescription>
            Configure mobile number prefixes for each country to improve WhatsApp detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(phoneDetectionConfig.countryRules).map(([country, rules]) => (
              <div key={country} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">{country}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Country Code</Label>
                    <Input
                      value={rules.cc}
                      onChange={(e) => setPhoneDetectionConfig(prev => ({
                        ...prev,
                        countryRules: {
                          ...prev.countryRules,
                          [country]: { ...rules, cc: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Prefixes (comma-separated)</Label>
                    <Input
                      value={rules.prefixes.join(', ')}
                      onChange={(e) => setPhoneDetectionConfig(prev => ({
                        ...prev,
                        countryRules: {
                          ...prev.countryRules,
                          [country]: { ...rules, prefixes: e.target.value.split(',').map(p => p.trim()).filter(p => p) }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>NSN Length (min-max)</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        value={rules.nsnLength.min}
                        onChange={(e) => setPhoneDetectionConfig(prev => ({
                          ...prev,
                          countryRules: {
                            ...prev.countryRules,
                            [country]: { ...rules, nsnLength: { ...rules.nsnLength, min: parseInt(e.target.value) || 0 } }
                          }
                        }))}
                      />
                      <Input
                        type="number"
                        value={rules.nsnLength.max}
                        onChange={(e) => setPhoneDetectionConfig(prev => ({
                          ...prev,
                          countryRules: {
                            ...prev.countryRules,
                            [country]: { ...rules, nsnLength: { ...rules.nsnLength, max: parseInt(e.target.value) || 0 } }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900">Data Migration</h4>
              <p className="text-blue-800 text-sm mb-3">
                If you have existing call centers in your database that don't show WhatsApp buttons,
                use the migration tool below to update them with phone detection data.
              </p>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => {
                // Save phone detection config
                console.log('Saving phone detection config:', phoneDetectionConfig);
                alert('Phone detection config saved (implement save logic)');
              }}>
                Save Phone Detection Settings
              </Button>
              <Button
                variant="outline"
                onClick={handleMigratePhoneDetection}
                disabled={migratingPhoneDetection}
                className="flex items-center space-x-2"
              >
                {migratingPhoneDetection ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    <span>Migrating... (Check Console)</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Migrate Existing Data</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
