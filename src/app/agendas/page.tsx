'use client';

import { useEffect, useState } from 'react';
import { Plus, CalendarDays, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

export default function Agendas() {
  const [profile,setProfile]=useState<any>(null),[rows,setRows]=useState<any[]>([]),[clinics,setClinics]=useState<any[]>([]);
  const [date,setDate]=useState(''),[clinic,setClinic]=useState(''),[cap,setCap]=useState(''),[msg,setMsg]=useState('');
  async function load(){const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user)return;
    const{data:p}=await s.from('profiles').select('*,clinics(id,name),permissions').eq('id',user.id).single();setProfile(p);
    let q=s.from('agendas').select('id,scheduled_date,status,capacity,clinics(id,name),appointments(id,status)').order('scheduled_date',{ascending:true});
    if(p?.role==='clinic')q=q.eq('clinic_id',p.clinic_id);const{data}=await q;setRows(data||[]);
    if(p?.role==='admin'){const{data:c}=await s.from('clinics').select('id,name').eq('active',true).order('name');setClinics(c||[]);}
  }
  useEffect(()=>{load()},[]);
  async function removeAgenda(id:string, date:string, clinicName:string, appointmentCount:number){
    const confirmed = window.confirm(
      appointmentCount > 0
        ? `Esta agenda de ${clinicName} em ${new Date(date+'T12:00:00').toLocaleDateString('pt-BR')} possui ${appointmentCount} agendamento(s). Ao excluir, os agendamentos dessa agenda também serão excluídos. Deseja continuar?`
        : `Excluir a agenda de ${clinicName} em ${new Date(date+'T12:00:00').toLocaleDateString('pt-BR')}?`
    );
    if(!confirmed)return;
    setMsg('');
    const { error } = await createClient().from('agendas').delete().eq('id',id);
    if(error)setMsg(error.message);else await load();
  }
  async function add(){setMsg('');const id=profile?.role==='clinic'?profile.clinic_id:clinic;if(!date||!id)return setMsg('Informe data e clínica.');
    if(!cap||Number(cap)<1)return setMsg('Informe uma capacidade válida.');
    const{error}=await createClient().from('agendas').insert({clinic_id:id,scheduled_date:date,capacity:Number(cap),status:'open'});
    if(error)setMsg(error.message);else{setDate('');setCap('');await load();}
  }
  if(!profile)return <div className="loading">Carregando...</div>;
  const allowed=(key:string)=>profile.role==='admin'||profile.permissions?.[key]!==false;
  const canCreate=(profile.role==='admin'||profile.role==='clinic')&&allowed('agenda_create');
  const canDelete=profile.role==='admin'&&allowed('agenda_delete');
  return <Shell profile={profile}><div className="toolbar"><div><h1>Agendas</h1><p className="muted">Controle das agendas e atendimentos.</p></div></div>
    {canCreate&&<div className="card form"><h3>Nova agenda</h3><input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      {profile.role==='admin'&&<select value={clinic} onChange={e=>setClinic(e.target.value)}><option value="">Selecione a clínica</option>{clinics.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      <input type="number" min="1" placeholder="Capacidade" value={cap} onChange={e=>setCap(e.target.value)}/><button className="btn" onClick={add}><Plus size={16}/>Criar</button>{msg&&<div className="error">{msg}</div>}</div>}
    <div className="tableWrap"><table><thead><tr><th>Data</th><th>Clínica</th><th>Capacidade</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><Link href={'/agendas/dia/'+r.scheduled_date} className="dayTableLink"><CalendarDays size={14}/>{new Date(r.scheduled_date+'T12:00:00').toLocaleDateString('pt-BR')}</Link></td><td>{r.clinics?.name}</td><td>{r.capacity}</td><td><span className="pill">{r.status}</span></td><td><div className="tableActions"><Link href={'/agendas/dia/'+r.scheduled_date} className="tableAction">Ver dia</Link>{canDelete&&<button type="button" className="tableAction dangerAction" onClick={()=>removeAgenda(r.id,r.scheduled_date,r.clinics?.name||'Clínica',(r.appointments||[]).filter((a:any)=>a.status!=='cancelled').length)}><Trash2 size={14}/>Excluir</button>}</div></td></tr>)}</tbody></table>{!rows.length&&<div className="empty">Nenhuma agenda encontrada.</div>}</div></Shell>;
}