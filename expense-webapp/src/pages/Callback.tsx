import { useEffect, useState, type JSX } from "react";
import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";
import { APP_NAME } from "../appName";

/** OIDC redirect target. Routed OUTSIDE the provider: there is no session to
 * read until the redirect has been processed. */
export function CallbackPage(): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void handleCallback()
      .then(() => {
        if (live) window.location.assign(window.location.origin);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Sign-in failed");
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Stack spacing={1} alignItems="center">
        <Typography variant="h6">{APP_NAME}</Typography>
        <Typography color="text.secondary">
          {error ? `Sign-in failed: ${error}` : "Completing sign-in…"}
        </Typography>
      </Stack>
    </Box>
  );
}
