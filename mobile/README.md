# HoH Mobile App

React Native / Expo app for House of Holland Tattoos. Full parity with the web app across customer, artist, and admin roles.

## Stack

- **Expo SDK 53** + **Expo Router v4** (file-based routing)
- **NativeWind v4** (Tailwind CSS for React Native)
- **Supabase** (same backend as web — auth, database, storage, realtime)
- **EAS** (Expo Application Services) for cloud builds & store submission

## Getting Started

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Start development server

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `i` for iOS simulator / `a` for Android emulator.

### 3. Install EAS CLI (for builds)

```bash
npm install -g eas-cli
eas login
```

## Building for the App Stores

### Development build (internal testing)

```bash
# Android
eas build --platform android --profile development

# iOS
eas build --platform ios --profile development
```

### Production build

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### Submit to stores

```bash
# Fill in eas.json with your Apple ID, ASC App ID, Team ID, and Google Play key
eas submit --platform android
eas submit --platform ios
```

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout — auth gate + role routing
│   ├── (auth)/             # Login / register
│   ├── (customer)/         # Customer tab navigator + screens
│   ├── (artist)/           # Artist tab navigator + screens
│   └── (admin)/            # Admin stack screens
├── components/shared/      # Reusable UI components
├── constants/colors.ts     # Brand colour palette
├── context/AuthContext.tsx # Auth state (mirrors web)
├── hooks/useMembership.ts  # Membership tier logic
├── lib/                    # Supabase client + utilities (mirrors web)
├── app.json                # Expo config (bundle ID, permissions, plugins)
├── eas.json                # EAS build/submit config
├── tailwind.config.js      # NativeWind theme
└── global.css              # Tailwind directives
```

## Before Submitting to Stores

1. Fill in `eas.json` with your Apple Developer credentials
2. Add `google-play-key.json` (Google Play service account key)
3. Add app icon (`assets/icon.png` — 1024×1024) and splash (`assets/splash.png`)
4. Add adaptive icon (`assets/adaptive-icon.png`) for Android
5. Test on real devices via a preview build before production

## Screen Implementation Status

### Fully implemented
- Login / Register / Forgot Password
- Customer Home (appointments, flash event, quick actions)
- Artist Home (today's schedule, stats, quick actions)
- Messages list (customer + artist)
- Chat thread (real-time via Supabase)
- Customer Profile (edit, avatar upload, sign out)
- Admin menu (role-based access)

### Placeholder (UI scaffold, needs data wiring)
All other screens exist with routing in place — each shows "Coming soon" and needs the web app logic ported in. Priority order:
1. Bookings (list + booking wizard)
2. Artists list + Artist profile
3. Flash queue
4. Merch shop
5. Admin: Bookings, Completions, Notifications
6. Consent forms (signature pad)
7. Passport, Battle Pass, Vault, Membership
8. Admin: Artists, Schedule, Portfolio, Rent, Waivers, Points, Referrals
