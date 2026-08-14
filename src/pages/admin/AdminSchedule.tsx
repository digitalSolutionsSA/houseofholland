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
  const isSuper = profile?.email?.toLowerCase() === 'info@digitalsolutionssa.co.za'

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
      const id = mine?.id ?? (isSuper ? list?.[0]?.id ?? '' : '')
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

  const SLOT_OPTIONS = [
    { value: 30,  label: '30 min' },
    { value: 60,  label: '1 hr'   },
    { value: 90,  label: '1.5 hr' },
    { value: 120, label: '2 hr'   },
  ]

  if (!artistId && !loading) {
    return (
      <div>
        <div className="admin-page__header">
          <h1 className="admin-page__title">Schedule</h1>
        </div>
        <p className="admin-empty">Your account is not linked to an artist record. Ask your manager to assign your login on the Artists page.</p>
      </div>
    )
  }

  const currentArtistName = artists.find(a => a.id === artistId)?.name

  return (
    <div>
      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Schedule</h1>
          {isSuper && currentArtistName && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
              {currentArtistName}
            </span>
          )}
        </div>
        {tab === 'weekly' && (
          <button className="admin-btn admin-btn--primary" onClick={saveWeekly} disabled={weekSaving || loading}>
            <Save size={13} style={{ display: 'inline', marginRight: 6 }} />
            {weekSaving ? 'Saving…' : weekSuccess ? '✓ Saved' : 'Save Schedule'}
          </button>
        )}
      </div>

      {/* Artist switcher (super only) */}
      {isSuper && artists.length > 1 && (
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

      {/* Tab pills */}
      <div className="sched-tabs">
        {(['weekly', 'calendar'] as const).map(t => (
          <button
            key={t}
            className={`sched-tab${tab === t ? ' sched-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'weekly' ? 'Weekly Defaults' : '30-Day Calendar'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : tab === 'weekly' ? (

        /* ── Weekly tab ── */
        <div className="sched-week">
          {weekError && <p className="admin-modal__error" style={{ marginBottom: 12 }}>{weekError}</p>}

          {rows.map((row, i) => (
            <div key={row.day_of_week} className={`sched-day${row.is_active ? ' sched-day--on' : ''}`}>

              {/* Day header row */}
              <div className="sched-day__head">
                <span className="sched-day__name">{DAYS[row.day_of_week]}</span>
                <button
                  type="button"
                  className={`sched-toggle${row.is_active ? ' sched-toggle--on' : ''}`}
                  onClick={() => updateRow(i, { is_active: !row.is_active })}
                  aria-label={row.is_active ? 'Set day off' : 'Set working day'}
                >
                  <span className="sched-toggle__thumb" />
                </button>
              </div>

              {/* Time pickers — only when active */}
              {row.is_active && (
                <div className="sched-day__body">
                  <div className="sched-day__times">
                    <div className="sched-day__time-field">
                      <label>From</label>
                      <input type="time" className="admin-modal__input"
                        value={row.start_time}
                        onChange={e => updateRow(i, { start_time: e.target.value })} />
                    </div>
                    <span className="sched-day__dash">—</span>
                    <div className="sched-day__time-field">
                      <label>To</label>
                      <input type="time" className="admin-modal__input"
                        value={row.end_time}
                        onChange={e => updateRow(i, { end_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="sched-day__slot-row">
                    <span className="sched-day__slot-label">Booking slot</span>
                    <div className="sched-slot-pills">
                      {SLOT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`sched-slot-pill${row.slot_minutes === opt.value ? ' sched-slot-pill--active' : ''}`}
                          onClick={() => updateRow(i, { slot_minutes: opt.value })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <p className="sched-hint">
            These are your default working hours. Use the 30-Day Calendar tab to override specific dates.
          </p>
        </div>

      ) : (

        /* ── Calendar tab ── */
        <div className="sched-cal">

          {/* Month nav */}
          <div className="sched-cal__nav">
            <button className="admin-btn admin-btn--ghost" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="sched-cal__month">{monthLabel}</span>
            <button className="admin-btn admin-btn--ghost" onClick={() => shiftMonth(1)}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="sched-cal__dow">
            {DAYS_SHORT.map(d => <span key={d}>{d}</span>)}
          </div>

          {/* Day cells */}
          <div className="sched-cal__grid">
            {calDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />
              const status = dayStatus(day)
              const inWindow = isInWindow(day)
              const past = isPast(day)
              const dateStr = toDateStr(new Date(calYear, calMonth, day))
              const isSelected = selectedDate === dateStr
              const hasOverride = overrides.some(o => o.override_date === dateStr)
              const apptCount = bookingCounts[dateStr] ?? 0
              const isOn = status === 'available' || status === 'override-on'

              return (
                <button
                  key={day}
                  onClick={() => inWindow && !past && openDayEdit(day)}
                  disabled={past || !inWindow}
                  className={[
                    'sched-cal__cell',
                    isSelected   ? 'sched-cal__cell--selected' : '',
                    past         ? 'sched-cal__cell--past'     : '',
                    !inWindow && !past ? 'sched-cal__cell--future'  : '',
                    inWindow && !past && isOn  ? 'sched-cal__cell--on'    : '',
                    inWindow && !past && !isOn ? 'sched-cal__cell--off'   : '',
                    hasOverride && !isSelected ? 'sched-cal__cell--override' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className="sched-cal__cell-day">{day}</span>
                  {apptCount > 0 && (
                    <span className="sched-cal__appt-dot">{apptCount}</span>
                  )}
                  {hasOverride && !apptCount && (
                    <span className="sched-cal__override-dot" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="sched-cal__legend">
            <span><span className="sched-legend-swatch sched-legend-swatch--on" />Available</span>
            <span><span className="sched-legend-swatch sched-legend-swatch--override" />Overridden</span>
            <span><span className="sched-legend-swatch sched-legend-swatch--off" />Day off</span>
            <span><span className="sched-legend-swatch sched-legend-swatch--appt">1</span>Booked</span>
          </div>
          <p className="sched-hint">Tap any upcoming date (today + 30 days) to set an override.</p>

          {/* Day edit panel — full width below calendar */}
          {selectedDate && editOverride && (
            <div className="sched-override-panel">
              <div className="sched-override-panel__head">
                <span className="sched-override-panel__date">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <button className="admin-btn admin-btn--ghost sched-override-panel__close" onClick={() => setSelectedDate(null)}>
                  <X size={15} />
                </button>
              </div>

              {/* Working / Day Off toggle */}
              <div className="sched-avail-toggle">
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    className={`sched-avail-btn${editOverride.is_available === v ? ' sched-avail-btn--active' : ''}`}
                    onClick={() => setEditOverride(o => o ? { ...o, is_available: v } : o)}
                  >
                    {v ? 'Working' : 'Day Off'}
                  </button>
                ))}
              </div>

              {editOverride.is_available && (
                <>
                  <div className="sched-day__times" style={{ marginBottom: 14 }}>
                    <div className="sched-day__time-field">
                      <label>From</label>
                      <input type="time" className="admin-modal__input"
                        value={editOverride.start_time ?? '09:00'}
                        onChange={e => setEditOverride(o => o ? { ...o, start_time: e.target.value } : o)} />
                    </div>
                    <span className="sched-day__dash">—</span>
                    <div className="sched-day__time-field">
                      <label>To</label>
                      <input type="time" className="admin-modal__input"
                        value={editOverride.end_time ?? '18:00'}
                        onChange={e => setEditOverride(o => o ? { ...o, end_time: e.target.value } : o)} />
                    </div>
                  </div>
                  <div className="sched-day__slot-row" style={{ marginBottom: 16 }}>
                    <span className="sched-day__slot-label">Booking slot</span>
                    <div className="sched-slot-pills">
                      {SLOT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`sched-slot-pill${editOverride.slot_minutes === opt.value ? ' sched-slot-pill--active' : ''}`}
                          onClick={() => setEditOverride(o => o ? { ...o, slot_minutes: opt.value } : o)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {calError && <p className="admin-modal__error" style={{ marginBottom: 10 }}>{calError}</p>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="admin-btn admin-btn--primary" style={{ flex: 1 }} onClick={saveOverride} disabled={calSaving}>
                  {calSaving ? 'Saving…' : 'Save Override'}
                </button>
                {editOverride.id && (
                  <button className="admin-btn admin-btn--ghost" onClick={deleteOverride} disabled={calSaving}>
                    Clear Override
                  </button>
                )}
              </div>
              {editOverride.id && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
                  "Clear Override" reverts this date back to your weekly default.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
