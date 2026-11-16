-- Bändchenfarben je Altersgruppe im Admin pflegbar (Einstellungen → Bändchenfarben).
-- Setzt 20261116070000_altersgruppen_abendkasse.sql voraus.
alter table public.settings
  add column if not exists wristbands jsonb not null default '{
    "u16": {"name": "Rot",  "color": "#c40000"},
    "u18": {"name": "Gelb", "color": "#d9a400"},
    "a18": {"name": "Grün", "color": "#0a7d32"}
  }'::jsonb;
