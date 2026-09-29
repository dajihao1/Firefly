CREATE TABLE IF NOT EXISTS private_messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL DEFAULT '',
	message TEXT NOT NULL,
	ip TEXT NOT NULL,
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_private_messages_created_at
	ON private_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_private_messages_ip_created_at
	ON private_messages (ip, created_at DESC);
