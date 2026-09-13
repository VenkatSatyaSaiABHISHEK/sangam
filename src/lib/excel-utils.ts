import { User, Team, Bus } from '@/types';

export interface ParsedStudentRow {
  index: number;
  fullName: string;
  email: string;
  isProvisionalEmail?: boolean;
  phone: string;
  branch?: string;
  year?: string;
  teamNameOrId: string;
  matchedTeamName?: string;
  busNameOrId: string;
  matchedBusName?: string;
  isValid: boolean;
  isExisting: boolean;
  existingId?: string;
  statusText: string;
  error?: string;
  selected: boolean;
}

/**
 * Downloads a pre-formatted Excel (.xlsx) or CSV template for bulk student registration.
 */
export async function downloadStudentTemplate(
  teams: Team[] = [],
  buses: Bus[] = [],
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  const XLSX = await import('xlsx');

  const defaultTeam = teams[0]?.name || 'Team 1';
  const defaultBus = buses[0]?.name || 'Bus 1';

  // Sample data showing exact syntax
  const templateRows = [
    {
      'Full Name': 'Alex Johnson',
      'Email Address': 'alex.johnson@student.sangam.org',
      'Phone Number': '+91 98765 43210',
      'Branch / Dept': 'CSE',
      'Academic Year': '1st Year',
      'Team Name': defaultTeam,
      'Bus Route': defaultBus,
      'Status': 'active',
    },
    {
      'Full Name': 'Sarah Connor',
      'Email Address': '',
      'Phone Number': '+91 98765 43211',
      'Branch / Dept': 'ECE',
      'Academic Year': '2nd Year',
      'Team Name': defaultTeam,
      'Bus Route': defaultBus,
      'Status': 'active',
    },
    {
      'Full Name': 'David Kim',
      'Email Address': '',
      'Phone Number': '+91 98765 43212',
      'Branch / Dept': 'AI & Data Science',
      'Academic Year': '1st Year',
      'Team Name': '',
      'Bus Route': '',
      'Status': 'active',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateRows);

  ws['!cols'] = [
    { wch: 22 }, // Full Name
    { wch: 34 }, // Email Address
    { wch: 18 }, // Phone Number
    { wch: 18 }, // Team Name
    { wch: 16 }, // Bus Route
    { wch: 12 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Student_Roster_Template');

  // Add Reference Sheet for Teams & Buses
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

  const fileName = `sangam_students_template.${format}`;
  XLSX.writeFile(wb, fileName, { bookType: format });
}

/**
 * Parses an uploaded .xlsx, .xls, or .csv file and validates each student record.
 * Supports students with or without email, and performs smart matching for updates.
 */
export async function parseStudentSpreadsheet(
  file: File,
  existingStudents: User[] = [],
  teams: Team[] = [],
  buses: Bus[] = []
): Promise<ParsedStudentRow[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('Spreadsheet has no readable sheets.');
  }

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawData || rawData.length === 0) {
    throw new Error('No data rows found in uploaded spreadsheet.');
  }

  return rawData.map((row, idx) => {
    // Tolerant column header matching
    const nameKey = Object.keys(row).find((k) =>
      /^(name|student\s*name|full\s*name|student)$/i.test(k.trim())
    ) || Object.keys(row).find((k) => /name/i.test(k));

    const emailKey = Object.keys(row).find((k) =>
      /^(email|email\s*address|e-mail|mail)$/i.test(k.trim())
    ) || Object.keys(row).find((k) => /email|mail/i.test(k));

    const phoneKey = Object.keys(row).find((k) =>
      /^(phone|phone\s*number|mobile|contact|tel|telephone)$/i.test(k.trim())
    ) || Object.keys(row).find((k) => /phone|mobile|contact/i.test(k));

    const teamKey = Object.keys(row).find((k) =>
      /^(team|team\s*name|cohort|pod)$/i.test(k.trim())
    ) || Object.keys(row).find((k) => /team/i.test(k));

    const busKey = Object.keys(row).find((k) =>
      /^(bus|bus\s*route|bus\s*number|transit|route)$/i.test(k.trim())
    ) || Object.keys(row).find((k) => /bus|transit|route/i.test(k));

    const branchKey = Object.keys(row).find((k) =>
      /^(branch|department|dept|major|field)$/i.test(k.trim())
    ) || Object.keys(row).find((k) => /branch|dept/i.test(k));

    const yearKey = Object.keys(row).find((k) =>
      /^(year|academic\s*year|class|grade)$/i.test(k.trim())
    ) || Object.keys(row).find((k) => /year/i.test(k));

    const fullName = String(nameKey ? row[nameKey] : '').trim();
    const rawEmail = String(emailKey ? row[emailKey] : '').trim().toLowerCase();
    const phone = String(phoneKey ? row[phoneKey] : '').trim() || '+91 000 000 0000';
    const cleanPhone = phone.replace(/[\s+-]/g, '');
    const branch = String(branchKey ? row[branchKey] : '').trim() || 'CSE';
    const year = String(yearKey ? row[yearKey] : '').trim() || '1st Year';
    const teamNameOrId = String(teamKey ? row[teamKey] : '').trim();
    const busNameOrId = String(busKey ? row[busKey] : '').trim();

    // Matching team & bus
    let matchedTeamName: string | undefined = undefined;
    if (teamNameOrId) {
      const q = teamNameOrId.toLowerCase();
      const t = teams.find((x) => x.name.toLowerCase() === q || x.id.toLowerCase() === q);
      if (t) matchedTeamName = t.name;
    }

    let matchedBusName: string | undefined = undefined;
    if (busNameOrId) {
      const q = busNameOrId.toLowerCase();
      const b = buses.find((x) => x.name.toLowerCase() === q || x.id.toLowerCase() === q);
      if (b) matchedBusName = b.name;
    }

    // Validation: Full Name is required. Email is optional!
    const hasName = fullName.length >= 2;
    const hasEmail = rawEmail.length > 0;
    const isEmailValid = !hasEmail || (rawEmail.includes('@') && rawEmail.includes('.'));
    const isValid = hasName && isEmailValid;

    let error: string | undefined = undefined;
    if (!hasName) error = 'Missing student name';
    else if (!isEmailValid) error = 'Invalid email syntax';

    const email = hasEmail ? rawEmail : '';
    const isProvisionalEmail = !hasEmail;

    // Smart deduplication: Match existing student by Phone, Email, or Full Name
    const normName = fullName.toLowerCase().replace(/\s+/g, ' ');
    const matchedExisting = existingStudents.find((s) => {
      // 1. Phone match (last 10 digits)
      if (cleanPhone.length >= 7 && s.phone) {
        const sClean = s.phone.replace(/[\s+-]/g, '');
        if (sClean.slice(-10) === cleanPhone.slice(-10)) return true;
      }
      // 2. Email match (if non-empty)
      if (hasEmail && s.email && s.email.toLowerCase() === rawEmail) return true;
      // 3. Full Name match
      if (hasName && s.fullName && s.fullName.trim().toLowerCase().replace(/\s+/g, ' ') === normName) return true;
      return false;
    });

    const isExisting = !!matchedExisting;
    const existingId = matchedExisting?.id;

    let statusText = 'Ready to Add';
    if (!isValid) {
      statusText = error || 'Invalid Row';
    } else if (isExisting) {
      if (hasEmail && (!matchedExisting?.email || matchedExisting.email.endsWith('@student.sangam.org') || matchedExisting.email !== rawEmail)) {
        statusText = 'Update Email';
      } else {
        statusText = 'Update Existing';
      }
    } else if (!hasEmail) {
      statusText = 'Ready (Pending Email)';
    }

    return {
      index: idx + 1,
      fullName,
      email,
      isProvisionalEmail,
      phone,
      branch,
      year,
      teamNameOrId,
      matchedTeamName,
      busNameOrId,
      matchedBusName,
      isValid,
      isExisting,
      existingId,
      statusText,
      error,
      selected: isValid,
    };
  });
}

/**
 * Exports currently filtered or all registered students to Excel.
 */
export async function exportStudentsToExcel(
  students: User[],
  teams: Team[] = [],
  buses: Bus[] = []
) {
  const XLSX = await import('xlsx');

  const rows = students.map((s, idx) => {
    const team = teams.find((t) => t.id === s.teamId);
    const bus = buses.find((b) => b.id === s.busId);
    return {
      '#': idx + 1,
      'Student ID': s.id,
      'Full Name': s.fullName,
      'Email Address': s.email,
      'Phone Number': s.phone,
      'Branch / Dept': s.branch || 'CSE',
      'Academic Year': s.year || '1st Year',
      'Assigned Team': team?.name || s.teamName || 'Unassigned',
      'Table Number': team?.tableNumber || '',
      'Bus Route': bus?.name || s.busName || 'None',
      'Status': s.status,
      'Registered At': s.createdAt ? new Date(s.createdAt).toLocaleString() : '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 22 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Summit_Registered_Students');
  XLSX.writeFile(wb, `summit_students_export_${Date.now().toString(36)}.xlsx`, {
    bookType: 'xlsx',
  });
}
