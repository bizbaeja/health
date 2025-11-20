-- Profiles 테이블: 온보딩 및 개인 정보 저장
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text,
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

