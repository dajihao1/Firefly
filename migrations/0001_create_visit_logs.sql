CREATE TABLE IF NOT EXISTS visit_logs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	ip TEXT NOT NULL,
	visited_at INTEGER NOT NULL,
	path TEXT NOT NULL,
	country TEXT,
	region TEXT,
	city TEXT,
	location TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_logs_visited_at
	ON visit_logs (visited_at DESC);
