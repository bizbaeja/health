-- Profiles 테이블: 온보딩 및 개인 정보 저장
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text,
    avatar_url text,
    gender text check (gender in ('male', 'female')),
    height_cm numeric(5, 2),
    weight_kg numeric(5, 2),
    body_fat_percentage numeric(5, 2),
    onboarding_completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at
    before update on public.profiles
    for each row
    execute procedure moddatetime (updated_at);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
    on public.profiles for select
    using (auth.uid() = id);

create policy "profiles_upsert_own"
    on public.profiles for insert
    with check (auth.uid() = id);

create policy "profiles_update_own"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- 주간 기록 테이블: 매주 인증 정보 저장
create table if not exists public.weekly_logs (
    id bigserial primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    week_start date not null,
    weight_kg numeric(5, 2),
    body_fat_percentage numeric(5, 2),
    photo_url text,
    notes text,
    submitted_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint weekly_logs_unique_week unique (user_id, week_start)
);

create index if not exists weekly_logs_user_id_idx on public.weekly_logs (user_id);
create index if not exists weekly_logs_week_start_idx on public.weekly_logs (week_start desc);

create trigger handle_weekly_logs_updated_at
    before update on public.weekly_logs
    for each row
    execute procedure moddatetime (updated_at);

alter table public.weekly_logs enable row level security;

create policy "weekly_logs_select_own"
    on public.weekly_logs for select
    using (auth.uid() = user_id);

create policy "weekly_logs_insert_own"
    on public.weekly_logs for insert
    with check (auth.uid() = user_id);

create policy "weekly_logs_update_own"
    on public.weekly_logs for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "weekly_logs_delete_own"
    on public.weekly_logs for delete
    using (auth.uid() = user_id);

-- 경고 기록 테이블: 주간 미참여 등 패널티 관리
create table if not exists public.warnings (
    id bigserial primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    reason text not null,
    issued_at timestamptz not null default now()
);

create index if not exists warnings_user_id_idx on public.warnings (user_id);

alter table public.warnings enable row level security;

create policy "warnings_select_own"
    on public.warnings for select
    using (auth.uid() = user_id);

create policy "warnings_insert_own"
    on public.warnings for insert
    with check (auth.uid() = user_id);

