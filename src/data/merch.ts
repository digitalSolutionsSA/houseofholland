import gallery1 from '../assets/images/gallery-1.webp';
import gallery2 from '../assets/images/gallery-2.webp';
import gallery3 from '../assets/images/gallery-3.webp';
import gallery4 from '../assets/images/gallery-4.webp';
import gallery5 from '../assets/images/gallery-5.webp';
import gallery6 from '../assets/images/gallery-6.webp';

export interface MerchItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  soldOut?: boolean;
}

export const merchItems: MerchItem[] = [
  {
    id: 'logo-tee',
    name: 'House of Holland Logo Tee',
    category: 'Apparel',
    price: 32,
    description: 'Heavyweight black cotton with front chest print. Unisex fit.',
    image: gallery1,
  },
  {
    id: 'embroidered-cap',
    name: 'Embroidered Cap',
    category: 'Accessories',
    price: 28,
    description: 'Structured snapback with red-on-black embroidered logo.',
    image: gallery2,
  },
  {
    id: 'aftercare-kit',
    name: 'Aftercare Kit',
    category: 'Essentials',
    price: 18,
    description: 'Everything you need for the first two weeks — balm, soap, and instructions.',
    image: gallery3,
  },
  {
    id: 'sticker-pack',
    name: 'Sticker Pack',
    category: 'Accessories',
    price: 8,
    description: 'Six die-cut stickers featuring shop artwork and artist designs.',
    image: gallery4,
  },
  {
    id: 'studio-hoodie',
    name: 'Studio Hoodie',
    category: 'Apparel',
    price: 58,
    description: 'Premium fleece pullover with back print. Limited run.',
    image: gallery5,
  },
  {
    id: 'canvas-tote',
    name: 'Canvas Tote',
    category: 'Accessories',
    price: 22,
    description: 'Heavy canvas tote with red strap detail. Perfect for flash day hauls.',
    image: gallery6,
    soldOut: true,
  },
];

export function formatMerchPrice(price: number) {
  return `$${price.toFixed(0)}`;
}
