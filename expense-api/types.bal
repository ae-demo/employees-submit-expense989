import ballerina/http;
import ballerina/time;

// Wire types — mirror components/schemas in specs/design/components/expense-api/openapi.yaml
// exactly: same fields, same required/optional/nullable shape.

public type Employee record {|
    string id;
    string name;
    string email;
    string? managerId?;
|};

public type ExpenseClaimInput record {|
    decimal amount;
    "Travel"|"Meals"|"Lodging"|"Other" category;
    string expenseDate;
    string description;
    string? receiptRef?;
|};

public type ExpenseClaim record {|
    string id;
    string employeeId;
    decimal amount;
    "Travel"|"Meals"|"Lodging"|"Other" category;
    string expenseDate;
    string description;
    string? receiptRef?;
    "submitted"|"manager-approved"|"finance-approved"|"rejected" status;
    string? managerComment?;
    string? financeComment?;
    boolean exported;
    string submittedAt;
    string updatedAt?;
|};

public type ExportBatch record {|
    string id;
    string generatedAt;
    int claimCount;
    string downloadUrl?;
|};

public type ApiError record {|
    int code;
    string message;
    string description?;
    string moreInfo?;
|};

public type EmployeePage record {|
    int count;
    string? next;
    string? previous;
    Employee[] data;
|};

public type ClaimPage record {|
    int count;
    string? next;
    string? previous;
    ExpenseClaim[] data;
|};

public type ExportBatchPage record {|
    int count;
    string? next;
    string? previous;
    ExportBatch[] data;
|};

public type SetManagerRequest record {|
    string managerId;
|};

public type RejectRequest record {|
    string comment?;
|};

// http:Ok wrapper for the four decision endpoints, whose contract status is
// '200' rather than the framework's POST default of 201.
public type ClaimOk record {|
    *http:Ok;
    ExpenseClaim body;
|};

// Internal row shapes — how each entity is stored, independent of the wire
// shape above. Plain `string` for date/timestamp columns; converted to/from
// `time:Utc` at the store boundary.
public type EmployeeRow record {|
    string id;
    string name;
    string email;
    string? managerId;
|};

public type ClaimRow record {|
    string id;
    string employeeId;
    decimal amount;
    string category;
    string expenseDate;
    string description;
    string? receiptRef;
    string status;
    string? managerComment;
    string? financeComment;
    boolean exported;
    string? exportBatchId;
    time:Utc submittedAt;
    time:Utc updatedAt;
|};

public type ExportBatchRow record {|
    string id;
    string generatedBy;
    time:Utc generatedAt;
    int claimCount;
|};

public type HistoryRow record {|
    string id;
    string claimId;
    string status;
    string actorId;
    string? comment;
    time:Utc changedAt;
|};
