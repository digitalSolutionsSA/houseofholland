-- Number of individual tattoos available to choose from this flash day.
-- Multiple tattoos can appear on a single uploaded design-sheet image, so
-- this is independent of how many sheet images were uploaded — the admin
-- sets it explicitly (e.g. "10 tattoos to choose from").
alter table public.flash_events
  add column total_designs smallint null
  check (total_designs is null or total_designs between 1 and 100);

-- Allow a customer to re-enroll in the same flash day's queue after a
-- previous visit was completed. Multiple past "completed" reservations for
-- the same profile+event are fine — only one active (waiting/claimed)
-- reservation at a time is disallowed.
alter table public.flash_reservations
  drop constraint flash_reservations_flash_event_id_profile_id_key;

create unique index flash_reservations_one_active_per_profile
  on public.flash_reservations (flash_event_id, profile_id)
  where status <> 'completed';
