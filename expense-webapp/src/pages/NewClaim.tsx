import { useState, type FormEvent, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Form,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";

type Category = components["schemas"]["ExpenseClaimInput"]["category"];
const CATEGORIES: Category[] = ["Travel", "Meals", "Lodging", "Other"];

export function NewClaimPage(): JSX.Element {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>("Travel");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const amountValue = Number(amount);
    if (!amount || Number.isNaN(amountValue) || !expenseDate || !description) {
      setError("Amount, category, date and description are all required.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: apiError } = await expenseApi.POST("/me/claims", {
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
      setError(err instanceof Error ? err.message : "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>New Claim</PageTitle.Header>
      </PageTitle>

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
          <Button variant="outlined" onClick={() => navigate("/claims")}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Submit Claim
          </Button>
        </Stack>
      </form>
    </PageContent>
  );
}
