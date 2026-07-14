import { Link } from 'react-router-dom';
import ScrollReveal from '../ScrollReveal';
import { getArtistBySlug } from '../../data/artists';
import './ArtistsLineup.css';

interface ArtistsLineupProps {
  showViewAll?: boolean;
}

// Left-to-right order of people as they actually appear in artists.png —
// this does NOT match the order artists are listed in data/artists.ts, so
// it's kept separate rather than derived.
const photoOrderSlugs = [
  'armand-groesbeek',
  'marcus-reid',
  'sarah-coetzee',
  'devon-blake',
  'naomi-price',
  'tyler-brooks',
  'jono-van-der-merwe',
];

export default function ArtistsLineup({ showViewAll = true }: ArtistsLineupProps) {
  return (
    <section className="artists-lineup" id="artists">
      <ScrollReveal as="h2" className="artists-lineup__heading">
        <span className="text-white">7 ARTISTS. </span>
        <span className="text-red">7 SPECIALITIES.</span>
      </ScrollReveal>

      <div className="artists-lineup__photo-wrap">
        <img
          className="artists-lineup__photo"
          src="/Graphics/artists-cropped.png"
          alt="The seven House of Holland tattoo artists"
        />

        <div className="artists-lineup__hotspots">
          {photoOrderSlugs.map((slug) => {
            const artist = getArtistBySlug(slug);
            if (!artist) return null;
            return (
              <Link
                key={slug}
                to={`/artists/${slug}`}
                className="artists-lineup__hotspot"
                aria-label={`View ${artist.name}'s profile`}
              >
                <span className="artists-lineup__hotspot-name">{artist.name}</span>
                <span className="artists-lineup__hotspot-cta">View Artist →</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="artists-lineup__banner">
        <Link to="/booking" className="artists-lineup__cta artists-lineup__cta--red">
          MAKE A BOOKING
        </Link>

        <p className="artists-lineup__body">
          Every artist books their own hours and takes deposits directly online. Pick a
          style, pick an artist, pick a time.
        </p>

        {showViewAll ? (
          <Link to="/artists" className="artists-lineup__cta artists-lineup__cta--outline">
            VIEW ALL ARTISTS
          </Link>
        ) : (
          <span className="artists-lineup__cta-spacer" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}
