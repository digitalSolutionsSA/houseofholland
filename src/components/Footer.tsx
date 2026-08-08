import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import FlashlightReveal from './FlashlightReveal';
import './Footer.css';

const hours = [
  { day: 'SUNDAY', time: 'CLOSED', closed: true },
  { day: 'MONDAY', time: 'CLOSED', closed: true },
  { day: 'TUESDAY', time: '11:00 AM – 7:00 PM' },
  { day: 'WEDNESDAY', time: '11:00 AM – 7:00 PM' },
  { day: 'THURSDAY', time: '11:00 AM – 7:00 PM' },
  { day: 'FRIDAY', time: '11:00 AM – 8:00 PM' },
  { day: 'SATURDAY', time: '11:00 AM – 8:00 PM' },
];

export default function Footer() {
  return (
    <footer className="footer" id="visit">
      <FlashlightReveal
        className="footer__bg"
        imgClassName="footer__bg-img"
        base="/Graphics/footer.webp"
        baseAlt="House of Holland Tattoo Emporium"
        reveal="/Graphics/footer-alternative.webp"
        revealAlt="House of Holland Tattoo Emporium"
        loading="lazy"
        radius={240}
      />

      <div className="footer__content">
        <h2 className="footer__heading">
          READY WHEN <span className="text-red">YOU ARE</span>
        </h2>

        <div className="footer__hours">
          <h3>STUDIO HOURS</h3>
          <ul>
            {hours.map((h) => (
              <li key={h.day}>
                <span>{h.day}</span>
                <span className={h.closed ? 'text-red' : ''}>{h.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__visit">
          <h3>VISIT US</h3>
          <p className="footer__row">
            <MapPin size={22} />
            221 Pelham Road
            <br />
            Greenville, SC 29615
          </p>
          <a className="footer__row footer__phone" href="tel:+18645496761">
            <Phone size={22} />
            +1 864-549-6761
          </a>
          <p className="footer__row">
            <Mail size={22} />
            info@houseofhollandtattoos.com
          </p>
        </div>

        <div className="footer__explore">
          <h3>EXPLORE</h3>
          <nav>
            <Link to="/artists">our artists</Link>
            <a href="/#gallery">gallery</a>
            <Link to="/booking" className="text-red">
              book a session
            </Link>
            <Link to="/events">events</Link>
            <Link to="/merch">merch shop</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
