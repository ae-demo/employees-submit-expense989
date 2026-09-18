import { useEffect, useState } from "react";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";

type Employee = components["schemas"]["Employee"];

/**
 * The "Employee" name column on ManagerQueue/FinanceQueue and the "Manager"
 * name column on EmployeeDirectory both need a name joined onto an id that
 * the claim/employee list endpoints only return as employeeId/managerId.
 * openapi.yaml has no endpoint that returns either joined, so this makes ONE
 * bulk request to GET /employees and joins client-side, per the wireframes
 * "implementing" rule: never one request per row.
 */
export function useEmployeeDirectory(): {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  nameOf: (employeeId: string | null | undefined) => string;
} {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    expenseApi
      .GET("/employees", { params: { query: { limit: 100 } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError) {
          setError(apiError.message);
          return;
        }
        setEmployees(data?.data ?? []);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Failed to load employees");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  function nameOf(employeeId: string | null | undefined): string {
    if (!employeeId) return "—";
    return employees.find((e) => e.id === employeeId)?.name ?? employeeId;
  }

  return { employees, loading, error, nameOf };
}
