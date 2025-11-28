// GET /api/reports/generate?startDate=2025-11-01&endDate=2025-11-30
import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Prospect {
  id: string;
  name?: string;
  status?: string;
  businessType?: string;
  contactAttempts?: number;
  lastContacted?: string;
  createdAt?: string;
  addedDate?: string;
  prospectDate?: string;
  callHistory?: any[];
}

interface Task {
  id: string;
  date?: string;
  status?: string;
}

interface PostingSession {
  id: string;
  date?: string;
  status?: string;
}

interface WhatsAppSession {
  id: string;
  date?: string;
  sentTodayIds?: string[];
  selectedCallCenterIds?: string[];
}

interface CallCenter {
  id: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  lastContacted?: string;
}

interface CalendarEvent {
  id: string;
  date?: string;
  status?: string;
  type?: string;
}

interface WeeklyPlan {
  id: string;
  weekStartDate?: string;
  weekEndDate?: string;
  totalTasks?: number;
  status?: string;
  generatedAt?: string;
}

interface WeeklyTask {
  id: string;
  planId?: string;
  dayOfWeek?: number;
  accountId?: string;
  groupId?: string;
  status?: string;
  scheduledTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    console.log('🔍 Generating report for period:', { startDate, endDate });

    const report = {
      period: `${startDate} to ${endDate}`,
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      prospects: {
        total: 0,
        contacted: 0,
        byStatus: {} as Record<string, number>,
        byBusinessType: {} as Record<string, number>
      },
      callLogs: {
        total: 0,
        successful: 0,
        byOutcome: {} as Record<string, number>,
        byDisposition: {} as Record<string, number>
      },
      dailyTasks: {
        total: 0,
        completed: 0,
        pending: 0
      },
      groupsPosting: {
        totalSessions: 0,
        sessionsByStatus: {} as Record<string, number>,
        totalPlans: 0,
        plansByStatus: {} as Record<string, number>,
        totalTasks: 0,
        tasksByStatus: {} as Record<string, number>,
        completionRate: 0,
        groupsUsed: 0,
        accountsUsed: 0,
        averageTasksPerDay: 0
      },
      dailyWhatsApp: {
        total: 0,
        sent: 0,
        selected: 0
      },
      callCentersActivity: {
        total: 0,
        withNotes: 0
      },
      calendarEvents: {
        total: 0,
        completed: 0,
        byType: {} as Record<string, number>
      },
      topProspects: [] as Array<{ name: string; businessType: string; attempts: number }>,
      recentCalls: [] as Array<{ prospectName: string; outcome: string; disposition: string; date: string }>,
      productivityScore: 0
    };

