// mock/handlers.ts — YOURS. The service half of mock mode: mock/authz/gateway.ts
// (copied, always) is the API gateway and answers every 401; everything here
// answers the way expense-api's openapi.yaml describes, at the reach its own
// path declares — /me/... the caller's rows, everything else every row. No
// handler here re-checks a scope: a caller who lacks one never reaches this
// file (mock/authz/gateway.ts already refused it), exactly as in a cell.
//
// STATE LIVES IN THIS MODULE, not a server: setupWorker resolves every request
// in the page's own JS context, so a reload re-runs this file and puts the
// seed data back. Only in-app navigation carries a change forward.

import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/expense-api";

type Employee = components["schemas"]["Employee"];
type ExpenseClaim = components["schemas"]["ExpenseClaim"];
type ExpenseClaimInput = components["schemas"]["ExpenseClaimInput"];
type ExportBatch = components["schemas"]["ExportBatch"];

// --- identity --------------------------------------------------------------
//
// The mock's own token shape (mock/authz/session.ts, mock/authz/gateway.ts):
// `mock:<roles>;<scopes>`. Everything before the first `;` names the role(s)
// the session is signed in as — read here to resolve "my own rows" under
// /me/..., exactly as a real backend would resolve them from the gateway
// assertion's `sub`.
function callerRole(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token.startsWith("mock:")) return "";
  const body = token.slice("mock:".length);
  const semicolon = body.indexOf(";");
  const rolesPart = semicolon >= 0 ? body.slice(0, semicolon) : body;
  return (decodeURIComponent(rolesPart).split("+")[0] ?? "").toLowerCase();
}

/** The employee record the caller's `/me/...` rows are keyed on. */
const CALLER_EMPLOYEE_ID: Record<string, string> = {
  employee: "emp-jsmith",
  linemanager: "emp-rpatel",
};

function callerEmployeeId(request: Request): string {
  return CALLER_EMPLOYEE_ID[callerRole(request)] ?? "emp-jsmith";
}

// --- seed data ---------------------------------------------------------------

let employees: Employee[] = [
  { id: "emp-jsmith", name: "J. Smith", email: "j.smith@co.com", managerId: "emp-rpatel" },
  { id: "emp-alee", name: "A. Lee", email: "a.lee@co.com", managerId: "emp-rpatel" },
  { id: "emp-rpatel", name: "R. Patel", email: "r.patel@co.com", managerId: null },
  { id: "emp-tnguyen", name: "T. Nguyen", email: "t.nguyen@co.com", managerId: null },
];

let claims: ExpenseClaim[] = [
  {
    id: "c1",
    employeeId: "emp-jsmith",
    amount: 128.5,
    category: "Travel",
    expenseDate: "2026-09-01",
    description: "Client site visit",
    receiptRef: "receipt-c1.pdf",
    status: "submitted",
    managerComment: null,
    financeComment: null,
    exported: false,
    submittedAt: "2026-09-01T09:00:00Z",
    updatedAt: "2026-09-01T09:00:00Z",
  },
  {
    id: "c2",
    employeeId: "emp-jsmith",
    amount: 42.0,
    category: "Meals",
    expenseDate: "2026-08-20",
    description: "Team lunch with client",
    receiptRef: null,
    status: "rejected",
    managerComment: "missing receipt",
    financeComment: null,
    exported: false,
    submittedAt: "2026-08-20T09:00:00Z",
    updatedAt: "2026-08-21T09:00:00Z",
  },
  {
    id: "c3",
    employeeId: "emp-jsmith",
    amount: 310.0,
    category: "Lodging",
    expenseDate: "2026-08-05",
    description: "Conference hotel",
    receiptRef: "receipt-c3.pdf",
    status: "finance-approved",
    managerComment: null,
    financeComment: null,
    exported: false,
    submittedAt: "2026-08-05T09:00:00Z",
    updatedAt: "2026-08-10T09:00:00Z",
  },
  {
    id: "c4",
    employeeId: "emp-alee",
    amount: 30.0,
    category: "Meals",
    expenseDate: "2026-08-28",
    description: "Team lunch",
    receiptRef: "receipt-c4.pdf",
    status: "submitted",
    managerComment: null,
    financeComment: null,
    exported: false,
    submittedAt: "2026-08-28T09:00:00Z",
    updatedAt: "2026-08-28T09:00:00Z",
  },
  {
    id: "c5",
    employeeId: "emp-jsmith",
    amount: 128.5,
    category: "Travel",
    expenseDate: "2026-09-01",
    description: "Airfare to client site",
    receiptRef: "receipt-c5.pdf",
    status: "manager-approved",
    managerComment: null,
    financeComment: null,
    exported: false,
    submittedAt: "2026-08-30T09:00:00Z",
    updatedAt: "2026-09-02T09:00:00Z",
  },
  {
    id: "c6",
    employeeId: "emp-alee",
    amount: 30.0,
    category: "Meals",
    expenseDate: "2026-08-28",
    description: "Lunch reimbursement",
    receiptRef: null,
    status: "manager-approved",
    managerComment: null,
    financeComment: null,
    exported: false,
    submittedAt: "2026-08-25T09:00:00Z",
    updatedAt: "2026-08-29T09:00:00Z",
  },
];

