import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import UserManagement from '@/components/UserManagement';

export const dynamic = 'force-dynamic';

export default async function Users() {
  const x = await getCurrentProfile();
  if (!x || x.profile.role !== 'admin') redirect('/dashboard');

  const s = await createClient();
  const [{ data: users }, { data: clinics }] = await Promise.all([
    s.from('profiles').select('id,full_name,role,active,clinic_id').order('full_name'),
    s.from('clinics').select('id,name').eq('active', true).order('name'),
  ]);

  return (
    <Shell profile={x.profile}>
      <div className="pageHeader">
        <div><span className="panelKicker">Controle de acesso</span><h1>Usuários</h1><p className="muted">Criação de contas e gerenciamento de permissões.</p></div>
      </div>
      <UserManagement clinics={clinics || []} users={users || []} />
    </Shell>
  );
}
