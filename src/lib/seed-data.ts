import { User, Team, Bus, Room, AttendanceRecord, Photo, Announcement, EventInfo, ActivityLog } from '@/types';

export const INITIAL_EVENT: EventInfo = {
  id: 'summit-2027',
  name: 'Sangam 2027',
  venue: 'Grand Tech Convention Pavilion & Innovation Hub',
  startDate: '2027-09-12T08:00:00.000Z',
  endDate: '2027-09-14T18:00:00.000Z',
  status: 'active',
  stats: {
    totalStudents: 40,
    totalMentors: 13,
    totalFaculty: 5,
    totalJudges: 3,
    totalTeams: 8,
    totalBuses: 2,
  },
};

export const INITIAL_BUSES: Bus[] = [
  {
    id: 'bus-a',
    eventId: 'summit-2027',
    name: 'Bus A — Campus Express',
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98765 43210',
    vehicleNumber: 'AP 28 XX 1234',
    capacity: 40,
    assignedMentorIds: ['mentor-01', 'mentor-02'],
    assignedStudentIds: [
      'stu-01', 'stu-02', 'stu-03', 'stu-04', 'stu-05',
      'stu-06', 'stu-07', 'stu-08', 'stu-09', 'stu-10',
      'stu-11', 'stu-12', 'stu-13', 'stu-14', 'stu-15',
      'stu-16', 'stu-17', 'stu-18', 'stu-19', 'stu-20'
    ],
    status: 'arrived',
    currentLocation: {
      lat: 17.4482,
      lng: 78.3742,
      updatedAt: new Date().toISOString(),
    },
    createdAt: '2027-09-10T08:00:00.000Z',
  },
  {
    id: 'bus-b',
    eventId: 'summit-2027',
    name: 'Bus B — Metro Transit',
    driverName: 'Suresh Babu',
    driverPhone: '+91 98765 43211',
    vehicleNumber: 'AP 28 YY 5678',
    capacity: 40,
    assignedMentorIds: ['mentor-03', 'mentor-04'],
    assignedStudentIds: [
      'stu-21', 'stu-22', 'stu-23', 'stu-24', 'stu-25',
      'stu-26', 'stu-27', 'stu-28', 'stu-29', 'stu-30',
      'stu-31', 'stu-32', 'stu-33', 'stu-34', 'stu-35',
      'stu-36', 'stu-37', 'stu-38', 'stu-39', 'stu-40'
    ],
    status: 'boarding',
    currentLocation: {
      lat: 17.4399,
      lng: 78.3806,
      updatedAt: new Date().toISOString(),
    },
    createdAt: '2027-09-10T08:00:00.000Z',
  },
];

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'team-01',
    eventId: 'summit-2027',
    name: 'Team 01 — NeuralPulse',
    color: '#2563EB',
    mentorIds: ['mentor-01', 'mentor-02'],
    mentors: [
      { id: 'mentor-01', name: 'Ram Mohan' },
      { id: 'mentor-02', name: 'Abhi Varma' },
    ],
    studentIds: ['stu-01', 'stu-02', 'stu-03', 'stu-04', 'stu-05'],
    busId: 'bus-a',
    busName: 'Bus A — Campus Express',
    tableNumber: 'Table A-01',
    status: 'active',
    createdAt: '2027-09-10T09:00:00.000Z',
  },
  {
    id: 'team-02',
    eventId: 'summit-2027',
    name: 'Team 02 — QuantumLeap',
    color: '#7C3AED',
    mentorIds: ['mentor-01'],
    mentors: [{ id: 'mentor-01', name: 'Ram Mohan' }],
    studentIds: ['stu-06', 'stu-07', 'stu-08', 'stu-09', 'stu-10'],
    busId: 'bus-a',
    busName: 'Bus A — Campus Express',
    tableNumber: 'Table A-02',
    status: 'active',
    createdAt: '2027-09-10T09:00:00.000Z',
  },
  {
    id: 'team-03',
    eventId: 'summit-2027',
    name: 'Team 03 — CyberShield',
    color: '#059669',
    mentorIds: ['mentor-02'],
    mentors: [{ id: 'mentor-02', name: 'Abhi Varma' }],
    studentIds: ['stu-11', 'stu-12', 'stu-13', 'stu-14', 'stu-15'],
    busId: 'bus-a',
    busName: 'Bus A — Campus Express',
    tableNumber: 'Table A-03',
    status: 'active',
    createdAt: '2027-09-10T09:00:00.000Z',
  },
  {
    id: 'team-04',
    eventId: 'summit-2027',
    name: 'Team 04 — EcoMatrix',
    color: '#D97706',
    mentorIds: ['mentor-03'],
    mentors: [{ id: 'mentor-03', name: 'Kiran Srinivas' }],
    studentIds: ['stu-16', 'stu-17', 'stu-18', 'stu-19', 'stu-20'],
    busId: 'bus-a',
    busName: 'Bus A — Campus Express',
    tableNumber: 'Table A-04',
    status: 'active',
    createdAt: '2027-09-10T09:00:00.000Z',
  },
  {
    id: 'team-05',
    eventId: 'summit-2027',
    name: 'Team 05 — AeroDynamics',
    color: '#DC2626',
    mentorIds: ['mentor-04'],
    mentors: [{ id: 'mentor-04', name: 'Priya Mukherjee' }],
    studentIds: ['stu-21', 'stu-22', 'stu-23', 'stu-24', 'stu-25'],
    busId: 'bus-b',
    busName: 'Bus B — Metro Transit',
    tableNumber: 'Table B-01',
    status: 'active',
    createdAt: '2027-09-10T09:00:00.000Z',
  },
  {
    id: 'team-06',
    eventId: 'summit-2027',
    name: 'Team 06 — BioGenesis',
    color: '#4F46E5',
    mentorIds: ['mentor-04', 'mentor-05'],
    mentors: [
      { id: 'mentor-04', name: 'Priya Mukherjee' },
      { id: 'mentor-05', name: 'Mohan Das' },
    ],
    studentIds: ['stu-26', 'stu-27', 'stu-28', 'stu-29', 'stu-30'],
    busId: 'bus-b',
    busName: 'Bus B — Metro Transit',
    tableNumber: 'Table B-02',
    status: 'active',
    createdAt: '2027-09-10T09:00:00.000Z',
  },
  {
    id: 'team-07',
    eventId: 'summit-2027',
    name: 'Team 07 — InfraVision',
    color: '#0D9488',
    mentorIds: ['mentor-05'],
    mentors: [{ id: 'mentor-05', name: 'Mohan Das' }],
    studentIds: ['stu-31', 'stu-32', 'stu-33', 'stu-34', 'stu-35'],
    busId: 'bus-b',
    busName: 'Bus B — Metro Transit',
    tableNumber: 'Table B-03',
    status: 'active',
    createdAt: '2027-09-10T09:00:00.000Z',
  },
  {
    id: 'team-08',
    eventId: 'summit-2027',
    name: 'Team 08 — FinSecure',
    color: '#DB2777',
    mentorIds: ['mentor-06'],
    mentors: [{ id: 'mentor-06', name: 'Anita Roy' }],
    studentIds: ['stu-36', 'stu-37', 'stu-38', 'stu-39', 'stu-40'],
    busId: 'bus-b',
    busName: 'Bus B — Metro Transit',
    tableNumber: 'Table B-04',
    status: 'active',
    createdAt: '2027-09-10T09:00:00.000Z',
  },
];

