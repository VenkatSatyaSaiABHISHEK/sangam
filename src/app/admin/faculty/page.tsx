import { redirect } from 'next/navigation';

export default function AdminFacultyRedirect() {
  redirect('/admin/teachers');
}
