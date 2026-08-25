-- Each flash-queue signup now records whether/when the customer's waiver
-- was confirmed for that specific queue join (either freshly signed via
-- /consent?joinFlashEvent=... or reaffirmed from an existing signed
-- consent_forms row) — lets staff see waiver status per queue entry
-- without requiring a separate consent_forms row per event.
alter table public.flash_reservations
  add column if not exists waiver_signed_at timestamptz null;
