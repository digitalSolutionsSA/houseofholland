import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Merch = {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image_url: string | null
  stock: number
  is_active: boolean
}

const CATEGORIES = ['Apparel', 'Accessories', 'Bundles']

const EMPTY: Omit<Merch, 'id'> = {
  name: '', description: '', price: 0, category: 'Apparel', image_url: null, stock: 0, is_active: true,
}

export function AdminMerch() {
  const [items, setItems] = useState<Merch[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Omit<Merch, 'id'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('merch').select('*').order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm(EMPTY); setImageFile(null); setError(null); setEditId(null); setModal('add') }
  function openEdit(m: Merch) {
    setForm({ name: m.name, description: m.description ?? '', price: m.price, category: m.category, image_url: m.image_url, stock: m.stock, is_active: m.is_active })
    setImageFile(null); setError(null); setEditId(m.id); setModal('edit')
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)

    let image_url = form.image_url
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `merch/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('merch-images').upload(path, imageFile, { upsert: true })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('merch-images').getPublicUrl(path)
      image_url = urlData.publicUrl
    }

    const payload = { ...form, image_url, price: Number(form.price), stock: Number(form.stock) }

    if (modal === 'add') {
      const { error: err } = await supabase.from('merch').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('merch').update(payload).eq('id', editId!)
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false); setModal(null); load()
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await supabase.from('merch').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Merch</h1>
        <button className="admin-btn admin-btn--primary" onClick={openAdd}>
          <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
          Add Item
        </button>
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="admin-empty">No merch yet. Add an item above.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.image_url
                    ? <img src={m.image_url} className="admin-table__img" alt="" />
                    : <div className="admin-table__img--empty" />}
                </td>
                <td>{m.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{m.category}</td>
                <td>${Number(m.price).toFixed(2)}</td>
                <td>{m.stock}</td>
                <td>
                  <span className={`admin-badge admin-badge--${m.is_active ? 'active' : 'inactive'}`}>
                    {m.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-btn admin-btn--ghost" onClick={() => openEdit(m)}><Pencil size={13} /></button>
                    <button className="admin-btn admin-btn--danger" onClick={() => remove(m.id, m.name)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">{modal === 'add' ? 'Add Merch Item' : 'Edit Merch Item'}</h2>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Name *</label>
              <input className="admin-modal__input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Description</label>
              <textarea className="admin-modal__textarea" value={form.description ?? ''} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Price ($) *</label>
                <input className="admin-modal__input" type="number" min="0" step="0.01" value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Stock</label>
                <input className="admin-modal__input" type="number" min="0" value={form.stock}
                  onChange={(e) => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Category</label>
              <select className="admin-modal__select" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Product Image</label>
              {form.image_url && !imageFile && (
                <img src={form.image_url} alt="" style={{ width: 72, height: 72, borderRadius: 6, objectFit: 'cover', marginBottom: 8, border: '1px solid var(--border-gold)' }} />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gold)', fontSize: '0.85rem' }}>
                <Upload size={15} />
                {imageFile ? imageFile.name : 'Choose image…'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Visibility</label>
              <select className="admin-modal__select" value={form.is_active ? 'true' : 'false'}
                onChange={(e) => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                <option value="true">Active (visible to public)</option>
                <option value="false">Hidden</option>
              </select>
            </div>

            {error && <p className="admin-modal__error">{error}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
