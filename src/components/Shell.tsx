'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CalendarDays, Building2, LayoutDashboard, LogOut, UsersRound, MapPinned, ContactRound } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

const mainRoutes = ['/dashboard', '/admin/dashboard', '/agendas', '/agendas/mapa', '/pacientes', '/clinicas', '/usuarios'];

function can(profile: any, key: string) { return profile.role === 'admin' || profile.permissions?.[key] !== false; }

export default function Shell({ children, profile }: { children: React.ReactNode; profile: any }) {
  const path = usePathname();
  const router = useRouter();
  const items = [
    ...(can(profile, 'overview') ? [['/dashboard', 'Visão geral', LayoutDashboard] as const] : []),
    ...(can(profile, 'agendas') ? [['/agendas', 'Agendas', CalendarDays] as const] : []),
    ...(can(profile, 'availability_map') ? [['/agendas/mapa', 'Mapa de disponibilidade', MapPinned] as const] : []),
    ...(can(profile, 'patients') ? [['/pacientes', 'Pacientes', ContactRound] as const] : []),
    ...(profile.role !== 'clinic' && can(profile, 'clinics') ? [['/clinicas', 'Clínicas', Building2] as const] : []),
  ] as const;

  useEffect(() => {
    const required = path.startsWith('/admin/dashboard') ? 'dashboard'
      : path.startsWith('/agendas/mapa') ? 'availability_map'
      : path.startsWith('/agendas') ? 'agendas'
      : path.startsWith('/pacientes') ? 'patients'
      : path.startsWith('/clinicas') ? 'clinics'
      : path.startsWith('/usuarios') ? 'users'
      : path === '/dashboard' ? 'overview'
      : null;
    if (required && !can(profile, required)) router.replace('/dashboard');

    const timer = window.setTimeout(() => {
      mainRoutes.forEach((href) => router.prefetch(href));
    }, 60);
    return () => window.clearTimeout(timer);
  }, [router]);

  const prefetch = (href: string) => router.prefetch(href);
  const isActive = (href: string) => href === '/agendas' ? path === '/agendas' : path.startsWith(href);

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
            <Link className={isActive(href) ? 'nav active' : 'nav'} href={href} key={href} prefetch onMouseEnter={() => prefetch(href)} onFocus={() => prefetch(href)}>
              <Icon size={18} />{label}
            </Link>
          ))}
          {profile.role === 'admin' && can(profile, 'users') && (
            <>
              <div className="navLabel navLabelSpaced">Administração</div>
              {can(profile, 'dashboard') && <Link className={path.startsWith('/admin/dashboard') ? 'nav active' : 'nav'} href="/admin/dashboard" prefetch onMouseEnter={() => prefetch('/admin/dashboard')} onFocus={() => prefetch('/admin/dashboard')}>
                <LayoutDashboard size={18} />Dashboard
              </Link>}
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
