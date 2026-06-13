-- PostgreSQL role-based access for DataBundle
-- Applied on first container start

-- Application role (used by API via DATABASE_URL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'databundle_app') THEN
    CREATE ROLE databundle_app WITH LOGIN PASSWORD 'databundle_app_secret';
  END IF;
END $$;

GRANT CONNECT ON DATABASE databundle TO databundle_app;
GRANT USAGE ON SCHEMA public TO databundle_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO databundle_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO databundle_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO databundle_app;

-- Read-only role for analytics/reporting
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'databundle_readonly') THEN
    CREATE ROLE databundle_readonly WITH LOGIN PASSWORD 'databundle_readonly_secret';
  END IF;
END $$;

GRANT CONNECT ON DATABASE databundle TO databundle_readonly;
GRANT USAGE ON SCHEMA public TO databundle_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO databundle_readonly;
