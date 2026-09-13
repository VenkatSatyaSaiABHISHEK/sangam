import { redirect } from 'next/navigation';

export default function AdminJudgesRedirect() {
  redirect('/admin/teachers');
}
