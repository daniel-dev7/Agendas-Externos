'use client';

import { useEffect, useState } from 'react';
import { ContactRound, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

function onlyDigits(value: string) { return value.replace(/\D/g, ''); }
function formatCpf(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function formatPhone(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export default function Patients() {
  const [profile,setProfile]=useState<any>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [search,setSearch]=useState('');
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const [birthDate,setBirthDate]=useState('');
  const [cpf,setCpf]=useState('');
  const [msg,setMsg]=useState('');
  const [saving,setSaving]=useState(false);

  async function load() {
    const s=createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user)return;
    const {data:p}=await s.from('profiles').select('id,full_name,role,clinic_id,permissions').eq('id',user.id).single();
    setProfile(p);
    const {data}=await s.from('patients').select('id,full_name,phone,birth_date,cpf,created_at').order('full_name');
    setRows(data||[]);
  }
  useEffect(()=>{load()},[]);

  async function addPatient() {
    setMsg('');
    const cleanCpf=onlyDigits(cpf);
    const cleanPhone=onlyDigits(phone);
    if(!name.trim()||!cleanPhone||!birthDate||cleanCpf.length!==11) return setMsg('Preencha nome, telefone, data de nascimento e um CPF válido.');
    setSaving(true);
    const {error}=await createClient().from('patients').insert({
      full_name:name.trim(),phone:cleanPhone,birth_date:birthDate,cpf:cleanCpf
    });
    setSaving(false);
    if(error) return setMsg(error.code==='23505'?'Já existe um paciente cadastrado com este CPF.':error.message);
    setName('');setPhone('');setBirthDate('');setCpf('');setMsg('Paciente cadastrado com sucesso.');await load();
  }

  if(!profile)return <div className="loading">Carregando...</div>;
  const allowed=(key:string)=>profile.role==='admin'||profile.permissions?.[key]!==false;
  const canCreate=(profile.role==='admin'||profile.role==='operator')&&allowed('patient_create');
  const filtered=rows.filter(r=>{
    const q=search.toLowerCase().trim();
    const digits=onlyDigits(q); return !q || r.full_name.toLowerCase().includes(q) || (digits.length>0 && r.cpf.includes(digits));
  });

  return <Shell profile={profile}>
    <div className="pageHeader">
      <div><span className="panelKicker">Cadastro</span><h1>Pacientes</h1><p className="muted">Cadastro centralizado para uso nos agendamentos.</p></div>
    </div>

    {canCreate&&<div className="card patientCreateCard">
      <div className="patientCreateTitle"><div className="patientIcon"><Plus size={17}/></div><div><h3>Novo paciente</h3><p>Somente administradores e operadores podem cadastrar pacientes.</p></div></div>
      <div className="patientFormGrid">
        <label><span>Nome completo</span><input placeholder="Nome completo" value={name} onChange={e=>setName(e.target.value)}/></label>
        <label><span>Telefone</span><input placeholder="(91) 99999-9999" value={formatPhone(phone)} onChange={e=>setPhone(onlyDigits(e.target.value))}/></label>
        <label><span>Data de nascimento</span><input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)}/></label>
        <label><span>CPF</span><input placeholder="000.000.000-00" value={formatCpf(cpf)} onChange={e=>setCpf(onlyDigits(e.target.value))}/></label>
        <button className="btn" onClick={addPatient} disabled={saving}><Plus size={16}/>{saving?'Salvando...':'Cadastrar paciente'}</button>
      </div>
      {msg&&<div className={msg.includes('sucesso')?'notice':'error'}>{msg}</div>}
    </div>}

    <div className="toolbar patientToolbar">
      <div><strong>{filtered.length}</strong> paciente{filtered.length===1?'':'s'}</div>
      <div className="patientSearch"><Search size={16}/><input placeholder="Buscar por nome ou CPF" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    </div>

    <div className="tableWrap"><table><thead><tr><th>Paciente</th><th>Telefone</th><th>Nascimento</th><th>CPF</th></tr></thead><tbody>
      {filtered.map(r=><tr key={r.id}><td><Link href={'/pacientes/'+r.id} className="patientNameLink"><strong>{r.full_name}</strong></Link></td><td>{formatPhone(r.phone)}</td><td>{new Date(r.birth_date+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>{formatCpf(r.cpf)}</td></tr>)}
    </tbody></table>{!filtered.length&&<div className="empty">Nenhum paciente encontrado.</div>}</div>
  </Shell>;
}
