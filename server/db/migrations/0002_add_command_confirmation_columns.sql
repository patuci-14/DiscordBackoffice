-- Add confirmation columns to commands table
ALTER TABLE commands
ADD COLUMN require_confirmation BOOLEAN DEFAULT FALSE,
ADD COLUMN confirmation_message TEXT,
ADD COLUMN cancel_message TEXT; 