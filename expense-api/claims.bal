import ballerina/sql;
import ballerina/time;
import ballerina/uuid;

function toCategoryLiteral(string s) returns "Travel"|"Meals"|"Lodging"|"Other" {
    if s == "Meals" {
        return "Meals";
    }
    if s == "Lodging" {
        return "Lodging";
    }
    if s == "Other" {
        return "Other";
    }
    return "Travel";
}

function toStatusLiteral(string s) returns "submitted"|"manager-approved"|"finance-approved"|"rejected" {
    if s == "manager-approved" {
        return "manager-approved";
    }
    if s == "finance-approved" {
        return "finance-approved";
    }
    if s == "rejected" {
        return "rejected";
    }
    return "submitted";
}

function toWireClaim(ClaimRow row) returns ExpenseClaim => {
    id: row.id,
    employeeId: row.employeeId,
    amount: row.amount,
    category: toCategoryLiteral(row.category),
    expenseDate: row.expenseDate,
    description: row.description,
    receiptRef: row.receiptRef,
    status: toStatusLiteral(row.status),
    managerComment: row.managerComment,
    financeComment: row.financeComment,
    exported: row.exported,
    submittedAt: time:utcToString(row.submittedAt),
    updatedAt: time:utcToString(row.updatedAt)
};

function getClaimRow(string claimId) returns ClaimRow?|error {
    ClaimRow|sql:Error row = dbClient->queryRow(`
        SELECT id, employee_id AS "employeeId", amount, category, expense_date AS "expenseDate",
            description, receipt_ref AS "receiptRef", status, manager_comment AS "managerComment",
            finance_comment AS "financeComment", exported, export_batch_id AS "exportBatchId",
            submitted_at AS "submittedAt", updated_at AS "updatedAt"
        FROM expense_claims WHERE id = ${claimId}
    `);
    if row is sql:NoRowsError {
        return ();
    }
    if row is sql:Error {
        return row;
    }
    return row;
}

function recordHistory(string claimId, string status, string actorId, string? comment) returns error? {
    string historyId = uuid:createRandomUuid();
    time:Utc now = time:utcNow();
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO claim_history (id, claim_id, status, actor_id, comment, changed_at)
        VALUES (${historyId}, ${claimId}, ${status}, ${actorId}, ${comment}, ${now})
    `);
    return;
}

function createClaim(string employeeId, ExpenseClaimInput input) returns ClaimRow|error {
    string claimId = uuid:createRandomUuid();
    time:Utc now = time:utcNow();
    string? receiptRef = input?.receiptRef;
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO expense_claims (id, employee_id, amount, category, expense_date, description,
            receipt_ref, status, manager_comment, finance_comment, exported, export_batch_id,
            submitted_at, updated_at)
        VALUES (${claimId}, ${employeeId}, ${input.amount}, ${input.category}, ${input.expenseDate},
            ${input.description}, ${receiptRef}, 'submitted', NULL, NULL, FALSE, NULL, ${now}, ${now})
    `);
    check recordHistory(claimId, "submitted", employeeId, ());
    ClaimRow? row = check getClaimRow(claimId);
    if row is () {
        return error("claim row missing immediately after insert");
    }
    return row;
}

type ClaimFilter record {|
    string? employeeId = ();
    string[]? employeeIds = ();
    string? status = ();
|};

