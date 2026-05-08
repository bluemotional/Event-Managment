create extension if not exists pgcrypto;

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  email text,
  feishu_open_id text,
  feishu_user_id text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'custom',
  theme text not null default '',
  description text not null default '',
  start_date date not null,
  end_date date,
  location text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists event_access (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references team_members(id) on delete cascade,
  role text not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_id, member_id)
);

create table if not exists event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_id uuid references team_members(id) on delete set null,
  status text not null default 'pending',
  priority text not null default 'medium',
  due_date date not null,
  days_before_event integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_access_member on event_access(member_id, active);
create index if not exists idx_event_access_event on event_access(event_id, active);

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  category text not null default '',
  estimated_amount numeric(12, 2) not null default 0,
  actual_amount numeric(12, 2) not null default 0,
  owner_id uuid references team_members(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists material_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  quantity text not null default '',
  owner_id uuid references team_members(id) on delete set null,
  status text not null default 'needed',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists guest_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  organization text not null default '',
  role text not null default '',
  contact text not null default '',
  status text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists copy_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  channel text not null default '',
  content text not null default '',
  owner_id uuid references team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_attachments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  storage_path text not null,
  file_type text not null default '',
  size_bytes bigint not null default 0,
  note text not null default '',
  uploaded_at timestamptz not null default now()
);

create table if not exists reminder_settings (
  id boolean primary key default true,
  enabled boolean not null default true,
  first_reminder_days_before integer not null default 3,
  before_due_times text[] not null default array['09:00'],
  due_date_times text[] not null default array['09:00', '15:00'],
  overdue_times text[] not null default array['09:00', '12:00', '15:00', '18:00'],
  timezone text not null default 'Asia/Shanghai',
  updated_at timestamptz not null default now(),
  constraint reminder_settings_singleton check (id)
);

insert into reminder_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists reminder_send_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references event_tasks(id) on delete cascade,
  member_id uuid references team_members(id) on delete set null,
  scheduled_for timestamptz not null,
  phase text not null,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now(),
  unique (task_id, member_id, scheduled_for, phase)
);

create table if not exists app_snapshots (
  id text primary key default 'default',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_snapshots enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('event-attachments', 'event-attachments', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;
