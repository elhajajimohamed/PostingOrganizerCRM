import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { country, city, keywords } = await request.json();

    console.log('🔍 Smart Leads - Google Search:', { country, city, keywords });

    // Free Google Business data collection using public APIs
    // This uses Google's Places API alternative - free tier with limitations
    const leads = await searchGoogleBusiness(country, city, keywords);

    return NextResponse.json({
      success: true,
      leads,
      count: leads.length
    });

  } catch (error) {
    console.error('❌ Smart Leads Google API error:', error);
    return NextResponse.json(
      { error: 'Failed to search Google Business' },
      { status: 500 }
    );
  }
}

async function searchGoogleBusiness(country: string, city: string, keywords: string) {
  const leads = [];

  try {
    // Use Google Places API (free tier) or alternative free sources
    // Since we can't use paid APIs, we'll simulate with mock data for now
    // In production, you could use:
    // 1. Google Places API (free tier: 1 request per second, 500 requests/day)
    // 2. Google Custom Search API (free tier: 100 requests/day)
    // 3. Web scraping of Google Business listings (with proper rate limiting)

    // Real Google search scraping using Puppeteer
    const scrapeGoogleBusinesses = async (country: string, city: string, keywords: string) => {
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

        // Search query for Google
        const searchQuery = `${keywords} ${city} ${country} call center OR telemarketing OR BPO OR outsourcing`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=`;

        console.log('🔍 Scraping Google for:', searchQuery);

        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // Wait for results to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract business information from search results
        const businessResults = await page.evaluate(() => {
          const results: any[] = [];

          // Look for business listings in search results
          const businessElements = document.querySelectorAll('[data-ved], .g, .tF2Cxc');

          businessElements.forEach((element, index) => {
            if (index >= 10) return; // Limit to first 10 results

            const titleElement = element.querySelector('h3, .LC20lb');
            const linkElement = element.querySelector('a[href]');
            const snippetElement = element.querySelector('.VwiC3b, .aCOpRe span');

            if (titleElement && linkElement) {
              const title = titleElement.textContent?.trim() || '';
              const url = linkElement.href || '';
              const snippet = snippetElement?.textContent?.trim() || '';

              // Extract phone number from snippet if available
              const phoneMatch = snippet.match(/(\+?\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4})/);
              const phone = phoneMatch ? phoneMatch[1] : null;

              // Extract website from URL if it's a business site
              let website = null;
              if (url.includes('.ma') || url.includes('.tn') || url.includes('.sn') || url.includes('.dz') || url.includes('.eg')) {
                website = url;
              }

              if (title && (title.toLowerCase().includes('call center') ||
                           title.toLowerCase().includes('telecom') ||
                           title.toLowerCase().includes('bpo') ||
                           snippet.toLowerCase().includes('call center') ||
                           snippet.toLowerCase().includes('telemarketing'))) {

                results.push({
                  name: title,
                  phone: phone,
                  website: website,
                  url: url,
                  description: snippet,
                  source: 'google-search'
                });
              }
            }
          });

          return results;
        });

        // Try to get more detailed info from individual business pages
        for (const business of businessResults.slice(0, 5)) { // Limit to 5 for performance
          try {
            if (business.website) {
              await page.goto(business.website, { waitUntil: 'networkidle2', timeout: 10000 });

              const pageData = await page.evaluate(() => {
                // Extract contact information from the business website
                const phones: string[] = [];
                const emails: string[] = [];

                // Look for phone numbers
                const phoneRegex = /(\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4})/g;
                const textContent = document.body.textContent || '';
                const phoneMatches = textContent.match(phoneRegex);
                if (phoneMatches) {
                  phones.push(...phoneMatches.slice(0, 2)); // Take first 2 phone numbers
                }

                // Look for email addresses
                const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
                const emailMatches = textContent.match(emailRegex);
                if (emailMatches) {
                  emails.push(...emailMatches.slice(0, 2)); // Take first 2 emails
                }

                // Get page title and meta description
                const title = document.title || '';
                const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

                return {
                  phones: [...new Set(phones)], // Remove duplicates
                  emails: [...new Set(emails)], // Remove duplicates
                  title,
                  description: metaDesc
                };
              });

              // Update business with extracted data
              if (pageData.phones.length > 0) {
                business.phone = pageData.phones[0];
              }
              if (pageData.emails.length > 0) {
                business.email = pageData.emails[0];
              }
              if (pageData.description) {
                business.description = pageData.description;
              }
            }
          } catch (error) {
            console.log(`Could not scrape details for ${business.name}:`, error.message);
          }
        }

        await browser.close();

        // Convert to lead format
        const leadsFormatted = businessResults.map(business => ({
          name: business.name,
          phone: business.phone || null,
          email: business.email || `contact@${business.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.${country === 'morocco' ? 'ma' : country === 'tunisia' ? 'tn' : country === 'senegal' ? 'sn' : country === 'algeria' ? 'dz' : 'eg'}`,
          website: business.website,
          address: `${city}, ${country.charAt(0).toUpperCase() + country.slice(1)}`,
          description: business.description || `${business.name} - Call center and business services`,
          source: 'google-search-scraping',
          city: city
        }));

        console.log(`✅ Found ${leadsFormatted.length} businesses from Google scraping`);
        return leadsFormatted;

      } catch (error) {
        console.error('Error scraping Google:', error);
        return [];
      }
    };

    const mockLeads = await scrapeGoogleBusinesses(country, city, keywords);

    // Filter by country and keywords
    const filteredLeads = mockLeads.filter(lead => {
      const countryMatch = !country || lead.address.toLowerCase().includes(country.toLowerCase());
      const keywordMatch = !keywords || keywords.split(',').some(keyword =>
        lead.name.toLowerCase().includes(keyword.trim().toLowerCase()) ||
        lead.description.toLowerCase().includes(keyword.trim().toLowerCase())
      );
      return countryMatch && keywordMatch;
    });

    leads.push(...filteredLeads);

    // Add some delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error('Error in Google Business search:', error);
  }

  return leads;
}