// POST /api/reports/export-pdf
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
  try {
    const reportData = await request.json();

    // Generate HTML for PDF
    const html = generateReportHTML(reportData);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set content and generate PDF
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="prospection-report-${reportData.startDate}-to-${reportData.endDate}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generateReportHTML(data: any): string {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => num.toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Propection Activity Report</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 20px;
                background: #f8f9fa;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #3B82F6;
                padding-bottom: 30px;
                margin-bottom: 40px;
            }
            .header h1 {
                color: #1f2937;
                font-size: 32px;
                margin: 0;
                font-weight: 700;
            }
            .header .period {
                color: #6b7280;
                font-size: 18px;
                margin: 10px 0;
            }
            .header .generated {
                color: #9ca3af;
                font-size: 14px;
            }
            .score-card {
                background: linear-gradient(135deg, #3B82F6, #1d4ed8);
                color: white;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                margin-bottom: 40px;
            }
            .score-card .score {
                font-size: 48px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .score-card .label {
                font-size: 18px;
                opacity: 0.9;
            }
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            .metric-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
            }
            .metric-card .icon {
                font-size: 24px;
                margin-bottom: 10px;
            }
            .metric-card .value {
                font-size: 28px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 5px;
            }
            .metric-card .label {
                color: #6b7280;
                font-size: 14px;
            }
            .section {
                margin-bottom: 40px;
                page-break-inside: avoid;
            }
            .section h2 {
                color: #1f2937;
                font-size: 24px;
                margin-bottom: 20px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 10px;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            .stat-item {
                background: #f9fafb;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
            }
            .stat-item .value {
                font-size: 20px;
                font-weight: bold;
                color: #1f2937;
                display: block;
            }
            .stat-item .label {
                color: #6b7280;
                font-size: 12px;
                margin-top: 5px;
            }
            .progress-bar {
                background: #e5e7eb;
                height: 8px;
                border-radius: 4px;
                margin: 10px 0;
                overflow: hidden;
            }
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3B82F6, #1d4ed8);
                border-radius: 4px;
            }
            .list-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid #f3f4f6;
            }
            .list-item:last-child {
                border-bottom: none;
            }
            .badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-yellow { background: #fef3c7; color: #92400e; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-purple { background: #f3e8ff; color: #6b21a8; }
            .achievements {
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 8px;
                padding: 20px;
                margin-top: 20px;
            }
            .achievements h3 {
                color: #0369a1;
                margin: 0 0 15px 0;
                font-size: 18px;
            }
            .achievement-item {
                display: flex;
                align-items: flex-start;
                margin-bottom: 10px;
                font-size: 14px;
            }
            .achievement-item .icon {
                margin-right: 10px;
                color: #0369a1;
                font-weight: bold;
            }
            @media print {
                body { background: white; }
                .container { box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Propection Activity Report</h1>
                <div class="period">Period: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}</div>
                <div class="generated">Report Generated: ${formatDate(data.generatedAt)}</div>
            </div>

            <div class="score-card">
                <div class="score">${data.productivityScore}/100</div>
                <div class="label">Overall Productivity Score</div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="icon">👥</div>
                    <div class="value">${formatNumber(data.prospects.total)}</div>
                    <div class="label">Total Prospects</div>
                </div>
                <div class="metric-card">
                    <div class="icon">📞</div>
                    <div class="value">${formatNumber(data.callLogs.successful)}</div>
                    <div class="label">Successful Calls</div>
                </div>
                <div class="metric-card">
                    <div class="icon">💬</div>
                    <div class="value">${formatNumber(data.dailyWhatsApp.sent)}</div>
                    <div class="label">WhatsApp Sent</div>
                </div>
                <div class="metric-card">
                    <div class="icon">✅</div>
                    <div class="value">${formatNumber(data.calendarEvents.completed)}</div>
                    <div class="label">Tasks Completed</div>
                </div>
            </div>

            <div class="section">
                <h2>👥 Prospects Overview</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.prospects.total)}</span>
                        <span class="label">Total Added</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.prospects.contacted)}</span>
                        <span class="label">Contacted (${Math.round((data.prospects.contacted / data.prospects.total) * 100)}%)</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${Object.keys(data.prospects.byStatus).length}</span>
                        <span class="label">Status Types</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${Object.keys(data.prospects.byBusinessType).length}</span>
                        <span class="label">Business Types</span>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <strong>Status Breakdown:</strong>
                    ${Object.entries(data.prospects.byStatus).map(([status, count]) =>
                        `<span class="badge badge-blue" style="margin: 2px;">${status}: ${count}</span>`
                    ).join('')}
                </div>

                <div style="margin-top: 10px;">
                    <strong>Business Types:</strong>
                    ${Object.entries(data.prospects.byBusinessType).map(([type, count]) =>
                        `<span class="badge badge-purple" style="margin: 2px;">${type}: ${count}</span>`
                    ).join('')}
                </div>
            </div>

            <div class="section">
                <h2>📞 Call Activity</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.callLogs.total)}</span>
                        <span class="label">Total Calls</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.callLogs.successful)}</span>
                        <span class="label">Successful (${Math.round((data.callLogs.successful / data.callLogs.total) * 100)}%)</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${Object.keys(data.callLogs.byOutcome).length}</span>
                        <span class="label">Outcome Types</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${Object.keys(data.callLogs.byDisposition).length}</span>
                        <span class="label">Disposition Types</span>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <strong>Call Success Rate:</strong>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.round((data.callLogs.successful / data.callLogs.total) * 100)}%"></div>
                    </div>
                    <small>${Math.round((data.callLogs.successful / data.callLogs.total) * 100)}% of calls were answered</small>
                </div>
            </div>

            <div class="section">
                <h2>💬 WhatsApp Campaign</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.dailyWhatsApp.total)}</span>
                        <span class="label">Sessions</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.dailyWhatsApp.sent)}</span>
                        <span class="label">Messages Sent</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.dailyWhatsApp.selected)}</span>
                        <span class="label">Selected</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${data.dailyWhatsApp.total > 0 ? Math.round(data.dailyWhatsApp.selected / data.dailyWhatsApp.total) : 0}</span>
                        <span class="label">Avg per Session</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📢 Groups Posting</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.groupsPosting.totalPlans)}</span>
                        <span class="label">Weekly Plans</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.groupsPosting.totalTasks)}</span>
                        <span class="label">Total Tasks</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${data.groupsPosting.completionRate}%</span>
                        <span class="label">Completion Rate</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.groupsPosting.groupsUsed)}</span>
                        <span class="label">Groups Used</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.groupsPosting.accountsUsed)}</span>
                        <span class="label">Accounts Used</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.groupsPosting.averageTasksPerDay)}</span>
                        <span class="label">Avg Tasks/Day</span>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <strong>Task Status Breakdown:</strong>
                    ${Object.entries(data.groupsPosting.tasksByStatus).map(([status, count]) =>
                        `<span class="badge badge-blue" style="margin: 2px;">${status}: ${count}</span>`
                    ).join('')}
                </div>

                <div style="margin-top: 10px;">
                    <strong>Plan Status Breakdown:</strong>
                    ${Object.entries(data.groupsPosting.plansByStatus).map(([status, count]) =>
                        `<span class="badge badge-purple" style="margin: 2px;">${status}: ${count}</span>`
                    ).join('')}
                </div>
            </div>

            <div class="section">
                <h2>📋 Daily Tasks & Calendar</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.dailyTasks.total)}</span>
                        <span class="label">Total Tasks</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.dailyTasks.completed)}</span>
                        <span class="label">Completed</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.calendarEvents.total)}</span>
                        <span class="label">Calendar Events</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${formatNumber(data.calendarEvents.completed)}</span>
                        <span class="label">Events Completed</span>
                    </div>
                </div>
            </div>

            ${data.topProspects.length > 0 ? `
            <div class="section">
                <h2>🔥 Top Performing Prospects</h2>
                ${data.topProspects.map((prospect: any, index: number) => `
                    <div class="list-item">
                        <div>
                            <strong>${index + 1}. ${prospect.name}</strong>
                            <span class="badge badge-blue" style="margin-left: 10px;">${prospect.businessType}</span>
                        </div>
                        <div>
                            <strong>${prospect.attempts}</strong> attempts
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <div class="achievements">
                <h3>🎯 Key Achievements</h3>
                <div class="achievement-item">
                    <span class="icon">👥</span>
                    <span>Contacted ${data.prospects.contacted} out of ${data.prospects.total} prospects (${Math.round((data.prospects.contacted / data.prospects.total) * 100)}% contact rate)</span>
                </div>
                <div class="achievement-item">
                    <span class="icon">📞</span>
                    <span>Made ${data.callLogs.successful} successful calls out of ${data.callLogs.total} attempts (${Math.round((data.callLogs.successful / data.callLogs.total) * 100)}% success rate)</span>
                </div>
                <div class="achievement-item">
                    <span class="icon">💬</span>
                    <span>Sent ${data.dailyWhatsApp.sent} WhatsApp messages across ${data.dailyWhatsApp.total} sessions</span>
                </div>
                <div class="achievement-item">
                    <span class="icon">✅</span>
                    <span>Completed ${data.calendarEvents.completed} out of ${data.calendarEvents.total} calendar events (${Math.round((data.calendarEvents.completed / data.calendarEvents.total) * 100)}% completion)</span>
                </div>
                <div class="achievement-item">
                    <span class="icon">📝</span>
                    <span>${data.callCentersActivity.withNotes} call centers with detailed notes (${Math.round((data.callCentersActivity.withNotes / data.callCentersActivity.total) * 100)}% documentation rate)</span>
                </div>
                <div class="achievement-item">
                    <span class="icon">📈</span>
                    <span>Overall productivity score: ${data.productivityScore}/100</span>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
}