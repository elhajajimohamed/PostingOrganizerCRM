import * as cheerio from 'cheerio';
import { PhoneDetectionService } from './phone-detection-service';
import { CallCenter, PhoneInfo } from '@/lib/types/external-crm';

export interface ScrapedBusiness {
  name: string;
  address: string;
  phones: string[];
  website?: string;
  emails?: string[];
  city?: string;
  country?: string;
  positions?: number;
  notes?: string;
}

export interface ScrapingResult {
  businesses: ScrapedBusiness[];
  foundCount: number;
  source: 'google_search' | 'google_maps';
  keyword: string;
  executionTimeMs: number;
}

export class GoogleScraperService {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];

  private static readonly RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
  private static lastRequestTime = 0;

  private static readonly COUNTRY_KEYWORDS = {
    'Morocco': ['maroc', 'morocco', 'casablanca', 'rabat', 'marrakech', 'fes', 'tanger'],
    'Tunisia': ['tunisie', 'tunisia', 'tunis', 'sfax', 'sousse', 'kairouan'],
    'Senegal': ['senegal', 'dakar', 'thiès', 'touba', 'rufisque'],
    'Ivory Coast': ['côte d\'ivoire', 'ivory coast', 'abidjan', 'bouaké', 'daloa'],
    'Guinea': ['guinée', 'guinea', 'conakry', 'nzérékoré', 'kindia'],
    'Cameroon': ['cameroun', 'cameroon', 'yaoundé', 'douala', 'garoua']
  };

  /**
   * Main scraping method for Google Search - SIMULATED for now
   * TODO: Implement real scraping when server-side rendering is available
   */
  static async scrapeGoogleSearch(keyword: string): Promise<ScrapingResult> {
    const startTime = Date.now();

    try {
      console.log(`🔍 [GOOGLE-SCRAPER] Starting Google Search scrape for keyword: "${keyword}"`);

      // Apply rate limiting
      await this.applyRateLimit();

      // Simulate scraping delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock data based on keyword for now
      const businesses = this.generateMockBusinesses(keyword);

      const executionTime = Date.now() - startTime;
      console.log(`✅ [GOOGLE-SCRAPER] Scraped ${businesses.length} businesses in ${executionTime}ms`);

      return {
        businesses,
        foundCount: businesses.length,
        source: 'google_search',
        keyword,
        executionTimeMs: executionTime
      };

    } catch (error) {
      console.error('❌ [GOOGLE-SCRAPER] Error during scraping:', error);
      throw new Error(`Scraping failed: ${(error as Error).message}`);
    }
  }

  /**
   * Apply rate limiting to prevent being blocked by Google
   */
  private static async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`⏳ [GOOGLE-SCRAPER] Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Generate mock business data for testing (will be replaced with real scraping)
   */
  private static generateMockBusinesses(keyword: string): ScrapedBusiness[] {
    const businesses: ScrapedBusiness[] = [];
    const { country, city } = this.inferLocation(keyword, '');

    // Generate 5-10 mock businesses based on keyword
    const numBusinesses = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < numBusinesses; i++) {
      const business: ScrapedBusiness = {
        name: `Casablanca Center ${i + 1}`,
        address: `${Math.floor(Math.random() * 999)} + ${Math.floor(Math.random() * 99)}, Casablanca, Morocco`,
        phones: [`+212${Math.floor(Math.random() * 900000000) + 100000000}`],
        website: `https://www.example${i + 1}.com`,
        emails: [`contact@example${i + 1}.com`],
        city: 'Casablanca',
        country: 'Morocco',
        positions: Math.floor(Math.random() * 100) + 10,
        notes: `Business found via Google Search for "${keyword}"`
      };
      businesses.push(business);
    }

    return businesses;
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
   * Scrape additional data from business website - SIMULATED for now
   */
  private static async scrapeWebsiteData(website: string): Promise<{
    emails: string[];
    phones: string[];
    positions?: number;
  }> {
    // Simulate website scraping
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data
    return {
      emails: [`contact@${website.replace('https://www.', '').replace('https://', '').split('.')[0]}.com`],
      phones: [],
      positions: Math.floor(Math.random() * 50) + 10
    };
  }

  /**
   * Extract data from a single business element
   */
  private static async extractBusinessData(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, keyword: string): Promise<ScrapedBusiness | null> {
    try {
      // Extract business name
      const name = this.extractBusinessName(element, $);
      if (!name) return null;

      // Extract address
      const address = this.extractAddress(element, $);

      // Extract phone numbers
      const phones = this.extractPhones(element, $);

      // Extract website
      const website = this.extractWebsite(element, $);

      // Extract additional data from website if available
      let emails: string[] = [];
      let additionalPhones: string[] = [];
      let positions: number | undefined;

      if (website) {
        try {
          const websiteData = await this.scrapeWebsiteData(website);
          emails = websiteData.emails;
          additionalPhones = websiteData.phones;
          positions = websiteData.positions;
        } catch (error) {
          console.warn(`⚠️ [GOOGLE-SCRAPER] Failed to scrape website ${website}:`, error);
        }
      }

      // Combine phones from Google and website
      const allPhones = [...new Set([...phones, ...additionalPhones])];

      // Infer country and city from keyword and address
      const { country, city } = this.inferLocation(keyword, address);

      // Generate tags and notes
      const tags = this.generateTags(keyword, city, country);
      const notes = this.generateNotes(element, $, name);

      return {
        name,
        address,
        phones: allPhones,
        website,
        emails,
        city,
        country,
        positions,
        notes
      };

    } catch (error) {
      console.error('❌ [GOOGLE-SCRAPER] Error extracting business data:', error);
      return null;
    }
  }

  /**
   * Extract business name from element
   */
  private static extractBusinessName(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string | null {
    // Try multiple selectors for business name
    const nameSelectors = [
      'h3.LC20lb',
      '.VkpGBb h3',
      '.rllt__link h3',
      '.cXedhc h3',
      '.dbg0pd span',
      '.rllt__details h3'
    ];

    for (const selector of nameSelectors) {
      const nameElement = element.find(selector).first();
      if (nameElement.length > 0) {
        const name = nameElement.text().trim();
        if (name && name.length > 2) {
          return name;
        }
      }
    }

    // Fallback: try the element itself
    const text = element.text().trim();
    if (text && text.length > 2 && text.length < 100) {
      return text.split('\n')[0].trim();
    }

    return null;
  }

  /**
   * Extract address from element
   */
  private static extractAddress(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
    // Try multiple selectors for address
    const addressSelectors = [
      '.LrzXr',
      '.rllt__details .s3v9rd',
      '.cXedhc .s3v9rd',
      '.VkpGBb .s3v9rd'
    ];

    for (const selector of addressSelectors) {
      const addressElement = element.find(selector).first();
      if (addressElement.length > 0) {
        const address = addressElement.text().trim();
        if (address && address.length > 5) {
          return address;
        }
      }
    }

    return '';
  }

  /**
   * Extract phone numbers from element
   */
  private static extractPhones(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string[] {
    const phones: string[] = [];

    // Look for phone patterns in text content
    const text = element.text();
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g;
    const matches = text.match(phoneRegex);

    if (matches) {
      phones.push(...matches);
    }

    // Also look for specific phone elements
    const phoneElements = element.find('.rllt__details .s3v9rd:contains("+"), .cXedhc .s3v9rd:contains("+")');
    phoneElements.each((_: number, el: any) => {
      const phoneText = $(el).text().trim();
      if (phoneText.match(/\+\d/)) {
        phones.push(phoneText);
      }
    });

    return [...new Set(phones)]; // Remove duplicates
  }

  /**
   * Extract website URL from element
   */
  private static extractWebsite(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string | undefined {
    // Look for website links
    const websiteLinks = element.find('a[href*="http"][href*="."]').not('[href*="google"]').not('[href*="maps"]');

    for (let i = 0; i < websiteLinks.length; i++) {
      const href = websiteLinks.eq(i).attr('href');
      if (href && !href.includes('google') && !href.includes('maps.google')) {
        // Clean up Google redirect URLs
        if (href.startsWith('/url?q=')) {
          const url = new URL(href, 'https://www.google.com');
          return url.searchParams.get('q') || undefined;
        }
        return href;
      }
    }

    return undefined;
  }


  /**
   * Extract emails from website content
   */
  private static extractEmailsFromContent(content: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = content.match(emailRegex);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Extract phones from website content
   */
  private static extractPhonesFromContent(content: string): string[] {
    const phones: string[] = [];
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g;
    const matches = content.match(phoneRegex);

    if (matches) {
      phones.push(...matches);
    }

    return [...new Set(phones)];
  }

  /**
   * Extract positions information from website content
   */
  private static extractPositionsFromContent(content: string): number | undefined {
    const text = content.toLowerCase();

    // Look for position indicators
    const positionPatterns = [
      /(\d+)\s*(?:postes?|positions?|agents?|employés?|staff)/i,
      /(?:postes?|positions?|agents?)\s*(?:de|d'|of)\s*(\d+)/i,
      /(\d+)\s*(?:personnes?|people)/i
    ];

    for (const pattern of positionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const positions = parseInt(match[1]);
        if (positions > 0 && positions < 1000) {
          return positions;
        }
      }
    }

    return undefined;
  }

  /**
   * Infer country and city from keyword and address
   */
  private static inferLocation(keyword: string, address: string): { country: string | undefined; city: string | undefined } {
    const lowerKeyword = keyword.toLowerCase();
    const lowerAddress = address.toLowerCase();

    // Check keyword for country indicators
    for (const [country, keywords] of Object.entries(this.COUNTRY_KEYWORDS)) {
      if (keywords.some(k => lowerKeyword.includes(k))) {
        // Try to extract city from keyword
        const cityKeyword = keywords.find(k => lowerKeyword.includes(k) && k !== country.toLowerCase());
        let city: string | undefined;

        if (cityKeyword) {
          city = cityKeyword.charAt(0).toUpperCase() + cityKeyword.slice(1);
        }

        // Also check address for city
        if (!city) {
          for (const cityName of keywords) {
            if (lowerAddress.includes(cityName)) {
              city = cityName.charAt(0).toUpperCase() + cityName.slice(1);
              break;
            }
          }
        }

        return { country, city };
      }
    }

    // Fallback: check address for country keywords
    for (const [country, keywords] of Object.entries(this.COUNTRY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerAddress.includes(keyword)) {
          return { country, city: undefined };
        }
      }
    }

    return { country: undefined, city: undefined };
  }

  /**
   * Generate tags based on keyword, city, and country
   */
  private static generateTags(keyword: string, city?: string, country?: string): string[] {
    const tags: string[] = [];

    if (city) tags.push(city.toLowerCase());
    if (country) tags.push(country.toLowerCase());

    // Extract business type keywords
    const businessKeywords = ['call center', 'centre d\'appel', 'télémarketing', 'bpo', 'outsourcing', 'customer service'];
    for (const kw of businessKeywords) {
      if (keyword.toLowerCase().includes(kw)) {
        tags.push(kw);
        break;
      }
    }

    return [...new Set(tags)];
  }

  /**
   * Generate notes from business element
   */
  private static generateNotes(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, name: string): string {
    const text = element.text().trim();
    const lines = text.split('\n').filter((line: string) => line.trim().length > 0);

    // Look for description or additional info
    const description = lines.find((line: string) =>
      line.length > 10 &&
      !line.includes(name) &&
      !line.match(/\+\d/) && // Not a phone
      !line.includes('http') && // Not a URL
      !line.match(/\d{5}/) // Not a postal code
    );

    return description || `Business found via Google Search for "${name}"`;
  }

  /**
   * Validate if extracted business data is worth keeping
   */
  private static isValidBusiness(business: ScrapedBusiness): boolean {
    // Must have a name
    if (!business.name || business.name.length < 3) return false;

    // Must have at least one phone or website
    if ((!business.phones || business.phones.length === 0) && !business.website) return false;

    // Filter out obvious non-call centers
    const name = business.name.toLowerCase();
    const excludedTerms = ['restaurant', 'hotel', 'bank', 'hospital', 'school', 'university', 'clinic', 'pharmacy'];
    if (excludedTerms.some(term => name.includes(term))) return false;

    return true;
  }

  /**
   * Convert scraped business to CallCenter format
   */
  static async convertToCallCenter(business: ScrapedBusiness): Promise<CallCenter> {
    const now = new Date().toISOString();

    // Process phone numbers with detection service
    const phoneInfos: PhoneInfo[] = [];
    for (const phone of business.phones) {
      const phoneInfo = PhoneDetectionService.detectPhone(phone, business.country);
      phoneInfos.push(phoneInfo);
    }

    // Normalize phones
    const normalizedPhones = phoneInfos.map(info => info.phone_norm);

    return {
      id: `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: business.name,
      country: business.country as CallCenter['country'] || 'Morocco',
      city: business.city || '',
      positions: business.positions || 0,
      status: 'New',
      phones: normalizedPhones,
      phone_infos: phoneInfos,
      emails: business.emails || [],
      website: business.website || '',
      tags: this.generateTags(business.name, business.city, business.country),
      notes: business.notes || '',
      address: business.address,
      createdAt: now,
      updatedAt: now,
      lastContacted: null,
      source: 'google_search',
      foundDate: now,
      archived: false,
      completed: false
    };
  }
}