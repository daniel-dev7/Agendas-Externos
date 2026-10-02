'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Filter, RefreshCw, UsersRound, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Props = { profile: any };
const statusLabels: Record<string,string> = { reserved:'Agendado', confirmed:'Confirmado', attended:'Atendido', cancelled:'Cancelado', no_show:'Faltou' };
const statusClasses: Record<string,string> = { reserved:'blue', confirmed:'blue', attended:'green', cancelled:'red', no_show:'purple' };
function isoToday(){ return new Date().toISOString().slice(0,10); }
function isoBefore(days:number){ const d=new Date(); d.setDate(d.getDate()-days); return d.toISOString().slice(0,10); }
function formatDate(value:string){ return new Date(value+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); }

export default function DashboardAnalytics({profile}:Props){
  const isClinic=profile.role==='clinic';
  const [start,setStart]=useState(isoBefore(29)), [end,setEnd]=useState(isoToday()), [clinicId,setClinicId]=useState(''), [status,setStatus]=useState('');
  const [clinics,setClinics]=useState<any[]>([]), [agendas,setAgendas]=useState<any[]>([]), [appointments,setAppointments]=useState<any[]>([]);
  const [loading,setLoading]=useState(true), [error,setError]=useState('');

  async function load(){
    setLoading(true); setError('');
    const s=createClient(); const {data:{user}}=await s.auth.getUser();
    if(!user){setLoading(false);return;}
    const [{data:clinicRows,error:clinicError},{data:agendaRows,error:agendaError}]=await Promise.all([
      s.from('clinics').select('id,name').eq('active',true).order('name'),
      (()=>{let q=s.from('agendas').select('id,scheduled_date,status,capacity,clinic_id,clinics(id,name)').gte('scheduled_date',start).lte('scheduled_date',end).order('scheduled_date',{ascending:true}); if(!isClinic&&clinicId) q=q.eq('clinic_id',clinicId); return q;})()
    ]);
    if(clinicError||agendaError){setError((clinicError||agendaError)?.message||'Não foi possível carregar os dados.');setLoading(false);return;}
    const agendaData=agendaRows||[], ids=agendaData.map(a=>a.id); let appointmentData:any[]=[];
    if(ids.length){let q=s.from('appointments').select('id,agenda_id,status,patient_name,slot_number,created_at').in('agenda_id',ids); if(status) q=q.eq('status',status); const {data,error:e}=await q; if(e){setError(e.message);setLoading(false);return;} appointmentData=data||[];}
    setClinics(clinicRows||[]); setAgendas(agendaData); setAppointments(appointmentData); setLoading(false);
  }
  useEffect(()=>{load();},[start,end,clinicId,status]);

  const stats=useMemo(()=>{const totalCapacity=agendas.reduce((n,a)=>n+Number(a.capacity||0),0);const booked=appointments.filter(a=>a.status==='reserved'||a.status==='confirmed').length;const attended=appointments.filter(a=>a.status==='attended').length;const noShow=appointments.filter(a=>a.status==='no_show').length;const cancelled=appointments.filter(a=>a.status==='cancelled').length;const active=appointments.filter(a=>a.status!=='cancelled').length;return {totalCapacity,booked,attended,noShow,cancelled,active,occupancy:totalCapacity?Math.round(active/totalCapacity*100):0};},[agendas,appointments]);
  const byStatus=useMemo(()=>Object.keys(statusLabels).map(key=>({key,label:statusLabels[key],count:appointments.filter(a=>a.status===key).length,className:statusClasses[key]})),[appointments]);
  const maxStatus=Math.max(1,...byStatus.map(x=>x.count));
  const byClinic=useMemo(()=>{const map=new Map<string,{name:string,total:number,active:number,attended:number,cancelled:number}>(); agendas.forEach(a=>{const id=a.clinic_id,name=a.clinics?.name||'Clínica';if(!map.has(id))map.set(id,{name,total:0,active:0,attended:0,cancelled:0});map.get(id)!.total+=Number(a.capacity||0);});appointments.forEach(a=>{const ag=agendas.find(x=>x.id===a.agenda_id);if(!ag)return;const item=map.get(ag.clinic_id);if(!item)return;if(a.status==='cancelled')item.cancelled++;else item.active++;if(a.status==='attended')item.attended++;});return Array.from(map.values()).sort((a,b)=>b.active-a.active);},[agendas,appointments]);
  const byDay=useMemo(()=>{const map=new Map<string,{capacity:number,active:number}>();agendas.forEach(a=>map.set(a.scheduled_date,{capacity:Number(a.capacity||0),active:0}));appointments.forEach(a=>{if(a.status==='cancelled')return;const ag=agendas.find(x=>x.id===a.agenda_id);if(ag&&map.has(ag.scheduled_date))map.get(ag.scheduled_date)!.active++;});return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).slice(-10);},[agendas,appointments]);
  const clearFilters=()=>{setStart(isoBefore(29));setEnd(isoToday());setClinicId('');setStatus('');};

  return <div className="dashboardAnalytics">
    <section className="dashboardHero analyticsHero"><div><span className="eyebrow"><BarChart3 size={14}/> Dashboard operacional</span><h1>Visão geral dos resultados</h1><p>Acompanhe ocupação, atendimentos, faltas e cancelamentos com filtros por período e clínica.</p></div><button className="refreshDashboard" onClick={load} disabled={loading}><RefreshCw size={15}/> Atualizar</button></section>
    <section className="dashboardFilters card"><div className="filterTitle"><Filter size={16}/><strong>Filtros</strong></div><label>De<input type="date" value={start} max={end} onChange={e=>setStart(e.target.value)}/></label><label>Até<input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label>{!isClinic&&<label>Clínica<select value={clinicId} onChange={e=>setClinicId(e.target.value)}><option value="">Todas as clínicas</option>{clinics.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}<label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><button type="button" className="clearFilters" onClick={clearFilters}>Limpar</button></section>
    {error&&<div className="error dashboardError">{error}</div>}
    <section className="analyticsMetricGrid">
      <div className="analyticsMetric"><span><CalendarDays size={17}/></span><small>Agendas no período</small><strong>{agendas.length}</strong></div>
      <div className="analyticsMetric"><span><UsersRound size={17}/></span><small>Agendamentos ativos</small><strong>{stats.active}</strong><em>{stats.occupancy}% da capacidade</em></div>
      <div className="analyticsMetric"><span><CheckCircle2 size={17}/></span><small>Atendidos</small><strong>{stats.attended}</strong></div>
      <div className="analyticsMetric"><span><Clock3 size={17}/></span><small>Agendados</small><strong>{stats.booked}</strong></div>
      <div className="analyticsMetric"><span><UsersRound size={17}/span><small>Faltas</small><strong>{stats.noShow}</strong></div>
      <div className="analyticsMetric"><span><XCircle size={17}/></span><small>Cancelamentos</small><strong>{stats.cancelled}</strong></div>
    </section>
    <div className="analyticsColumns">
      <section className="dashboardPanel"><div className="panelHeader"><div><span className="panelKicker">Distribuição</span><h2>Status dos agendamentos</h2></div><span className="panelCount">{appointments.length} registros</span></div><div className="statusBars">{byStatus.map(item=><div className="statusBarRow" key={item.key}><div className="statusBarLabel"><span className={'statusLegend '+item.className}/><strong>{item.label}</strong><span>{item.count}</span></div><div className="statusBarTrack"><div className={'statusBarFill '+item.className} style={{width:(item.count/maxStatus*100)+'%'}}/></div></div>)}</div></section>
      <section className="dashboardPanel"><div className="panelHeader"><div><span className="panelKicker">Por clínica</span><h2>Desempenho</h2></div></div><div className="clinicStats">{byClinic.length?byClinic.map(c=><div className="clinicStat" key={c.name}><div><strong>{c.name}</strong><span>{c.active} ativos · {c.attended} atendidos · {c.cancelled} cancelados</span></div><b>{c.total?Math.round(c.active/c.total*100):0}%</b></div>):<div className="emptyDashboard">Nenhum dado no período.</div>}</div></section>
    </div>
    <section className="dashboardPanel"><div className="panelHeader"><div><span className="panelKicker">Evolução</span><h2>Ocupação por dia</h2></div><span className="panelCount">{formatDate(start)} → {formatDate(end)}</span></div><div className="dailyBars">{byDay.length?byDay.map(([day,v])=>{const pct=v.capacity?Math.min(100,Math.round(v.active/v.capacity*100)):0;return <div className="dailyBar" key={day}><div className="dailyBarValue">{v.active}</div><div className="dailyBarTrack"><span style={{height:Math.max(5,pct)+'%'}}/></div><small>{formatDate(day)}</small></div>}):<div className="emptyDashboard">Nenhuma agenda no período.</div>}</div></section>
    {loading&&<div className="dashboardLoading">Atualizando indicadores...</div>}
  </div>;
}
