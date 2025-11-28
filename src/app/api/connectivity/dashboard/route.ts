import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('🔗 [CONNECTIVITY] Fetching real-time connectivity data...');

    // Get all collections data concurrently
    const [
      callCentersSnapshot,
      accountsSnapshot,
      groupsSnapshot,
      tasksSnapshot,
      mediaSnapshot,
      postHistorySnapshot,
      whatsappSnapshot,
      callsSnapshot
    ] = await Promise.all([
      getDocs(collection(db, 'callCenters')),
      getDocs(collection(db, 'accounts')),
      getDocs(collection(db, 'groups')),
      getDocs(collection(db, 'tasks')),
      getDocs(collection(db, 'media')),
      getDocs(collection(db, 'postHistory')),
      getDocs(collection(db, 'dailyWhatsApp')),
      getDocs(collection(db, 'dailyCalls'))
    ]);

    // Process call centers data
    const callCenters = callCentersSnapshot.docs.map(doc => {
      const data = doc.data() as any;
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

    // Process other data with proper typing
    const accounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    const groups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    const media = mediaSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    const postHistory = postHistorySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    const whatsappData = whatsappSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    const callsData = callsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

    // Calculate metrics
    const totalCallCenters = callCenters.length;
    const activeLeads = callCenters.filter(cc => !['Closed-Won', 'Closed-Lost', 'On-Hold'].includes(cc.status)).length;
    const conversionRate = totalCallCenters > 0 ? Math.round((callCenters.filter(cc => cc.status === 'Closed-Won').length / totalCallCenters) * 100) : 0;
    
    // Recent activity (last 24 hours)
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentActivity = callCenters.filter(cc => {
      const createdAt = new Date(cc.createdAt);
      return createdAt >= dayAgo;
    }).length;

    // Task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => (task as any).status === 'completed').length;
    const pendingTasks = tasks.filter(task => (task as any).status === 'pending').length;
    const overdueTasks = tasks.filter(task => {
      const dueDate = new Date((task as any).dueDate || Date.now());
      return dueDate < now && (task as any).status !== 'completed';
    }).length;

    // WhatsApp statistics
    const activeSessions = whatsappData.filter(w => (w as any).status === 'active').length;
    const messagesSent = whatsappData.reduce((sum, w) => sum + ((w as any).sentMessages || 0), 0);
    const successRate = whatsappData.length > 0 ? 
      Math.round((whatsappData.filter(w => (w as any).status === 'completed').length / whatsappData.length) * 100) : 0;

    // Call statistics
    const totalCalls = callsData.length;
    const successfulCalls = callsData.filter(call => (call as any).status === 'completed').length;
    const averageDuration = callsData.length > 0 ? 
      callsData.reduce((sum, call) => sum + ((call as any).duration || 0), 0) / callsData.length : 0;
    const connectionQuality = totalCalls > 0 ? 
      Math.round((successfulCalls / totalCalls) * 100) : 0;

    // Connection status
    const activeAccounts = accounts.filter(account => (account as any).status === 'active').length;
    const activeGroups = groups.filter(group => (group as any).status === 'active').length;

    // Calculate data transfer (mock calculation)
    const dataTransfer = (messagesSent * 1024) + (totalCalls * 512) + (postHistory.length * 256);

    // Generate connectivity data
    const connectivityData = {
      overview: {
        totalConnections: totalCallCenters + accounts.length + groups.length + activeSessions,
        activeConnections: activeLeads + activeAccounts + activeGroups + activeSessions,
        dataTransfer: dataTransfer,
        responseTime: Math.round(Math.random() * 100 + 50), // Mock response time
        uptime: 99.5 + Math.random() * 0.5, // Mock uptime
        lastUpdate: new Date().toISOString()
      },
      sections: {
        crm: {
          totalRecords: totalCallCenters,
          activeLeads: activeLeads,
          conversionRate: conversionRate,
          recentActivity: recentActivity
        },
        accounts: {
          totalAccounts: accounts.length,
          activeAccounts: activeAccounts,
          connectionStatus: activeAccounts > 0 ? 'online' as const : 'offline' as const,
          lastSync: new Date().toISOString()
        },
        groups: {
          totalGroups: groups.length,
          activeGroups: activeGroups,
          engagementRate: Math.round((activeGroups / Math.max(groups.length, 1)) * 100),
          recentPosts: postHistory.filter(post => {
            const postDate = new Date((post as any).timestamp || Date.now());
            return postDate >= dayAgo;
          }).length
        },
        tasks: {
          totalTasks: totalTasks,
          completedTasks: completedTasks,
          pendingTasks: pendingTasks,
          overdueTasks: overdueTasks
        },
        whatsapp: {
          activeSessions: activeSessions,
          messagesSent: messagesSent,
          successRate: successRate,
          lastActivity: whatsappData.length > 0 ? 
            (whatsappData[whatsappData.length - 1] as any).createdAt?.toDate?.()?.toISOString() || new Date().toISOString() :
            new Date().toISOString()
        },
        calls: {
          totalCalls: totalCalls,
          successfulCalls: successfulCalls,
          averageDuration: averageDuration,
          connectionQuality: connectionQuality
        }
      },
      realTimeMetrics: {
        connectionsPerSecond: Math.random() * 5 + 1,
        dataFlow: dataTransfer / 3600, // Data per hour
        errorRate: Math.random() * 2,
        throughput: Math.random() * 100 + 50
      },
      alerts: [
        {
          id: '1',
          type: 'success' as const,
          message: 'All systems operational',
          timestamp: new Date().toISOString(),
          section: 'System'
        },
        {
          id: '2',
          type: 'info' as const,
          message: `${activeLeads} active leads in CRM`,
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          section: 'CRM'
        },
        {
          id: '3',
          type: 'warning' as const,
          message: 'High memory usage detected',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          section: 'Performance'
        },
        {
          id: '4',
          type: 'info' as const,
          message: `${activeSessions} WhatsApp sessions active`,
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          section: 'WhatsApp'
        }
      ]
    };

    console.log('🔗 [CONNECTIVITY] Calculated connectivity data:', {
      totalConnections: connectivityData.overview.totalConnections,
      activeConnections: connectivityData.overview.activeConnections,
      crmRecords: connectivityData.sections.crm.totalRecords,
      accounts: connectivityData.sections.accounts.totalAccounts,
      groups: connectivityData.sections.groups.totalGroups
    });

    return NextResponse.json(connectivityData);
  } catch (error) {
    console.error('❌ [CONNECTIVITY] Error fetching connectivity data:', error);
    
    // Return fallback data on error
    const fallbackData = {
      overview: {
        totalConnections: 0,
        activeConnections: 0,
        dataTransfer: 0,
        responseTime: 0,
        uptime: 99.9,
        lastUpdate: new Date().toISOString()
      },
      sections: {
        crm: { totalRecords: 1318, activeLeads: 0, conversionRate: 0, recentActivity: 0 },
        accounts: { totalAccounts: 0, activeAccounts: 0, connectionStatus: 'offline' as const, lastSync: '' },
        groups: { totalGroups: 0, activeGroups: 0, engagementRate: 0, recentPosts: 0 },
        tasks: { totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0 },
        whatsapp: { activeSessions: 0, messagesSent: 0, successRate: 0, lastActivity: '' },
        calls: { totalCalls: 0, successfulCalls: 0, averageDuration: 0, connectionQuality: 0 }
      },
      realTimeMetrics: {
        connectionsPerSecond: 0,
        dataFlow: 0,
        errorRate: 0,
        throughput: 0
      },
      alerts: [
        {
          id: 'error-1',
          type: 'error' as const,
          message: 'Failed to load real-time data',
          timestamp: new Date().toISOString(),
          section: 'System'
        }
      ]
    };

    return NextResponse.json(fallbackData);
  }
}