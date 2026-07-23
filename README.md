# House of Holland — Tattoo Emporium

Premium dark/gold mobile web app built with **Vite**, **React**, **TypeScript**, and **Three.js**.

## Quick start (VS Code)

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |

## Routes

| Path | Screen |
|------|--------|
| `/` | App overview / get started |
| `/login` | Login / register |
| `/home` | Home dashboard |
| `/artists` | Artists list |
| `/artists/:artistId` | Artist profile |
| `/vault` | Tattoo vault |
| `/merch` | Merch shop |
| `/consent` | Consent forms |
| `/passport` | Tattoo passport / loyalty |
| `/membership` | Black Card membership |
| `/bookings` | Bookings |
| `/bookings/select-time` | Select date & time |
| `/flash-queue` | Flash day queue |
| `/profile` | Profile |

## Project structure

```
src/
  components/
    shared/       # Logo, buttons, nav, inputs, layout
    home/         # Home-specific cards & actions
    artists/      # Artist card
    vault/        # Vault card
    merch/        # Product card
    three/        # Three.js scenes (marble, ring, card)
  pages/          # One file per screen
  data/           # Mock content
  styles/         # Design tokens
```

Edit any page under `src/pages/` or shared UI under `src/components/` — each UI piece lives in its own file.
