-- ── Profile fields ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists birthdate date,
  add column if not exists referral_code text,
  add column if not exists referred_by_profile uuid references public.profiles(id) on delete set null,
  add column if not exists birthday_points_year int;

create unique index if not exists profiles_referral_code_key on public.profiles (referral_code);

-- Member referral code: first 3 letters of name + 3 digits (e.g. JOH123)
create or replace function public.generate_member_code(p_name text)
returns text language plpgsql as $$
declare
  prefix text := upper(left(regexp_replace(coalesce(p_name, ''), '[^A-Za-z]', '', 'g') || 'HOH', 3));
  candidate text;
begin
  loop
    candidate := prefix || lpad((floor(random() * 1000))::int::text, 3, '0');
    exit when not exists (select 1 from profiles where referral_code = candidate)
          and not exists (select 1 from artists  where referral_code = candidate);
  end loop;
  return candidate;
end;
$$;

update public.profiles set referral_code = public.generate_member_code(full_name) where referral_code is null;

create or replace function public.profiles_set_member_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_member_code(new.full_name);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_profiles_member_code on public.profiles;
create trigger trg_profiles_member_code before insert on public.profiles
  for each row execute function public.profiles_set_member_code();

-- ── Points: fractional (1.5 per $100) + birthday reason ─────────
alter table public.loyalty_points alter column points type numeric(10,1);
alter table public.loyalty_points drop constraint if exists loyalty_points_reason_check;
alter table public.loyalty_points add constraint loyalty_points_reason_check
  check (reason = any (array['spend','referral','review','flash_day','upgrade','manual','birthday']));

-- Points are only ever earned on paid tiers
create or replace function public.tier_points(p_profile uuid, p_premium numeric, p_black numeric)
returns numeric language sql stable as $$
  select case (select membership_plan from profiles where id = p_profile)
    when 'black-card' then p_black when 'premium' then p_premium else 0 end
$$;

-- ── Apply a referral code at sign-up (artist code OR member code) ──
create or replace function public.apply_referral_code(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  code text := upper(trim(p_code));
  art record;
  ref record;
  pts numeric;
begin
  if me is null or code = '' then return 'invalid'; end if;
  if exists (select 1 from profiles where id = me and (referred_by_code is not null or referred_by_profile is not null)) then
    return 'already_referred';
  end if;

  select id into art from artists where referral_code = code;
  if found then
    update profiles set referred_by_code = code where id = me;
    return 'artist';
  end if;

  select id, referred_by_code into ref from profiles where referral_code = code and id <> me;
  if not found then return 'invalid'; end if;

  -- The friend inherits the referrer's artist, so the artist earns commission
  -- on the friend's paid membership too.
  update profiles set referred_by_profile = ref.id, referred_by_code = ref.referred_by_code where id = me;

  pts := tier_points(ref.id, 10, 15);
  if pts > 0 then
    insert into loyalty_points (profile_id, points, reason, reference_id, note, awarded_by, season)
    values (ref.id, pts, 'referral', me, 'Friend joined with your code', me, extract(year from now())::int);
    insert into notifications (profile_id, title, body, type)
    values (ref.id, 'You earned ' || pts || ' points', 'A friend joined using your referral code.', 'general');
  end if;
  return 'member';
end;
$$;
grant execute on function public.apply_referral_code(text) to authenticated;

-- ── Birthday points (daily) ─────────────────────────────────────
create or replace function public.award_birthday_points()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record; pts numeric; n int := 0;
  yr int := extract(year from now() at time zone 'Africa/Johannesburg')::int;
begin
  for r in
    select id from profiles
    where birthdate is not null
      and membership_plan in ('premium','black-card')
      and coalesce(birthday_points_year, 0) <> yr
      and to_char(birthdate, 'MM-DD') = to_char(now() at time zone 'Africa/Johannesburg', 'MM-DD')
  loop
    pts := tier_points(r.id, 10, 15);
    insert into loyalty_points (profile_id, points, reason, note, awarded_by, season)
    values (r.id, pts, 'birthday', 'Happy birthday!', r.id, yr);
    update profiles set birthday_points_year = yr where id = r.id;
    insert into notifications (profile_id, title, body, type)
    values (r.id, '🎂 Happy birthday!', 'We added ' || pts || ' points to your account.', 'general');
    n := n + 1;
  end loop;
  return n;
end;
$$;

select cron.unschedule('award-birthday-points') where exists (select 1 from cron.job where jobname = 'award-birthday-points');
select cron.schedule('award-birthday-points', '0 5 * * *', $$select public.award_birthday_points()$$);

-- ── Reward management (the two HoH admins) ──────────────────────
create or replace function public.is_rewards_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid()
    and lower(email) in ('info@digitalsolutionssa.co.za', 'armand@hohtattoos.com'))
$$;

drop policy if exists "rewards admins insert" on public.battle_pass_rewards;
drop policy if exists "rewards admins update" on public.battle_pass_rewards;
drop policy if exists "rewards admins delete" on public.battle_pass_rewards;
create policy "rewards admins insert" on public.battle_pass_rewards for insert with check (public.is_rewards_admin());
create policy "rewards admins update" on public.battle_pass_rewards for update using (public.is_rewards_admin());
create policy "rewards admins delete" on public.battle_pass_rewards for delete using (public.is_rewards_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reward-images', 'reward-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "reward images public read" on storage.objects;
drop policy if exists "reward images admin write" on storage.objects;
create policy "reward images public read" on storage.objects for select using (bucket_id = 'reward-images');
create policy "reward images admin write" on storage.objects for all
  using (bucket_id = 'reward-images' and public.is_rewards_admin())
  with check (bucket_id = 'reward-images' and public.is_rewards_admin());
