-- Registered artists (not just managers) can create and manage flash days.
drop policy if exists "manager manages flash" on public.flash_events;
create policy "manager or artist manages flash" on public.flash_events
  for all using (current_role_name() in ('manager', 'artist'));

drop policy if exists "manager manages flash images" on public.flash_event_images;
create policy "manager or artist manages flash images" on public.flash_event_images
  for all using (current_role_name() in ('manager', 'artist'));

drop policy if exists "Managers can manage flash event artists" on public.flash_event_artists;
create policy "Managers or artists can manage flash event artists" on public.flash_event_artists
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('manager', 'artist'))
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('manager', 'artist'))
  );

drop policy if exists "Managers manage" on public.flash_event_guest_artists;
create policy "Managers or artists manage" on public.flash_event_guest_artists
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('manager', 'artist'))
  );
