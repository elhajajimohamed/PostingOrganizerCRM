'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FacebookAccount, CreateAccountData } from '@/lib/types';
import { AccountService } from '@/lib/services/account-service';
import { MediaService } from '@/lib/services/media-service';
import { SettingsService } from '@/lib/services/settings-service';
import { useAuth } from '@/lib/auth-context';

interface AccountFormProps {
  account?: FacebookAccount;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateAccountData>({
    name: account?.name || '',
    accountId: account?.accountId || '',
    profileImage: account?.profileImage || '',
    status: account?.status || 'active',
    browser: account?.browser || '',
    notes: account?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [browsers, setBrowsers] = useState<string[]>(['Chrome', 'Firefox', 'Edge', 'Safari', 'Opera', 'Other']);

  // Load browsers from settings
  useEffect(() => {
    const loadBrowsers = async () => {
      try {
        const settings = await SettingsService.getSettings();
        console.log('Settings loaded:', settings);
        if (settings?.browsers && settings.browsers.length > 0) {
          console.log('Custom browsers loaded:', settings.browsers);
          setBrowsers(settings.browsers);
        } else {
          console.log('Using default browsers');
          setBrowsers(['Chrome', 'Firefox', 'Edge', 'Safari', 'Opera', 'Other']);
        }
      } catch (err) {
        console.error('Failed to load browsers from settings:', err);
        // Keep default browsers if settings fail to load
        setBrowsers(['Chrome', 'Firefox', 'Edge', 'Safari', 'Opera', 'Other']);
      }
    };

    loadBrowsers();
  }, []);

  // Handle existing account browser validation
  useEffect(() => {
    if (account?.browser && browsers.length > 0) {
      if (!browsers.includes(account.browser)) {
        console.log('Existing account browser not in current list:', account.browser);
        // For existing accounts, we'll add the browser to the list temporarily
        // so the account can still be edited and saved
        setBrowsers(prev => [...prev, account.browser!]);
      }
    }
  }, [account?.browser, browsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (account?.id) {
        // Update existing account
        await AccountService.updateAccount(account.id, formData);
      } else {
        // Create new account
        await AccountService.createAccount(formData);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateAccountData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB for profile images)
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      // Upload to Firebase Storage in a 'profiles' folder
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `${timestamp}_${file.name}`;

      // Use MediaService for consistent upload handling
      const category = 'Profile Images';
      const mediaId = await MediaService.uploadMedia(file, category, user.uid);

      // Get the uploaded media URL
      const uploadedMedia = await MediaService.getMediaById(mediaId);
      if (uploadedMedia) {
        setFormData(prev => ({
          ...prev,
          profileImage: uploadedMedia.url,
        }));
      }
    } catch (err: any) {
      console.error('Profile image upload failed:', err);
      setError(err.message || 'Failed to upload profile image');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{account ? 'Edit Account' : 'Add New Account'}</CardTitle>
        <CardDescription>
          {account ? 'Update the Facebook account information' : 'Create a new Facebook account to manage'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                placeholder="Enter account name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID</Label>
              <Input
                id="accountId"
                placeholder="Enter Facebook account ID"
                value={formData.accountId}
                onChange={(e) => handleChange('accountId', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="browser">Browser</Label>
            <Select value={formData.browser} onValueChange={(value: string) => handleChange('browser', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select browser for this account" />
              </SelectTrigger>
              <SelectContent>
                {browsers.map((browser) => (
                  <SelectItem key={browser} value={browser}>
                    {browser}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Profile Image</Label>

            {/* Image Upload Area */}
            <div className="flex items-center gap-4">
              {/* Current/Preview Image */}
              <div className="flex-shrink-0">
                {formData.profileImage ? (
                  <img
                    src={formData.profileImage}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg ${formData.profileImage ? 'hidden' : ''}`}>
                  {formData.name.charAt(0).toUpperCase() || '?'}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    disabled={uploadingImage}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadingImage && (
                    <div className="flex items-center text-blue-600">
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Uploading...</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload a profile image (max 5MB) or leave empty for default avatar
                </p>
              </div>
            </div>

            {/* Manual URL Input (Optional) */}
            <details className="mt-3">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                Or enter image URL manually
              </summary>
              <Input
                placeholder="https://example.com/profile-image.jpg"
                value={formData.profileImage}
                onChange={(e) => handleChange('profileImage', e.target.value)}
                className="mt-2"
              />
            </details>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: string) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select account status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="limited">Limited</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this account"
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : (account ? 'Update Account' : 'Create Account')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
