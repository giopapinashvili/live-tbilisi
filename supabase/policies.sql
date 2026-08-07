-- ═══════════════════════════════════════════════════════════════
--  თბილისი LIVE — ავტომატიკა და დაცვა
--
--  ორი ნაწილი:
--    1. ტრიგერები — მთვლელები და შეტყობინებები თავად ახლდება
--    2. RLS — ვის რა შეუძლია. ბაზა თვითონ იცავს თავს, არა კოდი.
--
--  RLS-ის აზრი: ბრაუზერში გაშვებული კოდი ყოველთვის შეიძლება
--  შეიცვალოს. ამიტომ „ვინ რას შეეხება" ბაზაში წერია, არა JS-ში.
-- ═══════════════════════════════════════════════════════════════


-- ─── 1. მთვლელები ─────────────────────────────────────────────

create or replace function bump_post_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
  else
    update posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

create trigger post_likes_count
  after insert or delete on post_likes
  for each row execute function bump_post_likes();


create or replace function bump_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  else
    update posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

create trigger comments_count
  after insert or delete on comments
  for each row execute function bump_comment_count();


create or replace function bump_comment_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update comments set like_count = like_count + 1 where id = new.comment_id;
  else
    update comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end $$;

create trigger comment_likes_count
  after insert or delete on comment_likes
  for each row execute function bump_comment_likes();


-- ─── 2. შეტყობინებები ავტომატურად ─────────────────────────────
--
--  საკუთარ ქმედებაზე შეტყობინება არ იგზავნება — თავად რომ
--  მოიწონებ პოსტს, არ უნდა შეგატყობინოს.

create or replace function notify_on_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select author_id into owner_id from posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into notifications (user_id, actor_id, kind, post_id)
    values (owner_id, new.user_id, 'like', new.post_id);
  end if;
  return null;
end $$;

create trigger post_likes_notify
  after insert on post_likes
  for each row execute function notify_on_like();


create or replace function notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if new.parent_id is not null then
    select author_id into target from comments where id = new.parent_id;
    if target is not null and target <> new.author_id then
      insert into notifications (user_id, actor_id, kind, post_id, comment_id)
      values (target, new.author_id, 'reply', new.post_id, new.id);
    end if;
  else
    select author_id into target from posts where id = new.post_id;
    if target is not null and target <> new.author_id then
      insert into notifications (user_id, actor_id, kind, post_id, comment_id)
      values (target, new.author_id, 'comment', new.post_id, new.id);
    end if;
  end if;
  return null;
end $$;

create trigger comments_notify
  after insert on comments
  for each row execute function notify_on_comment();


create or replace function notify_on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, actor_id, kind)
  values (new.followee_id, new.follower_id, 'follow');
  return null;
end $$;

create trigger follows_notify
  after insert on follows
  for each row execute function notify_on_follow();


-- ─── 3. მიმოწერის დროის განახლება ─────────────────────────────

create or replace function touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_at = new.created_at where id = new.conversation_id;
  return null;
end $$;

create trigger messages_touch
  after insert on messages
  for each row execute function touch_conversation();


-- ─── 4. პროფილი ავტომატურად რეგისტრაციისას ────────────────────
--
--  როცა ადამიანი დარეგისტრირდება, პროფილი მაშინვე უნდა შეიქმნას.
--  სახელი დროებითია — შემდეგ ონბორდინგზე აირჩევს.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; final text; n int := 0;
begin
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9._]', '', 'g'));
  if char_length(base) < 3 then base := 'user' || base; end if;
  base := left(base, 24);

  final := base;
  while exists (select 1 from profiles where username = final) loop
    n := n + 1;
    final := base || n::text;
  end loop;

  insert into profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final,
    coalesce(new.raw_user_meta_data->>'full_name', final),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ═══════════════════════════════════════════════════════════════
--  RLS — ვის რა შეუძლია
-- ═══════════════════════════════════════════════════════════════

alter table profiles             enable row level security;
alter table follows              enable row level security;
alter table posts                enable row level security;
alter table post_media           enable row level security;
alter table post_likes           enable row level security;
alter table comments             enable row level security;
alter table comment_likes        enable row level security;
alter table saves                enable row level security;
alter table ratings              enable row level security;
alter table checkins             enable row level security;
alter table conversations        enable row level security;
alter table conversation_members enable row level security;
alter table messages             enable row level security;
alter table notifications        enable row level security;
alter table blocks               enable row level security;
alter table reports              enable row level security;


-- დამხმარე: დამბლოკავი და დაბლოკილი ერთმანეთს ვერ ხედავენ
create or replace function blocked_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  )
$$;


-- ── პროფილები ──
create policy "პროფილი ყველას უჩანს"
  on profiles for select using (not blocked_with(id));

