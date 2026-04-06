-- CloudRizzle initial SQL setup
-- Runs once when postgres container starts for the first time

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Ensure DB exists (already created by POSTGRES_DB env var)
-- This file is for any additional setup needed

SELECT 'CloudRizzle DB initialized' AS message;