// 40 Students
const studentNames = [
  'Aruna Sharma', 'Rahul Sen', 'Kiran Joshi', 'Priya Rao', 'Vikram Seth',
  'Sneha Reddy', 'Amit Roy', 'Deepa Ghosh', 'Rohan Gupta', 'Ananya Dixit',
  'Rajesh Nair', 'Pooja Bhat', 'Suresh Menon', 'Divya Kaur', 'Manoj Jain',
  'Kavya Pillai', 'Karthik Rao', 'Meera Iyer', 'Nikhil Saxena', 'Swathi Das',
  'Sanjay Deshmukh', 'Ritu Mathur', 'Varun Kapoor', 'Bhavna Chauhan', 'Aditya Verma',
  'Neha Kapoor', 'Harish Chandra', 'Tanvi Singhania', 'Alok Pandey', 'Shreya Bose',
  'Chetan Mehta', 'Preeti Aggarwal', 'Tarun Shukla', 'Radhika Paul', 'Vivek Dubey',
  'Isha Patel', 'Pradeep Yadav', 'Lavanya Sundaram', 'Gautam Nambiar', 'Sandhya Roy'
];

export const INITIAL_STUDENTS: User[] = studentNames.map((name, index) => {
  const num = index + 1;
  const id = `stu-${num < 10 ? '0' + num : num}`;
  const teamIndex = Math.floor(index / 5);
  const team = INITIAL_TEAMS[teamIndex];
  const busId = index < 20 ? 'bus-a' : 'bus-b';
  const busName = index < 20 ? 'Bus A — Campus Express' : 'Bus B — Metro Transit';
  const mentorName = team.mentors?.[0]?.name || 'Ram Mohan';
  const mentorId = team.mentorIds[0] || 'mentor-01';

  return {
    id,
    eventId: 'summit-2027',
    role: 'student',
    fullName: name,
    email: `student${num}@summit2027.org`,
    phone: `+91 91000 ${String(1000 + num).slice(-4)}`,
    teamId: team.id,
    teamName: team.name,
    mentorId,
    mentorName,
    busId,
    busName,
    status: 'active',
    createdAt: '2027-09-10T10:00:00.000Z',
  };
});

