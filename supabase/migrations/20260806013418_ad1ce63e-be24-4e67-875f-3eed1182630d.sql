REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA graphql, graphql_public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA graphql, graphql_public FROM PUBLIC, anon, authenticated;

ALTER ROLE authenticator SET pgrst.db_schemas = 'public';
ALTER ROLE anon SET pgrst.db_schemas = 'public';
ALTER ROLE authenticated SET pgrst.db_schemas = 'public';
NOTIFY pgrst, 'reload config';