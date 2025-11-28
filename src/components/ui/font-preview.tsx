'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FontPreview() {
  const [activeWeight, setActiveWeight] = useState(400);

  const weights = [
    { value: 100, label: 'Thin (100)' },
    { value: 200, label: 'Extra Light (200)' },
    { value: 300, label: 'Light (300)' },
    { value: 400, label: 'Regular (400)' },
    { value: 500, label: 'Medium (500)' },
    { value: 600, label: 'Semi Bold (600)' },
    { value: 700, label: 'Bold (700)' },
    { value: 800, label: 'Extra Bold (800)' },
    { value: 900, label: 'Black (900)' }
  ];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Inter Font Demonstration</CardTitle>
          <p className="text-muted-foreground">
            Professional typography with enhanced readability and modern aesthetics
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Typography Hierarchy */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Heading 1 - 36px Bold</h1>
            <h2 className="text-3xl font-semibold">Heading 2 - 30px Semi Bold</h2>
            <h3 className="text-2xl font-semibold">Heading 3 - 24px Semi Bold</h3>
            <h4 className="text-xl font-medium">Heading 4 - 20px Medium</h4>
            <h5 className="text-lg font-medium">Heading 5 - 18px Medium</h5>
            <h6 className="text-base font-semibold">Heading 6 - 16px Semi Bold</h6>
          </div>

          {/* Body Text */}
          <div className="space-y-3">
            <p className="text-lg leading-relaxed">
              Large body text (18px) - Perfect for important descriptions and hero sections. 
              The Inter font family provides excellent readability across all sizes.
            </p>
            <p className="text-base leading-relaxed">
              Regular body text (16px) - Ideal for standard content. The optimized letter spacing 
              and carefully crafted line height make reading comfortable for extended periods.
            </p>
            <p className="text-sm leading-relaxed">
              Small text (14px) - Excellent for captions, metadata, and secondary information. 
              Maintains readability even at smaller sizes.
            </p>
            <p className="text-xs leading-relaxed">
              Caption text (12px) - Perfect for fine print, timestamps, and compact information. 
              Still maintains clear readability.
            </p>
          </div>

          {/* Weight Demonstration */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Font Weights</h3>
            <div className="flex flex-wrap gap-2">
              {weights.map((weight) => (
                <Button
                  key={weight.value}
                  variant={activeWeight === weight.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveWeight(weight.value)}
                  className="font-medium"
                  style={{ fontWeight: weight.value }}
                >
                  {weight.label}
                </Button>
              ))}
            </div>
            <p 
              className="text-2xl"
              style={{ fontWeight: activeWeight }}
            >
              The quick brown fox jumps over the lazy dog
            </p>
            <p 
              className="text-lg"
              style={{ fontWeight: activeWeight }}
            >
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </p>
            <p 
              className="text-base"
              style={{ fontWeight: activeWeight }}
            >
              abcdefghijklmnopqrstuvwxyz 0123456789
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">Typography Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Enhanced Readability</h4>
                <p className="text-sm text-muted-foreground">
                  Optimized letter spacing, proper optical sizing, and improved kerning 
                  for better reading experience.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Professional Appearance</h4>
                <p className="text-sm text-muted-foreground">
                  Clean, modern design that conveys professionalism and trustworthiness 
                  for business applications.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Wide Weight Range</h4>
                <p className="text-sm text-muted-foreground">
                  Nine weight variations from Thin (100) to Black (900) provide 
                  excellent typographic hierarchy options.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Excellent Screen Display</h4>
                <p className="text-sm text-muted-foreground">
                  Optimized for digital displays with improved pixel hinting and 
                  crisp rendering on all screen types.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
