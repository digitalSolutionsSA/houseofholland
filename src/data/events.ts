export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  featured?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}

export const upcomingEvents: Event[] = [
  {
    id: 'flash-day-march',
    title: 'Flash Day — $150 Pieces',
    date: '2026-03-15',
    time: '11:00 AM – 8:00 PM',
    location: 'House of Holland, Greenville SC',
    description:
      'Walk-ins welcome. Pre-drawn flash sheets from all seven artists — first come, first served. One design per person.',
    featured: true,
    ctaLabel: 'VIEW FLASH SHEET',
    ctaHref: '/booking',
  },
  {
    id: 'guest-artist-week',
    title: 'Guest Artist Week',
    date: '2026-04-07',
    time: 'Apr 7 – Apr 13',
    location: 'House of Holland, Greenville SC',
    description:
      'International guest artist in residence for one week only. Bookings open two weeks prior — spots go fast.',
    ctaLabel: 'BOOK A SLOT',
    ctaHref: '/booking',
  },
  {
    id: 'charity-tattoo-day',
    title: 'Charity Tattoo Day',
    date: '2026-05-10',
    time: '12:00 PM – 6:00 PM',
    location: 'House of Holland, Greenville SC',
    description:
      'All proceeds from flash tattoos go to local animal rescue. $100 minimum donation per piece.',
    ctaLabel: 'LEARN MORE',
    ctaHref: 'mailto:info@houseofhollandtattoos.com',
  },
  {
    id: 'open-house',
    title: 'Studio Open House',
    date: '2026-06-21',
    time: '2:00 PM – 5:00 PM',
    location: 'House of Holland, Greenville SC',
    description:
      'Meet the artists, tour the studio, and browse new merch. Free entry — no appointment needed.',
    ctaLabel: 'GET DIRECTIONS',
    ctaHref: 'https://maps.google.com/?q=221+Pelham+Road+Greenville+SC+29615',
  },
];

export function formatEventDate(isoDate: string) {
  const date = new Date(isoDate + 'T12:00:00');
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate().toString(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  };
}
