'use client';

import { useState } from 'react';
import { Pencil, UserPlus, X } from 'lucide-react';

type Clinic = { id: string; name: string };
type User = { id: string; full_name: string; role: string; active: boolean; clinic_id?: string | null };

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

  return (
    <>
      <NewUserForm clinics={clinics} />

      {msg && <div className="notice">{msg}</div>}

      {editing && (
        <div className="modalBackdrop" role="presentation">
          <div className="card permissionModal" role="dialog" aria-modal="true" aria-labelledby="permission-title">
            <div className="permissionHeader">
              <div>
                <span className="panelKicker">Administrador</span>
                <h2 id="permission-title">Gerenciar acesso</h2>
                <p>{editing.full_name}</p>
              </div>
              <button className="iconBtn" onClick={() => setEditing(null)} aria-label="Fechar"><X size={17} /></button>
            </div>

            <label>Perfil
              <select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })}>
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
          <thead><tr><th>Nome</th><th>Perfil</th><th>Clínica</th><th>Status</th><th>Ação</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.role === 'admin' ? 'Administrador' : u.role === 'operator' ? 'Operador' : 'Clínica parceira'}</td>
                <td>{clinics.find(c => c.id === u.clinic_id)?.name || 'Plataforma'}</td>
                <td>{u.active ? 'Ativo' : 'Inativo'}</td>
                <td><button className="tableAction" onClick={() => setEditing(u)}><Pencil size={14} /> Gerenciar</button></td>
              </tr>
            ))}
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
