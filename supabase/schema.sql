-- Cockpit — schéma Supabase
-- À coller une seule fois dans Supabase › SQL Editor › New query, puis « Run ».
-- Le script peut être relancé sans risque (il ne supprime aucune donnée).

-- 1. État de l'app : profil, programme, check-ins, mesures, musculation, compétitions…
create table if not exists public.cockpit_state (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  doc        jsonb not null default '{}'::jsonb,
  rev        bigint not null default 1,
  updated_at timestamptz not null default now()
);

-- 2. Activités (une ligne par activité ; les courbes à part pour garder l'app rapide)
create table if not exists public.cockpit_activities (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         text not null,
  start_at   timestamptz,
  doc        jsonb not null,
  samples    jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists cockpit_activities_start on public.cockpit_activities (user_id, start_at desc);

-- 3. Données quotidiennes Garmin (VFC, sommeil, FC de repos, poids), écrites par GitHub Actions
create table if not exists public.garmin_days (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists garmin_days_updated on public.garmin_days (user_id, updated_at);

-- 4. Demandes et comptes rendus de synchronisation Garmin
create table if not exists public.sync_runs (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source       text not null default 'app' check (source in ('app', 'auto', 'manual')),
  status       text not null default 'requested' check (status in ('requested', 'running', 'done', 'error')),
  range_from   date,
  range_to     date,
  requested_at timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,
  report       jsonb,
  error        text,
  merged       boolean not null default false
);
create index if not exists sync_runs_user on public.sync_runs (user_id, id desc);

-- 5. Jeton Garmin en cache (lisible uniquement par GitHub Actions, via la clé service_role)
create table if not exists public.garmin_token (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  expires_at   timestamptz not null,
  key_hash     text not null
);

-- Horodatage automatique
create or replace function public.cockpit_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists touch_state on public.cockpit_state;
create trigger touch_state before update on public.cockpit_state for each row execute function public.cockpit_touch();
drop trigger if exists touch_activities on public.cockpit_activities;
create trigger touch_activities before insert or update on public.cockpit_activities for each row execute function public.cockpit_touch();
drop trigger if exists touch_days on public.garmin_days;
create trigger touch_days before insert or update on public.garmin_days for each row execute function public.cockpit_touch();

-- Sécurité : chaque utilisateur ne voit que ses propres lignes
alter table public.cockpit_state      enable row level security;
alter table public.cockpit_activities enable row level security;
alter table public.garmin_days        enable row level security;
alter table public.sync_runs          enable row level security;
alter table public.garmin_token       enable row level security;  -- aucune règle : inaccessible depuis l'app

drop policy if exists own_state on public.cockpit_state;
create policy own_state on public.cockpit_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_activities on public.cockpit_activities;
create policy own_activities on public.cockpit_activities for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists read_days on public.garmin_days;
create policy read_days on public.garmin_days for select to authenticated using (user_id = auth.uid());
drop policy if exists delete_days on public.garmin_days;
create policy delete_days on public.garmin_days for delete to authenticated using (user_id = auth.uid());

drop policy if exists read_runs on public.sync_runs;
create policy read_runs on public.sync_runs for select to authenticated using (user_id = auth.uid());
drop policy if exists request_run on public.sync_runs;
create policy request_run on public.sync_runs for insert to authenticated
  with check (user_id = auth.uid() and status = 'requested' and source = 'app' and report is null);
drop policy if exists mark_run on public.sync_runs;
create policy mark_run on public.sync_runs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- L'app peut seulement marquer un compte rendu comme « intégré » ; le reste est réservé à GitHub Actions
revoke all on public.cockpit_state, public.cockpit_activities, public.garmin_days, public.sync_runs, public.garmin_token from anon;
revoke all on public.garmin_token from authenticated;
revoke update on public.sync_runs from authenticated;
grant update (merged) on public.sync_runs to authenticated;
revoke insert on public.sync_runs from authenticated;
grant insert (source, status, range_from, range_to) on public.sync_runs to authenticated;
grant select, insert, update, delete on public.cockpit_state, public.cockpit_activities to authenticated;
grant select, delete on public.garmin_days to authenticated;
grant select on public.sync_runs to authenticated;
