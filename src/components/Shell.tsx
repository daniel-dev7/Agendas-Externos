'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CalendarDays, Building2, LayoutDashboard, LogOut, UsersRound, MapPinned, ContactRound } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

const mainRoutes = ['/dashboard', '/agendas', '/agendas/mapa', '/pacientes', '/clinicas', '/usuarios'];

export default function Shell({ children, profile }: { children: React.ReactNode; profile: any }) {
  const path = usePathname();
  const router = useRouter();
  const items = [
    ['/dashboard', 'Visão geral', LayoutDashboard],
    ['/agendas', 'Agendas', CalendarDays],
    ['/agendas/mapa', 'Mapa de disponibilidade', MapPinned],
    ['/pacientes', 'Pacientes', ContactRound],
    ...(profile.role !== 'clinic' ? [['/clinicas', 'Clínicas', Building2] as const] : []),
  ] as const;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      mainRoutes.forEach((href) => router.prefetch(href));
    }, 60);
    return () => window.clearTimeout(timer);
  }, [router]);

  const prefetch = (href: string) => router.prefetch(href);

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/dashboard" className="brand" prefetch onMouseEnter={() => prefetch('/dashboard')} onFocus={() => prefetch('/dashboard')}>
          <span className="brandIcon"><CalendarDays size={18} /></span>
          <div><b>Agenda Clínica</b><small>Gestão de agendas</small></div>
        </Link>
        <div className="user">
          <div className="userIdentity">
            <span className="userAvatar">{(profile.full_name || 'U').slice(0, 1).toUpperCase()}</span>
            <span><b>{profile.full_name || 'Usuário'}</b><small>{profile.role === 'clinic' ? 'Clínica parceira' : profile.role === 'operator' ? 'Operador' : 'Administrador'}</small></span>
          </div>
          <button className="iconBtn" onClick={async () => { await createClient().auth.signOut(); router.replace('/login'); }} aria-label="Sair" title="Sair">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div className="layout">
        <aside>
          <div className="navLabel">Navegação</div>
          {items.map(([href, label, Icon]) => (
            <Link
              className={path.startsWith(href) ? 'nav active' : 'nav'}
              href={href}
              key={href}
              prefetch
              onMouseEnter={() => prefetch(href)}
              onFocus={() => prefetch(href)}
            >
              <Icon size={18} />{label}
            </Link>
          ))}
          {profile.role === 'admin' && (
            <>
              <div className="navLabel navLabelSpaced">Administração</div>
              <Link className={path.startsWith('/usuarios') ? 'nav active' : 'nav'} href="/usuarios" prefetch onMouseEnter={() => prefetch('/usuarios')} onFocus={() => prefetch('/usuarios')}>
                <UsersRound size={18} />Usuários
              </Link>
            </>
          )}
          <div className="sideFooter">Agenda Clínica<br /><span>Operação segura</span></div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
