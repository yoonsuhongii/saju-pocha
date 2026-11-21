-- 사주포차 고민 벽: Supabase > SQL Editor 에 통째로 붙여넣고 Run
create table if not exists public.worries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  text text not null check (char_length(text) between 2 and 120),
  el text check (el in ('wood','fire','earth','metal','water')),
  reply text check (reply is null or char_length(reply) <= 100),
  reply_by text check (reply_by is null or char_length(reply_by) <= 20),
  cheers int not null default 0,
  hugs int not null default 0,
  fires int not null default 0,
  reports int not null default 0,
  hidden boolean not null default false
);
alter table public.worries enable row level security;

drop policy if exists "worries read" on public.worries;
create policy "worries read" on public.worries for select using (hidden = false);

drop policy if exists "worries insert" on public.worries;
create policy "worries insert" on public.worries for insert
  with check (cheers = 0 and hugs = 0 and fires = 0 and reports = 0 and hidden = false);

-- 공감·신고는 이 함수로만 (아무나 표를 마음대로 고치지 못하게)
create or replace function public.react_worry(wid bigint, kind text) returns void
language sql security definer set search_path = public as $$
  update public.worries set
    cheers = cheers + (kind = 'cheer')::int,
    hugs   = hugs   + (kind = 'hug')::int,
    fires  = fires  + (kind = 'fire')::int
  where id = wid and hidden = false;
$$;
create or replace function public.report_worry(wid bigint) returns void
language sql security definer set search_path = public as $$
  update public.worries set reports = reports + 1, hidden = (reports + 1) >= 3 where id = wid;
$$;
grant execute on function public.react_worry(bigint, text) to anon;
grant execute on function public.report_worry(bigint) to anon;

-- 새 고민·공감이 실시간으로 보이게
alter publication supabase_realtime add table public.worries;
