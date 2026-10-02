import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import Shell from '@/components/Shell';
import DashboardAnalytics from '@/app/dashboard/DashboardAnalytics';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const x = await getCurrentProfile();
  if (!x) redirect('/login');
  if (x.profile.role !== 'admin') redirect('/dashboard');

  return (
    <Shell profile={x.profile}>
      <DashboardAnalytics profile={x.profile} />
    </Shell>
  );
}
