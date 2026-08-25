-- The old policy queried auth.users directly to check the sender's email.
-- Postgres evaluates every applicable RLS policy for a command and ORs the
-- results together — so even though "customer can start conversation"
-- would allow the insert, evaluating THIS policy first threw a permission
-- error (authenticated has no SELECT on auth.users), which failed the
-- whole INSERT for every customer, not just admins.
--
-- Fix: check the email from the JWT claim instead — no auth.users access
-- needed, and avoids granting SELECT on auth.users to authenticated
-- (which would expose every user's email/metadata app-wide via RLS).
drop policy if exists "admin senders can create conversations" on public.conversations;

create policy "admin senders can create conversations"
  on public.conversations
  for insert
  with check (
    (auth.jwt() ->> 'email') = any (array[
      'info@digitalsolutionssa.co.za',
      'armand@hohtattoos.com'
    ])
  );
