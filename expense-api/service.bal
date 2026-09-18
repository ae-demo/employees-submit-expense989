import ballerina/http;

listener http:Listener ep0 = new (9090);

function clamp(int value, int min, int max) returns int {
    if value < min {
        return min;
    }
    if value > max {
        return max;
    }
    return value;
}

function pageLinks(string path, string suffix, int count, int 'limit, int offset) returns [string?, string?] {
    string? next = ();
    if offset + 'limit < count {
        next = string `${path}?limit=${'limit}&offset=${offset + 'limit}${suffix}`;
    }
    string? previous = ();
    if offset > 0 {
        int prevOffset = offset - 'limit;
        if prevOffset < 0 {
            prevOffset = 0;
        }
        previous = string `${path}?limit=${'limit}&offset=${prevOffset}${suffix}`;
    }
    return [next, previous];
}

function badRequest(string message) returns http:BadRequest => {body: <ApiError>{code: 400, message: message}};

function notFound(string message) returns http:NotFound => {body: <ApiError>{code: 404, message: message}};

service http:InterceptableService / on ep0 {

    public function createInterceptors() returns AssertionInterceptor => new;

    // ---- Employee profile & directory ----

    resource function get me(http:RequestContext ctx) returns Employee|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        EmployeeRow employee = check ensureEmployee(caller);
        return toWireEmployee(employee);
    }

    resource function get employees(int 'limit = 20, int offset = 0) returns EmployeePage|http:Unauthorized|error {
        int effLimit = clamp('limit, 1, 100);
        int effOffset = offset < 0 ? 0 : offset;
        [EmployeeRow[], int] [rows, total] = check listEmployeeRows(effLimit, effOffset);
        [string?, string?] [next, previous] = pageLinks("/employees", "", total, effLimit, effOffset);
        Employee[] data = from EmployeeRow r in rows select toWireEmployee(r);
        return {count: total, next, previous, data};
    }

    resource function patch employees/[string employeeId]/manager(SetManagerRequest payload)
            returns Employee|http:BadRequest|http:NotFound|http:Unauthorized|error {
        EmployeeRow|"not-found"|"invalid" result = check setEmployeeManager(employeeId, payload.managerId);
        if result is "not-found" {
            return notFound("employee not found");
        }
        if result is "invalid" {
            return badRequest("invalid manager assignment");
        }
        return toWireEmployee(result);
    }

    // ---- Employee: submit and track own claims ----

    resource function get me/claims(http:RequestContext ctx, string? status, int 'limit = 20, int offset = 0)
            returns ClaimPage|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        EmployeeRow employee = check ensureEmployee(caller);
        int effLimit = clamp('limit, 1, 100);
        int effOffset = offset < 0 ? 0 : offset;
        ClaimFilter filter = {employeeId: employee.id, status};
        [ClaimRow[], int] [rows, total] = check listClaimRows(filter, effLimit, effOffset);
        [string?, string?] [next, previous] = pageLinks("/me/claims", "", total, effLimit, effOffset);
        ExpenseClaim[] data = from ClaimRow r in rows select toWireClaim(r);
        return {count: total, next, previous, data};
    }

    resource function post me/claims(http:RequestContext ctx, ExpenseClaimInput payload)
            returns ExpenseClaim|http:BadRequest|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        EmployeeRow employee = check ensureEmployee(caller);
        if payload.amount <= 0d {
            return badRequest("amount must be positive");
        }
        ClaimRow created = check createClaim(employee.id, payload);
        return toWireClaim(created);
    }

    resource function get me/claims/[string claimId](http:RequestContext ctx)
            returns ExpenseClaim|http:NotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        EmployeeRow employee = check ensureEmployee(caller);
        ClaimRow? claim = check getClaimRow(claimId);
        if claim is () || claim.employeeId != employee.id {
            return notFound("claim not found");
        }
        return toWireClaim(claim);
    }

    resource function put me/claims/[string claimId](http:RequestContext ctx, ExpenseClaimInput payload)
            returns ExpenseClaim|http:BadRequest|http:NotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        EmployeeRow employee = check ensureEmployee(caller);
        if payload.amount <= 0d {
            return badRequest("amount must be positive");
        }
        ClaimRow|"not-found"|"invalid-status" result = check resubmitClaim(claimId, employee.id, payload);
        if result is "not-found" {
            return notFound("claim not found");
        }
        if result is "invalid-status" {
            return badRequest("claim is not rejected");
        }
        return toWireClaim(result);
    }

    // ---- Manager: review the team's claims ----

    resource function get me/team/claims(http:RequestContext ctx, string? status, int 'limit = 20, int offset = 0)
            returns ClaimPage|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        EmployeeRow employee = check ensureEmployee(caller);
        string[] reportIds = check listReportIds(employee.id);
        int effLimit = clamp('limit, 1, 100);
        int effOffset = offset < 0 ? 0 : offset;
        ClaimFilter filter = {employeeIds: reportIds, status};
        [ClaimRow[], int] [rows, total] = check listClaimRows(filter, effLimit, effOffset);
        [string?, string?] [next, previous] = pageLinks("/me/team/claims", "", total, effLimit, effOffset);
        ExpenseClaim[] data = from ClaimRow r in rows select toWireClaim(r);
        return {count: total, next, previous, data};
    }

    resource function post me/team/claims/[string claimId]/approve(http:RequestContext ctx)
            returns ClaimOk|http:BadRequest|http:NotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        EmployeeRow manager = check ensureEmployee(caller);
        boolean ownReport = check isOwnReportClaim(manager.id, claimId);
        if !ownReport {
            return notFound("claim not found");
        }
        ClaimRow|"not-found"|"invalid-status" result =
            check transitionClaim(claimId, "submitted", "manager-approved", manager.id, ());
        if result is "not-found" {
            return notFound("claim not found");
        }
        if result is "invalid-status" {
            return badRequest("claim is not awaiting manager review");
        }
        return <ClaimOk>{body: toWireClaim(result)};
    }

    resource function post me/team/claims/[string claimId]/reject(http:RequestContext ctx, RejectRequest payload)
            returns ClaimOk|http:BadRequest|http:NotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        EmployeeRow manager = check ensureEmployee(caller);
        boolean ownReport = check isOwnReportClaim(manager.id, claimId);
        if !ownReport {
            return notFound("claim not found");
        }
        string? comment = payload?.comment;
        ClaimRow|"not-found"|"invalid-status" result =
            check transitionClaim(claimId, "submitted", "rejected", manager.id, comment);
        if result is "not-found" {
            return notFound("claim not found");
        }
        if result is "invalid-status" {
            return badRequest("claim is not awaiting manager review");
        }
        return <ClaimOk>{body: toWireClaim(result)};
    }

    // ---- Finance: every claim, final review, payroll export ----

    resource function get claims(string? status, int 'limit = 20, int offset = 0)
            returns ClaimPage|http:Unauthorized|error {
        int effLimit = clamp('limit, 1, 100);
        int effOffset = offset < 0 ? 0 : offset;
        ClaimFilter filter = {status};
        [ClaimRow[], int] [rows, total] = check listClaimRows(filter, effLimit, effOffset);
        [string?, string?] [next, previous] = pageLinks("/claims", "", total, effLimit, effOffset);
        ExpenseClaim[] data = from ClaimRow r in rows select toWireClaim(r);
        return {count: total, next, previous, data};
    }

    resource function post claims/[string claimId]/approve(http:RequestContext ctx)
            returns ClaimOk|http:BadRequest|http:NotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        string actorId = caller.userId;
        ClaimRow|"not-found"|"invalid-status" result =
            check transitionClaim(claimId, "manager-approved", "finance-approved", actorId, ());
        if result is "not-found" {
            return notFound("claim not found");
        }
        if result is "invalid-status" {
            return badRequest("claim is not awaiting finance review");
        }
        return <ClaimOk>{body: toWireClaim(result)};
    }

    resource function post claims/[string claimId]/reject(http:RequestContext ctx, RejectRequest payload)
            returns ClaimOk|http:BadRequest|http:NotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        string actorId = caller.userId;
        string? comment = payload?.comment;
        ClaimRow|"not-found"|"invalid-status" result =
            check transitionClaim(claimId, "manager-approved", "rejected", actorId, comment);
        if result is "not-found" {
            return notFound("claim not found");
        }
        if result is "invalid-status" {
            return badRequest("claim is not awaiting finance review");
        }
        return <ClaimOk>{body: toWireClaim(result)};
    }

    resource function post claims/export(http:RequestContext ctx) returns ExportBatch|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        ExportBatchRow batch = check generateExportBatch(caller.userId);
        return toWireExportBatch(batch);
    }

    resource function get export\-batches(int 'limit = 20, int offset = 0)
            returns ExportBatchPage|http:Unauthorized|error {
        int effLimit = clamp('limit, 1, 100);
        int effOffset = offset < 0 ? 0 : offset;
        [ExportBatchRow[], int] [rows, total] = check listExportBatchRows(effLimit, effOffset);
        [string?, string?] [next, previous] = pageLinks("/export-batches", "", total, effLimit, effOffset);
        ExportBatch[] data = from ExportBatchRow r in rows select toWireExportBatch(r);
        return {count: total, next, previous, data};
    }
}

// A manager's own team-claims queue reaches only their reports' claims; a
// claim outside it is not-found for them, never forbidden (openapi-conventions:
// "reach is the path" — the row exists, just not in this caller's collection).
function isOwnReportClaim(string managerId, string claimId) returns boolean|error {
    ClaimRow? claim = check getClaimRow(claimId);
    if claim is () {
        return false;
    }
    EmployeeRow? owner = check findEmployee(claim.employeeId);
    if owner is () || owner.managerId != managerId {
        return false;
    }
    return true;
}
