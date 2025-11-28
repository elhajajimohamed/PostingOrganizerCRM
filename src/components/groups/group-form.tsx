'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FacebookGroup, CreateGroupData } from '@/lib/types';
import { GroupService } from '@/lib/services/group-service';

interface GroupFormProps {
  group?: FacebookGroup;
  onSuccess: () => void;
  onCancel: () => void;
}

const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Arabic', 'Chinese', 'Japanese', 'Korean', 'Hindi', 'Russian',
  'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish',
  'Turkish', 'Hebrew', 'Thai', 'Vietnamese', 'Indonesian'
];

export function GroupForm({ group, onSuccess, onCancel }: GroupFormProps) {
  const [formData, setFormData] = useState<CreateGroupData>({
    name: group?.name || '',
    url: group?.url || '',
    tags: group?.tags || [],
    language: group?.language || 'English',
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (group?.id) {
        // Update existing group
        await GroupService.updateGroup(group.id, formData);
      } else {
        // Create new group
        await GroupService.createGroup(formData);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateGroupData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{group ? 'Edit Group' : 'Add New Group'}</CardTitle>
        <CardDescription>
          {group ? 'Update the Facebook group information' : 'Add a new Facebook group to organize your posting targets'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="Enter group name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Group URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://facebook.com/groups/..."
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={formData.language} onValueChange={(value) => handleChange('language', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select group language" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {group && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Group Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Last Post:</span>
                  <span className="ml-2">
                    {group.lastPostAt ? group.lastPostAt.toLocaleDateString() : 'Never'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Warnings:</span>
                  <span className="ml-2">{group.warningCount}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : (group ? 'Update Group' : 'Create Group')}
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
