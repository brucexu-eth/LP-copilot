-- Deliberately separate synthetic ledger. Never records real wallets or transactions.
CREATE TABLE IF NOT EXISTS simulation_sessions (
 id TEXT PRIMARY KEY, state_json TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS simulation_requests (
 session_id TEXT NOT NULL, request_id TEXT NOT NULL, command_json TEXT NOT NULL,
 PRIMARY KEY(session_id,request_id),
 FOREIGN KEY(session_id) REFERENCES simulation_sessions(id)
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(2);
