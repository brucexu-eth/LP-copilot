CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS chat_requests(
 user_id TEXT NOT NULL, request_id TEXT NOT NULL, question TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('RUNNING','COMPLETE','FAILED')),
 result_json TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS chat_by_user_time ON chat_requests(user_id,created_at);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);
