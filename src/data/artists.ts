import armandArtwork1 from '../assets/images/armand-artwork-1.png';
import armandArtwork2 from '../assets/images/armand-artwork-2.png';
import armandArtwork3 from '../assets/images/armand-artwork-3.png';
import armandArtwork4 from '../assets/images/armand-artwork-4.png';
import armandArtwork5 from '../assets/images/armand-artwork-5.png';
import armandArtwork6 from '../assets/images/armand-artwork-6.png';
import armandArtwork7 from '../assets/images/armand-artwork-7.png';
import armandArtwork8 from '../assets/images/armand-artwork-8.png';

import gallery1 from '../assets/images/gallery-1.png';
import gallery2 from '../assets/images/gallery-2.png';
import gallery3 from '../assets/images/gallery-3.png';
import gallery4 from '../assets/images/gallery-4.png';
import gallery5 from '../assets/images/gallery-5.png';
import gallery6 from '../assets/images/gallery-6.png';
import gallery7 from '../assets/images/gallery-7.png';
import gallery8 from '../assets/images/gallery-8.png';
import gallery9 from '../assets/images/gallery-9.png';
import gallery10 from '../assets/images/gallery-10.png';
import gallery11 from '../assets/images/gallery-11.png';

export interface Artist {
  slug: string;
  name: string;
  specialty: string;
  bio: string;
  /** Transparent PNG cutout, /Graphics/Artists/*.png (served from public/). */
  portrait: string;
  artwork: string[];
}

// TODO(client): only Armand Groesbeek's profile/bio was designed in Figma.
// The other six artists below use placeholder names/bios (real individual
// portraits are in place) — swap in real names/bios when available.
export const artists: Artist[] = [
  {
    slug: 'armand-groesbeek',
    name: 'Armand Groesbeek',
    specialty: 'Neo-Traditional Color',
    bio: 'Shop owner and neo-traditional specialist, blending bold color work with fine detail.',
    portrait: '/Graphics/Artists/1.png',
    artwork: [
      armandArtwork1,
      armandArtwork2,
      armandArtwork3,
      armandArtwork4,
      armandArtwork5,
      armandArtwork6,
      armandArtwork7,
      armandArtwork8,
    ],
  },
  {
    slug: 'marcus-reid',
    name: 'Marcus Reid',
    specialty: 'American Traditional',
    bio: 'Bold lines and classic Americana, built to hold up for decades.',
    portrait: '/Graphics/Artists/2.png',
    artwork: [gallery1, gallery2],
  },
  {
    slug: 'sarah-coetzee',
    name: 'Sarah Coetzee',
    specialty: 'Fine Line',
    bio: 'Delicate fine line and single-needle work with an eye for detail.',
    portrait: '/Graphics/Artists/3.png',
    artwork: [gallery3, gallery4],
  },
  {
    slug: 'devon-blake',
    name: 'Devon Blake',
    specialty: 'Blackwork',
    bio: 'Heavy blackwork and pattern-driven pieces with striking contrast.',
    portrait: '/Graphics/Artists/4.png',
    artwork: [gallery5, gallery6],
  },
  {
    slug: 'tyler-brooks',
    name: 'Tyler Brooks',
    specialty: 'Portrait Realism',
    bio: 'Custom black and grey portraiture, specializing in high-detail linework.',
    portrait: '/Graphics/Artists/5.png',
    artwork: [gallery7, gallery8],
  },
  {
    slug: 'jono-van-der-merwe',
    name: 'Jono van der Merwe',
    specialty: 'Japanese Irezumi',
    bio: 'Traditional Japanese Irezumi with a focus on large-scale flow pieces.',
    portrait: '/Graphics/Artists/6.png',
    artwork: [gallery9, gallery10],
  },
  {
    slug: 'naomi-price',
    name: 'Naomi Price',
    specialty: 'Realism',
    bio: 'Photorealistic portrait and nature work, built from real consultations.',
    portrait: '/Graphics/Artists/7.png',
    artwork: [gallery11, gallery1],
  },
];

export const getArtistBySlug = (slug: string | undefined) =>
  artists.find((artist) => artist.slug === slug);
