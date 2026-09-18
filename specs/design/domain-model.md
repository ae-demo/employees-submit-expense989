# Domain Model

The system centers on the expense claim as it moves from employee submission
through manager and finance review to payroll export, plus the
employee-manager assignments that route each claim to its approver.

```mermaid
erDiagram
    EMPLOYEE {
        string id
        string name
        string email
        string managerId
    }
    EXPENSE_CLAIM {
        string id
        string employeeId
        decimal amount
        string category
        date expenseDate
        string description
        string receiptRef
        string status
        string managerComment
        string financeComment
        boolean exported
        datetime submittedAt
        datetime updatedAt
    }
    CLAIM_HISTORY {
        string id
        string claimId
        string status
        string actorId
        string comment
        datetime changedAt
    }
    EXPORT_BATCH {
        string id
        string generatedBy
        datetime generatedAt
        integer claimCount
    }

    EMPLOYEE ||--o{ EXPENSE_CLAIM : submits
    EMPLOYEE ||--o{ EMPLOYEE : manages
    EXPENSE_CLAIM ||--o{ CLAIM_HISTORY : records
    EXPORT_BATCH ||--o{ EXPENSE_CLAIM : includes
```

- **EMPLOYEE** — every person in the system (employee, manager, or finance
reviewer); `managerId` self-references EMPLOYEE to encode the reporting
line finance maintains.
- **EXPENSE\_CLAIM** — `status` moves through `submitted` →
`manager-approved` → `finance-approved` (or `rejected` at either step, back
to the employee) → `exported`; `exported` flips once a batch includes it.
- **CLAIM\_HISTORY** — an audit trail of every status change, who made it, and
any comment.
- **EXPORT\_BATCH** — one row per CSV export finance generates, so an already
exported claim is never included again.

