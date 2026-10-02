'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Props = { profile: any };
const statusLabels: Record<string, string> = {
  reserved: 'Agendado',
  confirmed: 'Confirmado',
  attended: 'Atendido',
  cancelled: 'Cancelado',
  no_show: 'Faltou',
};
const statusColors: Record<string, string> = {
  reserved: '#3b82f6',
  confirmed: '#8b5cf6',
  attended: '#22c55e',
  cancelled: '#ec4899',
  no_show: '#f59e0b',
};

function isoToday() { return new Date().toISOString().slice(0, 10); }
function isoBefore(days: number) { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); }
function formatDate(value: string) { return new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }

export default function DashboardAnalytics({ profile }: Props) {
  const isClinic = profile.role === 'clinic';
  const [start, setStart] = useState(isoBefore(29));
  const [end, setEnd] = useState(isoToday());
  const [clinicId, setClinicId] = useState('');
  const [status, setStatus] = useState('');
  const [clinics, setClinics] = useState<any[]>([]);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: clinicRows, error: clinicError }, { data: agendaRows, error: agendaError }] = await Promise.all([
      s.from('clinics').select('id,name').eq('active', true).order('name'),
      (() => {
        let q = s.from('agendas').select('id,scheduled_date,status,capacity,clinic_id,clinics(id,name)').gte('scheduled_date', start).lte('scheduled_date', end).order('scheduled_date');
        if (isClinic) q = q.eq('clinic_id', profile.clinic_id);
        else if (clinicId) q = q.eq('clinic_id', clinicId);
        return q;
      })(),
    ]);

    if (clinicError || agendaError) {
      setError((clinicError || agendaError)?.message || 'Não foi possível carregar os dados.');
      setLoading(false);
      return;
    }

    const agendaData = agendaRows || [];
    const ids = agendaData.map(a => a.id);
    let appointmentData: any[] = [];

    if (ids.length) {
      let q = s.from('appointments').select('id,agenda_id,status,patient_name,slot_number,created_at').in('agenda_id', ids);
      if (status) q = q.eq('status', status);
      const { data, error: e } = await q;
      if (e) { setError(e.message); setLoading(false); return; }
      appointmentData = data || [];
    }

    setClinics(clinicRows || []);
    setAgendas(agendaData);
    setAppointments(appointmentData);
    setLoading(false);
  }

  useEffect(() => { load(); }, [start, end, clinicId, status]);

  const stats = useMemo(() => {
    const capacity = agendas.reduce((n, a) => n + Number(a.capacity || 0), 0);
    const active = appointments.filter(a => a.status !== 'cancelled').length;
    const attended = appointments.filter(a => a.status === 'attended').length;
    const booked = appointments.filter(a => a.status === 'reserved' || a.status === 'confirmed').length;
    const noShow = appointments.filter(a => a.status === 'no_show').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    return {
      capacity,
      active,
      attended,
      booked,
      noShow,
      cancelled,
      occupancy: capacity ? Math.round(active / capacity * 100) : 0,
      attendanceRate: active ? Math.round(attended / active * 100) : 0,
    };
  }, [agendas, appointments]);

  const byStatus = useMemo(() => Object.keys(statusLabels).map(key => ({
    key,
    label: statusLabels[key],
    count: appointments.filter(a => a.status === key).length,
    color: statusColors[key],
  })), [appointments]);

  const statusTotal = appointments.length || 1;

  const statusDonut = useMemo(() => {
    let cursor = 0;
    const stops = byStatus.map(item => {
      const startPct = cursor / statusTotal * 100;
      cursor += item.count;
      return `${item.color} ${startPct}% ${cursor / statusTotal * 100}%`;
    });
    return stops.length ? `conic-gradient(${stops.join(', ')})` : '#26364a';
  }, [byStatus, statusTotal]);

  const byClinic = useMemo(() => {
    const map = new Map<string, { name: string; total: number; active: number; attended: number; cancelled: number }>();
    agendas.forEach(a => {
      const id = a.clinic_id;
      const name = a.clinics?.name || 'Clínica';
      if (!map.has(id)) map.set(id, { name, total: 0, active: 0, attended: 0, cancelled: 0 });
      map.get(id)!.total += Number(a.capacity || 0);
    });
    appointments.forEach(a => {
      const ag = agendas.find(x => x.id === a.agenda_id);
      if (!ag) return;
      const item = map.get(ag.clinic_id);
      if (!item) return;
      if (a.status === 'cancelled') item.cancelled++;
      else item.active++;
      if (a.status === 'attended') item.attended++;
    });
    return Array.from(map.values()).sort((a, b) => b.active - a.active);
  }, [agendas, appointments]);

  const clinicTotal = byClinic.reduce((sum, c) => sum + c.active, 0) || 1;
  const clinicColors = ['#4f7ff7', '#fbb52b', '#22c98a', '#9b87f5', '#36b7e8', '#ef4fbb', '#ff8248', '#5ac3a0'];

  const byDay = useMemo(() => {
    const map = new Map<string, { capacity: number; active: number; attended: number }>();
    agendas.forEach(a => map.set(a.scheduled_date, { capacity: Number(a.capacity || 0), active: 0, attended: 0 }));
    appointments.forEach(a => {
      if (a.status === 'cancelled') return;
      const ag = agendas.find(x => x.id === a.agenda_id);
      if (!ag || !map.has(ag.scheduled_date)) return;
      map.get(ag.scheduled_date)!.active++;
      if (a.status === 'attended') map.get(ag.scheduled_date)!.attended++;
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  }, [agendas, appointments]);

  const maxDay = Math.max(1, ...byDay.map(([, v]) => v.active));
  const clearFilters = () => { setStart(isoBefore(29)); setEnd(isoToday()); setClinicId(''); setStatus(''); };

  return (
    <div className="dashboardAnalytics dashboardAnalyticsDark">
      <section className="analyticsTop">
        <div>
          <span className="analyticsEyebrow"><BarChart3 size={14} /> DASHBOARD</span>
          <h1>Indicadores operacionais</h1>
          <p>Uma visão consolidada da operação, ocupação e desempenho dos agendamentos.</p>
        </div>
        <button className="refreshDashboard darkRefresh" onClick={load} disabled={loading}><RefreshCw size={15} /> {loading ? 'Atualizando...' : 'Atualizar'}</button>
      </section>

      <section className="dashboardFilters dashboardFiltersDark">
        <div className="filterTitle"><Filter size={15} /><strong>Filtros</strong></div>
        <label>De<input type="date" value={start} max={end} onChange={e => setStart(e.target.value)} /></label>
        <label>Até<input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} /></label>
        {!isClinic && <label>Clínica<select value={clinicId} onChange={e => setClinicId(e.target.value)}><option value="">Todas as clínicas</option>{clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <button type="button" className="clearFilters clearFiltersDark" onClick={clearFilters}>Limpar</button>
      </section>

      {error && <div className="error dashboardError">{error}</div>}

      <section className="analyticsKpiGrid">
        <div><span>Agendas</span><strong>{agendas.length}</strong><small>no período selecionado</small></div>
        <div><span>Capacidade</span><strong>{stats.capacity}</strong><small>slots disponíveis</small></div>
        <div><span>Ocupação</span><strong>{stats.occupancy}%</strong><small>{stats.active} slots utilizados</small></div>
        <div><span>Atendidos</span><strong>{stats.attended}</strong><small>{stats.attendanceRate}% dos ativos</small></div>
        <div><span>Faltas</span><strong>{stats.noShow}</strong><small>não compareceram</small></div>
        <div><span>Cancelados</span><strong>{stats.cancelled}</strong><small>registros cancelados</small></div>
      </section>

      <section className="analyticsChartWide">
        <div className="analyticsChartHeader"><div><h2>Ocupação e volume por dia</h2><p>Quantidade de pacientes registrados em cada data.</p></div><span>{formatDate(start)} → {formatDate(end)}</span></div>
        <div className="analyticsBarChart">
          {byDay.length ? byDay.map(([day, value]) => {
            const height = Math.max(4, Math.round(value.active / maxDay * 100));
            return <div className="analyticsBarItem" key={day}>
              <strong>{value.active}</strong>
              <div className="analyticsBarTrack"><span style={{ height: height + '%' }} /></div>
              <small>{formatDate(day)}</small>
            </div>;
          }) : <div className="chartEmpty">Nenhuma agenda no período.</div>}
        </div>
      </section>

      <div className="analyticsChartColumns">
        <section className="analyticsChartCard">
          <div className="analyticsChartHeader"><div><h2>Por status</h2><p>Distribuição dos agendamentos.</p></div><span>Total<br /><b>{appointments.length}</b></span></div>
          <div className="donutLayout">
            <div className="donutChart" style={{ background: statusDonut }}>
              <div><small>Total</small><strong>{appointments.length}</strong></div>
            </div>
            <div className="chartLegend">
              {byStatus.map(item => <div key={item.key}><i style={{ background: item.color }} /><span>{item.label}</span><b>{Math.round(item.count / statusTotal * 100)}%</b></div>)}
            </div>
          </div>
        </section>

        <section className="analyticsChartCard">
          <div className="analyticsChartHeader"><div><h2>Por clínica</h2><p>Onde a operação está concentrada.</p></div><span>Ativos<br /><b>{stats.active}</b></span></div>
          {byClinic.length ? (
            <div className="donutLayout">
              <div className="donutChart clinicDonut" style={{ background: `conic-gradient(${byClinic.map((c, i) => {
                const startPct = byClinic.slice(0, i).reduce((sum, x) => sum + x.active, 0) / clinicTotal * 100;
                const endPct = byClinic.slice(0, i + 1).reduce((sum, x) => sum + x.active, 0) / clinicTotal * 100;
                return `${clinicColors[i % clinicColors.length]} ${startPct}% ${endPct}%`;
              }).join(', ')})` }}>
                <div><small>Total</small><strong>{stats.active}</strong></div>
              </div>
              <div className="chartLegend">
                {byClinic.map((item, i) => <div key={item.name}><i style={{ background: clinicColors[i % clinicColors.length] }} /><span>{item.name}</span><b>{Math.round(item.active / clinicTotal * 100)}%</b></div>)}
              </div>
            </div>
          ) : <div className="chartEmpty">Nenhuma clínica com dados no período.</div>}
        </section>
      </div>

      <section className="analyticsChartWide">
        <div className="analyticsChartHeader"><div><h2>Resumo por clínica</h2><p>Capacidade, utilização, atendimentos e cancelamentos.</p></div></div>
        <div className="clinicTable">
          {byClinic.length ? byClinic.map((item, i) => {
            const pct = item.total ? Math.round(item.active / item.total * 100) : 0;
            return <div className="clinicTableRow" key={item.name}>
              <div><i style={{ background: clinicColors[i % clinicColors.length] }} /><strong>{item.name}</strong></div>
              <span>{item.active} ativos</span><span>{item.attended} atendidos</span><span>{item.cancelled} cancelados</span><b>{pct}%</b>
            </div>;
          }) : <div className="chartEmpty">Nenhum dado no período.</div>}
        </div>
      </section>

      {loading && <div className="dashboardLoading darkLoading">Atualizando indicadores...</div>}
    </div>
  );
}
