// All times are relative to the studio's physical location: Greenville, SC
export const STUDIO_TZ = 'America/New_York'

function etDateISO(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ }).format(d)
}

// Current hour in studio timezone (0–23), used for greeting
export function studioHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: STUDIO_TZ }).format(new Date()),
    10,
  )
}

// Check whether an ISO timestamp falls on today / tomorrow in studio timezone
export function isStudioToday(iso: string): boolean {
  return etDateISO(new Date(iso)) === etDateISO(new Date())
}

export function isStudioTomorrow(iso: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return etDateISO(new Date(iso)) === etDateISO(tomorrow)
}

// UTC ISO string for midnight of the studio day (with optional day offset).
// Used as a Supabase query lower-bound so we only fetch today/future appointments.
export function studioMidnightUTC(offsetDays = 0): string {
  const target = new Date()
  if (offsetDays) target.setDate(target.getDate() + offsetDays)
  const etDate = etDateISO(target)                    // "YYYY-MM-DD"
  const [y, m, d] = etDate.split('-').map(Number)
  // ET is UTC-4 (EDT summer) or UTC-5 (EST winter); probe both
  const edt = new Date(Date.UTC(y, m - 1, d, 4, 0, 0))
  if (etDateISO(edt) === etDate) return edt.toISOString()
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0)).toISOString()
}

// Returns "HH:MM" in studio timezone — for comparing against schedule slot strings
export function studioSlotKey(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: STUDIO_TZ })
    .slice(0, 5)
}
