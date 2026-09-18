import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { StatusBadge } from "../lib/StatusBadge";
import { useEmployeeDirectory } from "../lib/useEmployeeDirectory";

type ExpenseClaim = components["schemas"]["ExpenseClaim"];

export function ManagerQueuePage(): JSX.Element {
  const navigate = useNavigate();
  const { nameOf } = useEmployeeDirectory();
  const [claims, setClaims] = useState<ExpenseClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    expenseApi
      .GET("/me/team/claims", { params: { query: { status: "submitted" } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError) {
          setError(apiError.message);
          return;
        }
        setClaims(data?.data ?? []);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Failed to load the approval queue");
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Approval Queue</PageTitle.Header>
      </PageTitle>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Employee</ListingTable.Cell>
              <ListingTable.Cell>Date</ListingTable.Cell>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Amount</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {claims === null && error === null ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5}>Loading…</ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {error ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5}>Could not load the queue: {error}</ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {claims?.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5}>
                  <ListingTable.EmptyState
                    title="Nothing awaiting review"
                    description="Your reports have no claims waiting on you right now."
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {claims?.map((claim) => (
              <ListingTable.Row
                key={claim.id}
                clickable
                onClick={() => navigate(`/approvals/${claim.id}`, { state: { claim } })}
              >
                <ListingTable.Cell>{nameOf(claim.employeeId)}</ListingTable.Cell>
                <ListingTable.Cell>{claim.expenseDate}</ListingTable.Cell>
                <ListingTable.Cell>{claim.category}</ListingTable.Cell>
                <ListingTable.Cell>{claim.amount.toFixed(2)}</ListingTable.Cell>
                <ListingTable.Cell>
                  <StatusBadge status={claim.status} />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
