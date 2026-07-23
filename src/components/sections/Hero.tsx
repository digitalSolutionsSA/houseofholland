import { Link } from 'react-router-dom';
import InkParticles from '../InkParticles';
import FlashlightReveal from '../FlashlightReveal';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <InkParticles />

      <h1 className="visually-hidden">Ink built to outlast the trend</h1>

      <FlashlightReveal
        className="hero__photo"
        imgClassName="hero__image"
        base="/Graphics/hero.webp"
        baseAlt="Ink built to outlast the trend — tattoo artist mid-session, back piece visible"
        reveal="/Graphics/hero-alternative.webp"
        revealAlt="Ink built to outlast the trend, headline in front of the artist"
        radius={220}
      />

      <Link to="/merch" className="hero__cta hero__cta--merch">
        VIEW MERCH
      </Link>
      <Link to="/booking" className="hero__cta hero__cta--book">
        BOOKINGS
      </Link>
    </section>
  );
}
