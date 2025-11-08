-- Migration script to add 'provider' column to existing address_api_keys table
-- Run this script if you have an existing database with the old schema

-- Step 1: Add provider column with default value 'ordiscan' (for existing rows)
ALTER TABLE address_api_keys 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NOT NULL DEFAULT 'ordiscan';

-- Step 2: Drop the old UNIQUE constraint on address alone (if it exists)
-- Note: This will fail if there are duplicate addresses, which shouldn't happen
-- but we check first
DO $$
BEGIN
    -- Check if unique constraint exists on address column
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'address_api_keys_address_key'
    ) THEN
        ALTER TABLE address_api_keys DROP CONSTRAINT address_api_keys_address_key;
    END IF;
END $$;

-- Step 3: Add new UNIQUE constraint on (address, provider)
-- This allows multiple keys per address (one per provider)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'address_api_keys_address_provider_key'
    ) THEN
        ALTER TABLE address_api_keys 
        ADD CONSTRAINT address_api_keys_address_provider_key 
        UNIQUE(address, provider);
    END IF;
END $$;

-- Step 4: Create index on (address, provider) if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_address_api_keys_address_provider 
ON address_api_keys(address, provider);

-- Step 5: Verify migration
-- You can run this query to verify:
-- SELECT address, provider, created_at FROM address_api_keys ORDER BY address, provider;



