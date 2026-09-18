// Adapted from thunder-authentication's screens.example.ts pattern for
// expense-webapp's own 11 screens (specs/design/components/expense-webapp/wireframes.dsl).
//
// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS. Each row names only the
// operation the screen LOADS (or, for a form with no load call, the operation
// its submit makes); the gate follows from whether the caller may call it.
// Nothing here names a scope, a role or a handle — those live in
// specs/design/security.json, projected into ./operations.gen.ts.
//
// RAIL ORDER matches the wireframe's screen order. `navLabel` marks the five
// rows the wireframe actually draws as `sidebar` items (MyClaims,
// ManagerQueue, FinanceQueue, ExportBatches, EmployeeDirectory) — the other six
// (NewClaim, ClaimDetail, EditClaim, ManagerClaimDetail, FinanceClaimDetail,
// AssignManager) are reached by a button or a table row, exactly as the DSL
// draws them, and are not their own nav item.
//
// A NOTE ON EmployeeDirectory: `employees:read` (GET /employees) is granted to
// ALL THREE roles in security.json — Employee and LineManager hold it too, to
// resolve an employeeId into a name for the "Employee" column on
// ManagerQueue/FinanceQueue (openapi.yaml has no endpoint that returns a claim
// with the employee's name already joined). Gating this screen purely on that
// operation therefore also makes the read-only Employee Directory reachable to
// Employee and LineManager, one step beyond the issue's Acceptance summary
// ("a FinanceReviewer sees Finance Review, Export, and Employees"). This is a
// consequence of security.json's own grants, not a widened gate: per this
// skill's rule, the screen is reachable exactly when the caller may call the
// operation it loads, and nothing here reads a role. AssignManager itself
// stays Finance-only because only FinanceReviewer holds employees:manage.

import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";
import { canCall } from "./core";

export interface ScreenRoute {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly loads: OperationKey | null;
  /** Shown in the sidebar rail, gated the same way as the route. */
  readonly navLabel?: string;
  readonly public?: boolean;
}

export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { key: "myclaims", label: "My Claims", path: "/claims", loads: "GET /me/claims", navLabel: "My Claims" },
  { key: "newclaim", label: "New Claim", path: "/claims/new", loads: "POST /me/claims" },
  { key: "claimdetail", label: "Claim Detail", path: "/claims/:claimId", loads: "GET /me/claims/{claimId}" },
  { key: "editclaim", label: "Edit Claim", path: "/claims/:claimId/edit", loads: "GET /me/claims/{claimId}" },
  { key: "managerqueue", label: "Approval Queue", path: "/approvals", loads: "GET /me/team/claims", navLabel: "Approval Queue" },
  { key: "managerclaimdetail", label: "Claim Detail", path: "/approvals/:claimId", loads: "GET /me/team/claims" },
  { key: "financequeue", label: "Finance Review Queue", path: "/finance", loads: "GET /claims", navLabel: "Finance Review" },
  { key: "financeclaimdetail", label: "Claim Detail", path: "/finance/:claimId", loads: "GET /claims" },
  { key: "exportbatches", label: "Payroll Exports", path: "/export", loads: "GET /export-batches", navLabel: "Export" },
  { key: "employeedirectory", label: "Employees", path: "/employees", loads: "GET /employees", navLabel: "Employees" },
  { key: "assignmanager", label: "Assign Manager", path: "/employees/:employeeId/manager", loads: "PATCH /employees/{employeeId}/manager" },
];

// FAIL LOUDLY at module load — a committed table that outlived its contract
// must not become a screen nobody can reach and nobody notices.
for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}

/** The rail items only — the subset of SCREEN_ROUTES the wireframe draws as a sidebar entry. */
export function railScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return reachableScreens(scopes, signedIn).filter((screen) => screen.navLabel !== undefined);
}

export function hasScopedReach(scopes: ReadonlySet<string>, signedIn: boolean): boolean {
  return reachableScreens(scopes, signedIn).some((screen) => !screen.public && screen.loads !== null);
}
