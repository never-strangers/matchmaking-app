create table city_config (
  value        text primary key,
  label        text not null,
  status       text not null check (status in ('live', 'coming_soon')),
  sort_order   int  not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger city_config_updated_at
  before update on city_config
  for each row execute procedure set_updated_at();

insert into city_config (value, label, status, sort_order) values
  ('sg',   'Singapore',        'live',         1),
  ('hk',   'Hong Kong',        'live',         2),
  ('bkk',  'Bangkok',          'live',         3),
  ('kl',   'Kuala Lumpur',     'live',         4),
  ('mnl',  'Manila',           'live',         5),
  ('ceb',  'Cebu',             'live',         6),
  ('hcmc', 'Ho Chi Minh City', 'live',         7),
  ('bali', 'Bali',             'coming_soon',  8),
  ('jkt',  'Jakarta',          'coming_soon',  9);

alter table city_config enable row level security;

create policy "public read" on city_config
  for select using (true);

create policy "admin insert" on city_config
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admin update" on city_config
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admin delete" on city_config
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
