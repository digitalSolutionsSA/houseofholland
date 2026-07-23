import { useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArtistPortrait from '../components/ArtistPortrait';
import ScrollReveal from '../components/ScrollReveal';
import { getArtistBySlug } from '../data/artists';
import './ArtistProfile.css';

export default function ArtistProfile() {
  const { slug } = useParams();
  const artist = getArtistBySlug(slug);
  const navigate = useNavigate();

  const [dates, setDates] = useState('');
  const [details, setDetails] = useState('');

  if (!artist) return <Navigate to="/artists" replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/booking?artist=${artist.slug}`, { state: { dates, details } });
  };

  const [first, ...rest] = artist.name.split(' ');
  const last = rest.join(' ');

  return (
    <>
      <Navbar />
      <section className="artist-profile">
        <div className="artist-profile__content">
          <ScrollReveal as="h1" className="artist-profile__heading">
            <span className="text-white">{first} </span>
            <span className="text-red">{last}</span>
          </ScrollReveal>

          <p className="artist-profile__specialty">{artist.specialty}</p>
          <p className="artist-profile__bio">{artist.bio}</p>

          <ScrollReveal as="form" className="artist-profile__form" onSubmit={handleSubmit}>
            <div className="artist-profile__row">
              <label>
                <span>AVAILABLE DATES</span>
                <textarea
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="A few dates/times that work for you"
                />
              </label>
              <label>
                <span>SESSION DETAILS</span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Placement, size, style..."
                />
              </label>
            </div>

            <div className="artist-profile__ctas">
              <button type="submit" className="artist-profile__cta artist-profile__cta--red">
                CONFIRM BOOKING
              </button>
              <Link to="/artists" className="artist-profile__cta artist-profile__cta--outline">
                ALL ARTISTS
              </Link>
            </div>
          </ScrollReveal>
        </div>

        <div className="artist-profile__photo">
          <ArtistPortrait portrait={artist.portrait} alt={artist.name} fill />
        </div>
      </section>
      <Footer />
    </>
  );
}
