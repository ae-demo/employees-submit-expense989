screen MyClaims "An employee's own claims and their status"
  navbar "Expense Claims"
  sidebar "My Claims -> MyClaims"
  row
    heading "My Claims"
    right
    button "New Claim" primary -> NewClaim
  table "Date | Category | Amount | Status"
    row "2026-09-01 | Travel | 128.50 | submitted"
    row "2026-08-20 | Meals | 42.00 | rejected"
    row "2026-08-05 | Lodging | 310.00 | finance-approved" -> ClaimDetail

screen NewClaim "Submit a new expense claim"
  navbar "Expense Claims"
  sidebar "My Claims -> MyClaims"
  heading "New Claim"
  select "Category (Travel, Meals, Lodging, Other)"
  input "Amount"
  input "Expense date"
  textarea "Description"
  input "Receipt (optional)"
  row
    right
    button "Cancel" -> MyClaims
    button "Submit Claim" primary -> MyClaims

screen ClaimDetail "One claim's full detail and history"
  navbar "Expense Claims"
  sidebar "My Claims -> MyClaims"
  heading "Claim Detail"
  text "Category: Meals"
  text "Amount: 42.00"
  text "Description: Team lunch with client"
  badge "rejected" danger
  text "Manager comment: missing receipt"
  row
    right
    button "Edit & Resubmit" primary -> EditClaim

screen EditClaim "Edit and resubmit a rejected claim"
  navbar "Expense Claims"
  sidebar "My Claims -> MyClaims"
  heading "Edit Claim"
  select "Category (Travel, Meals, Lodging, Other)"
  input "Amount"
  input "Expense date"
  textarea "Description"
  input "Receipt (optional)"
  row
    right
    button "Cancel" -> ClaimDetail
    button "Resubmit" primary -> MyClaims

screen ManagerQueue "Claims from the manager's reports awaiting review"
  navbar "Expense Claims"
  sidebar "Approval Queue -> ManagerQueue"
  heading "Approval Queue"
  table "Employee | Date | Category | Amount | Status" -> ManagerClaimDetail
    row "J. Smith | 2026-09-01 | Travel | 128.50 | submitted"
    row "A. Lee | 2026-08-28 | Meals | 30.00 | submitted"

screen ManagerClaimDetail "Review one report's claim as manager"
  navbar "Expense Claims"
  sidebar "Approval Queue -> ManagerQueue"
  heading "Claim Detail"
  text "Employee: J. Smith"
  text "Category: Travel"
  text "Amount: 128.50"
  text "Description: Client site visit"
  image "Receipt"
  textarea "Comment (for a rejection)"
  row
    right
    button "Reject" danger -> ManagerQueue
    button "Approve" primary -> ManagerQueue

screen FinanceQueue "Manager-approved claims awaiting finance review"
  navbar "Expense Claims"
  sidebar "Finance Review -> FinanceQueue | Export -> ExportBatches | Employees -> EmployeeDirectory"
  heading "Finance Review Queue"
  table "Employee | Date | Category | Amount | Status" -> FinanceClaimDetail
    row "J. Smith | 2026-09-01 | Travel | 128.50 | manager-approved"
    row "A. Lee | 2026-08-28 | Meals | 30.00 | manager-approved"

screen FinanceClaimDetail "Review one manager-approved claim as finance"
  navbar "Expense Claims"
  sidebar "Finance Review -> FinanceQueue | Export -> ExportBatches | Employees -> EmployeeDirectory"
  heading "Claim Detail"
  text "Employee: J. Smith"
  text "Category: Travel"
  text "Amount: 128.50"
  text "Description: Client site visit"
  image "Receipt"
  textarea "Comment (for a rejection)"
  row
    right
    button "Reject" danger -> FinanceQueue
    button "Approve" primary -> FinanceQueue

screen ExportBatches "Payroll export batches, past and new"
  navbar "Expense Claims"
  sidebar "Finance Review -> FinanceQueue | Export -> ExportBatches | Employees -> EmployeeDirectory"
  row
    heading "Payroll Exports"
    right
    button "Export Now" primary // generates a batch and stays on this list
  table "Generated | Claims | Download"
    row "2026-09-01 09:00 | 14 | Download CSV"
    row "2026-08-15 09:00 | 22 | Download CSV"

screen EmployeeDirectory "Employees and their manager assignment"
  navbar "Expense Claims"
  sidebar "Finance Review -> FinanceQueue | Export -> ExportBatches | Employees -> EmployeeDirectory"
  heading "Employees"
  table "Name | Email | Manager" -> AssignManager
    row "J. Smith | j.smith@co.com | R. Patel"
    row "A. Lee | a.lee@co.com | R. Patel"

screen AssignManager "Set or change an employee's manager"
  navbar "Expense Claims"
  sidebar "Finance Review -> FinanceQueue | Export -> ExportBatches | Employees -> EmployeeDirectory"
  heading "Assign Manager"
  text "Employee: J. Smith"
  select "Manager"
  row
    right
    button "Cancel" -> EmployeeDirectory
    button "Save" primary -> EmployeeDirectory

flow "Submit and track claims"
  role "Employee"
  description "An employee submits a claim, tracks its status, and resubmits a rejected one"
  MyClaims
  NewClaim
  ClaimDetail
  EditClaim

flow "Approval queue"
  role "LineManager"
  description "A manager reviews and decides claims submitted by their reports"
  ManagerQueue
  ManagerClaimDetail

flow "Finance review and export"
  role "FinanceReviewer"
  description "Finance gives the final review, exports payroll batches, and maintains manager assignments"
  FinanceQueue
  FinanceClaimDetail
  ExportBatches
  EmployeeDirectory
  AssignManager
