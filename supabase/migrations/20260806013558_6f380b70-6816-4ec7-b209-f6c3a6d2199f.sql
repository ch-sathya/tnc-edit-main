REVOKE USAGE ON SCHEMA graphql, graphql_public FROM PUBLIC;
REVOKE USAGE ON SCHEMA graphql, graphql_public FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) FROM anon, authenticated;