'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

export default function Agendas() {
  const [profile,setProfile]=useState<any>(null),[rows,setRows]=useState<any[]>([]),[clinics,setClinics]=useState<any[]>([]);
  const [date,setDate]=useState(''),[clinic,setClinic]=useState(''),[cap,setCap]=useState(''),[msg,setMsg]=useState('');
  async function load(){const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user)return;
    const{data:p}=await s.from('profiles').select('*,clinics(id,name)').eq('id',user.id).single();setProfile(p);
    let q=s.from('agendas').select('id,scheduled_date,status,capacity,clinics(id,name)').order('scheduled_date',{ascending:true});
    if(p?.role==='clinic')q=q.eq('clinic_id',p.clinic_id);const{data}=await q;setRows(data||[]);
    if(p?.role==='admin'){const{data:c}=await s.from('clinics').select('id,name').eq('active',true).order('name');setClinics(c||[]);}
  }
  useEffect(()=>{load()},[]);
  async function add(){setMsg('');const id=profile?.role==='clinic'?profile.clinic_id:clinic;if(!date||!id)return setMsg('Informe data e clínica.');
    if(!cap||Number(cap)<1)return setMsg('Informe uma capacidade válida.');
    const{error}=await createClient().from('agendas').insert({clinic_id:id,scheduled_date:date,capacity:Number(cap),status:'open'});
    if(error)setMsg(error.message);else{setDate('');setCap('');await load();}
  }
  if(!profile)return <div className="loading">Carregando...</div>;
  const canCreate=profile.role==='admin'||profile.role==='clinic';
  return <Shell profile={profile}><div className="toolbar"><div><h1>Agendas</h1><p className="muted">Controle das agendas e atendimentos.</p></div></div>
    {canCreate&&<div className="card form"><h3>Nova agenda</h3><input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      {profile.role==='admin'&&<select value={clinic} onChange={e=>setClinic(e.target.value)}><option value="">Selecione a clínica</option>{clinics.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      <input type="number" min="1" placeholder="Capacidade" value={cap} onChange={e=>setCap(e.target.value)}/><button className="btn" onClick={add}><Plus size={16}/>Criar</button>{msg&&<div className="error">{msg}</div>}</div>}
    <div className="tableWrap"><table><thead><tr><th>Data</th><th>Clínica</th><th>Capacidade</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.scheduled_date+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>{r.clinics?.name}</td><td>{r.capacity}</td><td><span className="pill">{r.status}</span></td><td><a href={'/agendas/'+r.id}>Abrir</a></td></tr>)}</tbody></table>{!rows.length&&<div className="empty">Nenhuma agenda encontrada.</div>}</div></Shell>;
}