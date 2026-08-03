import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, ImagePlus, X } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { GradientButton } from '../components/shared/GradientButton'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './SelectDateTimePage.css'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const SERVICES = [
  'Custom Tattoo',
  'Flash Tattoo',
  'Touch-up / Rework',
  'Cover-up',
  'Consultation',
]

type Artist = { id: string; name: string; slug: string; avatar_url: string | null; specialties: string[]; profile_id: string | null }
type Schedule = { day_of_week: number; start_time: string; end_time: string; slot_minutes: number; is_active: boolean }
type DateOverride = { override_date: string; is_available: boolean; start_time: string | null; end_time: string | null; slot_minutes: number }

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function pad(n: number) { return String(n).padStart(2, '0') }

function generateSlots(schedule: Schedule, bookedTimes: string[]): string[] {
  const [sh, sm] = schedule.start_time.split(':').map(Number)
  const [eh, em] = schedule.end_time.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins   = eh * 60 + em
  const slots: string[] = []
  for (let m = startMins; m + schedule.slot_minutes <= endMins; m += schedule.slot_minutes) {
    const hh = Math.floor(m / 60)
    const mm = m % 60
    const label = `${pad(hh)}:${pad(mm)}`
    if (!bookedTimes.includes(label)) slots.push(label)
  }
  return slots
}

function fmtSlot(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h % 12 || 12
  return `${h12}:${pad(m)} ${ampm}`
}

