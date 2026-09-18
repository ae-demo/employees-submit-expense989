import type { JSX } from "react";
import { Chip } from "@wso2/oxygen-ui";

const COLOR: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
  submitted: "info",
  "manager-approved": "warning",
  "finance-approved": "success",
  rejected: "error",
};

export function StatusBadge({ status }: { status: string }): JSX.Element {
  return <Chip label={status} color={COLOR[status] ?? "default"} size="small" />;
}
