// ---------------------------------------------------------------------------
// Tattoo types: each drives an estimated session length + price, and (from the
// duration) which timeslots can fit and what gets recommended.
// TODO(client): confirm real pricing — these are placeholder starting figures.
// ---------------------------------------------------------------------------
export interface TattooType {
  id: string;
  label: string;
  /** Estimated session length in hours (used to fit timeslots). */
  hours: number;
  /** Starting price in USD. */
  price: number;
  /** Whether it typically needs a full-day booking. */
  fullDay?: boolean;
}

export const tattooTypes: TattooType[] = [
  { id: 'small', label: 'Small tattoo (under 2 hours)', hours: 2, price: 150 },
  { id: 'medium', label: 'Medium tattoo (2–4 hours)', hours: 3, price: 350 },
  { id: 'half-sleeve-arm', label: 'Half sleeve — arm', hours: 4, price: 600 },
  { id: 'full-sleeve-arm', label: 'Full sleeve — arm', hours: 7, price: 1200, fullDay: true },
  { id: 'half-sleeve-leg', label: 'Half sleeve — leg', hours: 5, price: 700 },
  { id: 'full-sleeve-leg', label: 'Full sleeve — leg', hours: 7, price: 1400, fullDay: true },
  { id: 'back-small', label: 'Back piece — small', hours: 3, price: 450 },
  { id: 'back-half', label: 'Back piece — half', hours: 5, price: 900 },
  { id: 'back-full', label: 'Back piece — full', hours: 8, price: 2500, fullDay: true },
  { id: 'chest', label: 'Chest piece', hours: 5, price: 800 },
  { id: 'custom', label: 'Custom / consultation', hours: 1, price: 0 },
];

export const getTattooType = (id: string) => tattooTypes.find((t) => t.id === id);

// Studio hours by weekday (0 = Sunday). null = closed.
// Matches the hours shown in the footer.
const studioHours: (readonly [number, number] | null)[] = [
  null, // Sun
  null, // Mon
  [11, 19], // Tue
  [11, 19], // Wed
  [11, 19], // Thu
  [11, 20], // Fri
  [11, 20], // Sat
];

export function isStudioOpen(date: Date): boolean {
  return studioHours[date.getDay()] !== null;
}

export interface Slot {
  /** e.g. "11:00 AM" */
  label: string;
  /** 24h start hour */
  hour: number;
  available: boolean;
}

// Deterministic pseudo-random so a given artist+date always shows the same
// availability (no flicker between renders) without a backend.
function seededBooked(seed: string, hour: number): boolean {
  let h = 0;
  const s = `${seed}-${hour}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 10 < 3; // ~30% of slots already booked
}

/**
 * Generate the timeslots for a given artist on a given date, considering the
 * session length so a slot only shows if the full session fits before closing.
 */
export function getSlots(artistSlug: string, date: Date, sessionHours: number): Slot[] {
  const hours = studioHours[date.getDay()];
  if (!hours) return [];
  const [open, close] = hours;
  const dateKey = date.toISOString().slice(0, 10);
  const slots: Slot[] = [];

  const step = sessionHours >= 6 ? sessionHours : 1;
  for (let hour = open; hour + sessionHours <= close; hour += step) {
    const booked = seededBooked(`${artistSlug}-${dateKey}`, hour);
    const period = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour;
    slots.push({ label: `${display}:00 ${period}`, hour, available: !booked });
  }
  return slots;
}
