import { useCallback, useEffect, useState, type JSX } from "react";
import { Alert, Button, Link, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";

type ExportBatch = components["schemas"]["ExportBatch"];

export function ExportBatchesPage(): JSX.Element {
  const [batches, setBatches] = useState<ExportBatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    return expenseApi
      .GET("/export-batches", { params: { query: {} } })
      .then(({ data, error: apiError }) => {
        if (apiError) {
          setError(apiError.message);
          return;
        }
        setBatches(data?.data ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load export batches");
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportNow(): Promise<void> {
    setError(null);
    setExporting(true);
    try {
      const { error: apiError } = await expenseApi.POST("/claims/export", {});
      if (apiError) {
        setError(apiError.message);
        return;
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate the export batch");
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Payroll Exports</PageTitle.Header>
        <PageTitle.Actions>
          <Button variant="contained" disabled={exporting} onClick={() => void exportNow()}>
            Export Now
          </Button>
        </PageTitle.Actions>
      </PageTitle>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Generated</ListingTable.Cell>
              <ListingTable.Cell>Claims</ListingTable.Cell>
              <ListingTable.Cell>Download</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {batches === null && error === null ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={3}>Loading…</ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {batches?.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={3}>
                  <ListingTable.EmptyState
                    title="No export batches yet"
                    description="Export Now generates the first one from finance-approved claims."
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {batches?.map((batch) => (
              <ListingTable.Row key={batch.id}>
                <ListingTable.Cell>{new Date(batch.generatedAt).toLocaleString()}</ListingTable.Cell>
                <ListingTable.Cell>{batch.claimCount}</ListingTable.Cell>
                <ListingTable.Cell>
                  {batch.downloadUrl ? (
                    <Link href={`/api${batch.downloadUrl}`} target="_blank" rel="noreferrer">
                      Download CSV
                    </Link>
                  ) : (
                    "—"
                  )}
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
