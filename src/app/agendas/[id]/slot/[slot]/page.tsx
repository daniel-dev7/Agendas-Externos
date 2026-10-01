'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, Search, UserRound, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}
function formatCpf(cpf: string) {
  const digits = normalizeDigits(cpf);
  return digits.length === 11 ? `${digits.slice(0,3)}.***.***-**` : cpf || '';
}
function formatPhone(phone: string) {
  const digits = normalizeDigits(phone);
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return phone || '';
}

export default function SlotPage() {
  const { id, slot } = useParams();
  const agendaId = String(id ?? '');
  const slotNumber = Number(slot);
  const slotTime = (() => {
    const totalMinutes = (14 * 60) + ((slotNumber - 1) * 5);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  })();
  const [profile, setProfile] = useState<any>(null);
  const [agenda, setAgenda] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [msg, setMsg] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  async function load() {
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    const [{ data: p }, { data: a }, { data: ap }, { data: pt }] = await Promise.all([
      s.from('profiles').select('*,clinics(id,name)').eq('id', user.id).single(),
      s.from('agendas').select('id,scheduled_date,status,capacity,clinics(id,name)').eq('id', agendaId).single(),
      s.from('appointments').select('id,patient_id,patient_name,slot_time,status').eq('agenda_id', agendaId).eq('slot_number', slotNumber).neq('status', 'cancelled').maybeSingle(),
      s.from('patients').select('id,full_name,cpf,phone').order('full_name')
    ]);
    setProfile(p); setAgenda(a); setAppointment(ap || null); setPatients(pt || []);
  }

  useEffect(() => { load(); }, [agendaId, slotNumber]);
  useEffect(() => {
    function outside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  const filteredPatients = useMemo(() => {
    const text = searchText(query);
    const digits = normalizeDigits(query);
    if (!text) return patients.slice(0, 8);
    return patients.filter(p => {
      const name = searchText(p.full_name || '').includes(text);
      const cpf = digits && normalizeDigits(p.cpf || '').includes(digits);
      const phone = digits && normalizeDigits(p.phone || '').includes(digits);
      return name || cpf || phone;
    }).slice(0, 8);
  }, [patients, query]);

  function choosePatient(patient: any) {
    setPatientId(patient.id); setQuery(patient.full_name); setOpen(false); setMsg('');
  }

  async function book() {
    setMsg('');
    if (!patientId) return setMsg('Selecione um paciente cadastrado.');
    if (!slotNumber || slotNumber < 1 || slotNumber > Number(agenda?.capacity || 0)) return setMsg('Slot inválido.');
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return setMsg('Paciente não encontrado.');
    const { error } = await createClient().from('appointments').insert({
      agenda_id: agendaId,
      patient_id: patient.id,
      patient_name: patient.full_name,
      slot_number: slotNumber,
      slot_time: slotTime,
      status: 'reserved'
    });
    if (error) setMsg(error.code === '23505' ? 'Este slot acabou de ser ocupado. Atualize a página.' : error.message);
    else load();
  }

  async function cancel() {
    if (!appointment) return;
    setMsg('');
    const { error } = await createClient().from('appointments').update({ status: 'cancelled' }).eq('id', appointment.id);
    if (error) setMsg(error.message); else load();
  }

  if (!profile || !agenda) return <div className="loading">Carregando slot...</div>;

  const canBook = ['admin', 'operator', 'clinic'].includes(profile.role);
  const formattedDate = new Date(agenda.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return <Shell profile={profile}>
    <div className="slotPageHeader">
      <Link href={'/agendas/dia/' + agenda.scheduled_date} className="backLink"><ArrowLeft size={15}/> Voltar para o dia</Link>
      <div className="slotHeading">
        <div className="slotIcon"><CalendarDays size={19}/></div>
        <div><span className="panelKicker">Slot {String(slotNumber).padStart(2, '0')}</span><h1>{agenda.clinics?.name || 'Clínica'}</h1><p className="muted">{formattedDate} · {slotTime} · Capacidade {agenda.capacity}</p></div>
      </div>
    </div>

    {appointment ? <div className="slotOccupied card">
      <div className="slotState success"><CheckCircle2 size={18}/><span>Slot ocupado</span></div>
      <h2>{appointment.patient_name}</h2>
      <p className="muted">Horário: {slotTime} · Status: {appointment.status === 'confirmed' ? 'Confirmado' : 'Reservado'}</p>
      {canBook && <button className="btn slotCancel" onClick={cancel}><XCircle size={15}/> Cancelar agendamento</button>}
      {msg && <div className="error">{msg}</div>}
    </div> : canBook ? <div className="card slotBookingCard">
      <div className="slotState"><UserRound size={18}/><span>Slot disponível</span></div>
      <h2>Agendar paciente</h2>
      <p className="muted">Selecione o paciente para ocupar este slot.</p>
      <div className="slotBookingGrid">
        <div className="slotPatientSearch" ref={searchRef}>
          <div className="patientSearchInput">
            <Search size={16}/>
            <input value={query} onChange={e => { setQuery(e.target.value); setPatientId(''); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Buscar por nome, telefone ou CPF" autoComplete="off"/>
            {query && <button type="button" className="patientSearchClear" onClick={() => { setQuery(''); setPatientId(''); setOpen(true); }} aria-label="Limpar busca"><X size={15}/></button>}
            <ChevronDown size={16} className={open ? 'patientSearchChevron open' : 'patientSearchChevron'}/>
          </div>
          {open && <div className="patientSearchDropdown">
            {filteredPatients.length ? filteredPatients.map(p => <button type="button" key={p.id} className="patientSearchOption" onClick={() => choosePatient(p)}>
              <span className="patientSearchOptionIcon"><UserRound size={15}/></span>
              <span className="patientSearchOptionText"><strong>{p.full_name}</strong><small>{p.phone ? formatPhone(p.phone) : 'Telefone não informado'} · CPF {formatCpf(p.cpf)}</small></span>
            </button>) : <div className="patientSearchEmpty">Nenhum paciente encontrado.</div>}
          </div>}
        </div>
        <button className="btn" onClick={book}>Agendar neste slot</button>
      </div>
      {msg && <div className="error">{msg}</div>}
    </div> : <div className="slotOccupied card"><div className="slotState"><UserRound size={18}/><span>Slot disponível</span></div><p className="muted">Você não possui permissão para agendar pacientes.</p></div>}
  </Shell>;
}
