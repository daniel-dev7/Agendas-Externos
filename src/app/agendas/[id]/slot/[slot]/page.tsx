'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronDown, Search, UserRound, X, XCircle, CircleCheckBig, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

function searchText(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function normalizeDigits(value: string) { return value.replace(/\D/g, ''); }
function formatCpf(cpf: string) { const digits = normalizeDigits(cpf); return digits.length === 11 ? `${digits.slice(0,3)}.***.***-**` : cpf || ''; }
function formatPhone(phone: string) { const digits = normalizeDigits(phone); if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`; if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`; return phone || ''; }
function timeForSlot(n: number) { const total = 14 * 60 + (n - 1) * 5; return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`; }
const statusLabel: Record<string, string> = { reserved: 'Reservado', confirmed: 'Confirmado', attended: 'Atendido', cancelled: 'Cancelado', no_show: 'Faltou' };

export default function SlotPage() {
  const { id, slot } = useParams();
  const agendaId = String(id ?? '');
  const slotNumber = Number(slot);
  const slotTime = timeForSlot(slotNumber);
  const [profile, setProfile] = useState<any>(null);
  const [agenda, setAgenda] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [cancelledHistory, setCancelledHistory] = useState<any[]>([]);
  const [agendaAppointments, setAgendaAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [msg, setMsg] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const patientInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    const [{ data: p }, { data: a }, { data: rows }, { data: allRows }, { data: pt }] = await Promise.all([
      s.from('profiles').select('*,clinics(id,name),permissions').eq('id', user.id).single(),
      s.from('agendas').select('id,scheduled_date,status,capacity,clinics(id,name)').eq('id', agendaId).single(),
      s.from('appointments').select('id,patient_id,patient_name,slot_time,status,created_at').eq('agenda_id', agendaId).eq('slot_number', slotNumber).order('created_at', { ascending: false }),
      s.from('appointments').select('id,slot_number,slot_time,status').eq('agenda_id', agendaId),
      s.from('patients').select('id,full_name,cpf,phone').order('full_name')
    ]);
    const all = rows || [];
    setProfile(p); setAgenda(a);
    setAppointment(all.find(x => x.status !== 'cancelled') || null);
    setCancelledHistory(all.filter(x => x.status === 'cancelled'));
    setAgendaAppointments(allRows || []);
    setPatients(pt || []);
  }

  useEffect(() => { load(); }, [agendaId, slotNumber]);
  useEffect(() => { if (!appointment && !rescheduling) patientInputRef.current?.focus(); }, [appointment, rescheduling]);
  useEffect(() => { function outside(event: MouseEvent) { if (searchRef.current && !searchRef.current.contains(event.target as Node)) setOpen(false); } document.addEventListener('mousedown', outside); return () => document.removeEventListener('mousedown', outside); }, []);

  const filteredPatients = useMemo(() => {
    const text = searchText(query); const digits = normalizeDigits(query);
    if (!text) return patients.slice(0, 8);
    return patients.filter(p => searchText(p.full_name || '').includes(text) || (digits && normalizeDigits(p.cpf || '').includes(digits)) || (digits && normalizeDigits(p.phone || '').includes(digits))).slice(0, 8);
  }, [patients, query]);

  const occupiedSlots = useMemo(() => new Set(agendaAppointments.filter(x => x.status !== 'cancelled').map(x => Number(x.slot_number))), [agendaAppointments]);
  const availableRescheduleSlots = useMemo(() => Array.from({ length: Number(agenda?.capacity || 0) }, (_, i) => i + 1).filter(n => n !== slotNumber && !occupiedSlots.has(n)), [agenda?.capacity, occupiedSlots, slotNumber]);

  function choosePatient(patient: any) { setPatientId(patient.id); setQuery(patient.full_name); setOpen(false); setMsg(''); }

  async function book() {
    setMsg('');
    if (!patientId) return setMsg('Selecione um paciente cadastrado.');
    if (!slotNumber || slotNumber < 1 || slotNumber > Number(agenda?.capacity || 0)) return setMsg('Slot inválido.');
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return setMsg('Paciente não encontrado.');
    const { error } = await createClient().from('appointments').insert({ agenda_id: agendaId, patient_id: patient.id, patient_name: patient.full_name, slot_number: slotNumber, slot_time: slotTime, status: 'reserved' });
    if (error) setMsg(error.code === '23505' ? 'Este slot acabou de ser ocupado. Atualize a página.' : error.message); else load();
  }

  async function cancel() {
    if (!appointment || !['reserved', 'confirmed'].includes(appointment.status)) return;
    setMsg('');
    const { error } = await createClient().from('appointments').update({ status: 'cancelled' }).eq('id', appointment.id);
    if (error) setMsg(error.message); else load();
  }

  async function setStatus(status: 'attended' | 'no_show') {
    if (!appointment || !['reserved', 'confirmed'].includes(appointment.status)) return;
    setSavingStatus(true); setMsg('');
    const { error } = await createClient().from('appointments').update({ status }).eq('id', appointment.id);
    setSavingStatus(false); if (error) setMsg(error.message); else load();
  }

  async function reschedule(newSlot: number) {
    if (!appointment || profile.role !== 'admin' || savingReschedule) return;
    setSavingReschedule(true); setMsg('');
    const newTime = timeForSlot(newSlot);
    const { error } = await createClient().from('appointments').update({ slot_number: newSlot, slot_time: newTime }).eq('id', appointment.id);
    setSavingReschedule(false);
    if (error) setMsg(error.code === '23505' ? 'Esse slot acabou de ser ocupado. Escolha outro.' : error.message);
    else { setRescheduling(false); load(); }
  }

  if (!profile || !agenda) return <div className="loading">Carregando slot...</div>;
  const allowed = (key: string) => profile.role === 'admin' || profile.permissions?.[key] !== false;
  const canBook = ['admin', 'operator', 'clinic'].includes(profile.role) && allowed('appointment_book');
  const canCancel = ['admin', 'operator', 'clinic'].includes(profile.role) && allowed('appointment_cancel');
  const canSetAttendance = ['admin', 'operator', 'clinic'].includes(profile.role) && allowed('appointment_status');
  const canReschedule = profile.role === 'admin' && allowed('appointment_reschedule');
  const formattedDate = new Date(agenda.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const isOpenAppointment = appointment && ['reserved', 'confirmed'].includes(appointment.status);

  return <Shell profile={profile}>
    <div className="compactSlotHeader"><Link href={'/agendas/dia/' + agenda.scheduled_date} className="backLink"><ArrowLeft size={14}/></Link><div><strong>{agenda.clinics?.name || 'Clínica'}</strong><span>{formattedDate} · Slot {String(slotNumber).padStart(2, '0')} · {slotTime}</span></div></div>

    {appointment && <div className={'slotOccupied card slotStatusCard status-' + appointment.status}>
      <div className="slotState success"><CheckCircle2 size={18}/><span>Agendamento · {statusLabel[appointment.status] || appointment.status}</span></div>
      <h2>{appointment.patient_name}</h2><p className="muted">Horário: {timeForSlot(Number(appointment.slot_number || slotNumber))} · Status: {statusLabel[appointment.status] || appointment.status}</p>
      {canSetAttendance && isOpenAppointment && <div className="appointmentStatusActions"><button className="statusBtn attendedBtn" onClick={() => setStatus('attended')} disabled={savingStatus}><CircleCheckBig size={15}/> Atendido</button><button className="statusBtn noShowBtn" onClick={() => setStatus('no_show')} disabled={savingStatus}><UserRound size={15}/> Faltou</button></div>}
      {canReschedule && isOpenAppointment && !rescheduling && <button className="statusBtn rescheduleBtn" onClick={() => setRescheduling(true)}><CalendarClock size={15}/> Reagendar</button>}
      {canReschedule && rescheduling && isOpenAppointment && <div className="reschedulePanel">
        <div className="rescheduleTitle"><CalendarClock size={15}/> Escolha um novo slot</div>
        <div className="rescheduleSlots">
          {availableRescheduleSlots.length ? availableRescheduleSlots.map(n => <button key={n} type="button" className="rescheduleSlot" onClick={() => reschedule(n)} disabled={savingReschedule}><strong>{String(n).padStart(2,'0')}</strong><span>{timeForSlot(n)}</span></button>) : <span className="muted">Não há slots disponíveis nesta agenda.</span>}
        </div>
        <button type="button" className="rescheduleCancel" onClick={() => setRescheduling(false)}>Cancelar</button>
      </div>}
      {canCancel && isOpenAppointment && <button className="btn slotCancel" onClick={cancel}> <XCircle size={15}/> Cancelar agendamento</button>}
      {msg && <div className="error">{msg}</div>}
    </div>}

    {cancelledHistory.length > 0 && <div className="cancelledSlotHistory card"><div className="slotState cancelledState"><XCircle size={16}/><span>Histórico de cancelamento — não pode ser reativado</span></div>{cancelledHistory.map(item => <div className="cancelledSlotItem" key={item.id}><strong>{item.patient_name}</strong><span>Cancelado · {slotTime}</span></div>)}</div>}

    {!appointment && canBook && <div className="card slotBookingCard">
      <div className="slotBookingLine"><div className="slotState"><UserRound size={16}/><span>{cancelledHistory.length ? 'Slot liberado · ' : 'Disponível · '}{slotTime}</span></div></div>
      <div className="slotBookingGrid"><div className="slotPatientSearch" ref={searchRef}><div className="patientSearchInput"><Search size={16}/><input ref={patientInputRef} value={query} onChange={e => { setQuery(e.target.value); setPatientId(''); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Buscar por nome, telefone ou CPF" autoComplete="off"/>{query && <button type="button" className="patientSearchClear" onClick={() => { setQuery(''); setPatientId(''); setOpen(true); }} aria-label="Limpar busca"><X size={15}/></button>}<ChevronDown size={16} className={open ? 'patientSearchChevron open' : 'patientSearchChevron'}/></div>{open && <div className="patientSearchDropdown">{filteredPatients.length ? filteredPatients.map(p => <button type="button" key={p.id} className="patientSearchOption" onClick={() => choosePatient(p)}><span className="patientSearchOptionIcon"><UserRound size={15}/></span><span className="patientSearchOptionText"><strong>{p.full_name}</strong><small>{p.phone ? formatPhone(p.phone) : 'Telefone não informado'} · CPF {formatCpf(p.cpf)}</small></span></button>) : <div className="patientSearchEmpty">Nenhum paciente encontrado.</div>}</div>}</div><button className="btn" onClick={book}>Agendar neste slot</button></div>
      {msg && <div className="error">{msg}</div>}
    </div>}

    {!appointment && !canBook && <div className="slotOccupied card"><div className="slotState"><UserRound size={18}/><span>Slot disponível</span></div><p className="muted">Você não possui permissão para agendar pacientes.</p></div>}
  </Shell>;
}
