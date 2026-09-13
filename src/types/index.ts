export type UserRole = 'admin' | 'student' | 'mentor' | 'teacher' | 'judge' | 'faculty';

export interface User {
  id: string;
  eventId: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  teamId?: string;
  teamName?: string;
  mentorId?: string;
  mentorName?: string;
  busId?: string;
  busName?: string;
  department?: string;
  branch?: string; // e.g. "CSE", "ECE", "IT", "AI&DS"
  year?: string; // e.g. "1st Year", "2nd Year", "3rd Year", "4th Year"
  club?: string; // e.g. "KSCS", "Smart City Lab", "Innovation Cell", "Robotics Club"
  mentorType?: 'cohort' | 'support'; // "cohort" = assigned to team, "support" = floating support across all teams
  status: 'active' | 'inactive' | 'suspended';
  isProvisionalEmail?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  color?: string; // Hex or theme color for quick visual distinction (e.g. #2563EB, #059669, #7C3AED)
  mentorIds: string[];
  mentors?: { id: string; name: string; phone?: string; email?: string; club?: string; branch?: string; year?: string }[];
  supportMentorIds?: string[];
  supportMentors?: { id: string; name: string; phone?: string; email?: string; club?: string; branch?: string; year?: string }[];
  studentIds: string[];
  busId?: string;
  busName?: string;
  tableNumber?: string;
  status: 'active' | 'completed';
  createdAt: string;
}

export interface Bus {
  id: string;
  eventId: string;
  name: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  capacity: number;
  assignedMentorIds: string[];
  assignedStudentIds: string[];
  status: 'boarding' | 'in_transit' | 'arrived' | 'completed';
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
  createdAt: string;
}

export type RoomFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'yes_no'
  | 'single_select'
  | 'multi_select'
  | 'date'
  | 'time'
  | 'photo'
  | 'file'
  | 'gps'
  | 'qr_scan'
  | 'checkbox'
  | 'long_text';

export interface RoomField {
  id: string;
  type: RoomFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    regex?: string;
  };
}

export interface Room {
  id: string; // short code e.g. "8F2K9"
  eventId: string;
  title: string;
  purpose: string;
  category: 'attendance' | 'feedback' | 'registration' | 'emergency' | 'custom';
  fields: RoomField[];
  allowedRoles: ('all' | UserRole)[];
  targetTeamIds?: string[];
  targetBusIds?: string[];
  startTime?: string;
  endTime?: string;
  maxSubmissions?: number;
  oneSubmissionPerUser: boolean;
  submissionCount: number;
  isActive: boolean;
  associatedBusId?: string;
  notifyOnSubmission: boolean;
  createdAt: string;
  createdBy: string;
}

export interface RoomSubmission {
  id: string;
  roomId: string;
  eventId: string;
  submittedBy?: {
    userId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    teamId?: string;
    teamName?: string;
    role?: UserRole;
  };
  answers: Record<string, any>;
  gpsCoordinates?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  submittedAt: string;
  updatedAt?: string;
  ipAddress?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  eventId: string;
  studentId: string;
  studentName: string;
  teamId?: string;
  teamName?: string;
  busId?: string;
  busName?: string;
  status: AttendanceStatus;
  verifiedBy: string;
  verifiedAt: string;
  method: 'manual_admin' | 'mentor_app' | 'dynamic_room' | 'qr_scanner';
  location?: { lat: number; lng: number };
  notes?: string;
}

export interface AttendanceSession {
  id: string;
  eventId: string;
  name: string;
  type: 'bus' | 'hall' | 'workshop' | 'dinner';
  targetBusId?: string;
  targetTeamId?: string;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  method: 'manual_admin' | 'mentor_app' | 'dynamic_room' | 'qr_scanner';
  createdBy: string;
}

export interface Photo {
  id: string; // e.g. "PHOTO-82H3K"
  eventId: string;
  uploadedBy: {
    userId: string;
    name: string;
    role: UserRole;
    teamId?: string;
    teamName?: string;
    mentorName?: string;
  };
  originalUrl: string;
  brandedUrl: string;
  thumbnailUrl: string;
  verificationCode?: string;
  gps?: {
    lat: number;
    lng: number;
    accuracy?: number;
    locationName?: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  sizeBytes: number;
  mimeType: string;
  capturedAt: string;
  uploadedAt: string;
  status: 'approved' | 'pending' | 'flagged';
  tags: string[];
  hasWatermark?: boolean;
  captureType?: 'camera' | 'upload';
}

export type PriorityLevel = 'normal' | 'important' | 'urgent';

export interface Announcement {
  id: string;
  eventId: string;
  title: string;
  message: string;
  priority: PriorityLevel;
  target: {
    audience: 'all' | 'students' | 'mentors' | 'teachers' | 'team' | 'individual';
    targetIds?: string[];
  };
  actionUrl?: string;
  fileUrl?: string; // PDF document or shared file
  fileName?: string; // e.g. "Summit_Schedule_2027.pdf"
  fileType?: string; // "pdf" | "link" | "doc"
  imageUrl?: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Notification {
  id: string;
  eventId: string;
  userId: string;
  announcementId?: string;
  title: string;
  body: string;
  priority: PriorityLevel;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  eventId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action:
    | 'USER_LOGIN'
    | 'ROOM_CREATED'
    | 'ROOM_SUBMITTED'
    | 'ATTENDANCE_MARKED'
    | 'PHOTO_UPLOADED'
    | 'PHOTO_DELETED'
    | 'TEAM_ASSIGNED'
    | 'BUS_ASSIGNED'
    | 'ANNOUNCEMENT_PUBLISHED'
    | 'USER_MODIFIED';
  targetEntity: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface EventInfo {
  id: string;
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'archived';
  stats: {
    totalStudents: number;
    totalMentors: number;
    totalFaculty: number;
    totalJudges: number;
    totalTeams: number;
    totalBuses: number;
  };
}

export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderEmail?: string;
  senderAvatar?: string;
  teamName?: string;
  content: string;
  imageUrl?: string;
  imageCaption?: string;
  isQuestion?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  createdAt: string;
}

export interface ChannelSettings {
  studentCanPost: boolean;
  topic?: string;
  updatedAt?: string;
  allowedStudentIds?: string[];
  studentPermissions?: Record<string, boolean>;
}
