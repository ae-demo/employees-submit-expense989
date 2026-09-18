import ballerina/sql;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

final int dbPortNumber = check int:fromString(dbPort);

final postgresql:Client dbClient = check new (
    host = dbHost,
    username = dbUser,
    password = dbPassword,
    database = dbName,
    port = dbPortNumber
);

// Runs before any listener starts, so a schema failure fails the service fast
// rather than 500ing the first request.
final () schemaReady = check initSchema();

function initSchema() returns error? {
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            manager_id TEXT NULL REFERENCES employees(id)
        )
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS expense_claims (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL REFERENCES employees(id),
            amount NUMERIC NOT NULL,
            category TEXT NOT NULL,
            expense_date TEXT NOT NULL,
            description TEXT NOT NULL,
            receipt_ref TEXT NULL,
            status TEXT NOT NULL,
            manager_comment TEXT NULL,
            finance_comment TEXT NULL,
            exported BOOLEAN NOT NULL DEFAULT FALSE,
            export_batch_id TEXT NULL,
            submitted_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS claim_history (
            id TEXT PRIMARY KEY,
            claim_id TEXT NOT NULL REFERENCES expense_claims(id),
            status TEXT NOT NULL,
            actor_id TEXT NOT NULL,
            comment TEXT NULL,
            changed_at TIMESTAMPTZ NOT NULL
        )
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS export_batches (
            id TEXT PRIMARY KEY,
            generated_by TEXT NOT NULL,
            generated_at TIMESTAMPTZ NOT NULL,
            claim_count INT NOT NULL,
            csv_content TEXT NOT NULL
        )
    `);
    return;
}
