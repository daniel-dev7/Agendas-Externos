import { NextResponse } from 'next/server';
import { createClient as serverClient } from '@/lib/supabase-server';
import { createClient as adminClient } from '@supabase/supabase-js';

async function requireAdmin() {
  const s = await serverClient();
  const { data } = await s.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await s.from('profiles').select('role,active').eq('id', id).maybeSingle();
  return profile?.role === 'admin' && profile.active ? { id } : null;
}

function defaultPermissions(role: string) {
  const base = {
    overview: true, dashboard: false, agendas: true, availability_map: true,
    patients: true, clinics: role !== 'clinic', users: false,
    agenda_create: role !== 'operator', agenda_edit: role !== 'operator', agenda_delete: role === 'admin',
    appointment_book: true, appointment_cancel: true, appointment_status: true,
    appointment_reschedule: false, patient_create: role !== 'clinic', clinic_manage: role !== 'clinic',
  };
  if (role === 'admin') return Object.fromEntries(Object.keys(base).map(k => [k, true]));
  return base;
}

function getAdminClient() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: Request) {
  const current = await requireAdmin();
  if (!current) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const b = await req.json();
  if (!b.email || !b.password || !b.full_name || !['admin', 'operator', 'clinic'].includes(b.role)) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
  }
  if (b.role === 'clinic' && !b.clinic_id) {
    return NextResponse.json({ error: 'Clínica obrigatória.' }, { status: 400 });
  }

  const a = getAdminClient();
  const { data: u, error } = await a.auth.admin.createUser({
    email: b.email,
    password: b.password,
    email_confirm: true,
    user_metadata: { full_name: b.full_name },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: pe } = await a.from('profiles').update({
    full_name: b.full_name,
    role: b.role,
    clinic_id: b.role === 'clinic' ? b.clinic_id : null,
    active: true,
    permissions: permissions || defaultPermissions(b.role),
  }).eq('id', u.user.id);

  if (pe) return NextResponse.json({ error: pe.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const current = await requireAdmin();
  if (!current) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const b = await req.json();
  const id = String(b.id ?? '');
  const role = String(b.role ?? '');
  const clinic_id = b.clinic_id ? String(b.clinic_id) : null;
  const active = Boolean(b.active);
  const permissions = b.permissions && typeof b.permissions === 'object' ? b.permissions : null;

  if (!id || !['admin', 'operator', 'clinic'].includes(role)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }
  if (role === 'clinic' && !clinic_id) {
    return NextResponse.json({ error: 'Clínica obrigatória para usuário de clínica.' }, { status: 400 });
  }

  const a = getAdminClient();
  const { error } = await a.from('profiles').update({
    role,
    clinic_id: role === 'clinic' ? clinic_id : null,
    active,
    ...(permissions ? { permissions } : {}),
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
