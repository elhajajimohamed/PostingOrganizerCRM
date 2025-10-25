import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Suggestion, CallCenter } from '@/lib/types/external-crm';
import { GoogleScraperService, ScrapedBusiness } from './google-scraper-service';
import { PhoneDetectionService } from './phone-detection-service';
import { DuplicateDetectionService } from './duplicate-detection-service';

export interface ScrapingJob {
  id: string;
  country: string;
  source: 'google' | 'facebook' | 'linkedin' | 'yellowpages';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalFound: number;
  processed: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  settings: {
    maxResults: number;
    keywords: string[];
    location: string;
    radius?: number;
  };
}

export interface DiscoveryResult {
  suggestions: Suggestion[];
  job: ScrapingJob;
  duplicates: number;
  filtered: number;
}

export class AutomatedDiscoveryService {
  private static readonly SEARCH_KEYWORDS = {
    'Morocco': [
      'call center', 'centre d\'appel', 'télémarketing', 'outsourcing',
      'BPO', 'customer service', 'centre de contact', 'téléopérateur'
    ],
    'Tunisia': [
      'call center', 'centre d\'appel', 'télémarketing', 'outsourcing',
      'BPO', 'customer service', 'centre de contact'
    ],
    'Senegal': [
      'call center', 'centre d\'appel', 'télémarketing', 'outsourcing',
      'BPO', 'customer service', 'centre de contact'
    ],
    'Ivory Coast': [
      'call center', 'centre d\'appel', 'télémarketing', 'outsourcing',
      'BPO', 'customer service', 'centre de contact'
    ],
    'Guinea': [
      'call center', 'centre d\'appel', 'télémarketing', 'outsourcing',
      'BPO', 'customer service'
    ],
    'Cameroon': [
      'call center', 'centre d\'appel', 'télémarketing', 'outsourcing',
      'BPO', 'customer service', 'centre de contact'
    ]
  };

  private static readonly BUSINESS_TYPES = [
    'call center', 'centre d\'appel', 'télémarketing', 'BPO',
    'outsourcing', 'customer service', 'centre de contact',
    'téléopérateur', 'centre relation client'
  ];

  /**
    * Start automated discovery process with keyword-based scraping
    */
    static async startDiscovery(
      keyword: string,
      source: 'google' | 'facebook' | 'linkedin' | 'yellowpages' = 'google',
      options: {
        maxResults?: number;
        customKeywords?: string[];
        location?: string;
        radius?: number;
      } = {}
    ): Promise<string> {
      try {
        // Infer country from keyword
        const inferredCountry = this.inferCountryFromKeyword(keyword);

        const job: Omit<ScrapingJob, 'id'> = {
          country: inferredCountry,
          source,
          status: 'pending',
          progress: 0,
          totalFound: 0,
          processed: 0,
          createdAt: new Date().toISOString(),
          settings: {
            maxResults: options.maxResults || 50,
            keywords: [keyword], // Use the provided keyword directly
            location: options.location || this.getMainCity(inferredCountry),
            radius: options.radius || 50
          }
        };

       // In a real implementation, this would trigger a Firebase Cloud Function
       // For demo purposes, we'll simulate the process
       const docRef = await addDoc(collection(db, 'scrapingJobs'), job);

       // Start background processing with real scraping
       this.processDiscoveryJobWithRealScraping(docRef.id, keyword, job);

       return docRef.id;
     } catch (error) {
       console.error('Error starting discovery:', error);
       throw error;
     }
   }

