alter table searches add column if not exists search_strategy jsonb;
alter table searches add column if not exists web_results jsonb;
alter table searches add column if not exists prospecting_error text;
alter table search_results add column if not exists qualification jsonb;
