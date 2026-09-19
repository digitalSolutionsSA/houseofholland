-- Allow voice notes in chat (recorded via MediaRecorder: webm on Android/Chrome, mp4/aac on iOS)
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif','application/pdf',
  'audio/webm','audio/mp4','audio/aac','audio/mpeg','audio/ogg','audio/x-m4a','audio/wav'
]
where id = 'message-attachments';

-- Show a sensible preview for voice notes
create or replace function public.update_conversation_on_message()
returns trigger language plpgsql security definer as $$
begin
  update conversations
  set
    last_message_at      = new.created_at,
    last_message_preview = case when new.attachment_type = 'audio' and new.body is null then '🎤 Voice note'
                                else left(coalesce(new.body, 'Sent an attachment'), 120) end,
    last_sender_id       = new.sender_id,
    artist_archived_at   = null,
    artist_deleted_at    = null
  where id = new.conversation_id;
  return new;
end;
$$;
