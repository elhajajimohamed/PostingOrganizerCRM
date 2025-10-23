import { CallCenter } from '@/lib/types/external-crm';

export interface CountryProfile {
  code: string;
  name: string;
  flag: string;
  currency: string;
  phoneCode: string;
  phoneFormat: string;
  timeZone: string;
  businessHours: string;
  language: string;
  marketSize: 'small' | 'medium' | 'large';
  competition: 'low' | 'medium' | 'high';
  growthRate: number;
  avgDealSize: number;
  commonSectors: string[];
  businessCulture: string[];
  keyCities: Array<{
    name: string;
    population: number;
    economicActivity: 'low' | 'medium' | 'high';
    callCenterPresence: 'low' | 'medium' | 'high';
  }>;
}

export interface GeographicAnalytics {
  byCountry: Record<string, {
    totalCallCenters: number;
    activeCallCenters: number;
    totalValue: number;
    averageValue: number;
    conversionRate: number;
    marketShare: number;
    growthTrend: number;
    topCities: Array<{
      city: string;
      count: number;
      value: number;
    }>;
  }>;
  marketComparison: Array<{
    country: string;
    marketSize: number;
    ourPresence: number;
    penetration: number;
    opportunity: number;
  }>;
  regionalTrends: Array<{
    region: string;
    countries: string[];
    totalValue: number;
    growthRate: number;
    avgDealSize: number;
  }>;
}

