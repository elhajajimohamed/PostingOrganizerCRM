const fs = require('fs');
const path = require('path');

try {
  const reportPath = path.join(__dirname, 'november-2025-activity-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  console.log('📊 NOVEMBER 2025 PROSPECTION ACTIVITY REPORT');
  console.log('='.repeat(60));
  console.log(`Period: ${report.period} (${report.startDate} to ${report.endDate})`);
  console.log(`Report Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  console.log('');

  // Prospects Summary
  console.log('👥 PROSPECTS:');
  console.log(`Total Prospects: ${report.data.prospects.total}`);
  console.log('By Status:', JSON.stringify(report.data.prospects.byStatus, null, 2));
  console.log('By Business Type:', JSON.stringify(report.data.prospects.byBusinessType, null, 2));
  console.log(`Contacted Prospects: ${report.data.prospects.data.filter(p => p.lastContacted).length}`);
  console.log('');

  // Call Logs Summary
  console.log('📞 CALL LOGS:');
  console.log(`Total Calls: ${report.data.callLogs.total}`);
  console.log('By Outcome:', JSON.stringify(report.data.callLogs.byOutcome, null, 2));
  console.log('By Disposition:', JSON.stringify(report.data.callLogs.byDisposition, null, 2));
  console.log('');

  // Daily Tasks Summary
  console.log('📋 DAILY TASKS:');
  console.log(`Total Tasks: ${report.data.dailyTasks.total}`);
  console.log(`Completed: ${report.data.dailyTasks.completed}`);
  console.log(`Pending: ${report.data.dailyTasks.pending}`);
  console.log('');

  // Groups Posting Summary
  console.log('📢 GROUPS POSTING:');
  console.log(`Total Sessions: ${report.data.groupsPosting.total}`);
  console.log('By Status:', JSON.stringify(report.data.groupsPosting.byStatus, null, 2));
  console.log('');

  // Daily WhatsApp Summary
  console.log('💬 DAILY WHATSAPP:');
  console.log(`Total Sessions: ${report.data.dailyWhatsApp.total}`);
  console.log(`Total Messages Sent: ${report.data.dailyWhatsApp.totalSent}`);
  console.log(`Total Selected: ${report.data.dailyWhatsApp.totalSelected}`);
  console.log('');

  // Call Centers Activity Summary
  console.log('🏢 CALL CENTERS ACTIVITY:');
  console.log(`Total with November Activity: ${report.data.callCentersNotes.total}`);
  console.log(`With Notes: ${report.data.callCentersNotes.withNotes}`);
  console.log('');

  // Calendar Events Summary
  console.log('📅 CALENDAR EVENTS:');
  console.log(`Total Events: ${report.data.calendarEvents.total}`);
  console.log(`Completed: ${report.data.calendarEvents.completed}`);
  console.log('By Type:', JSON.stringify(report.data.calendarEvents.byType, null, 2));
  console.log('');

  // Key Achievements
  console.log('🎯 KEY ACHIEVEMENTS:');
  console.log('-'.repeat(30));
  const contactedProspects = report.data.prospects.data.filter(p => p.lastContacted).length;
  const successfulCalls = report.data.callLogs.byOutcome.answered || 0;
  const qualifiedProspects = report.data.prospects.byStatus.qualified || 0;
  const completedCalendar = report.data.calendarEvents.completed;

  console.log(`• Contacted ${contactedProspects} prospects out of ${report.data.prospects.total} total`);
  console.log(`• Made ${successfulCalls} successful calls out of ${report.data.callLogs.total} total calls`);
  console.log(`• Qualified ${qualifiedProspects} prospects`);
  console.log(`• Completed ${completedCalendar} out of ${report.data.calendarEvents.total} calendar events`);
  console.log(`• Sent ${report.data.dailyWhatsApp.totalSent} WhatsApp messages across ${report.data.dailyWhatsApp.total} sessions`);
  console.log(`• Managed ${report.data.groupsPosting.total} posting sessions`);
  console.log(`• Completed ${report.data.dailyTasks.completed} out of ${report.data.dailyTasks.total} daily tasks`);
  console.log('');

  // Top Prospects by Contact Attempts
  const topContacted = report.data.prospects.data
    .filter(p => p.contactAttempts > 0)
    .sort((a, b) => (b.contactAttempts || 0) - (a.contactAttempts || 0))
    .slice(0, 5);

  if (topContacted.length > 0) {
    console.log('🔥 MOST CONTACTED PROSPECTS:');
    console.log('-'.repeat(30));
    topContacted.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.businessType}) - ${p.contactAttempts} attempts`);
    });
    console.log('');
  }

  // Recent Activity
  const recentCalls = report.data.callLogs.data
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recentCalls.length > 0) {
    console.log('📞 RECENT CALL ACTIVITY:');
    console.log('-'.repeat(30));
    recentCalls.forEach(call => {
      console.log(`${call.prospectName}: ${call.outcome} (${call.disposition || 'N/A'}) - ${new Date(call.date).toLocaleDateString()}`);
    });
    console.log('');
  }

  console.log('📈 MONTHLY PRODUCTIVITY SCORE:');
  console.log('-'.repeat(30));
  const productivityScore = Math.round(
    (contactedProspects / Math.max(report.data.prospects.total, 1) * 25) +
    (successfulCalls / Math.max(report.data.callLogs.total, 1) * 25) +
    (qualifiedProspects / Math.max(report.data.prospects.total, 1) * 25) +
    (completedCalendar / Math.max(report.data.calendarEvents.total, 1) * 25)
  );
  console.log(`Overall Score: ${productivityScore}/100`);
  console.log('');

} catch (error) {
  console.error('Error reading report:', error);
}