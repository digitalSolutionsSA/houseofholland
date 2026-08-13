import { useNavigate } from 'react-router-dom'
import { Eye, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function CustomerViewBanner() {
  const { customerViewMode, toggleCustomerView } = useAuth()
  const navigate = useNavigate()

  if (!customerViewMode) return null

  function exit() {
    toggleCustomerView()
    navigate('/admin')
  }

  return (
    <>
      {/* Top banner */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #92400e, #b45309, #92400e)',
        borderBottom: '1px solid #f59e0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye size={14} strokeWidth={2} style={{ color: '#fcd34d', flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fcd34d', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Dev mode — Customer View
          </span>
          <span style={{ fontSize: '0.68rem', color: 'rgba(253,211,77,0.7)' }}>
            You're seeing what a customer sees
          </span>
        </div>
        <button
          onClick={exit}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 6,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(253,211,77,0.4)',
            color: '#fcd34d', fontSize: '0.7rem', fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, letterSpacing: '0.04em',
          }}
        >
          <X size={11} strokeWidth={2.5} />
          Exit
        </button>
      </div>

      {/* Spacer so page content isn't hidden behind the banner */}
      <div style={{ height: 33, flexShrink: 0 }} />
    </>
  )
}
