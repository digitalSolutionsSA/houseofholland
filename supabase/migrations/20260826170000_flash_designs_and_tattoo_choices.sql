-- Up to 10 individual tattoo design images per flash event, shown to
-- customers so they can pick which designs they want when they queue.
create table public.flash_event_images (
  id uuid primary key default gen_random_uuid(),
  flash_event_id uuid not null references public.flash_events(id) on delete cascade,
  image_url text not null,
  position smallint not null check (position between 1 and 10),
  created_at timestamptz not null default now(),
  unique (flash_event_id, position)
);

alter table public.flash_event_images enable row level security;

create policy "public read flash images" on public.flash_event_images
  for select using (true);

create policy "manager manages flash images" on public.flash_event_images
  for all using (current_role_name() = 'manager'::user_role);

-- Which design number(s) (1-10, referencing flash_event_images.position) the
-- customer picked when they joined the queue — at most two.
alter table public.flash_reservations
  add column selected_tattoo_numbers smallint[] null;

alter table public.flash_reservations
  add constraint flash_reservations_selected_tattoo_numbers_max2
  check (selected_tattoo_numbers is null or array_length(selected_tattoo_numbers, 1) <= 2);
