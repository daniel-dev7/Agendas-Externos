'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, UserRound, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

function formatCpf(value:string){const v=(value||'').replace(/\D/g,'').slice(0,11);return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')}
function formatPhone(value:string){const v=(value||'').replace(/\D/g,'').slice(0,11);if(v.length<=10)return v.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2');return v.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2')}
const actionText:Record<string,string>={
 patient_created:'Cadastro do paciente criado',
 patient_updated:'Cadastro do paciente atualizado',
 appointment_created:'Agendamento criado',
 appointment_cancelled:'Agendamento cancelado',
 appointment_rescheduled:'Agendamento remanejado'
};

export default function PatientHistory(){
 const params=useParams(); const id=String(params.id??'');
 const [profile,setProfile]=useState<any>(null),[patient,setPatient]=useState<any>(null),[logs,setLogs]=useState<any[]>([]),[appointments,setAppointments]=useState<any[]>([]),[loading,setLoading]=useState(true);

 async function load(){
  setLoading(true);const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)return;
  const [{data:p},{data:l},{data:a}]=await Promise.all([
   s.from('profiles').select('id,full_name,role,clinic_id').eq('id',user.id).single(),
   s.from('patients').select('id,full_name,phone,birth_date,cpf,created_at,updated_at').eq('id',id).single(),
   s.from('audit_logs').select('id,actor_name,actor_role,action,metadata,created_at,appointment_id').eq('patient_id',id).order('created_at',{ascending:false}),
  ]);
  setProfile(p);setPatient(l);
  const {data:ap}=await s.from('appointments').select('id,agenda_id,patient_name,slot_time,status,created_at,agendas(scheduled_date,clinics(name))').eq('patient_id',id).order('created_at',{ascending:false});
  setLogs(a||[]);setAppointments(ap||[]);setLoading(false);
 }
 useEffect(()=>{load()},[id]);

 const createdLog=useMemo(()=>logs.find(x=>x.action==='patient_created'),[logs]);
 if(loading||!profile||!patient)return <div className="loading">Carregando histórico...</div>;

 return <Shell profile={profile}>
  <div className="detailTop"><Link href="/pacientes" className="backLink"><ArrowLeft size={15}/> Voltar para pacientes</Link><span className="pill">Histórico</span></div>
  <div className="patientHero card">
   <div className="patientHeroIcon"><UserRound size={22}/></div>
   <div className="patientHeroMain"><span className="panelKicker">Cadastro do paciente</span><h1>{patient.full_name}</h1><p>{formatPhone(patient.phone)} · Nascimento {new Date(patient.birth_date+'T12:00:00').toLocaleDateString('pt-BR')} · CPF {formatCpf(patient.cpf)}</p></div>
   <div className="patientCreatedBy"><small>Cadastrado por</small><strong>{createdLog?.actor_name||'—'}</strong><span>{createdLog?.created_at?new Date(createdLog.created_at).toLocaleString('pt-BR'):''}</span></div>
  </div>

  <div className="historyGrid">
   <section className="card historyPanel"><div className="historyHeader"><div><span className="panelKicker">Linha do tempo</span><h2>Histórico de ações</h2></div><ClipboardList size={18}/></div>
    <div className="historyTimeline">
     {!logs.length&&<div className="empty">Nenhum evento registrado.</div>}
     {logs.map(log=><div className="historyEvent" key={log.id}>
       <div className={'historyEventIcon history-'+log.action}><CheckCircle2 size={15}/></div>
       <div className="historyEventBody"><strong>{actionText[log.action]||log.action}</strong><span>{log.actor_name} · {log.actor_role==='operator'?'Operador':log.actor_role==='admin'?'Administrador':log.actor_role==='clinic'?'Clínica parceira':'Sistema'} · {new Date(log.created_at).toLocaleString('pt-BR')}</span>
       {log.action==='appointment_created'&&<small>Horário registrado: {log.metadata?.slot_time?.slice?.(0,5)||'não informado'}</small>}
       {log.action==='appointment_cancelled'&&<small>Agendamento cancelado pelo usuário acima.</small>}
       {log.action==='appointment_rescheduled'&&<small>Horário anterior: {log.metadata?.before?.slot_time?.slice?.(0,5)||'—'} → novo horário: {log.metadata?.after?.slot_time?.slice?.(0,5)||'—'}</small>}
       </div>
     </div>)}
    </div>
   </section>

   <section className="card historyPanel"><div className="historyHeader"><div><span className="panelKicker">Atendimentos</span><h2>Histórico de agendamentos</h2></div><CalendarClock size={18}/></div>
    <div className="patientAppointments">
     {!appointments.length&&<div className="empty">Nenhum agendamento registrado para este paciente.</div>}
     {appointments.map(a=><div className="patientAppointment" key={a.id}>
       <div className="appointmentDateBadge"><strong>{a.agendas?.scheduled_date?new Date(a.agendas.scheduled_date+'T12:00:00').getDate():'—'}</strong><span>{a.agendas?.scheduled_date?new Date(a.agendas.scheduled_date+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'}):''}</span></div>
       <div><strong>{a.agendas?.clinics?.name||'Clínica'}</strong><span>{a.slot_time?.slice(0,5)||'—'} · {a.status==='cancelled'?'Cancelado':a.status==='reserved'?'Reservado':a.status==='confirmed'?'Confirmado':a.status}</span></div>
       {a.status==='cancelled'?<XCircle size={16} color="#b42318"/>:<CheckCircle2 size={16} color="#067647"/>}
     </div>)}
    </div>
   </section>
  </div>
 </Shell>;
}
