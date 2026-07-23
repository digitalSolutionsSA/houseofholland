import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type DayRow = {
  day_of_week: number
  is_active: boolean
  start_time: string
  end_time: string
  slot_minutes: number
}

const DEFAULT_ROWS: DayRow[] = DAYS.map((_, i) => ({
  day_of_week: i,
  is_active: i >= 1 && i <= 5, // Mon-Fri on by default
  start_time: '09:00',
  end_time: '17:00',
  slot_minutes: 60,
}))

type Artist = { id: string; name: string; profile_id: string | null }

export function AdminSchedule() {
  const { profile } = useAuth()
  const [artists, setArtists]           = useState<Artist[]>([])
  const [artistId, setArtistId]         = useState<string>('')
  const [rows, setRows]                 = useState<DayRow[]>(DEFAULT_ROWS)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [success, setSuccess]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const isManager = profile?.role === 'manager'

  useEffect(() => {
    async function init() {
      const { data: list } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('is_active', true)
        .order('name')
      setArtists(list ?? [])

      const mine = (list ?? []).find(a => a.profile_id === profile?.id)
      const id = mine?.id ?? (isManager ? list?.[0]?.id : null)
      if (id) { setArtistId(id); await loadSchedule(id) }
      else setLoading(false)
    }
    init()
  }, [profile?.id])

  useEffect(() => {
    if (artistId) loadSchedule(artistId)
  }, [artistId])

  async function loadSchedule(aid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('artist_schedules')
      .select('*')
      .eq('artist_id', aid)
    if (!data || data.length === 0) {
      setRows(DEFAULT_ROWS)
    } else {
      setRows(
        DEFAULT_ROWS.map(def => {
          const saved = data.find((r: any) => r.day_of_week === def.day_of_week)
          return saved
            ? { day_of_week: def.day_of_week, is_active: saved.is_active, start_time: saved.start_time.slice(0, 5), end_time: saved.end_time.slice(0, 5), slot_minutes: saved.slot_minutes }
            : def
        })
      )
    }
    setLoading(false)
  }

  function update(index: number, patch: Partial<DayRow>) {
    setRows(r => r.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  async function save() {
    if (!artistId) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    const upsertData = rows.map(r => ({
      artist_id:    artistId,
      day_of_week:  r.day_of_week,
      is_active:    r.is_active,
      start_time:   r.start_time,
      end_time:     r.end_time,
      slot_minutes: r.slot_minutes,
    }))

    const { error: err } = await supabase
      .from('artist_schedules')
      .upsert(upsertData, { onConflict: 'artist_id,day_of_week' })

    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Weekly Schedule</h1>
        <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving || loading}>
          <Save size={13} style={{ display: 'inline', marginRight: 6 }} />
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>

      {isManager && artists.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <select className="admin-modal__select" style={{ maxWidth: 240 }}
            value={artistId} onChange={e => setArtistId(e.target.value)}>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {success && (
        <p style={{ color: '#6bffb8', fontSize: '0.85rem', marginBottom: 16, padding: '8px 12px', background: 'rgba(107,255,184,0.08)', border: '1px solid rgba(107,255,184,0.2)', borderRadius: 6 }}>
          Schedule saved successfully.
        </p>
      )}
      {error && <p className="admin-modal__error" style={{ marginBottom: 16 }}>{error}</p>}

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : (
        <div className="admin-schedule__table">
          {rows.map((row, i) => (
            <div key={row.day_of_week} className={`admin-schedule__row ${row.is_active ? 'admin-schedule__row--active' : 'admin-schedule__row--off'}`}>
              {/* Day toggle */}
              <label className="admin-schedule__day-toggle">
                <input
                  type="checkbox"
                  checked={row.is_active}
                  onChange={e => update(i, { is_active: e.target.checked })}
                />
                <span className="admin-schedule__day-name">{DAYS[row.day_of_week]}</span>
              </label>

              {row.is_active ? (
                <div className="admin-schedule__times">
                  <div className="admin-schedule__time-field">
                    <label>From</label>
                    <input type="time" className="admin-modal__input" value={row.start_time}
                      onChange={e => update(i, { start_time: e.target.value })} />
                  </div>
                  <span className="admin-schedule__dash">—</span>
                  <div className="admin-schedule__time-field">
                    <label>To</label>
                    <input type="time" className="admin-modal__input" value={row.end_time}
                      onChange={e => update(i, { end_time: e.target.value })} />
                  </div>
                  <div className="admin-schedule__time-field">
                    <label>Slot</label>
                    <select className="admin-modal__select" value={row.slot_minutes}
                      onChange={e => update(i, { slot_minutes: Number(e.target.value) })}>
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
      )}
    </div>
  )
}
