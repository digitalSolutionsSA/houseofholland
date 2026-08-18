export const STUDIO_TZ = 'Africa/Johannesburg'

export function studioHour(): number {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: STUDIO_TZ })
  ).getHours()
}

export function isStudioToday(iso: string): boolean {
  const d = new Date(iso).toDateString()
  const today = new Date(
    new Date().toLocaleString('en-US', { timeZone: STUDIO_TZ })
  ).toDateString()
  return d === today
}

export function isStudioTomorrow(iso: string): boolean {
  const tomorrow = new Date(
    new Date().toLocaleString('en-US', { timeZone: STUDIO_TZ })
  )
  tomorrow.setDate(tomorrow.getDate() + 1)
  return new Date(iso).toDateString() === tomorrow.toDateString()
}

export function studioMidnightUTC(offsetDays = 0): Date {
  const d = new Date(
    new Date().toLocaleString('en-US', { timeZone: STUDIO_TZ })
  )
  d.setDate(d.getDate() + offsetDays)
  d.setHours(0, 0, 0, 0)
  return d
}

export function studioSlotKey(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: STUDIO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
