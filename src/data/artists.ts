import armandArtwork1 from '../assets/images/armand-artwork-1.webp';
import armandArtwork2 from '../assets/images/armand-artwork-2.webp';
import armandArtwork3 from '../assets/images/armand-artwork-3.webp';
import armandArtwork4 from '../assets/images/armand-artwork-4.webp';
import armandArtwork5 from '../assets/images/armand-artwork-5.webp';
import armandArtwork6 from '../assets/images/armand-artwork-6.webp';
import armandArtwork7 from '../assets/images/armand-artwork-7.webp';
import armandArtwork8 from '../assets/images/armand-artwork-8.webp';

import gallery1 from '../assets/images/gallery-1.webp';
import gallery2 from '../assets/images/gallery-2.webp';
import gallery3 from '../assets/images/gallery-3.webp';
import gallery4 from '../assets/images/gallery-4.webp';
import gallery5 from '../assets/images/gallery-5.webp';
import gallery6 from '../assets/images/gallery-6.webp';
import gallery7 from '../assets/images/gallery-7.webp';
import gallery8 from '../assets/images/gallery-8.webp';
import gallery9 from '../assets/images/gallery-9.webp';
import gallery10 from '../assets/images/gallery-10.webp';
import gallery11 from '../assets/images/gallery-11.webp';

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
    portrait: '/Graphics/Artists/1.webp',
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
    portrait: '/Graphics/Artists/2.webp',
    artwork: [gallery1, gallery2],
  },
  {
    slug: 'sarah-coetzee',
    name: 'Sarah Coetzee',
    specialty: 'Fine Line',
    bio: 'Delicate fine line and single-needle work with an eye for detail.',
    portrait: '/Graphics/Artists/3.webp',
    artwork: [gallery3, gallery4],
  },
  {
    slug: 'devon-blake',
    name: 'Devon Blake',
    specialty: 'Blackwork',
    bio: 'Heavy blackwork and pattern-driven pieces with striking contrast.',
    portrait: '/Graphics/Artists/4.webp',
    artwork: [gallery5, gallery6],
  },
  {
    slug: 'tyler-brooks',
    name: 'Tyler Brooks',
    specialty: 'Portrait Realism',
    bio: 'Custom black and grey portraiture, specializing in high-detail linework.',
    portrait: '/Graphics/Artists/5.webp',
    artwork: [gallery7, gallery8],
  },
  {
    slug: 'jono-van-der-merwe',
    name: 'Jono van der Merwe',
    specialty: 'Japanese Irezumi',
    bio: 'Traditional Japanese Irezumi with a focus on large-scale flow pieces.',
    portrait: '/Graphics/Artists/6.webp',
    artwork: [gallery9, gallery10],
  },
  {
    slug: 'naomi-price',
    name: 'Naomi Price',
    specialty: 'Realism',
    bio: 'Photorealistic portrait and nature work, built from real consultations.',
    portrait: '/Graphics/Artists/7.webp',
    artwork: [gallery11, gallery1],
  },
];

export const getArtistBySlug = (slug: string | undefined) =>
  artists.find((artist) => artist.slug === slug);
