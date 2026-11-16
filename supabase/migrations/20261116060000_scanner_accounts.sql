-- Scanner-Konten (Helfer am Einlass) und Protokoll, wer welches Ticket eingescannt hat.
create table if not exists public.scanner_users (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  username       text not null unique check (username = lower(username) and username ~ '^[a-z0-9._-]{3,32}$'),
  password_hash  text not null,          -- scrypt (zum Prüfen)
  password_enc   text not null,          -- AES-256-GCM (zum Anzeigen im Admin)
  token_version  integer not null default 1,
  active         boolean not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now()
);
alter table public.scanner_users enable row level security;
revoke all on public.scanner_users from anon, authenticated;

alter table public.tickets  add column if not exists checked_in_by uuid references public.scanner_users (id) on delete set null;
alter table public.tickets  add column if not exists checked_in_by_label text;
alter table public.checkins add column if not exists scanner_user_id uuid references public.scanner_users (id) on delete set null;
alter table public.checkins add column if not exists scanner_label text;

-- check_in mit Angabe, wer scannt
drop function if exists public.check_in(text);
create function public.check_in(p_code text, p_scanner_id uuid default null, p_label text default null)
returns table (
  result text,
  ticket_id uuid,
  code text,
  holder_name text,
  ticket_type_id text,
  checked_in_at timestamptz,
  order_id uuid,
  ticket_number text,
  checked_in_by_label text
)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  t tickets;
  o orders;
  normalized text := upper(regexp_replace(trim(p_code), '\s', '', 'g'));
  res text;
  prev timestamptz;
  by_label text;
begin
  select * into t from tickets k where k.code = normalized for update;
  if not found then
    insert into checkins (code, result, scanner_user_id, scanner_label) values (normalized, 'invalid', p_scanner_id, p_label);
    return query select 'invalid'::text, null::uuid, normalized, null::text, null::text, null::timestamptz, null::uuid, null::text, null::text;
    return;
  end if;

  select * into o from orders where id = t.order_id;

  if t.status <> 'valid' or o.status <> 'paid' then
    res := 'cancelled';
    prev := t.checked_in_at;
    by_label := t.checked_in_by_label;
  elsif t.checked_in_at is not null then
    res := 'duplicate';
    prev := t.checked_in_at;
    by_label := t.checked_in_by_label;
  else
    res := 'ok';
    update tickets
       set checked_in_at = now(), checked_in_by = p_scanner_id, checked_in_by_label = p_label
     where id = t.id
     returning tickets.checked_in_at into prev;
    by_label := p_label;
  end if;

  insert into checkins (ticket_id, code, result, scanner_user_id, scanner_label) values (t.id, t.code, res, p_scanner_id, p_label);
  return query select res, t.id, t.code, t.holder_name, t.ticket_type_id, prev, t.order_id, t.ticket_number, by_label;
end;
$$;
revoke all on function public.check_in(text, uuid, text) from public, anon, authenticated;
grant execute on function public.check_in(text, uuid, text) to service_role;

notify pgrst, 'reload schema';
