-- 003_phrase_moments: M8 (SPEC.md §14). A phrase's sub-group within its
-- category, and whether a fluent speaker has read its text yet.
-- Additive only. `phrases` is read by the snapshot export, not by the running
-- app, so the app does not depend on this having been applied.

alter table phrases
  add column if not exists moment text,
  add column if not exists review text not null default 'ok'
    check (review in ('ok','draft'));

insert into schema_migrations (version) values ('003_phrase_moments')
  on conflict (version) do nothing;
