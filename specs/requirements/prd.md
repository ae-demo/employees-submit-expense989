# Expense Claims &amp; Payroll Export — PRD

## Problem Statement

Employees who pay for business expenses out of pocket have no consistent way
to request reimbursement. Today, claims travel through email or paper forms:
managers have no single queue to review them, finance has no reliable list of
what has actually been approved, and getting approved amounts into payroll
means re-keying numbers from scattered messages. The result is slow
reimbursement, claims that fall through the cracks, and payroll runs finance
cannot fully trust.

## Solution

A single system where employees submit expense claims with the details and
receipts finance needs, managers review and approve or reject them, and
finance gives a second review before exporting every approved claim as a
payroll-ready file. Every claim's status — submitted, manager-approved,
finance-approved, rejected — is visible to everyone who needs it, so nothing
is chased down over email.

## Actors

- **Employee** — submits expense claims, tracks their status, and edits and
resubmits any claim that is rejected.
- **Manager** — reviews the claims submitted by their reports, approving or
rejecting each with an optional comment.
- **Finance** — gives the second, final review on manager-approved claims,
exports approved claims as a payroll-ready file, and maintains each
employee's manager assignment.

## User Stories

1. As an Employee, I want to submit an expense claim with an amount, category,
date, description, and receipt, so that I can request reimbursement.
2. As an Employee, I want to see the status of every claim I've submitted, so
that I know whether it's pending, approved, or rejected.
3. As an Employee, I want to edit and resubmit a claim my manager or finance
rejected, so that I can correct it and get paid without starting over.
4. As a Manager, I want to see a queue of claims submitted by my reports that
need my review, so that I can act on them without chasing anyone.
5. As a Manager, I want to approve or reject a claim, with an optional comment
explaining a rejection, so that the employee knows what to fix.
6. As Finance, I want to see a queue of manager-approved claims awaiting my
review, so that I can give the final check before payroll export.
7. As Finance, I want to approve or reject a manager-approved claim, so that
only claims I've verified reach payroll.
8. As Finance, I want to export all finance-approved claims as a downloadable
file, so that I can load them into payroll.
9. As Finance, I want exported claims marked so they aren't exported twice, so
that payroll never double-pays a claim.
10. As Finance, I want to assign or change each employee's manager directly in
the system, so that claims route to the right approver.

## Product Decisions

- Approval flow is two-step: a claim needs the employee's manager to approve
it, then finance gives a final review and approval, before it is eligible
for export.
- A claim rejected at either the manager or the finance step returns to the
employee, who can edit and resubmit it for another full round of review.
- Finance's export is a downloadable file (CSV) of finance-approved claims;
there is no direct integration with a specific payroll system.
- Sign-in is via SSO through Thunder, the platform identity provider — this
is an internal tool, so there is no self-service sign-up; employee,
manager, and finance accounts are provisioned by the organization.
*assumed*
- Each claim carries one of a fixed list of categories — Travel, Meals,
Lodging, and Other; the list is built in and not managed by finance.
- Employee-manager assignments are entered and maintained directly in this
system, by finance; there is no dependency on an external HR/directory
system.
- Attaching a receipt is optional at submission but the field is always
available on the claim. *assumed*
- All claims are in a single currency; multi-currency support is not
included. *assumed*
- Employees, managers, and finance are notified in-app when a claim's status
changes (submitted, manager-approved, finance-approved, rejected,
exported); there is no separate email/SMS channel.

## Out of Scope

- Direct API integration with any specific payroll provider — export is a
downloadable file only.
- Multi-currency claims and currency conversion.
- Mileage or per-diem calculators — amounts are entered directly by the
employee.
- Budget tracking, spend limits, or analytics/reporting dashboards.
- Multi-level manager escalation by claim amount.

## Open Questions

None.

## Further Notes

None.

