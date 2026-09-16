create policy "client deletes own completions"
on public.tattoo_completions
for delete
using (profile_id = auth.uid());
