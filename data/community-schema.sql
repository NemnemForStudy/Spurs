create table if not exists public.community_posts (
  id uuid primary key,
  team_id text not null,
  board text not null default 'general',
  author text not null default '익명',
  title text not null,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_team_created_idx
  on public.community_posts (team_id, created_at desc);

create index if not exists community_posts_team_board_created_idx
  on public.community_posts (team_id, board, created_at desc);

create table if not exists public.community_comments (
  id uuid primary key,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author text not null default '익명',
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

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