    // 1. Get prospects data
    console.log('👥 Loading prospects...');
    const prospectsSnapshot = await getDocs(collection(db, 'prospects'));
    const prospects: Prospect[] = prospectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      lastContacted: doc.data().lastContacted?.toDate?.()?.toISOString() || doc.data().lastContacted,
      addedDate: doc.data().addedDate,
      prospectDate: doc.data().prospectDate
    } as Prospect));

    // Filter prospects created in the date range
    const filteredProspects = prospects.filter((prospect: Prospect) => {
      const createdDate = prospect.createdAt || prospect.addedDate || prospect.prospectDate;
      if (!createdDate) return false;
      const date = new Date(createdDate);
      return date >= start && date <= end;
    });

    report.prospects.total = filteredProspects.length;
    report.prospects.contacted = filteredProspects.filter((p: Prospect) => p.lastContacted).length;

    // Count by status and business type
    filteredProspects.forEach((prospect: Prospect) => {
      const status = prospect.status || 'unknown';
      const businessType = prospect.businessType || 'unknown';

      report.prospects.byStatus[status] = (report.prospects.byStatus[status] || 0) + 1;
      report.prospects.byBusinessType[businessType] = (report.prospects.byBusinessType[businessType] || 0) + 1;
    });

    // 2. Get call logs from prospects (embedded in prospect documents)
    console.log('📞 Loading call logs...');
    let allCallLogs: any[] = [];
    prospects.forEach(prospect => {
      if (prospect.callHistory && Array.isArray(prospect.callHistory)) {
        prospect.callHistory.forEach((callLog: any) => {
          if (callLog.date) {
            const callDate = new Date(callLog.date);
            if (callDate >= start && callDate <= end) {
              allCallLogs.push({
                prospectId: prospect.id,
                prospectName: prospect.name,
                ...callLog,
                date: callLog.date
              });
            }
          }
        });
      }
    });

    report.callLogs.total = allCallLogs.length;
    report.callLogs.successful = allCallLogs.filter(log => log.outcome === 'answered').length;

    // Count by outcome and disposition
    allCallLogs.forEach(log => {
      const outcome = log.outcome || 'unknown';
      const disposition = log.disposition || 'unknown';

      report.callLogs.byOutcome[outcome] = (report.callLogs.byOutcome[outcome] || 0) + 1;
      report.callLogs.byDisposition[disposition] = (report.callLogs.byDisposition[disposition] || 0) + 1;
    });

    // 3. Get daily tasks
    console.log('📋 Loading daily tasks...');
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const filteredTasks: Task[] = tasksSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        doneAt: doc.data().doneAt?.toDate?.()?.toISOString() || doc.data().doneAt
      } as Task))
      .filter((task: Task) => {
        if (!task.date) return false;
        const taskDate = new Date(task.date);
        return taskDate >= start && taskDate <= end;
      });

    report.dailyTasks.total = filteredTasks.length;
    report.dailyTasks.completed = filteredTasks.filter((t: Task) => t.status === 'completed').length;
    report.dailyTasks.pending = filteredTasks.filter((t: Task) => t.status !== 'completed').length;

    // 4. Get groups posting data (sessions, plans, and tasks)
    console.log('📢 Loading groups posting data...');

    // Note: postingSessions collection doesn't exist in the current implementation
    // The groups posting system uses weekly plans and tasks instead
    report.groupsPosting.totalSessions = 0;
    report.groupsPosting.sessionsByStatus = {};

    // Get weekly plans (using correct collection name)
    const plansSnapshot = await getDocs(collection(db, 'weeklyPostingPlans'));
    const filteredPlans: WeeklyPlan[] = plansSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        generatedAt: doc.data().generatedAt?.toDate?.()?.toISOString() || doc.data().generatedAt,
        weekStartDate: doc.data().weekStartDate,
        weekEndDate: doc.data().weekEndDate
      } as WeeklyPlan))
      .filter((plan: WeeklyPlan) => {
        if (!plan.generatedAt) return false;
        const planDate = new Date(plan.generatedAt);
        return planDate >= start && planDate <= end;
      });

    report.groupsPosting.totalPlans = filteredPlans.length;
    filteredPlans.forEach((plan: WeeklyPlan) => {
      const status = plan.status || 'unknown';
      report.groupsPosting.plansByStatus[status] = (report.groupsPosting.plansByStatus[status] || 0) + 1;
    });

    // Get weekly tasks (using correct collection name)
    const weeklyTasksSnapshot = await getDocs(collection(db, 'weeklyPostingTasks'));
    const filteredWeeklyTasks: WeeklyTask[] = weeklyTasksSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        scheduledTime: doc.data().scheduledTime
      } as WeeklyTask))
      .filter((task: WeeklyTask) => {
        if (!task.createdAt) return false;
        const taskDate = new Date(task.createdAt);
        return taskDate >= start && taskDate <= end;
      });

    report.groupsPosting.totalTasks = filteredWeeklyTasks.length;
    const completedTasks = filteredWeeklyTasks.filter((t: WeeklyTask) => t.status === 'completed').length;
    report.groupsPosting.completionRate = filteredWeeklyTasks.length > 0 ? Math.round((completedTasks / filteredWeeklyTasks.length) * 100) : 0;

    // Count by status
    filteredWeeklyTasks.forEach((task: WeeklyTask) => {
      const status = task.status || 'unknown';
      report.groupsPosting.tasksByStatus[status] = (report.groupsPosting.tasksByStatus[status] || 0) + 1;
    });

    // Count unique groups and accounts used
    const uniqueGroups = new Set(filteredWeeklyTasks.map(t => t.groupId).filter(Boolean));
    const uniqueAccounts = new Set(filteredWeeklyTasks.map(t => t.accountId).filter(Boolean));
    report.groupsPosting.groupsUsed = uniqueGroups.size;
    report.groupsPosting.accountsUsed = uniqueAccounts.size;

    // Calculate average tasks per day (assuming 5 working days per week)
    const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const workingDays = Math.max(1, Math.floor(daysInPeriod * 5 / 7)); // Rough estimate
    report.groupsPosting.averageTasksPerDay = Math.round(filteredWeeklyTasks.length / workingDays);

    // 5. Get daily WhatsApp sessions
    console.log('💬 Loading daily WhatsApp sessions...');
    const whatsappSnapshot = await getDocs(collection(db, 'dailyWhatsAppSessions'));
    const filteredWhatsApp: WhatsAppSession[] = whatsappSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      } as WhatsAppSession))
      .filter((session: WhatsAppSession) => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate >= start && sessionDate <= end;
      });

    report.dailyWhatsApp.total = filteredWhatsApp.length;
    report.dailyWhatsApp.sent = filteredWhatsApp.reduce((sum: number, s: WhatsAppSession) => sum + (s.sentTodayIds?.length || 0), 0);
    report.dailyWhatsApp.selected = filteredWhatsApp.reduce((sum: number, s: WhatsAppSession) => sum + (s.selectedCallCenterIds?.length || 0), 0);

    // 6. Get call centers with activity in date range
    console.log('🏢 Loading call centers activity...');
    const callCentersSnapshot = await getDocs(collection(db, 'callCenters'));
    const filteredCallCenters: CallCenter[] = callCentersSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        lastContacted: doc.data().lastContacted?.toDate?.()?.toISOString() || doc.data().lastContacted
      } as CallCenter))
      .filter((cc: CallCenter) => {
        // Check if created in date range
        if (cc.createdAt) {
          const createdDate = new Date(cc.createdAt);
          if (createdDate >= start && createdDate <= end) return true;
        }
        // Check if last contacted in date range
        if (cc.lastContacted) {
          const lastContactedDate = new Date(cc.lastContacted);
          if (lastContactedDate >= start && lastContactedDate <= end) return true;
        }
        // Check if updated in date range
        if (cc.updatedAt) {
          const updatedDate = new Date(cc.updatedAt);
          if (updatedDate >= start && updatedDate <= end) return true;
        }
        return false;
      });

    report.callCentersActivity.total = filteredCallCenters.length;
    report.callCentersActivity.withNotes = filteredCallCenters.filter((cc: CallCenter) => cc.notes && cc.notes.trim()).length;

    // 7. Get calendar events
    console.log('📅 Loading calendar events...');
    const calendarSnapshot = await getDocs(collection(db, 'calendarEvents'));
    const filteredCalendar: CalendarEvent[] = calendarSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      } as CalendarEvent))
      .filter((event: CalendarEvent) => {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        return eventDate >= start && eventDate <= end;
      });

    report.calendarEvents.total = filteredCalendar.length;
    report.calendarEvents.completed = filteredCalendar.filter((e: CalendarEvent) => e.status === 'completed').length;

    filteredCalendar.forEach((event: CalendarEvent) => {
      const type = event.type || 'unknown';
      report.calendarEvents.byType[type] = (report.calendarEvents.byType[type] || 0) + 1;
    });

    // 8. Calculate top prospects (most contacted)
    const prospectsWithAttempts = filteredProspects.filter((p: Prospect) => (p.contactAttempts || 0) > 0);
    report.topProspects = prospectsWithAttempts
      .sort((a: Prospect, b: Prospect) => (b.contactAttempts || 0) - (a.contactAttempts || 0))
      .slice(0, 5)
      .map((p: Prospect) => ({
        name: p.name || 'Unknown',
        businessType: p.businessType || 'unknown',
        attempts: p.contactAttempts || 0
      }));

    // 9. Get recent calls
    report.recentCalls = allCallLogs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(call => ({
        prospectName: call.prospectName,
        outcome: call.outcome || 'unknown',
        disposition: call.disposition || 'unknown',
        date: call.date
      }));

    // 10. Calculate productivity score
    const contactRate = report.prospects.total > 0 ? (report.prospects.contacted / report.prospects.total) : 0;
    const callSuccessRate = report.callLogs.total > 0 ? (report.callLogs.successful / report.callLogs.total) : 0;
    const calendarCompletionRate = report.calendarEvents.total > 0 ? (report.calendarEvents.completed / report.calendarEvents.total) : 0;
    const documentationRate = report.callCentersActivity.total > 0 ? (report.callCentersActivity.withNotes / report.callCentersActivity.total) : 0;

    report.productivityScore = Math.round(
      (contactRate * 25) +
      (callSuccessRate * 25) +
      (calendarCompletionRate * 25) +
      (documentationRate * 25)
    );

    console.log('✅ Report generated successfully:', {
      prospects: report.prospects.total,
      calls: report.callLogs.total,
      productivityScore: report.productivityScore
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('❌ Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}