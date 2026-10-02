import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import Shell from '@/components/Shell';
import DashboardAnalytics from './DashboardAnalytics';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const x = await getCurrentProfile();
  if (!x) redirect('/login');

  return (
    <Shell profile={x.profile}>
      <DashboardAnalytics profile={x.profile} />
    </Shell>
  );
}
