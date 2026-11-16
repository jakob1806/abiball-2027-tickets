-- Mail-Warteschlange: Wenn der Mailversand (z. B. Tageslimit bei Resend) fehlschlägt,
-- wird die Bestellung vorgemerkt und später automatisch erneut versucht.
alter table public.orders add column if not exists mail_queued_at timestamptz;
alter table public.orders add column if not exists mail_attempts integer not null default 0;
alter table public.orders add column if not exists mail_last_error text;

create index if not exists orders_mail_queue_idx
  on public.orders (mail_queued_at)
  where status = 'paid' and mail_sent_at is null and mail_queued_at is not null;
