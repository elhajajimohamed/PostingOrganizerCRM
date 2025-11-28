'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Euro, TrendingUp, Users, Phone, Globe, Smartphone, Database } from 'lucide-react';

interface SimulationResult {
  fixe: string;
  mobile: string;
  blended: string;
  costPerAgent: string;
  totalCost: string;
  crmCost?: string;
  npvCost?: string;
  mobileDisplayCost?: string;
}

interface MarketRates {
  fixe: number;
  mobile: number;
  blended: number;
}

interface ExtendedPricing {
  voipRates: MarketRates;
  crmRate?: number;
  npvRate?: number;
  mobileDisplayRate?: number;
  showMobileDisplay?: boolean;
}

export function PriceSimulator() {
  const [formData, setFormData] = useState({
    market: 'france',
    positions: '',
    positionsGrise: '',
    percentMobile: '',
    percentFixe: ''
  });

  const [results, setResults] = useState<SimulationResult | null>(null);
  const [showGriseContainer, setShowGriseContainer] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Show/hide grise container based on market selection
    if (field === 'market') {
      setShowGriseContainer(value === 'france');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.positions || parseInt(formData.positions) <= 0) {
      newErrors.positions = 'Number of positions must be greater than 0';
    }

    // Only validate percentages if they are provided
    const mobilePercent = parseFloat(formData.percentMobile);
    const fixePercent = parseFloat(formData.percentFixe);

    // Validate mobile percentage if provided
    if (formData.percentMobile && (isNaN(mobilePercent) || mobilePercent < 0 || mobilePercent > 100)) {
      newErrors.percentMobile = 'Mobile percentage must be between 0 and 100';
    }

    // Validate fixed percentage if provided
    if (formData.percentFixe && (isNaN(fixePercent) || fixePercent < 0 || fixePercent > 100)) {
      newErrors.percentFixe = 'Fixed percentage must be between 0 and 100';
    }

    // Only check total percentage if both are provided
    if (formData.percentMobile && formData.percentFixe) {
      const totalPercent = mobilePercent + fixePercent;
      if (totalPercent > 100) {
        newErrors.percentMobile = 'Mobile and Fixed percentages cannot exceed 100%';
        newErrors.percentFixe = 'Mobile and Fixed percentages cannot exceed 100%';
      }
    }

    if (showGriseContainer && formData.positionsGrise) {
      const positionsGrise = parseInt(formData.positionsGrise);
      if (positionsGrise < 0) {
        newErrors.positionsGrise = 'Gray line positions cannot be negative';
      }
      if (positionsGrise > parseInt(formData.positions)) {
        newErrors.positionsGrise = 'Gray line positions cannot exceed total positions';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const simulateTarif = () => {
    if (!validateForm()) {
      return;
    }

    // Get input values
    const market = formData.market;
    const positions = parseInt(formData.positions) || 0;
    
    // Handle optional mobile/fixed percentages - default to 50/50 if not provided
    let percentMobile = 0.5; // Default 50%
    let percentFixe = 0.5;   // Default 50%
    
    if (formData.percentMobile) {
      percentMobile = parseFloat(formData.percentMobile) / 100;
    }
    if (formData.percentFixe) {
      percentFixe = parseFloat(formData.percentFixe) / 100;
    }
    
    // If both are provided, ensure they don't exceed 100%
    if (formData.percentMobile && formData.percentFixe) {
      const total = percentMobile + percentFixe;
      if (total > 1) {
        // Normalize to sum to 100%
        percentMobile = percentMobile / total;
        percentFixe = percentFixe / total;
      }
    }
    
    const agents = positions;

    // Initialize variables
    let positionsGrise = 0;
    if (market === 'france') {
      positionsGrise = parseInt(formData.positionsGrise) || 0;
    }

    let fixeRate = 0, mobileRate = 0, blendedRate = 0;
    let crmRate = 0, npvRate = 0, mobileDisplayRate = 0;
    let showMobileDisplay = false;

    // === Helper Functions ===
    const getCRMPrice = (positions: number): number => {
      if (positions <= 10) return 9.9;
      if (positions <= 20) return 8.4;
      if (positions <= 30) return 7.4;
      if (positions <= 50) return 6.9;
      return 5.9;
    };

    const getNPVPrice = (positions: number): number => {
      if (positions <= 10) return 5.0;
      if (positions <= 20) return 4.5;
      if (positions <= 30) return 4.0;
      if (positions <= 50) return 3.5;
      if (positions <= 100) return 3.0;
      if (positions <= 150) return 2.5;
      if (positions <= 200) return 2.0;
      if (positions <= 300) return 1.5;
      return 1.0;
    };

    const getMobileDisplayRate = (market: string, positions: number): number => {
      switch(market) {
        case 'france':
          return positions >= 40 ? 0.019 : 0.021; // 0.019 for volume, 0.021 for standard
        case 'belgique':
          return 0.022;
        case 'espagne':
          return 0.030;
        case 'canada':
          return 0.090;
        default:
          return 0;
      }
    };

    // Get base prices
    crmRate = getCRMPrice(positions);
    npvRate = getNPVPrice(positions);

    // === France special case ===
    if (market === 'france') {
      const positionsNormal = positions;
      const totalMinutesNormal = positionsNormal * 4800;
      const totalMinutesGrise = positionsGrise * 4800;

      let fixeNormal: number | string = 0, mobileNormal: number | string = 0;

      if (totalMinutesNormal <= 200000) {
        fixeNormal = 0.0048; mobileNormal = 0.018;
      } else if (totalMinutesNormal <= 300000) {
        fixeNormal = 0.0045; mobileNormal = 0.017;
      } else if (totalMinutesNormal <= 500000) {
        fixeNormal = 0.0043; mobileNormal = 0.016;
      } else if (totalMinutesNormal <= 1000000) {
        fixeNormal = 0.0044; mobileNormal = 0.015;
      } else if (totalMinutesNormal <= 2000000) {
        fixeNormal = 0.0042; mobileNormal = 0.014;
      } else if (totalMinutesNormal <= 3000000) {
        fixeNormal = 0.0038; mobileNormal = 0.012;
      } else {
        fixeNormal = mobileNormal = "Sur mesure";
      }

      const mobileGrise = positionsGrise < 20 ? 0.030 : 0.028;

      // Set results for France
      const result: SimulationResult = {
        fixe: fixeNormal === "Sur mesure" ? "Sur mesure" : `${(fixeNormal as number).toFixed(4)} €/min`,
        mobile: mobileNormal === "Sur mesure" ? "Sur mesure" : `${(mobileNormal as number).toFixed(4)} €/min`,
        blended: positionsGrise > 0 ? `${mobileGrise.toFixed(3)} €/min` : "-",
        costPerAgent: fixeNormal !== "Sur mesure" && mobileNormal !== "Sur mesure"
          ? `${((4800 * (fixeNormal as number) * percentFixe) + (4800 * (mobileNormal as number) * percentMobile)).toFixed(2)} €`
          : "Sur mesure",
        totalCost: fixeNormal !== "Sur mesure" && mobileNormal !== "Sur mesure"
          ? `${(((4800 * (fixeNormal as number) * percentFixe) + (4800 * (mobileNormal as number) * percentMobile)) * agents).toFixed(2)} €`
          : "Sur mesure",
        crmCost: `${(crmRate * agents).toFixed(2)} €`,
        npvCost: `${npvRate.toFixed(2)} €`,
        mobileDisplayCost: positions > 0 ? `${(getMobileDisplayRate(market, positions) * positions * 4800).toFixed(2)} €` : "-"
      };

      setResults(result);
      return;
    }

    // === France DOM-TOM special case ===
    if (market === 'france-dom-tom') {
      // Fixed rate of 0.025 euro/min for both fixed and mobile
      const domTomRate = 0.025;

      // Calculate costs
      const costPerAgent = (4800 * domTomRate * percentFixe) + (4800 * domTomRate * percentMobile);
      const totalCost = costPerAgent * agents;

      // Set results for France DOM-TOM
      const result: SimulationResult = {
        fixe: `${domTomRate.toFixed(4)} €/min`,
        mobile: `${domTomRate.toFixed(4)} €/min`,
        blended: `${domTomRate.toFixed(4)} €/min`,
        costPerAgent: `${costPerAgent.toFixed(2)} €`,
        totalCost: `${totalCost.toFixed(2)} €`,
        crmCost: `${(crmRate * agents).toFixed(2)} €`,
        npvCost: `${npvRate.toFixed(2)} €`,
        mobileDisplayCost: positions > 0 ? `${(getMobileDisplayRate('france', positions) * positions * 4800).toFixed(2)} €` : "-"
      };

      setResults(result);
      return;
    }

    // === Other markets ===
    switch(market) {
      case "belgique":
        if (positions < 10) { 
          fixeRate = 0.024; 
          mobileRate = 0.028; 
        } else if (positions <= 25) { 
          fixeRate = 0.020; 
          mobileRate = 0.025; 
        } else if (positions <= 30) { 
          fixeRate = 0.022; 
          mobileRate = 0.026; 
        } else { 
          fixeRate = 0.019; 
          mobileRate = 0.022; 
        }
        showMobileDisplay = true;
        break;
        
      case "canada":
        // Tiered pricing based on positions
        if (positions <= 20) { 
          mobileRate = fixeRate = 0.0090; 
        } else if (positions <= 40) { 
          mobileRate = fixeRate = 0.0085; 
        } else if (positions <= 50) { 
          mobileRate = fixeRate = 0.0080; 
        } else { 
          mobileRate = fixeRate = 0.0075; 
        }
        showMobileDisplay = true;
        break;
        
      case "espagne":
        // More detailed tiers from provided data
        if (positions <= 10) { 
          fixeRate = 0.0085; 
          mobileRate = 0.028; 
        } else if (positions <= 25) { 
          fixeRate = 0.0075; 
          mobileRate = 0.026; 
        } else if (positions <= 50) { 
          fixeRate = 0.006; 
          mobileRate = 0.026; 
        } else if (positions <= 200) { 
          fixeRate = 0.005; 
          mobileRate = 0.025; 
        } else { 
          fixeRate = 0.0045; 
          mobileRate = 0.024; 
        }
        showMobileDisplay = true;
        break;
        
      case "suisse":
        // Tiered pricing for Switzerland
        if (positions < 10) { 
          fixeRate = 0.07; 
          mobileRate = 0.30; 
        } else if (positions <= 20) { 
          fixeRate = 0.065; 
          mobileRate = 0.28; 
        } else if (positions <= 30) { 
          fixeRate = 0.060; 
          mobileRate = 0.25; 
        } else { 
          fixeRate = 0.055; 
          mobileRate = 0.22; 
        }
        break;
        
      case "uk":
        // UK pricing from provided data
        fixeRate = 0.012;
        mobileRate = 0.040;
        // UK display number pricing: 5€ (>50 = 4€)
        break;
        
      case "italie":
        // Italian pricing tiers
        if (positions <= 10) { 
          fixeRate = 0.015; 
          mobileRate = 0.025; 
        } else { 
          fixeRate = 0.011; 
          mobileRate = 0.028; 
        }
        break;
        
      case "allemagne":
        // Germany pricing
        fixeRate = 0.0095; 
        mobileRate = 0.040;
        break;
    }

    // Calculate blended rate and costs
    blendedRate = (percentFixe * fixeRate) + (percentMobile * mobileRate);
    const costPerAgent = (4800 * fixeRate * percentFixe) + (4800 * mobileRate * percentMobile);
    const totalCost = costPerAgent * agents;

    // Get mobile display rate if applicable
    if (showMobileDisplay) {
      mobileDisplayRate = getMobileDisplayRate(market, positions);
    }

    // Set results for other markets
    const result: SimulationResult = {
      fixe: `${fixeRate.toFixed(4)} €/min`,
      mobile: `${mobileRate.toFixed(4)} €/min`,
      blended: `${blendedRate.toFixed(4)} €/min`,
      costPerAgent: `${costPerAgent.toFixed(2)} €`,
      totalCost: `${totalCost.toFixed(2)} €`,
      crmCost: `${(crmRate * agents).toFixed(2)} €`,
      npvCost: `${npvRate.toFixed(2)} €`,
      mobileDisplayCost: showMobileDisplay && positions > 0 ? `${(mobileDisplayRate * positions * 4800).toFixed(2)} €` : "-"
    };

    setResults(result);
  };

  const resetSimulation = () => {
    setFormData({
      market: 'france',
      positions: '',
      positionsGrise: '',
      percentMobile: '',
      percentFixe: ''
    });
    setResults(null);
    setShowGriseContainer(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <Calculator className="w-6 h-6 mr-3" />
              VOIP Price Simulator
            </h2>
            <p className="text-blue-100 mt-1">Calculate VOIP tariffs for different markets and configurations</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-100">Real-time calculations</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="market-select" className="block text-sm font-medium text-gray-700 mb-2">
                Destination Market
              </label>
              <select
                id="market-select"
                value={formData.market}
                onChange={(e) => handleInputChange('market', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="france">France</option>
                <option value="france-dom-tom">France DOM-TOM</option>
                <option value="belgique">Belgium</option>
                <option value="canada">Canada</option>
                <option value="espagne">Spain</option>
                <option value="suisse">Switzerland</option>
                <option value="uk">United Kingdom</option>
                <option value="allemagne">Germany</option>
                <option value="italie">Italy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Positions
              </label>
              <input
                type="number"
                value={formData.positions}
                onChange={(e) => handleInputChange('positions', e.target.value)}
                placeholder="Ex: 40"
                min="1"
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.positions ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.positions && (
                <p className="text-red-500 text-sm mt-1">{errors.positions}</p>
              )}
            </div>

            {showGriseContainer && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Gray Line Positions
                </label>
                <input
                  type="number"
                  value={formData.positionsGrise}
                  onChange={(e) => handleInputChange('positionsGrise', e.target.value)}
                  placeholder="Ex: 10"
                  min="0"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.positionsGrise ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.positionsGrise && (
                  <p className="text-red-500 text-sm mt-1">{errors.positionsGrise}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  % Mobile <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  value={formData.percentMobile}
                  onChange={(e) => handleInputChange('percentMobile', e.target.value)}
                  placeholder="Ex: 70 (default: 50%)"
                  min="0"
                  max="100"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.percentMobile ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.percentMobile && (
                  <p className="text-red-500 text-sm mt-1">{errors.percentMobile}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  % Fixed <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  value={formData.percentFixe}
                  onChange={(e) => handleInputChange('percentFixe', e.target.value)}
                  placeholder="Ex: 30 (default: 50%)"
                  min="0"
                  max="100"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.percentFixe ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.percentFixe && (
                  <p className="text-red-500 text-sm mt-1">{errors.percentFixe}</p>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>💡 Tip:</strong> If you don't specify mobile/fixed percentages, the calculator will use a 50/50 split by default.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={simulateTarif}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate
              </Button>
              <Button
                onClick={resetSimulation}
                variant="outline"
                className="px-6"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="font-medium">Fixed Rate</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {results.fixe}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-green-600 mr-2" />
                      <span className="font-medium">Mobile Rate</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {results.mobile}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <Calculator className="w-4 h-4 text-purple-600 mr-2" />
                      <span className="font-medium">Blended Rate</span>
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {results.blended}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-orange-600 mr-2" />
                      <span className="font-medium">Cost per Agent/Month</span>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {results.costPerAgent}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center">
                      <Euro className="w-4 h-4 text-indigo-600 mr-2" />
                      <span className="font-medium">Total Cost/Month</span>
                    </div>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                      {results.totalCost}
                    </Badge>
                  </div>

                  {/* Additional Services Section */}
                  <div className="border-t pt-3 mt-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <Database className="w-4 h-4 mr-2" />
                      Additional Services
                    </h4>
                    
                    <div className="space-y-2">
                      {results.crmCost && (
                        <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                          <div className="flex items-center">
                            <Database className="w-4 h-4 text-emerald-600 mr-2" />
                            <span className="text-sm font-medium">Boxiel CRM (Monthly)</span>
                          </div>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                            {results.crmCost}
                          </Badge>
                        </div>
                      )}

                      {results.npvCost && (
                        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-yellow-600 mr-2" />
                            <span className="text-sm font-medium">NPV Numbers (Setup)</span>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                            {results.npvCost}
                          </Badge>
                        </div>
                      )}

                      {results.mobileDisplayCost && results.mobileDisplayCost !== "-" && (
                        <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                          <div className="flex items-center">
                            <Smartphone className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-sm font-medium">Mobile Display (Monthly)</span>
                          </div>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                            {results.mobileDisplayCost}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Enter your configuration and click Calculate to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Market Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {[
              { name: 'France', flag: '🇫🇷', special: 'Special pricing tiers based on volume' },
              { name: 'France DOM-TOM', flag: '🇫🇷', special: 'Fixed rate 0.025€/min' },
              { name: 'Belgium', flag: '🇧🇪', special: 'Position-based pricing' },
              { name: 'Canada', flag: '🇨🇦', special: 'Same rate for fixed & mobile' },
              { name: 'Spain', flag: '🇪🇸', special: 'Volume discounts at 40+ positions' },
              { name: 'Switzerland', flag: '🇨🇭', special: 'Premium rates' },
              { name: 'UK', flag: '🇬🇧', special: 'Display numbers 5€ (>50 = 4€)' },
              { name: 'Germany', flag: '🇩🇪', special: 'Standard European rates' },
              { name: 'Italy', flag: '🇮🇹', special: 'Competitive Mediterranean rates' }
            ].map((market) => (
              <div key={market.name} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-1">{market.flag}</div>
                <div className="font-medium text-sm">{market.name}</div>
                <div className="text-xs text-gray-600 mt-1">{market.special}</div>
              </div>
            ))}
          </div>

          {/* Additional Services Information */}
          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-800 mb-4">Additional Services Pricing</h4>
            <div className="grid md:grid-cols-3 gap-6">
              {/* CRM Pricing */}
              <div className="bg-emerald-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Database className="w-5 h-5 text-emerald-600 mr-2" />
                  <h5 className="font-medium text-emerald-800">Boxiel CRM</h5>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>1-10 positions:</span><span className="font-medium">9.9€/month</span></div>
                  <div className="flex justify-between"><span>11-20 positions:</span><span className="font-medium">8.4€/month</span></div>
                  <div className="flex justify-between"><span>21-30 positions:</span><span className="font-medium">7.4€/month</span></div>
                  <div className="flex justify-between"><span>31-50 positions:</span><span className="font-medium">6.9€/month</span></div>
                  <div className="flex justify-between"><span>+50 positions:</span><span className="font-medium">5.9€/month</span></div>
                </div>
              </div>

              {/* NPV Numbers Pricing */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Phone className="w-5 h-5 text-yellow-600 mr-2" />
                  <h5 className="font-medium text-yellow-800">NPV Numbers</h5>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>1-10:</span><span className="font-medium">5.0€</span></div>
                  <div className="flex justify-between"><span>11-20:</span><span className="font-medium">4.5€</span></div>
                  <div className="flex justify-between"><span>21-30:</span><span className="font-medium">4.0€</span></div>
                  <div className="flex justify-between"><span>31-50:</span><span className="font-medium">3.5€</span></div>
                  <div className="flex justify-between"><span>51-100:</span><span className="font-medium">3.0€</span></div>
                  <div className="flex justify-between"><span>101-150:</span><span className="font-medium">2.5€</span></div>
                  <div className="flex justify-between"><span>151-200:</span><span className="font-medium">2.0€</span></div>
                  <div className="flex justify-between"><span>201-300:</span><span className="font-medium">1.5€</span></div>
                  <div className="flex justify-between"><span>+301:</span><span className="font-medium">1.0€</span></div>
                </div>
              </div>

              {/* Mobile Display Pricing */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Smartphone className="w-5 h-5 text-purple-600 mr-2" />
                  <h5 className="font-medium text-purple-800">Mobile Display</h5>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>France:</span><span className="font-medium">0.019-0.021€/min</span></div>
                  <div className="flex justify-between"><span>Belgium:</span><span className="font-medium">0.022€/min</span></div>
                  <div className="flex justify-between"><span>Spain:</span><span className="font-medium">0.030€/min</span></div>
                  <div className="flex justify-between"><span>Canada:</span><span className="font-medium">0.090€/min</span></div>
                  <div className="text-xs text-gray-600 mt-2">
                    Volume pricing available for France (1M+ minutes)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
