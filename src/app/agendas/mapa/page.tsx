'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, MapPinned } from 'lucide-react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

function dateValue(d: Date) { return d.toISOString().slice(0,10); }
function addDays(value:string, amount:number) { const d=new Date(value+'T12:00:00'); d.setDate(d.getDate()+amount); return dateValue(d); }
function slotTime(slotNumber:number) {
  const totalMinutes=14*60+(slotNumber-1)*5;
  return `${String(Math.floor(totalMinutes/60)).padStart(2,'0')}:${String(totalMinutes%60).padStart(2,'0')}`;
}

export default function AvailabilityMap() {
  const [profile,setProfile]=useState<any>(null);
  const [startDate,setStartDate]=useState(dateValue(new Date()));
  const [days,setDays]=useState(7);
  const [agendas,setAgendas]=useState<any[]>([]);
  const [appointments,setAppointments]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  async function load() {
    setLoading(true);
    const s=createClient();
    const {data:{user}}=await s.auth.getUser(); if(!user)return;
    const {data:p}=await s.from('profiles').select('id,full_name,role,clinic_id').eq('id',user.id).single(); setProfile(p);
    const endDate=addDays(startDate,days-1);
    let q=s.from('agendas').select('id,scheduled_date,status,capacity,clinics(id,name)').gte('scheduled_date',startDate).lte('scheduled_date',endDate).order('scheduled_date').order('created_at');
    if(p?.role==='clinic')q=q.eq('clinic_id',p.clinic_id);
    const {data:a}=await q; const agendaRows=a||[]; setAgendas(agendaRows);
    const ids=agendaRows.map(x=>x.id);
    if(!ids.length){setAppointments([]);setLoading(false);return;}
    const {data:ap}=await s.from('appointments').select('id,agenda_id,patient_name,slot_number,slot_time,status').in('agenda_id',ids).neq('status','cancelled');
    setAppointments(ap||[]); setLoading(false);
  }
  useEffect(()=>{load()},[startDate,days]);

  const countByAgenda=useMemo(()=>appointments.reduce<Record<string,number>>((acc,a)=>{acc[a.agenda_id]=(acc[a.agenda_id]||0)+1;return acc},{}),[appointments]);
  const byDate=useMemo(()=>agendas.reduce<Record<string,any[]>>((acc,a)=>{(acc[a.scheduled_date] ||= []).push(a);return acc},{}),[agendas]);
  const dates=Array.from({length:days},(_,i)=>addDays(startDate,i));

  if(loading||!profile)return <div className="loading">Carregando mapa de disponibilidade...</div>;

  return <Shell profile={profile}>
    <div className="dayViewHeader">
      <div><span className="panelKicker">Planejamento</span><div className="dayTitleRow"><div className="dayIcon"><MapPinned size={19}/></div><div><h1>Mapa de disponibilidade</h1><p className="muted">Visualize agendas futuras, ocupação e vagas antes de escolher onde agendar.</p></div></div></div>
      <div className="dayNav"><button className="dayNavBtn" onClick={()=>setStartDate(addDays(startDate,-days))}><ChevronLeft size={18}/></button><button className="dayNavBtn" onClick={()=>setStartDate(addDays(startDate,days))}><ChevronRight size={18}/></button></div>
    </div>

    <div className="availabilityFilters card">
      <label><span>Início</span><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
      <label><span>Período</span><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value="7">7 dias</option><option value="14">14 dias</option><option value="30">30 dias</option></select></label>
      <Link href={'/agendas/dia/'+startDate} className="btn"><CalendarRange size={16}/> Ver primeiro dia</Link>
    </div>

    <div className="availabilityBoard">
      {dates.map(date=>{
        const rows=byDate[date]||[];
        const dayLabel=new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'});
        return <section className="availabilityDay" key={date}>
          <header><div><strong>{dayLabel}</strong><small>{rows.length} {rows.length===1?'agenda':'agendas'}</small></div><Link href={'/agendas/dia/'+date}>Ver dia</Link></header>
          <div className="availabilityCards">
            {!rows.length&&<div className="availabilityEmpty">Sem agenda aberta</div>}
            {rows.map(a=>{
              const used=countByAgenda[a.id]||0;
              const free=Math.max(0,a.capacity-used);
              const percent=Math.min(100,Math.round(used/a.capacity*100));
              <div className="availabilityCard" key={a.id}>
                <div className="availabilityCardTop"><span className={'availabilityStatus availability-'+a.status}>{a.status==='open'?'Aberta':a.status==='closed'?'Fechada':'Cancelada'}</span><strong>{used}/{a.capacity} ocupados</strong></div>
                <h3>{a.clinics?.name||'Clínica'}</h3>
                <div className="availabilityNumbers"><span>{free} vagas</span><span>{a.capacity} slots</span></div>
                <div className="capacityTrack"><span style={{width:percent+'%'}}/></div>
                <div className="availabilitySlots">
                  {Array.from({length:a.capacity},(_,index)=>{
                    const slotNumber=index+1;
                    const item=appointments.find(x=>x.agenda_id===a.id && Number(x.slot_number)===slotNumber);
                    return <Link href={'/agendas/'+a.id+'/slot/'+slotNumber} className={'availabilitySlot '+(item?'occupied':'available')} key={slotNumber}>
                      <span className="availabilitySlotTime">{slotTime(slotNumber)}</span>
                      <span className="availabilitySlotPatient">{item?.patient_name||'Disponível'}</span>
                    </Link>;
                  })}
                </div>
              </div>
            })}
          </div>
        </section>
      })}
    </div>
  </Shell>;
}
