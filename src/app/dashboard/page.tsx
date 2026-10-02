import { redirect } from 'next/navigation';
import { CalendarDays, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const x = await getCurrentProfile();
  if (!x) redirect('/login');

  return (
    <Shell profile={x.profile}>
      <section className="dashboardHero">
        <div>
          <span className="eyebrow"><CalendarDays size={14}/> Visão geral</span>
          <h1>Olá, {x.profile.full_name || 'Usuário'}.</h1>
          <p>Acompanhe suas agendas e a operação diária de forma rápida e organizada.</p>
        </div>
        <Link href="/agendas" className="heroAction">Ver agendas <ArrowRight size={15}/></Link>
      </section>
      <section className="dashboardCards">
        <Link href="/agendas" className="dashboardCard">
          <span className="dashboardCardIcon"><CalendarDays size={19}/></span>
          <div><strong>Agendas</strong><p>Consulte agendas, horários e disponibilidade.</p></div>
          <ArrowRight size={15}/>
        </Link>
        <Link href="/agendas/mapa" className="dashboardCard">
          <span className="dashboardCardIcon"><Building2 size={19}/></span>
          <div><strong>Mapa de disponibilidade</strong><p>Visualize rapidamente os slots disponíveis e ocupados.</p></div>
          <ArrowRight size={15}/>
        </Link>
      </section>
    </Shell>
  );
}
