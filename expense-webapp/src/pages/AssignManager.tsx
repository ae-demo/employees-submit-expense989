import { useEffect, useState, type FormEvent, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import { useEmployeeDirectory } from "../lib/useEmployeeDirectory";

export function AssignManagerPage(): JSX.Element {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { employees, loading } = useEmployeeDirectory();
  const employee = employees.find((e) => e.id === employeeId);
  const [managerId, setManagerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (employee) setManagerId(employee.managerId ?? "");
  }, [employee]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!employeeId || !managerId) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: apiError } = await expenseApi.PATCH("/employees/{employeeId}/manager", {
        params: { path: { employeeId } },
        body: { managerId },
      });
      if (apiError) {
        setError(apiError.message);
        return;
      }
      navigate("/employees");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign the manager");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Assign Manager</PageTitle.Header>
      </PageTitle>

      {loading ? <Typography color="text.secondary">Loading…</Typography> : null}
      {!loading && !employee ? <Alert severity="error">Employee not found.</Alert> : null}

      {employee ? (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Typography>Employee: {employee.name}</Typography>
            <TextField
              select
              required
              label="Manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            >
              {employees
                .filter((candidate) => candidate.id !== employee.id)
                .map((candidate) => (
                  <MenuItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </MenuItem>
                ))}
            </TextField>
          </Stack>

          <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3, maxWidth: 480 }}>
            <Button variant="outlined" onClick={() => navigate("/employees")}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting || !managerId}>
              Save
            </Button>
          </Stack>
        </form>
      ) : null}
    </PageContent>
  );
}