export class GeographicService {
  private static readonly COUNTRY_PROFILES: Record<string, CountryProfile> = {
    'Morocco': {
      code: 'MA',
      name: 'Morocco',
      flag: '🇲🇦',
      currency: 'MAD',
      phoneCode: '+212',
      phoneFormat: '+212 6XX XXX XXX',
      timeZone: 'Africa/Casablanca',
      businessHours: '9:00 AM - 6:00 PM',
      language: 'Arabic, French, Berber',
      marketSize: 'large',
      competition: 'medium',
      growthRate: 8.5,
      avgDealSize: 125000,
      commonSectors: ['Telecommunications', 'Banking', 'E-commerce', 'Tourism', 'Government'],
      businessCulture: ['Relationship-focused', 'Formal meetings preferred', 'French widely used in business'],
      keyCities: [
        { name: 'Casablanca', population: 3350000, economicActivity: 'high', callCenterPresence: 'high' },
        { name: 'Rabat', population: 1650000, economicActivity: 'high', callCenterPresence: 'medium' },
        { name: 'Marrakech', population: 928000, economicActivity: 'medium', callCenterPresence: 'medium' },
        { name: 'Fès', population: 1112000, economicActivity: 'medium', callCenterPresence: 'low' }
      ]
    },
    'Tunisia': {
      code: 'TN',
      name: 'Tunisia',
      flag: '🇹🇳',
      currency: 'TND',
      phoneCode: '+216',
      phoneFormat: '+216 XX XXX XXX',
      timeZone: 'Africa/Tunis',
      businessHours: '8:00 AM - 5:00 PM',
      language: 'Arabic, French',
      marketSize: 'medium',
      competition: 'high',
      growthRate: 6.2,
      avgDealSize: 95000,
      commonSectors: ['Technology', 'Textile', 'Tourism', 'Agriculture', 'Manufacturing'],
      businessCulture: ['Direct communication', 'Strong work ethic', 'French business language'],
      keyCities: [
        { name: 'Tunis', population: 1056000, economicActivity: 'high', callCenterPresence: 'high' },
        { name: 'Sfax', population: 330000, economicActivity: 'high', callCenterPresence: 'medium' },
        { name: 'Sousse', population: 271000, economicActivity: 'medium', callCenterPresence: 'medium' }
      ]
    },
    'Senegal': {
      code: 'SN',
      name: 'Senegal',
      flag: '🇸🇳',
      currency: 'XOF',
      phoneCode: '+221',
      phoneFormat: '+221 XX XXX XX XX',
      timeZone: 'Africa/Dakar',
      businessHours: '9:00 AM - 5:30 PM',
      language: 'French, Wolof',
      marketSize: 'medium',
      competition: 'low',
      growthRate: 12.3,
      avgDealSize: 78000,
      commonSectors: ['Telecommunications', 'Banking', 'Mining', 'Agriculture', 'Port Services'],
      businessCulture: ['Relationship-driven', 'Hierarchical structure', 'French primary business language'],
      keyCities: [
        { name: 'Dakar', population: 1146000, economicActivity: 'high', callCenterPresence: 'high' },
        { name: 'Thiès', population: 318000, economicActivity: 'medium', callCenterPresence: 'low' },
        { name: 'Touba', population: 753000, economicActivity: 'low', callCenterPresence: 'low' }
      ]
    },
    'Ivory Coast': {
      code: 'CI',
      name: 'Ivory Coast',
      flag: '🇨🇮',
      currency: 'XOF',
      phoneCode: '+225',
      phoneFormat: '+225 XX XX XX XX XX',
      timeZone: 'Africa/Abidjan',
      businessHours: '8:00 AM - 6:00 PM',
      language: 'French',
      marketSize: 'large',
      competition: 'medium',
      growthRate: 9.8,
      avgDealSize: 145000,
      commonSectors: ['Banking', 'Telecommunications', 'Agriculture', 'Energy', 'Infrastructure'],
      businessCulture: ['Formal business approach', 'French required', 'Strong hierarchy respect'],
      keyCities: [
        { name: 'Abidjan', population: 4765000, economicActivity: 'high', callCenterPresence: 'high' },
        { name: 'Bouaké', population: 659000, economicActivity: 'medium', callCenterPresence: 'low' },
        { name: 'Yamoussoukro', population: 355000, economicActivity: 'medium', callCenterPresence: 'low' }
      ]
    },
    'Guinea': {
      code: 'GN',
      name: 'Guinea',
      flag: '🇬🇳',
      currency: 'GNF',
      phoneCode: '+224',
      phoneFormat: '+224 XXX XX XX XX',
      timeZone: 'Africa/Conakry',
      businessHours: '8:30 AM - 5:00 PM',
      language: 'French',
      marketSize: 'small',
      competition: 'low',
      growthRate: 15.7,
      avgDealSize: 65000,
      commonSectors: ['Mining', 'Agriculture', 'Telecommunications', 'Banking'],
      businessCulture: ['Personal relationships key', 'French essential', 'Patience required'],
      keyCities: [
        { name: 'Conakry', population: 1660000, economicActivity: 'high', callCenterPresence: 'medium' },
        { name: 'Nzérékoré', population: 195000, economicActivity: 'low', callCenterPresence: 'low' },
        { name: 'Kindia', population: 181000, economicActivity: 'low', callCenterPresence: 'low' }
      ]
    },
    'Cameroon': {
      code: 'CM',
      name: 'Cameroon',
      flag: '🇨🇲',
      currency: 'XAF',
      phoneCode: '+237',
      phoneFormat: '+237 X XX XX XX XX',
      timeZone: 'Africa/Douala',
      businessHours: '7:30 AM - 5:30 PM',
      language: 'French, English',
      marketSize: 'large',
      competition: 'medium',
      growthRate: 7.9,
      avgDealSize: 110000,
      commonSectors: ['Oil & Gas', 'Telecommunications', 'Banking', 'Agriculture', 'Manufacturing'],
      businessCulture: ['Bilingual business environment', 'Formal approach', 'Both French and English used'],
      keyCities: [
        { name: 'Yaoundé', population: 2440000, economicActivity: 'high', callCenterPresence: 'medium' },
        { name: 'Douala', population: 2070000, economicActivity: 'high', callCenterPresence: 'high' },
        { name: 'Garoua', population: 600000, economicActivity: 'medium', callCenterPresence: 'low' }
      ]
    }
  };

  /**
   * Get country profile information
   */
  static getCountryProfile(country: string): CountryProfile | null {
    return this.COUNTRY_PROFILES[country] || null;
  }

  /**
   * Get all supported countries
   */
  static getSupportedCountries(): CountryProfile[] {
    return Object.values(this.COUNTRY_PROFILES);
  }

