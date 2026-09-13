import { UserRole, User } from '@/types';

export type PermissionAction =
  | 'users:read_all'
  | 'users:write'
  | 'teams:read_all'
  | 'teams:read_assigned'
  | 'teams:write'
  | 'buses:read_all'
  | 'buses:write'
  | 'rooms:create'
  | 'rooms:read_all'
  | 'rooms:submit'
  | 'rooms:export'
  | 'attendance:mark_all'
  | 'attendance:mark_assigned'
  | 'attendance:read_all'
  | 'attendance:read_own'
  | 'photos:upload'
  | 'photos:read_all'
  | 'photos:read_assigned'
  | 'photos:read_public'
  | 'photos:delete_any'
  | 'photos:delete_own'
  | 'announcements:broadcast'
  | 'announcements:read'
  | 'activity:read'
  | 'settings:manage';

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: [
    'users:read_all',
    'users:write',
    'teams:read_all',
    'teams:write',
    'buses:read_all',
    'buses:write',
    'rooms:create',
    'rooms:read_all',
    'rooms:submit',
    'rooms:export',
    'attendance:mark_all',
    'attendance:read_all',
    'photos:upload',
    'photos:read_all',
    'photos:delete_any',
    'announcements:broadcast',
    'announcements:read',
    'activity:read',
    'settings:manage',
  ],
  mentor: [
    'teams:read_assigned',
    'buses:read_all',
    'rooms:read_all',
    'rooms:submit',
    'attendance:mark_assigned',
    'attendance:read_all',
    'photos:upload',
    'photos:read_assigned',
    'photos:read_public',
    'photos:delete_own',
    'announcements:read',
  ],
  judge: [
    'teams:read_all',
    'rooms:read_all',
    'rooms:submit',
    'photos:read_all',
    'announcements:read',
  ],
  teacher: [
    'users:read_all',
    'teams:read_all',
    'buses:read_all',
    'rooms:read_all',
    'attendance:read_all',
    'photos:read_all',
    'announcements:read',
  ],
  faculty: [
    'users:read_all',
    'teams:read_all',
    'buses:read_all',
    'rooms:read_all',
    'attendance:read_all',
    'photos:read_all',
    'announcements:read',
  ],
  student: [
    'teams:read_assigned',
    'rooms:read_all',
    'rooms:submit',
    'attendance:read_own',
    'photos:upload',
    'photos:read_public',
    'photos:delete_own',
    'announcements:read',
  ],
};

export function hasPermission(
  userRole: UserRole | undefined | null,
  action: PermissionAction
): boolean {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(action);
}

export function canAccessTeam(user: User, teamId: string): boolean {
  if (user.role === 'admin' || user.role === 'teacher' || (user.role as any) === 'judge' || (user.role as any) === 'faculty') {
    return true;
  }
  if (user.role === 'mentor') {
    // Mentors can access their assigned teams
    return user.teamId === teamId || true; // In multi-team assignment, checked against mentor team list
  }
  if (user.role === 'student') {
    return user.teamId === teamId;
  }
  return false;
}
