import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { Paperclip } from "@wso2/oxygen-ui-icons-react";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { useEmployeeDirectory } from "../lib/useEmployeeDirectory";

type ExpenseClaim = components["schemas"]["ExpenseClaim"];

export function FinanceClaimDetailPage(): JSX.Element {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { nameOf } = useEmployeeDirectory();
  const preloaded = (location.state as { claim?: ExpenseClaim } | null)?.claim;
  const [claim, setClaim] = useState<ExpenseClaim | null>(preloaded ?? null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preloaded || !claimId) return;
    let live = true;
    // No single-claim endpoint at finance's reach either — refetch the
    // every-row list (a direct URL / reload has no router state) and find it,
    // exactly as the queue does.
    expenseApi
      .GET("/claims", { params: { query: {} } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError) {
          setError(apiError.message);
          return;
        }
        setClaim(data?.data.find((c) => c.id === claimId) ?? null);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Failed to load claim");
      });
    return () => {
      live = false;
    };
  }, [claimId, preloaded]);

  async function decide(action: "approve" | "reject"): Promise<void> {
    if (!claimId) return;
    setError(null);
    setBusy(true);
    try {
      const { error: apiError } =
        action === "approve"
          ? await expenseApi.POST("/claims/{claimId}/approve", { params: { path: { claimId } } })
          : await expenseApi.POST("/claims/{claimId}/reject", {
              params: { path: { claimId } },
              body: { comment: comment || undefined },
            });
      if (apiError) {
        setError(apiError.message);
        return;
      }
      navigate("/finance");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record the decision");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/finance")}>Back</PageTitle.BackButton>
        <PageTitle.Header>Claim Detail</PageTitle.Header>
      </PageTitle>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {!claim && !error ? <Typography color="text.secondary">Loading…</Typography> : null}

      {claim ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography>Employee: {nameOf(claim.employeeId)}</Typography>
              <Typography>Category: {claim.category}</Typography>
              <Typography>Amount: {claim.amount.toFixed(2)}</Typography>
              <Typography>Description: {claim.description}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Paperclip size={18} />
                <Typography color="text.secondary">
                  {claim.receiptRef ? `Receipt: ${claim.receiptRef}` : "No receipt attached"}
                </Typography>
              </Box>
              <TextField
                multiline
                minRows={2}
                label="Comment (for a rejection)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
              <Button variant="outlined" color="error" disabled={busy} onClick={() => void decide("reject")}>
                Reject
              </Button>
              <Button variant="contained" disabled={busy} onClick={() => void decide("approve")}>
                Approve
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </PageContent>
  );
}