let batches: ExportBatch[] = [
  { id: "eb1", generatedAt: "2026-09-01T09:00:00Z", claimCount: 14, downloadUrl: "/export-batches/eb1.csv" },
  { id: "eb2", generatedAt: "2026-08-15T09:00:00Z", claimCount: 22, downloadUrl: "/export-batches/eb2.csv" },
];

let nextClaimId = 7;
let nextBatchId = 3;

function err(code: number, message: string): { code: number; message: string } {
  return { code, message };
}

// --- handlers ----------------------------------------------------------------

export const handlers = [
  http.get("/api/me", ({ request }) => {
    const id = callerEmployeeId(request);
    const employee = employees.find((e) => e.id === id) ?? employees[0];
    return HttpResponse.json(employee);
  }),

  // Every employee — employees:read is held by all three roles.
  http.get("/api/employees", () => {
    return HttpResponse.json({ count: employees.length, next: null, previous: null, data: employees });
  }),

  http.patch("/api/employees/:employeeId/manager", async ({ request, params }) => {
    const employeeId = String(params.employeeId);
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return HttpResponse.json(err(404, "Employee not found"), { status: 404 });
    const body = (await request.json()) as { managerId?: string };
    if (!body.managerId || !employees.some((e) => e.id === body.managerId)) {
      return HttpResponse.json(err(400, "Invalid manager assignment"), { status: 400 });
    }
    employees = employees.map((e) => (e.id === employeeId ? { ...e, managerId: body.managerId! } : e));
    return HttpResponse.json(employees.find((e) => e.id === employeeId));
  }),

  // The caller's own claims — the path says so.
  http.get("/api/me/claims", ({ request }) => {
    const id = callerEmployeeId(request);
    const status = new URL(request.url).searchParams.get("status");
    const mine = claims.filter((c) => c.employeeId === id && (!status || c.status === status));
    return HttpResponse.json({ count: mine.length, next: null, previous: null, data: mine });
  }),

  http.post("/api/me/claims", async ({ request }) => {
    const id = callerEmployeeId(request);
    const body = (await request.json()) as ExpenseClaimInput;
    if (!body.amount || !body.category || !body.expenseDate || !body.description) {
      return HttpResponse.json(err(400, "amount, category, expenseDate and description are required"), {
        status: 400,
      });
    }
    const now = new Date().toISOString();
    const created: ExpenseClaim = {
      id: `c${String(nextClaimId)}`,
      employeeId: id,
      amount: body.amount,
      category: body.category,
      expenseDate: body.expenseDate,
      description: body.description,
      receiptRef: body.receiptRef ?? null,
      status: "submitted",
      managerComment: null,
      financeComment: null,
      exported: false,
      submittedAt: now,
      updatedAt: now,
    };
    nextClaimId += 1;
    claims = [created, ...claims];
    return HttpResponse.json(created, { status: 201 });
  }),

  // A specific literal path registered ahead of the parameterised one below it
  // would matter if both matched the same request; they never do here since
  // MSW dispatches by method+path exactly, but keep GET before PUT for clarity.
  http.get("/api/me/claims/:claimId", ({ request, params }) => {
    const id = callerEmployeeId(request);
    const claim = claims.find((c) => c.id === params.claimId && c.employeeId === id);
    if (!claim) return HttpResponse.json(err(404, "Claim not found"), { status: 404 });
    return HttpResponse.json(claim);
  }),

  http.put("/api/me/claims/:claimId", async ({ request, params }) => {
    const id = callerEmployeeId(request);
    const claim = claims.find((c) => c.id === params.claimId && c.employeeId === id);
    if (!claim) return HttpResponse.json(err(404, "Claim not found"), { status: 404 });
    if (claim.status !== "rejected") {
      return HttpResponse.json(err(400, "Only a rejected claim can be edited and resubmitted"), {
        status: 400,
      });
    }
    const body = (await request.json()) as ExpenseClaimInput;
    if (!body.amount || !body.category || !body.expenseDate || !body.description) {
      return HttpResponse.json(err(400, "amount, category, expenseDate and description are required"), {
        status: 400,
      });
    }
    const updated: ExpenseClaim = {
      ...claim,
      amount: body.amount,
      category: body.category,
      expenseDate: body.expenseDate,
      description: body.description,
      receiptRef: body.receiptRef ?? null,
      status: "submitted",
      managerComment: null,
      financeComment: null,
      updatedAt: new Date().toISOString(),
    };
    claims = claims.map((c) => (c.id === updated.id ? updated : c));
    return HttpResponse.json(updated);
  }),

  // Claims submitted by the caller's reports — resolved via employees[].managerId.
  http.get("/api/me/team/claims", ({ request }) => {
    const managerId = callerEmployeeId(request);
    const reportIds = new Set(employees.filter((e) => e.managerId === managerId).map((e) => e.id));
    const status = new URL(request.url).searchParams.get("status");
    const team = claims.filter((c) => reportIds.has(c.employeeId) && (!status || c.status === status));
    return HttpResponse.json({ count: team.length, next: null, previous: null, data: team });
  }),

  http.post("/api/me/team/claims/:claimId/approve", ({ request, params }) => {
    const managerId = callerEmployeeId(request);
    const reportIds = new Set(employees.filter((e) => e.managerId === managerId).map((e) => e.id));
    const claim = claims.find((c) => c.id === params.claimId && reportIds.has(c.employeeId));
    if (!claim) return HttpResponse.json(err(404, "Claim not found"), { status: 404 });
    if (claim.status !== "submitted") {
      return HttpResponse.json(err(400, "Claim is not awaiting manager review"), { status: 400 });
    }
    const updated: ExpenseClaim = { ...claim, status: "manager-approved", updatedAt: new Date().toISOString() };
    claims = claims.map((c) => (c.id === updated.id ? updated : c));
    return HttpResponse.json(updated);
  }),

  http.post("/api/me/team/claims/:claimId/reject", async ({ request, params }) => {
    const managerId = callerEmployeeId(request);
    const reportIds = new Set(employees.filter((e) => e.managerId === managerId).map((e) => e.id));
    const claim = claims.find((c) => c.id === params.claimId && reportIds.has(c.employeeId));
    if (!claim) return HttpResponse.json(err(404, "Claim not found"), { status: 404 });
    if (claim.status !== "submitted") {
      return HttpResponse.json(err(400, "Claim is not awaiting manager review"), { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as { comment?: string };
    const updated: ExpenseClaim = {
      ...claim,
      status: "rejected",
      managerComment: body.comment ?? null,
      updatedAt: new Date().toISOString(),
    };
    claims = claims.map((c) => (c.id === updated.id ? updated : c));
    return HttpResponse.json(updated);
  }),

  // Every claim — a different operation, guarded by claims:read-all.
  http.get("/api/claims", ({ request }) => {
    const status = new URL(request.url).searchParams.get("status");
    const all = claims.filter((c) => !status || c.status === status);
    return HttpResponse.json({ count: all.length, next: null, previous: null, data: all });
  }),

  http.post("/api/claims/:claimId/approve", ({ params }) => {
    const claim = claims.find((c) => c.id === params.claimId);
    if (!claim) return HttpResponse.json(err(404, "Claim not found"), { status: 404 });
    if (claim.status !== "manager-approved") {
      return HttpResponse.json(err(400, "Claim is not awaiting finance review"), { status: 400 });
    }
    const updated: ExpenseClaim = { ...claim, status: "finance-approved", updatedAt: new Date().toISOString() };
    claims = claims.map((c) => (c.id === updated.id ? updated : c));
    return HttpResponse.json(updated);
  }),

  http.post("/api/claims/:claimId/reject", async ({ request, params }) => {
    const claim = claims.find((c) => c.id === params.claimId);
    if (!claim) return HttpResponse.json(err(404, "Claim not found"), { status: 404 });
    if (claim.status !== "manager-approved") {
      return HttpResponse.json(err(400, "Claim is not awaiting finance review"), { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as { comment?: string };
    const updated: ExpenseClaim = {
      ...claim,
      status: "rejected",
      financeComment: body.comment ?? null,
      updatedAt: new Date().toISOString(),
    };
    claims = claims.map((c) => (c.id === updated.id ? updated : c));
    return HttpResponse.json(updated);
  }),

  http.post("/api/claims/export", () => {
    const eligible = claims.filter((c) => c.status === "finance-approved" && !c.exported);
    claims = claims.map((c) => (c.status === "finance-approved" && !c.exported ? { ...c, exported: true } : c));
    const batch: ExportBatch = {
      id: `eb${String(nextBatchId)}`,
      generatedAt: new Date().toISOString(),
      claimCount: eligible.length,
      downloadUrl: `/export-batches/eb${String(nextBatchId)}.csv`,
    };
    nextBatchId += 1;
    batches = [batch, ...batches];
    return HttpResponse.json(batch, { status: 201 });
  }),

  http.get("/api/export-batches", () => {
    const sorted = [...batches].sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1));
    return HttpResponse.json({ count: sorted.length, next: null, previous: null, data: sorted });
  }),

  // Not part of the contract, but makes the wireframe's "Download CSV" link a
  // real click in the walk rather than a dead href.
  http.get("/api/export-batches/:file", ({ params }) => {
    return new HttpResponse(`generatedBatch\n${String(params.file)}\n`, {
      headers: { "Content-Type": "text/csv" },
    });
  }),
];
