import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase-server';
import Shell from '@/components/Shell';
import NewClinicForm from '@/components/NewClinicForm';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Clinicas() {
  const x = await getCurrentProfile();
  if (!x) redirect('/login');

  if (!['admin', 'operator'].includes(x.profile.role)) {
    redirect('/dashboard');
  }

  const s = await createClient();
  const { data } = await s
    .from('clinics')
    .select('id,name,code,active')
    .order('name');

  return (
    <Shell profile={x.profile}>
      <div className="toolbar">
        <div>
          <h1>Clínicas</h1>
          <p className="muted">Parceiros cadastrados na plataforma.</p>
        </div>
        <NewClinicForm />
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>Código</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(data || []).map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.code}</td>
                <td><span className="pill">{c.active ? 'Ativa' : 'Inativa'}</span></td>
              </tr>
            ))}
            {!data?.length && (
              <tr><td colSpan={3} className="empty">Nenhuma clínica cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
