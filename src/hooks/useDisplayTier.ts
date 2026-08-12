import { useState, useEffect } from 'react'

export function useDisplayTier() {
  const [tier, setTier] = useState(
    () => document.documentElement.dataset.tier ?? 'black-card'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTier(document.documentElement.dataset.tier ?? 'black-card')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tier'] })
    return () => obs.disconnect()
  }, [])
  return tier
}
