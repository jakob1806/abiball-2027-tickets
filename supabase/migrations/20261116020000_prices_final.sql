-- Schalter: Solange false, zeigt die Seite die Preise als Platzhalter an.
alter table public.settings add column if not exists prices_final boolean not null default false;
