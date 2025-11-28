'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Template, CreateTemplateData } from '@/lib/types';
import { TemplateService } from '@/lib/services/template-service';
import { useAuth } from '@/lib/auth-context';

interface TemplateFormProps {
  template?: Template;
  onSuccess: () => void;
  onCancel: () => void;
}

const COMMON_PLACEHOLDERS = [
  'city', 'name', 'price', 'date', 'time', 'location',
  'company', 'product', 'service', 'phone', 'email',
  'website', 'address', 'description'
];

export function TemplateForm({ template, onSuccess, onCancel }: TemplateFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateTemplateData>({
    title: template?.title || '',
    body: template?.body || '',
    placeholders: template?.placeholders || [],
  });
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update preview when body or placeholders change
  useEffect(() => {
    if (formData.body) {
      const detectedPlaceholders = TemplateService.extractPlaceholders(formData.body);
      if (detectedPlaceholders.length !== formData.placeholders.length) {
        setFormData(prev => ({ ...prev, placeholders: detectedPlaceholders }));
      }
    }
    updatePreview();
  }, [formData.body, formData.placeholders]);

  const updatePreview = () => {
    if (!formData.body) {
      setPreviewText('');
      return;
    }

    // Create sample values for placeholders
    const sampleValues: Record<string, string> = {};
    formData.placeholders.forEach(placeholder => {
      sampleValues[placeholder] = `[${placeholder.toUpperCase()}]`;
    });

    setPreviewText(TemplateService.replacePlaceholders(formData.body, sampleValues));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      if (template?.id) {
        // Update existing template
        await TemplateService.updateTemplate(template.id, formData);
      } else {
        // Create new template
        await TemplateService.createTemplate(formData, user.uid);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateTemplateData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addPlaceholder = () => {
    if (newPlaceholder.trim() && !formData.placeholders.includes(newPlaceholder.trim())) {
      handleChange('placeholders', [...formData.placeholders, newPlaceholder.trim()]);
      setNewPlaceholder('');
    }
  };

  const removePlaceholder = (placeholderToRemove: string) => {
    handleChange('placeholders', formData.placeholders.filter(p => p !== placeholderToRemove));
  };

  const addCommonPlaceholder = (placeholder: string) => {
    if (!formData.placeholders.includes(placeholder)) {
      handleChange('placeholders', [...formData.placeholders, placeholder]);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{template ? 'Edit Template' : 'Create New Template'}</CardTitle>
        <CardDescription>
          {template ? 'Update the posting template' : 'Create a reusable template with placeholders for dynamic content'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Template Title</Label>
            <Input
              id="title"
              placeholder="Enter template title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Template Body</Label>
            <Textarea
              id="body"
              placeholder="Enter your template content. Use {placeholder} for dynamic values like {city}, {price}, etc."
              value={formData.body}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('body', e.target.value)}
              rows={8}
              required
            />
            <p className="text-sm text-gray-600">
              Use {'{placeholder}'} syntax for dynamic content. Placeholders will be automatically detected.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Placeholders</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom placeholder"
                value={newPlaceholder}
                onChange={(e) => setNewPlaceholder(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPlaceholder())}
              />
              <Button type="button" onClick={addPlaceholder} variant="outline">
                Add
              </Button>
            </div>

            {/* Common placeholders */}
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">Common placeholders:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_PLACEHOLDERS.filter(p => !formData.placeholders.includes(p)).map((placeholder) => (
                  <Button
                    key={placeholder}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCommonPlaceholder(placeholder)}
                  >
                    {placeholder}
                  </Button>
                ))}
              </div>
            </div>

            {/* Current placeholders */}
            {formData.placeholders.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">Current placeholders:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.placeholders.map((placeholder) => (
                    <Badge
                      key={placeholder}
                      variant="default"
                      className="cursor-pointer"
                      onClick={() => removePlaceholder(placeholder)}
                    >
                      {`{${placeholder}}`} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {previewText && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Card className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="whitespace-pre-wrap text-sm">{previewText}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {template && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Template Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Usage Count:</span>
                  <span className="ml-2 font-medium">{template.usageCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2">{template.createdAt?.toLocaleDateString()}</span>
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
              {loading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
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
