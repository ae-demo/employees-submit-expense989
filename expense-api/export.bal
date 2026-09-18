import ballerina/sql;
import ballerina/time;
import ballerina/uuid;

function toWireExportBatch(ExportBatchRow row) returns ExportBatch => {
    id: row.id,
    generatedAt: time:utcToString(row.generatedAt),
    claimCount: row.claimCount
};

function csvField(string value) returns string {
    if value.includes(",") || value.includes("\"") || value.includes("\n") {
        string escaped = re `"`.replaceAll(value, "\"\"");
        return "\"" + escaped + "\"";
    }
    return value;
}

function buildCsv(ClaimRow[] claims) returns string {
    string csv = "id,employeeId,amount,category,expenseDate,description,submittedAt\n";
    foreach ClaimRow claim in claims {
        string[] fields = [
            claim.id,
            claim.employeeId,
            claim.amount.toString(),
            claim.category,
            claim.expenseDate,
            csvField(claim.description),
            time:utcToString(claim.submittedAt)
        ];
        csv += string:'join(",", ...fields) + "\n";
    }
    return csv;
}

// Generates a payroll export batch of every finance-approved claim not yet
// exported (AC-011-a/b: a claim short of finance approval is never a
// candidate here, so it is filtered out rather than rejected with an error —
// exportClaims in openapi.yaml takes no claimId and declares no 400), and
// marks each included claim exported so a later export never re-includes it
// (AC-009-b).
function generateExportBatch(string actorId) returns ExportBatchRow|error {
    ClaimFilter filter = {status: "finance-approved"};
    stream<ClaimRow, sql:Error?> rows = dbClient->query(buildClaimQuery(filter, 1000000, 0));
    ClaimRow[] eligible = [];
    check from ClaimRow r in rows
        where !r.exported
        do {
            eligible.push(r);
        };

    string batchId = uuid:createRandomUuid();
    time:Utc now = time:utcNow();
    string csv = buildCsv(eligible);
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO export_batches (id, generated_by, generated_at, claim_count, csv_content)
        VALUES (${batchId}, ${actorId}, ${now}, ${eligible.length()}, ${csv})
    `);
    foreach ClaimRow claim in eligible {
        sql:ExecutionResult _ = check dbClient->execute(`
            UPDATE expense_claims SET exported = TRUE, export_batch_id = ${batchId}, updated_at = ${now}
            WHERE id = ${claim.id}
        `);
        check recordHistory(claim.id, "exported", actorId, ());
    }
    return {id: batchId, generatedBy: actorId, generatedAt: now, claimCount: eligible.length()};
}

function listExportBatchRows(int 'limit, int offset) returns [ExportBatchRow[], int]|error {
    stream<ExportBatchRow, sql:Error?> rows = dbClient->query(`
        SELECT id, generated_by AS "generatedBy", generated_at AS "generatedAt", claim_count AS "claimCount"
        FROM export_batches
        ORDER BY generated_at DESC
        LIMIT ${'limit} OFFSET ${offset}
    `);
    ExportBatchRow[] list = [];
    check from ExportBatchRow r in rows
        do {
            list.push(r);
        };
    int total = check dbClient->queryRow(`SELECT COUNT(*) FROM export_batches`);
    return [list, total];
}
