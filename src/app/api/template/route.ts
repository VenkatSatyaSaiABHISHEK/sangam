import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';

    db.reload();
    const teams = db.getTeams();
    const buses = db.getBuses();

    const defaultTeam = teams[0]?.name || 'TEAM 1';
    const defaultBus = buses[0]?.name || 'Bus 1';

    const sampleRows = [
      {
        'Full Name': 'Alex Johnson',
        'Email Address': 'alex.johnson@student.summit.edu',
        'Phone Number': '+1 555 123 4567',
        'Team Name': defaultTeam,
        'Bus Route': defaultBus,
        'Status': 'active',
      },
      {
        'Full Name': 'Sarah Connor',
        'Email Address': 'sarah.c@tech.univ.edu',
        'Phone Number': '+1 555 987 6543',
        'Team Name': defaultTeam,
        'Bus Route': defaultBus,
        'Status': 'active',
      },
      {
        'Full Name': 'David Kim',
        'Email Address': 'dkim@engineering.edu',
        'Phone Number': '+1 555 246 8102',
        'Team Name': '',
        'Bus Route': '',
        'Status': 'active',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows);

    ws['!cols'] = [
      { wch: 22 },
      { wch: 34 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Student_Roster_Template');

    if (format === 'xlsx') {
      const maxLen = Math.max(teams.length, buses.length, 1);
      const referenceRows = [];
      for (let i = 0; i < maxLen; i++) {
        referenceRows.push({
          'Available Team Names': teams[i]?.name || '',
          'Team Table': teams[i]?.tableNumber || '',
          'Available Bus Routes': buses[i]?.name || '',
        });
      }
      const wsRef = XLSX.utils.json_to_sheet(referenceRows);
      wsRef['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, wsRef, 'Available_Teams_And_Buses');
    }

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: format === 'csv' ? 'csv' : 'xlsx',
    });

    const contentType =
      format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const filename = `summit_students_template.${format}`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
