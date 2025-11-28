import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface DashboardStats {
  totalCallCenters: number;
  activeCallCenters: number;
  newThisMonth: number;
  totalValue: number;
  wonValue: number;
  avgPositions: number;
  conversionRate: number;
  statusCounts: Record<string, number>;
  countryCounts: Record<string, number>;
  performanceMetrics: {
    recentAdditions: number;
    recentWins: number;
    recentValue: number;
    avgDealSize: number;
  };
  totalTopups: number;
  recentTopups: number;
}

export async function GET() {
  try {

    console.log('📊 [DASHBOARD] Fetching real dashboard statistics from Firebase...');

    // Get all call centers
    const callCentersSnapshot = await adminDb.collection('callCenters').get();

    // Get all top-ups
    const topupsSnapshot = await adminDb.collection('clientTopups').get();

    const topups = topupsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        clientId: data.clientId || '',
        clientName: data.clientName || '',
        callCenterName: data.callCenterName || '',
        amountEUR: data.amountEUR || 0,
        paymentMethod: data.paymentMethod || '',
        date: data.date?.toDate?.()?.toISOString() || data.date || '',
        country: data.country || '',
        notes: data.notes || '',
      };
    });

    console.log(`📊 [DASHBOARD] Found ${topups.length} top-ups in database`);

    const callCenters = callCentersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        country: data.country || '',
        city: data.city || '',
        positions: data.positions || 0,
        status: data.status || 'New',
        value: data.value || 0,
        currency: data.currency || 'USD',
        phones: data.phones || [],
        emails: data.emails || [],
        website: data.website || '',
        address: data.address || '',
        source: data.source || '',
        type: data.type || '',
        tags: data.tags || [],
        markets: data.markets || [],
        competitors: data.competitors || [],
        socialMedia: data.socialMedia || [],
        foundDate: data.foundDate || '',
        lastContacted: data.lastContacted?.toDate?.()?.toISOString() || data.lastContacted,
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    console.log(`📊 [DASHBOARD] Found ${callCenters.length} call centers in database`);

    // Calculate basic statistics
    const totalCallCenters = callCenters.length;
    const activeCallCenters = callCenters.filter(cc =>
      !['Closed-Won', 'Closed-Lost', 'On-Hold'].includes(cc.status)
    ).length;

    // New this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = callCenters.filter(cc => {
      const createdAt = new Date(cc.createdAt);
      return createdAt >= startOfMonth;
    }).length;

    // Value calculations
    const totalValue = callCenters.reduce((sum, cc) => sum + (cc.value || 0), 0);
    const wonValue = callCenters.filter(cc => cc.status === 'Closed-Won')
      .reduce((sum, cc) => sum + (cc.value || 0), 0);

    // Top-up calculations
    console.log('📊 [DASHBOARD] Calculating top-up statistics...');
    const totalTopups = topups.reduce((sum, topup) => sum + topup.amountEUR, 0);
    console.log('📊 [DASHBOARD] Total top-ups calculated:', totalTopups);

    // Performance metrics (last 30 days) - moved up to fix variable usage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    console.log('📊 [DASHBOARD] Thirty days ago date:', thirtyDaysAgo.toISOString());

    const recentTopups = topups.filter(topup => {
      const topupDate = new Date(topup.date);
      return topupDate >= thirtyDaysAgo;
    }).reduce((sum, topup) => sum + topup.amountEUR, 0);
    console.log('📊 [DASHBOARD] Recent top-ups calculated:', recentTopups);

    // Average positions
    const avgPositions = totalCallCenters > 0
      ? Math.round(callCenters.reduce((sum, cc) => sum + (cc.positions || 0), 0) / totalCallCenters)
      : 0;

    // Status distribution
    const statusCounts = callCenters.reduce((acc, cc) => {
      acc[cc.status] = (acc[cc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Country distribution
    const countryCounts = callCenters.reduce((acc, cc) => {
      const country = cc.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Conversion rate
    const totalLeads = callCenters.filter(cc => cc.status !== 'Closed-Lost').length;
    const wonDeals = callCenters.filter(cc => cc.status === 'Closed-Won').length;
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

    const recentCallCenters = callCenters.filter(cc => {
      const createdAt = new Date(cc.createdAt);
      return createdAt >= thirtyDaysAgo;
    });

    const recentWins = recentCallCenters.filter(cc => cc.status === 'Closed-Won').length;
    const recentValue = recentCallCenters.filter(cc => cc.status === 'Closed-Won')
      .reduce((sum, cc) => sum + (cc.value || 0), 0);
    const avgDealSize = recentWins > 0 ? Math.round(recentValue / recentWins) : 0;

    const stats: DashboardStats = {
      totalCallCenters,
      activeCallCenters,
      newThisMonth,
      totalValue,
      wonValue,
      avgPositions,
      conversionRate,
      statusCounts,
      countryCounts,
      performanceMetrics: {
        recentAdditions: recentCallCenters.length,
        recentWins,
        recentValue,
        avgDealSize
      },
      // Add topup financial data
      totalTopups,
      recentTopups
    };

    console.log('📊 [DASHBOARD] Calculated statistics:', stats);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ [DASHBOARD] Error fetching dashboard statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}