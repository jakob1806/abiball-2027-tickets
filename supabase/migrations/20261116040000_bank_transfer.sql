-- Zahlung per Überweisung (Vorkasse): Kontodaten in den Einstellungen,
-- Verwendungszweck, Zahlungsfrist und Erinnerung an der Bestellung.
alter table public.settings add column if not exists bank_transfer_enabled boolean not null default false;
alter table public.settings add column if not exists bank_account_holder text;
alter table public.settings add column if not exists bank_iban text;
alter table public.settings add column if not exists bank_bic text;
alter table public.settings add column if not exists bank_name text;
alter table public.settings add column if not exists transfer_days integer not null default 7 check (transfer_days between 2 and 30);

alter table public.orders add column if not exists transfer_reference text unique;
alter table public.orders add column if not exists transfer_due_at timestamptz;
alter table public.orders add column if not exists transfer_reminder_sent_at timestamptz;

create index if not exists orders_transfer_open_idx
  on public.orders (transfer_due_at)
  where status = 'pending' and payment_method = 'ueberweisung';
