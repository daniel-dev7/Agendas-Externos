import { getCurrentProfile } from '@/lib/auth';
import Shell from '@/components/Shell';
import { CalendarDays, Building2, UsersRound } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const x = await getCurrentProfile();
  if (!x) redirect('/login');

  const s = await (await import('@/lib/supabase-server')).createClient();
  const clinicFilter = x.profile.role === 'clinic' ? { clinic_id: x.profile.clinic_id } : {};
  const [{ count: agendas }, { count: clinics }, { count: users }] = await Promise.all([
    s.from('agendas').select('*', { count: 'exact', head: true }).match(clinicFilter),
    s.from('clinics').select('*', { count: 'exact', head: true }),
    s.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <Shell profile={x.profile}>
      <h1>Visão geral</h1>
      <p className="muted">Operação central das agendas de Ressonância.</p>
      <div className="cards">
        <div className="card">
          <CalendarDays />
          <b>{agendas || 0}</b>
          <span>Agendas</span>
        </div>
        {x.profile.role !== 'clinic' && (
          <>
            <div className="card">
              <Building2 />
              <b>{clinics || 0}</b>
              <span>Clínicas</span>
            </div>
            <div className="card">
              <UsersRound />
              <b>{users || 0}</b>
              <span>Usuários</span>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
