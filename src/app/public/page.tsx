import { redirect } from 'next/navigation';

export default function PublicPageRedirect() {
  redirect('/live');
}
