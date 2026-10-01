'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarPlus, XCircle, UserRound } from 'lucide-react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

export default function Detail() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [profile,setProfile]=useState<any>(),[agenda,setAgenda]=useState<any>(),[rows,setRows]=useState<any[]>([]),[patients,setPatients]=useState<any[]>([]);
  const [patientId,setPatientId]=useState(''),[time,setTime]=useState('07:00'),[msg,setMsg]=useState('');

  async function load(){
    const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user)return;
    const{data:p}=await s.from('profiles').select('*,clinics(id,name)').eq('id',user.id).single();setProfile(p);
    const[{data:a},{data:r},{data:pt}]=await Promise.all([
      s.from('agendas').select('id,scheduled_date,status,capacity,clinics(name)').eq('id',id).single(),
      s.from('appointments').select('id,patient_name,patient_id,slot_time,status').eq('agenda_id',id).order('slot_time'),
      s.from('patients').select('id,full_name,cpf').order('full_name')
    ]);
    setAgenda(a);setRows(r||[]);setPatients(pt||[]);
  }
  useEffect(()=>{load()},[id]);

  async function add(){
    setMsg('');
    if(!patientId)return setMsg('Selecione um paciente cadastrado.');
    const patient=patients.find(p=>p.id===patientId);
    if(!patient)return setMsg('Paciente não encontrado.');
    const{error}=await createClient().from('appointments').insert({agenda_id:id,patient_id:patient.id,patient_name:patient.full_name,slot_time:time,status:'reserved'});
    if(error)setMsg(error.message);else{setPatientId('');load();}
  }

  async function cancelAppointment(appointmentId:string){
    setMsg('');
    const{error}=await createClient().from('appointments').update({status:'cancelled'}).eq('id',appointmentId);
    if(error)setMsg(error.message);else load();
  }

  if(!profile||!agenda)return <div className="loading">Carregando...</div>;
  const canBook=['admin','operator','clinic'].includes(profile.role);
  const canCancelAppointments=['admin','operator','clinic'].includes(profile.role);
  const canManageAgenda=profile.role==='admin'||profile.role==='clinic';

  return <Shell profile={profile}>
    <div className="detailTop">
      <Link href="/agendas" className="backLink"><ArrowLeft size={15}/> Voltar</Link>
      <span className="pill">{agenda.status}</span>
    </div>
    <div className="pageHeader">
      <span className="panelKicker">Agenda de Ressonância</span>
      <h1>{new Date(agenda.scheduled_date+'T12:00:00').toLocaleDateString('pt-BR')}</h1>
      <p className="muted">{agenda.clinics?.name} · Capacidade {agenda.capacity}</p>
    </div>

    {canBook&&<div className="card form appointmentForm">
      <h3><CalendarPlus size={18}/> Novo agendamento</h3>
      <div className="appointmentFields">
        <div className="patientSelectWrap"><UserRound size={16}/><select value={patientId} onChange={e=>setPatientId(e.target.value)}><option value="">Selecione o paciente</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.cpf.slice(0,3)}.***.***-**</option>)}</select></div>
        <input type="time" value={time} onChange={e=>setTime(e.target.value)}/>
        <button className="btn" onClick={add}>Agendar</button>
      </div>
      {msg&&<div className="error">{msg}</div>}
    </div>}

    <div className="tableWrap">
      <table><thead><tr><th>Horário</th><th>Paciente</th><th>Status</th><th>Ação</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}>
        <td>{r.slot_time?.slice(0,5)||'—'}</td><td>{r.patient_name}</td>
        <td><span className={'statusDot status-'+r.status}>{r.status==='reserved'?'Reservado':r.status==='confirmed'?'Confirmado':r.status==='cancelled'?'Cancelado':r.status}</span></td>
        <td>{canCancelAppointments&&r.status!=='cancelled'&&<button className="tableAction dangerAction" onClick={()=>cancelAppointment(r.id)}><XCircle size={14}/> Cancelar</button>}</td>
      </tr>)}</tbody></table>
      {!rows.length&&<div className="empty">Nenhum agendamento nesta agenda.</div>}
    </div>
    {canManageAgenda&&<p className="muted agendaPermissionNote">Você pode gerenciar esta agenda pela tela de Agendas.</p>}
  </Shell>;
}