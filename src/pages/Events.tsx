import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';
import { upcomingEvents, formatEventDate } from '../data/events';
import './Events.css';

function EventCta({ label, href }: { label: string; href: string }) {
  const isExternal = href.startsWith('http') || href.startsWith('mailto:');

  if (isExternal) {
    return (
      <a
        href={href}
        className="events__cta"
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {label}
      </a>
    );
  }

  return (
    <Link to={href} className="events__cta">
      {label}
    </Link>
  );
}

export default function Events() {
  const featured = upcomingEvents.find((e) => e.featured);
  const rest = upcomingEvents.filter((e) => !e.featured);

  return (
    <>
      <Navbar />
      <section className="events">
        <div className="events__main">
          <ScrollReveal as="h1" className="events__heading">
            <span className="text-white">UPCOMING </span>
            <span className="text-red">EVENTS.</span>
          </ScrollReveal>

          <ScrollReveal as="p" className="events__intro">
            Flash days, guest artists, and studio happenings — follow along or book
            ahead before spots fill up.
          </ScrollReveal>

          {featured && (
            <ScrollReveal as="article" className="events__featured">
              <div className="events__date events__date--featured">
                <span className="events__date-month">{formatEventDate(featured.date).month}</span>
                <span className="events__date-day">{formatEventDate(featured.date).day}</span>
              </div>

              <div className="events__featured-body">
                <span className="events__label text-red">FEATURED</span>
                <h2>{featured.title}</h2>
                <p className="events__meta">
                  {formatEventDate(featured.date).full} · {featured.time}
                </p>
                <p className="events__location">{featured.location}</p>
                <p className="events__description">{featured.description}</p>
                {featured.ctaLabel && featured.ctaHref && (
                  <EventCta label={featured.ctaLabel} href={featured.ctaHref} />
                )}
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal as="div" className="events__list" stagger={0.1} y={30}>
            {rest.map((event) => {
              const { month, day, full } = formatEventDate(event.date);
              return (
                <article key={event.id} className="events__card">
                  <div className="events__date">
                    <span className="events__date-month">{month}</span>
                    <span className="events__date-day">{day}</span>
                  </div>

                  <div className="events__card-body">
                    <h3>{event.title}</h3>
                    <p className="events__meta">
                      {full} · {event.time}
                    </p>
                    <p className="events__location">{event.location}</p>
                    <p className="events__description">{event.description}</p>
                    {event.ctaLabel && event.ctaHref && (
                      <EventCta label={event.ctaLabel} href={event.ctaHref} />
                    )}
                  </div>
                </article>
              );
            })}
          </ScrollReveal>

          <ScrollReveal as="div" className="events__banner">
            <p className="events__banner-text">
              Want to host a private event or collaborate with the studio? Get in touch.
            </p>
            <a href="mailto:info@houseofhollandtattoos.com" className="events__banner-cta">
              CONTACT US
            </a>
          </ScrollReveal>
        </div>
      </section>
      <Footer />
    </>
  );
}
