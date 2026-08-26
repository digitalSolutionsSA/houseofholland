-- Broadcast a push + in-app notification to every profile the moment a new
-- flash event is created, regardless of its initial status (open/closed/
-- upcoming). Distinct from notify_flash_event_live(), which only fires on
-- the later open transition — this fires once, right at creation.
create or replace function public.notify_flash_event_created()
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
  v_title := 'New Flash Day Added';
  v_link := '/flash-queue/' || NEW.id::text;

  v_body := case NEW.status
    when 'open' then coalesce(NEW.title, 'A flash day') || ' is live now — join the queue!'
    when 'closed' then coalesce(NEW.title, 'A flash day') || ' has been announced.'
    else coalesce(NEW.title, 'A flash day') || ' is coming up — check it out!'
  end;

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

drop trigger if exists trg_notify_flash_event_created on public.flash_events;
create trigger trg_notify_flash_event_created
  after insert on public.flash_events
  for each row execute function public.notify_flash_event_created();