// 13 Mentors
export const INITIAL_MENTORS: User[] = [
  { id: 'mentor-01', eventId: 'summit-2027', role: 'mentor', fullName: 'Ram Mohan', email: 'ram.mohan@summit.org', phone: '+91 98111 00001', teamId: 'team-01', teamName: 'Team 01 — NeuralPulse', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-02', eventId: 'summit-2027', role: 'mentor', fullName: 'Abhi Varma', email: 'abhi.varma@summit.org', phone: '+91 98111 00002', teamId: 'team-01', teamName: 'Team 01 — NeuralPulse', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-03', eventId: 'summit-2027', role: 'mentor', fullName: 'Kiran Srinivas', email: 'kiran.s@summit.org', phone: '+91 98111 00003', teamId: 'team-04', teamName: 'Team 04 — EcoMatrix', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-04', eventId: 'summit-2027', role: 'mentor', fullName: 'Priya Mukherjee', email: 'priya.m@summit.org', phone: '+91 98111 00004', teamId: 'team-05', teamName: 'Team 05 — AeroDynamics', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-05', eventId: 'summit-2027', role: 'mentor', fullName: 'Mohan Das', email: 'mohan.das@summit.org', phone: '+91 98111 00005', teamId: 'team-06', teamName: 'Team 06 — BioGenesis', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-06', eventId: 'summit-2027', role: 'mentor', fullName: 'Anita Roy', email: 'anita.roy@summit.org', phone: '+91 98111 00006', teamId: 'team-08', teamName: 'Team 08 — FinSecure', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-07', eventId: 'summit-2027', role: 'mentor', fullName: 'Deepak Chopra', email: 'deepak.c@summit.org', phone: '+91 98111 00007', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-08', eventId: 'summit-2027', role: 'mentor', fullName: 'Rekha Menon', email: 'rekha.m@summit.org', phone: '+91 98111 00008', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-09', eventId: 'summit-2027', role: 'mentor', fullName: 'Vinay Kulkarni', email: 'vinay.k@summit.org', phone: '+91 98111 00009', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-10', eventId: 'summit-2027', role: 'mentor', fullName: 'Sunita Narain', email: 'sunita.n@summit.org', phone: '+91 98111 00010', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-11', eventId: 'summit-2027', role: 'mentor', fullName: 'Arun George', email: 'arun.g@summit.org', phone: '+91 98111 00011', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-12', eventId: 'summit-2027', role: 'mentor', fullName: 'Maya Krishnan', email: 'maya.k@summit.org', phone: '+91 98111 00012', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'mentor-13', eventId: 'summit-2027', role: 'mentor', fullName: 'Rajesh Khurana', email: 'rajesh.k@summit.org', phone: '+91 98111 00013', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
];

// 5 Faculty
export const INITIAL_FACULTY: User[] = [
  { id: 'fac-01', eventId: 'summit-2027', role: 'faculty', fullName: 'Dr. K. Sharma', email: 'k.sharma@summit.org', phone: '+91 98222 00001', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'fac-02', eventId: 'summit-2027', role: 'faculty', fullName: 'Dr. V. Rao', email: 'v.rao@summit.org', phone: '+91 98222 00002', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'fac-03', eventId: 'summit-2027', role: 'faculty', fullName: 'Prof. A. Mehta', email: 'a.mehta@summit.org', phone: '+91 98222 00003', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'fac-04', eventId: 'summit-2027', role: 'faculty', fullName: 'Dr. S. Iyer', email: 's.iyer@summit.org', phone: '+91 98222 00004', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'fac-05', eventId: 'summit-2027', role: 'faculty', fullName: 'Prof. N. Gupta', email: 'n.gupta@summit.org', phone: '+91 98222 00005', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
];

// Judges
export const INITIAL_JUDGES: User[] = [
  { id: 'judge-01', eventId: 'summit-2027', role: 'judge', fullName: 'Elena Rostova', email: 'elena.rostova@techventures.io', phone: '+1 415 555 0192', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'judge-02', eventId: 'summit-2027', role: 'judge', fullName: 'Marcus Vance', email: 'marcus.vance@ai-labs.org', phone: '+1 415 555 0193', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
  { id: 'judge-03', eventId: 'summit-2027', role: 'judge', fullName: 'Sarah Jenkins', email: 'sarah.j@horizoncap.com', phone: '+1 415 555 0194', status: 'active', createdAt: '2027-09-10T08:00:00.000Z' },
];

// Admin
export const INITIAL_ADMIN: User = {
  id: 'admin-01',
  eventId: 'summit-2027',
  role: 'admin',
  fullName: 'Administrator',
  email: 'admin@summit2027.org',
  phone: '+91 99999 00000',
  status: 'active',
  createdAt: '2027-09-01T00:00:00.000Z',
};

// Initial Attendance Records (36 Present, 4 Absent)
export const INITIAL_ATTENDANCE: AttendanceRecord[] = INITIAL_STUDENTS.map((student, idx) => {
  const isAbsent = idx === 3 || idx === 12 || idx === 25 || idx === 38; // 4 absent
  return {
    id: `att-${student.id}`,
    sessionId: 'session-day1-bus',
    eventId: 'summit-2027',
    studentId: student.id,
    studentName: student.fullName,
    teamId: student.teamId,
    teamName: student.teamName,
    busId: student.busId,
    busName: student.busName,
    status: isAbsent ? 'absent' : 'present',
    verifiedBy: 'admin-01',
    verifiedAt: new Date(Date.now() - (40 - idx) * 60000).toISOString(),
    method: 'manual_admin',
  };
});

// Dynamic Rooms
export const INITIAL_ROOMS: Room[] = [
  {
    id: '8F2K9',
    eventId: 'summit-2027',
    title: 'Bus A Morning Attendance',
    purpose: 'Rapid boarding check-in for Bus A passengers',
    category: 'attendance',
    fields: [
      { id: 'f_name', type: 'text', label: 'Full Name', required: true, placeholder: 'e.g. Aruna Sharma' },
      { id: 'f_phone', type: 'phone', label: 'Phone Number', required: true, placeholder: '+91 91000 1001' },
      { id: 'f_present', type: 'yes_no', label: 'Are you seated on Bus A?', required: true, defaultValue: 'Yes' },
      { id: 'f_gps', type: 'gps', label: 'Verify Boarding Location', required: false },
    ],
    allowedRoles: ['all', 'student'],
    targetBusIds: ['bus-a'],
    oneSubmissionPerUser: true,
    submissionCount: 18,
    isActive: true,
    associatedBusId: 'bus-a',
    notifyOnSubmission: true,
    createdAt: '2027-09-12T07:30:00.000Z',
    createdBy: 'admin-01',
  },
  {
    id: '4X9Q2',
    eventId: 'summit-2027',
    title: 'Lunch Dietary Selection',
    purpose: 'Gather catering preferences for Day 1 buffet',
    category: 'custom',
    fields: [
      { id: 'f_name', type: 'text', label: 'Full Name', required: true },
      { id: 'f_diet', type: 'single_select', label: 'Dietary Option', required: true, options: ['Standard Vegetarian', 'Jain Vegetarian', 'Non-Vegetarian (Chicken)', 'Vegan', 'Gluten-Free'] },
      { id: 'f_allergy', type: 'long_text', label: 'Any severe allergies or requirements?', required: false, placeholder: 'e.g. Peanut allergy, lactose intolerant' },
    ],
    allowedRoles: ['all'],
    oneSubmissionPerUser: true,
    submissionCount: 34,
    isActive: true,
    notifyOnSubmission: false,
    createdAt: '2027-09-12T09:00:00.000Z',
    createdBy: 'admin-01',
  },
  {
    id: '7M3V8',
    eventId: 'summit-2027',
    title: 'Workshop Registration — Edge AI & Robotics',
    purpose: 'Seat allocation for afternoon lab session in Hall 4',
    category: 'registration',
    fields: [
      { id: 'f_name', type: 'text', label: 'Student Name', required: true },
      { id: 'f_team', type: 'text', label: 'Team Name', required: true },
      { id: 'f_experience', type: 'single_select', label: 'Hardware Experience', required: true, options: ['Beginner (Python only)', 'Intermediate (ROS / Arduino)', 'Advanced (Embedded C/CUDA)'] },
      { id: 'f_laptop', type: 'yes_no', label: 'Do you have your laptop with you?', required: true },
    ],
    allowedRoles: ['student'],
    oneSubmissionPerUser: true,
    submissionCount: 22,
    isActive: true,
    notifyOnSubmission: false,
    createdAt: '2027-09-12T10:15:00.000Z',
    createdBy: 'admin-01',
  },
];

// Announcements
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-01',
    eventId: 'summit-2027',
    title: 'Keynote Venue Update: Moved to Main Auditorium Hall B',
    message: 'Due to technical soundcheck schedules, the opening keynote starts promptly at 10:30 AM in Auditorium Hall B. Please proceed directly after taking seats.',
    priority: 'urgent',
    target: { audience: 'all' },
    actionUrl: '/student/dashboard',
    senderId: 'admin-01',
    senderName: 'Sangam Command Center',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 'ann-02',
    eventId: 'summit-2027',
    title: 'Lunch Preferences Room is Open',
    message: 'Please complete your dietary selection room before 12:00 PM to ensure proper meal packaging.',
    priority: 'important',
    target: { audience: 'students' },
    actionUrl: '/rooms/4X9Q2',
    senderId: 'admin-01',
    senderName: 'Hospitality Team',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
  },
  {
    id: 'ann-03',
    eventId: 'summit-2027',
    title: 'Sangam Photo Capture & Watermark Camera is Live',
    message: 'Remember to snap team photos using the built-in Camera tab. All images receive instant sangam verification branding with scannable QR codes!',
    priority: 'normal',
    target: { audience: 'all' },
    actionUrl: '/student/camera',
    senderId: 'admin-01',
    senderName: 'Media Desk',
    createdAt: new Date(Date.now() - 150 * 60000).toISOString(),
  },
];

// Activity Logs
export const INITIAL_ACTIVITY: ActivityLog[] = [
  {
    id: 'act-01',
    eventId: 'summit-2027',
    actorId: 'admin-01',
    actorName: 'Administrator',
    actorRole: 'admin',
    action: 'ANNOUNCEMENT_PUBLISHED',
    targetEntity: 'announcements/ann-01',
    details: { title: 'Keynote Venue Update', priority: 'urgent' },
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 'act-02',
    eventId: 'summit-2027',
    actorId: 'admin-01',
    actorName: 'Administrator',
    actorRole: 'admin',
    action: 'ATTENDANCE_MARKED',
    targetEntity: 'attendance/bus-a',
    details: { totalMarked: 20, present: 19, absent: 1 },
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'act-03',
    eventId: 'summit-2027',
    actorId: 'mentor-01',
    actorName: 'Ram Mohan',
    actorRole: 'mentor',
    action: 'PHOTO_UPLOADED',
    targetEntity: 'photos/PHOTO-82H3K',
    details: { team: 'Team 01 — NeuralPulse', photoId: 'PHOTO-82H3K' },
    timestamp: new Date(Date.now() - 75 * 60000).toISOString(),
  },
  {
    id: 'act-04',
    eventId: 'summit-2027',
    actorId: 'admin-01',
    actorName: 'Administrator',
    actorRole: 'admin',
    action: 'ROOM_CREATED',
    targetEntity: 'rooms/4X9Q2',
    details: { title: 'Lunch Dietary Selection' },
    timestamp: new Date(Date.now() - 95 * 60000).toISOString(),
  },
  {
    id: 'act-05',
    eventId: 'summit-2027',
    actorId: 'stu-01',
    actorName: 'Aruna Sharma',
    actorRole: 'student',
    action: 'ROOM_SUBMITTED',
    targetEntity: 'rooms/8F2K9',
    details: { room: 'Bus A Morning Attendance' },
    timestamp: new Date(Date.now() - 110 * 60000).toISOString(),
  },
];

// Initial Photos with verification data
export const INITIAL_PHOTOS: Photo[] = [
  {
    id: 'PHOTO-82H3K',
    eventId: 'summit-2027',
    uploadedBy: {
      userId: 'stu-01',
      name: 'Aruna Sharma',
      role: 'student',
      teamId: 'team-01',
      teamName: 'Team 01 — NeuralPulse',
      mentorName: 'Ram Mohan',
    },
    originalUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    brandedUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80',
    verificationCode: 'VERIFY_82H3K_99182',
    gps: {
      lat: 17.4482,
      lng: 78.3742,
      accuracy: 8,
      locationName: 'Convention Center Innovation Lab',
    },
    dimensions: { width: 1200, height: 800 },
    sizeBytes: 1048576,
    mimeType: 'image/jpeg',
    capturedAt: '2027-09-12T10:42:00.000Z',
    uploadedAt: '2027-09-12T10:42:30.000Z',
    status: 'approved',
    tags: ['team', 'lab', 'prototype'],
  },
  {
    id: 'PHOTO-41N7P',
    eventId: 'summit-2027',
    uploadedBy: {
      userId: 'mentor-02',
      name: 'Abhi Varma',
      role: 'mentor',
      teamId: 'team-03',
      teamName: 'Team 03 — CyberShield',
      mentorName: 'Abhi Varma',
    },
    originalUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    brandedUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
    verificationCode: 'VERIFY_41N7P_44821',
    gps: {
      lat: 17.4479,
      lng: 78.3746,
      accuracy: 12,
      locationName: 'Sangam Hackathon Arena',
    },
    dimensions: { width: 1200, height: 800 },
    sizeBytes: 943718,
    mimeType: 'image/jpeg',
    capturedAt: '2027-09-12T11:15:00.000Z',
    uploadedAt: '2027-09-12T11:15:45.000Z',
    status: 'approved',
    tags: ['coding', 'mentorship'],
  },
  {
    id: 'PHOTO-99K2W',
    eventId: 'summit-2027',
    uploadedBy: {
      userId: 'stu-06',
      name: 'Sneha Reddy',
      role: 'student',
      teamId: 'team-02',
      teamName: 'Team 02 — QuantumLeap',
      mentorName: 'Ram Mohan',
    },
    originalUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    brandedUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80',
    verificationCode: 'VERIFY_99K2W_10492',
    gps: {
      lat: 17.4485,
      lng: 78.3739,
      accuracy: 6,
      locationName: 'Hardware Testing Bay',
    },
    dimensions: { width: 1200, height: 800 },
    sizeBytes: 1258291,
    mimeType: 'image/jpeg',
    capturedAt: '2027-09-12T11:45:00.000Z',
    uploadedAt: '2027-09-12T11:46:00.000Z',
    status: 'approved',
    tags: ['hardware', 'testing'],
  },
];
