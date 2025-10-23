'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CallCenter } from '@/lib/types/external-crm';
import { GeographicService } from '@/lib/services/geographic-service';
import {
  Globe,
  MapPin,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  Phone,
  Calendar,
  Star,
  Zap,
  Shield
} from 'lucide-react';

interface GeographicDashboardProps {
  callCenters: CallCenter[];
  loading?: boolean;
}

export function GeographicDashboard({ callCenters, loading = false }: GeographicDashboardProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  // Calculate geographic analytics
  const geoAnalytics = useMemo(() => {
    return GeographicService.calculateGeographicAnalytics(callCenters);
  }, [callCenters]);

  const supportedCountries = GeographicService.getSupportedCountries();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Geographic Coverage Dashboard</h2>
            <p className="text-purple-100 mt-1">Country-specific analytics and market intelligence</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="bg-white/20 text-white border-white/30 w-48">
                <SelectValue placeholder="Select country for details" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Countries</SelectItem>
                {supportedCountries.map(country => (
                  <SelectItem key={country.name} value={country.name}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Geographic Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Countries Covered</p>
                <p className="text-3xl font-bold text-purple-600">
                  {Object.keys(geoAnalytics.byCountry).length}
                </p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <Globe className="w-4 h-4 mr-1" />
                  of {supportedCountries.length} supported
                </p>
              </div>
              <Globe className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Market Value</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${Object.values(geoAnalytics.byCountry).reduce((sum, country) => sum + country.totalValue, 0).toLocaleString()}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Across all countries
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Regional Presence</p>
                <p className="text-3xl font-bold text-green-600">
                  {geoAnalytics.regionalTrends.length}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Regions covered
                </p>
              </div>
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Market Penetration</p>
                <p className="text-3xl font-bold text-orange-600">
                  {Math.round(Object.values(geoAnalytics.byCountry).reduce((sum, country) => sum + (country.totalCallCenters / 100 * 100), 0) / Object.keys(geoAnalytics.byCountry).length)}%
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  Market coverage
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Analysis Tabs */}
      <Tabs defaultValue="countries" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="countries">Country Analysis</TabsTrigger>
          <TabsTrigger value="regions">Regional Trends</TabsTrigger>
          <TabsTrigger value="intelligence">Market Intelligence</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="countries" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Country Performance Cards */}
            {Object.entries(geoAnalytics.byCountry)
              .sort(([,a], [,b]) => b.totalValue - a.totalValue)
              .map(([countryName, data]) => {
                const profile = GeographicService.getCountryProfile(countryName);
                const metrics = GeographicService.getCountryMetrics(countryName, callCenters);

                return (
                  <Card key={countryName} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center">
                          <span className="text-2xl mr-2">{profile?.flag}</span>
                          {countryName}
                        </CardTitle>
                        <Badge variant={metrics?.competitivePosition === 'leading' ? 'default' : 'secondary'}>
                          {metrics?.competitivePosition}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-lg font-bold text-blue-600">{data.totalCallCenters}</p>
                          <p className="text-sm text-gray-600">Call Centers</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-lg font-bold text-green-600">${data.totalValue.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">Total Value</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Market Penetration</span>
                          <span className="font-medium">{metrics?.marketPenetration}%</span>
                        </div>
                        <Progress value={metrics?.marketPenetration || 0} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Conversion Rate</span>
                          <span className="font-medium">{data.conversionRate}%</span>
                        </div>
                        <Progress value={data.conversionRate} className="h-2" />
                      </div>

                      {data.topCities.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Top Cities</p>
                          <div className="space-y-1">
                            {data.topCities.slice(0, 3).map(city => (
                              <div key={city.city} className="flex justify-between text-sm">
                                <span>{city.city}</span>
                                <Badge variant="outline">{city.count} deals</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="regions" className="space-y-6">
          {/* Regional Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {geoAnalytics.regionalTrends.map(region => (
              <Card key={region.region}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    {region.region}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      ${region.totalValue.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Regional Value</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Countries:</span>
                      <span className="text-sm font-medium">{region.countries.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Growth Rate:</span>
                      <span className={`text-sm font-medium ${region.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {region.growthRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Deal Size:</span>
                      <span className="text-sm font-medium">${region.avgDealSize.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          {/* Market Intelligence */}
          {selectedCountry && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Market Intelligence - {selectedCountry}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const intelligence = GeographicService.getMarketIntelligence(selectedCountry);
                  const profile = GeographicService.getCountryProfile(selectedCountry);
                  const metrics = GeographicService.getCountryMetrics(selectedCountry, callCenters);

                  if (!intelligence || !profile) return null;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Target className="w-4 h-4 mr-2" />
                            Market Overview
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <p className="text-lg font-bold">{intelligence.marketSize}</p>
                              <p className="text-sm text-gray-600">Market Size</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <p className="text-lg font-bold">{intelligence.competition}</p>
                              <p className="text-sm text-gray-600">Competition</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Growth & Performance
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Market Growth Rate:</span>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                +{intelligence.growthRate}%
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Our Penetration:</span>
                              <Badge variant="outline">{metrics?.marketPenetration}%</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Avg Deal Size:</span>
                              <Badge variant="outline">${metrics?.averageValue.toLocaleString()}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Opportunities
                          </h4>
                          <div className="space-y-2">
                            {intelligence.opportunities.map((opportunity, index) => (
                              <div key={index} className="flex items-start">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2"></div>
                                <span className="text-sm">{opportunity}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center text-orange-600">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Challenges
                          </h4>
                          <div className="space-y-2">
                            {intelligence.challenges.map((challenge, index) => (
                              <div key={index} className="flex items-start">
                                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-2"></div>
                                <span className="text-sm">{challenge}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center text-blue-600">
                            <Zap className="w-4 h-4 mr-2" />
                            Recommendations
                          </h4>
                          <div className="space-y-2">
                            {intelligence.recommendations.map((recommendation, index) => (
                              <div key={index} className="flex items-start">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></div>
                                <span className="text-sm">{recommendation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {!selectedCountry && (
            <Card>
              <CardContent className="p-8 text-center">
                <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Country</h3>
                <p className="text-gray-600">Choose a country above to view detailed market intelligence and analysis.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          {/* Market Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {supportedCountries.map(country => {
              const intelligence = GeographicService.getMarketIntelligence(country.name);
              const metrics = GeographicService.getCountryMetrics(country.name, callCenters);

              if (!intelligence) return null;

              return (
                <Card key={country.name} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="text-2xl mr-2">{country.flag}</span>
                      {country.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant={intelligence.marketSize === 'large' ? 'default' : 'secondary'}>
                        {intelligence.marketSize} market
                      </Badge>
                      <Badge variant={intelligence.competition === 'low' ? 'default' : 'secondary'}>
                        {intelligence.competition} competition
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Growth Rate</span>
                        <span className="font-medium text-green-600">+{intelligence.growthRate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Our Penetration</span>
                        <span className="font-medium">{metrics?.marketPenetration}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Competitive Position</span>
                        <Badge variant="outline">{metrics?.competitivePosition}</Badge>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Top Opportunities</p>
                      <div className="space-y-1">
                        {intelligence.opportunities.slice(0, 2).map((opportunity, index) => (
                          <div key={index} className="flex items-start">
                            <Star className="w-4 h-4 text-yellow-500 mt-0.5 mr-2" />
                            <span className="text-sm">{opportunity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      View Detailed Analysis
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}