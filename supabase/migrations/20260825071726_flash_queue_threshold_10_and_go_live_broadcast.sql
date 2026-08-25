-- Bump the "almost your turn" notification threshold from 5 to 10 people,
-- per product request: users should be notified as their position crosses
-- below 10, not just 5.
create or replace function public.notify_flash_queue_shift()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_ahead int;
  v_title text;
  v_body text;
begin
  -- Only fires the moment someone leaves the waiting pool (claimed or
  -- completed) — that's the only event that changes anyone else's
  -- position-in-line.
  if OLD.status <> 'waiting' or NEW.status = 'waiting' then
    return NEW;
  end if;

  for r in
    select fr.id, fr.profile_id, fr.position
    from flash_reservations fr
    where fr.flash_event_id = NEW.flash_event_id
      and fr.status = 'waiting'
      and fr.position > OLD.position
  loop
    select count(*) into v_ahead
    from flash_reservations
    where flash_event_id = NEW.flash_event_id
      and status = 'waiting'
      and position < r.position;

    if v_ahead <= 10 then
      v_title := 'Almost your turn!';
      v_body := case
        when v_ahead = 0 then 'You''re next in the flash queue — head to the shop now!'
        when v_ahead = 1 then '1 person ahead of you. Get to the shop soon!'
        else v_ahead || ' people ahead of you. Get to the shop soon!'
      end;

      insert into notifications (profile_id, title, body, type, link)
      values (r.profile_id, v_title, v_body, 'flash_queue', '/flash-queue/' || NEW.flash_event_id::text);

      perform net.http_post(
        url := 'https://tgaxteclhzmzfsvaulzr.supabase.co/functions/v1/send-push',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object(
          'user_id', r.profile_id,
          'title', v_title,
          'body', v_body,
          'data', jsonb_build_object('path', '/flash-queue/' || NEW.flash_event_id::text)
        )
      );
    end if;
  end loop;

  return NEW;
end;
$function$;

-- New: broadcast a push + in-app notification to every profile the moment
-- a flash event's status transitions into 'open' (i.e. it goes live).
-- Guarded on the actual OLD->NEW transition so re-saving an already-open
-- event (e.g. editing its description) doesn't re-broadcast.
create or replace function public.notify_flash_event_live()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  p record;
  v_title text;
  v_body text;
  v_link text;
begin
  if OLD.status is not distinct from 'open' or NEW.status <> 'open' then
    return NEW;
  end if;

  v_title := 'Flash Day is Live!';
  v_body := coalesce(NEW.title, 'A flash day') || ' just went live — join the queue now!';
  v_link := '/flash-queue/' || NEW.id::text;

  for p in select id from profiles loop
    insert into notifications (profile_id, title, body, type, link)
    values (p.id, v_title, v_body, 'flash', v_link);

    perform net.http_post(
      url := 'https://tgaxteclhzmzfsvaulzr.supabase.co/functions/v1/send-push',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'user_id', p.id,
        'title', v_title,
        'body', v_body,
        'data', jsonb_build_object('path', v_link)
      )
    );
  end loop;

  return NEW;
end;
$function$;

drop trigger if exists trg_notify_flash_event_live on public.flash_events;
create trigger trg_notify_flash_event_live
  after update on public.flash_events
  for each row execute function public.notify_flash_event_live();
