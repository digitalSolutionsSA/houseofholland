-- Previously only notified users within 10 people of the front. Per product
-- request, every position shift must now notify every affected waiting
-- user, every single time — no threshold.
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
  end loop;

  return NEW;
end;
$function$;
