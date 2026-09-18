import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListingTable,
  PageContent,
  PageTitle,
  Button,
} from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { StatusBadge } from "../lib/StatusBadge";

type ExpenseClaim = components["schemas"]["ExpenseClaim"];

export function MyClaimsPage(): JSX.Element {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ExpenseClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    expenseApi
      .GET("/me/claims", { params: { query: {} } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError) {
          setError(apiError.message);
          return;
        }
        setClaims(data?.data ?? []);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Failed to load claims");
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My Claims</PageTitle.Header>
        <PageTitle.Actions>
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate("/claims/new")}>
            New Claim
          </Button>
        </PageTitle.Actions>
      </PageTitle>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Date</ListingTable.Cell>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Amount</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {claims === null && error === null ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={4}>Loading…</ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {error ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={4}>Could not load your claims: {error}</ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {claims?.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={4}>
                  <ListingTable.EmptyState
                    title="No claims yet"
                    description="Submit your first expense claim to see it here."
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {claims?.map((claim) => (
              <ListingTable.Row
                key={claim.id}
                clickable
                onClick={() => navigate(`/claims/${claim.id}`)}
              >
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
