-- CloudRizzle Database Initialization
-- Run once on fresh PostgreSQL instance

-- Enable pgvector extension for AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cloudrizzle TO postgres;
