create table if not exists public.community_posts (
  id uuid primary key,
  team_id text not null,
  board text not null default 'general',
  author text not null default '익명',
  title text not null,
  body text not null,
  owner_key text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_posts
  add column if not exists owner_key text;

create index if not exists community_posts_team_created_idx
  on public.community_posts (team_id, created_at desc);

create index if not exists community_posts_team_board_created_idx
  on public.community_posts (team_id, board, created_at desc);

create table if not exists public.community_comments (
  id uuid primary key,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author text not null default '익명',
  body text not null,
  owner_key text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.community_comments
  add column if not exists owner_key text;

create index if not exists community_comments_post_created_idx
  on public.community_comments (post_id, created_at asc);

create table if not exists public.community_votes (
  id uuid primary key,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  voter_key text not null,
  value integer not null default 1,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, voter_key)
);

create index if not exists community_votes_target_idx
  on public.community_votes (target_type, target_id);

create table if not exists public.community_reports (
  id uuid primary key,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reason text not null default '기타',
  details text not null default '',
  reporter_key text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_key)
);

create index if not exists community_reports_target_idx
  on public.community_reports (target_type, target_id);

create index if not exists community_reports_status_created_idx
  on public.community_reports (status, created_at desc);

create table if not exists public.site_analytics_events (
  id uuid primary key,
  event_type text not null check (event_type in ('pageview', 'engagement')),
  visitor_key text not null,
  session_key text not null,
  path text not null default '/',
  country text not null default 'UNK',
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists site_analytics_events_created_idx
  on public.site_analytics_events (created_at desc);

create index if not exists site_analytics_events_visitor_idx
  on public.site_analytics_events (visitor_key);

create index if not exists site_analytics_events_session_idx
  on public.site_analytics_events (session_key);
