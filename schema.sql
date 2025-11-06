-- PostgreSQL Schema for ordiscan.com API Key Storage
-- Minimal schema to store Bitcoin address -> API key associations

-- Table to store API keys associated with Bitcoin addresses
CREATE TABLE IF NOT EXISTS address_api_keys (
    id SERIAL PRIMARY KEY,
    address VARCHAR(100) NOT NULL UNIQUE,
    api_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index on address for fast lookups
CREATE INDEX IF NOT EXISTS idx_address_api_keys_address ON address_api_keys(address);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on UPDATE
CREATE TRIGGER update_address_api_keys_updated_at
    BEFORE UPDATE ON address_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for PostgREST web_anon role
-- Note: web_anon role must be created before running this script
-- If web_anon doesn't exist, run: CREATE ROLE web_anon NOLOGIN;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'web_anon') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON address_api_keys TO web_anon;
        GRANT USAGE, SELECT ON SEQUENCE address_api_keys_id_seq TO web_anon;
    ELSE
        RAISE NOTICE 'Role web_anon does not exist. Permissions will need to be granted manually.';
    END IF;
END
$$;

-- Grant permissions (adjust user as needed)
-- GRANT ALL PRIVILEGES ON TABLE address_api_keys TO your_user;
-- GRANT USAGE, SELECT ON SEQUENCE address_api_keys_id_seq TO your_user;

