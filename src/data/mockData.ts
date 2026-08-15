export type Artist = {
  id: string
  name: string
  specialties: string[]
  rating: number
  reviews: number
  bio: string
  avatar: string
  hero: string
  portfolio: string[]
}

export type Product = {
  id: string
  name: string
  price: number
  category: 'Apparel' | 'Accessories' | 'Bundles'
  image: string
}

export type VaultEntry = {
  id: string
  title: string
  artist: string
  date: string
  image: string
}

export type Appointment = {
  id: string
  dateLabel: string
  artist: string
  service: string
  avatar: string
}

export const artists: Artist[] = [
  {
    id: 'kevin-upton',
    name: 'Kevin Upton',
    specialties: ['Realism', 'Black & Grey'],
    rating: 5.0,
    reviews: 213,
    bio: 'Specializing in photorealism, portraits and large scale black & grey tattoos.',
    avatar: '/artists/Kevin_Upton.webp',
    hero: '/artists/Kevin_Upton.webp',
    portfolio: [
      'https://images.unsplash.com/photo-1568515045052-aecf82152764?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1590246814883-57c849c1d0e8?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1542858478-3f1eec5e5d8a?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop',
    ],
  },
  {
    id: 'derrick-stewart',
    name: 'Derrick Stewart',
    specialties: ['Black & Grey', 'Illustrative'],
    rating: 4.9,
    reviews: 156,
    bio: 'Bold illustrative work with a focus on narrative black & grey pieces.',
    avatar: '/artists/Derrick_Stewart.webp',
    hero: '/artists/Derrick_Stewart.webp',
    portfolio: [],
  },
  {
    id: 'tiffany-hiccup-roberts',
    name: 'Tiffany Hiccup Roberts',
    specialties: ['Fine Line', 'Floral'],
    rating: 5.0,
    reviews: 98,
    bio: 'Delicate fine-line florals and ornamental designs.',
    avatar: '/artists/Tiffany_Hiccup_Roberts.webp',
    hero: '/artists/Tiffany_Hiccup_Roberts.webp',
    portfolio: [],
  },
  {
    id: 'armand-groesbeek',
    name: 'Armand Groesbeek',
    specialties: ['Color', 'Neo Traditional'],
    rating: 4.8,
    reviews: 142,
    bio: 'Vibrant color work with neo-traditional foundations.',
    avatar: '/artists/Armand_Groesbeek.webp',
    hero: '/artists/Armand_Groesbeek.webp',
    portfolio: [],
  },
  {
    id: 'cody-quinn',
    name: 'Cody Quinn',
    specialties: ['Realism', 'Portraits'],
    rating: 4.9,
    reviews: 187,
    bio: 'Portrait specialist known for soft black & grey realism.',
    avatar: '/artists/Cody_Quinn.webp',
    hero: '/artists/Cody_Quinn.webp',
    portfolio: [],
  },
  {
    id: 'artist-6',
    name: 'Coming Soon',
    specialties: ['TBA'],
    rating: 0,
    reviews: 0,
    bio: 'New artist joining the HOH family — details coming soon.',
    avatar: '',
    hero: '',
    portfolio: [],
  },
  {
    id: 'artist-7',
    name: 'Coming Soon',
    specialties: ['TBA'],
    rating: 0,
    reviews: 0,
    bio: 'New artist joining the HOH family — details coming soon.',
    avatar: '',
    hero: '',
    portfolio: [],
  },
]

export const products: Product[] = [
  {
    id: 'classic-tee',
    name: 'HOH Classic Tee',
    price: 36,
    category: 'Apparel',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop&q=80',
  },
  {
    id: 'crown-hoodie',
    name: 'HOH Crown Hoodie',
    price: 45,
    category: 'Apparel',
    image:
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop&q=80',
  },
  {
    id: 'snapback',
    name: 'HOH Snapback',
    price: 30,
    category: 'Accessories',
    image:
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop&q=80',
  },
  {
    id: 'beanie',
    name: 'HOH Beanie',
    price: 25,
    category: 'Accessories',
    image:
      'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=600&h=600&fit=crop&q=80',
  },
]

export const vaultEntries: VaultEntry[] = [
  {
    id: '1',
    title: 'Lion Sleeve',
    artist: 'Kevin Upton',
    date: 'May 10, 2025',
    image:
      'https://images.unsplash.com/photo-1568515045052-aecf82152764?w=200&h=200&fit=crop',
  },
  {
    id: '2',
    title: 'Angel Back Piece',
    artist: 'Derrick Stewart',
    date: 'Feb 3, 2025',
    image:
      'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=200&h=200&fit=crop',
  },
  {
    id: '3',
    title: 'Floral Arm',
    artist: 'Tiffany Hiccup',
    date: 'Nov 20, 2024',
    image:
      'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=200&h=200&fit=crop',
  },
  {
    id: '4',
    title: 'Skull & Roses',
    artist: 'Logan Watson',
    date: 'Oct 8, 2024',
    image:
      'https://images.unsplash.com/photo-1590246814883-57c849c1d0e8?w=200&h=200&fit=crop',
  },
  {
    id: '5',
    title: 'Warrior Portrait',
    artist: 'Cody Quinn',
    date: 'Sep 12, 2024',
    image:
      'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=200&h=200&fit=crop',
  },
]

export const upcomingAppointment: Appointment = {
  id: '1',
  dateLabel: 'Jun 14, 2025 • 2:00 PM',
  artist: 'Kevin Upton',
  service: 'Half Sleeve Session',
  avatar: '/artists/1.PNG',
}

export const membershipBenefits = [
  { id: '1', label: 'Priority Booking (24-48h Early Access)', icon: 'star' as const },
  { id: '2', label: 'Early Access to Flash Events', icon: 'shield' as const },
  { id: '3', label: '10% Off Merchandise', icon: 'percent' as const },
  { id: '4', label: 'Free Annual Touch-Up', icon: 'ribbon' as const },
  { id: '5', label: 'Birthday Gift', icon: 'gift' as const },
  { id: '6', label: 'Exclusive Flash & Member Events', icon: 'users' as const },
  { id: '7', label: 'Digital Tattoo Vault', icon: 'vault' as const },
]

export const overviewFeatures = [
  {
    id: 'book',
    title: 'BOOK',
    description: 'Appointments made simple',
    icon: 'calendar' as const,
  },
  {
    id: 'flash',
    title: 'FLASH QUEUE',
    description: 'Join the queue from anywhere',
    icon: 'zap' as const,
  },
  {
    id: 'consent',
    title: 'CONSENT',
    description: 'Sign forms in seconds',
    icon: 'file' as const,
  },
  {
    id: 'merch',
    title: 'MERCH',
    description: 'Exclusive drops & apparel',
    icon: 'shirt' as const,
  },
  {
    id: 'loyalty',
    title: 'LOYALTY',
    description: 'Earn rewards & unlock perks',
    icon: 'star' as const,
  },
  {
    id: 'membership',
    title: 'MEMBERSHIP',
    description: 'Join the Club. Unlock more.',
    icon: 'crown' as const,
  },
]

export const styleFilters = [
  'All',
  'Black & Grey',
  'Realism',
  'Fine Line',
  'Color',
  'Illustrative',
] as const

export const merchCategories = ['All', 'Apparel', 'Accessories', 'Bundles'] as const

export const availableTimes = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
]
