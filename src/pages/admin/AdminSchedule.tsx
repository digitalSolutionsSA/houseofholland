import { useEffect, useState, useMemo } from 'react'
import { Save, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type DayRow = {
  day_of_week: number
  is_active: boolean
  start_time: string
  end_time: string
  slot_minutes: number
}

type Override = {
  id?: string
  override_date: string   // YYYY-MM-DD
  is_available: boolean
  start_time: string | null
  end_time: string | null
  slot_minutes: number
}

const DEFAULT_ROWS: DayRow[] = DAYS.map((_, i) => ({
  day_of_week:  i,
  is_active:    i >= 1 && i <= 6,
  start_time:   '09:00',
  end_time:     '18:00',
  slot_minutes: 60,
}))

type ArtistItem = { id: string; name: string; profile_id: string | null }

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function AdminSchedule() {
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'

  const [artists, setArtists]     = useState<ArtistItem[]>([])
  const [artistId, setArtistId]   = useState('')
  const [tab, setTab]             = useState<'weekly' | 'calendar'>('weekly')

  // ── Weekly schedule ────────────────────────────────────────────
  const [rows, setRows]           = useState<DayRow[]>(DEFAULT_ROWS)
  const [weekSaving, setWeekSaving] = useState(false)
  const [weekSuccess, setWeekSuccess] = useState(false)
  const [weekError, setWeekError] = useState<string | null>(null)

  // ── Calendar ────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), [])
  const [calYear, setCalYear]     = useState(today.getFullYear())
  const [calMonth, setCalMonth]   = useState(today.getMonth())
  const [overrides, setOverrides] = useState<Override[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editOverride, setEditOverride] = useState<Override | null>(null)
  const [calSaving, setCalSaving] = useState(false)
  const [calError, setCalError]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({})

  // Load artist list once
  useEffect(() => {
    async function init() {
      const { data: list } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('is_active', true)
        .order('name')
      setArtists(list ?? [])
      const mine = (list ?? []).find((a: ArtistItem) => a.profile_id === profile?.id)
      const id = mine?.id ?? (isManager ? list?.[0]?.id ?? '' : '')
      setArtistId(id)
    }
    init()
  }, [profile?.id])

  // Load schedule + overrides when artistId changes
  useEffect(() => {
    if (!artistId) { setLoading(false); return }
    loadAll(artistId)
  }, [artistId])

  async function loadAll(aid: string) {
    setLoading(true)

    const sixMonthsOut = new Date()
    sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)

    const [schedRes, overRes, bookRes] = await Promise.all([
      supabase.from('artist_schedules').select('*').eq('artist_id', aid),
      supabase.from('schedule_date_overrides').select('*').eq('artist_id', aid),
      supabase.from('bookings')
        .select('appointment_at')
        .eq('artist_id', aid)
        .in('status', ['pending', 'confirmed'])
        .gte('appointment_at', new Date().toISOString())
        .lte('appointment_at', sixMonthsOut.toISOString()),
    ])

    // Weekly rows
    const sched = schedRes.data ?? []
    setRows(
      DEFAULT_ROWS.map(def => {
        const saved = sched.find((r: any) => r.day_of_week === def.day_of_week)
        return saved
          ? {
              day_of_week:  def.day_of_week,
              is_active:    saved.is_active,
              start_time:   String(saved.start_time).slice(0, 5),
              end_time:     String(saved.end_time).slice(0, 5),
              slot_minutes: saved.slot_minutes,
            }
          : def
      })
    )

    // Overrides
    setOverrides(
      (overRes.data ?? []).map((o: any) => ({
        id:            o.id,
        override_date: o.override_date,
        is_available:  o.is_available,
        start_time:    o.start_time ? String(o.start_time).slice(0, 5) : null,
        end_time:      o.end_time   ? String(o.end_time).slice(0, 5)   : null,
        slot_minutes:  o.slot_minutes ?? 60,
      }))
    )

    // Booking counts per date
    const counts: Record<string, number> = {}
    for (const b of bookRes.data ?? []) {
      const d = new Date(b.appointment_at)
      const key = toDateStr(d)
      counts[key] = (counts[key] ?? 0) + 1
    }
    setBookingCounts(counts)

    setLoading(false)
  }

  // ── Weekly save ─────────────────────────────────────────────────
  async function saveWeekly() {
    if (!artistId) return
    setWeekSaving(true)
    setWeekError(null)
    setWeekSuccess(false)

    const payload = rows.map(r => ({
      artist_id:    artistId,
      day_of_week:  r.day_of_week,
      is_active:    r.is_active,
      start_time:   r.start_time,
      end_time:     r.end_time,
      slot_minutes: r.slot_minutes,
    }))

    const { error: err } = await supabase
      .from('artist_schedules')
      .upsert(payload, { onConflict: 'artist_id,day_of_week' })

    if (err) { setWeekError(err.message); setWeekSaving(false); return }
    setWeekSaving(false)
    setWeekSuccess(true)
    setTimeout(() => setWeekSuccess(false), 3000)
  }

  function updateRow(index: number, patch: Partial<DayRow>) {
    setRows(r => r.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  // ── Calendar helpers ────────────────────────────────────────────

  // Days in the visible month
  const calDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1).getDay()
    const total = new Date(calYear, calMonth + 1, 0).getDate()
    const cells: (number | null)[] = Array.from({ length: first }, () => null)
    for (let d = 1; d <= total; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [calYear, calMonth])

  const monthLabel = useMemo(
    () => new Date(calYear, calMonth, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [calYear, calMonth]
  )

  function shiftMonth(delta: number) {
    const d = new Date(calYear, calMonth + delta, 1)
    setCalYear(d.getFullYear())
    setCalMonth(d.getMonth())
    setSelectedDate(null)
  }

  // Is a given date in the "editable" 30-day window?
  function isInWindow(day: number) {
    const d = new Date(calYear, calMonth, day)
    d.setHours(0, 0, 0, 0)
    const start = new Date(today); start.setHours(0, 0, 0, 0)
    const end   = new Date(start); end.setDate(end.getDate() + 30)
    return d >= start && d < end
  }

  function isPast(day: number) {
    const d = new Date(calYear, calMonth, day)
    d.setHours(23, 59, 59)
    return d < today
  }

  // Effective status for a day
  function dayStatus(day: number): 'available' | 'off' | 'override-on' | 'override-off' {
    const dateStr = toDateStr(new Date(calYear, calMonth, day))
    const override = overrides.find(o => o.override_date === dateStr)
    if (override) return override.is_available ? 'override-on' : 'override-off'
    const dow = new Date(calYear, calMonth, day).getDay()
    const weekly = rows.find(r => r.day_of_week === dow)
    return weekly?.is_active ? 'available' : 'off'
  }

  function openDayEdit(day: number) {
    if (!isInWindow(day)) return
    const dateStr = toDateStr(new Date(calYear, calMonth, day))
    setSelectedDate(dateStr)
    const existing = overrides.find(o => o.override_date === dateStr)
    if (existing) {
      setEditOverride({ ...existing })
    } else {
      // Seed from weekly default
      const dow = new Date(calYear, calMonth, day).getDay()
      const weekly = rows.find(r => r.day_of_week === dow)
      setEditOverride({
        override_date: dateStr,
        is_available:  weekly?.is_active ?? true,
        start_time:    weekly?.start_time ?? '09:00',
        end_time:      weekly?.end_time   ?? '18:00',
        slot_minutes:  weekly?.slot_minutes ?? 60,
      })
    }
    setCalError(null)
  }

  async function saveOverride() {
    if (!artistId || !editOverride) return
    setCalSaving(true)
    setCalError(null)

    const payload = {
      artist_id:     artistId,
      override_date: editOverride.override_date,
      is_available:  editOverride.is_available,
      start_time:    editOverride.is_available ? editOverride.start_time : null,
      end_time:      editOverride.is_available ? editOverride.end_time   : null,
      slot_minutes:  editOverride.is_available ? editOverride.slot_minutes : 60,
    }

    const { error: err } = await supabase
      .from('schedule_date_overrides')
      .upsert(payload, { onConflict: 'artist_id,override_date' })

    if (err) { setCalError(err.message); setCalSaving(false); return }
    setCalSaving(false)
    setSelectedDate(null)
    loadAll(artistId)
  }

  async function deleteOverride() {
    if (!artistId || !editOverride?.id) { setSelectedDate(null); return }
    setCalSaving(true)
    await supabase
      .from('schedule_date_overrides')
      .delete()
      .eq('id', editOverride.id)
    setCalSaving(false)
    setSelectedDate(null)
    loadAll(artistId)
  }

  // ── Render ──────────────────────────────────────────────────────

  if (!artistId && !loading) {
    return (
      <div>
        <div className="admin-page__header">
          <h1 className="admin-page__title">Weekly Schedule</h1>
        </div>
        <p className="admin-empty">Your account is not linked to an artist record. Ask your manager to assign your login on the Artists page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Schedule</h1>
        {tab === 'weekly' && (
          <button className="admin-btn admin-btn--primary" onClick={saveWeekly} disabled={weekSaving || loading}>
            <Save size={13} style={{ display: 'inline', marginRight: 6 }} />
            {weekSaving ? 'Saving…' : 'Save Schedule'}
          </button>
        )}
      </div>

      {isManager && artists.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <select
            className="admin-modal__select"
            style={{ maxWidth: 240 }}
            value={artistId}
            onChange={e => { setArtistId(e.target.value); setSelectedDate(null) }}
          >
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-muted)', paddingBottom: 0 }}>
        {(['weekly', 'calendar'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
              color: tab === t ? 'var(--gold)' : 'var(--text-muted)',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.88rem',
              textTransform: 'capitalize',
              marginBottom: -1,
            }}
          >
            {t === 'weekly' ? 'Weekly Defaults' : '30-Day Calendar'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : tab === 'weekly' ? (
        <>
          {weekSuccess && (
            <p style={{ color: '#6bffb8', fontSize: '0.85rem', marginBottom: 16, padding: '8px 12px', background: 'rgba(107,255,184,0.08)', border: '1px solid rgba(107,255,184,0.2)', borderRadius: 6 }}>
              Schedule saved.
            </p>
          )}
          {weekError && <p className="admin-modal__error" style={{ marginBottom: 16 }}>{weekError}</p>}
          <div className="admin-schedule__table">
            {rows.map((row, i) => (
              <div key={row.day_of_week} className={`admin-schedule__row ${row.is_active ? 'admin-schedule__row--active' : 'admin-schedule__row--off'}`}>
                <label className="admin-schedule__day-toggle">
                  <input type="checkbox" checked={row.is_active} onChange={e => updateRow(i, { is_active: e.target.checked })} />
                  <span className="admin-schedule__day-name">{DAYS[row.day_of_week]}</span>
                </label>
                {row.is_active ? (
                  <div className="admin-schedule__times">
                    <div className="admin-schedule__time-field">
                      <label>From</label>
                      <input type="time" className="admin-modal__input" value={row.start_time}
                        onChange={e => updateRow(i, { start_time: e.target.value })} />
                    </div>
                    <span className="admin-schedule__dash">—</span>
                    <div className="admin-schedule__time-field">
                      <label>To</label>
                      <input type="time" className="admin-modal__input" value={row.end_time}
                        onChange={e => updateRow(i, { end_time: e.target.value })} />
                    </div>
                    <div className="admin-schedule__time-field">
                      <label>Slot</label>
                      <select className="admin-modal__select" value={row.slot_minutes}
                        onChange={e => updateRow(i, { slot_minutes: Number(e.target.value) })}>
                        <option value={30}>30 min</option>
                        <option value={60}>1 hr</option>
                        <option value={90}>1.5 hr</option>
                        <option value={120}>2 hr</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <span className="admin-schedule__off-label">Day off</span>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 16 }}>
            These are your default working hours. Use the 30-Day Calendar tab to override specific dates.
          </p>
        </>
      ) : (
        /* ── Calendar tab ── */
        <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 280px' : '1fr', gap: 24, alignItems: 'start' }}>
          {/* Calendar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button className="admin-btn admin-btn--ghost" onClick={() => shiftMonth(-1)}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{monthLabel}</span>
              <button className="admin-btn admin-btn--ghost" onClick={() => shiftMonth(1)}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {DAYS_SHORT.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {calDays.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />
                const status = dayStatus(day)
                const inWindow = isInWindow(day)
                const past = isPast(day)
                const dateStr = toDateStr(new Date(calYear, calMonth, day))
                const isSelected = selectedDate === dateStr
                const hasOverride = overrides.some(o => o.override_date === dateStr)
                const apptCount = bookingCounts[dateStr] ?? 0

                const bgColor =
                  isSelected ? 'var(--gold)' :
                  past       ? 'transparent' :
                  !inWindow  ? 'transparent' :
                  status === 'available' || status === 'override-on' ? 'rgba(212,175,55,0.12)' :
                  'transparent'

                const textColor =
                  isSelected ? '#000' :
                  past || !inWindow ? 'var(--text-dim)' :
                  status === 'available' || status === 'override-on' ? 'var(--gold)' :
                  'var(--text-muted)'

                return (
                  <button
                    key={day}
                    onClick={() => inWindow && !past && openDayEdit(day)}
                    disabled={past || !inWindow}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 8,
                      border: hasOverride && !isSelected ? '1px solid var(--gold)' : '1px solid transparent',
                      background: bgColor,
                      color: textColor,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: inWindow && !past ? 'pointer' : 'default',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      padding: '6px 2px',
                    }}
                  >
                    {day}
                    {apptCount > 0 && (
                      <span style={{
                        position: 'absolute', top: 2, right: 3,
                        background: isSelected ? '#000' : '#6bffb8',
                        color: '#000',
                        borderRadius: '50%',
                        width: 14, height: 14,
                        fontSize: '0.58rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                      }}>
                        {apptCount}
                      </span>
                    )}
                    {hasOverride && !apptCount && (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#000' : 'var(--gold)' }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, fontSize: '0.72rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(212,175,55,0.15)', border: '1px solid transparent', display: 'inline-block' }} />
                Available
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'transparent', border: '1px solid var(--gold)', display: 'inline-block' }} />
                Overridden
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'transparent', border: '1px solid var(--border-muted)', display: 'inline-block' }} />
                Day off
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#6bffb8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#000' }}>1</span>
                Appointments
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 8 }}>
              Editable range: today + 30 days. Click any upcoming date to override.
            </p>
          </div>

          {/* Day edit panel */}
          {selectedDate && editOverride && (
            <div style={{ border: '1px solid var(--border-gold)', borderRadius: 10, padding: 20, background: 'var(--surface-1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '0.9rem' }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <button className="admin-btn admin-btn--ghost" onClick={() => setSelectedDate(null)}>
                  <X size={14} />
                </button>
              </div>

              {/* Available / Off toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    onClick={() => setEditOverride(o => o ? { ...o, is_available: v } : o)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                      border: editOverride.is_available === v ? '1px solid var(--gold)' : '1px solid var(--border-muted)',
                      background: editOverride.is_available === v ? 'rgba(212,175,55,0.12)' : 'transparent',
                      color: editOverride.is_available === v ? 'var(--gold)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {v ? 'Working' : 'Day Off'}
                  </button>
                ))}
              </div>

              {editOverride.is_available && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>From</label>
                      <input type="time" className="admin-modal__input"
                        value={editOverride.start_time ?? '09:00'}
                        onChange={e => setEditOverride(o => o ? { ...o, start_time: e.target.value } : o)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>To</label>
                      <input type="time" className="admin-modal__input"
                        value={editOverride.end_time ?? '18:00'}
                        onChange={e => setEditOverride(o => o ? { ...o, end_time: e.target.value } : o)} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Slot duration</label>
                    <select className="admin-modal__select" value={editOverride.slot_minutes}
                      onChange={e => setEditOverride(o => o ? { ...o, slot_minutes: Number(e.target.value) } : o)}>
                      <option value={30}>30 min</option>
                      <option value={60}>1 hr</option>
                      <option value={90}>1.5 hr</option>
                      <option value={120}>2 hr</option>
                    </select>
                  </div>
                </>
              )}

              {calError && <p className="admin-modal__error" style={{ marginBottom: 10 }}>{calError}</p>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="admin-btn admin-btn--primary" style={{ flex: 1 }} onClick={saveOverride} disabled={calSaving}>
                  {calSaving ? 'Saving…' : 'Save'}
                </button>
                {editOverride.id && (
                  <button className="admin-btn admin-btn--ghost" onClick={deleteOverride} disabled={calSaving} title="Clear override (revert to weekly default)">
                    Clear
                  </button>
                )}
              </div>
              {editOverride.id && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
                  "Clear" removes the override and reverts to your weekly default.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
