import { NextRequest, NextResponse } from 'next/server';
import { AutomatedDiscoveryService } from '@/lib/services/automated-discovery-service';

// POST /api/external-crm/scrape - Trigger automated discovery/scraping
export async function POST(request: NextRequest) {
  try {
    const { country, source, options } = await request.json();

    if (!country || !['Morocco', 'Tunisia', 'Senegal', 'Ivory Coast', 'Guinea', 'Cameroon'].includes(country)) {
      return NextResponse.json(
        { success: false, error: 'Invalid country specified' },
        { status: 400 }
      );
    }

    const validSources = ['google', 'facebook', 'linkedin', 'yellowpages'];
    const scrapingSource = (source && validSources.includes(source)) ? source : 'google';

    // Start the automated discovery process
    const jobId = await AutomatedDiscoveryService.startDiscovery(country, scrapingSource, options);

    return NextResponse.json({
      success: true,
      message: `Automated discovery initiated for ${country} using ${scrapingSource}`,
      jobId,
      data: {
        jobId,
        country,
        source: scrapingSource,
        status: 'started'
      }
    });
  } catch (error) {
    console.error('Error triggering automated discovery:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate automated discovery' },
      { status: 500 }
    );
  }
}

// GET /api/external-crm/scrape - Get scraping statistics and active jobs
export async function GET() {
  try {
    const stats = await AutomatedDiscoveryService.getScrapingStats();
    const activeJobs = await AutomatedDiscoveryService.getActiveJobs();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        activeJobs
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