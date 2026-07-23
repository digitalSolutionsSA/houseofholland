import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';
import BookingCalendar from '../components/BookingCalendar';
import ArtistPortrait from '../components/ArtistPortrait';
import { artists } from '../data/artists';
import { tattooTypes, getTattooType, getSlots } from '../data/booking';
import './Booking.css';

export default function Booking() {
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('artist') ?? '';

  const [artistSlug, setArtistSlug] = useState(preselected);
  const [tattooTypeId, setTattooTypeId] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const tattooType = getTattooType(tattooTypeId);
  const sessionHours = tattooType?.hours ?? 1;

  const slots = useMemo(() => {
    if (!artistSlug || !selectedDate) return [];
    return getSlots(artistSlug, selectedDate, sessionHours);
  }, [artistSlug, selectedDate, sessionHours]);

  const recommendedSlot = useMemo(
    () => slots.find((s) => s.available) ?? null,
    [slots],
  );

  const artist = artists.find((a) => a.slug === artistSlug);
  const canSubmit = artistSlug && tattooTypeId && selectedDate && selectedHour !== null;

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedHour(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) setSubmitted(true);
  };

  const formatPrice = (p: number) => (p === 0 ? 'Quote on consultation' : `From $${p.toLocaleString()}`);
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const display = h > 12 ? h - 12 : h;
    return `${display}:00 ${period}`;
  };

  return (
    <>
      <Navbar />
      <section className="booking">
        <div className="booking__main">
          <ScrollReveal as="h1" className="booking__heading">
            <span className="text-white">BOOK YOUR </span>
            <span className="text-red">SESSION.</span>
          </ScrollReveal>

          {submitted ? (
            <div className="booking__confirmation">
              <h2>Booking request sent.</h2>
              <p>
                {artist?.name} — {tattooType?.label}
                <br />
                {selectedDate && formatDate(selectedDate)}
                {selectedHour !== null && ` at ${formatHour(selectedHour)}`}
                <br />
                <span className="text-red">{tattooType && formatPrice(tattooType.price)}</span>
              </p>
              <p className="booking__confirmation-note">
                We'll email you to confirm your deposit and lock in the slot.
              </p>
            </div>
          ) : (
            <form className="booking__grid" onSubmit={handleSubmit}>
              {/* Left column: artist + session details */}
              <div className="booking__col">
                <div className="booking__field">
                  <span className="booking__label">ARTIST</span>
                  <div className="booking__artists">
                    {artists.map((a) => (
                      <button
                        key={a.slug}
                        type="button"
                        className={[
                          'booking__artist',
                          artistSlug === a.slug ? 'booking__artist--active' : '',
                        ].join(' ')}
                        onClick={() => setArtistSlug(a.slug)}
                        aria-pressed={artistSlug === a.slug}
                      >
                        <span className="booking__artist-photo">
                          <ArtistPortrait portrait={a.portrait} alt={a.name} fill />
                        </span>
                        <span className="booking__artist-name">{a.name}</span>
                        <span className="booking__artist-style">{a.specialty}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="booking__field">
                  <span className="booking__label">SESSION DETAILS</span>
                  <select
                    value={tattooTypeId}
                    onChange={(e) => {
                      setTattooTypeId(e.target.value);
                      setSelectedHour(null);
                    }}
                    required
                  >
                    <option value="" disabled>
                      What are you getting?
                    </option>
                    {tattooTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                {tattooType && (
                  <div className="booking__estimate">
                    <div>
                      <span className="booking__estimate-label">Est. duration</span>
                      <span className="booking__estimate-value">
                        {tattooType.hours} {tattooType.hours === 1 ? 'hour' : 'hours'}
                      </span>
                    </div>
                    <div>
                      <span className="booking__estimate-label">Starting price</span>
                      <span className="booking__estimate-value text-red">
                        {formatPrice(tattooType.price)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: calendar + slots */}
              <div className="booking__col">
                <span className="booking__label">AVAILABLE DATES</span>
                <BookingCalendar selected={selectedDate} onSelect={handleSelectDate} />

                {selectedDate && (
                  <div className="booking__slots">
                    <span className="booking__label">
                      TIMESLOTS — {formatDate(selectedDate)}
                    </span>
                    {!tattooTypeId ? (
                      <p className="booking__hint">Pick a session type first to see slots that fit.</p>
                    ) : slots.length === 0 ? (
                      <p className="booking__hint">No slots fit this session on that day.</p>
                    ) : (
                      <div className="booking__slot-grid">
                        {slots.map((slot) => (
                          <button
                            key={slot.hour}
                            type="button"
                            disabled={!slot.available}
                            className={[
                              'booking__slot',
                              !slot.available ? 'booking__slot--booked' : '',
                              selectedHour === slot.hour ? 'booking__slot--selected' : '',
                            ].join(' ')}
                            onClick={() => setSelectedHour(slot.hour)}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Full-width recommendation + submit */}
              <div className="booking__footer-row">
                {recommendedSlot && tattooType && selectedHour === null && (
                  <p className="booking__recommend">
                    Recommended: <strong>{recommendedSlot.label}</strong> on{' '}
                    {selectedDate && formatDate(selectedDate)} ·{' '}
                    <span className="text-red">{formatPrice(tattooType.price)}</span>
                  </p>
                )}
                {selectedHour !== null && tattooType && (
                  <p className="booking__recommend">
                    Selected: <strong>{formatHour(selectedHour)}</strong> ·{' '}
                    <span className="text-red">{formatPrice(tattooType.price)}</span>
                  </p>
                )}

                <button type="submit" className="booking__submit" disabled={!canSubmit}>
                  CONFIRM BOOKING
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
