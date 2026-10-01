'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarPlus, ChevronDown, Search, UserRound, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\D/g, '');
}

function searchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatCpf(cpf: string) {
  const digits = cpf?.replace(/\D/g, '') ?? '';
  if (digits.length !== 11) return cpf || '';
  return digits.slice(0, 3) + '.***.***-**';
}

function formatPhone(phone: string) {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone || '';
}

export default function Detail() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [profile,setProfile]=useState<any>(),[agenda,setAgenda]=useState<any>(),[rows,setRows]=useState<any[]>([]),[patients,setPatients]=useState<any[]>([]);
  const [patientId,setPatientId]=useState(''),[patientQuery,setPatientQuery]=useState(''),[patientOpen,setPatientOpen]=useState(false),[time,setTime]=useState('07:00'),[msg,setMsg]=useState('');
  const patientSearchRef = useRef<HTMLDivElement>(null);

  async function load(){
    const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user)return;
    const{data:p}=await s.from('profiles').select('*,clinics(id,name)').eq('id',user.id).single();setProfile(p);
    const[{data:a},{data:r},{data:pt}]=await Promise.all([
      s.from('agendas').select('id,scheduled_date,status,capacity,clinics(name)').eq('id',id).single(),
      s.from('appointments').select('id,patient_name,patient_id,slot_time,status').eq('agenda_id',id).order('slot_time'),
      s.from('patients').select('id,full_name,cpf,phone').order('full_name')
    ]);
    setAgenda(a);setRows(r||[]);setPatients(pt||[]);
  }
  useEffect(()=>{load()},[id]);

  useEffect(()=>{
    function handleOutside(event: MouseEvent){
      if(patientSearchRef.current&&!patientSearchRef.current.contains(event.target as Node))setPatientOpen(false);
    }
    document.addEventListener('mousedown',handleOutside);
    return()=>document.removeEventListener('mousedown',handleOutside);
  },[]);

  const filteredPatients=useMemo(()=>{
    const query=searchText(patientQuery);
    if(!query)return patients.slice(0,8);
    const numericQuery=normalizeSearch(patientQuery);
    return patients.filter(patient=>{
      const nameMatch=searchText(patient.full_name||'').includes(query);
      const cpfMatch=numericQuery.length>0&&normalizeSearch(patient.cpf||'').includes(numericQuery);
      const phoneMatch=numericQuery.length>0&&normalizeSearch(patient.phone||'').includes(numericQuery);
      return nameMatch||cpfMatch||phoneMatch;
    }).slice(0,8);
  },[patientQuery,patients]);

  const selectedPatient=patients.find(patient=>patient.id===patientId);

  function selectPatient(patient:any){
    setPatientId(patient.id);
    setPatientQuery(patient.full_name);
    setPatientOpen(false);
    setMsg('');
  }

  function clearPatient(){
    setPatientId('');
    setPatientQuery('');
    setPatientOpen(true);
  }

  async function add(){
    setMsg('');
    if(!patientId)return setMsg('Selecione um paciente cadastrado.');
    const patient=patients.find(p=>p.id===patientId);
    if(!patient)return setMsg('Paciente não encontrado.');
    const{error}=await createClient().from('appointments').insert({agenda_id:id,patient_id:patient.id,patient_name:patient.full_name,slot_time:time,status:'reserved'});
    if(error)setMsg(error.message);else{setPatientId('');setPatientQuery('');setPatientOpen(false);load();}
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
        <div className="patientSearchField" ref={patientSearchRef}>
          <div className={'patientSearchInput'+(patientOpen?' isOpen':'')}>
            <UserRound size={16}/>
            <input
              type="text"
              value={patientQuery}
              onChange={e=>{setPatientQuery(e.target.value);setPatientId('');setPatientOpen(true);setMsg('');}}
              onFocus={()=>setPatientOpen(true)}
              placeholder="Buscar por nome, telefone ou CPF"
              role="combobox"
              aria-expanded={patientOpen}
              aria-controls="patient-search-results"
              aria-autocomplete="list"
              autoComplete="off"
            />
            {patientQuery&&<button type="button" className="patientSearchClear" onClick={clearPatient} aria-label="Limpar paciente"><X size={15}/></button>}
            <ChevronDown size={16} className={'patientSearchChevron'+(patientOpen?' open':'')}/>
          </div>
          {patientOpen&&<div className="patientSearchDropdown" id="patient-search-results" role="listbox">
            {filteredPatients.length>0?filteredPatients.map(patient=><button
              type="button"
              key={patient.id}
              className={'patientSearchOption'+(patient.id===patientId?' selected':'')}
              onClick={()=>selectPatient(patient)}
              role="option"
              aria-selected={patient.id===patientId}
            >
              <span className="patientSearchOptionIcon"><UserRound size={15}/></span>
              <span className="patientSearchOptionText">
                <strong>{patient.full_name}</strong>
                <small>{patient.phone?formatPhone(patient.phone):'Telefone não informado'} · CPF {formatCpf(patient.cpf)}</small>
              </span>
            </button>):<div className="patientSearchEmpty">
              {patientQuery?'Nenhum paciente encontrado.':'Digite o nome, telefone ou CPF para buscar.'}
            </div>}
          </div>}
        </div>
        <input type="time" value={time} onChange={e=>setTime(e.target.value)}/>
        <button className="btn" onClick={add}>Agendar</button>
      </div>
      {selectedPatient&&!patientOpen&&<div className="patientSelectedHint">Paciente selecionado: <strong>{selectedPatient.full_name}</strong></div>}
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

