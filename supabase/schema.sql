-- ═══════════════════════════════════════════════════════════════
--  თბილისი LIVE — ბაზის სქემა
--
--  ორი მონაცემის სიბრტყე რჩება:
--    • ბიზნესები — სტატიკურ ბანდლებში (OSM იმპორტი, Cloudflare-ზე)
--    • ხალხი და მათი ქმედება — აქ, Postgres-ში
--
--  ბიზნესი აქ არ დუბლირდება. პროფილი მასზე `business_slug`-ით
--  მიბმულია — ტექსტური კავშირი, არა უცხო გასაღები. ასე ბანდლის
--  ხელახლა აგება ბაზას არ ამტვრევს.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. პროფილები ─────────────────────────────────────────────
--
--  ორი ტიპი, როგორც შევთანხმდით:
--    personal — ჩვეულებრივი ადამიანი
--    business — ბიზნესი, პროდუქტებზე გამახვილებული
--
--  ინფლუენსერი ცალკე ტიპი არაა. `is_pro` ჩვეულებრივ პროფილს
--  პროფესიულ ფუნქციებს უმატებს (სტატისტიკა, კონტაქტი, კატეგორია).

create type account_type as enum ('personal', 'business');

create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique not null
                check (username ~ '^[a-z0-9._]{3,30}$'),
  display_name  text not null check (char_length(display_name) between 1 and 60),
  bio           text check (char_length(bio) <= 300),
  avatar_url    text,
  kind          account_type not null default 'personal',

  -- პროფესიული რეჟიმი (ინფლუენსერი / კრეატორი)
  is_pro        boolean not null default false,
  pro_category  text,

  -- ბიზნეს-ანგარიშისთვის: რომელ ბანდლის ბიზნესს წარმოადგენს
  business_slug text,
  website       text,
  phone         text,

  verified      boolean not null default false,
  is_private    boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ერთ ბიზნესს ერთი ოფიციალური გვერდი
create unique index profiles_business_slug_key
  on profiles (business_slug) where business_slug is not null;

create index profiles_kind_idx on profiles (kind);

-- ძებნა სახელით — ქართულადაც და ლათინურადაც
create index profiles_search_idx on profiles
  using gin (to_tsvector('simple', username || ' ' || display_name));


-- ─── 2. გამოწერები ────────────────────────────────────────────

create table follows (
  follower_id  uuid not null references profiles on delete cascade,
  followee_id  uuid not null references profiles on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);

create index follows_followee_idx on follows (followee_id, created_at desc);


-- ─── 3. პოსტები და მედია ──────────────────────────────────────

create table posts (
  id            bigint generated always as identity primary key,
  author_id     uuid not null references profiles on delete cascade,
  business_slug text,                    -- თუ ბიზნესის სახელით იდება
  body          text check (char_length(body) <= 2200),
  place_name    text,                    -- „ლოკაცია" თავზე, ინსტას მსგავსად
  lon           double precision,
  lat           double precision,

  -- დენორმალიზებული მთვლელები. count(*) ფიდზე ძვირია.
  like_count    integer not null default 0,
  comment_count integer not null default 0,

  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index posts_feed_idx  on posts (created_at desc) where deleted_at is null;
create index posts_author_idx on posts (author_id, created_at desc) where deleted_at is null;
create index posts_place_idx  on posts (business_slug, created_at desc) where deleted_at is null;

-- კარუსელი: ერთ პოსტს რამდენიმე ფოტო/ვიდეო
create table post_media (
  id       bigint generated always as identity primary key,
  post_id  bigint not null references posts on delete cascade,
  path     text not null,                -- Storage-ის გზა, არა სრული URL
  kind     text not null default 'image' check (kind in ('image', 'video')),
  width    integer,
  height   integer,
  position smallint not null default 0
);

create index post_media_post_idx on post_media (post_id, position);


-- ─── 4. მოწონება ──────────────────────────────────────────────

create table post_likes (
  post_id    bigint not null references posts on delete cascade,
  user_id    uuid   not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on post_likes (user_id, created_at desc);


-- ─── 5. კომენტარები ───────────────────────────────────────────
--
--  ერთი დონის პასუხი, როგორც ინსტაგრამზე: parent_id მხოლოდ
--  ძირეულ კომენტარზე შეიძლება მიუთითებდეს, პასუხზე პასუხი არა.

create table comments (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references posts on delete cascade,
  author_id   uuid   not null references profiles on delete cascade,
  parent_id   bigint references comments on delete cascade,
  body        text not null check (char_length(body) between 1 and 800),
  like_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index comments_post_idx   on comments (post_id, created_at) where deleted_at is null;
create index comments_parent_idx on comments (parent_id, created_at) where parent_id is not null;

create table comment_likes (
  comment_id bigint not null references comments on delete cascade,
  user_id    uuid   not null references profiles on delete cascade,
  primary key (comment_id, user_id)
);


-- ─── 6. შენახული და შეფასება ──────────────────────────────────

create table saves (
  user_id       uuid not null references profiles on delete cascade,
  business_slug text not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, business_slug)
);

-- ვარსკვლავები მხოლოდ ბიზნესებზე — არა პოსტებზე, არა ხალხზე
create table ratings (
  user_id       uuid not null references profiles on delete cascade,
  business_slug text not null,
  stars         smallint not null check (stars between 1 and 5),
  body          text check (char_length(body) <= 600),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, business_slug)
);

create index ratings_business_idx on ratings (business_slug);

-- ჩექინი ადგილზე
create table checkins (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references profiles on delete cascade,
  business_slug text not null,
  created_at    timestamptz not null default now()
);

create index checkins_business_idx on checkins (business_slug, created_at desc);
create index checkins_user_idx     on checkins (user_id, created_at desc);


-- ─── 7. მიმოწერა ──────────────────────────────────────────────

create table conversations (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  last_at    timestamptz not null default now()
);

create table conversation_members (
  conversation_id bigint not null references conversations on delete cascade,
  user_id         uuid   not null references profiles on delete cascade,
  read_at         timestamptz,
  primary key (conversation_id, user_id)
);

create index conv_members_user_idx on conversation_members (user_id);

create table messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references conversations on delete cascade,
  sender_id       uuid   not null references profiles on delete cascade,
  body            text check (char_length(body) <= 2000),
  media_path      text,
  created_at      timestamptz not null default now()
);

create index messages_conv_idx on messages (conversation_id, created_at desc);


-- ─── 8. შეტყობინებები ─────────────────────────────────────────

create type notif_kind as enum ('like', 'comment', 'reply', 'follow', 'mention');

create table notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles on delete cascade,  -- ვისთვის
  actor_id   uuid not null references profiles on delete cascade,  -- ვინ გააკეთა
  kind       notif_kind not null,
  post_id    bigint references posts on delete cascade,
  comment_id bigint references comments on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);


-- ─── 9. მოდერაცია ─────────────────────────────────────────────
--
--  ეს ფუნქცია არაა, ვალდებულებაა. მომხმარებლის კონტენტთან
--  ერთად საჩივარი და ბლოკი აუცილებლად უნდა არსებობდეს.

create table blocks (
  blocker_id uuid not null references profiles on delete cascade,
  blocked_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null references profiles on delete cascade,
  post_id     bigint references posts on delete cascade,
  comment_id  bigint references comments on delete cascade,
  profile_id  uuid   references profiles on delete cascade,
  reason      text not null,
  note        text,
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now()
);

create index reports_open_idx on reports (created_at desc) where status = 'open';
