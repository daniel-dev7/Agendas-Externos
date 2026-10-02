'use client';

import { useState } from 'react';
import { Pencil, UserPlus, X, ShieldCheck } from 'lucide-react';

type Clinic = { id: string; name: string };
type Permissions = Record<string, boolean>;
type User = { id: string; full_name: string; role: string; active: boolean; clinic_id?: string | null; permissions?: Permissions | null };

const permissionGroups = [
  {
    title: 'Acesso às telas',
    items: [
      ['overview', 'Visão geral'],
      ['agendas', 'Agendas'],
      ['availability_map', 'Mapa de disponibilidade'],
      ['patients', 'Pacientes'],
      ['clinics', 'Clínicas'],
      ['dashboard', 'Dashboard administrativo'],
      ['users', 'Usuários'],
    ],
  },
  {
    title: 'Operação',
    items: [
      ['agenda_create', 'Criar agendas'],
      ['agenda_edit', 'Editar agendas'],
      ['agenda_delete', 'Excluir agendas'],
      ['appointment_book', 'Agendar paciente'],
      ['appointment_cancel', 'Cancelar agendamento'],
      ['appointment_status', 'Marcar atendido / faltou'],
      ['appointment_reschedule', 'Reagendar paciente'],
      ['patient_create', 'Cadastrar paciente'],
      ['clinic_manage', 'Gerenciar clínicas'],
    ],
  },
] as const;

function defaultPermissions(role: string): Permissions {
  const p: Permissions = {
    overview: true, dashboard: false, agendas: true, availability_map: true,
    patients: true, clinics: role !== 'clinic', users: false,
    agenda_create: role !== 'operator', agenda_edit: role !== 'operator', agenda_delete: role === 'admin',
    appointment_book: true, appointment_cancel: true, appointment_status: true,
    appointment_reschedule: false, patient_create: role !== 'clinic', clinic_manage: role === 'admin',
  };
  if (role === 'admin') Object.keys(p).forEach(k => p[k] = true);
  return p;
}

function withDefaults(user: User) {
  return { ...user, permissions: { ...defaultPermissions(user.role), ...(user.permissions || {}) } };
}

