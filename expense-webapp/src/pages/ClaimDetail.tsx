import { useEffect, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, CardContent, PageContent, PageTitle, Stack, Typography } from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { StatusBadge } from "../lib/StatusBadge";

type ExpenseClaim = components["schemas"]["ExpenseClaim"];

export function ClaimDetailPage(): JSX.Element {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!claimId) return;
    let live = true;
    expenseApi
      .GET("/me/claims/{claimId}", { params: { path: { claimId } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError) {
          setError(apiError.message);
          return;
        }
        setClaim(data ?? null);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Failed to load claim");
      });
    return () => {
      live = false;
    };
  }, [claimId]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/claims")}>Back</PageTitle.BackButton>
        <PageTitle.Header>Claim Detail</PageTitle.Header>
      </PageTitle>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {!claim && !error ? <Typography color="text.secondary">Loading…</Typography> : null}

      {claim ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography>Category: {claim.category}</Typography>
              <Typography>Amount: {claim.amount.toFixed(2)}</Typography>
              <Typography>Description: {claim.description}</Typography>
              <StatusBadge status={claim.status} />
              {claim.status === "rejected" && (claim.managerComment || claim.financeComment) ? (
                <Typography>
                  {claim.managerComment ? `Manager comment: ${claim.managerComment}` : null}
                  {claim.managerComment && claim.financeComment ? " — " : null}
                  {claim.financeComment ? `Finance comment: ${claim.financeComment}` : null}
                </Typography>
              ) : null}
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
              {claim.status === "rejected" ? (
                <Button variant="contained" onClick={() => navigate(`/claims/${claim.id}/edit`)}>
                  Edit & Resubmit
                </Button>
              ) : (
                <Typography color="text.secondary">
                  Only a rejected claim can be edited and resubmitted.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </PageContent>
  );
}
