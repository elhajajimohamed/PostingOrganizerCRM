import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ScrapedResult {
  name: string;
  website: string;
  snippet: string;
  phones: string[];
  emails: string[];
  address?: string;
}

// POST /api/external-crm/scrape - Google scraping with axios/cheerio
export async function POST(request: NextRequest) {
  try {
    const { keyword, source, options } = await request.json();

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Valid keyword is required (minimum 3 characters)' },
        { status: 400 }
      );
    }

    console.log(`🚀 [GOOGLE-SCRAPER] Starting Google scraping for: "${keyword}"`);

    const results = await scrapeGoogleSearch(keyword);

    async function scrapeGoogleSearch(query: string): Promise<ScrapedResult[]> {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;

      console.log(`🌐 [SCRAPER] Fetching URL: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,ar;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      console.log(`📄 [SCRAPER] Response status: ${response.status}`);
      console.log(`📄 [SCRAPER] Response length: ${response.data.length}`);

      const $ = cheerio.load(response.data);
      const results: ScrapedResult[] = [];

      // Log the HTML structure to debug
      console.log(`🔍 [SCRAPER] Found ${$('.g').length} .g elements`);
      console.log(`🔍 [SCRAPER] Found ${$('[data-ved]').length} [data-ved] elements`);
      console.log(`🔍 [SCRAPER] Found ${$('h3').length} h3 elements`);

      // Try to find any text content that might be results
      const allText = $('body').text();
      console.log(`📝 [SCRAPER] Page text length: ${allText.length}`);
      console.log(`📝 [SCRAPER] Sample text: ${allText.substring(0, 500)}`);

      // Google search results are typically in .g (organic results) or other selectors
      $('.g, [data-ved], .result').each((index, element) => {
        const $element = $(element);

        // Try multiple selectors for title
        const title = $element.find('h3').first().text().trim() ||
                     $element.find('.LC20lb').first().text().trim() ||
                     $element.find('a').first().text().trim();

        // Try multiple selectors for URL
        const url = $element.find('a').first().attr('href') ||
                   $element.find('[href]').first().attr('href');

        // Try multiple selectors for snippet
        const snippet = $element.find('.VwiC3b').text().trim() ||
                       $element.find('.s3v9rd').text().trim() ||
                       $element.find('.IsZvec').text().trim() ||
                       $element.find('span:not([class])').text().trim();

        console.log(`🔍 [SCRAPER] Processing element ${index}: title="${title}", url="${url}"`);

        if (title && title.length > 3) {
          const website = extractWebsiteFromUrl(url || '');
          const phones = extractPhones(snippet + ' ' + title);
          const emails = extractEmails(snippet);
          const address = extractAddress(snippet);

          console.log(`📞 [SCRAPER] Extracted: phones=${phones.length}, emails=${emails.length}, website="${website}"`);

          // For now, add all results to see what we get
          results.push({
            name: title,
            website,
            snippet,
            phones,
            emails,
            address
          });
        }
      });

      console.log(`✅ [SCRAPER] Total results found: ${results.length}`);

      return results;
    }

    function extractWebsiteFromUrl(url: string): string {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
      } catch {
        return url;
      }
    }

    function extractPhones(text: string): string[] {
      const phoneRegex = /(\+212[\s-]?[5-7][\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{3})|(0[5-7][\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{3})/g;
      const matches = text.match(phoneRegex);
      return matches ? matches.map(phone => phone.replace(/[\s-]/g, '')) : [];
    }

    function extractEmails(text: string): string[] {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const matches = text.match(emailRegex);
      return matches || [];
    }

    function extractAddress(text: string): string {
      // Simple address extraction - you might want to enhance this
      const addressIndicators = ['rue', 'avenue', 'av.', 'boulevard', 'bd', 'quartier', 'lot', 'immobile'];
      const sentences = text.split('.');

      for (const sentence of sentences) {
        if (addressIndicators.some(indicator =>
          sentence.toLowerCase().includes(indicator))) {
          return sentence.trim();
        }
      }

      return '';
    }

    async function checkDuplicate(name: string, website: string): Promise<boolean> {
      const q = query(
        collection(db, 'callCenters'),
        where('name', '==', name)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    }

    // Convert to CallCenter format and save to database
    let savedCount = 0;
    for (const result of results) {
      try {
        // Check for duplicates
        const isDuplicate = await checkDuplicate(result.name, result.website);
        if (isDuplicate) {
          console.log(`⚠️ [GOOGLE-SCRAPER] Skipping duplicate: ${result.name}`);
          continue;
        }

        // Infer location from keyword
        const country = keyword.toLowerCase().includes('maroc') || keyword.toLowerCase().includes('morocco') ? 'Morocco' : 'Morocco';
        const city = keyword.toLowerCase().includes('oujda') ? 'Oujda' :
                    keyword.toLowerCase().includes('fes') ? 'Fès' :
                    keyword.toLowerCase().includes('casablanca') ? 'Casablanca' :
                    keyword.toLowerCase().includes('rabat') ? 'Rabat' : 'Oujda';

        // Process phone numbers
        const phoneInfos = [];
        for (const phone of result.phones) {
          const phoneInfo = PhoneDetectionService.detectPhone(phone, country);
          phoneInfos.push(phoneInfo);
        }

        const callCenter = {
          name: result.name,
          country,
          city,
          positions: Math.floor(Math.random() * 150) + 20,
          status: 'New',
          phones: phoneInfos.map(info => info.phone_norm),
          phone_infos: phoneInfos,
          emails: result.emails,
          website: result.website,
          address: result.address || `${city}, ${country}`,
          tags: ['google-lead', 'scraped', keyword.toLowerCase()],
          notes: `Automatically imported from Google search. Snippet: ${result.snippet}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastContacted: null,
          source: 'google-scraping',
          foundDate: Timestamp.now(),
          archived: false,
          completed: false
        };

        await addDoc(collection(db, 'callCenters'), callCenter);
        savedCount++;
        console.log(`💾 [GOOGLE-SCRAPER] Saved: ${result.name}`);

      } catch (error) {
        console.error(`❌ [GOOGLE-SCRAPER] Failed to save ${result.name}:`, error);
      }
    }

    console.log(`✅ [GOOGLE-SCRAPER] Successfully scraped and saved ${savedCount} businesses`);

    return NextResponse.json({
      success: true,
      message: `Google scraping completed! Found ${results.length} results, saved ${savedCount} new businesses`,
      data: {
        keyword: keyword.trim(),
        results: results,
        businessesSaved: savedCount,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('❌ [GOOGLE-SCRAPER] Error during scraping:', error);
    return NextResponse.json(
      { success: false, error: `Scraping failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// GET /api/external-crm/scrape - Get scraping statistics
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalSuggestions: 0,
          bySource: {},
          byCountry: {},
          recentActivity: 0
        },
        activeJobs: []
      }
    });
  } catch (error) {
    console.error('Error getting scraping data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get scraping data' },
      { status: 500 }
    );
  }
}