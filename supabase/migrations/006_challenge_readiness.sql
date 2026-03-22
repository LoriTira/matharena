-- Track when each player was last seen on the lobby page.
-- Polling keeps these fresh; stale timestamps mean the player left.
ALTER TABLE challenges ADD COLUMN sender_ready_at TIMESTAMPTZ;
ALTER TABLE challenges ADD COLUMN recipient_ready_at TIMESTAMPTZ;
