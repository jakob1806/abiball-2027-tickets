-- Begrenzungen gegen Missbrauch: zu viele Bestellungen oder Login-Versuche vom selben Gerät.
-- Gezählt wird pro „Eimer“ (z. B. "checkout:<Hash der IP>") in festen Zeitfenstern.
-- Die App speichert keine IP-Adressen, nur einen HMAC-Hash; Einträge werden nach einem Tag gelöscht.
-- Rückwärtskompatibel: nur neue Tabelle und neue Funktion, der bisherige Code nutzt beides nicht.

create table if not exists public.rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

-- Zählt einen Versuch (p_cost = 1) oder schaut nur nach (p_cost = 0).
-- Gibt true zurück, solange das Limit p_max im aktuellen Fenster nicht überschritten ist.
create or replace function public.rate_limit_hit(p_bucket text, p_max integer, p_window_seconds integer, p_cost integer default 1)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  if p_cost <= 0 then
    select hits into n from rate_limits where bucket = p_bucket and window_start = w;
    return coalesce(n, 0) < p_max;
  end if;

  insert into rate_limits (bucket, window_start, hits) values (p_bucket, w, p_cost)
  on conflict (bucket, window_start) do update set hits = rate_limits.hits + excluded.hits
  returning hits into n;

  -- Gelegentlich aufräumen (hält die Tabelle klein, ohne eigenen Cron)
  if random() < 0.02 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  return n <= p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer, integer) to service_role;

notify pgrst, 'reload schema';
