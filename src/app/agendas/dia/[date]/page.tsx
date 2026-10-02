'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { createClient } from '@/lib/supabase-browser';

const statusLabel: Record<string, string> = {
  reserved: 'Reservado', confirmed: 'Confirmado', attended: 'Atendido', cancelled: 'Cancelado', no_show: 'Não compareceu',
};

function slotTime(slotNumber: number) {
  const totalMinutes = (14 * 60) + ((slotNumber - 1) * 5);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function shiftDate(value: string, amount: number) {
  const d = new Date(value + 'T12:00:00');
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

export default function DayAgendas() {
  const params = useParams();
  const date = String(params.date ?? '');
  const [profile, setProfile] = useState<any>(null);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    const { data: p } = await s.from('profiles').select('*,clinics(id,name)').eq('id', user.id).single();
    setProfile(p);
    let q = s.from('agendas').select('id,scheduled_date,status,capacity,clinics(id,name),created_at').eq('scheduled_date', date).eq('status', 'open').order('created_at', { ascending: true });
    if (p?.role === 'clinic') q = q.eq('clinic_id', p.clinic_id);
    const { data: agendaRows } = await q;
    const ids = (agendaRows || []).map(a => a.id);
    setAgendas(agendaRows || []);
    if (!ids.length) { setAppointments([]); setLoading(false); return; }
    const { data: appointmentRows } = await s.from('appointments').select('id,agenda_id,patient_name,slot_number,slot_time,status').in('agenda_id', ids).neq('status', 'cancelled').order('slot_time', { ascending: true });
    setAppointments(appointmentRows || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  const appointmentsByAgenda = useMemo(() => appointments.reduce<Record<string, any[]>>((acc, item) => {
    (acc[item.agenda_id] ||= []).push(item);
    return acc;
  }, {}), [appointments]);

  if (loading || !profile) return <div className="loading">Carregando agendas do dia...</div>;

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const previousDate = shiftDate(date, -1);
  const nextDate = shiftDate(date, 1);

  return (
    <Shell profile={profile}>
      <div className="dayViewHeader">
        <div>
          <Link href="/agendas" className="backLink">← Voltar para agendas</Link>
          <div className="dayTitleRow">
            <div className="dayIcon"><CalendarDays size={19} /></div>
            <div><span className="panelKicker">Agendas abertas</span><h1>{formattedDate}</h1><p className="muted">Visualização operacional das agendas disponíveis neste dia.</p></div>
          </div>
        </div>
        <div className="dayNav">
          <Link href={'/agendas/dia/' + previousDate} className="dayNavBtn" aria-label="Dia anterior"><ChevronLeft size={18} /></Link>
          <Link href={'/agendas/dia/' + nextDate} className="dayNavBtn" aria-label="Próximo dia"><ChevronRight size={18} /></Link>
        </div>
      </div>

      {!agendas.length ? (
        <div className="dayEmpty card"><CalendarDays size={26} /><strong>Nenhuma agenda aberta neste dia</strong><span>Crie ou abra uma agenda para que ela apareça nesta visão.</span></div>
      ) : (
        <div className="dayBoardShell">
          <div className="dayBoardMeta"><strong>{agendas.length} {agendas.length === 1 ? 'agenda aberta' : 'agendas abertas'}</strong><span>{appointments.length} {appointments.length === 1 ? 'agendamento' : 'agendamentos'}</span></div>
          <div className="dayBoard">
            {agendas.map((agenda) => {
              const items = appointmentsByAgenda[agenda.id] || [];
              const used = items.length;
              const percent = Math.min(100, Math.round((used / agenda.capacity) * 100));
              return (
                <section className="agendaColumn" key={agenda.id}>
                  <header className="agendaColumnHeader">
                    <div className="agendaColumnTopline"><span className="agendaOpenDot" /><span>ABERTA</span></div>
                    <h2>{agenda.clinics?.name || 'Clínica'}</h2>
                    <div className="agendaColumnInfo"><span>{used}/{agenda.capacity} ocupados</span><span>{percent}%</span></div>
                    <div className="capacityTrack"><span style={{ width: percent + '%' }} /></div>
                  </header>
                  <div className="agendaSlots">
                    {Array.from({ length: agenda.capacity }, (_, index) => {
                      const slotNumber = index + 1;
                      const item = items.find(x => Number(x.slot_number) === slotNumber);
                      const time = slotTime(slotNumber);
                      return (
                        <Link
                          href={'/agendas/' + agenda.id + '/slot/' + slotNumber}
                          className={'agendaSlotCard ' + (item ? 'occupied' : 'available')}
                          key={slotNumber}
                          aria-label={item ? `${time} — ${item.patient_name}` : `${time} — slot vazio, agendar paciente`}
                        >
                          <span className="agendaSlotCardTime">{time}</span>
                          <span className="agendaSlotCardBody">
                            <span className="agendaSlotCardPatient">{item?.patient_name || 'Sem paciente'}</span>
                            <span className="agendaSlotCardStatus">{item ? (statusLabel[item.status] || item.status) : 'Clique para agendar'}</span>
                          </span>
                          <span className="agendaSlotCardIcon">{item ? <CircleCheck size={13}/> : <UserRound size={13}/>}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}
