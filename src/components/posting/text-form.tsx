'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PostingTaskService } from '@/lib/services/posting-task-service';
import { PostingText } from '@/lib/types';
import { X, Plus, Save } from 'lucide-react';

interface TextFormProps {
  text?: PostingText;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TextForm({ text, onSuccess, onCancel }: TextFormProps) {
  const [content, setContent] = useState(text?.content || '');
  const [tags, setTags] = useState<string[]>(text?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    setSaving(true);
    try {
      if (text?.id) {
        // Update existing text
        // Note: This would require an update method in the service
        console.log('Update text:', { id: text.id, content, tags });
      } else {
        // Create new text
        await PostingTaskService.createText({
          content: content.trim(),
          tags,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save text:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{text ? 'Edit Text' : 'Add New Text'}</CardTitle>
        <CardDescription>
          {text ? 'Update the text content and tags' : 'Create reusable text content for posting tasks'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Text Content */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Text Content</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter the text content for posting..."
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            {content.length} characters
          </p>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Tags</label>
          <p className="text-xs text-gray-600">
            Add tags to categorize and match texts with groups (e.g., "promo", "info", "testimonial")
          </p>

          {/* Add Tag Input */}
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Tags Display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    title={`Remove ${tag} tag`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Preview</label>
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{content || 'No content'}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Text'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