create policy "საკუთარ პროფილს თვითონ ცვლი"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);


-- ── გამოწერები ──
create policy "გამოწერები ღიაა"
  on follows for select using (true);

create policy "გამოწერას თვითონ იწყებ"
  on follows for insert with check (auth.uid() = follower_id and not blocked_with(followee_id));

create policy "გამოწერას თვითონ წყვეტ"
  on follows for delete using (auth.uid() = follower_id);


-- ── პოსტები ──
create policy "წაშლილის გარდა ყველა პოსტი ჩანს"
  on posts for select using (deleted_at is null and not blocked_with(author_id));

create policy "პოსტს თვითონ დებ"
  on posts for insert with check (auth.uid() = author_id);

create policy "საკუთარ პოსტს თვითონ ცვლი"
  on posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "საკუთარ პოსტს თვითონ შლი"
  on posts for delete using (auth.uid() = author_id);


-- ── მედია ──
create policy "მედია ჩანს, თუ პოსტი ჩანს"
  on post_media for select
  using (exists (select 1 from posts p where p.id = post_id and p.deleted_at is null));

create policy "მედიას პოსტის ავტორი უმატებს"
  on post_media for insert
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

create policy "მედიას პოსტის ავტორი შლის"
  on post_media for delete
  using (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));


-- ── მოწონება ──
create policy "მოწონებები ღიაა"    on post_likes for select using (true);
create policy "თვითონ მოიწონე"     on post_likes for insert with check (auth.uid() = user_id);
create policy "თვითონ მოხსენი"     on post_likes for delete using (auth.uid() = user_id);


-- ── კომენტარები ──
create policy "კომენტარები ჩანს"
  on comments for select using (deleted_at is null and not blocked_with(author_id));

create policy "კომენტარს თვითონ წერ"
  on comments for insert with check (auth.uid() = author_id);

create policy "საკუთარ კომენტარს თვითონ შლი"
  on comments for delete using (auth.uid() = author_id);

create policy "კომენტარის მოწონება ჩანს" on comment_likes for select using (true);
create policy "კომენტარს თვითონ იწონებ"  on comment_likes for insert with check (auth.uid() = user_id);
create policy "მოწონებას თვითონ ხსნი"    on comment_likes for delete using (auth.uid() = user_id);


-- ── შენახული: მხოლოდ შენ ხედავ ──
create policy "შენახული პირადია"
  on saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── შეფასება ──
create policy "შეფასებები ღიაა"     on ratings for select using (true);
create policy "შეფასებას თვითონ დებ" on ratings for insert with check (auth.uid() = user_id);
create policy "შეფასებას თვითონ ცვლი" on ratings for update using (auth.uid() = user_id);
create policy "შეფასებას თვითონ შლი"  on ratings for delete using (auth.uid() = user_id);


-- ── ჩექინი ──
create policy "ჩექინები ღიაა"      on checkins for select using (not blocked_with(user_id));
create policy "ჩექინს თვითონ აკეთებ" on checkins for insert with check (auth.uid() = user_id);
create policy "ჩექინს თვითონ შლი"   on checkins for delete using (auth.uid() = user_id);


-- ── მიმოწერა: მხოლოდ მონაწილეები ──
create or replace function in_conversation(cid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = cid and user_id = auth.uid()
  )
$$;

create policy "საკუთარი საუბრები"
  on conversations for select using (in_conversation(id));

create policy "საუბრის დაწყება"
  on conversations for insert with check (auth.uid() is not null);

create policy "მონაწილეები ჩანან"
  on conversation_members for select using (in_conversation(conversation_id));

create policy "მონაწილის დამატება"
  on conversation_members for insert with check (auth.uid() is not null);

create policy "შეტყობინებები მხოლოდ მონაწილეს"
  on messages for select using (in_conversation(conversation_id));

create policy "წერს მხოლოდ მონაწილე"
  on messages for insert
  with check (auth.uid() = sender_id and in_conversation(conversation_id));

create policy "საკუთარ შეტყობინებას შლი"
  on messages for delete using (auth.uid() = sender_id);


-- ── შეტყობინებები: მხოლოდ ადრესატი ──
create policy "საკუთარი შეტყობინებები"
  on notifications for select using (auth.uid() = user_id);

create policy "წაკითხულად მონიშვნა"
  on notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "შეტყობინების წაშლა"
  on notifications for delete using (auth.uid() = user_id);


-- ── ბლოკი და საჩივარი ──
create policy "საკუთარი ბლოკები"
  on blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

create policy "საჩივარს თვითონ წერ"
  on reports for insert with check (auth.uid() = reporter_id);

create policy "საკუთარი საჩივარი ჩანს"
  on reports for select using (auth.uid() = reporter_id);
