'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Euro, TrendingUp, Users, Phone, Globe } from 'lucide-react';

interface SimulationResult {
  fixe: string;
  mobile: string;
  blended: string;
  costPerAgent: string;
  totalCost: string;
}

interface MarketRates {
  fixe: number;
  mobile: number;
  blended: number;
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

    const mobilePercent = parseFloat(formData.percentMobile);
    const fixePercent = parseFloat(formData.percentFixe);

    if (isNaN(mobilePercent) || mobilePercent < 0 || mobilePercent > 100) {
      newErrors.percentMobile = 'Mobile percentage must be between 0 and 100';
    }

    if (isNaN(fixePercent) || fixePercent < 0 || fixePercent > 100) {
      newErrors.percentFixe = 'Fixed percentage must be between 0 and 100';
    }

    const totalPercent = mobilePercent + fixePercent;
    if (totalPercent > 100) {
      newErrors.percentMobile = 'Mobile and Fixed percentages cannot exceed 100%';
      newErrors.percentFixe = 'Mobile and Fixed percentages cannot exceed 100%';
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
    const percentMobile = parseFloat(formData.percentMobile) / 100 || 0;
    const percentFixe = parseFloat(formData.percentFixe) / 100 || 0;
    const agents = positions;

    // Initialize variables
    let positionsGrise = 0;
    if (market === 'france') {
      positionsGrise = parseInt(formData.positionsGrise) || 0;
    }

    let fixeRate = 0, mobileRate = 0, blendedRate = 0;

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
          : "Sur mesure"
      };

      setResults(result);
      return;
    }

    // === Other markets ===
    switch(market) {
      case "belgique":
        if (positions < 10) { fixeRate = 0.024; mobileRate = 0.028; }
        else if (positions <= 25) { fixeRate = 0.020; mobileRate = 0.025; }
        else if (positions <= 30) { fixeRate = 0.022; mobileRate = 0.026; }
        else { fixeRate = 0.019; mobileRate = 0.022; }
        break;
      case "canada":
        if (positions <= 20) { mobileRate = fixeRate = 0.009; }
        else if (positions <= 40) { mobileRate = fixeRate = 0.0085; }
        else if (positions <= 50) { mobileRate = fixeRate = 0.008; }
        else { mobileRate = fixeRate = 0.0075; }
        break;
      case "espagne":
        fixeRate = positions >= 40 ? 0.0065 : 0.009;
        mobileRate = positions >= 40 ? 0.030 : 0.040;
        break;
      case "suisse":
        fixeRate = 0.070; mobileRate = 0.350;
        break;
      case "allemagne":
        fixeRate = 0.0095; mobileRate = 0.040;
        break;
      case "italie":
        fixeRate = 0.015; mobileRate = 0.025;
        break;
    }

    // Calculate blended rate and costs
    blendedRate = (percentFixe * fixeRate) + (percentMobile * mobileRate);
    const costPerAgent = (4800 * fixeRate * percentFixe) + (4800 * mobileRate * percentMobile);
    const totalCost = costPerAgent * agents;

    // Set results for other markets
    const result: SimulationResult = {
      fixe: `${fixeRate.toFixed(4)} €/min`,
      mobile: `${mobileRate.toFixed(4)} €/min`,
      blended: `${blendedRate.toFixed(4)} €/min`,
      costPerAgent: `${costPerAgent.toFixed(2)} €`,
      totalCost: `${totalCost.toFixed(2)} €`
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
                <option value="belgique">Belgium</option>
                <option value="canada">Canada</option>
                <option value="espagne">Spain</option>
                <option value="suisse">Switzerland</option>
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
                  % Mobile
                </label>
                <input
                  type="number"
                  value={formData.percentMobile}
                  onChange={(e) => handleInputChange('percentMobile', e.target.value)}
                  placeholder="Ex: 70"
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
                  % Fixed
                </label>
                <input
                  type="number"
                  value={formData.percentFixe}
                  onChange={(e) => handleInputChange('percentFixe', e.target.value)}
                  placeholder="Ex: 30"
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: 'France', flag: '🇫🇷', special: 'Special pricing tiers based on volume' },
              { name: 'Belgium', flag: '🇧🇪', special: 'Position-based pricing' },
              { name: 'Canada', flag: '🇨🇦', special: 'Same rate for fixed & mobile' },
              { name: 'Spain', flag: '🇪🇸', special: 'Volume discounts at 40+ positions' },
              { name: 'Switzerland', flag: '🇨🇭', special: 'Premium rates' },
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
        </CardContent>
      </Card>
    </div>
  );
}