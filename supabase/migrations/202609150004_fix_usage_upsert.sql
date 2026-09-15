-- PostgREST cannot infer the previous partial index for ON CONFLICT(search_id, type).
-- A normal unique index still permits multiple NULL search_id values in PostgreSQL.
DROP INDEX IF EXISTS usage_one_type_per_search;
CREATE UNIQUE INDEX IF NOT EXISTS usage_one_type_per_search
  ON usage(search_id, type);
