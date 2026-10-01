import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarDays, Building2, CircleCheck, Plus, UsersRound } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase-server';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const x = await getCurrentProfile();
  if (!x) redirect('/login');

  const s = await createClient();
  const isClinic = x.profile.role === 'clinic';
  const clinicFilter = isClinic ? { clinic_id: x.profile.clinic_id } : {};

  const [{ count: agendas }, { count: clinics }, { count: users }, { data: upcoming }] =
    await Promise.all([
      s.from('agendas').select('*', { count: 'exact', head: true }).match(clinicFilter),
      s.from('clinics').select('*', { count: 'exact', head: true }),
      s.from('profiles').select('*', { count: 'exact', head: true }),
      s.from('agendas').select('id,scheduled_date,status,capacity,clinic_id,clinics(name)')
        .match(clinicFilter).gte('scheduled_date', new Date().toISOString().slice(0, 10))
        .order('scheduled_date', { ascending: true }).limit(4),
    ]);

  const firstName = x.profile.full_name?.trim().split(/\s+/)[0] || 'usuário';
  const roleLabel = isClinic ? 'Clínica parceira' : x.profile.role === 'operator' ? 'Operação' : 'Administrador';

  return (
    <Shell profile={x.profile}>
      <div className="dashboard">
        <section className="dashboardHero">
          <div>
            <span className="eyebrow"><CircleCheck size={14} /> Sistema operacional</span>
            <h1>Bom dia, {firstName}.</h1>
            <p>Acompanhe a operação das agendas de Ressonância em um só lugar.</p>
          </div>
          <div className="heroRole"><span>{roleLabel}</span><strong>Agenda Clínica</strong></div>
        </section>

        <section className="metricGrid" aria-label="Resumo da operação">
          <Link href="/agendas" className="metricCard metricPrimary">
            <span className="metricIcon"><CalendarDays size={20} /></span>
            <div><small>Agendas</small><strong>{agendas || 0}</strong></div>
            <ArrowRight className="metricArrow" size={18} />
          </Link>
          {!isClinic && (
            <>
              <Link href="/clinicas" className="metricCard">
                <span className="metricIcon"><Building2 size={20} /></span>
                <div><small>Clínicas parceiras</small><strong>{clinics || 0}</strong></div>
                <ArrowRight className="metricArrow" size={18} />
              </Link>
              <Link href="/usuarios" className="metricCard">
                <span className="metricIcon"><UsersRound size={20} /></span>
                <div><small>Usuários</small><strong>{users || 0}</strong></div>
                <ArrowRight className="metricArrow" size={18} />
              </Link>
            </>
          )}
        </section>

        <div className="dashboardColumns">
          <section className="dashboardPanel agendaPanel">
            <div className="panelHeader">
              <div><span className="panelKicker">Próximos compromissos</span><h2>Agendas próximas</h2></div>
              <Link href="/agendas" className="textAction">Ver todas <ArrowRight size={15} /></Link>
            </div>
            {upcoming?.length ? (
              <div className="agendaList">
                {upcoming.map((agenda: any) => (
                  <Link href="/agendas" className="agendaRow" key={agenda.id}>
                    <div className="dateBadge">
                      <strong>{new Date(agenda.scheduled_date + 'T12:00:00').getDate()}</strong>
                      <span>{new Date(agenda.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                    </div>
                    <div className="agendaInfo">
                      <strong>{isClinic ? 'Agenda de Ressonância' : agenda.clinics?.name || 'Clínica parceira'}</strong>
                      <span>Capacidade de {agenda.capacity} atendimentos</span>
                    </div>
                    <span className={'statusDot status-' + agenda.status}>
                      {agenda.status === 'open' ? 'Aberta' : agenda.status === 'closed' ? 'Fechada' : 'Cancelada'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="emptyDashboard">
                <CalendarDays size={25} /><strong>Nenhuma agenda próxima</strong><span>As novas agendas aparecerão aqui.</span>
              </div>
            )}
          </section>

          <section className="dashboardPanel quickPanel">
            <div className="panelHeader"><div><span className="panelKicker">Atalhos</span><h2>Ações rápidas</h2></div></div>
            <div className="quickActions">
              <Link href="/agendas" className="quickAction">
                <span><CalendarDays size={19} /></span><div><strong>Gerenciar agendas</strong><small>Consultar e organizar horários</small></div><ArrowRight size={16} />
              </Link>
              {!isClinic && <Link href="/clinicas" className="quickAction">
                <span><Building2 size={19} /></span><div><strong>Nova clínica</strong><small>Cadastrar parceiro</small></div><Plus size={16} />
              </Link>}
              {!isClinic && <Link href="/usuarios" className="quickAction">
                <span><UsersRound size={19} /></span><div><strong>Usuários</strong><small>Gerenciar acessos</small></div><ArrowRight size={16} />
              </Link>}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
