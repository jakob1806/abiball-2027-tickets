-- Rauchtest nach allen Migrationen: die wichtigsten Datenbank-Funktionen einmal durchspielen.
-- Läuft in der CI gegen eine leere Datenbank; bricht bei der ersten Abweichung mit einer Fehlermeldung ab.
do $$
declare
  o orders;
  d orders;
  r record;
  n int;
begin
  -- 1) Online-Kauf: Ball + 2 Afterparty, Altersgruppe pro Person
  select * into o from create_reservation(
    'Anna Test', 'anna@example.org', 'abiturient', null, array['Ben Test', 'Cleo Test'], true, true,
    '[{"ticket_type_id":"ball","quantity":1},{"ticket_type_id":"afterparty","quantity":2}]'::jsonb,
    'stripe', false, null, array['a18', 'u18', 'u16']);
  if o.status <> 'pending' or o.amount_cents <= 0 then raise exception 'Reservierung fehlerhaft: % %', o.status, o.amount_cents; end if;

  perform fulfill_order(o.id);
  select count(*) into n from tickets where order_id = o.id and ticket_number is not null and age_group is not null;
  if n <> 3 then raise exception 'Erwartet 3 Tickets mit Nummer und Alter, gefunden %', n; end if;
  if (select age_group from tickets where order_id = o.id and holder_name = 'Cleo Test') <> 'u16' then
    raise exception 'Altersgruppe falsch zugeordnet';
  end if;

  -- 2) Doppelt erfüllen darf keine weiteren Tickets erzeugen
  perform fulfill_order(o.id);
  if (select count(*) from tickets where order_id = o.id) <> 3 then raise exception 'fulfill_order ist nicht idempotent'; end if;

  -- 3) Einlass: erster Scan ok, zweiter Scan duplicate, Altersgruppe kommt mit
  select * into r from check_in((select code from tickets where order_id = o.id and holder_name = 'Ben Test'), null, 'CI');
  if r.result <> 'ok' or r.age_group <> 'u18' then raise exception 'check_in fehlerhaft: % %', r.result, r.age_group; end if;
  select * into r from check_in((select code from tickets where order_id = o.id and holder_name = 'Ben Test'), null, 'CI');
  if r.result <> 'duplicate' then raise exception 'Doppelter Einlass nicht erkannt: %', r.result; end if;
  select * into r from check_in('WG27-XXXX-XXXX-XXXX', null, 'CI');
  if r.result <> 'invalid' then raise exception 'Unbekannter Code nicht erkannt: %', r.result; end if;

  -- 4) Abendkasse funktioniert auch bei geschlossenem Online-Verkauf
  update settings set sales_open = false;
  select * into d from create_reservation(
    'Dora Test', '', 'gast', 'Abendkasse', array[]::text[], true, true,
    '[{"ticket_type_id":"afterparty","quantity":1}]'::jsonb, 'abendkasse', false, 'Abendkasse · CI', array['a18']);
  perform fulfill_order(d.id);

  -- 5) Online-Kauf bei geschlossenem Verkauf wird abgelehnt
  begin
    perform create_reservation('Eva Test', 'eva@example.org', 'abiturient', null, array[]::text[], true, true,
      '[{"ticket_type_id":"ball","quantity":1}]'::jsonb, 'stripe', false, null, array['a18']);
    raise exception 'Verkauf trotz sales_open = false möglich';
  exception when raise_exception then
    if sqlerrm <> 'SALES_CLOSED' then raise; end if;
  end;
  update settings set sales_open = true;

  -- 6) Falsche Altersangaben werden abgelehnt
  begin
    perform create_reservation('Finn Test', 'finn@example.org', 'abiturient', null, array['Gil Test'], true, true,
      '[{"ticket_type_id":"ball","quantity":2}]'::jsonb, 'stripe', false, null, array['a18']);
    raise exception 'Fehlende Altersangabe nicht erkannt';
  exception when raise_exception then
    if sqlerrm <> 'AGE_GROUPS_MISSING' then raise; end if;
  end;

  -- 7) Von außen (anon) darf niemand die Funktionen aufrufen
  if has_function_privilege('anon', 'public.check_in(text, uuid, text)', 'execute') then
    raise exception 'anon darf check_in ausführen';
  end if;

  -- 8) Begrenzung: 2 erlaubt, der 3. Versuch nicht; Nachschauen zählt nicht mit
  if not rate_limit_hit('ci:test', 2, 60) then raise exception 'Begrenzung: 1. Versuch abgelehnt'; end if;
  if not rate_limit_hit('ci:test', 2, 60, 0) then raise exception 'Begrenzung: Nachschauen nach 1 Versuch abgelehnt'; end if;
  if not rate_limit_hit('ci:test', 2, 60) then raise exception 'Begrenzung: 2. Versuch abgelehnt'; end if;
  if rate_limit_hit('ci:test', 2, 60, 0) then raise exception 'Begrenzung: Nachschauen nach 2 Versuchen erlaubt'; end if;
  if rate_limit_hit('ci:test', 2, 60) then raise exception 'Begrenzung: 3. Versuch erlaubt'; end if;
  if not rate_limit_hit('ci:anders', 2, 60) then raise exception 'Begrenzung: anderer Eimer betroffen'; end if;
  if has_function_privilege('anon', 'public.rate_limit_hit(text, integer, integer, integer)', 'execute') then
    raise exception 'anon darf rate_limit_hit ausführen';
  end if;

  -- 9) Bestell-Limit im Admin: Standard 8, nur 1–500 erlaubt
  if (select checkout_limit from settings) <> 8 then raise exception 'checkout_limit: Standard nicht 8'; end if;
  begin
    update settings set checkout_limit = 0;
    raise exception 'checkout_limit = 0 wurde akzeptiert';
  exception when check_violation then null;
  end;

  raise notice 'Rauchtest bestanden';
end $$;
