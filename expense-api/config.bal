import ballerina/os;

// expense-db (postgres-cnpg platform-resource) — envBindings from design.json,
// verbatim. Sensible local defaults so the service starts with none of them set.
configurable string dbHost = os:getEnv("EXPENSE_DB_HOST") != "" ? os:getEnv("EXPENSE_DB_HOST") : "localhost";
configurable string dbPort = os:getEnv("EXPENSE_DB_PORT") != "" ? os:getEnv("EXPENSE_DB_PORT") : "5432";
configurable string dbUser = os:getEnv("EXPENSE_DB_USER") != "" ? os:getEnv("EXPENSE_DB_USER") : "postgres";
configurable string dbPassword = os:getEnv("EXPENSE_DB_PASSWORD") != "" ? os:getEnv("EXPENSE_DB_PASSWORD") : "postgres";
configurable string dbName = os:getEnv("EXPENSE_DB_DBNAME") != "" ? os:getEnv("EXPENSE_DB_DBNAME") : "expense_api";
