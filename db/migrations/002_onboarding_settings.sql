-- 002_onboarding_settings: onboarding answers on user_settings, so they sync.
-- All nullable: null means "not answered". Additive only; existing rows keep
-- their values and get nulls.

alter table user_settings
  add column if not exists destination     text
    check (destination ~ '^[A-Z]{2}$'),                    -- ISO 3166-1 alpha-2, from src/lib/destinations.ts
  add column if not exists travel_month    text
    check (travel_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),    -- YYYY-MM
  add column if not exists spanish_comfort text
    check (spanish_comfort in ('none','basic','conversational'));

insert into schema_migrations (version) values ('002_onboarding_settings')
  on conflict (version) do nothing;
