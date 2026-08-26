import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Users, ImagePlus, X, CalendarDays, Clock, ListOrdered } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type FlashEvent = {
  id: string
  title: string
  description: string | null
  date: string
  start_time: string
  end_time: string
  status: 'upcoming' | 'open' | 'closed'
  max_spots: number
  cover_image_url: string | null
  total_designs: number | null
  artistIds: string[]
  guestArtistIds: string[]
}

type Artist      = { id: string; name: string; avatar_url: string | null }
type GuestArtist = { id: string; name: string; avatar_url: string | null; specialty: string | null }

type FormState = {
  title: string; description: string; date: string
  start_time: string; end_time: string
  status: FlashEvent['status']; max_spots: number
}

const EMPTY_FORM: FormState = {
  title: '', description: '', date: '', start_time: '10:00',
  end_time: '18:00', status: 'upcoming', max_spots: 10,
}

const ACCEPTED = 'image/jpeg,image/png'
const MAX_DESIGN_IMAGES = 10

type DesignImageItem = { id?: string; url: string; file?: File }

export function AdminFlash() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'

  const [events, setEvents]             = useState<FlashEvent[]>([])
  const [artists, setArtists]           = useState<Artist[]>([])
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'add' | 'edit' | null>(null)
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM)
  const [selectedArtists, setSelectedArtists]           = useState<string[]>([])
  const [selectedGuestArtists, setSelectedGuestArtists] = useState<string[]>([])
  const [editId, setEditId]             = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)

  // Cover image state
  const [coverFile, setCoverFile]       = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)  // object URL or existing URL
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null)
  const [coverError, setCoverError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Flash design images (up to 10, shown to customers to choose from)
  const [designImages, setDesignImages] = useState<DesignImageItem[]>([])
  const [designError, setDesignError]   = useState<string | null>(null)
  const designInputRef = useRef<HTMLInputElement>(null)
  const [totalDesigns, setTotalDesigns] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: ev }, { data: ar }, { data: ga }, { data: junc }, { data: gjunc }] = await Promise.all([
      supabase.from('flash_events').select('*').order('date', { ascending: false }),
      supabase.from('artists').select('id, name, avatar_url').eq('is_active', true).order('name'),
      supabase.from('guest_artists').select('id, name, avatar_url, specialty').eq('is_active', true).order('name'),
      supabase.from('flash_event_artists').select('flash_event_id, artist_id'),
      supabase.from('flash_event_guest_artists').select('flash_event_id, guest_artist_id'),
    ])

    const juncMap: Record<string, string[]>  = {}
    const gjuncMap: Record<string, string[]> = {}
    for (const row of junc  ?? []) { if (!juncMap[row.flash_event_id])  juncMap[row.flash_event_id]  = []; juncMap[row.flash_event_id].push(row.artist_id) }
    for (const row of gjunc ?? []) { if (!gjuncMap[row.flash_event_id]) gjuncMap[row.flash_event_id] = []; gjuncMap[row.flash_event_id].push(row.guest_artist_id) }

    setEvents((ev ?? []).map(e => ({ ...e, artistIds: juncMap[e.id] ?? [], guestArtistIds: gjuncMap[e.id] ?? [] })))
    setArtists(ar ?? [])
    setGuestArtists(ga ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetCover() {
    setCoverFile(null)
    setCoverPreview(null)
    setExistingCoverUrl(null)
    setCoverError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setSelectedArtists([]); setSelectedGuestArtists([])
    setError(null); setEditId(null)
    resetCover()
    setDesignImages([]); setDesignError(null)
    setTotalDesigns('')
    if (designInputRef.current) designInputRef.current.value = ''
    setModal('add')
  }

  async function openEdit(ev: FlashEvent) {
    setForm({
      title: ev.title, description: ev.description ?? '',
      date: ev.date, start_time: ev.start_time, end_time: ev.end_time,
      status: ev.status, max_spots: ev.max_spots,
    })
    setSelectedArtists(ev.artistIds)
    setSelectedGuestArtists(ev.guestArtistIds)
    setError(null); setEditId(ev.id)
    setCoverFile(null)
    setCoverError(null)
    setExistingCoverUrl(ev.cover_image_url)
    setCoverPreview(ev.cover_image_url)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setDesignError(null)
    setTotalDesigns(ev.total_designs != null ? String(ev.total_designs) : '')
    if (designInputRef.current) designInputRef.current.value = ''
    setModal('edit')

    const { data: images } = await supabase
      .from('flash_event_images')
      .select('id, image_url, position')
      .eq('flash_event_id', ev.id)
      .order('position', { ascending: true })
    setDesignImages((images ?? []).map(img => ({ id: img.id, url: img.image_url })))
  }

  function handleDesignFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const invalid = files.some(f => !['image/jpeg', 'image/png'].includes(f.type))
    if (invalid) {
      setDesignError('Only JPG and PNG files are accepted.')
      e.target.value = ''
      return
    }

    setDesignImages(prev => {
      const room = MAX_DESIGN_IMAGES - prev.length
      if (room <= 0) {
        setDesignError(`You can only upload up to ${MAX_DESIGN_IMAGES} designs.`)
        return prev
      }
      const accepted = files.slice(0, room)
      if (files.length > room) setDesignError(`You can only upload up to ${MAX_DESIGN_IMAGES} designs.`)
      else setDesignError(null)
      return [...prev, ...accepted.map(file => ({ url: URL.createObjectURL(file), file }))]
    })
    e.target.value = ''
  }

  function removeDesignImage(index: number) {
    setDesignImages(prev => prev.filter((_, i) => i !== index))
    setDesignError(null)
  }

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const mime = file.type
    if (!['image/jpeg', 'image/png'].includes(mime)) {
      setCoverError('Only JPG and PNG files are accepted.')
      e.target.value = ''
      return
    }

    setCoverError(null)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function removeCover() {
    setCoverFile(null)
    setCoverPreview(existingCoverUrl ? null : null)   // clear both cases
    setExistingCoverUrl(null)
    setCoverError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleArtist(id: string) {
    setSelectedArtists(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleGuest(id: string) {
    setSelectedGuestArtists(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const allArtistsSelected = artists.length > 0 && selectedArtists.length === artists.length
  function toggleAllArtists() {
    setSelectedArtists(allArtistsSelected ? [] : artists.map(a => a.id))
  }
  const allGuestsSelected = guestArtists.length > 0 && selectedGuestArtists.length === guestArtists.length
  function toggleAllGuests() {
    setSelectedGuestArtists(allGuestsSelected ? [] : guestArtists.map(a => a.id))
  }

  async function save() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.date) { setError('Date is required.'); return }
    setSaving(true); setError(null)

    // Upload cover image if a new file was selected
    let coverUrl: string | null = existingCoverUrl

    if (coverFile) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from('flash-event-covers')
        .upload(path, coverFile, { cacheControl: '3600', upsert: false })

      if (uploadErr || !uploaded) {
        setError('Failed to upload cover image: ' + (uploadErr?.message ?? 'unknown error'))
        setSaving(false); return
      }

      const { data: urlData } = supabase.storage.from('flash-event-covers').getPublicUrl(uploaded.path)
      coverUrl = urlData.publicUrl
    }

    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      status: form.status,
      max_spots: Number(form.max_spots),
      artist_id: selectedArtists[0] ?? null,
      cover_image_url: coverUrl,
      total_designs: totalDesigns.trim() ? Number(totalDesigns) : null,
    }

    let eventId = editId

    if (modal === 'add') {
      const { data, error: err } = await supabase.from('flash_events').insert(payload).select('id').single()
      if (err || !data) { setError(err?.message ?? 'Failed to save'); setSaving(false); return }
      eventId = data.id
    } else {
      const { error: err } = await supabase.from('flash_events').update(payload).eq('id', editId!)
      if (err) { setError(err.message); setSaving(false); return }
    }

    await supabase.from('flash_event_artists').delete().eq('flash_event_id', eventId!)
    if (selectedArtists.length > 0) {
      await supabase.from('flash_event_artists').insert(
        selectedArtists.map(aid => ({ flash_event_id: eventId!, artist_id: aid }))
      )
    }

    await supabase.from('flash_event_guest_artists').delete().eq('flash_event_id', eventId!)
    if (selectedGuestArtists.length > 0) {
      await supabase.from('flash_event_guest_artists').insert(
        selectedGuestArtists.map(gid => ({ flash_event_id: eventId!, guest_artist_id: gid }))
      )
    }

    // Upload any newly-added design images, then replace the event's full
    // design list so ordering/removals stay in sync with what's on screen.
    const resolvedDesignUrls: string[] = []
    for (const img of designImages) {
      if (!img.file) { resolvedDesignUrls.push(img.url); continue }
      const ext = img.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `designs/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from('flash-event-covers')
        .upload(path, img.file, { cacheControl: '3600', upsert: false })

      if (uploadErr || !uploaded) {
        setError('Failed to upload a design image: ' + (uploadErr?.message ?? 'unknown error'))
        setSaving(false); return
      }
      const { data: urlData } = supabase.storage.from('flash-event-covers').getPublicUrl(uploaded.path)
      resolvedDesignUrls.push(urlData.publicUrl)
    }

    await supabase.from('flash_event_images').delete().eq('flash_event_id', eventId!)
    if (resolvedDesignUrls.length > 0) {
      await supabase.from('flash_event_images').insert(
        resolvedDesignUrls.map((url, i) => ({ flash_event_id: eventId!, image_url: url, position: i + 1 }))
      )
    }

    setSaving(false); setModal(null); load()
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await supabase.from('flash_events').delete().eq('id', id)
    load()
  }

  function lineupFor(ev: FlashEvent): { id: string; name: string; avatar_url: string | null }[] {
    const residents = ev.artistIds.map(id => artists.find(a => a.id === id)).filter(Boolean) as Artist[]
    const guests = ev.guestArtistIds.map(id => guestArtists.find(a => a.id === id)).filter(Boolean) as GuestArtist[]
    return [...residents, ...guests]
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Flash Events</h1>
        {isManager && (
          <button className="admin-btn admin-btn--primary" onClick={openAdd}>
            <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
            Add Event
          </button>
        )}
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : events.length === 0 ? (
        <p className="admin-empty">{isManager ? 'No flash events yet. Add one above.' : 'No flash events yet.'}</p>
      ) : (
        <div className="flash-events-grid">
          {events.map((ev) => {
            const lineup = lineupFor(ev)
            return (
              <div key={ev.id} className="flash-event-card">
                {ev.cover_image_url ? (
                  <img src={ev.cover_image_url} alt="" className="flash-event-card__cover" />
                ) : (
                  <div className="flash-event-card__cover--empty">
                    <ImagePlus size={22} strokeWidth={1.5} />
                  </div>
                )}

                <div className="flash-event-card__body">
                  <div className="flash-event-card__top">
                    <span className="flash-event-card__title">{ev.title}</span>
                    <span className={`admin-badge admin-badge--${ev.status}`}>{ev.status}</span>
                  </div>

                  <div className="flash-event-card__meta">
                    <span className="flash-event-card__meta-item">
                      <CalendarDays size={13} strokeWidth={1.5} />
                      {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flash-event-card__meta-item">
                      <Clock size={13} strokeWidth={1.5} />
                      {ev.start_time.slice(0, 5)} – {ev.end_time.slice(0, 5)}
                    </span>
                  </div>

                  {ev.description && (
                    <p className="flash-event-card__desc">{ev.description}</p>
                  )}

                  {lineup.length > 0 ? (
                    <div className="flash-event-card__artists">
                      {lineup.map(a => (
                        <span key={a.id} className="flash-event-card__artist-chip">
                          {a.avatar_url
                            ? <img src={a.avatar_url} alt="" className="flash-event-card__artist-avatar" />
                            : <span className="flash-event-card__artist-chip--empty" />
                          }
                          {a.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="flash-event-card__no-artists">
                      <Users size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
                      No artists assigned yet
                    </p>
                  )}

                  <div className="flash-event-card__footer">
                    <span className="flash-event-card__spots"><strong>{ev.max_spots}</strong> spots</span>
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn--ghost" onClick={() => navigate(`/admin/flash/${ev.id}/queue`)}>
                        <ListOrdered size={13} style={{ display: 'inline', marginRight: 5 }} />Queue
                      </button>
                      {isManager && (
                        <>
                          <button className="admin-btn admin-btn--ghost" onClick={() => openEdit(ev)}>
                            <Pencil size={13} style={{ display: 'inline', marginRight: 5 }} />Edit
                          </button>
                          <button className="admin-btn admin-btn--danger" onClick={() => remove(ev.id, ev.title)}><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">{modal === 'add' ? 'Add Flash Event' : 'Edit Flash Event'}</h2>

            {/* ── Cover image upload ── */}
            <div className="admin-modal__field">
              <label className="admin-modal__label">
                Event Poster
                <span style={{ fontWeight: 400, color: 'var(--text-dim)', marginLeft: 6 }}>JPG or PNG</span>
              </label>

              {coverPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-gold)', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={removeCover}
                    title="Remove cover image"
                    style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Replace image
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', padding: '24px 16px', borderRadius: 10, border: '2px dashed rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.04)', cursor: 'pointer', color: 'var(--text-muted)', transition: 'border-color 0.15s, background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)')}
                >
                  <ImagePlus size={28} strokeWidth={1.5} style={{ color: 'var(--gold)', opacity: 0.7 }} />
                  <span style={{ fontSize: '0.83rem' }}>Click to upload poster</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>JPG or PNG</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                style={{ display: 'none' }}
                onChange={handleCoverFile}
              />

              {coverError && (
                <p style={{ marginTop: 6, fontSize: '0.78rem', color: '#f87171' }}>{coverError}</p>
              )}
            </div>

            {/* ── Flash designs (up to 10 sheet images) ── */}
            <div className="admin-modal__field">
              <label className="admin-modal__label">
                Flash Design Sheets
                <span style={{ fontWeight: 400, color: 'var(--text-dim)', marginLeft: 6 }}>
                  up to {MAX_DESIGN_IMAGES} images — a sheet can show multiple numbered tattoos
                </span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 8 }}>
                {designImages.map((img, i) => (
                  <div key={img.id ?? img.url} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-gold)' }}>
                    <img src={img.url} alt={`Design ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', bottom: 3, left: 3, fontSize: '0.65rem', padding: '1px 5px', borderRadius: 10, background: 'rgba(0,0,0,0.7)', color: 'var(--gold)' }}>
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDesignImage(i)}
                      title="Remove design"
                      style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}

                {designImages.length < MAX_DESIGN_IMAGES && (
                  <button
                    type="button"
                    onClick={() => designInputRef.current?.click()}
                    style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, border: '2px dashed rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.04)', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <ImagePlus size={18} strokeWidth={1.5} style={{ color: 'var(--gold)', opacity: 0.7 }} />
                    <span style={{ fontSize: '0.68rem' }}>Add</span>
                  </button>
                )}
              </div>

              <input
                ref={designInputRef}
                type="file"
                accept={ACCEPTED}
                multiple
                style={{ display: 'none' }}
                onChange={handleDesignFiles}
              />

              {designError && (
                <p style={{ marginTop: 6, fontSize: '0.78rem', color: '#f87171' }}>{designError}</p>
              )}
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">
                Number of Tattoos to Choose From
                <span style={{ fontWeight: 400, color: 'var(--text-dim)', marginLeft: 6 }}>
                  e.g. 10 — how many numbered designs across the sheets above
                </span>
              </label>
              <input
                className="admin-modal__input"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={totalDesigns}
                placeholder="e.g. 10"
                onChange={e => setTotalDesigns(e.target.value)}
              />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Title *</label>
              <input className="admin-modal__input" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Description</label>
              <textarea className="admin-modal__textarea" value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Date *</label>
              <input className="admin-modal__input" type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Start Time</label>
                <input className="admin-modal__input" type="time" value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">End Time</label>
                <input className="admin-modal__input" type="time" value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>

            <div className="admin-modal__field">
              <div className="admin-flash__list-label-row">
                <label className="admin-modal__label" style={{ marginBottom: 0 }}>Resident Artists</label>
                {artists.length > 0 && (
                  <button type="button" className="admin-flash__select-all" onClick={toggleAllArtists}>
                    {allArtistsSelected ? 'Clear all' : 'All artists'}
                  </button>
                )}
              </div>
              {artists.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active artists found.</p>
              ) : (
                <div className="admin-flash__artist-list">
                  {artists.map(a => {
                    const checked = selectedArtists.includes(a.id)
                    return (
                      <label key={a.id} className={`admin-flash__artist-row${checked ? ' admin-flash__artist-row--checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleArtist(a.id)} className="admin-flash__checkbox" />
                        {a.avatar_url && <img src={a.avatar_url} alt="" className="admin-flash__artist-avatar" />}
                        <span className="admin-flash__artist-name">{a.name}</span>
                        {checked && <span className="admin-flash__artist-tick">✓</span>}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {guestArtists.length > 0 && (
              <div className="admin-modal__field">
                <div className="admin-flash__list-label-row">
                  <label className="admin-modal__label" style={{ marginBottom: 0 }}>Guest Artists</label>
                  <button type="button" className="admin-flash__select-all" onClick={toggleAllGuests}>
                    {allGuestsSelected ? 'Clear all' : 'All guests'}
                  </button>
                </div>
                <div className="admin-flash__artist-list">
                  {guestArtists.map(a => {
                    const checked = selectedGuestArtists.includes(a.id)
                    return (
                      <label key={a.id} className={`admin-flash__artist-row${checked ? ' admin-flash__artist-row--checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleGuest(a.id)} className="admin-flash__checkbox" />
                        {a.avatar_url && <img src={a.avatar_url} alt="" className="admin-flash__artist-avatar" />}
                        <span className="admin-flash__artist-name">
                          {a.name}
                          {a.specialty && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {a.specialty}</span>}
                        </span>
                        {checked && <span className="admin-flash__artist-tick">✓</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Max Spots</label>
                <input className="admin-modal__input" type="number" inputMode="numeric" min="1" value={form.max_spots}
                  onChange={e => setForm(f => ({ ...f, max_spots: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Status</label>
                <select className="admin-modal__select" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as FlashEvent['status'] }))}>
                  <option value="upcoming">Upcoming</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {error && <p className="admin-modal__error">{error}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
