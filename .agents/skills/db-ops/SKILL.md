---
name: db-ops
description: >-
    Standardized database diagnostic and inspection runbook for PostgreSQL, SQLite, and Docker instances.
    Use when diagnosing connection pool saturation, deadlocks, long-running queries, vacuuming and WAL maintenance,
    running hermetic migrations, or executing non-interactive database CLI invocations without terminal hangs.
---

<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Copyright (c) 2026 Arafat Zahan (@kuasha420) -->
<!-- Corporate Stewardship & Infrastructure: Purrfect Software Limited (PSL) -->
<!-- Governed by: ICARO-42/b Ordinance (Company-Supported Personal IP Framework) -->

# PSL Database Operations: PostgreSQL, SQLite & Docker Runbook

This skill establishes empirical, tool-native runbooks for database diagnostics, connection pool triage, non-interactive CLI querying, and lock resolution across local and containerized environments.

---

## 1. Non-Interactive CLI Invocation Invariant

### Invariant: Zero Terminal Pagers & Fail-Fast Execution

Never execute raw interactive database commands that launch interactive pagers (`less`, `more`) or wait for user keyboard input. Always pass non-interactive flags, stop on error, and output machine-readable formats.

### 1.1 PostgreSQL (`psql`) Non-Interactive Pattern

Always specify:

- `-X` (`--no-psqlrc`): Avoid executing user rc files.
- `-v ON_ERROR_STOP=1`: Immediately return non-zero exit code on SQL error.
- `-A` (`--no-align`): Unaligned table output without trailing space padding.
- `-t` (`--tuples-only`): Print rows only without headers/footers for script pipelines.
- `-q` (`--quiet`): Suppress welcome banner and row count notifications.

```bash
# Formatted diagnostic query
psql -X -v ON_ERROR_STOP=1 -U <user> -d <dbname> -c "<SQL_QUERY>"

# Non-interactive query with explicit timeout
PGCONNECT_TIMEOUT=5 psql -X -v ON_ERROR_STOP=1 -U <user> -h localhost -d <dbname> -c "<SQL_QUERY>"
```

### 1.2 SQLite (`sqlite3`) Non-Interactive Pattern

Always specify `-bail` (exit on first error) and `-batch` (disable interactive features):

```bash
# Non-interactive column query with header
sqlite3 -bail -batch -header -column /path/to/db.sqlite "<SQL_QUERY>"

# Fast table list / schema inspection
sqlite3 -bail -batch /path/to/db.sqlite ".schema <table_name>"
```

---

## 2. PostgreSQL Diagnostics & Lock Resolution

### 2.1 Connection Pool Saturation Triage

Inspect current active connections, connection states, and connection limit:

```sql
-- Check total connections vs max_connections
SELECT
    count(*) AS current_connections,
    current_setting('max_connections')::int AS max_connections,
    round((count(*)::numeric / current_setting('max_connections')::numeric) * 100, 2) AS utilization_pct
FROM pg_stat_activity;

-- Breakdown by connection state and client
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state
ORDER BY count(*) DESC;
```

### 2.2 Active Locks & Long-Running Blocking Queries

Identify blocking transactions and blocked victims:

```sql
SELECT
    blocked_locks.pid     AS blocked_pid,
    blocked_activity.usename  AS blocked_user,
    blocking_locks.pid    AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query    AS blocked_statement,
    blocking_activity.query   AS blocking_statement,
    now() - blocked_activity.query_start AS duration
FROM  pg_catalog.pg_locks         blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks         blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### 2.3 Graceful vs. Hard Backend Termination

Always attempt graceful query cancellation before terminating server connections:

```bash
# 1. Graceful query cancellation (sends SIGINT to backend)
psql -X -v ON_ERROR_STOP=1 -c "SELECT pg_cancel_backend(<blocking_pid>);"

# 2. Hard backend termination (sends SIGTERM to backend if unresponsive)
psql -X -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(<blocking_pid>);"
```

### 2.4 Table Bloat & Vacuuming

Inspect tables requiring maintenance and execute vacuuming safely:

```bash
# Vacuum analyze specific table (reclaims space, updates planner statistics)
psql -X -v ON_ERROR_STOP=1 -c "VACUUM ANALYZE <table_name>;"
```

---

## 3. SQLite Diagnostics & WAL Maintenance

### 3.1 Write-Ahead Log (WAL) Checkpointing

When SQLite WAL files (`<db>.sqlite-wal`) grow excessively:

```bash
# Truncate WAL log file back to zero bytes
sqlite3 -bail -batch /path/to/db.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"
```

### 3.2 Integrity and Foreign Key Verification

Verify database structure and relational invariants:

```bash
# Quick integrity verification
sqlite3 -bail -batch /path/to/db.sqlite "PRAGMA integrity_check;"

# Foreign key constraints validation
sqlite3 -bail -batch /path/to/db.sqlite "PRAGMA foreign_key_check;"
```

### 3.3 Database Compaction & Timeout Configuration

Rebuild database file to reclaim unallocated pages and prevent busy lockouts:

```bash
# Set 5-second busy timeout to avoid immediate lock errors
sqlite3 -bail -batch /path/to/db.sqlite "PRAGMA busy_timeout = 5000; VACUUM;"
```

---

## 4. Docker Containerized Database Inspection

When databases run inside local or remote Docker containers:

### 4.1 Non-Interactive Docker CLI Exec Invariant

Never use `docker exec -it` in automated subagents (the `-t` allocates a pseudo-TTY which breaks pipe buffers and causes hangouts). Always use `docker exec -i` or omit `-t`:

```bash
# Query PostgreSQL container non-interactively
docker exec -i <container_name> psql -U <user> -d <dbname> -X -v ON_ERROR_STOP=1 -c "<SQL_QUERY>"

# Execute script file into PostgreSQL container
docker exec -i <container_name> psql -U <user> -d <dbname> -X -v ON_ERROR_STOP=1 < migration.sql
```

### 4.2 Database Container Log Inspection

Bounded tail inspection of database container engine logs:

```bash
docker logs --tail 100 --timestamps <container_name>
```

### 4.3 Container Health & Port Bindings Probe

```bash
docker inspect --format='{{json .NetworkSettings.Ports}}' <container_name>
docker inspect --format='{{.State.Health.Status}}' <container_name> 2>/dev/null || echo "No healthcheck"
```
