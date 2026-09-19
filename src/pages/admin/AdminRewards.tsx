import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Upload, ShieldOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// Only these two accounts may manage loyalty rewards (mirrors is_rewards_admin() in the DB)
const REWARD_ADMINS = ['info@digitalsolutionssa.co.za', 'armand@hohtattoos.com']

type Reward = {
  id: string
  tier: number
  name: string
  description: string | null
  points_required: number
  quantity_total: number
  quantity_claimed: number
  image_url: string | null
  is_active: boolean
  sort_order: number
}

const EMPTY = { tier: 1, name: '', description: '', points_required: 100, quantity_total: 50, image_url: null as string | null, is_active: true }

export function AdminRewards() {
  const { profile } = useAuth()
  const allowed = REWARD_ADMINS.includes((profile?.email ?? '').toLowerCase())

  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (allowed) load() }, [allowed])

  async function load() {
    const { data } = await supabase.from('battle_pass_rewards').select('*').order('points_required')
    setRewards((data as Reward[]) ?? [])
    setLoading(false)
  }

  function openAdd() {
    const nextTier = Math.max(0, ...rewards.map(r => r.tier)) + 1
    setForm({ ...EMPTY, tier: nextTier }); setImageFile(null); setEditId(null); setError(null); setModal('add')
  }

  function openEdit(r: Reward) {
    setForm({ tier: r.tier, name: r.name, description: r.description ?? '', points_required: r.points_required, quantity_total: r.quantity_total, image_url: r.image_url, is_active: r.is_active })
    setImageFile(null); setEditId(r.id); setError(null); setModal('edit')
  }

  async function save() {
    if (!form.name.trim()) { setError('Reward name is required.'); return }
    if (!(form.points_required > 0)) { setError('Points needed must be greater than 0.'); return }
    setSaving(true); setError(null)

    let image_url = form.image_url
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('reward-images').upload(path, imageFile, { upsert: false })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      image_url = supabase.storage.from('reward-images').getPublicUrl(path).data.publicUrl
    }

    const payload = {
      tier: form.tier,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      points_required: form.points_required,
      quantity_total: form.quantity_total,
      image_url,
      is_active: form.is_active,
      sort_order: form.points_required,
    }
    const res = modal === 'edit' && editId
      ? await supabase.from('battle_pass_rewards').update(payload).eq('id', editId)
      : await supabase.from('battle_pass_rewards').insert({ ...payload, quantity_claimed: 0 })

    if (res.error) { setError(res.error.message); setSaving(false); return }
    setSaving(false); setModal(null); load()
  }

  async function remove(r: Reward) {
    if (!confirm(`Delete "${r.name}"? Members who already claimed it keep their claim history only if it has no claims.`)) return
    const { error: err } = await supabase.from('battle_pass_rewards').delete().eq('id', r.id)
    if (err) alert(err.message.includes('foreign key') ? 'This reward has been claimed — untick "Active" to hide it instead.' : err.message)
    else load()
  }

  if (!allowed) return (
    <div className="admin-page__access-denied">
      <ShieldOff size={40} strokeWidth={1.2} />
      <p>Access restricted.</p>
    </div>
  )

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Loyalty Rewards</h1>
        <button className="admin-btn admin-btn--primary" onClick={openAdd}><Plus size={14} /> Add Reward</button>
      </div>

      {loading ? <p className="admin-empty">Loading…</p> : rewards.length === 0 ? <p className="admin-empty">No rewards yet.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {rewards.map(r => (
            <div key={r.id} className="admin-stat" style={{ textAlign: 'left', opacity: r.is_active ? 1 : 0.5 }}>
              {r.image_url
                ? <img src={r.image_url} alt={r.name} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
                : <div style={{ height: 150, borderRadius: 8, marginBottom: 10, background: 'rgba(255,255,255,0.04)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No photo</div>}
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--gold)' }}>TIER {r.tier} · {r.points_required} PTS</div>
              <div style={{ fontWeight: 700, margin: '4px 0' }}>{r.name}</div>
              {r.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.description}</div>}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '8px 0' }}>{r.quantity_claimed} / {r.quantity_total} claimed{!r.is_active && ' · hidden'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="admin-btn" onClick={() => openEdit(r)}><Pencil size={13} /> Edit</button>
                <button className="admin-btn" onClick={() => remove(r)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">{modal === 'add' ? 'Add Reward' : 'Edit Reward'}</h2>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Reward name *</label>
              <input className="admin-modal__input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="admin-modal__field">
              <label className="admin-modal__label">Description</label>
              <textarea className="admin-modal__textarea" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Tier #</label>
                <input className="admin-modal__input" type="number" min="1" value={form.tier} onChange={e => setForm(f => ({ ...f, tier: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Points needed *</label>
                <input className="admin-modal__input" type="number" min="1" value={form.points_required} onChange={e => setForm(f => ({ ...f, points_required: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Quantity</label>
                <input className="admin-modal__input" type="number" min="0" value={form.quantity_total} onChange={e => setForm(f => ({ ...f, quantity_total: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="admin-modal__field">
              <label className="admin-modal__label">Product photo</label>
              {(imageFile || form.image_url) && (
                <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url!} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
              )}
              <label className="admin-btn" style={{ cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <Upload size={14} /> {imageFile || form.image_url ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem', margin: '8px 0' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active (visible to members)
            </label>

            {error && <p style={{ color: '#ff6b6b', fontSize: '0.82rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="admin-btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
