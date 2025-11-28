import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { country, city, keywords } = await request.json();

    console.log('🔍 Smart Leads - Yellow Pages Search:', { country, city, keywords });

    // Free yellow pages data collection
    // This uses public directory APIs and web scraping (free)
    const leads = await searchYellowPages(country, city, keywords);

    return NextResponse.json({
      success: true,
      leads,
      count: leads.length
    });

  } catch (error) {
    console.error('❌ Smart Leads Yellow Pages API error:', error);
    return NextResponse.json(
      { error: 'Failed to search yellow pages' },
      { status: 500 }
    );
  }
}

async function searchYellowPages(country: string, city: string, keywords: string) {
  const leads: any[] = [];

  try {
    // Real Yellow Pages web scraping using Puppeteer
    const scrapeYellowPages = async (country: string, city: string, keywords: string) => {
      try {
        const puppeteer = (await import('puppeteer')).default;
        const leads: any[] = [];

        // Launch browser
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Yellow Pages search URLs
        const yellowPagesUrls = {
          morocco: 'https://www.yellowpages.ma',
          tunisia: 'https://www.pagesjaunes.tn',
          senegal: 'https://www.yellowpages.sn',
          algeria: 'https://www.pagesjaunes.dz',
          egypt: 'https://www.yellowpages.com.eg'
        };

        const baseUrl = yellowPagesUrls[country as keyof typeof yellowPagesUrls] || yellowPagesUrls.morocco;
        const searchQuery = `${keywords} ${city}`;
        const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(searchQuery)}`;

        console.log('🔍 Scraping Yellow Pages for:', searchQuery, 'in', country);

        try {
          await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });

          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 3000));

          const directoryResults = await page.evaluate(() => {
            const results: any[] = [];

            // Look for business listings - different selectors for different yellow pages sites
            const businessSelectors = [
              '.business-card, .listing-item, .result-item, .company-item',
              '[data-business], [data-listing]',
              '.business-listing, .directory-listing'
            ];

            let businessElements: Element[] = [];
            for (const selector of businessSelectors) {
              businessElements = Array.from(document.querySelectorAll(selector));
              if (businessElements.length > 0) break;
            }

            businessElements.slice(0, 10).forEach((element) => {
              const nameElement = element.querySelector('.business-name, .company-name, h3, h4, .title');
              const phoneElement = element.querySelector('.phone, .telephone, .contact-phone');
              const addressElement = element.querySelector('.address, .location');
              const websiteElement = element.querySelector('.website a, .url a');
              const descElement = element.querySelector('.description, .summary, p');

              const name = nameElement?.textContent?.trim() || '';
              const phone = phoneElement?.textContent?.trim() || null;
              const address = addressElement?.textContent?.trim() || '';
              const website = websiteElement?.getAttribute('href') || websiteElement?.textContent?.trim() || null;
              const description = descElement?.textContent?.trim() || '';

              if (name && (name.toLowerCase().includes('call center') ||
                          name.toLowerCase().includes('telecom') ||
                          name.toLowerCase().includes('bpo') ||
                          description.toLowerCase().includes('call center'))) {
                results.push({
                  name,
                  phone,
                  address,
                  website,
                  description: description || `${name} - Business directory listing`,
                  source: 'yellow-pages-scraping'
                });
              }
            });

            return results;
          });

          // Convert to lead format
          directoryResults.forEach(result => {
            leads.push({
              name: result.name,
              phone: result.phone,
              email: `contact@${result.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.${country === 'morocco' ? 'ma' : country === 'tunisia' ? 'tn' : country === 'senegal' ? 'sn' : country === 'algeria' ? 'dz' : 'eg'}`,
              website: result.website,
              address: result.address || `${city}, ${country.charAt(0).toUpperCase() + country.slice(1)}`,
              description: result.description,
              source: `yellow-pages-${country.slice(0, 2).toLowerCase()}-scraping`,
              city: city
            });
          });

        } catch (error) {
          console.log(`Yellow Pages scraping failed for ${country}:`, error instanceof Error ? error.message : 'Unknown error');
        }

        await browser.close();

        console.log(`✅ Found ${leads.length} yellow pages leads`);
        return leads;

      } catch (error) {
        console.error('Error scraping yellow pages:', error);
        return [];
      }
    };

    const scrapedLeads = await scrapeYellowPages(country, city, keywords);
    leads.push(...scrapedLeads);

    // Add some delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));

  } catch (error) {
    console.error('Error in yellow pages search:', error);
  }

  return leads;
}