function buildClaimQuery(ClaimFilter filter, int 'limit, int offset) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery query = `
        SELECT id, employee_id AS "employeeId", amount, category, expense_date AS "expenseDate",
            description, receipt_ref AS "receiptRef", status, manager_comment AS "managerComment",
            finance_comment AS "financeComment", exported, export_batch_id AS "exportBatchId",
            submitted_at AS "submittedAt", updated_at AS "updatedAt"
        FROM expense_claims WHERE 1 = 1
    `;
    string? employeeId = filter.employeeId;
    if employeeId is string {
        query = sql:queryConcat(query, ` AND employee_id = ${employeeId}`);
    }
    string[]? employeeIds = filter.employeeIds;
    if employeeIds is string[] {
        query = sql:queryConcat(query, ` AND employee_id = ANY(${employeeIds})`);
    }
    string? status = filter.status;
    if status is string {
        query = sql:queryConcat(query, ` AND status = ${status}`);
    }
    query = sql:queryConcat(query, ` ORDER BY submitted_at DESC LIMIT ${'limit} OFFSET ${offset}`);
    return query;
}

function buildCountQuery(ClaimFilter filter) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery query = `SELECT COUNT(*) FROM expense_claims WHERE 1 = 1`;
    string? employeeId = filter.employeeId;
    if employeeId is string {
        query = sql:queryConcat(query, ` AND employee_id = ${employeeId}`);
    }
    string[]? employeeIds = filter.employeeIds;
    if employeeIds is string[] {
        query = sql:queryConcat(query, ` AND employee_id = ANY(${employeeIds})`);
    }
    string? status = filter.status;
    if status is string {
        query = sql:queryConcat(query, ` AND status = ${status}`);
    }
    return query;
}

function listClaimRows(ClaimFilter filter, int 'limit, int offset) returns [ClaimRow[], int]|error {
    stream<ClaimRow, sql:Error?> rows = dbClient->query(buildClaimQuery(filter, 'limit, offset));
    ClaimRow[] list = [];
    check from ClaimRow r in rows
        do {
            list.push(r);
        };
    int total = check dbClient->queryRow(buildCountQuery(filter));
    return [list, total];
}

// Approves or rejects a claim, checked against the status it must currently
// hold. Returns the updated row, "not-found" when claimId names no claim, or
// "invalid-status" when the claim is not in `fromStatus`.
function transitionClaim(string claimId, string fromStatus, string toStatus, string actorId, string? comment)
        returns ClaimRow|"not-found"|"invalid-status"|error {
    ClaimRow? row = check getClaimRow(claimId);
    if row is () {
        return "not-found";
    }
    if row.status != fromStatus {
        return "invalid-status";
    }
    time:Utc now = time:utcNow();
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE expense_claims
        SET status = ${toStatus}, updated_at = ${now},
            manager_comment = CASE WHEN ${toStatus} = 'rejected' AND ${fromStatus} = 'submitted' THEN ${comment} ELSE manager_comment END,
            finance_comment = CASE WHEN ${toStatus} = 'rejected' AND ${fromStatus} = 'manager-approved' THEN ${comment} ELSE finance_comment END
        WHERE id = ${claimId}
    `);
    check recordHistory(claimId, toStatus, actorId, comment);
    ClaimRow? updated = check getClaimRow(claimId);
    if updated is () {
        return error("claim row disappeared after update");
    }
    return updated;
}

// Edits and resubmits a claim the caller owns that is currently rejected.
// Restarts the two-step review from the top, per submit-and-approve-claim.md.
function resubmitClaim(string claimId, string employeeId, ExpenseClaimInput input)
        returns ClaimRow|"not-found"|"invalid-status"|error {
    ClaimRow? row = check getClaimRow(claimId);
    if row is () {
        return "not-found";
    }
    if row.employeeId != employeeId {
        // Not the caller's claim — indistinguishable from not existing.
        return "not-found";
    }
    if row.status != "rejected" {
        return "invalid-status";
    }
    time:Utc now = time:utcNow();
    string? receiptRef = input?.receiptRef;
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE expense_claims
        SET amount = ${input.amount}, category = ${input.category}, expense_date = ${input.expenseDate},
            description = ${input.description}, receipt_ref = ${receiptRef}, status = 'submitted',
            manager_comment = NULL, finance_comment = NULL, updated_at = ${now}
        WHERE id = ${claimId}
    `);
    check recordHistory(claimId, "submitted", employeeId, ());
    ClaimRow? updated = check getClaimRow(claimId);
    if updated is () {
        return error("claim row disappeared after update");
    }
    return updated;
}