  /**
   * Process discovery job in background with real scraping
   */
  private static async processDiscoveryJobWithRealScraping(jobId: string, keyword: string, job: Omit<ScrapingJob, 'id'>): Promise<void> {
    try {
      // Update job status to running
      await updateDoc(doc(db, 'scrapingJobs', jobId), {
        status: 'running',
        progress: 10
      });

      // Use real Google scraping instead of mock data
      const scrapingResult = await GoogleScraperService.scrapeGoogleSearch(keyword);

      // Convert scraped businesses to call centers
      const callCenters = [];
      let duplicatesSkipped = 0;

      for (const business of scrapingResult.businesses) {
        console.log(`🔍 [AUTOMATED-DISCOVERY] Processing scraped business: ${business.name}`);

        // Check for duplicates
        const isDuplicate = await this.checkForDuplicates(business);
        if (isDuplicate) {
          duplicatesSkipped++;
          continue;
        }

        // Convert to CallCenter format
        const callCenter = await GoogleScraperService.convertToCallCenter(business);
        callCenters.push(callCenter);
      }

      // Save new call centers to Firestore
      for (const callCenter of callCenters) {
        await addDoc(collection(db, 'callCenters'), callCenter);
      }

      // Update progress
      await updateDoc(doc(db, 'scrapingJobs', jobId), {
        status: 'completed',
        progress: 100,
        totalFound: scrapingResult.businesses.length,
        processed: callCenters.length,
        completedAt: new Date().toISOString()
      });

      console.log(`✅ [AUTOMATED-DISCOVERY] Completed real scraping: ${callCenters.length} new call centers, ${duplicatesSkipped} duplicates skipped`);

    } catch (error) {
      console.error('❌ [AUTOMATED-DISCOVERY] Error processing discovery job:', error);
      await updateDoc(doc(db, 'scrapingJobs', jobId), {
        status: 'failed',
        error: (error as Error).message,
        completedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Check for duplicate businesses
   */
  private static async checkForDuplicates(business: ScrapedBusiness): Promise<boolean> {
    // Simple duplicate check based on name and phone
    // In a real implementation, this would be more sophisticated
    return false; // For now, allow all businesses
  }

  /**
   * Legacy method for backward compatibility - now uses real scraping
   */
  private static async performScraping(job: Omit<ScrapingJob, 'id'>): Promise<Suggestion[]> {
    // This method is kept for backward compatibility but now delegates to real scraping
    const keyword = job.settings.keywords[0] || 'call center';
    const scrapingResult = await GoogleScraperService.scrapeGoogleSearch(keyword);

    const suggestions: Suggestion[] = [];

    for (const business of scrapingResult.businesses) {
      const suggestion: Suggestion = {
        id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: business.name,
        address: business.address,
        phones: business.phones,
        country: business.country as 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon' || 'Morocco',
        city: business.city || '',
        positions: business.positions || 0,
        source: job.source as 'google' | 'facebook' | 'csv',
        exported: false,
        createdAt: new Date().toISOString(),
        website: business.website,
        email: business.emails?.[0]
      };

      // Add to Firestore
      await addDoc(collection(db, 'suggestions'), suggestion);
      suggestions.push(suggestion);
    }

    return suggestions;
  }

  /**
   * Generate mock business data for demo purposes
   */
  private static generateMockBusinesses(country: string, settings: ScrapingJob['settings']): Array<{
    name: string;
    address: string;
    city: string;
    phones: string[];
    positions: number;
    website?: string;
    email?: string;
  }> {
    const cities = this.getCitiesForCountry(country);
    const businesses = [];

    const businessNames = {
      'Morocco': [
        'Maroc Call Center', 'Casablanca BPO', 'Rabat Télémarketing', 'Tanger Outsourcing',
        'Agadir Contact Center', 'Marrakech Téléopérateurs', 'Fès Customer Service',
        'Meknès Centre d\'Appel', 'Oujda Télémarketing', 'Kenitra BPO Solutions'
      ],
      'Tunisia': [
        'Tunisie Call Center', 'Tunis BPO', 'Sfax Télémarketing', 'Sousse Outsourcing',
        'Ariana Contact Center', 'Ben Arous Téléopérateurs', 'Manouba Customer Service'
      ],
      'Senegal': [
        'Sénégal Call Center', 'Dakar BPO', 'Thiès Télémarketing', 'Touba Outsourcing',
        'Rufisque Contact Center', 'Kaolack Téléopérateurs', 'Mbour Customer Service'
      ],
      'Ivory Coast': [
        'Côte d\'Ivoire Call Center', 'Abidjan BPO', 'Bouaké Télémarketing',
        'Daloa Outsourcing', 'Yamoussoukro Contact Center', 'San-Pédro Téléopérateurs'
      ],
      'Guinea': [
        'Guinée Call Center', 'Conakry BPO', 'Nzérékoré Télémarketing',
        'Kindia Outsourcing', 'Kankan Contact Center', 'Labé Téléopérateurs'
      ],
      'Cameroon': [
        'Cameroun Call Center', 'Yaoundé BPO', 'Douala Télémarketing',
        'Garoua Outsourcing', 'Bamenda Contact Center', 'Maroua Téléopérateurs'
      ]
    };

    const names = businessNames[country as keyof typeof businessNames] || businessNames.Morocco;

    for (let i = 0; i < Math.min(settings.maxResults, 15); i++) {
      const name = names[i] || `${country} Business ${i + 1}`;
      const city = cities[Math.floor(Math.random() * cities.length)];

      businesses.push({
        name,
        address: `${Math.floor(Math.random() * 999)} + ${Math.floor(Math.random() * 99)}, ${city}, ${country}`,
        city,
        phones: [`+${this.getCountryCode(country)} ${Math.floor(Math.random() * 900000000) + 100000000}`],
        positions: Math.floor(Math.random() * 200) + 10,
        website: `www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
        email: `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`
      });
    }

    return businesses;
  }

  /**
   * Get main city for a country
   */
  static getMainCity(country: string): string {
    const cities: Record<string, string> = {
      'Morocco': 'Casablanca',
      'Tunisia': 'Tunis',
      'Senegal': 'Dakar',
      'Ivory Coast': 'Abidjan',
      'Guinea': 'Conakry',
      'Cameroon': 'Yaoundé'
    };
    return cities[country] || 'Capital';
  }

  /**
   * Get cities for a country
   */
  private static getCitiesForCountry(country: string): string[] {
    const cityLists: Record<string, string[]> = {
      'Morocco': ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda'],
      'Tunisia': ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana'],
      'Senegal': ['Dakar', 'Thiès', 'Touba', 'Rufisque', 'Kaolack', 'Mbour', 'Saint-Louis'],
      'Ivory Coast': ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'Korhogo', 'Man', 'San-Pédro'],
      'Guinea': ['Conakry', 'Nzérékoré', 'Kindia', 'Kankan', 'Labé', 'Mamou', 'Kissidougou'],
      'Cameroon': ['Yaoundé', 'Douala', 'Garoua', 'Bamenda', 'Maroua', 'Bafoussam', 'Ngaoundéré']
    };
    return cityLists[country] || ['Capital City'];
  }

  /**
   * Get country code for phone numbers
   */
   private static getCountryCode(country: string): string {
     const codes: Record<string, string> = {
       'Morocco': '212',
       'Tunisia': '216',
       'Senegal': '221',
       'Ivory Coast': '225',
       'Guinea': '224',
       'Cameroon': '237'
     };
     return codes[country] || '212';
   }

  /**
   * Infer country from keyword
   */
  private static inferCountryFromKeyword(keyword: string): string {
    const lowerKeyword = keyword.toLowerCase();

    // Check for country-specific keywords
    if (lowerKeyword.includes('casablanca') || lowerKeyword.includes('rabat') || lowerKeyword.includes('maroc') || lowerKeyword.includes('morocco')) {
      return 'Morocco';
    }
    if (lowerKeyword.includes('tunis') || lowerKeyword.includes('tunisie') || lowerKeyword.includes('tunisia')) {
      return 'Tunisia';
    }
    if (lowerKeyword.includes('dakar') || lowerKeyword.includes('senegal')) {
      return 'Senegal';
    }
    if (lowerKeyword.includes('abidjan') || lowerKeyword.includes('côte d\'ivoire') || lowerKeyword.includes('ivory coast')) {
      return 'Ivory Coast';
    }
    if (lowerKeyword.includes('conakry') || lowerKeyword.includes('guinée') || lowerKeyword.includes('guinea')) {
      return 'Guinea';
    }
    if (lowerKeyword.includes('yaoundé') || lowerKeyword.includes('douala') || lowerKeyword.includes('cameroun') || lowerKeyword.includes('cameroon')) {
      return 'Cameroon';
    }

    // Default to Morocco if no specific country found
    return 'Morocco';
  }

  /**
   * Get active scraping jobs
   */
  static async getActiveJobs(): Promise<ScrapingJob[]> {
    // In a real implementation, this would query Firebase for active jobs
    // For demo purposes, return empty array
    return [];
  }

  /**
   * Get scraping statistics
   */
  static async getScrapingStats(country?: string): Promise<{
    totalSuggestions: number;
    bySource: Record<string, number>;
    byCountry: Record<string, number>;
    recentActivity: number;
  }> {
    try {
      // This would query Firebase for actual statistics
      // For demo purposes, return mock data
      return {
        totalSuggestions: 150,
        bySource: {
          google: 89,
          facebook: 45,
          linkedin: 16
        },
        byCountry: {
          'Morocco': 67,
          'Tunisia': 34,
          'Senegal': 28,
          'Ivory Coast': 21
        },
        recentActivity: 23
      };
    } catch (error) {
      console.error('Error getting scraping stats:', error);
      return {
        totalSuggestions: 0,
        bySource: {},
        byCountry: {},
        recentActivity: 0
      };
    }
  }

  /**
   * Smart filtering of suggestions
   */
  static smartFilterSuggestions(suggestions: Suggestion[]): Suggestion[] {
    return suggestions.filter(suggestion => {
      // Filter out low-quality suggestions
      if (!suggestion.name || suggestion.name.length < 3) return false;
      if (!suggestion.phones || suggestion.phones.length === 0) return false;
      if (suggestion.positions < 5) return false; // Must have at least 5 positions

      // Filter out obvious non-call centers
      const name = suggestion.name.toLowerCase();
      const excludedTerms = ['restaurant', 'hotel', 'bank', 'hospital', 'school', 'university'];
      if (excludedTerms.some(term => name.includes(term))) return false;

      return true;
    });
  }

  /**
   * Track source of each suggestion
   */
  static trackSuggestionSource(suggestion: Suggestion, source: string, metadata?: Record<string, unknown>): void {
    // In a real implementation, this would update the suggestion with source tracking
    console.log(`Suggestion "${suggestion.name}" tracked from ${source}`, metadata);
  }

  /**
   * Background processing simulation
   */
  static async scheduleBackgroundProcessing(country: string, source: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Trigger a Firebase Cloud Function
    // 2. Use a job queue system like Bull
    // 3. Process in batches to avoid timeouts

    console.log(`Background processing scheduled for ${country} using ${source}`);

    // Simulate background processing
    setTimeout(async () => {
      try {
        const job = await this.startDiscovery(country, source as 'google' | 'facebook' | 'linkedin' | 'yellowpages');
        console.log(`Background job ${job} completed`);
      } catch (error) {
        console.error('Background processing failed:', error);
      }
    }, 1000);
  }
}