'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Globe,
  Facebook,
  Linkedin,
  Phone,
  Search,
  Settings,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  MapPin,
  Target
} from 'lucide-react';
import { AutomatedDiscoveryService } from '@/lib/services/automated-discovery-service';

interface ScrapingControlsProps {
  onScrape: (country: string, source: string) => void;
  loading?: boolean;
}

const COUNTRIES = [
  { value: 'Morocco', label: '🇲🇦 Morocco', cities: ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger'] },
  { value: 'Tunisia', label: '🇹🇳 Tunisia', cities: ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte'] },
  { value: 'Senegal', label: '🇸🇳 Senegal', cities: ['Dakar', 'Thiès', 'Touba', 'Rufisque', 'Kaolack'] },
  { value: 'Ivory Coast', label: '🇨🇮 Ivory Coast', cities: ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'Korhogo'] },
  { value: 'Guinea', label: '🇬🇳 Guinea', cities: ['Conakry', 'Nzérékoré', 'Kindia', 'Kankan', 'Labé'] },
  { value: 'Cameroon', label: '🇨🇲 Cameroon', cities: ['Yaoundé', 'Douala', 'Garoua', 'Bamenda', 'Maroua'] }
];

const SOURCES = [
  { value: 'google', label: 'Google Search', icon: Globe, description: 'Search Google for call centers' },
  { value: 'facebook', label: 'Facebook Pages', icon: Facebook, description: 'Find business pages on Facebook' },
  { value: 'linkedin', label: 'LinkedIn Companies', icon: Linkedin, description: 'Discover companies on LinkedIn' },
  { value: 'yellowpages', label: 'Yellow Pages', icon: Phone, description: 'Business directory listings' }
];

interface DiscoveryStats {
  totalSuggestions: number;
  bySource: Record<string, number>;
  byCountry: Record<string, number>;
  recentActivity: number;
}

export function ScrapingControls({ onScrape, loading = false }: ScrapingControlsProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('google');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [maxResults, setMaxResults] = useState<number>(50);
  const [customKeywords, setCustomKeywords] = useState<string>('');
  const [radius, setRadius] = useState<number>(50);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<DiscoveryStats | null>(null);
  const [activeTab, setActiveTab] = useState('discover');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await AutomatedDiscoveryService.getScrapingStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleStartDiscovery = async () => {
    if (!selectedCountry) return;

    setIsRunning(true);

    try {
      const options = {
        maxResults,
        customKeywords: customKeywords ? customKeywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
        location: selectedCity || AutomatedDiscoveryService.getMainCity(selectedCountry),
        radius
      };

      await AutomatedDiscoveryService.startDiscovery(
        selectedCountry,
        selectedSource as 'google' | 'facebook' | 'linkedin' | 'yellowpages',
        options
      );

      // Refresh stats
      await loadStats();

      alert(`Automated discovery started for ${selectedCountry}! Results will appear in suggestions.`);

    } catch (error) {
      console.error('Error starting discovery:', error);
      alert('Failed to start automated discovery. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const selectedCountryData = COUNTRIES.find(c => c.value === selectedCountry);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discover" className="flex items-center">
            <Bot className="w-4 h-4 mr-2" />
            Automated Discovery
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Discovery Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                AI-Powered Lead Discovery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Country and Source Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Target Country *</Label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="source">Discovery Source</Label>
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(source => {
                        const Icon = source.icon;
                        return (
                          <SelectItem key={source.value} value={source.value}>
                            <div className="flex items-center">
                              <Icon className="w-4 h-4 mr-2" />
                              {source.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location Settings */}
              {selectedCountry && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Primary City (Optional)</Label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary city or leave blank for all" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Cities</SelectItem>
                        {selectedCountryData?.cities.map(city => (
                          <SelectItem key={city} value={city}>
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              {city}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="radius">Search Radius (km)</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value) || 50)}
                      min="10"
                      max="200"
                    />
                  </div>
                </div>
              )}

              {/* Advanced Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Advanced Settings</Label>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxResults">Maximum Results</Label>
                    <Input
                      id="maxResults"
                      type="number"
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value) || 50)}
                      min="10"
                      max="200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="keywords">Custom Keywords (Optional)</Label>
                    <Input
                      id="keywords"
                      value={customKeywords}
                      onChange={(e) => setCustomKeywords(e.target.value)}
                      placeholder="e.g., télémarketing, centre d'appel, BPO"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  <p>🤖 AI will automatically discover and filter high-quality leads</p>
                  <p>✨ Smart filtering removes duplicates and low-quality suggestions</p>
                </div>
                <Button
                  onClick={handleStartDiscovery}
                  disabled={!selectedCountry || isRunning}
                  className="min-w-48"
                >
                  {isRunning ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-pulse" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Start AI Discovery
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Source Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discovery Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SOURCES.map(source => {
                  const Icon = source.icon;
                  return (
                    <div key={source.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium">{source.label}</p>
                        <p className="text-sm text-gray-600">{source.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Discovery Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{stats.totalSuggestions}</p>
                      <p className="text-sm text-gray-600">Total Suggestions</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{stats.recentActivity}</p>
                      <p className="text-sm text-gray-600">This Week</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {Object.keys(stats.bySource).length}
                      </p>
                      <p className="text-sm text-gray-600">Active Sources</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {Object.keys(stats.byCountry).length}
                      </p>
                      <p className="text-sm text-gray-600">Countries</p>
                    </div>
                  </div>

                  {/* Source Breakdown */}
                  <div>
                    <h4 className="font-semibold mb-3">Discovery by Source</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.bySource).map(([source, count]) => (
                        <div key={source} className="flex items-center justify-between">
                          <div className="flex items-center">
                            {source === 'google' && <Globe className="w-4 h-4 mr-2 text-blue-600" />}
                            {source === 'facebook' && <Facebook className="w-4 h-4 mr-2 text-blue-600" />}
                            {source === 'linkedin' && <Linkedin className="w-4 h-4 mr-2 text-blue-600" />}
                            <span className="capitalize">{source}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(count / stats.totalSuggestions) * 100}%` }}
                              ></div>
                            </div>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Country Breakdown */}
                  <div>
                    <h4 className="font-semibold mb-3">Discovery by Country</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(stats.byCountry).map(([country, count]) => (
                        <div key={country} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{country}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading discovery analytics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}