  /**
   * Format phone number according to country standards
   */
  static formatPhoneNumber(phone: string, country: string): string {
    const profile = this.getCountryProfile(country);
    if (!profile) return phone;

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If it doesn't start with country code, add it
    if (!cleaned.startsWith(profile.phoneCode)) {
      return `${profile.phoneCode} ${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Validate phone number for a specific country
   */
  static validatePhoneNumber(phone: string, country: string): { isValid: boolean; formatted?: string } {
    const profile = this.getCountryProfile(country);
    if (!profile) return { isValid: false };

    const cleaned = phone.replace(/[^\d+]/g, '');

    // Check if it starts with country code
    if (!cleaned.startsWith(profile.phoneCode.replace('+', ''))) {
      return { isValid: false };
    }

    // Basic length validation (simplified)
    const numberWithoutCode = cleaned.replace(profile.phoneCode.replace('+', ''), '');
    const isValidLength = numberWithoutCode.length >= 8 && numberWithoutCode.length <= 12;

    if (isValidLength) {
      return { isValid: true, formatted: this.formatPhoneNumber(phone, country) };
    }

    return { isValid: false };
  }

  /**
   * Get localized currency symbol and formatting
   */
  static getCurrencyInfo(country: string): { symbol: string; position: 'before' | 'after'; decimal: string; thousands: string } {
    const currencyMap: Record<string, { symbol: string; position: 'before' | 'after' }> = {
      'MAD': { symbol: 'DH', position: 'after' },
      'TND': { symbol: 'DT', position: 'after' },
      'XOF': { symbol: 'CFA', position: 'after' },
      'XAF': { symbol: 'CFA', position: 'after' },
      'USD': { symbol: '$', position: 'before' },
      'EUR': { symbol: '€', position: 'after' }
    };

    const profile = this.getCountryProfile(country);
    const currency = profile?.currency || 'USD';
    const info = currencyMap[currency] || currencyMap.USD;

    return {
      symbol: info.symbol,
      position: info.position,
      decimal: ',', // Most countries use comma for decimals
      thousands: ' ' // Space for thousands separator
    };
  }

  /**
   * Format currency amount according to country standards
   */
  static formatCurrency(amount: number, country: string): string {
    const info = this.getCurrencyInfo(country);

    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

    if (info.position === 'after') {
      return `${formatted} ${info.symbol}`;
    } else {
      return `${info.symbol}${formatted}`;
    }
  }

  /**
   * Calculate geographic analytics
   */
  static calculateGeographicAnalytics(callCenters: CallCenter[]): GeographicAnalytics {
    const byCountry: Record<string, {
      totalCallCenters: number;
      activeCallCenters: number;
      totalValue: number;
      averageValue: number;
      conversionRate: number;
      marketShare: number;
      growthTrend: number;
      topCities: Array<{
        city: string;
        count: number;
        value: number;
      }>;
    }> = {};
    const countryProfiles = this.getSupportedCountries();

    // Initialize all countries
    countryProfiles.forEach(profile => {
      byCountry[profile.name] = {
        totalCallCenters: 0,
        activeCallCenters: 0,
        totalValue: 0,
        averageValue: 0,
        conversionRate: 0,
        marketShare: 0,
        growthTrend: 0,
        topCities: []
      };
    });

    // Aggregate data by country
    callCenters.forEach(cc => {
      if (!byCountry[cc.country]) {
        byCountry[cc.country] = {
          totalCallCenters: 0,
          activeCallCenters: 0,
          totalValue: 0,
          averageValue: 0,
          conversionRate: 0,
          marketShare: 0,
          growthTrend: 0,
          topCities: []
        };
      }

      byCountry[cc.country].totalCallCenters++;
      byCountry[cc.country].totalValue += cc.value || 0;

      if (!['Closed-Won', 'Closed-Lost', 'On-Hold'].includes(cc.status)) {
        byCountry[cc.country].activeCallCenters++;
      }

      if (cc.status === 'Closed-Won') {
        byCountry[cc.country].conversionRate++;
      }
    });

    // Calculate derived metrics
    Object.keys(byCountry).forEach(country => {
      const data = byCountry[country];
      data.averageValue = data.totalCallCenters > 0 ? Math.round(data.totalValue / data.totalCallCenters) : 0;
      data.conversionRate = data.totalCallCenters > 0 ? Math.round((data.conversionRate / data.totalCallCenters) * 100) : 0;

      // Calculate top cities for this country
      const cityData: Record<string, { count: number; value: number }> = {};
      callCenters.filter(cc => cc.country === country).forEach(cc => {
        if (!cityData[cc.city]) {
          cityData[cc.city] = { count: 0, value: 0 };
        }
        cityData[cc.city].count++;
        cityData[cc.city].value += cc.value || 0;
      });

      data.topCities = Object.entries(cityData)
        .map(([city, info]) => ({ city, ...info }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    });

    // Calculate market comparison
    const totalMarketValue = Object.values(byCountry).reduce((sum: number, country) => sum + country.totalValue, 0);
    const marketComparison = Object.entries(byCountry).map(([country, data]) => ({
      country,
      marketSize: data.totalValue,
      ourPresence: data.totalCallCenters,
      penetration: totalMarketValue > 0 ? Math.round((data.totalValue / totalMarketValue) * 100) : 0,
      opportunity: data.totalValue * (1 - (data.conversionRate / 100))
    }));

    // Calculate regional trends
    const regions = [
      { name: 'North Africa', countries: ['Morocco', 'Tunisia'] },
      { name: 'West Africa', countries: ['Senegal', 'Ivory Coast', 'Guinea'] },
      { name: 'Central Africa', countries: ['Cameroon'] }
    ];

    const regionalTrends = regions.map(region => {
      const regionData = region.countries.map(country => byCountry[country]).filter(Boolean);
      const totalValue = regionData.reduce((sum, data) => sum + data.totalValue, 0);
      const avgGrowthRate = regionData.reduce((sum, data, index) => sum + (this.getCountryProfile(region.countries[index])?.growthRate || 0), 0) / regionData.length;
      const avgDealSize = regionData.reduce((sum, data) => sum + data.averageValue, 0) / regionData.length;

      return {
        region: region.name,
        countries: region.countries,
        totalValue,
        growthRate: Math.round(avgGrowthRate * 100) / 100,
        avgDealSize: Math.round(avgDealSize)
      };
    });

    return {
      byCountry,
      marketComparison,
      regionalTrends
    };
  }

  /**
   * Get market intelligence for a country
   */
  static getMarketIntelligence(country: string): {
    marketSize: string;
    competition: string;
    growthRate: number;
    opportunities: string[];
    challenges: string[];
    recommendations: string[];
  } | null {
    const profile = this.getCountryProfile(country);
    if (!profile) return null;

    const intelligence: Record<string, {
      opportunities: string[];
      challenges: string[];
      recommendations: string[];
    }> = {
      'Morocco': {
        opportunities: [
          'Growing e-commerce sector',
          'Tourism industry expansion',
          'Government digitalization initiatives',
          'Banking sector modernization'
        ],
        challenges: [
          'High competition in major cities',
          'Regulatory complexity',
          'Skilled labor shortages'
        ],
        recommendations: [
          'Focus on French-speaking markets',
          'Target government contracts',
          'Develop tourism-specific solutions'
        ]
      },
      'Tunisia': {
        opportunities: [
          'Technology sector growth',
          'European market proximity',
          'Skilled workforce availability'
        ],
        challenges: [
          'Political instability concerns',
          'Economic uncertainty',
          'Currency fluctuations'
        ],
        recommendations: [
          'Leverage European partnerships',
          'Focus on technology sector',
          'Develop multilingual capabilities'
        ]
      },
      'Senegal': {
        opportunities: [
          'Rapid economic growth',
          'Infrastructure development',
          'Banking sector expansion',
          'Natural resources sector'
        ],
        challenges: [
          'Infrastructure limitations',
          'Bureaucratic processes',
          'Limited local competition'
        ],
        recommendations: [
          'Early market entry advantage',
          'Focus on infrastructure projects',
          'Develop local partnerships'
        ]
      },
      'Ivory Coast': {
        opportunities: [
          'Strong economic growth',
          'Banking sector development',
          'Regional hub status',
          'Infrastructure investment'
        ],
        challenges: [
          'High operational costs',
          'Competition from international players',
          'Regulatory environment'
        ],
        recommendations: [
          'Target banking and finance sector',
          'Leverage regional hub position',
          'Focus on infrastructure projects'
        ]
      },
      'Guinea': {
        opportunities: [
          'Mining sector growth',
          'Untapped market potential',
          'Natural resources boom',
          'Infrastructure development'
        ],
        challenges: [
          'Political instability',
          'Infrastructure challenges',
          'Limited local skills'
        ],
        recommendations: [
          'Focus on mining sector',
          'Early market entry',
          'Develop training programs'
        ]
      },
      'Cameroon': {
        opportunities: [
          'Oil and gas sector',
          'Bilingual market advantage',
          'Regional economic hub',
          'Growing middle class'
        ],
        challenges: [
          'Complex regulatory environment',
          'Corruption concerns',
          'Infrastructure variability'
        ],
        recommendations: [
          'Leverage bilingual capabilities',
          'Target oil and gas sector',
          'Focus on Douala economic hub'
        ]
      }
    };

    const countryIntel = intelligence[country] || {
      opportunities: ['Growing market potential'],
      challenges: ['Market research needed'],
      recommendations: ['Conduct local market analysis']
    };

    return {
      marketSize: profile.marketSize,
      competition: profile.competition,
      growthRate: profile.growthRate,
      opportunities: countryIntel.opportunities,
      challenges: countryIntel.challenges,
      recommendations: countryIntel.recommendations
    };
  }

  /**
   * Get localized search suggestions for a country
   */
  static getLocalizedSearchTerms(country: string): {
    primary: string[];
    secondary: string[];
    locations: string[];
    sectors: string[];
  } {
    const baseTerms = {
      'Morocco': {
        primary: ['centre d\'appel', 'call center', 'télémarketing', 'BPO Maroc'],
        secondary: ['outsourcing Maroc', 'centre de contact', 'téléopérateur'],
        locations: ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Agadir'],
        sectors: ['télécommunications', 'banque', 'e-commerce', 'tourisme']
      },
      'Tunisia': {
        primary: ['centre d\'appel Tunisie', 'call center Tunis', 'télémarketing'],
        secondary: ['BPO Tunisie', 'outsourcing Tunis', 'centre de contact'],
        locations: ['Tunis', 'Sfax', 'Sousse', 'Ariana', 'Ben Arous'],
        sectors: ['technologie', 'textile', 'tourisme', 'agriculture']
      },
      'Senegal': {
        primary: ['centre d\'appel Sénégal', 'call center Dakar', 'télémarketing'],
        secondary: ['BPO Sénégal', 'outsourcing Dakar', 'centre de contact'],
        locations: ['Dakar', 'Thiès', 'Touba', 'Rufisque', 'Kaolack'],
        sectors: ['télécommunications', 'banque', 'mines', 'agriculture']
      },
      'Ivory Coast': {
        primary: ['centre d\'appel Côte d\'Ivoire', 'call center Abidjan', 'télémarketing'],
        secondary: ['BPO Abidjan', 'outsourcing Côte d\'Ivoire', 'centre de contact'],
        locations: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro'],
        sectors: ['banque', 'télécommunications', 'agriculture', 'énergie']
      },
      'Guinea': {
        primary: ['centre d\'appel Guinée', 'call center Conakry', 'télémarketing'],
        secondary: ['BPO Guinée', 'outsourcing Conakry', 'centre de contact'],
        locations: ['Conakry', 'Nzérékoré', 'Kindia', 'Kankan'],
        sectors: ['mines', 'agriculture', 'télécommunications', 'banque']
      },
      'Cameroon': {
        primary: ['centre d\'appel Cameroun', 'call center Cameroun', 'télémarketing'],
        secondary: ['BPO Cameroun', 'outsourcing Cameroun', 'centre de contact'],
        locations: ['Yaoundé', 'Douala', 'Garoua', 'Bamenda'],
        sectors: ['pétrole gaz', 'télécommunications', 'banque', 'agriculture']
      }
    };

    return baseTerms[country as keyof typeof baseTerms] || baseTerms.Morocco;
  }

  /**
   * Get country-specific business metrics
   */
  static getCountryMetrics(country: string, callCenters: CallCenter[]): {
    marketPenetration: number;
    averageValue: number;
    conversionRate: number;
    growthOpportunity: number;
    competitivePosition: 'leading' | 'strong' | 'moderate' | 'weak';
  } | null {
    const profile = this.getCountryProfile(country);
    if (!profile) return null;

    const countryCallCenters = callCenters.filter(cc => cc.country === country);
    const countryData = this.calculateGeographicAnalytics(callCenters).byCountry[country];

    if (!countryData || countryData.totalCallCenters === 0) {
      return {
        marketPenetration: 0,
        averageValue: 0,
        conversionRate: 0,
        growthOpportunity: profile.growthRate,
        competitivePosition: 'weak'
      };
    }

    // Calculate market penetration (simplified)
    const marketPenetration = Math.min(countryData.totalCallCenters / 100 * 100, 100); // Assume 100 potential call centers per country

    // Determine competitive position
    let competitivePosition: 'leading' | 'strong' | 'moderate' | 'weak' = 'weak';
    if (marketPenetration > 70) competitivePosition = 'leading';
    else if (marketPenetration > 50) competitivePosition = 'strong';
    else if (marketPenetration > 25) competitivePosition = 'moderate';

    return {
      marketPenetration: Math.round(marketPenetration),
      averageValue: countryData.averageValue,
      conversionRate: countryData.conversionRate,
      growthOpportunity: profile.growthRate,
      competitivePosition
    };
  }
}