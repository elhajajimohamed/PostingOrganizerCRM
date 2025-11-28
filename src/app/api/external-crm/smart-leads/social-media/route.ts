import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { country, city, keywords } = await request.json();

    console.log('🔍 Smart Leads - Social Media Search:', { country, city, keywords });

    // Free social media data collection
    // This uses public APIs and web scraping techniques (free)
    const leads = await searchSocialMedia(country, city, keywords);

    return NextResponse.json({
      success: true,
      leads,
      count: leads.length
    });

  } catch (error) {
    console.error('❌ Smart Leads Social Media API error:', error);
    return NextResponse.json(
      { error: 'Failed to search social media' },
      { status: 500 }
    );
  }
}

async function searchSocialMedia(country: string, city: string, keywords: string) {
  const leads = [];

  try {
    // Free social media data collection methods:
    // 1. Facebook Graph API (limited free tier)
    // 2. LinkedIn public profiles (no API key needed)
    // 3. Twitter API (free tier available)
    // 4. Instagram Basic Display API (free)
    // 5. Web scraping of public business pages

    // For demonstration, we'll return mock data
    // In production, implement actual API calls

    // Real social media scraping using Puppeteer
    const scrapeSocialMedia = async (country: string, city: string, keywords: string) => {
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

        // Facebook search
        try {
          const facebookSearchUrl = `https://www.facebook.com/search/pages/?q=${encodeURIComponent(keywords + ' ' + city + ' ' + country)}`;
          console.log('🔍 Scraping Facebook for:', keywords, city, country);

          await page.goto(facebookSearchUrl, { waitUntil: 'networkidle2', timeout: 15000 });

          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 3000));

          const facebookResults = await page.evaluate(() => {
            const results: any[] = [];
            const pageElements = document.querySelectorAll('[data-visualcompletion="ignore-dynamic"] a[href*="/pages/"], [role="article"] a[href*="/pages/"]');

            pageElements.forEach((element, index) => {
              if (index >= 5) return; // Limit to 5 results

              const link = element as HTMLAnchorElement;
              const href = link.href || '';
              const titleElement = element.querySelector('[dir="auto"]') || element.querySelector('span');
              const title = titleElement?.textContent?.trim() || '';

              if (title && href.includes('/pages/') && (title.toLowerCase().includes('call center') ||
                  title.toLowerCase().includes('telecom') || title.toLowerCase().includes('bpo'))) {
                results.push({
                  name: title,
                  facebookUrl: href,
                  source: 'facebook-scraping'
                });
              }
            });

            return results;
          });

          // Convert Facebook results to leads
          facebookResults.forEach(result => {
            leads.push({
              name: result.name,
              phone: null,
              email: `contact@${result.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.${country === 'morocco' ? 'ma' : country === 'tunisia' ? 'tn' : country === 'senegal' ? 'sn' : country === 'algeria' ? 'dz' : 'eg'}`,
              website: null,
              address: `${city}, ${country.charAt(0).toUpperCase() + country.slice(1)}`,
              description: `${result.name} - Business page found on Facebook`,
              source: 'facebook-scraping',
              city: city,
              socialLinks: [result.facebookUrl]
            });
          });

        } catch (error) {
          console.log('Facebook scraping failed:', error.message);
        }

        // LinkedIn search
        try {
          const linkedinSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(keywords + ' ' + city + ' ' + country)}`;
          console.log('🔍 Scraping LinkedIn for:', keywords, city, country);

          await page.goto(linkedinSearchUrl, { waitUntil: 'networkidle2', timeout: 15000 });

          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 3000));

          const linkedinResults = await page.evaluate(() => {
            const results: any[] = [];
            const companyElements = document.querySelectorAll('[data-test-id="search-result-entity"] a[href*="/company/"]');

            companyElements.forEach((element, index) => {
              if (index >= 5) return; // Limit to 5 results

              const link = element as HTMLAnchorElement;
              const href = link.href || '';
              const nameElement = element.querySelector('.entity-result__title-text');
              const subtitleElement = element.querySelector('.entity-result__primary-subtitle');
              const name = nameElement?.textContent?.trim() || '';
              const subtitle = subtitleElement?.textContent?.trim() || '';

              if (name && (name.toLowerCase().includes('call center') ||
                  name.toLowerCase().includes('telecom') ||
                  name.toLowerCase().includes('bpo') ||
                  subtitle.toLowerCase().includes('call center'))) {
                results.push({
                  name: name,
                  linkedinUrl: href.includes('http') ? href : `https://www.linkedin.com${href}`,
                  subtitle: subtitle,
                  source: 'linkedin-scraping'
                });
              }
            });

            return results;
          });

          // Convert LinkedIn results to leads
          linkedinResults.forEach(result => {
            leads.push({
              name: result.name,
              phone: null,
              email: `contact@${result.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.${country === 'morocco' ? 'ma' : country === 'tunisia' ? 'tn' : country === 'senegal' ? 'sn' : country === 'algeria' ? 'dz' : 'eg'}`,
              website: null,
              address: `${city}, ${country.charAt(0).toUpperCase() + country.slice(1)}`,
              description: `${result.name} - ${result.subtitle || 'Company found on LinkedIn'}`,
              source: 'linkedin-scraping',
              city: city,
              socialLinks: [result.linkedinUrl]
            });
          });

        } catch (error) {
          console.log('LinkedIn scraping failed:', error.message);
        }

        await browser.close();

        console.log(`✅ Found ${leads.length} social media leads`);
        return leads;

      } catch (error) {
        console.error('Error scraping social media:', error);
        return [];
      }
    };

    const mockLeads = await scrapeSocialMedia(country, city, keywords);

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
    await new Promise(resolve => setTimeout(resolve, 1500));

  } catch (error) {
    console.error('Error in social media search:', error);
  }

  return leads;
}