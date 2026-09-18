import { useEffect, useState, type FormEvent, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Form,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";

type Category = components["schemas"]["ExpenseClaimInput"]["category"];
const CATEGORIES: Category[] = ["Travel", "Meals", "Lodging", "Other"];

export function EditClaimPage(): JSX.Element {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>("Travel");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        if (data) {
          setCategory(data.category);
          setAmount(String(data.amount));
          setExpenseDate(data.expenseDate);
          setDescription(data.description);
          setReceiptRef(data.receiptRef ?? "");
        }
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Failed to load claim");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [claimId]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!claimId) return;
    setError(null);
    const amountValue = Number(amount);
    if (!amount || Number.isNaN(amountValue) || !expenseDate || !description) {
      setError("Amount, category, date and description are all required.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: apiError } = await expenseApi.PUT("/me/claims/{claimId}", {
        params: { path: { claimId } },
        body: {
          amount: amountValue,
          category,
          expenseDate,
          description,
          receiptRef: receiptRef || null,
        },
      });
      if (apiError) {
        setError(apiError.message);
        return;
      }
      navigate("/claims");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resubmit claim");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Edit Claim</PageTitle.Header>
      </PageTitle>

      {loading ? <Typography color="text.secondary">Loading…</Typography> : null}

      {!loading ? (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <Form.Section>
            <Form.Stack>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                select
                required
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                required
                label="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <TextField
                required
                type="date"
                label="Expense date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                required
                multiline
                minRows={3}
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <TextField
                label="Receipt (optional)"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
              />
            </Form.Stack>
          </Form.Section>

          <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={() => navigate(`/claims/${claimId}`)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Resubmit
            </Button>
          </Stack>
        </form>
      ) : null}
    </PageContent>
  );
}
