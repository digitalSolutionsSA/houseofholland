import { Link } from 'react-router-dom';
import { artists } from '../../data/artists';
import ArtistPortrait from '../ArtistPortrait';
import ScrollReveal from '../ScrollReveal';
import './ArtistsGrid.css';

export default function ArtistsGrid() {
  return (
    <ScrollReveal as="div" className="artists-grid" stagger={0.08} y={40}>
      {artists.map((artist) => (
        <div key={artist.slug} className="artists-grid__card">
          <div className="artists-grid__photo">
            <ArtistPortrait portrait={artist.portrait} alt={artist.name} fill />

            <div className="artists-grid__gallery" aria-hidden="true">
              <span className="artists-grid__gallery-label">RECENT WORK</span>
              <div className="artists-grid__gallery-grid">
                {artist.artwork.map((src, i) => (
                  <img key={i} src={src} alt="" loading="lazy" decoding="async" />
                ))}
              </div>
            </div>
          </div>

          <h3>{artist.name}</h3>
          <p className="artists-grid__style text-red">{artist.specialty}</p>
          <p className="artists-grid__bio">{artist.bio}</p>

          <Link to={`/artists/${artist.slug}`} className="artists-grid__book">
            BOOK {artist.name.split(' ')[0].toUpperCase()}
          </Link>
        </div>
      ))}
    </ScrollReveal>
  );
}
