import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';
import { merchItems, formatMerchPrice } from '../data/merch';
import './Merch.css';

export default function Merch() {
  return (
    <>
      <Navbar />
      <section className="merch">
        <div className="merch__main">
          <ScrollReveal as="h1" className="merch__heading">
            <span className="text-white">SHOP </span>
            <span className="text-red">MERCH.</span>
          </ScrollReveal>

          <ScrollReveal as="p" className="merch__intro">
            Studio-branded apparel, aftercare, and accessories — available in-shop or
            pick up with your next session.
          </ScrollReveal>

          <ScrollReveal as="div" className="merch__grid" stagger={0.08} y={40}>
            {merchItems.map((item) => (
              <article key={item.id} className="merch__card">
                <div className="merch__photo">
                  <img src={item.image} alt={item.name} />
                  {item.soldOut && <span className="merch__badge">SOLD OUT</span>}
                </div>

                <span className="merch__category text-red">{item.category}</span>
                <h3>{item.name}</h3>
                <p className="merch__description">{item.description}</p>
                <span className="merch__price">{formatMerchPrice(item.price)}</span>

                <button
                  type="button"
                  className="merch__cta"
                  disabled={item.soldOut}
                  aria-disabled={item.soldOut}
                >
                  {item.soldOut ? 'UNAVAILABLE' : 'INQUIRE IN SHOP'}
                </button>
              </article>
            ))}
          </ScrollReveal>

          <ScrollReveal as="div" className="merch__banner">
            <p className="merch__banner-text">
              All merch is sold in-studio. Ask your artist at your next appointment or
              stop by during studio hours.
            </p>
            <Link to="/events" className="merch__banner-cta merch__banner-cta--outline">
              UPCOMING EVENTS
            </Link>
          </ScrollReveal>
        </div>
      </section>
      <Footer />
    </>
  );
}
