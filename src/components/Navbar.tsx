import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../assets/images/logo.png';
import './Navbar.css';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="navbar">
      <button
        type="button"
        className="navbar__hamburger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={26} /> : <Menu size={26} />}
      </button>

      <nav className="navbar__links navbar__links--left">
        <Link to="/">HOME</Link>
        <a href="/#since-day-one">ABOUT</a>
        <Link to="/artists">ARTISTS</Link>
        <a href="/#gallery">GALLERY</a>
      </nav>

      <Link to="/" className="navbar__logo">
        <img src={logo} alt="House of Holland Tattoo Emporium" />
      </Link>

      <div className="navbar__links navbar__links--right">
        <Link to="/merch" className="navbar__button navbar__button--white">
          MERCH
        </Link>
        <Link to="/booking" className="navbar__button navbar__button--red">
          BOOK
        </Link>
        <Link to="/events" className="navbar__button navbar__button--white">
          EVENTS
        </Link>
      </div>

      {/* Mobile BOOK stays visible as the primary CTA */}
      <Link to="/booking" className="navbar__book-mobile">
        BOOK
      </Link>

      {/* Full-screen mobile overlay menu */}
      <div className={`navbar__overlay ${open ? 'navbar__overlay--open' : ''}`}>
        <nav className="navbar__overlay-links">
          <Link to="/">HOME</Link>
          <a href="/#since-day-one" onClick={() => setOpen(false)}>
            ABOUT
          </a>
          <Link to="/artists">ARTISTS</Link>
          <a href="/#gallery" onClick={() => setOpen(false)}>
            GALLERY
          </a>
          <Link to="/merch">MERCH</Link>
          <Link to="/events">EVENTS</Link>
          <Link to="/booking" className="navbar__overlay-book">
            BOOK A SESSION
          </Link>
        </nav>
      </div>
    </header>
  );
}
