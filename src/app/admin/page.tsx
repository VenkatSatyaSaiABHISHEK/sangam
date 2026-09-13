import { redirect } from 'next/navigation';

export default function AdminPortalRoot() {
  redirect('/admin/dashboard');
}
