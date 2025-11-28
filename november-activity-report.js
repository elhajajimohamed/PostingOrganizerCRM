const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function generateNovemberReport() {
  console.log('🔍 Generating November 2025 Activity Report...\n');

  const report = {
    generatedAt: new Date().toISOString(),
    period: 'November 2025',
    startDate: '2025-11-01',
    endDate: '2025-11-30',
    data: {}
  };

  try {
    // 1. PROSPECTS - Get all prospects created or contacted in November
    console.log('👥 Loading prospects...');
    const prospectsSnapshot = await db.collection('prospects').get();
    const prospects = prospectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      lastContacted: doc.data().lastContacted?.toDate?.()?.toISOString() || doc.data().lastContacted,
      addedDate: doc.data().addedDate,
      prospectDate: doc.data().prospectDate
    }));

    // Filter prospects related to November
    const novemberProspects = prospects.filter(prospect => {
      const createdDate = prospect.createdAt || prospect.addedDate || prospect.prospectDate;
      if (!createdDate) return false;

      const date = new Date(createdDate);
      return date.getFullYear() === 2025 && date.getMonth() === 10; // November is month 10 (0-indexed)
    });

    report.data.prospects = {
      total: novemberProspects.length,
      byStatus: novemberProspects.reduce((acc, p) => {
        acc[p.status || 'unknown'] = (acc[p.status || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      byBusinessType: novemberProspects.reduce((acc, p) => {
        acc[p.businessType || 'unknown'] = (acc[p.businessType || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      data: novemberProspects
    };
    console.log(`✅ Found ${novemberProspects.length} prospects from November`);

    // 2. CALL LOGS - Get all call logs from November
    console.log('📞 Loading call logs...');
    const callLogsSnapshot = await db.collection('prospects').get();
    const allCallLogs = [];

    for (const prospectDoc of callLogsSnapshot.docs) {
      const prospectData = prospectDoc.data();
      if (prospectData.callHistory && Array.isArray(prospectData.callHistory)) {
        prospectData.callHistory.forEach(callLog => {
          if (callLog.date) {
            const callDate = new Date(callLog.date);
            if (callDate.getFullYear() === 2025 && callDate.getMonth() === 10) {
              allCallLogs.push({
                prospectId: prospectDoc.id,
                prospectName: prospectData.name,
                ...callLog,
                date: callLog.date
              });
            }
          }
        });
      }
    }

    report.data.callLogs = {
      total: allCallLogs.length,
      byOutcome: allCallLogs.reduce((acc, log) => {
        acc[log.outcome || 'unknown'] = (acc[log.outcome || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      byDisposition: allCallLogs.reduce((acc, log) => {
        acc[log.disposition || 'unknown'] = (acc[log.disposition || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      data: allCallLogs
    };
    console.log(`✅ Found ${allCallLogs.length} call logs from November`);

    // 3. DAILY TASKS - Get tasks from November
    console.log('📋 Loading daily tasks...');
    const tasksSnapshot = await db.collection('tasks').get();
    const novemberTasks = tasksSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        doneAt: doc.data().doneAt?.toDate?.()?.toISOString() || doc.data().doneAt
      }))
      .filter(task => {
        if (!task.date) return false;
        const taskDate = new Date(task.date);
        return taskDate.getFullYear() === 2025 && taskDate.getMonth() === 10;
      });

    report.data.dailyTasks = {
      total: novemberTasks.length,
      completed: novemberTasks.filter(t => t.status === 'completed').length,
      pending: novemberTasks.filter(t => t.status !== 'completed').length,
      byStatus: novemberTasks.reduce((acc, t) => {
        acc[t.status || 'unknown'] = (acc[t.status || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      data: novemberTasks
    };
    console.log(`✅ Found ${novemberTasks.length} daily tasks from November`);

    // 4. GROUPS POSTING - Get posting sessions from November
    console.log('📢 Loading groups posting data...');
    const postingSessionsSnapshot = await db.collection('postingSessions').get();
    const novemberPostingSessions = postingSessionsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      }))
      .filter(session => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate.getFullYear() === 2025 && sessionDate.getMonth() === 10;
      });

    report.data.groupsPosting = {
      total: novemberPostingSessions.length,
      byStatus: novemberPostingSessions.reduce((acc, s) => {
        acc[s.status || 'unknown'] = (acc[s.status || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      data: novemberPostingSessions
    };
    console.log(`✅ Found ${novemberPostingSessions.length} posting sessions from November`);

    // 5. DAILY WHATSAPP - Get WhatsApp sessions from November
    console.log('💬 Loading daily WhatsApp sessions...');
    const whatsappSessionsSnapshot = await db.collection('dailyWhatsAppSessions').get();
    const novemberWhatsAppSessions = whatsappSessionsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      }))
      .filter(session => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate.getFullYear() === 2025 && sessionDate.getMonth() === 10;
      });

    report.data.dailyWhatsApp = {
      total: novemberWhatsAppSessions.length,
      totalSent: novemberWhatsAppSessions.reduce((sum, s) => sum + (s.sentTodayIds?.length || 0), 0),
      totalSelected: novemberWhatsAppSessions.reduce((sum, s) => sum + (s.selectedCallCenterIds?.length || 0), 0),
      data: novemberWhatsAppSessions
    };
    console.log(`✅ Found ${novemberWhatsAppSessions.length} WhatsApp sessions from November`);

    // 6. CALL CENTERS NOTES - Get call centers with notes or activity in November
    console.log('🏢 Loading call centers with November activity...');
    const callCentersSnapshot = await db.collection('callCenters').get();
    const novemberCallCenters = callCentersSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        lastContacted: doc.data().lastContacted?.toDate?.()?.toISOString() || doc.data().lastContacted
      }))
      .filter(cc => {
        // Check if created in November
        if (cc.createdAt) {
          const createdDate = new Date(cc.createdAt);
          if (createdDate.getFullYear() === 2025 && createdDate.getMonth() === 10) return true;
        }
        // Check if last contacted in November
        if (cc.lastContacted) {
          const lastContactedDate = new Date(cc.lastContacted);
          if (lastContactedDate.getFullYear() === 2025 && lastContactedDate.getMonth() === 10) return true;
        }
        // Check if updated in November
        if (cc.updatedAt) {
          const updatedDate = new Date(cc.updatedAt);
          if (updatedDate.getFullYear() === 2025 && updatedDate.getMonth() === 10) return true;
        }
        return false;
      });

    report.data.callCentersNotes = {
      total: novemberCallCenters.length,
      withNotes: novemberCallCenters.filter(cc => cc.notes && cc.notes.trim()).length,
      data: novemberCallCenters
    };
    console.log(`✅ Found ${novemberCallCenters.length} call centers with November activity`);

    // 7. CALENDAR EVENTS - Get calendar events from November
    console.log('📅 Loading calendar events...');
    const calendarSnapshot = await db.collection('calendarEvents').get();
    const novemberCalendarEvents = calendarSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      }))
      .filter(event => {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        return eventDate.getFullYear() === 2025 && eventDate.getMonth() === 10;
      });

    report.data.calendarEvents = {
      total: novemberCalendarEvents.length,
      byType: novemberCalendarEvents.reduce((acc, e) => {
        acc[e.type || 'unknown'] = (acc[e.type || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      completed: novemberCalendarEvents.filter(e => e.status === 'completed').length,
      data: novemberCalendarEvents
    };
    console.log(`✅ Found ${novemberCalendarEvents.length} calendar events from November`);

    // Save report to file
    const reportPath = path.join(__dirname, 'november-2025-activity-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);

    // Print summary
    console.log('\n📊 NOVEMBER 2025 ACTIVITY SUMMARY:');
    console.log('='.repeat(60));
    console.log(`📋 Daily Tasks: ${report.data.dailyTasks.total} (${report.data.dailyTasks.completed} completed)`);
    console.log(`👥 Prospects: ${report.data.prospects.total}`);
    console.log(`📞 Call Logs: ${report.data.callLogs.total}`);
    console.log(`📢 Groups Posting: ${report.data.groupsPosting.total}`);
    console.log(`💬 Daily WhatsApp: ${report.data.dailyWhatsApp.total} sessions (${report.data.dailyWhatsApp.totalSent} sent)`);
    console.log(`🏢 Call Centers Activity: ${report.data.callCentersNotes.total}`);
    console.log(`📅 Calendar Events: ${report.data.calendarEvents.total} (${report.data.calendarEvents.completed} completed)`);

    console.log('\n🎯 KEY METRICS:');
    console.log('-'.repeat(30));
    console.log(`Total Prospects Contacted: ${report.data.prospects.data.filter(p => p.lastContacted).length}`);
    console.log(`Successful Call Outcomes: ${report.data.callLogs.byOutcome.answered || 0}`);
    console.log(`Qualified Prospects: ${report.data.prospects.byStatus.qualified || 0}`);
    console.log(`Calendar Events Completed: ${report.data.calendarEvents.completed}`);

  } catch (error) {
    console.error('❌ Error generating November report:', error);
  } finally {
    process.exit(0);
  }
}

generateNovemberReport();