-- Storage policies: weekly-logs 버킷은 사용자별 디렉터리를 사용함 (user_id/파일명)
create policy "weekly_logs_storage_select_own"
    on storage.objects for select
    using (
        bucket_id = 'weekly-logs'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

create policy "weekly_logs_storage_insert_own"
    on storage.objects for insert
    with check (
        bucket_id = 'weekly-logs'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

create policy "weekly_logs_storage_delete_own"
    on storage.objects for delete
    using (
        bucket_id = 'weekly-logs'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

-- 챌린지 설정: 사용자별 시작/종료 시각 저장
create table if not exists public.challenge_settings (
    id bigserial primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    start_at timestamptz not null,
    end_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint challenge_settings_unique_user unique (user_id)
);

create trigger handle_challenge_settings_updated_at
    before update on public.challenge_settings
    for each row
    execute procedure moddatetime (updated_at);

alter table public.challenge_settings enable row level security;

create policy "challenge_settings_select_own"
    on public.challenge_settings for select
    using (auth.uid() = user_id);

create policy "challenge_settings_upsert_own"
    on public.challenge_settings for insert
    with check (auth.uid() = user_id);

create policy "challenge_settings_update_own"
    on public.challenge_settings for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- 커뮤니티: 게시글, 좋아요, 댓글
create table if not exists public.posts (
    id bigserial primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    category text not null check (category in ('log_share', 'tip', 'qna', 'free')),
    title text not null,
    content text not null,
    media_urls jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists posts_category_idx on public.posts (category);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

create trigger handle_posts_updated_at
    before update on public.posts
    for each row
    execute procedure moddatetime (updated_at);

alter table public.posts enable row level security;

create policy "posts_select_authenticated"
    on public.posts for select
    using (auth.role() = 'authenticated');

create policy "posts_insert_own"
    on public.posts for insert
    with check (auth.uid() = user_id);

create policy "posts_update_own"
    on public.posts for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "posts_delete_own"
    on public.posts for delete
    using (auth.uid() = user_id);

create table if not exists public.post_likes (
    id bigserial primary key,
    post_id bigint not null references public.posts (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint post_likes_unique unique (post_id, user_id)
);

create index if not exists post_likes_post_id_idx on public.post_likes (post_id);
create index if not exists post_likes_user_id_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;

create policy "post_likes_select_authenticated"
    on public.post_likes for select
    using (auth.role() = 'authenticated');

create policy "post_likes_insert_own"
    on public.post_likes for insert
    with check (auth.uid() = user_id);

create policy "post_likes_delete_own"
    on public.post_likes for delete
    using (auth.uid() = user_id);

create table if not exists public.comments (
    id bigserial primary key,
    post_id bigint not null references public.posts (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    parent_id bigint references public.comments (id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments (post_id);
create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists comments_parent_id_idx on public.comments (parent_id);

create trigger handle_comments_updated_at
    before update on public.comments
    for each row
    execute procedure moddatetime (updated_at);

alter table public.comments enable row level security;

create policy "comments_select_authenticated"
    on public.comments for select
    using (auth.role() = 'authenticated');

create policy "comments_insert_own"
    on public.comments for insert
    with check (auth.uid() = user_id);

create policy "comments_update_own"
    on public.comments for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "comments_delete_own"
    on public.comments for delete
    using (auth.uid() = user_id);

create table if not exists public.comment_likes (
    id bigserial primary key,
    comment_id bigint not null references public.comments (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint comment_likes_unique unique (comment_id, user_id)
);

create index if not exists comment_likes_comment_id_idx on public.comment_likes (comment_id);
create index if not exists comment_likes_user_id_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;

create policy "comment_likes_select_authenticated"
    on public.comment_likes for select
    using (auth.role() = 'authenticated');

create policy "comment_likes_insert_own"
    on public.comment_likes for insert
    with check (auth.uid() = user_id);

create policy "comment_likes_delete_own"
    on public.comment_likes for delete
    using (auth.uid() = user_id);

-- 알림: 본인 글에 새로운 댓글이 달렸을 때 등 이벤트 저장
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'notification_type'
  ) then
    create type public.notification_type as enum ('comment_on_post');
  end if;
end $$;

create table if not exists public.notifications (
    id bigserial primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    type notification_type not null,
    data jsonb not null,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
    on public.notifications for select
    using (auth.uid() = user_id);

create policy "notifications_insert_own"
    on public.notifications for insert
    with check (auth.uid() = user_id);

create policy "notifications_update_own"
    on public.notifications for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- 댓글 작성 시, 게시글 작성자에게 알림 생성
create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  post_owner uuid;
  commenter_name text;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  -- 자기 글에 자기 댓글이면 알림 생략
  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;

  select full_name into commenter_name from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, data)
  values (
    post_owner,
    'comment_on_post',
    jsonb_build_object(
      'post_id', new.post_id,
      'comment_id', new.id,
      'comment_preview', left(new.content, 80),
      'commenter_name', coalesce(commenter_name, '익명'),
      'created_at', now()
    )
  );

  return new;
end;
$$;

drop trigger if exists comments_create_notification_trigger on public.comments;
create trigger comments_create_notification_trigger
after insert on public.comments
for each row execute function public.create_comment_notification();

-- 커뮤니티 media storage 정책
create policy "community_media_select_own"
    on storage.objects for select
    using (
        bucket_id = 'community-media'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

create policy "community_media_insert_own"
    on storage.objects for insert
    with check (
        bucket_id = 'community-media'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

create policy "community_media_delete_own"
    on storage.objects for delete
    using (
        bucket_id = 'community-media'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

-- 프로필 아바타 storage 정책
create policy "avatars_select_public"
    on storage.objects for select
    using (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
    );

create policy "avatars_insert_own"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

create policy "avatars_update_own"
    on storage.objects for update
    using (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

create policy "avatars_delete_own"
    on storage.objects for delete
    using (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
    );