export default function UserManagement({ clinics, users }: { clinics: Clinic[]; users: User[] }) {
  const [editing, setEditing] = useState<User | null>(null);
  const [msg, setMsg] = useState('');

  async function saveEdit() {
    if (!editing) return;
    const r = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        role: editing.role,
        clinic_id: editing.clinic_id || null,
        active: editing.active,
        permissions: editing.permissions || {},
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error || 'Não foi possível atualizar.');
      return;
    }
    setMsg('Permissões atualizadas.');
    setEditing(null);
    window.location.reload();
  }

  function openEditor(user: User) {
    setMsg('');
    setEditing(withDefaults(user));
  }

  function changeRole(role: string) {
    if (!editing) return;
    setEditing({ ...editing, role, permissions: defaultPermissions(role), clinic_id: role === 'clinic' ? editing.clinic_id : null });
  }

  function togglePermission(key: string) {
    if (!editing || editing.role === 'admin') return;
    setEditing({
      ...editing,
      permissions: { ...(editing.permissions || {}), [key]: !(editing.permissions?.[key] ?? false) },
    });
  }

  return (
    <>
      <NewUserForm clinics={clinics} />

      {msg && <div className="notice">{msg}</div>}

      {editing && (
        <div className="modalBackdrop" role="presentation">
          <div className="card permissionModal permissionModalWide" role="dialog" aria-modal="true" aria-labelledby="permission-title">
            <div className="permissionHeader">
              <div>
                <span className="panelKicker">Administrador</span>
                <h2 id="permission-title">Gerenciar acesso</h2>
                <p>{editing.full_name} · defina exatamente o que este usuário pode acessar.</p>
              </div>
              <button className="iconBtn" onClick={() => setEditing(null)} aria-label="Fechar"><X size={17} /></button>
            </div>

            <label>Perfil
              <select value={editing.role} onChange={e => changeRole(e.target.value)}>
                <option value="clinic">Clínica parceira</option>
                <option value="operator">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </label>

            {editing.role === 'clinic' && (
              <label>Clínica
                <select value={editing.clinic_id || ''} onChange={e => setEditing({ ...editing, clinic_id: e.target.value })}>
                  <option value="">Selecione a clínica</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}

            <div className="permissionNotice">
              <ShieldCheck size={16} />
              <span>{editing.role === 'admin'
                ? 'Administradores possuem acesso completo e não têm restrições de permissão.'
                : 'As permissões abaixo são adicionais às regras do perfil. Desmarcar uma opção impede o acesso mesmo que o perfil normalmente permita.'}</span>
            </div>

            {permissionGroups.map(group => (
              <section className="permissionGroup" key={group.title}>
                <h3>{group.title}</h3>
                <div className="permissionGrid">
                  {group.items.map(([key, label]) => {
                    const checked = editing.permissions?.[key] ?? false;
                    const locked = editing.role === 'admin' || (editing.role === 'clinic' && new Set(['clinics', 'users', 'dashboard', 'clinic_manage']).has(key));
                    return (
                      <label className={`permissionCheck ${locked ? 'locked' : ''}`} key={key}>
                        <input type="checkbox" checked={checked} disabled={locked} onChange={() => togglePermission(key)} />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}

            <label className="checkRow">
              <input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
              Usuário ativo
            </label>

            <div className="modalActions">
              <button className="btnSecondary" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn" onClick={saveEdit}>Salvar permissões</button>
            </div>
          </div>
        </div>
      )}

      <div className="tableWrap">
        <table>
          <thead><tr><th>Nome</th><th>Perfil</th><th>Clínica</th><th>Status</th><th>Acesso</th><th>Ação</th></tr></thead>
          <tbody>
            {users.map(u => {
              const p = { ...defaultPermissions(u.role), ...(u.permissions || {}) };
              const count = Object.values(p).filter(Boolean).length;
              return (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.role === 'admin' ? 'Administrador' : u.role === 'operator' ? 'Operador' : 'Clínica parceira'}</td>
                  <td>{clinics.find(c => c.id === u.clinic_id)?.name || 'Plataforma'}</td>
                  <td>{u.active ? 'Ativo' : 'Inativo'}</td>
                  <td><span className="pill">{u.role === 'admin' ? 'Acesso completo' : `${count} permissões`}</span></td>
                  <td><button className="tableAction" onClick={() => openEditor(u)}><Pencil size={14} /> Gerenciar</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function NewUserForm({ clinics }: { clinics: Clinic[] }) {
  const [f, setF] = useState({ full_name: '', email: '', password: '', role: 'clinic', clinic_id: '' });
  const [msg, setMsg] = useState('');

  async function save() {
    setMsg('');
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(f),
    });
    const j = await r.json();
    setMsg(r.ok ? 'Usuário criado com sucesso.' : j.error || 'Erro ao criar usuário.');
    if (r.ok) setF({ full_name: '', email: '', password: '', role: 'clinic', clinic_id: '' });
  }

  return (
    <div className="card form userCreateCard">
      <div className="userCreateTitle"><UserPlus size={19} /><div><h3>Novo usuário</h3><p>Somente administradores podem criar acessos.</p></div></div>
      <div className="userFormGrid">
        <input placeholder="Nome" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} />
        <input placeholder="E-mail" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input placeholder="Senha inicial" type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
          <option value="clinic">Clínica parceira</option><option value="operator">Operador</option><option value="admin">Administrador</option>
        </select>
        {f.role === 'clinic' && <select value={f.clinic_id} onChange={e => setF({ ...f, clinic_id: e.target.value })}>
          <option value="">Clínica</option>{clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>}
        <button className="btn" onClick={save}>Criar usuário</button>
      </div>
      {msg && <div className="notice">{msg}</div>}
    </div>
  );
}