export function SelectDateTimePage() {
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedArtistId = searchParams.get('artist')
  const { profile } = useAuth()
  const today = new Date()

  // Steps: 0 = pick artist, 1 = pick date/time, 2 = confirm
  const [step, setStep] = useState(preselectedArtistId ? 1 : 0)

  // Artist step
  const [artists, setArtists]         = useState<Artist[]>([])
  const [artistsLoading, setArtistsLoading] = useState(true)
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)

  // Calendar step
  const [year, setYear]               = useState(today.getFullYear())
  const [month, setMonth]             = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Schedule for selected artist
  const [schedules, setSchedules]     = useState<Schedule[]>([])
  const [overrides, setOverrides]     = useState<DateOverride[]>([])
  const [slotsForDay, setSlotsForDay] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Confirm step
  const [service, setService]         = useState(SERVICES[0])
  const [notes, setNotes]             = useState('')
  const [booking, setBooking]         = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [done, setDone]               = useState(false)

  // Reference images
  const refInputRef = useRef<HTMLInputElement>(null)
  const [refFiles, setRefFiles]       = useState<File[]>([])
  const [refPreviews, setRefPreviews] = useState<string[]>([])

  function addRefImages(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 4 - refFiles.length)
    setRefFiles(prev => [...prev, ...newFiles])
    setRefPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
  }

  function removeRefImage(i: number) {
    setRefFiles(prev => prev.filter((_, idx) => idx !== i))
    setRefPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  // Load artists on mount; if preselected, pick immediately and skip step 0
  useEffect(() => {
    supabase.from('artists').select('id, name, slug, avatar_url, specialties, profile_id')
      .eq('is_active', true).order('name')
      .then(({ data }) => {
        const list = data ?? []
        setArtists(list)
        setArtistsLoading(false)
        if (preselectedArtistId) {
          const match = list.find((a: Artist) => a.id === preselectedArtistId)
          if (match) setSelectedArtist(match)
        }
      })
  }, [])

  // Load schedule + overrides when artist chosen
  useEffect(() => {
    if (!selectedArtist) return
    Promise.all([
      supabase.from('artist_schedules').select('*').eq('artist_id', selectedArtist.id).eq('is_active', true),
      supabase.from('schedule_date_overrides').select('*').eq('artist_id', selectedArtist.id),
    ]).then(([schedRes, overRes]) => {
      setSchedules(schedRes.data ?? [])
      setOverrides((overRes.data ?? []).map((o: any) => ({
        override_date: o.override_date,
        is_available:  o.is_available,
        start_time:    o.start_time ? String(o.start_time).slice(0, 5) : null,
        end_time:      o.end_time   ? String(o.end_time).slice(0, 5)   : null,
        slot_minutes:  o.slot_minutes ?? 60,
      })))
    })
  }, [selectedArtist])

  // Resolve effective schedule for a specific date (override beats weekly)
  function effectiveSched(d: Date): Schedule | null {
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const override = overrides.find(o => o.override_date === dateStr)
    if (override) {
      if (!override.is_available) return null
      return {
        day_of_week:  d.getDay(),
        is_active:    true,
        start_time:   override.start_time ?? '09:00',
        end_time:     override.end_time   ?? '18:00',
        slot_minutes: override.slot_minutes,
      }
    }
    const dow = d.getDay()
    return schedules.find(s => s.day_of_week === dow && s.is_active) ?? null
  }

  // Load available slots when day changes
  useEffect(() => {
    if (!selectedArtist || selectedDay === null) return
    const date  = new Date(year, month, selectedDay)
    const sched = effectiveSched(date)
    if (!sched) { setSlotsForDay([]); return }

    setSlotsLoading(true)
    setSelectedTime(null)

    const dayStart = new Date(year, month, selectedDay, 0, 0, 0).toISOString()
    const dayEnd   = new Date(year, month, selectedDay, 23, 59, 59).toISOString()

    supabase.from('bookings')
      .select('appointment_at')
      .eq('artist_id', selectedArtist.id)
      .eq('status', 'confirmed')
      .gte('appointment_at', dayStart)
      .lte('appointment_at', dayEnd)
      .then(({ data }) => {
        const booked = (data ?? []).map((b: any) => {
          const d = new Date(b.appointment_at)
          return `${pad(d.getHours())}:${pad(d.getMinutes())}`
        })
        setSlotsForDay(generateSlots(sched, booked))
        setSlotsLoading(false)
      })
  }, [selectedDay, schedules, overrides])

  const days = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay()
    const total    = getDaysInMonth(year, month)
    const cells: (number | null)[] = Array.from({ length: firstDow }, () => null)
    for (let d = 1; d <= total; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  function isDayOff(day: number) {
    return effectiveSched(new Date(year, month, day)) === null
  }

  function isPast(day: number) {
    const d = new Date(year, month, day)
    d.setHours(23, 59, 59)
    return d < today
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelectedDay(null)
    setSelectedTime(null)
  }

  const monthLabel = useMemo(
    () => new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [year, month]
  )

  async function confirmBooking() {
    if (!selectedArtist || !selectedDay || !selectedTime || !profile) return
    setBooking(true)
    setBookingError(null)

    const [h, m] = selectedTime.split(':').map(Number)
    const appointmentAt = new Date(year, month, selectedDay, h, m, 0).toISOString()

    // Upload reference images first
    const uploadedUrls: string[] = []
    for (const file of refFiles) {
      const ext = file.name.split('.').pop()
      const path = `booking-refs/${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }
    }

    const { error } = await supabase.from('bookings').insert({
      profile_id:            profile.id,
      artist_id:             selectedArtist.id,
      appointment_at:        appointmentAt,
      service,
      notes:                 notes.trim() || null,
      status:                'pending',
      reference_image_urls:  uploadedUrls.length > 0 ? uploadedUrls : null,
    })

    if (error) { setBookingError(error.message); setBooking(false); return }

    // Notify the artist of the new request
    if (selectedArtist.profile_id) {
      const apptLabel = new Date(year, month, selectedDay, h, m, 0).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      await supabase.from('notifications').insert({
        profile_id: selectedArtist.profile_id,
        title: 'New Booking Request',
        body: `${profile.full_name ?? 'A client'} requested a ${service} on ${apptLabel}.`,
        type: 'booking',
      })
    }

    setDone(true)
    setBooking(false)
  }

  const summaryDate = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  // ── Done screen ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="page page--no-nav select-time-page select-time-page--done">
        <div className="select-time-page__done">
          <div className="select-time-page__done-icon"><Check size={32} strokeWidth={2.5} /></div>
          <h2>Booking Request Sent!</h2>
          <p>
            Your appointment with <strong>{selectedArtist?.name}</strong> on{' '}
            <strong>{summaryDate}</strong> at <strong>{selectedTime ? fmtSlot(selectedTime) : ''}</strong> is pending confirmation.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: 8 }}>
            You'll be notified once the artist confirms.
          </p>
          <GradientButton onClick={() => navigate('/bookings')}>View My Bookings</GradientButton>
        </div>
      </div>
    )
  }

  // ── Step 0: Pick artist ──────────────────────────────────────
  if (step === 0) {
    return (
      <div className="page page--no-nav select-time-page">
        <PageHeader title="Choose Artist" backTo="/bookings" align="center" />
        {artistsLoading ? (
          <p className="select-time-page__loading">Loading artists…</p>
        ) : (
          <div className="select-time-page__artists">
            {artists.map(a => (
              <button
                key={a.id}
                type="button"
                className="select-time-page__artist-card"
                onClick={() => { setSelectedArtist(a); setStep(1) }}
              >
                {a.avatar_url
                  ? <img src={a.avatar_url} alt={a.name} className="select-time-page__artist-avatar" />
                  : <div className="select-time-page__artist-avatar select-time-page__artist-avatar--empty" />
                }
                <div className="select-time-page__artist-info">
                  <span className="select-time-page__artist-name">{a.name}</span>
                  <span className="select-time-page__artist-specs">{a.specialties.join(' · ')}</span>
                </div>
                <ChevronRight size={18} strokeWidth={1.5} color="var(--gold-muted)" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Step 1: Pick date + time ─────────────────────────────────
  if (step === 1) {
    return (
      <div className="page page--no-nav select-time-page">
        <PageHeader
          title="Select Date & Time"
          align="center"
          leftAction={
            <button type="button" onClick={() => { setStep(0); setSelectedDay(null); setSelectedTime(null) }}>
              <ChevronLeft size={22} strokeWidth={1.5} />
            </button>
          }
        />

        {/* Artist strip */}
        <div className="select-time-page__artist-strip">
          {selectedArtist?.avatar_url && (
            <img src={selectedArtist.avatar_url} alt="" className="select-time-page__strip-avatar" />
          )}
          <span>{selectedArtist?.name}</span>
        </div>

        <div className="select-time-page__layout">
          {/* Calendar */}
          <section className="select-time-page__calendar">
            <div className="select-time-page__month">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
              <h2>{monthLabel}</h2>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="select-time-page__weekdays">
              {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="select-time-page__days">
              {days.map((day, i) =>
                day === null ? <span key={`e-${i}`} /> : (
                  <button
                    key={day}
                    type="button"
                    disabled={isPast(day) || isDayOff(day)}
                    className={[
                      selectedDay === day ? 'is-selected' : '',
                      isPast(day) || isDayOff(day) ? 'is-disabled' : '',
                      day === today.getDate() && year === today.getFullYear() && month === today.getMonth() && !isPast(day) && !isDayOff(day) ? 'is-today' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelectedDay(day)}
                  >
                    {day}
                  </button>
                )
              )}
            </div>
            {schedules.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 12 }}>
                This artist hasn't set their schedule yet.
              </p>
            )}
          </section>

          {/* Time slots */}
          <section className="select-time-page__times">
            <h3>
              {selectedDay
                ? `Available Times — ${new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}`
                : 'Select a date first'}
            </h3>
            {slotsLoading ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading slots…</p>
            ) : selectedDay && slotsForDay.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No available slots for this day.</p>
            ) : (
              <div className="select-time-page__grid">
                {slotsForDay.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={selectedTime === time ? 'is-selected' : ''}
                    onClick={() => setSelectedTime(time)}
                  >
                    {fmtSlot(time)}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="select-time-page__footer">
          <GradientButton
            onClick={() => setStep(2)}
            disabled={!selectedDay || !selectedTime}
          >
            CONTINUE
          </GradientButton>
          {selectedDay && selectedTime && (
            <p>{fmtSlot(selectedTime)} · {summaryDate}</p>
          )}
        </footer>
      </div>
    )
  }

  // ── Step 2: Confirm ──────────────────────────────────────────
  return (
    <div className="page page--no-nav select-time-page">
      <PageHeader
        title="Confirm Booking"
        align="center"
        leftAction={
          <button type="button" onClick={() => setStep(1)}>
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
        }
      />

      <div className="select-time-page__confirm">
        <div className="select-time-page__confirm-summary">
          {selectedArtist?.avatar_url && (
            <img src={selectedArtist.avatar_url} alt="" className="select-time-page__confirm-avatar" />
          )}
          <div>
            <div className="select-time-page__confirm-artist">{selectedArtist?.name}</div>
            <div className="select-time-page__confirm-when">
              {summaryDate} at {selectedTime ? fmtSlot(selectedTime) : ''}
            </div>
          </div>
        </div>

        <div className="admin-modal__field">
          <label className="admin-modal__label">Service</label>
          <select className="admin-modal__select" value={service} onChange={e => setService(e.target.value)}>
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="admin-modal__field">
          <label className="admin-modal__label">Notes / Description (optional)</label>
          <textarea
            className="admin-modal__textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe your idea, placement, size, style…"
            rows={3}
          />
        </div>

        {/* Reference images */}
        <div className="admin-modal__field">
          <label className="admin-modal__label">Reference Images (optional, max 4)</label>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 10 }}>
            Upload photos of your current tattoo (for cover-ups / additions) or inspiration images.
          </p>

          {refPreviews.length > 0 && (
            <div className="select-time-page__ref-grid">
              {refPreviews.map((src, i) => (
                <div key={i} className="select-time-page__ref-thumb">
                  <img src={src} alt={`Reference ${i + 1}`} />
                  <button
                    type="button"
                    className="select-time-page__ref-remove"
                    onClick={() => removeRefImage(i)}
                    aria-label="Remove image"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {refFiles.length < 4 && (
            <button
              type="button"
              className="select-time-page__ref-add"
              onClick={() => refInputRef.current?.click()}
            >
              <ImagePlus size={16} strokeWidth={1.5} />
              {refFiles.length === 0 ? 'Add Images' : 'Add More'}
            </button>
          )}
          <input
            ref={refInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => { addRefImages(e.target.files); e.target.value = '' }}
          />
        </div>

        {bookingError && <p className="admin-modal__error">{bookingError}</p>}

        <GradientButton onClick={confirmBooking} disabled={booking}>
          {booking ? 'UPLOADING & SUBMITTING…' : 'REQUEST APPOINTMENT'}
        </GradientButton>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 8 }}>
          The artist will confirm your appointment shortly.
        </p>
      </div>
    </div>
  )
}
