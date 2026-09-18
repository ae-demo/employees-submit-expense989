import ballerina/sql;

// The gateway assertion carries no name/email claim (`GatewayCaller` has only
// `userId`, `username`, `scopes`, `orgHandle`), so a first-seen caller's
// employee row is provisioned from their login name — the only identifying
// fact this service is handed. There is no employee-creation endpoint in
// openapi.yaml, so this lazy upsert on any authenticated call is how the
// EMPLOYEE table gets populated at all.
function ensureEmployee(GatewayCaller caller) returns EmployeeRow|error {
    string employeeId = caller.userId;
    string displayName = caller.username != "" ? caller.username : employeeId;
    string email = displayName + "@expense.local";
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO employees (id, name, email, manager_id)
        VALUES (${employeeId}, ${displayName}, ${email}, NULL)
        ON CONFLICT (id) DO NOTHING
    `);
    EmployeeRow? existing = check findEmployee(employeeId);
    if existing is () {
        return error("employee row missing immediately after upsert");
    }
    return existing;
}

function findEmployee(string employeeId) returns EmployeeRow?|error {
    EmployeeRow|sql:Error row = dbClient->queryRow(`
        SELECT id, name, email, manager_id AS "managerId" FROM employees WHERE id = ${employeeId}
    `);
    if row is sql:NoRowsError {
        return ();
    }
    if row is sql:Error {
        return row;
    }
    return row;
}

function listEmployeeRows(int 'limit, int offset) returns [EmployeeRow[], int]|error {
    stream<EmployeeRow, sql:Error?> rows = dbClient->query(`
        SELECT id, name, email, manager_id AS "managerId" FROM employees
        ORDER BY id
        LIMIT ${'limit} OFFSET ${offset}
    `);
    EmployeeRow[] list = [];
    check from EmployeeRow r in rows
        do {
            list.push(r);
        };
    int total = check dbClient->queryRow(`SELECT COUNT(*) FROM employees`);
    return [list, total];
}

// The employees this employee manages directly — used to build the manager's
// team-claims queue.
function listReportIds(string managerId) returns string[]|error {
    stream<record {| string id; |}, sql:Error?> rows = dbClient->query(`
        SELECT id FROM employees WHERE manager_id = ${managerId}
    `);
    string[] ids = [];
    check from record {| string id; |} r in rows
        do {
            ids.push(r.id);
        };
    return ids;
}

// Sets or changes an employee's manager. Returns () on success, "not-found"
// when employeeId names no employee, "invalid" when managerId is malformed
// (self-assignment, or a manager that does not exist).
function setEmployeeManager(string employeeId, string managerId) returns EmployeeRow|"not-found"|"invalid"|error {
    EmployeeRow? employee = check findEmployee(employeeId);
    if employee is () {
        return "not-found";
    }
    if employeeId == managerId {
        return "invalid";
    }
    EmployeeRow? manager = check findEmployee(managerId);
    if manager is () {
        return "invalid";
    }
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE employees SET manager_id = ${managerId} WHERE id = ${employeeId}
    `);
    EmployeeRow? updated = check findEmployee(employeeId);
    if updated is () {
        return error("employee row disappeared after update");
    }
    return updated;
}

function toWireEmployee(EmployeeRow row) returns Employee => {
    id: row.id,
    name: row.name,
    email: row.email,
    managerId: row.managerId
};
